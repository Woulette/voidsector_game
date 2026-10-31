import assert from "node:assert/strict";
import test from "node:test";
import { createWorldAiManager } from "../src/world/ai.js";
import { markEnemyAttackedByPlayer } from "../src/world/aggro.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { createWorldEnemy } from "../src/world/spawn.js";

test("a spawned Pondeuse stays passive near players and retaliates against its attacker", ()=>{
  const map = WORLD_MAPS["3"];
  const player = {id:"attacker", mapId:map.id, state:{mapId:map.id, x:0, y:0, hp:10000}};
  const spectator = {id:"spectator", mapId:map.id, state:{mapId:map.id, x:250, y:0, hp:10000}};
  const enemy = createWorldEnemy(map, 0, ()=>.5, "pondeuse_astrale", {level:16});
  const startX = enemy.attackRange - 50;
  Object.assign(enemy, {x:startX, y:0, homeX:startX, homeY:0});
  const attacks = [];
  const manager = createWorldAiManager({
    players:new Map([[player.id, player], [spectator.id, spectator]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack:attack=>attacks.push(attack),
    isPlayerSafeOnMap:()=>false
  });

  manager.updateWorldEnemy(enemy, map, [player, spectator], .1, 1000);
  manager.updateWorldEnemy(enemy, map, [player, spectator], .1, 2000);
  assert.equal(enemy.lockedPlayerId ?? null, null);
  assert.equal(attacks.length, 0);

  markEnemyAttackedByPlayer(enemy, player.id, 0, 2100);
  manager.updateWorldEnemy(enemy, map, [player, spectator], .1, 2100);
  manager.updateWorldEnemy(enemy, map, [player, spectator], .1, 4100);
  assert.equal(enemy.lockedPlayerId, player.id);
  assert.ok(attacks.length > 0);
});
