import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createWorldLootManager } from "../src/world/loot.js";
import { registerCombatHandlers } from "../src/socket/combatHandlers.js";
import { getLootCollectionHoverPoint } from "../../src/shared/lootCollection.js";

const next = (socket, name)=>new Promise(resolve=>socket.once(name, resolve));
const wait = ms=>new Promise(resolve=>setTimeout(resolve, ms));

test("real Socket.IO enforces the 700 ms server channel and cancels a requested pickup without rewarding it", {timeout:10000}, async()=>{
  const http = createServer(), io = new Server(http), players = new Map();
  const profile = {cargoHold:{}};
  let mutations = 0;
  const manager = createWorldLootManager({io, players,
    profileManager:{updateProfileForPlayer:({update})=>{ mutations++;return {...update(profile),profile}; }}});
  const ticker = setInterval(()=>manager.cleanupExpiredLootDrops(Date.now()), 25);
  io.on("connection", socket=>{
    const player = {id:socket.id, mapId:"0", connected:true, clientMode:"game", state:{mapId:"0", hp:100, x:55, y:107}};
    players.set(socket.id, player);
    registerCombatHandlers(socket, {players, guard:()=>true, pickupLoot:manager.pickupLoot});
    socket.on("test:drop", ()=>{
      const random = Math.random;Math.random = ()=>0;
      try{
        manager.emitPrivateResourceDrops({ownerId:socket.id,mapId:"0",enemy:{x:100,y:200,level:1}});
      }finally{Math.random = random;}
    });
    socket.on("test:position", (drop, ack)=>{
      Object.assign(player.state, getLootCollectionHoverPoint(drop));
      ack();
    });
    socket.on("test:barrier", ack=>ack());
    socket.on("disconnect", ()=>players.delete(socket.id));
    socket.emit("test:ready");
  });
  await new Promise(resolve=>http.listen(0,"127.0.0.1",resolve));
  const client = connect(`http://127.0.0.1:${http.address().port}`,{transports:["websocket"],reconnection:false,autoConnect:false});
  const picked = [];
  client.on("loot:picked", payload=>picked.push(payload));
  const barrier = ()=>new Promise(resolve=>client.emit("test:barrier",resolve));
  async function drop(){
    const pending = next(client,"loot:drop");client.emit("test:drop");const item = await pending;
    await new Promise(resolve=>client.emit("test:position",item,resolve));return item;
  }
  try{
    const ready = next(client,"test:ready");client.connect();await ready;
    const first = await drop();
    const started = next(client,"loot:collection");client.emit("loot:pickup",{id:first.id,phase:"start",attemptId:"first-attempt"});
    const start = await started;assert.equal(start.status,"started");assert.equal(start.durationMs,700);
    const completed = next(client,"loot:picked");client.emit("loot:pickup",{id:first.id,phase:"finish",attemptId:"first-attempt"});
    await wait(500);assert.equal(mutations,0);assert.equal(picked.length,0);
    const result = await completed;
    assert.equal(result.id,first.id);assert.equal(result.attemptId,"first-attempt");assert.ok(result.at-start.startedAt>=700,"a premature finish waits for server elapsed time");
    assert.equal(mutations,1);assert.equal(profile.cargoHold[first.materialId],1);
    client.emit("loot:pickup",{id:first.id,phase:"finish",attemptId:"first-attempt"});await barrier();assert.equal(mutations,1);

    const second = await drop();
    const secondStarted = next(client,"loot:collection");client.emit("loot:pickup",{id:second.id,phase:"start",attemptId:"second-attempt"});await secondStarted;
    client.emit("loot:pickup",{id:second.id,phase:"finish",attemptId:"second-attempt"});await wait(100);
    const cancelled = next(client,"loot:collection");client.emit("loot:pickup",{id:second.id,phase:"cancel",attemptId:"second-attempt"});
    assert.equal((await cancelled).status,"cancelled");
    await wait(750);assert.equal(mutations,1);assert.equal(picked.length,1,"cancelled channel grants nothing after its old deadline");

    const restarted = next(client,"loot:collection");client.emit("loot:pickup",{id:second.id,phase:"start",attemptId:"third-attempt"});
    assert.equal((await restarted).status,"started","cancel leaves the ground item collectible");
    const collectedAgain = next(client,"loot:picked");client.emit("loot:pickup",{id:second.id,phase:"finish",attemptId:"third-attempt"});await collectedAgain;
    assert.equal(mutations,2);assert.equal(profile.cargoHold[first.materialId],2);
  }finally{
    clearInterval(ticker);client.disconnect();
    await new Promise(resolve=>io.close(resolve));
    if(http.listening)await new Promise(resolve=>http.close(resolve));
  }
});
