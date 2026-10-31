import assert from "node:assert/strict";
import test from "node:test";
import { createSocketSessionManager } from "../src/auth/socketSession.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileManager } from "../src/players/profiles.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { registerAuthHandlers } from "../src/socket/authHandlers.js";
import { registerGroupHandlers } from "../src/socket/groupHandlers.js";

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function createSocket(id){
  const handlers = new Map();
  const emitted = [];
  const calls = [];
  return {
    id,
    handlers,
    emitted,
    calls,
    on(event, handler){
      handlers.set(event, handler);
    },
    emit(event, payload){
      emitted.push({event, payload});
    },
    receive(event, payload){
      const handler = handlers.get(event);
      assert.equal(typeof handler, "function", `handler ${event} absent`);
      return handler(payload);
    },
    join(room){
      calls.push(`join:${room}`);
    },
    leave(room){
      calls.push(`leave:${room}`);
    },
    disconnect(force){
      calls.push(`disconnect:${force}`);
    }
  };
}

function createMemoryProfileManager(storage){
  return createProfileManager({
    cleanName:value=>String(value || "Pilote").trim().replace(/\s+/g, " ").slice(0, 24),
    logger:{warn(){}},
    async loadProfileEntries(sanitizeProfile){
      return [...storage.entries()].map(([key, profile])=>[
        key,
        sanitizeProfile(clone(profile))
      ]);
    },
    async persistProfileEntries(entries){
      for(const [key, profile] of entries) storage.set(key, clone(profile));
    },
    async reservePilotIdentity(){
      return {ok:true};
    }
  });
}

function createIo(sockets){
  return {
    sockets:{sockets},
    to(target){
      return {
        emit(event, payload){
          sockets.get(String(target))?.emit(event, payload);
        }
      };
    }
  };
}

test("launcher preparation survives persistence and is restored to the next Astra game session", async ()=>{
  const account = {
    id:"account-astra",
    username:"Pilote Astra",
    firmId:"astra",
    role:"player"
  };
  const profileKey = `account:${account.id}`;
  const storedProfiles = new Map();
  const initialProfile = createDefaultProfile();
  initialProfile.player = {
    ...initialProfile.player,
    name:account.username,
    firmId:"astra",
    firmSelected:true,
    level:15
  };
  initialProfile.unlockedPortals = ["blue"];
  storedProfiles.set(profileKey, initialProfile);

  const launcherProfileManager = createMemoryProfileManager(storedProfiles);
  await launcherProfileManager.load();

  const launcherSocket = createSocket("launcher-socket");
  const launcherPlayer = {
    id:launcherSocket.id,
    name:account.username,
    accountId:account.id,
    account,
    clientMode:"launcher",
    connected:true,
    groupId:null,
    mapId:null,
    state:null
  };
  const launcherPlayers = new Map([[launcherPlayer.id, launcherPlayer]]);
  const launcherSockets = new Map([[launcherSocket.id, launcherSocket]]);
  const launcherIo = createIo(launcherSockets);
  const groups = new Map();
  let createGroupCalls = 0;
  const portalManager = createPortalInstanceManager({
    io:launcherIo,
    players:launcherPlayers,
    groups,
    profileManager:launcherProfileManager,
    emitProfileSync(){},
    createGroup(){
      createGroupCalls += 1;
      return null;
    },
    emitInstance(){},
    resetGroupInstance(){},
    setPlayerMap(){},
    firmWarManager:null,
    portalWaveTotal:5,
    now:()=>1_721_000_000_000
  });

  registerGroupHandlers(launcherSocket, {
    guard:eventName=>eventName === "portal:prepare",
    players:launcherPlayers,
    groups,
    io:launcherIo,
    preparePortalInstance:portalManager.preparePortalInstance
  });

  launcherSocket.receive("portal:prepare", {portalId:"blue"});
  await launcherProfileManager.flushPersistence();
  await Promise.resolve();
  await Promise.resolve();

  const launcherPreparedEvent = launcherSocket.emitted
    .filter(entry=>entry.event === "portal:prepared")
    .at(-1);
  assert.equal(createGroupCalls, 0);
  assert.equal(groups.size, 0);
  assert.equal(launcherPreparedEvent?.payload?.preparedPortal?.portalId, "blue");
  assert.equal(launcherPreparedEvent?.payload?.preparedPortal?.mapId, "0");
  assert.equal(launcherPreparedEvent?.payload?.preparedPortal?.mapName, "Helion-01");
  assert.equal(launcherPreparedEvent?.payload?.preparedPortal?.x, -3780);
  assert.equal(launcherPreparedEvent?.payload?.preparedPortal?.y, 2780);

  const persistedPortal = storedProfiles.get(profileKey)?.preparedPortal;
  assert.equal(persistedPortal?.portalId, "blue");
  assert.equal(persistedPortal?.mapId, "0");
  assert.equal(persistedPortal?.mapName, "Helion-01");
  assert.equal(persistedPortal?.x, -3780);
  assert.equal(persistedPortal?.y, 2780);

  const gameProfileManager = createMemoryProfileManager(storedProfiles);
  await gameProfileManager.load();

  const gameSocket = createSocket("game-socket");
  const gamePlayer = {
    id:gameSocket.id,
    accountId:null,
    account:null,
    name:"Guest",
    clientMode:"game",
    connected:true,
    state:null
  };
  const gamePlayers = new Map([[gamePlayer.id, gamePlayer]]);
  const gameSockets = new Map([[gameSocket.id, gameSocket]]);
  const gameIo = createIo(gameSockets);
  const sessionManager = createSocketSessionManager({
    io:gameIo,
    players:gamePlayers,
    profileManager:gameProfileManager,
    cleanName:value=>String(value || "Pilote"),
    emitPlayers(){},
    replaceGroupMemberId(){},
    resumeQuestTimers(){},
    setPlayerMap(){},
    syncPlayerLifecycle(){},
    syncPlayerStatusEffects(){},
    maxConcurrentGamePlayers:0
  });

  registerAuthHandlers(gameSocket, {
    ...sessionManager,
    players:gamePlayers,
    emitPlayers(){},
    guard:eventName=>eventName === "auth:session",
    syncProfileForPlayer:sessionManager.syncProfileForPlayer,
    authProvider:{
      async session(token){
        assert.equal(token, "session-token");
        return {
          account,
          token,
          expiresAt:1_721_100_000_000
        };
      }
    },
    logger:{error(){}, warn(){}}
  });

  await gameSocket.receive("auth:session", {token:"session-token"});

  const gamePreparedEvent = gameSocket.emitted
    .filter(entry=>entry.event === "portal:prepared")
    .at(-1);
  assert.equal(gamePreparedEvent?.payload?.synced, true);
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.portalId, "blue");
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.mapId, "0");
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.mapName, "Helion-01");
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.x, -3780);
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.y, 2780);
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.dungeonPortal, true);
  assert.equal(gamePreparedEvent?.payload?.preparedPortal?.prepared, true);
  assert.equal(gamePlayers.get(gameSocket.id)?.preparedPortal?.portalId, "blue");
});
