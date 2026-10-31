import { createPortalInstanceManager } from "../src/portals/instances.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
  applyNoxInfrastructureDamage,
  buildNoxPortalWave,
  createNoxKamikaze,
  createNoxObjective,
  createNoxPortalRuntime,
  explodeNoxKamikaze,
  NOX_BOSS_MAX_HP,
  NOX_BOSS_MAX_SHIELD,
  NOX_CORE_MAX_HP,
  NOX_DEFENSE_MAX_HP,
  NOX_DRONE_DAMAGE_MAX,
  NOX_DRONE_DAMAGE_MIN,
  NOX_DRONE_MAX_HP,
  NOX_DRONES_PER_SUMMONER,
  NOX_DRONE_RANGE,
  NOX_DRONE_SPEED,
  NOX_KAMIKAZE_BLAST_RADIUS,
  NOX_KAMIKAZE_DAMAGE,
  NOX_PORTAL_ID,
  NOX_PORTAL_LEVEL,
  NOX_PORTAL_MAP,
  NOX_SHIELD_MAX_HP,
  NOX_SUMMON_COOLDOWN_MS,
  NOX_TOTAL_WAVES,
  NOX_TURRET_COOLDOWN_MS,
  NOX_TURRET_DAMAGE_MAX,
  NOX_TURRET_DAMAGE_MIN,
  NOX_WAVE_GROUP_SIZE,
  NOX_WAVE_INTERVAL_MS,
  publicNoxObjective
} from "../src/portals/noxPortal.js";

function createFixture(initialNow = 10_000, options = {}){
  let currentTime = initialNow;
  let completions = 0;
  let failures = 0;
  const emitted = [];
  const attacks = [];
  const instance = {
    id:"nox-instance",
    type:"portal",
    portal:{id:NOX_PORTAL_ID, name:"L’Abîme de Nox", totalWaves:NOX_TOTAL_WAVES},
    completed:false,
    enemies:[]
  };
  const group = {id:"nox-group", members:[], instance};
  const groups = new Map([[group.id, group]]);
  const players = options.players || new Map();
  const runtime = createNoxPortalRuntime({
    groups,
    players,
    presence:{isActiveForWorld:()=>true},
    random:options.random || (()=>0),
    now:()=>currentTime,
    buildWave:options.buildWave,
    emitInstance(emittedGroup){
      emitted.push(publicNoxObjective(emittedGroup.instance, currentTime));
    },
    emitPortalComplete(){
      completions += 1;
      instance.completed = true;
    },
    failPortal(){
      failures += 1;
    },
    launchEnemyAttack(payload){
      attacks.push(payload);
    }
  });
  return {
    attacks,
    completions:()=>completions,
    emitted,
    failures:()=>failures,
    group,
    groups,
    instance,
    players,
    runtime,
    setNow(value){ currentTime = value; },
    now:()=>currentTime
  };
}

test("Nox uses the exact shared level-35 station geometry and requested defense stats", ()=>{
  assert.equal(NOX_PORTAL_ID, "void");
  assert.equal(NOX_PORTAL_LEVEL, 35);
  assert.equal(NOX_TOTAL_WAVES, 30);
  assert.equal(NOX_WAVE_GROUP_SIZE, 5);
  assert.equal(NOX_PORTAL_MAP.width, 5_600);
  assert.equal(NOX_PORTAL_MAP.height, 5_600);
  assert.deepEqual(NOX_PORTAL_MAP.spawn, {x:0, y:900});
  assert.equal(NOX_PORTAL_MAP.shieldRadius, 1_150);
  assert.equal(NOX_PORTAL_MAP.defenses.length, 6);
  assert.ok(
    Math.hypot(
      NOX_PORTAL_MAP.spawn.x - NOX_PORTAL_MAP.station.x,
      NOX_PORTAL_MAP.spawn.y - NOX_PORTAL_MAP.station.y
    ) < NOX_PORTAL_MAP.shieldRadius
  );
  assert.equal(
    NOX_PORTAL_MAP.defenses.every(defense=>
      Math.hypot(
        NOX_PORTAL_MAP.spawn.x - defense.x,
        NOX_PORTAL_MAP.spawn.y - defense.y
      ) > 200
    ),
    true
  );
  assert.deepEqual(
    NOX_PORTAL_MAP.defenses.map(defense=>defense.type),
    ["laser", "laser", "missile", "missile", "summoner", "summoner"]
  );

  const objective = createNoxObjective(1_000);
  assert.equal(objective.shield.hp, NOX_SHIELD_MAX_HP);
  assert.equal(objective.shield.hp, 1_000_000);
  assert.equal(objective.core.hp, NOX_CORE_MAX_HP);
  assert.equal(objective.core.hp, 3_000_000);
  assert.equal(objective.defenses.every(defense=>defense.hp === NOX_DEFENSE_MAX_HP), true);
  assert.equal(NOX_DEFENSE_MAX_HP, 500_000);
  assert.equal(NOX_TURRET_DAMAGE_MIN, 30_000);
  assert.equal(NOX_TURRET_DAMAGE_MAX, 50_000);
  assert.equal(NOX_TURRET_COOLDOWN_MS, 1_000);
  assert.equal(NOX_DRONE_MAX_HP, 20_000);
  assert.equal(NOX_DRONE_DAMAGE_MIN, 3_000);
  assert.equal(NOX_DRONE_DAMAGE_MAX, 5_000);
  assert.equal(NOX_DRONE_RANGE, 500);
  assert.equal(NOX_DRONE_SPEED, 400);
});

