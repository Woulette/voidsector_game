import assert from "node:assert/strict";
import test from "node:test";
import { DEADLY_ENEMY_DISPLAY } from "../../src/data/deadlyEnemies.js";
import { calculateMonsterKillRankPoints, getMonsterRankPointRule } from "../../src/data/ranks.js";

test("Deadly enemies expose proper leaderboard names, images and level", ()=>{
  assert.equal(Object.keys(DEADLY_ENEMY_DISPLAY).length, 6);
  for(const [kind, enemy] of Object.entries(DEADLY_ENEMY_DISPLAY)){
    assert.equal(enemy.kind, kind);
    assert.ok(enemy.name);
    assert.match(enemy.img, /^assets\/enemies\/deadly\/.+\.webp$/);
    assert.deepEqual(enemy.levelRange, [20, 20]);
  }
});

test("Deadly leaderboard uses the fixed monster rates", ()=>{
  assert.deepEqual(getMonsterRankPointRule("deadly_eclaireur"), {kills:3, points:1});
  assert.equal(calculateMonsterKillRankPoints("deadly_eclaireur", 0), 0);
  assert.equal(calculateMonsterKillRankPoints("deadly_eclaireur", 2), 1);
  assert.equal(calculateMonsterKillRankPoints("deadly_ravageur", 0), 2);
  assert.equal(calculateMonsterKillRankPoints("deadly_amiral_k137", 0), 120);
});
