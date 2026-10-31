import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIonisPortalWave,
  createIonisEnemy,
  createIonisWaveRuntime,
  IONIS_ELITE_DAMAGE_MULTIPLIER,
  IONIS_ELITE_DURABILITY_MULTIPLIER,
  IONIS_ELITE_WAVE,
  IONIS_PORTAL_ID,
  IONIS_PORTAL_LEVEL,
  IONIS_TOTAL_WAVES,
  IONIS_WAVE_INTERVAL_MS,
  IONIS_WAVES_PER_GROUP,
  publicIonisObjective
} from "../src/portals/ionisPortal.js";
import { getServerPortalDefinition } from "../src/portals/portalDefinitions.js";

function createTimerHarness(initialNow = 10_000){
  let currentTime = initialNow;
  const timers = [];
  return {
    now:()=>currentTime,
    timers,
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

test("Ionis keeps its current catalogue id and becomes a playable level 25 portal with 40 waves", ()=>{
  const definition = getServerPortalDefinition(IONIS_PORTAL_ID);
  assert.equal(definition.id, "ionis");
  assert.equal(definition.name, "La Tempête d’Ionis");
  assert.equal(definition.level, 25);
  assert.equal(definition.piecesRequired, 50);
  assert.equal(definition.gameplayReady, true);
  assert.equal(definition.totalWaves, IONIS_TOTAL_WAVES);
  assert.deepEqual(definition.drop.mapNumbers, [2, 3, 4, 5]);
  assert.equal(definition.drop.includeCore, true);
});

test("all 40 Ionis waves contain only level 25 non-boss enemies", ()=>{
  for(let wave = 1; wave <= IONIS_TOTAL_WAVES; wave += 1){
    const enemies = buildIonisPortalWave(wave, 1_000 + wave);
    assert.ok(enemies.length >= 1, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.level === IONIS_PORTAL_LEVEL), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>enemy.serverControlled && enemy.ionisEnemy), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>!enemy.ionisBoss), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>!String(enemy.kind || "").startsWith("boss_")), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>!enemy.noReward), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>Number(enemy.reward?.credits || 0) > 0), true, `wave ${wave}`);
    assert.equal(enemies.every(enemy=>Number(enemy.reward?.xp || 0) > 0), true, `wave ${wave}`);
  }
});

test("wave 40 is a clearly reinforced elite assault without becoming a boss wave", ()=>{
  const normal = createIonisEnemy("cristanite", 39, 1, 0, 0, 2_000);
  const elite = createIonisEnemy("cristanite", IONIS_ELITE_WAVE, 1, 0, 0, 2_000);
  const eliteWave = buildIonisPortalWave(IONIS_ELITE_WAVE, 2_000);

  assert.equal(normal.ionisElite, false);
  assert.equal(elite.ionisElite, true);
  assert.equal(elite.maxHp, Math.round(normal.maxHp * IONIS_ELITE_DURABILITY_MULTIPLIER));
  assert.equal(elite.maxShield, Math.round(normal.maxShield * IONIS_ELITE_DURABILITY_MULTIPLIER));
  assert.equal(elite.attackDamage, Math.round(normal.attackDamage * IONIS_ELITE_DAMAGE_MULTIPLIER));
  assert.equal(eliteWave.length, 7);
  assert.equal(eliteWave.every(enemy=>enemy.ionisElite), true);
  assert.equal(eliteWave.every(enemy=>!enemy.ionisBoss), true);
});