test("waves 1-29 contain level-35 runtime-controlled attackers and wave 30 is the exact boss", ()=>{
  let sawKamikaze = false;
  for(let wave = 1; wave < NOX_TOTAL_WAVES; wave += 1){
    const enemies = buildNoxPortalWave(wave, 1_000 + wave);
    assert.ok(enemies.length >= 3, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.level === NOX_PORTAL_LEVEL), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.noxEnemy && enemy.noxRuntimeControlled), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>!enemy.noReward), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>Number(enemy.reward?.credits || 0) > 0), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>Number(enemy.reward?.xp || 0) > 0), true, `wave ${wave}`);
    assert.equal(enemies.some(enemy=>enemy.noxBoss), false, `wave ${wave}`);
    if(enemies.some(enemy=>enemy.noxKamikaze)) sawKamikaze = true;
  }
  assert.equal(sawKamikaze, true);

  const finalWave = buildNoxPortalWave(NOX_TOTAL_WAVES, 2_000);
  assert.equal(finalWave.length, 1);
  assert.equal(finalWave[0].noxBoss, true);
  assert.equal(finalWave[0].noxFocusInfrastructure, true);
  assert.equal(finalWave[0].hp, NOX_BOSS_MAX_HP);
  assert.equal(finalWave[0].maxHp, 5_000_000);
  assert.equal(finalWave[0].shield, NOX_BOSS_MAX_SHIELD);
  assert.equal(finalWave[0].maxShield, 5_000_000);
  assert.equal(finalWave[0].noReward, false);
  assert.ok(Number(finalWave[0].reward?.credits || 0) > 0);
});

test("the global shield absorbs every hit first and carries overflow to the selected structure", ()=>{
  const instance = {
    type:"portal",
    portal:{id:NOX_PORTAL_ID},
    objective:createNoxObjective(1_000)
  };
  const defense = instance.objective.defenses[0];

  let result = applyNoxInfrastructureDamage(instance, defense.id, 250_000);
  assert.equal(result.absorbed, 250_000);
  assert.equal(result.applied, 0);
  assert.equal(instance.objective.shield.hp, 750_000);
  assert.equal(defense.hp, NOX_DEFENSE_MAX_HP);

  instance.objective.shield.hp = 40_000;
  result = applyNoxInfrastructureDamage(instance, defense.id, 100_000);
  assert.equal(result.absorbed, 40_000);
  assert.equal(result.applied, 60_000);
  assert.equal(instance.objective.shield.hp, 0);
  assert.equal(defense.hp, NOX_DEFENSE_MAX_HP - 60_000);
});

