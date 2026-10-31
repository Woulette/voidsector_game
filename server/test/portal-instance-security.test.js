import { WORLD_MAPS } from "../src/world/definitions.js";
import { getFirmMapId } from "../../src/data/firms.js";
import { getInstanceGroup, getPlayerInstanceGroup, getPersonalPortalGroup } from "../src/portals/portalSessions.js";
import assert from "node:assert/strict";
import test from "node:test";
import { addInventoryItemAmount, getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { preserveProtectedOwnership, sanitizeProfile } from "../src/players/profileSanitize.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { registerProgressionHandlers } from "../src/socket/progressionHandlers.js";
import {
  createDeadlyEnemy,
  DEADLY_BEACON_WAVES,
  DEADLY_BOSS_MAX_LIVE_SUMMONS,
  DEADLY_BOSS_SUMMON_INTERVAL_MS,
  DEADLY_FINAL_GATE_WAVE,
  DEADLY_ROUTE_WAVES
} from "../src/portals/deadlyEnemies.js";
import { RICKY_PORTAL_MAP } from "../../src/data/rickyPortal.js";

function approachDeadly(fixture, socket = fixture.socket){
  const player = fixture.getPlayer(socket.id);
  const profile = fixture.getProfile(socket.id);
  const mapId = String(getFirmMapId(profile.player.firmId || "astra",2));
  const gate = WORLD_MAPS[mapId].closedPortals[0];
  player.mapId = mapId;
  Object.assign(player.state,{mapId,x:gate.x,y:gate.y});
}

function createFixture(){
  const events = [];
  const groups = new Map();
  const player = {
    id:"leader-1",
    name:"Leader",
    accountId:"account-leader",
    account:{id:"account-leader", firmId:"astra"},
    groupId:null,
    mapId:"0",
    state:{hp:1000, mapId:"0", x:0, y:0}
  };
  const players = new Map([[player.id, player]]);
  const profiles = new Map([[player.id, createDefaultProfile()]]);
  const sockets = new Map();
  const socket = {
    id:player.id,
    emit(event, payload){
      events.push({target:player.id, event, payload});
    }
  };
  sockets.set(socket.id, socket);
  const manager = createPortalInstanceManager({
    io:{
      sockets:{sockets},
      to(target){
        return {
          emit(event, payload){
            events.push({target, event, payload});
          }
        };
      }
    },
    players,
    groups,
    profileManager:{
      getProfileForPlayer(targetPlayer = player){
        return structuredClone(profiles.get(targetPlayer.id) || createDefaultProfile());
      },
      updateProfileForPlayer({player:targetPlayer = player, update} = {}){
        const draft = structuredClone(profiles.get(targetPlayer.id) || createDefaultProfile());
        const result = typeof update === "function" ? update(draft) : {ok:true};
        if(result?.ok === false) return result;
        profiles.set(targetPlayer.id, structuredClone(draft));
        return {...(result || {}), ok:true, profile:structuredClone(draft)};
      }
    },
    emitProfileSync(){},
    createGroup(originSocket){
      const group = {id:"group-1", leaderId:originSocket.id, members:[originSocket.id], instance:null};
      groups.set(group.id, group);
      const originPlayer = players.get(originSocket.id);
      if(originPlayer) originPlayer.groupId = group.id;
      return group;
    },
    emitInstance(group){
      events.push({target:group.id, event:"instance:update", payload:{instanceId:group.instance?.id || null}});
    },
    resetGroupInstance(groupId){
      const group = getInstanceGroup(groups,groupId);
      if(!group?.instance) return false;
      group.instance = null;
      events.push({target:groupId, event:"group:instance-reset", payload:{groupId}});
      return true;
    },
    firmWarManager:null,
    portalWaveTotal:5
  });

  return {
    events,
    groups,
    getPlayer:id=>players.get(id),
    get instanceGroup(){return getPlayerInstanceGroup(player,groups) || getPersonalPortalGroup(player,groups);},
    manager,
    player,
    addPlayer(nextPlayer, nextProfile = createDefaultProfile()){
      players.set(nextPlayer.id, nextPlayer);
      profiles.set(nextPlayer.id, structuredClone(nextProfile));
      sockets.set(nextPlayer.id, {
        id:nextPlayer.id,
        emit(event, payload){
          events.push({target:nextPlayer.id, event, payload});
        }
      });
      return nextPlayer;
    },
    getSocket(playerId){
      return sockets.get(playerId);
    },
    setProfile(nextProfile, playerId = player.id){
      profiles.set(playerId, structuredClone(nextProfile));
    },
    getProfile(playerId = player.id){
      return structuredClone(profiles.get(playerId));
    },
    socket
  };
}

function lastError(events){
  return events.filter(entry=>entry.event === "portal:error").at(-1)?.payload?.message || "";
}

function lastPortalError(events){
  return events.filter(entry=>entry.event === "portal:error").at(-1)?.payload || null;
}

function movePlayerToPreparedPortal(fixture){
  const prepared = fixture.player.preparedPortal;
  assert.ok(prepared);
  fixture.player.mapId = String(prepared.mapId);
  fixture.player.state = {
    ...fixture.player.state,
    mapId:String(prepared.mapId),
    x:Number(prepared.x),
    y:Number(prepared.y),
    hp:Math.max(1, Number(fixture.player.state?.hp || 1000))
  };
  return prepared;
}

test("prepared portal persistence is sanitized and protected from client profile saves", ()=>{
  const existing = createDefaultProfile();
  existing.preparedPortal = {
    id:"prepared-blue",
    portalId:"blue",
    portal:{id:"blue", name:"Le Seuil d'Azuron", totalWaves:20},
    mapId:"0",
    mapName:"Helion-01",
    x:-3780,
    y:2780,
    r:115,
    safeRadius:280,
    activationRadius:430,
    preparedAt:800
  };
  const sanitized = sanitizeProfile(existing);
  assert.equal(sanitized.preparedPortal?.portalId, "blue");
  assert.equal(sanitized.preparedPortal?.mapId, "0");
  assert.equal(sanitized.preparedPortal?.x, -3780);
  assert.equal(sanitized.preparedPortal?.y, 2780);

  const incoming = createDefaultProfile();
  incoming.preparedPortal = null;
  preserveProtectedOwnership(incoming, sanitized);
  assert.equal(incoming.preparedPortal?.portalId, "blue");
});

test("server rejects blank portal identifiers instead of silently selecting Azuron", ()=>{
  for(const portalId of ["", "   ", null, undefined]){
    const prepareFixture = createFixture();
    prepareFixture.manager.preparePortalInstance(prepareFixture.socket, portalId);
    assert.match(lastError(prepareFixture.events), /non deverrouille/i);
    assert.equal(prepareFixture.player.preparedPortal || null, null);
    assert.equal(prepareFixture.groups.get("group-1")?.instance || null, null);

    const startFixture = createFixture();
    startFixture.manager.startPortalInstance(startFixture.socket, portalId);
    assert.match(lastError(startFixture.events), /non deverrouille/i);
    assert.equal(startFixture.groups.get("group-1")?.instance || null, null);
  }
});

test("server portal preparation requires an unlocked portal and starts only from the prepared map portal", ()=>{
  const fixture = createFixture();
  let profile = createDefaultProfile();
  profile.player.level = 10;
  profile.unlockedPortals = [];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /non deverrouille/i);
  assert.equal(fixture.groups.size, 0);
  assert.equal(fixture.player.preparedPortal || null, null);

  profile = createDefaultProfile();
  profile.player.level = 9;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /niveau 10/i);
  assert.equal(fixture.groups.size, 0);
  assert.equal(fixture.player.preparedPortal || null, null);

  profile.player.level = 10;
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "blue");
  const prepared = fixture.player.preparedPortal;
  assert.equal(prepared.portalId, "blue");
  assert.equal(prepared.mapId, "0");
  assert.ok(Number.isFinite(prepared.x));
  assert.ok(Number.isFinite(prepared.y));
  assert.equal(fixture.groups.size, 0);
  assert.equal(fixture.getProfile().preparedPortal?.portalId, "blue");
  assert.equal(fixture.events.some(entry=>entry.event === "portal:prepared" && entry.payload.preparedPortal?.portalId === "blue"), true);

  const preparedEventCount = fixture.events.filter(entry=>
    entry.event === "portal:prepared"
    && entry.payload.preparedPortal?.portalId === "blue"
  ).length;
  fixture.manager.preparePortalInstance(fixture.socket, "blue");
  assert.equal(lastPortalError(fixture.events)?.code, "PORTAL_ALREADY_INVOKED");
  assert.ok(fixture.events.filter(entry=>
    entry.event === "portal:prepared"
    && entry.payload.preparedPortal?.portalId === "blue"
  ).length > preparedEventCount);

  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /approche/i);
  assert.equal(fixture.instanceGroup.instance, null);

  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "blue");
  const instance = fixture.instanceGroup.instance;
  assert.equal(instance.type, "portal");
  assert.equal(instance.portal.id, "blue");
  assert.equal(instance.portal.totalWaves, 30);
  assert.equal(instance.playerLives["leader-1"], 3);
  assert.equal(fixture.player.preparedPortal, null);
  assert.equal(fixture.getProfile().preparedPortal, null);
  const started = fixture.events.find(entry=>entry.event === "portal:started");
  assert.equal(started?.payload.waveTotal, 30);
  assert.equal(started?.payload.waveState, "wave_countdown");
  assert.ok(Number(started?.payload.nextWaveAt || 0) > Date.now());
});

