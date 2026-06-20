import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";

function makeSocket(id){
  const handlers = new Map();
  const emitted = [];
  return {
    id,
    handlers,
    emitted,
    handshake:{address:"127.0.0.1"},
    conn:{remoteAddress:"127.0.0.1"},
    on:(event, handler)=>handlers.set(event, handler),
    emit:(event, payload)=>emitted.push({event, payload}),
    to:()=>({emit(){}}),
    broadcast:{emit(){}}
  };
}

function registerHelloFixture({hasAuthToken = false} = {}){
  const socket = makeSocket("game");
  const player = {
    id:"game",
    accountId:null,
    account:null,
    clientMode:"launcher",
    clientId:"",
    name:"Pilote",
    connected:true
  };
  const calls = {syncProfile:0, status:0, lifecycle:0};
  const players = new Map([[player.id, player]]);
  registerPlayerHandlers(socket, {
    cleanName:value=>String(value || "Pilote"),
    emitPlayers(){},
    groups:new Map(),
    guard:()=>true,
    io:{sockets:{sockets:new Map([[socket.id, socket]])}, emit(){}},
    logger:{warn(){}},
    players,
    presence:{syncMovementLogoutState(){}, markCombat(){}, startLogout(){}},
    profileManager:{
      profileKeyForPlayer:()=>"",
      listProfileEntries:()=>[]
    },
    publicPlayer:current=>current,
    replaceGroupMemberId(){},
    resumeQuestTimers(){},
    setPlayerMap(){},
    syncPlayerLifecycle(){ calls.lifecycle += 1; },
    syncPlayerStatusEffects(){ calls.status += 1; },
    syncProfileForPlayer(){ calls.syncProfile += 1; }
  });

  socket.handlers.get("player:hello")({
    name:"hfeji",
    clientMode:"game",
    clientId:"client-1",
    hasAuthToken
  });
  return {calls, player, socket};
}

test("player hello waits for auth session before syncing a token-backed profile", ()=>{
  const {calls, player, socket} = registerHelloFixture({hasAuthToken:true});

  assert.equal(player.clientMode, "game");
  assert.equal(player.clientId, "client-1");
  assert.equal(calls.syncProfile, 0);
  assert.equal(calls.status, 0);
  assert.equal(calls.lifecycle, 0);
  assert.equal(socket.emitted.some(event=>event.event === "auth:required"), false);
});

test("player hello refuses guest gameplay when no auth token is present", ()=>{
  const {calls, player, socket} = registerHelloFixture({hasAuthToken:false});

  assert.equal(player.clientMode, "game");
  assert.equal(calls.syncProfile, 0);
  assert.equal(calls.status, 0);
  assert.equal(calls.lifecycle, 0);
  const rejection = socket.emitted.find(event=>event.event === "auth:required");
  assert.equal(rejection?.payload?.eventName, "player:hello");
});

test("changing firm moves every live game socket to the new firm home map", async ()=>{
  const launcherSocket = makeSocket("launcher");
  const gameSocket = makeSocket("game");
  const launcherPlayer = {
    id:"launcher",
    accountId:"account-1",
    account:{id:"account-1", firmId:"astra"},
    clientMode:"launcher",
    mapId:"0",
    state:null
  };
  const gamePlayer = {
    id:"game",
    accountId:"account-1",
    account:{id:"account-1", firmId:"astra"},
    clientMode:"game",
    mapId:"0",
    state:{mapId:"33", x:1200, y:-900, hp:4000, maxHp:5000, shipId:"orion"}
  };
  const players = new Map([
    [launcherPlayer.id, launcherPlayer],
    [gamePlayer.id, gamePlayer]
  ]);
  const profile = {
    activeShip:"orion",
    player:{name:"Pilote Cyan", firmId:"cyan", firmSelected:true}
  };
  const mapChanges = [];

  registerPlayerHandlers(launcherSocket, {
    buildFirmSpawnSession:()=>({
      source:"ship-change",
      mapId:"20",
      x:-4300,
      y:-3300,
      hp:5000,
      maxHp:5000,
      shield:0,
      maxShield:0,
      shipId:"orion"
    }),
    cleanName:value=>String(value || "Pilote"),
    emitPlayers(){},
    emitProfileSync(){},
    groups:new Map(),
    guard:()=>true,
    io:{sockets:{sockets:new Map([["game", gameSocket]])}},
    logger:{warn(){}},
    players,
    presence:{syncMovementLogoutState(){}, markCombat(){}, startLogout(){}},
    profileManager:{
      setupProfileForPlayer:()=>({
        ok:true,
        profile,
        firm:{id:"cyan", label:"Cyan", baseMapId:20, homeMapName:"CYAN-01"},
        firmChanged:true
      }),
      saveWorldSession:()=>profile
    },
    publicPlayer:player=>player,
    setPlayerMap:(socket, mapId)=>mapChanges.push({socketId:socket.id, mapId})
  });

  await launcherSocket.handlers.get("profile:setup")({name:"Pilote Cyan", firmId:"cyan"});

  assert.equal(gamePlayer.mapId, "20");
  assert.equal(gamePlayer.state.mapId, "20");
  assert.equal(gamePlayer.account.firmId, "cyan");
  assert.deepEqual(mapChanges, [{socketId:"game", mapId:"20"}]);
  const resume = gameSocket.emitted.find(event=>event.event === "player:resume");
  assert.equal(resume?.payload?.source, "firm-change");
  assert.equal(resume?.payload?.mapId, "20");
});

test("map transitions force an immediate world session save", ()=>{
  const socket = makeSocket("game");
  const saves = [];
  const mapChanges = [];
  const profile = createDefaultProfile();
  const player = {
    id:"game",
    accountId:"account-1",
    account:{id:"account-1", firmId:"astra"},
    clientMode:"game",
    connected:true,
    mapId:"0",
    mapRoom:"map:0",
    state:{
      mapId:"0",
      x:4300,
      y:-3300,
      angle:0,
      hp:5000,
      maxHp:5000,
      shield:0,
      maxShield:0,
      vx:0,
      vy:0,
      enginePower:0,
      engineAngle:0,
      shipId:"orion",
      speed:300,
      updatedAt:1000
    }
  };
  const players = new Map([[player.id, player]]);
  registerPlayerHandlers(socket, {
    cleanName:value=>String(value || "Pilote"),
    emitPlayers(){},
    emitProfileSync(){},
    groups:new Map(),
    guard:()=>true,
    io:{sockets:{sockets:new Map([[socket.id, socket]])}, emit(){}},
    logger:{warn(){}},
    players,
    presence:{syncMovementLogoutState(){}, markActivity(){}, markCombat(){}, startLogout(){}},
    profileManager:{
      profileKeyForPlayer:()=>"account:1",
      listProfileEntries:()=>[],
      getProfileForPlayer:()=>profile,
      saveWorldSession(payload){
        saves.push(payload);
        return profile;
      }
    },
    publicPlayer:current=>current,
    replaceGroupMemberId(){},
    resumeQuestTimers(){},
    setPlayerMap:(_socket, mapId)=>mapChanges.push(String(mapId)),
    syncPlayerLifecycle(){},
    syncPlayerStatusEffects(){},
    syncProfileForPlayer(){}
  });

  socket.handlers.get("player:state")({
    ...player.state,
    mapId:"1",
    x:-4300,
    y:3300,
    updatedAt:5000
  });

  assert.equal(saves.length, 1);
  assert.equal(saves[0].force, true);
  assert.equal(saves[0].state.mapId, "1");
  assert.deepEqual(mapChanges, ["1"]);
});
