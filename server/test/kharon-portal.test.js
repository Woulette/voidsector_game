import assert from "node:assert/strict";
import test from "node:test";
import { createEnemyAttackManager } from "../src/world/enemyAttacks.js";
import { applyKharonBossAttackAbility } from "../src/world/ai.js";
import {
  buildKharonPortalWave,
  createKharonBoss,
  createKharonObjective,
  createKharonPortalRuntime,
  KHARON_BOMB_DAMAGE,
  KHARON_BOMB_RADIUS,
  KHARON_BOSS_DAMAGE_MAX,
  KHARON_BOSS_DAMAGE_MIN,
  KHARON_BOSS_RANGE,
  KHARON_BOSS_SPEED,
  KHARON_PORTAL_ID,
  KHARON_PORTAL_LEVEL,
  KHARON_POISON_DAMAGE,
  KHARON_TOTAL_WAVES,
  KHARON_WAVE_INTERVAL_MS,
  publicKharonObjective
} from "../src/portals/kharonPortal.js";
import { getServerPortalDefinition } from "../src/portals/portalDefinitions.js";

function createTimerHarness(initialNow = 10_000){
  let currentTime = initialNow;
  const timers = [];
  return {
    now:()=>currentTime,
    timers,
    setNow(value){ currentTime = value; },
    setTimeoutFn(fn, delay){
      const timer = {fn, delay, fired:false, cancelled:false, unref(){}};
      timers.push(timer);
      return timer;
    },
    clearTimeoutFn(timer){
      timer.cancelled = true;
    },
    firePending(){
      const pending = timers
        .filter(timer=>!timer.fired && !timer.cancelled)
        .sort((left, right)=>left.delay - right.delay);
      const baseTime = currentTime;
      for(const timer of pending){
        timer.fired = true;
        currentTime = baseTime + timer.delay;
        timer.fn();
      }
    }
  };
}

test("Kharon is the playable level 20 red portal with 30 waves", ()=>{
  const definition = getServerPortalDefinition(KHARON_PORTAL_ID);
  assert.equal(definition.id, "red");
  assert.equal(definition.name, "La Forge de Kharon");
  assert.equal(definition.level, 20);
  assert.equal(definition.piecesRequired, 35);
  assert.equal(definition.gameplayReady, true);
  assert.equal(definition.totalWaves, KHARON_TOTAL_WAVES);
  assert.deepEqual(definition.drop.mapNumbers, [1, 2, 3, 4, 5]);
  assert.equal(definition.reward.premium, 30_000);
  assert.equal(definition.reward.ammoX4, 30_000);
});

test("all regular Kharon enemies are level 20 and bosses keep exact requested stats", ()=>{
  for(let wave = 1; wave <= KHARON_TOTAL_WAVES; wave += 1){
    const enemies = buildKharonPortalWave(wave, 1_000 + wave);
    assert.ok(enemies.length >= 1, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.level === KHARON_PORTAL_LEVEL), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.serverControlled && enemy.kharonEnemy), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>!enemy.noReward), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>Number(enemy.reward?.credits || 0) > 0), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>Number(enemy.reward?.xp || 0) > 0), true, `wave ${wave}`);
  }

  const vesperion = createKharonBoss(10, 2_000);
  const nyxaris = createKharonBoss(20, 2_000);
  const asterion = createKharonBoss(30, 2_000);
  assert.deepEqual(
    [vesperion.kharonBossShipId, vesperion.maxHp, vesperion.maxShield, vesperion.kharonAbility.abilityId],
    ["vesperion", 700_000, 500_000, "absorbing_fire"]
  );
  assert.deepEqual(
    [nyxaris.kharonBossShipId, nyxaris.maxHp, nyxaris.maxShield, nyxaris.kharonAbility.abilityId],
    ["nyxaris", 700_000, 500_000, "poison_bomb"]
  );
  assert.deepEqual(
    [asterion.kharonBossShipId, asterion.maxHp, asterion.maxShield, asterion.kharonAbility.abilityId],
    ["asterion", 1_000_000, 1_000_000, "spectral_double_shot"]
  );
  for(const boss of [vesperion, nyxaris, asterion]){
    assert.equal(boss.attackDamageMin, KHARON_BOSS_DAMAGE_MIN);
    assert.equal(boss.attackDamageMax, KHARON_BOSS_DAMAGE_MAX);
    assert.equal(boss.attackRange, KHARON_BOSS_RANGE);
    assert.equal(boss.speed, KHARON_BOSS_SPEED);
  }
});