test("a prepared Vesper portal starts Azuron waves with doubled combat stats", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 15;
  profile.unlockedPortals = ["violet"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "violet");
  assert.equal(fixture.player.preparedPortal?.portalId, "violet");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "violet");

  const group = fixture.instanceGroup;
  const instance = group.instance;
  assert.equal(instance.portal.id, "violet");
  assert.equal(instance.portal.totalWaves,30);
  assert.equal(instance.wave,1);assert.equal(instance.azuronBatchEnd,5);
  assert.equal(instance.objective.kind,"azuron");assert.equal(instance.enemies.length,10);
  assert.equal(instance.enemies[0].hp,1600);assert.equal(instance.enemies[0].attackDamage,152);
  assert.equal(instance.playerLives[fixture.player.id],3);assert.equal(fixture.player.preparedPortal,null);
  const started=fixture.events.filter(entry=>entry.event==="portal:started").at(-1)?.payload;
  assert.equal(started.objective.kind,"azuron");assert.equal(started.waveTotal,30);
  fixture.manager.updateVesperEncounters(.05,Date.now());
  assert.equal(instance.enemies.length,10);assert.equal(instance.objective.kind,"azuron");
});

test("a prepared Kharon portal starts Azuron waves with tripled combat stats", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 20;
  profile.unlockedPortals = ["red"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "red");
  assert.equal(fixture.player.preparedPortal?.portalId, "red");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "red");

  const instance = fixture.instanceGroup.instance;
  assert.equal(instance.portal.id, "red");
  assert.equal(instance.portal.totalWaves, 30);
  assert.equal(instance.wave, 1);
  assert.equal(instance.azuronBatchEnd, 5);
  assert.equal(instance.waveState, "wave_countdown");
  assert.equal(instance.objective.kind, "azuron");
  assert.equal(instance.enemies[0].hp,2400);assert.equal(instance.enemies[0].attackDamage,228);
  assert.equal(instance.enemies.every(enemy=>enemy.level === 20), true);
  assert.equal(instance.playerLives[fixture.player.id], 3);
  assert.equal(fixture.player.preparedPortal, null);

  const started = fixture.events.filter(entry=>entry.event === "portal:started").at(-1)?.payload;
  assert.equal(started?.wave, 1);
  assert.equal(started?.waveTotal, 30);
  assert.equal(started?.objective?.kind, "azuron");
  assert.equal(started?.portal?.encounterKind,"azuron");
});

