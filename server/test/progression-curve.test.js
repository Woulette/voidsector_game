import test from "node:test";
import assert from "node:assert/strict";
import { getXpNextForLevel as getSharedXpNextForLevel } from "../../src/data/xpCurve.js";
import {
  applyProgressionReward,
  getProgressionLevelCap,
  getProgressionSnapshot,
  getXpNextForLevel,
  normalizeProgressionPlayer,
  spendCurrency
} from "../src/players/progression.js";

test("server progression uses the shared client XP curve", ()=>{
  for(let level = 1; level <= 60; level += 1){
    assert.equal(getXpNextForLevel(level), getSharedXpNextForLevel(level));
  }
});

test("the second level loop is 15 percent harder after level 50", ()=>{
  assert.equal(getXpNextForLevel(49), 2_000_000_000);
  assert.equal(getXpNextForLevel(50), 2_790_527_515);
  assert.equal(getXpNextForLevel(99), 36_278_681_103_891);
  for(let level = 2; level <= 100; level += 1){
    assert.ok(getXpNextForLevel(level) > getXpNextForLevel(level - 1));
  }
});

test("a profile exactly at its XP threshold levels up during normalization", ()=>{
  const threshold = getXpNextForLevel(14);
  const player = normalizeProgressionPlayer({
    level:14,
    xp:threshold,
    xpNext:threshold,
    skillPoints:3
  });

  assert.equal(player.level, 15);
  assert.equal(player.xp, 0);
  assert.equal(player.xpNext, getXpNextForLevel(15));
  assert.equal(player.skillPoints, 4);
});

test("an XP reward keeps overflow when crossing the shared threshold", ()=>{
  const threshold = getXpNextForLevel(14);
  const player = applyProgressionReward({level:14, xp:threshold - 10, skillPoints:3}, {xp:25});

  assert.equal(player.level, 15);
  assert.equal(player.xp, 15);
  assert.equal(player.xpNext, getXpNextForLevel(15));
  assert.equal(player.skillPoints, 4);
});

test("the server caps progression at level 50 before Ascension", ()=>{
  const levelCap = getProgressionLevelCap(0);
  const player = applyProgressionReward(
    {level:50, xp:0, totalXp:0, skillPoints:49},
    {xp:1_000_000_000_000},
    levelCap
  );

  assert.equal(levelCap, 50);
  assert.equal(player.level, 50);
  assert.equal(player.xp, player.xpNext);
  assert.equal(player.totalXp, 1_000_000_000_000);
});

test("the server caps ascended progression at level 100", ()=>{
  const levelCap = getProgressionLevelCap(1);
  const player = applyProgressionReward(
    {level:99, xp:0, totalXp:0, skillPoints:98},
    {xp:getXpNextForLevel(99) + getXpNextForLevel(100) * 2},
    levelCap
  );

  assert.equal(levelCap, 100);
  assert.equal(player.level, 100);
  assert.equal(player.xp, player.xpNext);
});

test("spending currency cannot bypass the pre-Ascension level cap", ()=>{
  const threshold = getXpNextForLevel(50);
  const result = spendCurrency(
    {level:50, xp:threshold, xpNext:threshold, credits:100},
    "credits",
    10,
    getProgressionLevelCap(0)
  );

  assert.equal(result.ok, true);
  assert.equal(result.player.level, 50);
  assert.equal(result.player.xp, threshold);
  assert.equal(result.player.credits, 90);
});

test("compact reward snapshots preserve the pre-Ascension cap", ()=>{
  const threshold = getXpNextForLevel(50);
  const snapshot = getProgressionSnapshot(
    {level:50, xp:threshold, xpNext:threshold},
    getProgressionLevelCap(0)
  );

  assert.equal(snapshot.level, 50);
  assert.equal(snapshot.xp, threshold);
});
