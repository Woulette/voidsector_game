import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";

function makeSocket(id = "profile-save-socket"){
  const handlers = new Map();
  const emitted = [];
  return {
    id,
    handlers,
    emitted,
    handshake:{address:"127.0.0.1"},
    conn:{remoteAddress:"127.0.0.1"},
    on(event, handler){
      handlers.set(event, handler);
    },
    emit(event, payload){
      emitted.push({event, payload});
    },
    to(){
      return {emit(){}};
    },
    broadcast:{emit(){}}
  };
}

function registerProfileSaveFixture({
  socket,
  player,
  saveFromPayload,
  emitProfileSync = ()=>{},
  players = new Map([[socket.id, player]]),
  io = {
    sockets:{sockets:new Map([[socket.id, socket]])},
    emit(){},
    to(){ return {emit(){}}; }
  }
}){
  registerPlayerHandlers(socket, {
    cleanName:value=>String(value || "Pilote"),
    emitProfileSync,
    emitPlayers(){},
    groups:new Map(),
    guard:()=>true,
    io,
    logger:{warn(){}},
    players,
    presence:{syncMovementLogoutState(){}, markCombat(){}, markActivity(){}, startLogout(){}},
    profileManager:{
      profileKeyForPlayer:()=>`account:${player.accountId}`,
      listProfileEntries:()=>[],
      saveFromPayload
    },
    publicPlayer:current=>current,
    replaceGroupMemberId(){},
    respawnPlayer(){},
    resumeQuestTimers(){},
    setPlayerMap(){},
    syncPlayerLifecycle(){},
    syncPlayerStatusEffects(){},
    syncProfileForPlayer(){}
  });
}

test("a stale profile save receives an explicit terminal conflict acknowledgement", async ()=>{
  const socket = makeSocket();
  const player = {
    id:socket.id,
    accountId:"profile-save-account",
    account:{id:"profile-save-account", username:"Pilote", firmId:"astra"},
    name:"Pilote",
    connected:true
  };
  const canonical = createDefaultProfile();
  canonical.actionSlotsUpdatedAt = 2000;
  let accountBroadcasts = 0;
  let leaderboardBroadcasts = 0;
  registerPlayerHandlers(socket, {
    cleanName:value=>String(value || "Pilote"),
    emitProfileSync(){
      accountBroadcasts += 1;
    },
    emitPlayers(){},
    groups:new Map(),
    guard:()=>true,
    io:{
      sockets:{sockets:new Map([[socket.id, socket]])},
      emit(){
        leaderboardBroadcasts += 1;
      }
    },
    logger:{warn(){}},
    players:new Map([[socket.id, player]]),
    presence:{syncMovementLogoutState(){}, markCombat(){}, markActivity(){}, startLogout(){}},
    profileManager:{
      profileKeyForPlayer:()=>"account:profile-save-account",
      listProfileEntries:()=>[],
      saveFromPayload(){
        return {
          profile:canonical,
          conflict:true,
          status:"conflict",
          reason:"stale-preferences",
          acknowledgedAt:1000,
          serverUpdatedAt:canonical.updatedAt,
          actionSlotsUpdatedAt:canonical.actionSlotsUpdatedAt
        };
      }
    },
    publicPlayer:current=>current,
    replaceGroupMemberId(){},
    respawnPlayer(){},
    resumeQuestTimers(){},
    setPlayerMap(){},
    syncPlayerLifecycle(){},
    syncPlayerStatusEffects(){},
    syncProfileForPlayer(){}
  });

  await socket.handlers.get("profile:save")({
    requestId:"request:stale:1",
    profile:{
      updatedAt:1000,
      actionSlotsUpdatedAt:1000,
      actionSlots:["ammo_x1"]
    }
  });

  const acknowledgement = socket.emitted.find(entry=>entry.event === "profile:saved");
  assert.equal(acknowledgement?.payload?.requestId, "request:stale:1");
  assert.equal(acknowledgement?.payload?.status, "conflict");
  assert.equal(acknowledgement?.payload?.reason, "stale-preferences");
  const canonicalSync = socket.emitted.find(entry=>entry.event === "profile:sync");
  assert.equal(canonicalSync?.payload?.profileSyncReason, "profile-save-conflict");
  assert.equal(accountBroadcasts, 0);
  assert.equal(leaderboardBroadcasts, 0);
});

