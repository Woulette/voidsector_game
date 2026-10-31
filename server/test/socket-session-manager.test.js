import assert from "node:assert/strict";
import test from "node:test";
import { createSocketSessionManager } from "../src/auth/socketSession.js";
import { LOAD_TEST_ACCOUNT_DOMAIN } from "../src/loadtest/provisionBot.js";

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
      getWorldSessionForPlayer:()=>null,
      getProfileForPlayer:options.getProfileForPlayer || (()=>null)
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
      lastClientStateSourceSeq:42,
      lastClientStateRawAt:5000,
      lastClientStateNormalizedAt:9000,
      stateStreamSeq:77,
      preparedPortal:{
        id:"prepared-blue",
        portalId:"blue",
        portal:{id:"blue", name:"Le Seuil d'Azuron"},
        mapId:"31",
        mapName:"Aureon-02",
        x:1200,
        y:-900,
        preparedAt:800
      },
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
  assert.equal(players.get(newSocket.id).lastClientStateSourceSeq, 0);
  assert.equal(players.get(newSocket.id).lastClientStateRawAt, undefined);
  assert.equal(players.get(newSocket.id).lastClientStateNormalizedAt, undefined);
  assert.equal(players.get(newSocket.id).stateStreamSeq, 77);
  assert.equal(players.get(newSocket.id).sessionExpiresAt, 123);
  assert.equal(resume.source, "takeover");
  assert.equal(resume.mapId, "31");
  assert.equal(resume.hp, 4000);
  assert.deepEqual(oldSocket.calls, ["leave:map:31", "disconnect:true"]);
  assert.equal(newSocket.calls.includes("join:group-1"), true);
  assert.equal(calls.includes("replaceGroup:old-game->new-game"), true);
  assert.equal(calls.includes("setMap:new-game:31"), true);
  assert.equal(calls.includes("emitPlayers"), true);
  assert.equal(calls.includes("resumeQuests:new-game"), true);
  assert.equal(calls.includes("syncStatus:new-game"), true);
  assert.equal(calls.includes("syncLifecycle:new-game"), true);
  assert.equal(newSocket.emitted.some(entry=>entry.event === "player:resume" && entry.payload.source === "takeover"), true);
  const preparedSync = newSocket.emitted.find(entry=>entry.event === "portal:prepared");
  assert.equal(preparedSync?.payload?.synced, true);
  assert.equal(preparedSync?.payload?.preparedPortal?.portalId, "blue");
  assert.equal(preparedSync?.payload?.preparedPortal?.mapId, "31");
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

test("a game socket restores a portal prepared earlier from the persistent account profile", ()=>{
  const gameSocket = createSocket("game");
  const sockets = new Map([[gameSocket.id, gameSocket]]);
  const players = new Map([[
    gameSocket.id,
    {
      id:gameSocket.id,
      accountId:null,
      account:null,
      name:"Guest",
      clientMode:"game",
      connected:true,
      state:null
    }
  ]]);
  const preparedPortal = {
    id:"prepared-blue",
    portalId:"blue",
    portal:{id:"blue", name:"Le Seuil d'Azuron", totalWaves:20},
    mapId:"0",
    mapName:"Helion-01",
    x:-3780,
    y:2780,
    preparedAt:800
  };
  const {manager} = createManagerFixture(players, sockets, {
    getProfileForPlayer:()=>({preparedPortal})
  });

  manager.attachOrResumeAccountSocket(
    gameSocket,
    {id:"account-1", username:"Pilot", role:"player"},
    {expiresAt:123}
  );

  assert.equal(players.get(gameSocket.id).preparedPortal?.portalId, "blue");
  const preparedSync = gameSocket.emitted.find(entry=>entry.event === "portal:prepared");
  assert.equal(preparedSync?.payload?.synced, true);
  assert.equal(preparedSync?.payload?.preparedPortal?.mapId, "0");
  assert.equal(preparedSync?.payload?.preparedPortal?.x, -3780);
  assert.equal(preparedSync?.payload?.preparedPortal?.y, 2780);
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

for(const role of ["owner", "admin"]){
  test(`session resume lets ${role.toUpperCase()} enter when the normal-player quota is full`, ()=>{
    const existingSocket = createSocket("existing-game");
    const privilegedSocket = createSocket(`${role}-game`);
    const sockets = new Map([
      [existingSocket.id, existingSocket],
      [privilegedSocket.id, privilegedSocket]
    ]);
    const players = new Map([
      [existingSocket.id, {
        id:existingSocket.id,
        accountId:"account-player",
        account:{id:"account-player", username:"Pilot", role:"player"},
        clientMode:"game",
        connected:true,
        state:{mapId:"0", hp:4000, maxHp:5000, shipId:"orion"}
      }],
      [privilegedSocket.id, {
        id:privilegedSocket.id,
        accountId:null,
        account:null,
        name:"Guest",
        clientMode:"game",
        connected:true,
        state:null
      }]
    ]);
    const {manager} = createManagerFixture(players, sockets, {maxConcurrentGamePlayers:1});

    manager.attachOrResumeAccountSocket(
      privilegedSocket,
      {id:`account-${role}`, username:role, role},
      {expiresAt:123}
    );

    assert.equal(players.get(privilegedSocket.id).accountId, `account-${role}`);
    assert.equal(players.get(privilegedSocket.id).account.role, role);
    assert.equal(privilegedSocket.emitted.some(entry=>entry.event === "server:full"), false);
    assert.deepEqual(existingSocket.calls, []);
  });
}

test("session resume disconnects disabled load-test bot accounts", ()=>{
  const botSocket = createSocket("bot-game");
  const sockets = new Map([[botSocket.id, botSocket]]);
  const players = new Map([[
    botSocket.id,
    {
      id:botSocket.id,
      accountId:null,
      account:null,
      name:"Guest",
      clientMode:"game",
      connected:true,
      state:null
    }
  ]]);
  const {manager} = createManagerFixture(players, sockets);

  const resume = manager.attachOrResumeAccountSocket(
    botSocket,
    {id:"bot-account", username:"LoadBot", email:`loadbot${LOAD_TEST_ACCOUNT_DOMAIN}`, role:"player"},
    {expiresAt:123}
  );

  assert.equal(resume, null);
  assert.equal(players.get(botSocket.id).accountId, null);
  assert.equal(botSocket.emitted.some(entry=>entry.event === "auth:error"), true);
  assert.deepEqual(botSocket.calls, ["disconnect:true"]);
});