test("Kharon runs 1-5, 6-9, boss 10 and repeats the exact segment pattern to boss 30", ()=>{
  const harness = createTimerHarness();
  let completed = 0;
  const runtime = createKharonPortalRuntime({
    emitInstance(){},
    emitPortalComplete(){ completed += 1; },
    now:harness.now,
    setTimeoutFn:harness.setTimeoutFn,
    clearTimeoutFn:harness.clearTimeoutFn
  });
  const instance = {
    id:"kharon-wave-test",
    type:"portal",
    portal:{id:KHARON_PORTAL_ID, totalWaves:KHARON_TOTAL_WAVES},
    completed:false,
    enemies:[]
  };
  const group = {id:"group-kharon-wave", members:[], instance};

  function killCurrentSegment(){
    harness.firePending();
    instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
    runtime.handleEnemyDeath(group);
  }

  assert.equal(runtime.start(group), true);
  assert.equal(instance.wave, 1);
  assert.equal(instance.waveBatchEnd, 5);
  assert.equal(instance.waveState, "wave_countdown");
  assert.deepEqual(harness.timers.slice(0, 4).map(timer=>timer.delay), [
    KHARON_WAVE_INTERVAL_MS,
    KHARON_WAVE_INTERVAL_MS * 2,
    KHARON_WAVE_INTERVAL_MS * 3,
    KHARON_WAVE_INTERVAL_MS * 4
  ]);

  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(instance.wave, 1);
  assert.equal(instance.waveState, "wave_countdown");

  harness.firePending();
  assert.equal(instance.wave, 5);
  assert.equal(instance.enemies.some(enemy=>enemy.hp > 0), true);
  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(instance.wave, 6);
  assert.equal(instance.waveBatchEnd, 9);

  killCurrentSegment();
  assert.equal(instance.wave, 10);
  assert.equal(instance.enemies.filter(enemy=>enemy.hp > 0).length, 1);
  assert.equal(instance.enemies.find(enemy=>enemy.hp > 0)?.kharonBossShipId, "vesperion");

  killCurrentSegment();
  assert.equal(instance.wave, 11);
  assert.equal(instance.waveBatchEnd, 15);
  killCurrentSegment();
  assert.equal(instance.wave, 16);
  assert.equal(instance.waveBatchEnd, 19);
  killCurrentSegment();
  assert.equal(instance.wave, 20);
  assert.equal(instance.enemies.find(enemy=>enemy.hp > 0)?.kharonBossShipId, "nyxaris");

  killCurrentSegment();
  assert.equal(instance.wave, 21);
  assert.equal(instance.waveBatchEnd, 25);
  killCurrentSegment();
  assert.equal(instance.wave, 26);
  assert.equal(instance.waveBatchEnd, 29);
  killCurrentSegment();
  assert.equal(instance.wave, 30);
  assert.equal(instance.enemies.find(enemy=>enemy.hp > 0)?.kharonBossShipId, "asterion");
  assert.equal(completed, 0);

  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(completed, 1);
  assert.equal(instance.waveState, "completed");
  assert.equal(instance.objective.stage, "complete");
  assert.deepEqual(instance.objective.hazards, []);
});