test("profile saved acknowledgement waits for durable persistence", async ()=>{
  const socket = makeSocket("durable-profile-save");
  const player = {
    id:socket.id,
    accountId:"durable-account",
    account:{id:"durable-account", username:"Pilote", firmId:"astra"},
    name:"Pilote",
    connected:true
  };
  const profile = createDefaultProfile();
  profile.actionSlotsUpdatedAt = 3000;
  let resolvePersistence;
  const persistence = new Promise(resolve=>{
    resolvePersistence = resolve;
  });
  registerProfileSaveFixture({
    socket,
    player,
    saveFromPayload:()=>({
      profile,
      status:"saved",
      acknowledgedAt:3000,
      serverUpdatedAt:profile.updatedAt,
      actionSlotsUpdatedAt:3000,
      persistence
    })
  });

  const handling = socket.handlers.get("profile:save")({
    requestId:"request:durable:1",
    profile:{updatedAt:3000, actionSlotsUpdatedAt:3000}
  });
  await Promise.resolve();
  assert.equal(socket.emitted.some(entry=>entry.event === "profile:saved"), false);

  resolvePersistence();
  await handling;
  assert.equal(socket.emitted.find(entry=>entry.event === "profile:saved")?.payload?.status, "saved");
});

test("profile persistence failure returns a retryable rejection instead of a false success", async ()=>{
  const socket = makeSocket("failed-profile-save");
  const player = {
    id:socket.id,
    accountId:"failed-account",
    account:{id:"failed-account", username:"Pilote", firmId:"astra"},
    name:"Pilote",
    connected:true
  };
  const profile = createDefaultProfile();
  registerProfileSaveFixture({
    socket,
    player,
    saveFromPayload:()=>({
      profile,
      status:"saved",
      persistence:Promise.reject(new Error("database offline"))
    })
  });

  await socket.handlers.get("profile:save")({
    requestId:"request:failed:1",
    profile:{updatedAt:4000, actionSlotsUpdatedAt:4000}
  });

  const acknowledgement = socket.emitted.find(entry=>entry.event === "profile:saved");
  assert.equal(acknowledgement?.payload?.status, "rejected");
  assert.equal(acknowledgement?.payload?.reason, "profile-persistence-failed");
  assert.equal(socket.emitted.some(entry=>entry.event === "profile:sync"), false);
});

test("manual leaderboard sync fans the same ranking snapshot to every socket of the account", ()=>{
  const socket = makeSocket("leaderboard-launcher");
  const launcher = {
    id:socket.id,
    accountId:"leaderboard-account",
    account:{id:"leaderboard-account", username:"Pilote", firmId:"astra"},
    name:"Pilote",
    connected:true
  };
  const game = {
    ...launcher,
    id:"leaderboard-game",
    clientMode:"game"
  };
  const emitted = [];
  registerProfileSaveFixture({
    socket,
    player:launcher,
    players:new Map([[launcher.id, launcher], [game.id, game]]),
    saveFromPayload:()=>null,
    io:{
      sockets:{sockets:new Map([[socket.id, socket]])},
      emit(){},
      to(socketId){
        return {
          emit(event, payload){
            emitted.push({socketId, event, payload});
          }
        };
      }
    }
  });

  socket.handlers.get("leaderboard:sync")();

  assert.deepEqual(
    emitted.map(entry=>entry.socketId).sort(),
    ["leaderboard-game", "leaderboard-launcher"]
  );
  assert.equal(emitted.every(entry=>entry.event === "leaderboard:ranking"), true);
});