test("a prepared Ionis portal starts its authoritative 40-wave four-by-four encounter", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 25;
  profile.unlockedPortals = ["ionis"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "ionis");
  assert.equal(fixture.player.preparedPortal?.portalId, "ionis");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "ionis");

  const instance = fixture.instanceGroup.instance;
  assert.equal(instance.portal.id, "ionis");
  assert.equal(instance.portal.totalWaves, 40);
  assert.equal(instance.wave, 1);
  assert.equal(instance.waveBatchEnd, 4);
  assert.equal(instance.waveState, "wave_countdown");
  assert.equal(instance.objective.kind, "ionis");
  assert.equal(instance.objective.waveTotal, 40);
  assert.equal(instance.objective.eliteWave, false);
  assert.equal(instance.enemies.every(enemy=>enemy.level === 25), true);
  assert.equal(instance.playerLives[fixture.player.id], 3);
  assert.equal(fixture.player.preparedPortal, null);

  const started = fixture.events.filter(entry=>entry.event === "portal:started").at(-1)?.payload;
  assert.equal(started?.wave, 1);
  assert.equal(started?.waveTotal, 40);
  assert.equal(started?.objective?.kind, "ionis");
  assert.equal(started?.objective?.waveBatchEnd, 4);
  assert.equal(started?.objective?.eliteWave, false);
});

test("using the exact fragment requirement invokes the unlocked portal immediately", async ()=>{
  const handlers = new Map();
  const events = [];
  const preparedPortalIds = [];
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.portalPieces.blue = 15;
  const player = {id:"leader-1", accountId:"account-1"};
  const socket = {
    id:player.id,
    on(event, handler){
      handlers.set(event, handler);
    },
    emit(event, payload){
      events.push({event, payload});
    }
  };

  registerProgressionHandlers(socket, {
    emitProfileSync(){},
    guard:()=>true,
    players:new Map([[player.id, player]]),
    preparePortalInstance(_socket, portalId){
      preparedPortalIds.push(String(portalId || ""));
    },
    profileManager:{
      applyProgressionAction({action}){
        assert.equal(action.kind, "portal-unlock");
        profile.portalPieces.blue = 0;
        profile.unlockedPortals.push("blue");
        return {
          ok:true,
          portal:{id:"blue", name:"Le Seuil d'Azuron"},
          method:"pieces",
          profile
        };
      }
    }
  });

  await handlers.get("portal:unlock")({id:"blue", method:"pieces"});

  assert.deepEqual(preparedPortalIds, ["blue"]);
  assert.equal(profile.portalPieces.blue, 0);
  assert.deepEqual(profile.unlockedPortals, ["blue"]);
  assert.equal(events.some(entry=>entry.event === "portal:unlocked"), true);
});

test("prepared progression portals and their instances are private to their owner", ()=>{
  const fixture = createFixture();
  fixture.player.accountId = "account-owner";
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);
  const observer = fixture.addPlayer({
    id:"observer-1",
    name:"Observateur",
    accountId:"account-observer",
    clientMode:"game",
    connected:true,
    groupId:"group-1",
    mapId:"0",
    state:{hp:1000, mapId:"0", x:0, y:0}
  });
  const group = {
    id:"group-1",
    leaderId:fixture.player.id,
    members:[fixture.player.id, observer.id],
    instance:null
  };
  fixture.groups.set(group.id, group);
  fixture.player.groupId = group.id;

  fixture.manager.preparePortalInstance(fixture.socket, "blue");

  assert.equal(fixture.player.preparedPortal?.portalId, "blue");
  assert.equal(observer.preparedPortal || null, null);
  assert.equal(group.preparedPortal || null, null);
  assert.equal(
    fixture.events.some(entry=>entry.target === observer.id && entry.event === "portal:prepared"),
    false
  );
  assert.equal(
    fixture.events.some(entry=>entry.target === group.id && entry.event === "portal:prepared"),
    false
  );

  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "blue");

  assert.equal(group.instance,null);
  const personal = fixture.instanceGroup;
  assert.notEqual(personal,group);
  assert.deepEqual(personal.instance.joinedMemberIds, [fixture.player.id]);
  assert.deepEqual(Object.keys(personal.instance.playerLives), [fixture.player.id]);
  assert.equal(
    fixture.events.some(entry=>entry.target === observer.id && entry.event === "portal:started"),
    false
  );
  assert.equal(
    fixture.events.some(entry=>entry.target === group.id && entry.event === "portal:started"),
    false
  );

  fixture.manager.emitPortalComplete(personal);
  assert.equal(
    fixture.events.some(entry=>entry.target === fixture.player.id && entry.event === "portal:complete"),
    true
  );
  assert.equal(
    fixture.events.some(entry=>entry.target === observer.id && entry.event === "portal:complete"),
    false
  );
});

