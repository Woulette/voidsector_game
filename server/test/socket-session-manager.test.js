import assert from "node:assert/strict";
import test from "node:test";
import { createSocketSessionManager } from "../src/auth/socketSession.js";

function createSocket(id){
  const emitted = [];
  const calls = [];
  return {
    id,
    emitted,
    calls,
    emit:(event, payload)=>emitted.push({event, payload}),
    join:room=>calls.push(`join:${room}`),
    leave:room=>calls.push(`leave:${room}`),
    disconnect:force=>calls.push(`disconnect:${force}`)
  };
}

function createManagerFixture(players, sockets, options = {}){
  const calls = [];
  const manager = createSocketSessionManager({
    io:{
      sockets:{
        sockets
      }
    },
    players,
    profileManager:{
      syncForSocket(){},
      getWorldSessionForPlayer:()=>null
    },
    cleanName:value=>String(value || "Pilote"),
    emitPlayers:()=>calls.push("emitPlayers"),
    replaceGroupMemberId:(fromId, toId)=>calls.push(`replaceGroup:${fromId}->${toId}`),
    resumeQuestTimers:player=>calls.push(`resumeQuests:${player?.id}`),
    setPlayerMap:(socket, mapId)=>calls.push(`setMap:${socket.id}:${mapId}`),
    syncPlayerLifecycle:player=>calls.push(`syncLifecycle:${player?.id}`),
    syncPlayerStatusEffects:player=>calls.push(`syncStatus:${player?.id}`),
    maxConcurrentGamePlayers:options.maxConcurrentGamePlayers || 0
  });
  return {calls, manager};
}

test("session resume from a second game socket takes over the existing live ship", ()=>{
  const oldSocket = createSocket("old-game");
  const newSocket = createSocket("new-game");
  const sockets = new Map([
    [oldSocket.id, oldSocket],
    [newSocket.id, newSocket]
  ]);
  const players = new Map([
    [oldSocket.id, {
      id:oldSocket.id,
      accountId:"account-1",
      account:{id:"account-1", username:"Pilot"},
      name:"Pilot",
      clientMode:"game",
      connected:true,
      groupId:"group-1",
      mapId:"31",
      mapRoom:"map:31",
      state:{
        mapId:"31",
        x:100,
        y:200,
        angle:0.5,
        hp:4000,
        maxHp:5000,
        shield:120,
        maxShield:500,
        shipId:"orion",
        shipImg:"orion.png",
        updatedAt:900
      }
    }],
    [newSocket.id, {
      id:newSocket.id,
      accountId:null,
      account:null,
      name:"Guest",
      clientMode:"game",
      connected:true,
      state:null
    }]
  ]);
  const {calls, manager} = createManagerFixture(players, sockets);

  const resume = manager.attachOrResumeAccountSocket(
    newSocket,
    {id:"account-1", username:"Pilot", role:"player"},
    {expiresAt:123}
  );

  assert.equal(players.has(oldSocket.id), false);
  assert.equal(players.has(newSocket.id), true);
  assert.equal(players.get(newSocket.id).state.hp, 4000);
  assert.equal(players.get(newSocket.id).sessionExpiresAt, 123);
  assert.equal(resume.source, "takeover");
  assert.equal(resume.mapId, "31");
  assert.equal(resume.hp, 4000);
  assert.deepEqual(oldSocket.calls, ["leave:map:31", "disconnect:true"]);
  assert.equal(newSocket.calls.includes("join:group-1"), true);
  assert.equal(calls.includes("replaceGroup:old-game->new-game"), true);
  assert.equal(calls.includes("setMap:new-game:31"), true);
  assert.equal(calls.includes("resumeQuests:new-game"), true);
  assert.equal(calls.includes("syncStatus:new-game"), true);
  assert.equal(calls.includes("syncLifecycle:new-game"), true);
  assert.equal(newSocket.emitted.some(entry=>entry.event === "player:resume" && entry.payload.source === "takeover"), true);
});

