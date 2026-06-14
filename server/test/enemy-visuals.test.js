import assert from "node:assert/strict";
import test from "node:test";
import { hasCompactQuestAsset } from "../../src/data/enemyVisuals.js";

test("Boss Vorak quest art stays inside its icon without changing normal Vorak art", ()=>{
  assert.equal(hasCompactQuestAsset("raider_astral"), true);
  assert.equal(hasCompactQuestAsset("boss_raider_astral"), false);
});