test("one account cannot invoke a second portal while its private instance is active", ()=>{
  const fixture = createFixture();
  fixture.player.accountId = "account-owner";
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "blue");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "blue");

  const secondProfile = structuredClone(profile);
  secondProfile.portalPieces.blue = 15;
  const secondPlayer = fixture.addPlayer({
    id:"owner-second-session",
    name:"Owner",
    accountId:"account-owner",
    clientMode:"game",
    connected:true,
    groupId:"group-2",
    mapId:"0",
    state:{hp:1000, mapId:"0", x:0, y:0}
  }, secondProfile);
  fixture.groups.set("group-2", {
    id:"group-2",
    leaderId:secondPlayer.id,
    members:[secondPlayer.id],
    instance:null
  });

  fixture.manager.preparePortalInstance(fixture.getSocket(secondPlayer.id), "blue");

  assert.equal(lastPortalError(fixture.events)?.code, "PORTAL_ALREADY_ACTIVE");
  assert.equal(secondPlayer.preparedPortal || null, null);
  assert.equal(fixture.getProfile(secondPlayer.id).portalPieces.blue, 15);
});

test("portal preparation from the launcher targets the live game socket for the same account", ()=>{
  const fixture = createFixture();
  fixture.player.accountId = "account-1";
  fixture.player.clientMode = "launcher";
  fixture.player.state = null;

  const gameProfile = createDefaultProfile();
  gameProfile.player.level = 10;
  gameProfile.player.firmId = "cyan";
  gameProfile.player.firmSelected = true;
  gameProfile.unlockedPortals = ["blue"];
  const gamePlayer = fixture.addPlayer({
    id:"game-1",
    name:"Leader",
    accountId:"account-1",
    account:{id:"account-1", firmId:"cyan"},
    clientMode:"game",
    connected:true,
    groupId:null,
    mapId:"20",
    state:{hp:1000, mapId:"20", x:-4300, y:-3300}
  }, gameProfile);

  fixture.manager.preparePortalInstance(fixture.socket, "blue");

  assert.equal(fixture.groups.size, 0);
  assert.equal(gamePlayer.groupId, null);
  assert.equal(fixture.player.groupId, null);
  assert.equal(gamePlayer.preparedPortal.portalId, "blue");
  assert.equal(gamePlayer.preparedPortal.mapId, "20");
  assert.equal(fixture.getProfile(gamePlayer.id).preparedPortal?.mapId, "20");
  assert.equal(lastError(fixture.events), "");
  assert.equal(fixture.events.some(entry=>entry.target === "group-1" && entry.event === "portal:prepared"), false);
  assert.equal(fixture.events.some(entry=>entry.target === "leader-1" && entry.event === "portal:prepared" && entry.payload.preparedPortal?.portalId === "blue"), true);
  assert.equal(fixture.events.some(entry=>entry.target === "game-1" && entry.event === "portal:prepared" && entry.payload.preparedPortal?.portalId === "blue"), true);
});

test("portal preparation from the launcher persists on the firm map 1 without a live game socket", ()=>{
  const fixture = createFixture();
  fixture.player.accountId = "account-1";
  fixture.player.clientMode = "launcher";
  fixture.player.state = null;
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "blue");

  assert.equal(fixture.groups.size, 0);
  assert.equal(lastError(fixture.events), "");
  assert.equal(fixture.player.preparedPortal?.portalId, "blue");
  assert.equal(fixture.player.preparedPortal?.mapId, "0");
  assert.equal(fixture.player.preparedPortal?.mapName, "Helion-01");
  assert.equal(fixture.player.preparedPortal?.x, -3780);
  assert.equal(fixture.player.preparedPortal?.y, 2780);
  assert.equal(fixture.getProfile().preparedPortal?.portalId, "blue");
  assert.equal(
    fixture.events.some(entry=>
      entry.target === fixture.player.id
      && entry.event === "portal:prepared"
      && entry.payload.preparedPortal?.mapId === "0"
    ),
    true
  );
});

test("server portal start refuses dead players and duplicate active instances", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);

  fixture.player.state.hp = 0;
  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.equal(fixture.groups.size, 0);

  fixture.player.state.hp = 1000;
  fixture.manager.preparePortalInstance(fixture.socket, "blue");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.equal(fixture.instanceGroup.instance.type, "portal");

  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /deja actif/i);
});

test("Ricky portal consumes one Deadly portal key on entry", ()=>{
  const fixture = createFixture();
  let profile = createDefaultProfile();
  profile.player.level = 10;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  fixture.setProfile(profile);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  assert.match(lastError(fixture.events), /0\/1 clé du portail deadly/i);
  assert.equal(fixture.instanceGroup.instance, null);

  profile = fixture.getProfile();
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const instance = fixture.instanceGroup.instance;
  assert.equal(instance.type, "portal");
  assert.equal(instance.portal.id, "ricky");
  assert.equal(getInventoryItemCount(fixture.getProfile(), "portal_anchor_key"), 0);
  assert.equal(fixture.events.some(entry=>entry.event === "portal:started" && entry.payload.portal.id === "ricky"), true);
});

test("Ricky portal remains inaccessible until Maintenance impossible is claimed", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 10;
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");

  assert.match(lastError(fixture.events), /pas encore stabilise/i);
  assert.equal(fixture.instanceGroup.instance, null);
  assert.equal(getInventoryItemCount(fixture.getProfile(), "portal_anchor_key"), 1);
});

