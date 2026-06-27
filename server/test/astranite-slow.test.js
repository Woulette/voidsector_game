import assert from "node:assert/strict";
import test from "node:test";
import { updatePlayerMovement } from "../../src/game/systems/playerMovement.js";
import { createWorldStatusEffectManager } from "../src/world/statusEffects.js";

test("Astranite death slows only living players within 150 units for five seconds", ()=>{
  const makePlayer = (id, x, y, mapId = "4", hp = 1000)=>({
    id,
    mapId,
    state:{mapId, x, y, hp},
    statusEffects:{}
  });
  const near = makePlayer("near", 100, 0);
  const edge = makePlayer("edge", 150, 0);
  const far = makePlayer("far", 151, 0);
  const otherMap = makePlayer("other", 0, 0, "3");
  const dead = makePlayer("dead", 0, 0, "4", 0);
  const players = new Map([near, edge, far, otherMap, dead].map(player=>[player.id, player]));
  const events = [];
  const manager = createWorldStatusEffectManager({
    io:{to:id=>({emit:(event, payload)=>events.push({id, event, payload})})},
    players,
    presence:{},
    profileManager:{},
    emitProfileSync(){}
  });
  const enemy = {
    id:"astranite-1",
    x:0,
    y:0,
    deathEffect:{type:"slow", amount:200, duration:5, radius:150}
  };

  assert.deepEqual(manager.applyEnemyDeathEffect("4", enemy, 1000), ["near", "edge"]);
  assert.equal(near.statusEffects.slow.amount, 200);
  assert.equal(near.statusEffects.slow.expiresAt, 6000);
  assert.equal(far.statusEffects.slow, undefined);
  assert.equal(otherMap.statusEffects.slow, undefined);
  assert.equal(dead.statusEffects.slow, undefined);
  assert.equal(events.filter(entry=>entry.payload.active === true).length, 2);

  manager.updateStatusEffects(6000);
  assert.equal(near.statusEffects.slow, undefined);
  assert.equal(edge.statusEffects.slow, undefined);
  assert.equal(events.filter(entry=>entry.payload.active === false).length, 2);
});

test("server poison damage does not emit a full profile sync when quest state is unchanged", ()=>{
  const player = {
    id:"poisoned",
    mapId:"4",
    state:{mapId:"4", x:0, y:0, hp:100, maxHp:100, shield:0, maxShield:0},
    statusEffects:{}
  };
  const players = new Map([[player.id, player]]);
  const events = [];
  const saves = [];
  const profileSyncs = [];
  const manager = createWorldStatusEffectManager({
    io:{to:id=>({emit:(event, payload)=>events.push({id, event, payload})})},
    players,
    presence:{
      markDamage(){},
      markCombat(){}
    },
    profileManager:{
      applyQuestAction(){
        return {profile:{}, changed:false, updates:[], failed:[]};
      },
      saveWorldSession(payload){
        saves.push(payload);
      }
    },
    emitProfileSync(player, profile){
      profileSyncs.push({player, profile});
    }
  });
  const enemy = {
    id:"parasite-1",
    onHitEffect:{type:"poison", damage:10, interval:1, duration:3}
  };

  assert.equal(manager.applyEnemyOnHitEffect(enemy, player, 1000), true);
  manager.updateStatusEffects(2000);

  assert.equal(player.state.hp, 90);
  assert.equal(saves.length, 1);
  assert.equal(profileSyncs.length, 0);
  const damageEvents = events.filter(entry=>entry.event === "player:damage");
  assert.equal(damageEvents.length, 1);
  assert.equal(damageEvents[0].payload.damageType, "poison");
});

test("the client movement step applies the flat 200 speed reduction", ()=>{
  const player = {
    x:0,
    y:0,
    speed:500,
    slowEffect:{amount:200, remaining:5},
    enginePower:0
  };
  const target = updatePlayerMovement({
    player,
    moveTarget:{x:1000, y:0},
    dt:1,
    map:{width:5000, height:5000},
    clampToMap:false
  });

  assert.deepEqual(target, {x:1000, y:0});
  assert.equal(player.x, 300);
  assert.equal(player.vx, 300);
});
