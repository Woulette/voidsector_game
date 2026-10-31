import assert from "node:assert/strict";
import test from "node:test";
import { createShipAbilityEffectManager } from "../src/combat/shipAbilityEffects.js";
import { prepareNpcEliteLaserAttack } from "../src/combat/npcEliteLasers.js";
import {
  createEclaniteBoss,
  createEclaniteCore,
  createEclaniteGuardian,
  createEclanitePortalRuntime,
  ECLANITE_BOSS_DAMAGE_MAX,
  ECLANITE_BOSS_DAMAGE_MIN,
  ECLANITE_BOSS_RANGE,
  ECLANITE_BOSS_SPEED,
  ECLANITE_CORE_DAMAGE_MULTIPLIER,
  ECLANITE_CORE_MAX_HP,
  ECLANITE_PORTAL_ID,
  ECLANITE_PORTAL_LEVEL,
  ECLANITE_PORTAL_MAP,
  ECLANITE_ZONE_COUNT,
  ECLANITE_ZONE_DURATION_MS,
  publicEclaniteObjective,
  scaleEclaniteEnemyDamage
} from "../src/portals/eclanitePortal.js";
import { getServerPortalDefinition } from "../src/portals/portalDefinitions.js";
import { createEnemyAttackManager } from "../src/world/enemyAttacks.js";
import {
  getEclanitePortalWalls,
  resolveEclanitePortalPoint
} from "../../src/data/eclanitePortal.js";

function createRuntimeFixture(initialNow = 10_000){
  let currentTime = initialNow;
  let completionCount = 0;
  const snapshots = [];
  const instance = {
    id:"eclanite-runtime",
    type:"portal",
    portal:{id:ECLANITE_PORTAL_ID, name:"La Ruche d’Éclanite", totalWaves:0},
    completed:false,
    enemies:[]
  };
  const group = {id:"eclanite-group", members:[], instance};
  const groups = new Map([[group.id, group]]);
  const runtime = createEclanitePortalRuntime({
    groups,
    now:()=>currentTime,
    emitInstance(emittedGroup){
      snapshots.push(publicEclaniteObjective(emittedGroup.instance, currentTime));
    },
    emitPortalComplete(){
      completionCount += 1;
    }
  });
  return {
    group,
    groups,
    instance,
    runtime,
    snapshots,
    completionCount:()=>completionCount,
    setNow(value){ currentTime = value; }
  };
}

function livingGuardians(instance){
  return instance.enemies.filter(enemy=>enemy.eclaniteGuardian && Number(enemy.hp || 0) > 0);
}

function currentCore(instance){
  return instance.enemies.find(enemy=>enemy.eclaniteCore && Number(enemy.hp || 0) > 0) || null;
}

function currentBoss(instance){
  return instance.enemies.find(enemy=>enemy.eclaniteBoss && Number(enemy.hp || 0) > 0) || null;
}

function clearGuardians(fixture, at){
  fixture.setNow(at);
  const guardians = livingGuardians(fixture.instance);
  const deadlineAt = fixture.instance.objective.deadlineAt;
  for(const guardian of guardians){
    guardian.hp = 0;
    assert.equal(fixture.runtime.handleEnemyDeath(fixture.group, guardian, at), true);
  }
  assert.equal(fixture.instance.objective.deadlineAt, deadlineAt);
  return currentCore(fixture.instance);
}

test("Éclanite keeps canonical emerald progression metadata and is playable at level 30", ()=>{
  const definition = getServerPortalDefinition(ECLANITE_PORTAL_ID);
  assert.equal(definition.id, "emerald");
  assert.equal(definition.name, "La Ruche d’Éclanite");
  assert.equal(definition.level, ECLANITE_PORTAL_LEVEL);
  assert.equal(definition.piecesRequired, 60);
  assert.equal(definition.gameplayReady, true);
  assert.deepEqual(definition.drop.mapNumbers, [2, 3, 4, 5]);
  assert.equal(definition.drop.includeCore, true);
  assert.equal(definition.reward.ammoX6, 5_000);
  assert.equal(definition.reward.premium, 50_000);
});