test("Ricky portal lets group members join the active instance with their own key", ()=>{
  const fixture = createFixture();
  let leaderProfile = createDefaultProfile();
  leaderProfile.player.level = 10;
  leaderProfile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(leaderProfile, "portal_anchor_key", 1);
  fixture.setProfile(leaderProfile);

  const member = fixture.addPlayer({
    id:"member-1",
    name:"Member",
    groupId:null,
    mapId:"0",
    state:{hp:1000, mapId:"0", x:0, y:0}
  });
  let memberProfile = createDefaultProfile();
  memberProfile.player.level = 10;
  memberProfile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(memberProfile, "portal_anchor_key", 1);
  fixture.setProfile(memberProfile, member.id);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.instanceGroup;
  member.groupId = group.id;
  group.members.push(member.id);

  const memberSocket = {
    id:member.id,
    emit(event, payload){
      fixture.events.push({target:member.id, event, payload});
    }
  };
  approachDeadly(fixture, memberSocket);
  fixture.manager.startPortalInstance(memberSocket, "ricky");

  assert.deepEqual(group.instance.joinedMemberIds.sort(), ["leader-1", "member-1"]);
  assert.equal(group.instance.playerLives["member-1"], 3);
  assert.equal(getInventoryItemCount(fixture.getProfile("leader-1"), "portal_anchor_key"), 0);
  assert.equal(getInventoryItemCount(fixture.getProfile("member-1"), "portal_anchor_key"), 0);
  assert.equal(fixture.events.some(entry=>entry.target === "member-1" && entry.event === "portal:started" && entry.payload.portal.id === "ricky"), true);

  group.instance.abandonedMemberIds.push(member.id);
  approachDeadly(fixture, memberSocket);
  fixture.manager.startPortalInstance(memberSocket, "ricky");
  assert.match(lastError(fixture.events), /abandonnee/i);
});

test("Ricky joins the portal with support stats, prioritizes the player for aggro and deploys his beacon", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.instanceGroup;
  const instance = group.instance;
  fixture.player.connected = true;
  fixture.player.clientMode = "game";
  fixture.player.mapId = "portal-ricky";
  fixture.player.state = {
    ...fixture.player.state,
    mapId:"portal-ricky",
    x:RICKY_PORTAL_MAP.spawn.x,
    y:RICKY_PORTAL_MAP.spawn.y,
    hp:1000,
    maxHp:1000,
    shield:0,
    maxShield:0
  };

  assert.equal(instance.ally.hp, 100000);
  assert.equal(instance.ally.maxHp, 100000);
  assert.equal(instance.ally.shield, 80000);
  assert.equal(instance.ally.maxShield, 80000);
  assert.equal(instance.ally.shieldRegenPerSecond, 150);
  assert.equal(instance.ally.laserDamageMin, 3000);
  assert.equal(instance.ally.laserDamageMax, 5000);
  assert.equal(instance.ally.rocketDamageMin, 1500);
  assert.equal(instance.ally.rocketDamageMax, 3000);
  assert.equal(instance.ally.attackRange, 600);
  assert.equal(instance.ally.speed, 500);

  const enemy = {
    ...instance.enemies[0],
    x:instance.ally.x,
    y:instance.ally.y,
    hp:100000,
    maxHp:100000,
    shield:0,
    maxShield:0
  };
  instance.enemies = [enemy];
  fixture.manager.updateRickyCompanions(.1, Date.now() + 10000);

  assert.equal(enemy.lockedPlayerId, fixture.player.id);
  assert.ok(Number(enemy.damageThreat?.ricky_companion || 0) > 0);
  assert.ok(enemy.hp < enemy.maxHp);
  const hits = fixture.events.filter(entry=>entry.event === "combat:hit" && entry.payload.attackerId === "ricky_companion");
  const laserHit = hits.find(entry=>entry.payload.weaponClass === "laser");
  const rocketHit = hits.find(entry=>entry.payload.weaponClass === "rocket");
  assert.ok(laserHit.payload.damage >= 3000 && laserHit.payload.damage <= 5000);
  assert.ok(rocketHit.payload.damage >= 1500 && rocketHit.payload.damage <= 3000);

  instance.ally.shield = 79000;
  instance.enemies = [];
  fixture.manager.updateRickyCompanions(2, Date.now() + 12000);
  assert.equal(instance.ally.shield, 79300);
  fixture.manager.updateRickyCompanions(10, Date.now() + 22000);
  assert.equal(instance.ally.shield, 80000);

  assert.equal(fixture.manager.activateRickyHealBeacon(fixture.socket), false);
  assert.equal(instance.beacons.length, 0);
  instance.ally.hp=70000;
  fixture.manager.updateRickyCompanions(.05, Date.now() + 23000);
  assert.equal(instance.beacons.length, 1);
  assert.equal(instance.ally.hp, 73000);
  assert.equal(instance.beacons[0].x, instance.ally.x);
  assert.equal(instance.beacons[0].y, instance.ally.y);
  assert.equal(instance.beacons[0].heal, 3000);
  assert.equal(instance.beacons[0].radius, 250);
  assert.equal(instance.beacons[0].expiresAt - instance.beacons[0].createdAt, 18000);
  assert.equal(instance.beacons[0].nextTickAt - instance.beacons[0].createdAt, 2000);

  fixture.player.mapId = "0";
  fixture.player.state.mapId = "0";
  assert.equal(fixture.manager.activateRickyHealBeacon(fixture.socket), false);
  assert.equal(instance.beacons.length, 1);
});