test("a kamikaze removes the active shield only once, then its overflow is a real 150-radius AoE", ()=>{
  const instance = {
    type:"portal",
    portal:{id:NOX_PORTAL_ID},
    objective:createNoxObjective(1_000)
  };
  const impactDefense = instance.objective.defenses[0];
  const kamikaze = createNoxKamikaze(5, 1, impactDefense, 2_000);
  instance.objective.shield.hp = NOX_SHIELD_MAX_HP;

  const event = explodeNoxKamikaze(instance, kamikaze, 3_000);
  assert.equal(event.radius, NOX_KAMIKAZE_BLAST_RADIUS);
  assert.equal(event.radius, 150);
  assert.equal(event.damage, NOX_KAMIKAZE_DAMAGE);
  assert.equal(event.damage, 100_000);
  assert.equal(event.shieldAbsorbed, 100_000);
  assert.equal(instance.objective.shield.hp, 900_000);
  assert.equal(instance.objective.defenses.every(defense=>defense.hp === NOX_DEFENSE_MAX_HP), true);
  assert.equal(instance.objective.core.hp, NOX_CORE_MAX_HP);
  assert.equal(kamikaze.hp, 0);
  assert.equal(kamikaze.noReward, true);

  const clusteredDefense = instance.objective.defenses[1];
  clusteredDefense.x = impactDefense.x + 50;
  clusteredDefense.y = impactDefense.y;
  const second = createNoxKamikaze(10, 1, impactDefense, 4_000);
  instance.objective.shield.hp = 25_000;
  explodeNoxKamikaze(instance, second, 5_000);
  assert.equal(instance.objective.shield.hp, 0);
  assert.equal(impactDefense.hp, NOX_DEFENSE_MAX_HP - 75_000);
  assert.equal(clusteredDefense.hp, NOX_DEFENSE_MAX_HP - 75_000);
  assert.equal(instance.objective.core.hp, NOX_CORE_MAX_HP);
});

test("Nox starts exact five-wave batches at ten-second intervals and waits for a clear", ()=>{
  const fixture = createFixture();
  assert.equal(fixture.runtime.start(fixture.group), true);
  assert.equal(fixture.emitted.length, 1);
  assert.equal(fixture.instance.wave, 1);
  assert.equal(fixture.instance.waveBatchEnd, 5);
  assert.equal(fixture.instance.nextWaveAt, 10_000 + NOX_WAVE_INTERVAL_MS);

  for(let wave = 2; wave <= 5; wave += 1){
    fixture.setNow(10_000 + (wave - 1) * NOX_WAVE_INTERVAL_MS);
    fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
    assert.equal(fixture.instance.wave, wave);
  }
  assert.equal(fixture.instance.waveState, "clear_batch");
  assert.equal(fixture.instance.nextWaveAt, 0);

  fixture.instance.enemies.forEach(enemy=>{ enemy.hp = 0; enemy.shield = 0; });
  fixture.runtime.handleEnemyDeath(fixture.group, fixture.instance.enemies.at(-1), fixture.now());
  assert.equal(fixture.instance.wave, 6);
  assert.equal(fixture.instance.waveBatchEnd, 10);
  assert.equal(fixture.instance.nextWaveAt, fixture.now() + NOX_WAVE_INTERVAL_MS);
});

test("each summoner creates three drones only when its previous trio is entirely gone", ()=>{
  const fixture = createFixture();
  fixture.runtime.start(fixture.group);
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  const objective = fixture.instance.objective;
  const summoners = objective.defenses.filter(defense=>defense.type === "summoner");
  assert.equal(summoners.length, 2);
  assert.equal(objective.drones.length, summoners.length * NOX_DRONES_PER_SUMMONER);
  assert.equal(objective.drones.every(drone=>drone.hp === NOX_DRONE_MAX_HP), true);

  const ownerId = summoners[0].id;
  const firstTrio = objective.drones.filter(drone=>drone.ownerId === ownerId);
  firstTrio[0].hp = 0;
  fixture.setNow(fixture.now() + NOX_SUMMON_COOLDOWN_MS);
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  assert.equal(objective.drones.filter(drone=>drone.ownerId === ownerId).length, 2);

  objective.drones.filter(drone=>drone.ownerId === ownerId).forEach(drone=>{ drone.hp = 0; });
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  assert.equal(objective.drones.filter(drone=>drone.ownerId === ownerId).length, 3);
});