test("the shared map defines three compartments and opens only the requested breach", ()=>{
  assert.equal(ECLANITE_ZONE_COUNT, 3);
  assert.equal(ECLANITE_PORTAL_MAP.zones.length, 3);
  assert.deepEqual(ECLANITE_PORTAL_MAP.zones.map(zone=>zone.id), [1, 2, 3]);

  assert.deepEqual(
    getEclanitePortalWalls().map(wall=>wall.id),
    ["vertical_locked", "horizontal_locked"]
  );
  assert.deepEqual(
    getEclanitePortalWalls({oneOpen:true, twoOpen:false}).map(wall=>wall.id),
    ["vertical_north", "vertical_south", "horizontal_locked"]
  );
  assert.deepEqual(
    getEclanitePortalWalls({oneOpen:true, twoOpen:true}).map(wall=>wall.id),
    ["vertical_north", "vertical_south", "horizontal_west", "horizontal_east"]
  );

  const blockedOne = resolveEclanitePortalPoint(
    {x:-300, y:ECLANITE_PORTAL_MAP.breachOne.y},
    {x:300, y:ECLANITE_PORTAL_MAP.breachOne.y},
    {oneOpen:false, twoOpen:false},
    48
  );
  assert.ok(blockedOne.x < 0);
  assert.deepEqual(
    resolveEclanitePortalPoint(
      {x:-300, y:ECLANITE_PORTAL_MAP.breachOne.y},
      {x:300, y:ECLANITE_PORTAL_MAP.breachOne.y},
      {oneOpen:true, twoOpen:false},
      48
    ),
    {x:300, y:ECLANITE_PORTAL_MAP.breachOne.y}
  );

  const blockedTwo = resolveEclanitePortalPoint(
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:300},
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:-300},
    {oneOpen:true, twoOpen:false},
    48
  );
  assert.ok(blockedTwo.y > 0);
  assert.deepEqual(
    resolveEclanitePortalPoint(
      {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:300},
      {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:-300},
      {oneOpen:true, twoOpen:true},
      48
    ),
    {x:ECLANITE_PORTAL_MAP.breachTwo.x, y:-300}
  );
});

test("guardians, protected cores and all three bosses keep authoritative combat stats", ()=>{
  const guardian = createEclaniteGuardian(1, 0, 1_000);
  assert.equal(guardian.level, ECLANITE_PORTAL_LEVEL);
  assert.equal(guardian.eclaniteGuardian, true);
  assert.equal(guardian.noReward, false);
  assert.ok(Number(guardian.reward?.credits || 0) > 0);
  assert.ok(Number(guardian.reward?.xp || 0) > 0);

  const core = createEclaniteCore(1, 1_000);
  assert.equal(core.hp, ECLANITE_CORE_MAX_HP);
  assert.equal(core.maxHp, ECLANITE_CORE_MAX_HP);
  assert.equal(core.shield, 0);
  assert.equal(core.maxShield, 0);
  assert.equal(core.static, true);
  assert.equal(core.anchored, true);
  assert.equal(core.damageImmune, true);
  assert.equal(core.eclaniteCoreExposed, false);
  assert.equal(core.noReward, true);

  const expectedLasers = [
    {zone:1, color:"green", count:20},
    {zone:2, color:"red", count:20},
    {zone:3, color:"blue", count:30}
  ];
  for(const expected of expectedLasers){
    const boss = createEclaniteBoss(expected.zone, 3_456_789, 2_000 + expected.zone);
    assert.equal(boss.eclaniteBoss, true);
    assert.equal(boss.eclaniteZone, expected.zone);
    assert.deepEqual(boss.eclaniteLaser, {
      color:expected.color,
      count:expected.count
    });
    assert.equal(boss.hp, 3_456_789);
    assert.equal(boss.maxHp, ECLANITE_CORE_MAX_HP);
    assert.equal(boss.shield, 0);
    assert.equal(boss.maxShield, 0);
    assert.equal(boss.attackDamageMin, ECLANITE_BOSS_DAMAGE_MIN);
    assert.equal(boss.attackDamageMax, ECLANITE_BOSS_DAMAGE_MAX);
    assert.equal(boss.attackDamageMin, 8_000);
    assert.equal(boss.attackDamageMax, 12_000);
    assert.equal(boss.attackRange, ECLANITE_BOSS_RANGE);
    assert.equal(boss.attackRange, 450);
    assert.equal(boss.speed, ECLANITE_BOSS_SPEED);
    assert.equal(boss.speed, 300);
    assert.equal(boss.useExactDamageRange, true);
    assert.equal(boss.noReward, true);
    assert.deepEqual(boss.reward, {credits:0, xp:0, premium:0});
  }
});

