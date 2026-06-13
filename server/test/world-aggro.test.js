import assert from "node:assert/strict";
import test from "node:test";
import { ENEMY_THREAT_RECALC_MS, markEnemyAttackedByPlayer } from "../src/world/aggro.js";

test("enemy keeps the first hitter until the ten second threat recalculation", ()=>{
  const enemy = {};
  markEnemyAttackedByPlayer(enemy, "player-a", 100, 1000);
  markEnemyAttackedByPlayer(enemy, "player-b", 500, 5000);

  assert.equal(enemy.lockedPlayerId, "player-a");
  assert.deepEqual(enemy.damageThreat, {"player-a":100, "player-b":500});

  markEnemyAttackedByPlayer(enemy, "player-a", 10, 1000 + ENEMY_THREAT_RECALC_MS);
  assert.equal(enemy.lockedPlayerId, "player-b");
});

test("enemy threat uses cumulative damage at each ten second recalculation", ()=>{
  const enemy = {};
  markEnemyAttackedByPlayer(enemy, "player-a", 600, 1000);
  markEnemyAttackedByPlayer(enemy, "player-b", 500, 5000);
  markEnemyAttackedByPlayer(enemy, "player-b", 200, 1000 + ENEMY_THREAT_RECALC_MS);
  assert.equal(enemy.lockedPlayerId, "player-b");

  markEnemyAttackedByPlayer(enemy, "player-a", 300, 1000 + ENEMY_THREAT_RECALC_MS * 2);
  assert.equal(enemy.lockedPlayerId, "player-a");
});