test("normal attackers focus summoned drones before nearby players, while kamikazes ignore both", ()=>{
  const player = {
    id:"nox-player",
    mapId:`portal-${NOX_PORTAL_ID}`,
    state:{mapId:`portal-${NOX_PORTAL_ID}`, x:0, y:0, hp:100_000, maxHp:100_000}
  };
  const players = new Map([[player.id, player]]);
  const fixture = createFixture(10_000, {players});
  fixture.group.members = [player.id];
  fixture.instance.joinedMemberIds = [player.id];
  fixture.runtime.start(fixture.group);
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());

  const drone = fixture.instance.objective.drones[0];
  const normal = fixture.instance.enemies.find(enemy=>!enemy.noxKamikaze);
  normal.x = drone.x;
  normal.y = drone.y;
  normal.nextAttackAt = 0;
  const droneHpBefore = drone.hp;
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  assert.ok(drone.hp < droneHpBefore);
  assert.equal(fixture.attacks.length, 0);

  fixture.instance.objective.drones.forEach(entry=>{ entry.hp = 0; });
  normal.x = player.state.x;
  normal.y = player.state.y;
  normal.nextAttackAt = 0;
  fixture.setNow(fixture.now() + 2_000);
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  assert.equal(fixture.attacks.at(-1)?.target?.id, player.id);

  const kamikaze = createNoxKamikaze(5, 99, {x:2_000, y:0}, fixture.now());
  fixture.instance.enemies.push(kamikaze);
  const attacksBefore = fixture.attacks.length;
  fixture.runtime.updateGroup(fixture.group, 1, fixture.now());
  assert.equal(fixture.attacks.length, attacksBefore);
  assert.ok(Math.hypot(kamikaze.x, kamikaze.y) < 2_000);
});

test("attackers without a player or defense drone advance on the station and damage its shield", ()=>{
  const fixture = createFixture();
  fixture.runtime.start(fixture.group);
  const objective = fixture.instance.objective;
  objective.drones = [];
  objective.defenses
    .filter(defense=>defense.type === "summoner")
    .forEach(defense=>{
      defense.hp = 0;
      defense.alive = false;
    });
  const enemy = fixture.instance.enemies.find(entry=>!entry.noxKamikaze);
  enemy.x = 0;
  enemy.y = 1_800;
  enemy.nextAttackAt = 0;
  const distanceBefore = Math.hypot(
    enemy.x - NOX_PORTAL_MAP.station.x,
    enemy.y - NOX_PORTAL_MAP.station.y
  );

  fixture.runtime.updateGroup(fixture.group, 1, fixture.now());
  assert.ok(
    Math.hypot(
      enemy.x - NOX_PORTAL_MAP.station.x,
      enemy.y - NOX_PORTAL_MAP.station.y
    ) < distanceBefore
  );

  enemy.x = 0;
  enemy.y = 820;
  enemy.nextAttackAt = 0;
  fixture.setNow(fixture.now() + 2_000);
  const shieldBefore = objective.shield.hp;
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  assert.ok(objective.shield.hp < shieldBefore);
  assert.equal(
    objective.defenses.find(defense=>defense.id === "nox_laser_south").hp,
    NOX_DEFENSE_MAX_HP
  );
});

