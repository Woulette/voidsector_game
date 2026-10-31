import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";
import { registerTravelHandlers } from "../src/socket/travelHandlers.js";
import { createSectorTravelManager } from "../src/travel/sectorTravel.js";
import { createSectorTravelRoutes } from "../src/travel/sectorTravelRoutes.js";

function event(socket, name){
  return new Promise(resolve=>socket.once(name, resolve));
}

test("real Socket.IO preserves Premium authorization, server motion, and manual-cancel ordering", {timeout:10000}, async()=>{
  const http = createServer();
  const io = new Server(http);
  const players = new Map();
  const profile = createDefaultProfile();
  profile.player.premiumUntil = 0;
  profile.player.premiumActive = false;
  let clock = Date.now();
  let cancelLimited = false;
  const profileManager = {
    getProfileSnapshotForPlayer:()=>profile,
    getProfileForPlayer:()=>profile,
    saveWorldSession:()=>profile
  };
  const setPlayerMap = (socket, mapId)=>{
    const player = players.get(socket.id);
    player.mapId = String(mapId);
    player.mapRoom = `map:${mapId}`;
    socket.join(player.mapRoom);
  };
  const presence = {markActivity(){}, syncMovementLogoutState(){}};
  const publicPlayer = player=>({id:player.id, state:player.state});
  const travelManager = createSectorTravelManager({
    io, players, profileManager, presence, setPlayerMap, publicPlayer, now:()=>clock
  });
  io.on("connection", socket=>{
    const player = {
      id:socket.id, accountId:"fixture-account", connected:true, clientMode:"game", mapId:"0", mapRoom:"map:0",
      state:{x:0, y:0, mapId:"0", shipId:"orion", hp:5000, maxHp:5000,
        shield:0, maxShield:0, vx:0, vy:0, enginePower:0, moveTarget:null, updatedAt:clock}
    };
    players.set(socket.id, player);
    socket.join("map:0");
    const context = {
      io, players, profileManager, presence, publicPlayer, setPlayerMap, travelManager,
      groups:new Map(), guard:name=>!(cancelLimited && name === "travel:cancel")
    };
    registerPlayerHandlers(socket, context);
    registerTravelHandlers(socket, context);
    socket.on("test:barrier", reply=>reply({state:player.state, active:travelManager.isActive(player)}));
    socket.emit("test:ready");
  });
  await new Promise(resolve=>http.listen(0, "127.0.0.1", resolve));
  const client = connect(`http://127.0.0.1:${http.address().port}`, {
    transports:["websocket"], reconnection:false, autoConnect:false
  });
  const barrier = ()=>new Promise(resolve=>client.emit("test:barrier", resolve));
  try{
    const ready = event(client, "test:ready");
    client.connect();
    await ready;
    const denied = event(client, "travel:error");
    client.emit("travel:start", {targetMapId:"2", requestId:"denied", premiumActive:true});
    assert.equal((await denied).code, "premium-required");

    profile.player.premiumUntil = clock + 60000;
    const started = event(client, "travel:state");
    client.emit("travel:start", {targetMapId:"2", requestId:"approved"});
    assert.equal((await started).status, "traveling");
    const player = players.get(client.id);
    const moved = event(client, "travel:state");
    clock += 200;
    travelManager.update(.05, clock);
    const movement = await moved;
    assert.ok(Math.hypot(movement.session.x, movement.session.y) > 0);
    assert.equal(movement.currentMapId, "0");

    const expected = {x:player.state.x, y:player.state.y};
    client.emit("player:state", {
      ...player.state, x:4300, y:3300, mapId:"2", vx:100000,
      moveTarget:{x:999, y:999}, sourceSeq:1, sourceAt:1
    });
    const protectedSnapshot = await barrier();
    assert.equal(protectedSnapshot.state.mapId, "0");
    assert.equal(protectedSnapshot.state.x, expected.x);
    assert.equal(protectedSnapshot.state.y, expected.y);
    assert.equal(protectedSnapshot.active, true);

    cancelLimited = true;
    const cancelled = event(client, "travel:state");
    client.emit("travel:cancel", {requestId:"approved"});
    client.emit("player:state", {
      ...player.state, x:expected.x, y:expected.y, vx:0, vy:0,
      moveTarget:{x:100, y:200}, sourceSeq:2, sourceAt:2
    });
    const manual = await barrier();
    assert.equal((await cancelled).status, "cancelled");
    assert.equal(manual.active, false);
    assert.deepEqual(manual.state.moveTarget, {x:100, y:200});
    assert.equal(manual.state.mapId, "0");

    profile.player.premiumUntil = clock + 1_000_000;
    const journeyStarted = event(client, "travel:state");
    client.emit("travel:start", {targetMapId:"2", requestId:"arrival"});
    await journeyStarted;
    const arrived = new Promise(resolve=>{
      const listener = payload=>{
        if(payload.status !== "arrived") return;
        client.off("travel:state", listener);
        resolve(payload);
      };
      client.on("travel:state", listener);
    });
    const finalLeg = createSectorTravelRoutes().leg("1", "2");
    let inFlightSnapshot;
    for(let index = 0; index < 4000 && travelManager.isActive(player); index += 1){
      clock += 50;
      travelManager.update(.05, clock);
      if(player.state.mapId === "1" && !player.state.moveTarget
        && Math.hypot(player.state.x - finalLeg.x, player.state.y - finalLeg.y) <= finalLeg.activationRadius){
        inFlightSnapshot = {...structuredClone(player.state), portalTransfer:true, sourceSeq:3, sourceAt:3};
      }
    }
    assert.equal(travelManager.isActive(player), false);
    assert.equal(player.state.mapId, "2");
    assert.equal((await arrived).currentMapId, "2");
    assert.ok(inFlightSnapshot);
    const arrivalCorrection = event(client, "player:state-correction");
    client.emit("player:state", inFlightSnapshot);
    assert.equal((await arrivalCorrection).mapId, "2");
    assert.equal((await barrier()).state.mapId, "2");
    const destination = {x:player.state.x + 100, y:player.state.y + 50};
    client.emit("player:state", {...player.state, moveTarget:destination, sourceSeq:4, sourceAt:4});
    const afterArrivalManual = await barrier();
    assert.equal(afterArrivalManual.state.mapId, "2");
    assert.deepEqual(afterArrivalManual.state.moveTarget, destination);
    client.emit("player:state", inFlightSnapshot);
    assert.equal((await barrier()).state.mapId, "2");

    const restarted = event(client, "travel:state");
    client.emit("travel:start", {targetMapId:"0", requestId:"disconnect"});
    await restarted;
    const disconnected = new Promise(resolve=>io.sockets.sockets.get(client.id).once("disconnect", resolve));
    client.disconnect();
    await disconnected;
    assert.equal(travelManager.isActive(player), false);
    assert.equal(player.state.moveTarget, null);
  }finally{
    client.disconnect();
    await new Promise(resolve=>io.close(resolve));
  }
});