test("session resume from a launcher removes only duplicate launchers for the account", ()=>{
  const oldLauncherSocket = createSocket("old-launcher");
  const gameSocket = createSocket("game");
  const newLauncherSocket = createSocket("new-launcher");
  const sockets = new Map([
    [oldLauncherSocket.id, oldLauncherSocket],
    [gameSocket.id, gameSocket],
    [newLauncherSocket.id, newLauncherSocket]
  ]);
  const players = new Map([
    [oldLauncherSocket.id, {
      id:oldLauncherSocket.id,
      accountId:"account-1",
      account:{id:"account-1", username:"Pilot"},
      clientMode:"launcher",
      connected:true,
      state:null
    }],
    [gameSocket.id, {
      id:gameSocket.id,
      accountId:"account-1",
      account:{id:"account-1", username:"Pilot"},
      clientMode:"game",
      connected:true,
      mapId:"31",
      state:{mapId:"31", hp:4000, maxHp:5000, shipId:"orion"}
    }],
    [newLauncherSocket.id, {
      id:newLauncherSocket.id,
      accountId:null,
      account:null,
      clientMode:"launcher",
      connected:true,
      state:null
    }]
  ]);
  const {calls, manager} = createManagerFixture(players, sockets);

  const resume = manager.attachOrResumeAccountSocket(
    newLauncherSocket,
    {id:"account-1", username:"Pilot", role:"player"},
    {expiresAt:456}
  );

  assert.equal(resume, null);
  assert.equal(players.has(oldLauncherSocket.id), false);
  assert.equal(players.has(gameSocket.id), true);
  assert.equal(players.has(newLauncherSocket.id), true);
  assert.equal(players.get(newLauncherSocket.id).accountId, "account-1");
  assert.equal(players.get(newLauncherSocket.id).sessionExpiresAt, 456);
  assert.deepEqual(oldLauncherSocket.calls, ["disconnect:true"]);
  assert.deepEqual(gameSocket.calls, []);
  assert.equal(calls.includes("replaceGroup:old-launcher->new-launcher"), true);
  assert.equal(newLauncherSocket.emitted.some(entry=>entry.event === "account:role"), true);
  assert.equal(newLauncherSocket.emitted.some(entry=>entry.event === "player:resume"), false);
});

test("session resume refuses a new game account when the beta player cap is full", ()=>{
  const existingSocket = createSocket("existing-game");
  const newSocket = createSocket("new-game");
  const sockets = new Map([
    [existingSocket.id, existingSocket],
    [newSocket.id, newSocket]
  ]);
  const players = new Map([
    [existingSocket.id, {
      id:existingSocket.id,
      accountId:"account-1",
      account:{id:"account-1", username:"Pilot 1"},
      clientMode:"game",
      connected:true,
      state:{mapId:"0", hp:4000, maxHp:5000, shipId:"orion"}
    }],
    [newSocket.id, {
      id:newSocket.id,
      accountId:null,
      account:null,
      clientMode:"game",
      connected:true,
      state:null
    }]
  ]);
  const {manager} = createManagerFixture(players, sockets, {maxConcurrentGamePlayers:1});

  assert.throws(
    ()=>manager.attachOrResumeAccountSocket(
      newSocket,
      {id:"account-2", username:"Pilot 2", role:"player"},
      {expiresAt:123}
    ),
    error=>error?.code === "SERVER_FULL"
  );
  assert.equal(players.get(newSocket.id).accountId, null);
  const fullEvent = newSocket.emitted.find(entry=>entry.event === "server:full");
  assert.equal(fullEvent?.payload?.current, 1);
  assert.equal(fullEvent?.payload?.max, 1);
  assert.equal(existingSocket.calls.length, 0);
});

test("session resume allows same-account takeover when the beta player cap is full", ()=>{
  const oldSocket = createSocket("old-game");
  const newSocket = createSocket("new-game");
  const sockets = new Map([
    [oldSocket.id, oldSocket],
    [newSocket.id, newSocket]
  ]);
  const players = new Map([
    [oldSocket.id, {
      id:oldSocket.id,
      accountId:"account-1",
      account:{id:"account-1", username:"Pilot"},
      name:"Pilot",
      clientMode:"game",
      connected:true,
      mapId:"0",
      state:{mapId:"0", hp:4000, maxHp:5000, shipId:"orion"}
    }],
    [newSocket.id, {
      id:newSocket.id,
      accountId:null,
      account:null,
      name:"Guest",
      clientMode:"game",
      connected:true,
      state:null
    }]
  ]);
  const {manager} = createManagerFixture(players, sockets, {maxConcurrentGamePlayers:1});

  const resume = manager.attachOrResumeAccountSocket(
    newSocket,
    {id:"account-1", username:"Pilot", role:"player"},
    {expiresAt:123}
  );

  assert.equal(resume.source, "takeover");
  assert.equal(players.has(oldSocket.id), false);
  assert.equal(players.get(newSocket.id).accountId, "account-1");
});