test("Ionis starts waves in exact groups of four and waits for a full clear between groups", ()=>{
  const harness = createTimerHarness();
  let completed = 0;
  const emittedSnapshots = [];
  const runtime = createIonisWaveRuntime({
    emitInstance(emittedGroup){
      emittedSnapshots.push({
        wave:emittedGroup.instance.wave,
        nextWaveAt:emittedGroup.instance.nextWaveAt,
        waveState:emittedGroup.instance.waveState
      });
    },
    emitPortalComplete(){ completed += 1; },
    now:harness.now,
    setTimeoutFn:harness.setTimeoutFn,
    clearTimeoutFn:harness.clearTimeoutFn
  });
  const instance = {
    id:"ionis-wave-test",
    type:"portal",
    portal:{id:IONIS_PORTAL_ID, totalWaves:IONIS_TOTAL_WAVES},
    completed:false,
    enemies:[]
  };
  const group = {id:"group-ionis-wave", members:[], instance};

  assert.equal(runtime.start(group), true);
  assert.equal(instance.wave, 1);
  assert.equal(instance.waveBatchEnd, IONIS_WAVES_PER_GROUP);
  assert.equal(instance.waveState, "wave_countdown");
  assert.deepEqual(harness.timers.slice(0, 3).map(timer=>timer.delay), [
    IONIS_WAVE_INTERVAL_MS,
    IONIS_WAVE_INTERVAL_MS * 2,
    IONIS_WAVE_INTERVAL_MS * 3
  ]);

  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(instance.wave, 1);
  assert.equal(instance.waveState, "wave_countdown");

  harness.firePending();
  assert.equal(instance.wave, 4);
  assert.equal(instance.enemies.some(enemy=>enemy.hp > 0), true);

  for(const nextGroupStart of [5, 9, 13, 17, 21, 25, 29, 33, 37]){
    instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
    runtime.handleEnemyDeath(group);
    assert.equal(instance.wave, nextGroupStart);
    assert.equal(instance.waveBatchEnd, nextGroupStart + 3);
    assert.equal(instance.objective.eliteWave, nextGroupStart === IONIS_ELITE_WAVE);
    const transitionSnapshot = emittedSnapshots.at(-1);
    assert.equal(transitionSnapshot.wave, nextGroupStart);
    assert.equal(transitionSnapshot.waveState, "wave_countdown");
    assert.equal(transitionSnapshot.nextWaveAt, harness.now() + IONIS_WAVE_INTERVAL_MS);
    harness.firePending();
    assert.equal(instance.wave, nextGroupStart + 3);
    assert.equal(instance.objective.eliteWave, nextGroupStart + 3 === IONIS_ELITE_WAVE);
  }

  assert.equal(instance.wave, 40);
  assert.equal(instance.objective.eliteWave, true);
  const finalWaveEnemies = instance.enemies.filter(enemy=>enemy.hp > 0 && enemy.ionisWave === 40);
  assert.equal(finalWaveEnemies.length, 7);
  assert.equal(finalWaveEnemies.every(enemy=>enemy.ionisElite), true);
  assert.equal(completed, 0);
  instance.enemies.forEach(enemy=>{ enemy.hp = 0; });
  runtime.handleEnemyDeath(group);
  assert.equal(completed, 1);
  assert.equal(instance.waveState, "completed");
  assert.equal(instance.objective.stage, "complete");
});

test("Ionis public objective exposes a strict elite boolean only on wave 40", ()=>{
  const instance = {
    id:"ionis-public",
    type:"portal",
    portal:{id:IONIS_PORTAL_ID, totalWaves:IONIS_TOTAL_WAVES},
    wave:1,
    waveBatchEnd:4,
    waveState:"wave_countdown",
    nextWaveAt:20_000,
    objective:{
      kind:"ionis",
      stage:"waves",
      wave:1,
      waveTotal:40,
      waveState:"wave_countdown",
      waveBatchEnd:4,
      nextWaveAt:20_000
    }
  };
  const first = publicIonisObjective(instance, 10_000);
  assert.equal(first.eliteWave, false);
  assert.equal(first.eliteWaveNumber, 40);
  assert.equal(first.nextWaveDelayMs, 10_000);

  instance.wave = 40;
  instance.waveBatchEnd = 40;
  instance.waveState = "clear_batch";
  instance.nextWaveAt = 0;
  const final = publicIonisObjective(instance, 50_000);
  assert.equal(final.eliteWave, true);
  assert.equal(final.wave, 40);
  assert.equal(final.waveBatchEnd, 40);
});
