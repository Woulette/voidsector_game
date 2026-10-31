import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../src/config.js";
import { createAccountActionLocks } from "../src/security/accountActionLocks.js";
import { createGameplayAccountGuard } from "../src/security/gameplayAccountGuard.js";
import { registerQuestHandlers } from "../src/socket/questHandlers.js";

function makeSocket(id = "abandon-socket"){
  const handlers = new Map();
  const events = [];
  return {id, events, on:(event, handler)=>handlers.set(event, handler),
    emit:(event, payload)=>events.push({event, payload}),
    trigger:(event, payload)=>handlers.get(event)?.(payload)};
}

function install({socket = makeSocket(), player = {id:socket.id, accountId:"account-one"}, applyQuestAction, guard = ()=>true} = {}){
  registerQuestHandlers(socket, {
    players:new Map([[socket.id, player]]), guard,
    profileManager:{applyQuestAction},
    emitProfileSync:(_player, profile)=>socket.emit("profile:sync", {profile})
  });
  return socket;
}

test("abandon success waits for persistence and publishes canonical profile before acknowledgement", async ()=>{
  let resolveSave;
  const save = new Promise(resolve=>{ resolveSave = resolve; });
  const calls = [];
  const profile = {activeQuestIds:[]};
  const socket = install({applyQuestAction:request=>{
    calls.push(request);
    return {ok:true, quest:{id:"quest_raider_patrol", title:"Patrouille"}, profile, save};
  }});
  const pending = socket.trigger("quest:abandon", {id:"quest_raider_patrol", reward:{credits:999999}, accountId:"forged"});
  assert.equal(socket.events.length, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].action, {kind:"abandon", questId:"quest_raider_patrol"});
  assert.equal(calls[0].player.accountId, "account-one");
  resolveSave();
  await pending;
  assert.deepEqual(socket.events.map(entry=>entry.event), ["profile:sync", "quest:abandoned"]);
  assert.equal(socket.events[0].payload.profile, profile);
  assert.equal(socket.events[1].payload.id, "quest_raider_patrol");
});

test("abandon persistence failure emits an error without acknowledging success or publishing failed profile", async ()=>{
  let rejectSave;
  const save = new Promise((_resolve, reject)=>{ rejectSave = reject; });
  const socket = install({applyQuestAction:()=>({ok:true, quest:{id:"quest_raider_patrol"}, profile:{}, save})});
  const pending = socket.trigger("quest:abandon", {id:"quest_raider_patrol"});
  rejectSave(new Error("storage unavailable"));
  await pending;
  assert.deepEqual(socket.events.map(entry=>entry.event), ["quest:error"]);
  assert.match(socket.events[0].payload.message, /sauvegarde/i);
});

test("server rejection returns the precise tutorial protection reason without a success event", async ()=>{
  const socket = install({applyQuestAction:()=>({ok:false, code:"TUTORIAL_QUEST_PROTECTED", reason:"Mission necessaire au tutoriel."})});
  await socket.trigger("quest:abandon", {id:"quest_drone_cleanup"});
  assert.deepEqual(socket.events.map(entry=>entry.event), ["quest:error"]);
  assert.equal(socket.events[0].payload.code, "TUTORIAL_QUEST_PROTECTED");
});

test("quest abandonment requires an authenticated account", async ()=>{
  const socket = makeSocket();
  const player = {id:socket.id};
  let mutations = 0;
  const requireAccount = createGameplayAccountGuard({players:new Map([[socket.id, player]])});
  install({socket, player, guard:event=>requireAccount(socket, event), applyQuestAction:()=>{ mutations += 1; }});
  await socket.trigger("quest:abandon", {id:"quest_raider_patrol"});
  assert.equal(mutations, 0);
  assert.equal(socket.events[0].event, "auth:required");
});

test("quest abandonment is rate limited across sockets belonging to the same account", async ()=>{
  const sockets = [makeSocket("socket-one"), makeSocket("socket-two")];
  const players = new Map(sockets.map(socket=>[socket.id, {id:socket.id, accountId:"shared-account"}]));
  const allowAccountAction = createAccountActionLocks({rules:config.accountActionLocks, players, now:()=>1000});
  let mutations = 0;
  for(const socket of sockets) install({socket, player:players.get(socket.id),
    guard:event=>allowAccountAction(socket, event),
    applyQuestAction:()=>{ mutations += 1; return {ok:false, reason:"Quete non active."}; }
  });
  await sockets[0].trigger("quest:abandon", {id:"quest_raider_patrol"});
  await sockets[1].trigger("quest:abandon", {id:"quest_raider_patrol"});
  assert.equal(mutations, 1);
  assert.equal(sockets[1].events.length, 0);
});
