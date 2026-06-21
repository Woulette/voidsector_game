import assert from "node:assert/strict";
import test from "node:test";
import {
  canEnemyRotateFully,
  getEnemyRenderRotation,
  hasCompactQuestAsset
} from "../../src/data/enemyVisuals.js";

test("Boss Vorak quest art stays inside its icon without changing normal Vorak art", ()=>{
  assert.equal(hasCompactQuestAsset("raider_astral"), true);
  assert.equal(hasCompactQuestAsset("boss_raider_astral"), false);
});

test("normal Vorak rusher rotates while its boss stays fixed", ()=>{
  assert.equal(canEnemyRotateFully("raider_astral"), true);
  assert.equal(getEnemyRenderRotation("raider_astral", Math.PI / 3), Math.PI + Math.PI / 3);
  assert.equal(canEnemyRotateFully("boss_raider_astral"), false);
  assert.equal(getEnemyRenderRotation("boss_raider_astral", Math.PI / 3), Math.PI);
});

test("Abyssal tracker and shared rusher families stay fixed with their point facing up", ()=>{
  for(const kind of [
    "cuirasse_nebulaire",
    "boss_cuirasse_nebulaire",
    "shared_rusher"
  ]){
    assert.equal(canEnemyRotateFully(kind), false);
    assert.equal(getEnemyRenderRotation(kind, Math.PI / 3), Math.PI);
    assert.equal(getEnemyRenderRotation(kind, -Math.PI / 2), Math.PI);
  }
});

test("Astral Brood Layer rotates freely because its orientation is radial", ()=>{
  assert.equal(canEnemyRotateFully("pondeuse_astrale"), true);
  assert.equal(getEnemyRenderRotation("pondeuse_astrale", Math.PI / 3), Math.PI / 3);
});

test("void crystal family assets remain completely fixed and point upward", ()=>{
  for(const kind of ["eclanite", "cristanite", "astranite"]){
    assert.equal(canEnemyRotateFully(kind), false);
    assert.equal(getEnemyRenderRotation(kind, 0), 0);
    assert.equal(getEnemyRenderRotation(kind, Math.PI / 3), 0);
  }
});
