import assert from "node:assert/strict";
import test from "node:test";
import { addInventoryItemAmount, getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import {
  createDeadlyEnemy,
  DEADLY_BEACON_WAVES,
  DEADLY_BOSS_MAX_LIVE_SUMMONS,
  DEADLY_BOSS_SUMMON_INTERVAL_MS,
  DEADLY_FINAL_GATE_WAVE,
  DEADLY_ROUTE_WAVES
} from "../src/portals/deadlyEnemies.js";
import { RICKY_PORTAL_MAP } from "../../src/data/rickyPortal.js";

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

test("Ricky portal consumes one Deadly portal key on entry", ()=>{
  const fixture = createFixture();
  let profile = createDefaultProfile();
  profile.player.level = 10;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  assert.match(lastError(fixture.events), /0\/1 clé du portail deadly/i);
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

test("Ricky prioritizes the enemy targeted by a player and only returns when the player exceeds his leash", ()=>{
  const fixture = createFixture();
  const profile = createDefaultProfile();
  profile.player.level = 20;
  profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
  addInventoryItemAmount(profile, "portal_anchor_key", 1);
  fixture.setProfile(profile);

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.groups.get("group-1");
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

  assert.equal(nearby.hp, nearby.maxHp);
  assert.ok(selected.hp < selected.maxHp);

  const previousY = instance.ally.y;
  fixture.player.state.x=0;
  fixture.player.state.y=2300;
  fixture.manager.updateRickyCompanions(.2, 11_000);
  assert.ok(instance.ally.y > previousY);
});

test("Ricky portal enforces four numbered route waves, four beacon waves and the final gate wave", ()=>{
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
  assert.equal(boss.level, 20);
  assert.equal(boss.maxHp, 2000000);
  assert.equal(boss.maxShield, 1000000);
  assert.equal(boss.attackDamageMin, 3500);
  assert.equal(boss.attackDamageMax, 5000);
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

  fixture.manager.startPortalInstance(fixture.socket, "ricky");
  const group = fixture.groups.get("group-1");
  member.groupId = group.id;
  group.members.push(member.id);
  fixture.manager.startPortalInstance({
    id:member.id,
    emit(event, payload){
      fixture.events.push({target:member.id, event, payload});
    }
  }, "ricky");

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
    assert.equal(reward.payload.credits, 12_000);
    assert.equal(reward.payload.premium, 10);
    assert.equal(reward.payload.xp, 3_200);
    assert.equal(reward.payload.reputation, 320);
  }
});