test("turrets and drones retarget living enemies between salvos instead of wasting shots", ()=>{
  const turretFixture = createFixture();
  turretFixture.runtime.start(turretFixture.group);
  const offensive = turretFixture.instance.objective.defenses.filter(defense=>defense.type !== "summoner");
  turretFixture.instance.objective.defenses.filter(defense=>defense.type === "summoner").forEach(defense=>{
    defense.hp = 0;
    defense.alive = false;
  });
  turretFixture.instance.enemies = offensive.map((defense, index)=>({
    id:`turret-target-${index}`,
    noxEnemy:true,
    noxRuntimeControlled:true,
    hp:1_000,
    maxHp:1_000,
    shield:0,
    maxShield:0,
    shieldAbsorbRatio:.8,
    x:0,
    y:0,
    speed:0,
    attackRange:0,
    attackDamage:0,
    nextAttackAt:Infinity
  }));
  turretFixture.runtime.updateGroup(turretFixture.group, .05, turretFixture.now());
  assert.equal(turretFixture.instance.enemies.filter(enemy=>enemy.hp > 0).length, 0);

  const droneFixture = createFixture();
  droneFixture.runtime.start(droneFixture.group);
  droneFixture.runtime.updateGroup(droneFixture.group, .05, droneFixture.now());
  const drones = [...droneFixture.instance.objective.drones];
  droneFixture.instance.objective.defenses.forEach(defense=>{
    defense.hp = 0;
    defense.alive = false;
  });
  droneFixture.instance.enemies = drones.map((drone, index)=>({
    id:`drone-target-${index}`,
    noxEnemy:true,
    noxRuntimeControlled:true,
    hp:1_000,
    maxHp:1_000,
    shield:0,
    maxShield:0,
    shieldAbsorbRatio:.8,
    x:0,
    y:0,
    speed:0,
    attackRange:0,
    attackDamage:0,
    nextAttackAt:Infinity
  }));
  droneFixture.runtime.updateGroup(droneFixture.group, 2, droneFixture.now());
  assert.equal(droneFixture.instance.enemies.filter(enemy=>enemy.hp > 0).length, 0);
});
test("turret or drone kills advance a cleared batch without a player death callback", ()=>{
  const fixture = createFixture();
  fixture.runtime.start(fixture.group);
  const laser = fixture.instance.objective.defenses.find(defense=>defense.type === "laser");
  fixture.instance.wave = 5;
  fixture.instance.noxLastSpawnedWave = 5;
  fixture.instance.waveBatchEnd = 5;
  fixture.instance.nextWaveAt = 0;
  fixture.instance.enemies = [{
    id:"nox-last-attacker",
    noxEnemy:true,
    noxRuntimeControlled:true,
    hp:1_000,
    maxHp:1_000,
    shield:0,
    maxShield:0,
    shieldAbsorbRatio:.8,
    x:laser.x,
    y:laser.y,
    speed:0,
    attackRange:0,
    attackDamage:0,
    nextAttackAt:Infinity
  }];

  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  assert.equal(fixture.instance.enemies.some(enemy=>enemy.id === "nox-last-attacker" && enemy.hp > 0), false);
  assert.equal(fixture.instance.wave, 6);
  assert.equal(fixture.instance.waveBatchEnd, 10);
});
test("core destruction fails once without completion, and a cleared wave-30 boss completes once", ()=>{
  const failed = createFixture();
  failed.runtime.start(failed.group);
  failed.instance.objective.core.hp = 0;
  failed.instance.enemies.forEach(enemy=>{ enemy.hp = 0; enemy.shield = 0; });
  assert.equal(failed.runtime.updateGroup(failed.group, .05, failed.now()), true);
  assert.equal(failed.instance.waveState, "failed");
  assert.equal(failed.instance.objective.failedAt, failed.now());
  assert.equal(failed.failures(), 1);
  assert.equal(failed.completions(), 0);
  failed.runtime.updateGroup(failed.group, .05, failed.now() + 1);
  assert.equal(failed.failures(), 1);

  const completed = createFixture();
  completed.runtime.start(completed.group);
  const boss = buildNoxPortalWave(30, completed.now())[0];
  boss.hp = 0;
  boss.shield = 0;
  completed.instance.enemies = [boss];
  completed.instance.wave = 30;
  completed.instance.noxLastSpawnedWave = 30;
  completed.instance.waveBatchEnd = 30;
  completed.instance.nextWaveAt = 0;
  completed.runtime.handleEnemyDeath(completed.group, boss, completed.now());
  assert.equal(completed.completions(), 1);
  assert.equal(completed.failures(), 0);
  assert.equal(completed.instance.objective.completedAt, completed.now());
});