test("Ricky chooses his own nearby enemy and stops firing beyond 200 mini-map coordinates on either player axis", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 20;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.instanceGroup;
  const instance = group.instance;
  fixture.player.connected = true;
  fixture.player.clientMode = "game";
  fixture.player.mapId = "portal-ricky";
  fixture.player.state = {
    ...fixture.player.state,
    mapId:"portal-ricky",
    x:0,
    y:1000,
    hp:100000,
    maxHp:100000,
    shield:0,
    maxShield:0
  };
  instance.ally.x=0;
  instance.ally.y=900;
  instance.ally.nextLaserAt=0;
  instance.ally.nextRocketAt=Number.MAX_SAFE_INTEGER;
  const nearby = createDeadlyEnemy("deadly_eclaireur", {id:"nearby", x:50, y:800});
  const selected = createDeadlyEnemy("deadly_intercepteur", {id:"selected", x:0, y:350});
  fixture.player.state.attackTargetId=selected.id;
  instance.enemies=[nearby, selected];

  fixture.manager.updateRickyCompanions(.05, 10_000);

  assert.ok(nearby.hp < nearby.maxHp);
  assert.equal(selected.hp, selected.maxHp);

  const previousY = instance.ally.y;
  fixture.player.state.x=0;
  fixture.player.state.y=previousY + 2010;
  const previousHp = nearby.hp;
  fixture.manager.updateRickyCompanions(.2, 11_000);
  assert.ok(instance.ally.y > previousY);
  assert.equal(nearby.hp, previousHp);
  assert.equal(instance.ally.aiTargetId, "");
});

test("Ricky portal enforces four numbered route waves, four beacon waves and the final gate wave", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 10;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.instanceGroup;
  const instance = group.instance;
  fixture.player.connected = true;
  fixture.player.clientMode = "game";
  fixture.player.mapId = "portal-ricky";
  fixture.player.state = {
    ...fixture.player.state,
    mapId:"portal-ricky",
    hp:100000,
    maxHp:100000,
    shield:100000,
    maxShield:100000
  };

  const killEncounter = encounterId=>{
    for(const enemy of instance.enemies){
      if(enemy.rickyEncounterId === encounterId) enemy.hp=0;
    }
  };
  const aliveComposition = encounterId=>instance.enemies
    .filter(enemy=>enemy.rickyEncounterId === encounterId && enemy.hp > 0)
    .reduce((counts, enemy)=>{
      counts[enemy.kind]=(counts[enemy.kind] || 0) + 1;
      return counts;
    }, {});

  assert.deepEqual(instance.objective.levers.map(lever=>[lever.number, lever.id]), [
    [1, "south_west"],
    [2, "south_east"],
    [3, "north_east"],
    [4, "north_west"]
  ]);
  assert.equal(fixture.manager.activateRickyLever(fixture.socket, "south_east"), false);

  let now = Date.now() + 1000;
  for(const route of [...instance.objective.routeWaves].reverse()){
    fixture.player.state.x = route.centerX;
    fixture.player.state.y = route.centerY;
    fixture.manager.updateRickyCompanions(.05, now);
    assert.equal(route.triggered, true);
    assert.deepEqual(aliveComposition(`route_${route.number}`), DEADLY_ROUTE_WAVES[route.number]);

    killEncounter(`route_${route.number}`);
    fixture.manager.updateRickyCompanions(.05, now + 100);
    assert.equal(route.cleared, true);
    assert.equal(instance.objective.levers[route.number - 1].unlocked, true);
    assert.equal(instance.objective.levers.some(lever=>lever.active), false);
    now += 1000;
  }

  for(const lever of instance.objective.levers){
    fixture.player.state.x = lever.x;
    fixture.player.state.y = lever.y;
    assert.equal(fixture.manager.activateRickyLever(fixture.socket, lever.id), true);
    fixture.manager.updateRickyCompanions(.05, now + 200);
    fixture.manager.updateRickyCompanions(.05, now + 10300);
    assert.equal(lever.active, true);
    assert.deepEqual(aliveComposition(`beacon_${lever.number}`), DEADLY_BEACON_WAVES[lever.number]);

    killEncounter(`beacon_${lever.number}`);
    fixture.manager.updateRickyCompanions(.05, now + 10400);
    assert.equal(lever.activationWaveCleared, true);
    now += 20000;
  }

  assert.equal(instance.objective.finalWaveSpawned, true);
  assert.equal(instance.objective.breachOpen, false);
  assert.deepEqual(aliveComposition("final_gate"), DEADLY_FINAL_GATE_WAVE);
  killEncounter("final_gate");
  fixture.manager.updateRickyCompanions(.05, now + 1);

  assert.equal(instance.objective.finalWaveCleared, true);
  assert.equal(instance.objective.breachOpen, true);
  assert.equal(instance.objective.stage, "boss");
  assert.equal(fixture.events.some(entry=>entry.event === "portal:ricky-cinematic"), true);

  const boss = instance.enemies.find(enemy=>enemy.rickyBoss);
  assert.ok(boss);
  assert.equal(boss.type, "Amiral K-137");
  assert.equal(boss.level, 10);
  assert.equal(boss.maxHp, 1000000);
  assert.equal(boss.maxShield, 1000000);
  assert.equal(boss.attackDamageMin, 3280);
  assert.equal(boss.attackDamageMax, 4720);
  assert.equal(boss.attackCooldown, 1000);

  fixture.manager.updateRickyCompanions(.05, boss.rickyBossNextSummonAt - 1);
  assert.equal(instance.enemies.filter(enemy=>enemy.rickyBossSummon && enemy.hp > 0).length, 0);
  fixture.manager.updateRickyCompanions(.05, boss.rickyBossNextSummonAt + 1);
  assert.equal(instance.enemies.filter(enemy=>enemy.rickyBossSummon && enemy.hp > 0).length, 5);

  const nextSummonAt = boss.rickyBossNextSummonAt;
  instance.enemies.push(...Array.from({length:13}, (_, index)=>createDeadlyEnemy("deadly_eclaireur", {
    id:`extra-summon-${index}`,
    x:boss.x,
    y:boss.y,
    summonedByBoss:true,
    now:nextSummonAt
  })));
  fixture.manager.updateRickyCompanions(.05, nextSummonAt + 1);
  assert.equal(instance.enemies.filter(enemy=>enemy.rickyBossSummon && enemy.hp > 0).length, DEADLY_BOSS_MAX_LIVE_SUMMONS);
  const fullSummonAt = boss.rickyBossNextSummonAt;
  fixture.manager.updateRickyCompanions(.05, fullSummonAt + 1);
  assert.equal(instance.enemies.filter(enemy=>enemy.rickyBossSummon && enemy.hp > 0).length, DEADLY_BOSS_MAX_LIVE_SUMMONS);
  assert.equal(boss.rickyBossNextSummonAt, fullSummonAt + 1 + DEADLY_BOSS_SUMMON_INTERVAL_MS);

  boss.hp=0;
  fixture.manager.handlePortalEnemyDeath(group, boss, fixture.player.id);
  assert.equal(instance.enemies.some(enemy=>enemy.rickyBossSummon), false);
  const cage = instance.enemies.find(enemy=>enemy.rickyCage);
  assert.equal(cage.maxHp, 30000);

  cage.hp=0;
  fixture.manager.handlePortalEnemyDeath(group, cage, fixture.player.id);
  assert.equal(instance.completed, true);
  assert.equal(instance.objective.stage, "complete");
  const rewarded = fixture.getProfile();
  assert.equal(rewarded.player.credits, profile.player.credits + 2000000);
  assert.equal(rewarded.player.premium, profile.player.premium + 5000);
  assert.equal(rewarded.player.xp, profile.player.xp + 400000);

  fixture.manager.updateRickyCompanions(.05, instance.objective.exitAt + 1);
  assert.equal(fixture.player.mapId, "1");
  assert.equal(fixture.player.state.x, 4300);
  assert.equal(fixture.player.state.y, -3300);
  assert.equal(fixture.events.some(entry=>entry.event === "coop:enemies" && entry.target === fixture.player.id && entry.payload.instanceId === null), true);
  assert.equal(fixture.events.some(entry=>entry.event === "player:respawned"), true);
});

