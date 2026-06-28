import assert from "node:assert/strict";
import test from "node:test";
import {
  beginCombatProfilerFrame,
  clearCombatFrameProfiler,
  countCombatProfiler,
  disableCombatFrameProfiler,
  enableCombatFrameProfiler,
  finishCombatProfilerFrame,
  getCombatProfilerSnapshot,
  isCombatProfilerFlagEnabled,
  maxCombatProfilerMetric,
  setCombatProfilerFlag,
  setCombatProfilerMetric,
  timeCombatProfiler
} from "../../src/game/systems/combatFrameProfiler.js";

test("combat frame profiler records frame timings and counters when enabled", ()=>{
  clearCombatFrameProfiler();
  enableCombatFrameProfiler({overlay:false, slowFrameMs:1});

  beginCombatProfilerFrame({dt:.016, drawFrame:true});
  countCombatProfiler("socket.enemyAttack", 3);
  setCombatProfilerMetric("queue.playerDamage", 2);
  maxCombatProfilerMetric("sync.enemy.maxCorrectionPx", 12);
  maxCombatProfilerMetric("sync.enemy.maxCorrectionPx", 7);
  timeCombatProfiler("unit.work", ()=>{});
  const frame = finishCombatProfilerFrame({frameMs:2.5});
  const snapshot = getCombatProfilerSnapshot();

  assert.equal(frame.frameMs, 2.5);
  assert.equal(snapshot.frames.length, 1);
  assert.equal(snapshot.slowFrames.length, 1);
  assert.equal(snapshot.frames[0].counters["socket.enemyAttack"], 3);
  assert.equal(snapshot.frames[0].counters["queue.playerDamage"], 2);
  assert.equal(snapshot.frames[0].counters["sync.enemy.maxCorrectionPx"], 12);
  assert.equal(typeof snapshot.frames[0].timings["unit.work"], "number");

  disableCombatFrameProfiler();
  clearCombatFrameProfiler();
});

test("combat frame profiler keeps hit-related frames even when they are not slow", ()=>{
  clearCombatFrameProfiler();
  enableCombatFrameProfiler({overlay:false, slowFrameMs:100});

  beginCombatProfilerFrame({dt:.016, drawFrame:true});
  countCombatProfiler("events.playerDamage.processed", 1);
  const frame = finishCombatProfilerFrame({frameMs:2.2});
  const snapshot = getCombatProfilerSnapshot();

  assert.equal(snapshot.slowFrames.length, 0);
  assert.equal(snapshot.hitFrames.length, 1);
  assert.equal(snapshot.hitFrames[0].frameMs, frame.frameMs);
  assert.equal(snapshot.hitFrames[0].counters["events.playerDamage.processed"], 1);

  disableCombatFrameProfiler();
  clearCombatFrameProfiler();
});

test("combat frame profiler keeps player correction frames even when they are not slow", ()=>{
  clearCombatFrameProfiler();
  enableCombatFrameProfiler({overlay:false, slowFrameMs:100});

  beginCombatProfilerFrame({dt:.016, drawFrame:true});
  countCombatProfiler("sync.player.correction", 1);
  maxCombatProfilerMetric("sync.player.maxCorrectionPx", 9);
  const frame = finishCombatProfilerFrame({frameMs:1.4});
  const snapshot = getCombatProfilerSnapshot();

  assert.equal(snapshot.slowFrames.length, 0);
  assert.equal(snapshot.hitFrames.length, 1);
  assert.equal(snapshot.hitFrames[0].frameMs, frame.frameMs);
  assert.equal(snapshot.hitFrames[0].counters["sync.player.correction"], 1);
  assert.equal(snapshot.hitFrames[0].counters["sync.player.maxCorrectionPx"], 9);

  disableCombatFrameProfiler();
  clearCombatFrameProfiler();
});

test("combat profiler visual flags only affect diagnostics while profiler is enabled", ()=>{
  clearCombatFrameProfiler();
  disableCombatFrameProfiler();
  setCombatProfilerFlag("hideDamageTexts", true);
  assert.equal(isCombatProfilerFlagEnabled("hideDamageTexts"), false);

  enableCombatFrameProfiler({overlay:false});
  assert.equal(isCombatProfilerFlagEnabled("hideDamageTexts"), true);

  setCombatProfilerFlag("hideDamageTexts", false);
  disableCombatFrameProfiler();
  clearCombatFrameProfiler();
});