test("NPC elite lasers charge for five seconds then apply exact green, red and blue semantics", ()=>{
  const green = createEclaniteBoss(1, ECLANITE_CORE_MAX_HP, 1_000);
  const red = createEclaniteBoss(2, ECLANITE_CORE_MAX_HP, 1_000);
  const blue = createEclaniteBoss(3, ECLANITE_CORE_MAX_HP, 1_000);

  for(const boss of [green, red, blue]){
    const charging = prepareNpcEliteLaserAttack(boss, {
      amount:10_000,
      cooldownMs:1_000,
      now:1_000
    });
    assert.equal(charging.eliteLaser.triggered, false);
  }

  const greenCharged = prepareNpcEliteLaserAttack(green, {
    amount:10_000,
    cooldownMs:1_000,
    now:6_000
  });
  assert.equal(greenCharged.eliteLaser.triggered, true);
  assert.equal(greenCharged.eliteLaser.lifeStealPercent, .20);
  assert.equal(greenCharged.amount, 10_000);

  const redCharged = prepareNpcEliteLaserAttack(red, {
    amount:10_000,
    cooldownMs:1_000,
    now:6_000
  });
  assert.equal(redCharged.eliteLaser.triggered, true);
  assert.equal(redCharged.eliteLaser.damageBonus, .20);
  assert.equal(redCharged.amount, 12_000);

  const blueDischarge = prepareNpcEliteLaserAttack(blue, {
    amount:10_000,
    cooldownMs:1_000,
    now:6_000
  });
  assert.equal(blueDischarge.eliteLaser.triggered, true);
  assert.equal(blueDischarge.eliteLaser.phase, "discharge");
  assert.equal(blueDischarge.eliteLaser.cadenceBonus, .15);
  assert.ok(Math.abs(blueDischarge.cooldownMs - 1_000 / 1.15) < .000001);
});

test("green boss lifesteal uses twenty percent of real durability lost, not requested overkill", ()=>{
  const events = [];
  const boss = createEclaniteBoss(1, 4_000_000, 1_000);
  const target = {
    id:"eclanite-target",
    connected:true,
    mapId:"portal-emerald",
    state:{
      mapId:"portal-emerald",
      x:0,
      y:0,
      hp:1_000,
      maxHp:1_000,
      shield:0,
      maxShield:0
    }
  };
  const manager = createEnemyAttackManager({
    io:{
      to(targetId){
        return {emit:(event, payload)=>events.push({targetId, event, payload})};
      }
    },
    players:new Map([[target.id, target]]),
    presence:{
      isActiveForWorld:()=>true,
      markCombat(){},
      applyDamageToPlayerState(player, amount){
        const before = Number(player.state.hp || 0);
        player.state.hp = Math.max(0, before - Math.max(0, Number(amount || 0)));
        return before - Number(player.state.hp || 0);
      }
    },
    profileManager:{
      applyQuestAction(){ return {updates:[], failed:[]}; },
      saveWorldSession(){}
    },
    emitProfileSync(){}
  });

  manager.launchEnemyAttack({
    enemy:boss,
    map:{id:"portal-emerald", room:"instance:eclanite-runtime"},
    target,
    amount:10_000,
    now:1_000,
    eliteLaser:{
      color:"green",
      triggered:true,
      lifeStealPercent:.20
    }
  });
  manager.updatePendingEnemyAttacks(3_000);

  assert.equal(target.state.hp, 0);
  assert.equal(boss.hp, 4_000_200);
  const heal = events.find(entry=>
    entry.event === "npc:heal"
    && entry.payload.abilityId === "elite_laser_green"
  );
  assert.equal(heal?.payload.amount, 200);
});