function createKharonEncounterFixture({bossWave = 10, random = ()=>.8} = {}){
  let currentTime = 1_000;
  const events = [];
  const saves = [];
  const player = {
    id:"kharon-player",
    connected:true,
    clientMode:"game",
    mapId:"portal-red",
    state:{
      mapId:"portal-red",
      x:1_000,
      y:0,
      hp:200_000,
      maxHp:200_000,
      shield:80_000,
      maxShield:80_000
    }
  };
  const boss = createKharonBoss(bossWave, currentTime);
  const instance = {
    id:`kharon-encounter-${bossWave}`,
    type:"portal",
    portal:{id:KHARON_PORTAL_ID, totalWaves:KHARON_TOTAL_WAVES},
    completed:false,
    wave:bossWave,
    joinedMemberIds:[player.id],
    abandonedMemberIds:[],
    enemies:[boss],
    objective:createKharonObjective()
  };
  instance.objective.stage = "boss";
  instance.objective.bossId = boss.id;
  instance.objective.bossShipId = boss.kharonBossShipId;
  const group = {id:"kharon-group", members:[player.id], instance};
  const players = new Map([[player.id, player]]);
  const groups = new Map([[group.id, group]]);
  const runtime = createKharonPortalRuntime({
    io:{
      to(target){
        return {emit:(event, payload)=>events.push({target, event, payload})};
      }
    },
    players,
    groups,
    profileManager:{
      applyQuestAction(){ return {updates:[], failed:[]}; },
      saveWorldSession(payload){ saves.push(payload); }
    },
    emitInstance(){},
    now:()=>currentTime,
    random
  });
  return {
    boss,
    events,
    group,
    instance,
    player,
    runtime,
    saves,
    setNow(value){ currentTime = value; }
  };
}

test("Kharon boss teleports only to a distant target then the 3 second bomb deals 30000 direct hull damage once", ()=>{
  const fixture = createKharonEncounterFixture({bossWave:10, random:()=>.8});
  fixture.runtime.updateKharonGroup(fixture.group, .05, 1_000);
  assert.equal(fixture.boss.kharonBombNextAt, 55_000);

  fixture.runtime.updateKharonGroup(fixture.group, .05, 54_999);
  assert.equal(fixture.instance.objective.hazards.length, 0);
  fixture.runtime.updateKharonGroup(fixture.group, .05, 55_000);
  assert.equal(fixture.instance.objective.hazards.length, 1);
  const hazard = fixture.instance.objective.hazards[0];
  assert.equal(hazard.kind, "boss_teleport_bomb");
  assert.equal(hazard.fromX, 0);
  assert.equal(hazard.fromY, -1_050);
  assert.equal(hazard.toX, 1_000);
  assert.equal(hazard.toY, 0);
  assert.equal(hazard.detonateAt, 58_000);
  assert.equal(fixture.boss.kharonBombNextAt, 109_000);

  fixture.runtime.updateKharonGroup(fixture.group, .05, 56_500);
  assert.equal(hazard.radius, KHARON_BOMB_RADIUS / 2);
  assert.equal(fixture.player.state.hp, 200_000);
  fixture.runtime.updateKharonGroup(fixture.group, .05, 58_000);
  assert.equal(hazard.phase, "exploded");
  assert.equal(fixture.player.state.hp, 200_000 - KHARON_BOMB_DAMAGE);
  assert.equal(fixture.player.state.shield, 80_000);
  fixture.runtime.updateKharonGroup(fixture.group, .05, 58_100);
  assert.equal(fixture.player.state.hp, 200_000 - KHARON_BOMB_DAMAGE);
  assert.equal(fixture.saves.length, 1);

  const snapshot = publicKharonObjective(fixture.instance, 58_100);
  assert.equal(snapshot.at, 58_100);
  assert.equal(snapshot.hazards[0].phase, "exploded");
  assert.equal(snapshot.hazards[0].maxRadius, 500);
  assert.equal(snapshot.hazards[0].fromX, 0);
  assert.ok(fixture.events.some(entry=>
    entry.event === "portal:kharon-effect"
    && entry.payload.kind === "boss_teleport_bomb"
    && entry.payload.phase === "exploded"
  ));
});

