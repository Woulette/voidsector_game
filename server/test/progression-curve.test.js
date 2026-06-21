import test from "node:test";
import assert from "node:assert/strict";
import { getXpNextForLevel as getSharedXpNextForLevel } from "../../src/data/xpCurve.js";
import {
  applyProgressionReward,
  getXpNextForLevel,
  normalizeProgressionPlayer
} from "../src/players/progression.js";

test("server progression uses the shared client XP curve", ()=>{
  for(let level = 1; level <= 60; level += 1){
    assert.equal(getXpNextForLevel(level), getSharedXpNextForLevel(level));
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