test("instance integration returns every member home, saves, emits failure and resets without rewards", ()=>{
  const at = 90_000;
  const events = [];
  const saves = [];
  const mapMoves = [];
  const resets = [];
  const player = {
    id:"nox-owner",
    accountId:"account-nox-owner",
    account:{id:"account-nox-owner", firmId:"astra"},
    groupId:"nox-integration-group",
    mapId:`portal-${NOX_PORTAL_ID}`,
    state:{
      mapId:`portal-${NOX_PORTAL_ID}`,
      x:250,
      y:-180,
      hp:120_000,
      maxHp:120_000,
      vx:40,
      vy:30,
      moving:true,
      attackTargetId:"enemy"
    }
  };
  const objective = createNoxObjective(at);
  objective.core.hp = 0;
  objective.core.alive = false;
  const instance = {
    id:"nox-failed-instance",
    type:"portal",
    portal:{id:NOX_PORTAL_ID, name:"L’Abîme de Nox", totalWaves:NOX_TOTAL_WAVES},
    completed:false,
    joinedMemberIds:[player.id],
    abandonedMemberIds:[],
    enemies:[],
    wave:12,
    waveBatchEnd:15,
    objective
  };
  const group = {
    id:player.groupId,
    leaderId:player.id,
    members:[player.id],
    instance
  };
  const groups = new Map([[group.id, group]]);
  const players = new Map([[player.id, player]]);
  const socket = {id:player.id};
  const sockets = new Map([[player.id, socket]]);
  const manager = createPortalInstanceManager({
    io:{
      sockets:{sockets},
      to(target){
        return {emit:(event, payload)=>events.push({target, event, payload})};
      }
    },
    players,
    groups,
    profileManager:{
      getProfileForPlayer(){
        return {player:{firmId:"astra", level:NOX_PORTAL_LEVEL}};
      },
      saveWorldSession(payload){ saves.push(payload); }
    },
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    emitProfileSync(){},
    emitQuestClaims(){},
    createGroup(){ return group; },
    emitInstance(){},
    resetGroupInstance(groupId, reason){
      resets.push({groupId, reason});
      group.instance = null;
      return true;
    },
    setPlayerMap(targetSocket, mapId){ mapMoves.push({targetSocket, mapId}); },
    portalWaveTotal:5,
    now:()=>at
  });

  manager.updateNoxEncounters(.05, at);
  assert.equal(group.instance, null);
  assert.equal(player.state.mapId, "0");
  assert.equal(player.mapId, "0");
  assert.equal(player.state.x, -4_300);
  assert.equal(player.state.y, 3_300);
  assert.equal(player.state.vx, 0);
  assert.equal(player.state.vy, 0);
  assert.equal(player.state.moving, false);
  assert.equal(player.state.attackTargetId, "");
  assert.equal(saves.length, 1);
  assert.equal(saves[0].force, true);
  assert.equal(mapMoves.length, 1);
  assert.equal(mapMoves[0].mapId, "0");
  assert.deepEqual(resets, [{groupId:group.id, reason:"nox-core-destroyed"}]);

  const failedEvent = events.find(entry=>entry.event === "portal:failed");
  assert.equal(failedEvent?.payload.code, "NOX_CORE_DESTROYED");
  assert.deepEqual(failedEvent?.payload.spawn, {
    mapId:"0",
    mapName:"Helion-01",
    x:-4_300,
    y:3_300
  });
  assert.equal(failedEvent?.payload.rewardAppliedByServer, false);
  assert.equal(events.some(entry=>entry.event === "player:state-correction"), true);
  assert.equal(events.some(entry=>entry.event === "portal:complete"), false);

  manager.updateNoxEncounters(.05, at + 1);
  assert.equal(events.filter(entry=>entry.event === "portal:failed").length, 1);
  assert.equal(saves.length, 1);
  assert.equal(resets.length, 1);
});
test("the public objective exposes all authoritative station, wave, drone, boss and effect fields", ()=>{
  const fixture = createFixture();
  fixture.runtime.start(fixture.group);
  fixture.runtime.updateGroup(fixture.group, .05, fixture.now());
  const state = publicNoxObjective(fixture.instance, fixture.now());
  assert.equal(state.kind, "nox");
  assert.equal(state.stage, "defense");
  assert.equal(state.phase, "waves");
  assert.equal(state.wave, 1);
  assert.equal(state.waveTotal, 30);
  assert.equal(state.waveBatchEnd, 5);
  assert.equal(state.batchEnd, 5);
  assert.equal(state.shield.hp, 1_000_000);
  assert.equal(state.core.hp, 3_000_000);
  assert.equal(state.defenses.length, 6);
  assert.equal(state.drones.length, 6);
  assert.ok(Number.isInteger(state.enemiesRemaining));
  assert.ok(Number.isInteger(state.kamikazesRemaining));
  assert.ok(Array.isArray(state.recentEffects));
  assert.ok(Array.isArray(state.attackEvents));
  assert.equal(state.failedAt, 0);
  assert.equal(state.completedAt, 0);
});