test("Nyxaris casts all five canonical poison waves and its direct hull poison keeps ticking after boss death", ()=>{
  const fixture = createKharonEncounterFixture({bossWave:20, random:()=>0});
  fixture.boss.x = 0;
  fixture.boss.y = 0;
  fixture.player.state.x = 0;
  fixture.player.state.y = 0;
  fixture.player.state.hp = 1_000_000;
  fixture.player.state.maxHp = 1_000_000;
  fixture.player.state.shield = 80_000;

  for(const at of [1_000, 3_500, 6_000, 8_500, 11_000]){
    fixture.setNow(at);
    fixture.runtime.updateKharonGroup(fixture.group, .05, at);
  }
  const poisonWaveEvents = fixture.events.filter(entry=>
    entry.event === "portal:kharon-effect"
    && entry.payload.kind === "boss_poison_wave"
  );
  assert.equal(poisonWaveEvents.length, 5);
  assert.deepEqual(poisonWaveEvents.map(entry=>entry.payload.startedAt), [
    1_000,
    3_500,
    6_000,
    8_500,
    11_000
  ]);
  assert.equal(poisonWaveEvents.every(entry=>entry.payload.radius === 300), true);
  const hpBeforeBossDeath = fixture.player.state.hp;
  fixture.boss.hp = 0;
  fixture.setNow(12_000);
  fixture.runtime.updateKharonGroup(fixture.group, .05, 12_000);
  assert.equal(fixture.player.state.hp, hpBeforeBossDeath - KHARON_POISON_DAMAGE);
  assert.equal(fixture.player.state.shield, 80_000);
});

test("Asterion consumes one charged double strike every three seconds and exposes spectral VFX state", ()=>{
  const fixture = createKharonEncounterFixture({bossWave:30, random:()=>0});
  const target = fixture.player;
  fixture.runtime.updateKharonGroup(fixture.group, .05, 1_000);
  assert.equal(fixture.boss.kharonAbility.active, true);
  assert.equal(fixture.boss.kharonAbility.chargeReadyAt, 4_000);
  assert.equal(applyKharonBossAttackAbility(fixture.boss, 4_000, target, 3_999), 4_000);
  assert.equal(applyKharonBossAttackAbility(fixture.boss, 4_000, target, 4_000), 8_000);
  assert.equal(fixture.boss.kharonAbility.chargeReadyAt, 7_000);
  assert.equal(applyKharonBossAttackAbility(fixture.boss, 4_000, target, 5_000), 4_000);
  assert.equal(applyKharonBossAttackAbility(fixture.boss, 4_000, target, 7_000), 8_000);

  fixture.runtime.updateKharonGroup(fixture.group, .05, 7_001);
  const effectKinds = fixture.events
    .filter(entry=>entry.event === "portal:kharon-effect")
    .map(entry=>entry.payload.kind);
  assert.ok(effectKinds.includes("boss_spectral_charge"));
  assert.ok(effectKinds.includes("boss_spectral_impact"));
});

test("Vesperion heals 50 percent of the real durability dealt by its shots while absorption is active", ()=>{
  const events = [];
  const player = {
    id:"vesperion-target",
    connected:true,
    mapId:"portal-red",
    state:{
      mapId:"portal-red",
      x:0,
      y:0,
      hp:100_000,
      maxHp:100_000,
      shield:0,
      maxShield:0
    }
  };
  const boss = createKharonBoss(10, 1_000);
  boss.hp = 500_000;
  boss.kharonAbility.active = true;
  boss.kharonAbility.activeUntil = 20_000;
  const presence = {
    isActiveForWorld:()=>true,
    markCombat(){},
    applyDamageToPlayerState(target, amount){
      const before = target.state.hp;
      target.state.hp = Math.max(0, before - amount);
      return before - target.state.hp;
    }
  };
  const manager = createEnemyAttackManager({
    io:{to:target=>({emit:(event, payload)=>events.push({target, event, payload})})},
    players:new Map([[player.id, player]]),
    presence,
    profileManager:{
      applyQuestAction(){ return {updates:[], failed:[]}; },
      saveWorldSession(){}
    }
  });

  manager.launchEnemyAttack({
    enemy:boss,
    map:{id:"portal-red", room:"instance:kharon-heal"},
    target:player,
    amount:4_000,
    now:1_000
  });
  manager.updatePendingEnemyAttacks(5_000);
  assert.equal(player.state.hp, 96_000);
  assert.equal(boss.hp, 502_000);
  assert.ok(events.some(entry=>
    entry.event === "npc:heal"
    && entry.payload.abilityId === "absorbing_fire"
    && entry.payload.amount === 2_000
  ));
});
