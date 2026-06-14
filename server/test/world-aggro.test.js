import assert from "node:assert/strict";
import test from "node:test";
import { ENEMY_THREAT_RECALC_MS, markEnemyAttackedByPlayer } from "../src/world/aggro.js";
import { createWorldAiManager } from "../src/world/ai.js";

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

test("enemy proximity aggro prioritizes a real player over the closer Ricky NPC", ()=>{
  const player = {
    id:"player-a",
    mapId:"portal-ricky",
    state:{mapId:"portal-ricky", x:300, y:0, hp:1000}
  };
  const ricky = {
    id:"ricky_companion",
    npcTarget:true,
    mapId:"portal-ricky",
    state:{mapId:"portal-ricky", x:20, y:0, hp:50000}
  };
  const enemy = {
    id:"enemy-1",
    kind:"chasseur_spectral",
    x:0,
    y:0,
    homeX:0,
    homeY:0,
    hp:10000,
    maxHp:10000,
    speed:160,
    attackRange:360,
    attackDamage:100,
    attackCooldown:1400
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });

  manager.updateWorldEnemy(enemy, {id:"portal-ricky", width:5200, height:3600}, [ricky, player], .1, 1000);

  assert.equal(enemy.lockedPlayerId, player.id);
});