test("Ricky portal enemy rewards use the normal group split and ten percent XP reputation", ()=>{
  const fixture = createFixture();
  let leaderProfile = createDefaultProfile();
  leaderProfile.player.level = 20;
  leaderProfile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(leaderProfile, "portal_anchor_key", 1);
  fixture.setProfile(leaderProfile);

  const member = fixture.addPlayer({
    id:"member-reward",
    name:"Member",
    groupId:null,
    connected:true,
    clientMode:"game",
    mapId:"portal-ricky",
    state:{hp:1000, maxHp:1000, mapId:"portal-ricky", x:0, y:0}
  });
  let memberProfile = createDefaultProfile();
  memberProfile.player.level = 20;
  memberProfile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(memberProfile, "portal_anchor_key", 1);
  fixture.setProfile(memberProfile, member.id);

  approachDeadly(fixture, fixture.socket);
  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.instanceGroup;
  member.groupId = group.id;
  group.members.push(member.id);
  approachDeadly(fixture, {id:member.id});
  fixture.manager.startPortalInstance({
    id:member.id,
    emit(event, payload){
      fixture.events.push({target:member.id, event, payload});
    }
  }, "ricky");
  member.mapId = "portal-ricky";
  member.state.mapId = "portal-ricky";

  fixture.player.connected = true;
  fixture.player.clientMode = "game";
  fixture.player.mapId = "portal-ricky";
  fixture.player.state = {...fixture.player.state, hp:1000, maxHp:1000, mapId:"portal-ricky"};

  const enemy = createDeadlyEnemy("deadly_eclaireur", {id:"reward-scout", x:0, y:0});
  enemy.hp=0;
  group.instance.enemies=[enemy];
  fixture.manager.handlePortalEnemyDeath(group, enemy, fixture.player.id);

  const rewards = fixture.events.filter(entry=>entry.event === "player:reward" && entry.payload.enemyId === enemy.id);
  assert.equal(rewards.length, 2);
  for(const reward of rewards){
    assert.equal(reward.payload.share, .5);
    assert.equal(reward.payload.credits, 10_000);
    assert.equal(reward.payload.premium, 8);
    assert.equal(reward.payload.xp, 4_500);
    assert.equal(reward.payload.reputation, 450);
  }
});

test("a prepared Nox portal is authorized and starts its station-defense encounter", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 35;
  profile.unlockedPortals = ["void"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "void");
  assert.equal(fixture.player.preparedPortal?.portalId, "void");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "void");

  const group = fixture.instanceGroup;
  const instance = group?.instance;
  assert.equal(instance?.portal?.id, "void");
  assert.equal(instance?.portal?.totalWaves, 30);
  assert.equal(instance?.wave, 1);
  assert.equal(instance?.waveBatchEnd, 5);
  assert.equal(instance?.objective?.kind, "nox");
  assert.equal(instance?.objective?.shield?.hp, 1_000_000);
  assert.equal(instance?.objective?.core?.hp, 3_000_000);
  assert.equal(instance?.objective?.defenses?.length, 6);
  assert.equal(instance?.playerLives?.[fixture.player.id], 3);
  assert.equal(fixture.player.preparedPortal, null);

  const started = fixture.events.filter(entry=>entry.event === "portal:started").at(-1)?.payload;
  assert.equal(started?.waveTotal, 30);
  assert.equal(started?.objective?.kind, "nox");
});