test("five-times damage applies only to an exposed core, including persistent poison ticks", ()=>{
  const guardian = createEclaniteGuardian(1, 0, 1_000);
  const core = createEclaniteCore(1, 1_000);
  const boss = createEclaniteBoss(1, 4_000_000, 1_000);

  assert.equal(scaleEclaniteEnemyDamage(guardian, 1_000), 1_000);
  assert.equal(scaleEclaniteEnemyDamage(core, 1_000), 1_000);
  assert.equal(scaleEclaniteEnemyDamage(boss, 1_000), 1_000);
  core.damageImmune = false;
  core.eclaniteCoreExposed = true;
  assert.equal(scaleEclaniteEnemyDamage(core, 1_000), 5_000);
  assert.equal(ECLANITE_CORE_DAMAGE_MULTIPLIER, 5);

  core.hp = 100_000;
  boss.hp = 100_000;
  core.shipPoison = {
    sourceId:"poison_bomb",
    damagePerTick:1_000,
    tickIntervalMs:1_000,
    nextTickAt:2_000,
    expiresAt:5_000
  };
  boss.shipPoison = {
    sourceId:"poison_bomb",
    damagePerTick:1_000,
    tickIntervalMs:1_000,
    nextTickAt:2_000,
    expiresAt:5_000
  };
  const player = {
    id:"poison-owner",
    groupId:"eclanite-group",
    mapId:"portal-emerald",
    state:{mapId:"portal-emerald", hp:1_000, x:0, y:0}
  };
  const instance = {
    id:"eclanite-poison",
    type:"portal",
    portal:{id:ECLANITE_PORTAL_ID},
    completed:false,
    enemies:[core, boss]
  };
  const group = {id:"eclanite-group", members:[player.id], instance};
  const manager = createShipAbilityEffectManager({
    io:{to(){ return {emit(){}}; }},
    players:new Map([[player.id, player]]),
    groups:new Map([[group.id, group]]),
    profileManager:{},
    emitInstance(){},
    handlePortalEnemyDeath(){}
  });
  manager.poisonRecords.set("core", {
    scope:"instance",
    groupId:group.id,
    enemyId:core.id,
    attackerId:player.id
  });
  manager.poisonRecords.set("boss", {
    scope:"instance",
    groupId:group.id,
    enemyId:boss.id,
    attackerId:player.id
  });

  manager.updateShipAbilityEffects(2_000);
  assert.equal(core.hp, 95_000);
  assert.equal(boss.hp, 99_000);
});

test("one exact 180 second timer governs guardians and exposed core before a single boss transition", ()=>{
  const fixture = createRuntimeFixture(10_000);
  assert.equal(fixture.runtime.start(fixture.group), true);
  assert.equal(fixture.instance.objective.kind, "eclanite");
  assert.equal(fixture.instance.objective.zone, 1);
  assert.equal(fixture.instance.objective.phase, "guardians");
  assert.equal(fixture.instance.objective.deadlineAt, 10_000 + ECLANITE_ZONE_DURATION_MS);
  assert.equal(fixture.instance.nextWaveAt, fixture.instance.objective.deadlineAt);
  assert.equal(livingGuardians(fixture.instance).length, 8);
  assert.equal(currentCore(fixture.instance)?.damageImmune, true);

  const deadlineAt = fixture.instance.objective.deadlineAt;
  assert.equal(fixture.runtime.updateGroup(fixture.group, deadlineAt - 1), false);
  const core = clearGuardians(fixture, 20_000);
  assert.ok(core);
  assert.equal(fixture.instance.objective.phase, "core");
  assert.equal(core.damageImmune, false);
  assert.equal(core.eclaniteCoreExposed, true);
  assert.equal(fixture.instance.objective.deadlineAt, deadlineAt);

  core.hp = 1_234_567;
  assert.equal(fixture.runtime.updateGroup(fixture.group, deadlineAt), true);
  const boss = currentBoss(fixture.instance);
  assert.ok(boss);
  assert.equal(boss.hp, 1_234_567);
  assert.equal(boss.eclaniteLaser.color, "green");
  const bossId = boss.id;
  assert.equal(fixture.runtime.updateGroup(fixture.group, deadlineAt + 1), false);
  assert.equal(currentBoss(fixture.instance)?.id, bossId);
});

