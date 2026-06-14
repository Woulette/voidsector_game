import assert from "node:assert/strict";
import test from "node:test";
import { addInventoryItemAmount, getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";

function createFixture(){
  const events = [];
  const groups = new Map();
  const player = {
    id:"leader-1",
    name:"Leader",
    groupId:null,
    mapId:"0",
    state:{hp:1000, mapId:"0", x:0, y:0}
  };
  const players = new Map([[player.id, player]]);
  const profiles = new Map([[player.id, createDefaultProfile()]]);
  const socket = {
    id:player.id,
    emit(event, payload){
      events.push({target:player.id, event, payload});
    }
  };
  const manager = createPortalInstanceManager({
    io:{
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
      player.groupId = group.id;
      return group;
    },
    emitInstance(group){
      events.push({target:group.id, event:"instance:update", payload:{instanceId:group.instance?.id || null}});
    },
    firmWarManager:null,
    portalWaveTotal:5
  });

  return {
    events,
    groups,
    manager,
    player,
    addPlayer(nextPlayer, nextProfile = createDefaultProfile()){
      players.set(nextPlayer.id, nextPlayer);
      profiles.set(nextPlayer.id, structuredClone(nextProfile));
      return nextPlayer;
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

test("server portal start requires an unlocked portal and the required player level", ()=>{
  const fixture = createFixture();
  let profile = createDefaultProfile();
  profile.player.level = 15;
  profile.unlockedPortals = [];
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /non deverrouille/i);
  assert.equal(fixture.groups.get("group-1").instance, null);

  profile = createDefaultProfile();
  profile.player.level = 14;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /niveau 15/i);
  assert.equal(fixture.groups.get("group-1").instance, null);

  profile.player.level = 15;
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "blue");
  const instance = fixture.groups.get("group-1").instance;
  assert.equal(instance.type, "portal");
  assert.equal(instance.portal.id, "blue");
  assert.equal(instance.playerLives["leader-1"], 3);
  assert.equal(fixture.events.some(entry=>entry.event === "portal:started"), true);
});

test("server portal start refuses dead players and duplicate active instances", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 15;
  profile.unlockedPortals = ["blue"];
  fixture.setProfile(profile);

  fixture.player.state.hp = 0;
  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.equal(fixture.groups.size, 0);

  fixture.player.state.hp = 1000;
  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.equal(fixture.groups.get("group-1").instance.type, "portal");

  fixture.manager.startPortalInstance(fixture.socket, "blue");
  assert.match(lastError(fixture.events), /deja actif/i);
});

test("Ricky portal consumes one dimensional anchor key on entry", ()=>{
  const fixture = createFixture();
  let profile = createDefaultProfile();
  profile.player.level = 10;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  assert.match(lastError(fixture.events), /cle d'ancrage dimensionnel/i);
  assert.equal(fixture.groups.get("group-1").instance, null);

  profile = fixture.getProfile();
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const instance = fixture.groups.get("group-1").instance;
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

  fixture.manager.startPortalInstance(fixture.socket, "ricky");

  assert.match(lastError(fixture.events), /pas encore stabilise/i);
  assert.equal(fixture.groups.get("group-1").instance, null);
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

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.groups.get("group-1");
  member.groupId = group.id;
  group.members.push(member.id);

  const memberSocket = {
    id:member.id,
    emit(event, payload){
      fixture.events.push({target:member.id, event, payload});
    }
  };
  fixture.manager.startPortalInstance(memberSocket, "ricky");

  assert.deepEqual(group.instance.joinedMemberIds.sort(), ["leader-1", "member-1"]);
  assert.equal(group.instance.playerLives["member-1"], 3);
  assert.equal(getInventoryItemCount(fixture.getProfile("leader-1"), "portal_anchor_key"), 0);
  assert.equal(getInventoryItemCount(fixture.getProfile("member-1"), "portal_anchor_key"), 0);
  assert.equal(fixture.events.some(entry=>entry.target === "member-1" && entry.event === "portal:started" && entry.payload.portal.id === "ricky"), true);

  group.instance.abandonedMemberIds.push(member.id);
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

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.groups.get("group-1");
  const instance = group.instance;
  fixture.player.connected = true;
  fixture.player.clientMode = "game";
  fixture.player.mapId = "portal-ricky";
  fixture.player.state = {...fixture.player.state, mapId:"portal-ricky", hp:1000, maxHp:1000, shield:0, maxShield:0};

  assert.equal(instance.ally.hp, 50000);
  assert.equal(instance.ally.maxHp, 50000);
  assert.equal(instance.ally.shield, 30000);
  assert.equal(instance.ally.maxShield, 30000);
  assert.equal(instance.ally.attackRange, 600);

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

  assert.equal(fixture.manager.activateRickyHealBeacon(fixture.socket), true);
  assert.equal(instance.beacons.length, 1);
  assert.equal(instance.beacons[0].heal, 3000);
  assert.equal(instance.beacons[0].radius, 250);
  assert.equal(instance.beacons[0].expiresAt - instance.beacons[0].nextTickAt, 18000);

  fixture.player.mapId = "0";
  fixture.player.state.mapId = "0";
  assert.equal(fixture.manager.activateRickyHealBeacon(fixture.socket), false);
  assert.equal(instance.beacons.length, 1);
});
