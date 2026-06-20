import assert from "node:assert/strict";
import test from "node:test";
import { createEnemyHitHandler } from "../src/combat/enemyHits.js";

test("a valid missed shot makes a passive world enemy retaliate", ()=>{
  const enemy = {id:"enemy-1", x:100, y:0, hp:100, maxShield:0, shield:0};
  const player = {id:"player-1", mapId:"0", state:{x:0, y:0, mapId:"0"}};
  let worldStateEmits = 0;
  const handler = createEnemyHitHandler({
    emitWorldEnemies:()=>{ worldStateEmits += 1; },
    findWorldEnemyForPlayer:()=>enemy,
    groups:new Map(),
    io:{to:()=>({emit(){}})},
    players:new Map([[player.id, player]]),
    presence:{markCombat(){}},
    profileManager:{
      updateProfileForPlayer:()=>({
        ok:true,
        hit:false,
        damage:0,
        weaponClass:"laser",
        ammoId:"ammo_x1",
        consumed:1,
        profile:{}
      })
    }
  });

  const result = handler.applyEnemyHitForPlayer(player, {
    enemyId:enemy.id,
    weaponClass:"laser",
    ammoId:"ammo_x1"
  });

  assert.equal(result.ok, true);
  assert.equal(result.hit, false);
  assert.equal(enemy.hp, 100);
  assert.equal(enemy.lockedPlayerId, player.id);
  assert.equal(enemy.attackedPlayerId, player.id);
  assert.equal(enemy.damageThreat[player.id], 0);
  assert.equal(worldStateEmits, 1);
});