test("core kills open breaches without a boss, uncleared timeout creates a full boss, and zone 3 completes once", ()=>{
  const fixture = createRuntimeFixture(10_000);
  fixture.runtime.start(fixture.group);

  const zoneOneCore = clearGuardians(fixture, 20_000);
  zoneOneCore.hp = 0;
  fixture.runtime.handleEnemyDeath(fixture.group, zoneOneCore, 30_000);
  assert.equal(fixture.instance.objective.zone, 2);
  assert.equal(fixture.instance.objective.phase, "guardians");
  assert.equal(fixture.instance.objective.breaches.oneOpen, true);
  assert.equal(fixture.instance.objective.breaches.twoOpen, false);
  assert.equal(currentBoss(fixture.instance), null);
  assert.equal(fixture.instance.objective.deadlineAt, 30_000 + ECLANITE_ZONE_DURATION_MS);

  const zoneTwoCore = clearGuardians(fixture, 40_000);
  zoneTwoCore.hp = 2_345_678;
  const zoneTwoDeadline = fixture.instance.objective.deadlineAt;
  fixture.runtime.updateGroup(fixture.group, zoneTwoDeadline);
  const redBoss = currentBoss(fixture.instance);
  assert.ok(redBoss);
  assert.equal(redBoss.hp, 2_345_678);
  assert.deepEqual(redBoss.eclaniteLaser, {color:"red", count:20});

  redBoss.hp = 0;
  fixture.runtime.handleEnemyDeath(fixture.group, redBoss, zoneTwoDeadline + 1);
  assert.equal(fixture.instance.objective.zone, 3);
  assert.equal(fixture.instance.objective.breaches.oneOpen, true);
  assert.equal(fixture.instance.objective.breaches.twoOpen, true);
  assert.equal(fixture.instance.objective.deadlineAt, zoneTwoDeadline + 1 + ECLANITE_ZONE_DURATION_MS);

  const zoneThreeDeadline = fixture.instance.objective.deadlineAt;
  assert.ok(livingGuardians(fixture.instance).length > 0);
  fixture.runtime.updateGroup(fixture.group, zoneThreeDeadline);
  const blueBoss = currentBoss(fixture.instance);
  assert.ok(blueBoss);
  assert.equal(blueBoss.hp, ECLANITE_CORE_MAX_HP);
  assert.deepEqual(blueBoss.eclaniteLaser, {color:"blue", count:30});

  blueBoss.hp = 0;
  fixture.runtime.handleEnemyDeath(fixture.group, blueBoss, zoneThreeDeadline + 1);
  assert.equal(fixture.instance.objective.phase, "complete");
  assert.equal(fixture.instance.objective.zone, 3);
  assert.equal(fixture.instance.objective.completedAt, zoneThreeDeadline + 1);
  assert.equal(fixture.instance.waveState, "completed");
  assert.deepEqual(fixture.instance.enemies, []);
  assert.equal(fixture.completionCount(), 1);

  fixture.runtime.handleEnemyDeath(fixture.group, blueBoss, zoneThreeDeadline + 2);
  fixture.runtime.updateGroup(fixture.group, zoneThreeDeadline + 2);
  assert.equal(fixture.completionCount(), 1);
});