test("a prepared Prismatic portal is authorized and starts its guarded-planet encounter", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 40;
  profile.unlockedPortals = ["prismatic"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "prismatic");
  assert.equal(fixture.player.preparedPortal?.portalId, "prismatic");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "prismatic");

  const instance = fixture.instanceGroup?.instance;
  assert.equal(instance?.portal?.id, "prismatic");
  assert.equal(instance?.portal?.totalWaves, 0);
  assert.equal(instance?.privateOwner, true);
  assert.equal(instance?.ownerPlayerId, fixture.player.id);
  assert.equal(instance?.wave, 0);
  assert.equal(instance?.waveState, "planets");
  assert.equal(instance?.objective?.kind, "prismatic");
  assert.equal(instance?.objective?.stage, "planets");
  assert.equal(instance?.enemies?.filter(enemy=>enemy.prismaticPlanet).length, 3);
  assert.equal(instance?.enemies?.filter(enemy=>enemy.prismaticGuardian).length, 9);
  assert.equal(instance?.playerLives?.[fixture.player.id], 3);
  assert.equal(fixture.player.preparedPortal, null);

  const started = fixture.events.filter(entry=>entry.event === "portal:started").at(-1)?.payload;
  assert.equal(started?.waveTotal, 0);
  assert.equal(started?.objective?.kind, "prismatic");
  assert.equal(started?.objective?.stage, "planets");
});

test("a prepared Ancient portal is authorized and starts its private timed rescue", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 45;
  profile.unlockedPortals = ["ancient"];
  fixture.setProfile(profile);

  fixture.manager.preparePortalInstance(fixture.socket, "ancient");
  assert.equal(fixture.player.preparedPortal?.portalId, "ancient");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "ancient");

  const group = fixture.instanceGroup;
  const instance = group?.instance;
  assert.equal(instance?.portal?.id, "ancient");
  assert.equal(instance?.portal?.totalWaves, 0);
  assert.equal(instance?.privateOwner, true);
  assert.equal(instance?.wave, 0);
  assert.equal(instance?.waveState, "escape");
  assert.equal(instance?.objective?.kind, "precursors");
  assert.equal(instance?.objective?.phase, "hell");
  assert.equal(instance?.objective?.rooms?.length, 5);
  assert.equal(instance?.enemies?.filter(enemy=>enemy.precursorRole === "infernal_cage").length, 5);
  assert.equal(instance?.enemies?.filter(enemy=>enemy.precursorRole === "demon_guard").length, 20);
  assert.equal(instance?.playerLives?.[fixture.player.id], 3);
  assert.equal(fixture.player.preparedPortal, null);

  const started = fixture.events.filter(entry=>entry.event === "portal:started").at(-1)?.payload;
  assert.equal(started?.waveTotal, 0);
  assert.equal(started?.objective?.kind, "precursors");
  assert.equal(started?.objective?.stage, "rescue");

  for(const enemy of [...instance.enemies]){
    enemy.hp = 0;
    fixture.manager.handlePortalEnemyDeath(group, enemy, fixture.player.id);
  }
  assert.equal(instance.completed, false);
  assert.equal(instance.rewardGranted, undefined);
  assert.equal(
    fixture.events.some(entry=>entry.event === "portal:complete" && entry.payload?.portal?.id === "ancient"),
    false
  );
});

test("Ancient escape timeout expels the owner atomically without reward or life retry", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 45;
  profile.unlockedPortals = ["ancient"];
  fixture.setProfile(profile);
  fixture.manager.preparePortalInstance(fixture.socket, "ancient");
  movePlayerToPreparedPortal(fixture);
  fixture.manager.startPortalInstance(fixture.socket, "ancient");

  const group = fixture.instanceGroup;
  const instance = group.instance;
  instance.objective.deadlineAt = 1;
  fixture.manager.updatePrecursorEncounters(.05, Date.now());

  assert.equal(group.instance, null);
  assert.notEqual(String(fixture.player.state.mapId), "portal-ancient");
  assert.equal(Number(fixture.getProfile().completedPortals.ancient || 0), 0);
  const failed = fixture.events.filter(entry=>entry.event === "portal:failed").at(-1)?.payload;
  assert.equal(failed?.code, "PRECURSOR_TIMER_EXPIRED");
  assert.equal(failed?.rewardAppliedByServer, false);
  assert.equal(
    fixture.events.some(entry=>entry.event === "portal:complete" && entry.payload?.portal?.id === "ancient"),
    false
  );
});

test("the future Vesper completion path already grants its server reward table", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 50;
  profile.unlockedPortals = ["violet"];
  fixture.setProfile(profile);

  const group = {
    id:"group-1",
    leaderId:fixture.player.id,
    members:[fixture.player.id],
    instance:null
  };
  fixture.groups.set(group.id, group);
  fixture.player.groupId = group.id;
  group.instance = {
    id:"P-future-vesper",
    type:"portal",
    portal:{id:"violet", name:"La Faille de Vesper"},
    completed:false,
    rewardGranted:false,
    abandonedMemberIds:[]
  };

  fixture.manager.emitPortalComplete(group);

  const rewarded = fixture.getProfile();
  assert.equal(rewarded.player.premium, Number(profile.player.premium || 0) + 20_000);
  assert.equal(rewarded.ammoInventory.ammo_x4, Number(profile.ammoInventory.ammo_x4 || 0) + 20_000);
  assert.equal(rewarded.completedPortals.violet, 1);
  assert.equal(getInventoryItemCount(rewarded, "drone_overdrive_chip"), 1);
  const complete = fixture.events.filter(entry=>entry.event === "portal:complete").at(-1)?.payload;
  assert.equal(complete?.rewardItemId, "drone_overdrive_chip");
  assert.equal(complete?.firstClear, true);
});
