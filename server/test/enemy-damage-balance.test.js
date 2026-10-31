import assert from "node:assert/strict";
import test from "node:test";
import { createWorldEnemy } from "../src/world/spawn.js";
import { createWorldAiManager } from "../src/world/ai.js";
import { markEnemyAttackedByPlayer } from "../src/world/aggro.js";
import { createDeadlyEnemy } from "../src/portals/deadlyEnemies.js";
import { getEnemyStatsForLevel } from "../../src/game/combatData/enemies.js";
import { createCombatEnemyRuntime } from "../../src/game/systems/combatEnemyRuntime.js";
import { rollEnemyDamage } from "../../src/shared/enemyDamage.js";

// User-approved nominal damage and integer bounds, independent of the roller.
const STANDARD = {
  drone_pirate:[1,38,31,45], raider_astral:[4,115,94,136],
  chasseur_spectral:[9,140,115,165], pondeuse_astrale:[15,500,410,590],
  cuirasse_nebulaire:[10,250,205,295], cuirasse_ambre:[19,700,574,826],
  eclanite:[14,350,287,413], cristanite:[20,900,738,1062],
  astranite:[24,2700,2214,3186]
};
const DEADLY = {
  deadly_eclaireur:[200,164,236], deadly_intercepteur:[300,246,354],
  deadly_gardien:[500,410,590], deadly_traqueur:[400,328,472],
  deadly_ravageur:[600,492,708], deadly_amiral_k137:[4000,3280,4720]
};
const MAP = {id:"balance",width:10000,height:8000,level:[1,4],enemyTypes:[["drone_pirate",1]]};
const enemyAt = (kind,level)=>createWorldEnemy(MAP,1,()=>.5,kind,{level,x:100,y:0});

test("all standard and Deadly mobs have the approved direct damage and eighteen percent bounds", ()=>{
  for(const [kind,[level,damage,min,max]] of Object.entries(STANDARD)){
    for(const actual of [enemyAt(kind,level),getEnemyStatsForLevel(kind,level)]){
      assert.deepEqual([actual.attackDamage,actual.attackDamageMin,actual.attackDamageMax],[damage,min,max],kind);
    }
    assert.equal(rollEnemyDamage(damage,()=>0),min,kind);
    assert.equal(rollEnemyDamage(damage,()=>1),max,kind);
  }
  for(const [kind,expected] of Object.entries(DEADLY)){
    const enemy = createDeadlyEnemy(kind,{now:1000});
    assert.deepEqual([enemy.attackDamage,enemy.attackDamageMin,enemy.attackDamageMax],expected,kind);
    assert.equal(enemy.level,10);
  }
  assert.equal(enemyAt("pondeuse_astrale",15).onHitEffect.damage,250);
  assert.equal(getEnemyStatsForLevel("pondeuse_astrale",15).onHitEffect.damage,250);
  assert.equal(enemyAt("chasseur_spectral",9).onHitEffect.damage,50);
});

test("level tiers and boss doubling apply before the final damage variation", ()=>{
  for(const [kind,level,expected] of [
    ["drone_pirate",5,57],["raider_astral",10,173],
    ["chasseur_spectral",15,210],["eclanite",20,525],
    ["boss_drone_pirate",5,114],["boss_raider_astral",10,346],
    ["boss_chasseur_spectral",25,700],["boss_cuirasse_nebulaire",34,1500],
    ["boss_cuirasse_ambre",19,1400]
  ]){
    const server = enemyAt(kind,level);
    const client = getEnemyStatsForLevel(kind,level);
    assert.equal(server.attackDamage,expected,`${kind} level ${level}`);
    for(const actual of [server,client]){
      assert.equal(actual.attackDamageMin,Math.round(expected*.82));
      assert.equal(actual.attackDamageMax,Math.round(expected*1.18));
    }
  }
});

test("actual server attacks and local projectiles roll different damage at both allowed endpoints", t=>{
  const player = {id:"target",mapId:MAP.id,state:{mapId:MAP.id,x:0,y:0,hp:10000}};
  const attacks = [];
  const ai = createWorldAiManager({
    players:new Map([[player.id,player]]),presence:{isActiveForWorld:()=>true},
    isPlayerSafeOnMap:()=>false,launchEnemyAttack:attack=>attacks.push(attack)
  });
  const state = {player:{x:0,y:0},bullets:[],particles:[]};
  const local = createCombatEnemyRuntime({multiplayer:{},getState:()=>state});
  for(const [kind,[level,,min,max]] of Object.entries(STANDARD)){
    for(const [random,expected] of [[0,min],[1,max]]){
      t.mock.method(Math,"random",()=>random);
      const enemy = enemyAt(kind,level);
      Object.assign(enemy,{staggerFirstAttack:false,nextAttackAt:0});
      markEnemyAttackedByPlayer(enemy,player.id,1,1000);
      const count = attacks.length;
      ai.updateWorldEnemy(enemy,MAP,[player],0,2000);
      assert.equal(attacks.length,count+1,kind);
      assert.equal(attacks.at(-1).amount,expected,kind);
      local.fireEnemyBullet(enemy,-100,0,100);
      assert.equal(state.bullets.at(-1).damage,expected,`${kind} local projectile`);
      t.mock.restoreAll();
    }
  }
});

test("the damage roll spans its full integer interval with a stable mean", ()=>{
  const hits = new Map();
  for(let i=0;i<1500;i++){
    const damage = rollEnemyDamage(38,()=>i/1500);
    hits.set(damage,(hits.get(damage)||0)+1);
  }
  assert.equal(hits.size,15);
  assert.equal(Math.min(...hits.keys()),31);
  assert.equal(Math.max(...hits.keys()),45);
  assert.equal([...hits].reduce((sum,[damage,count])=>sum+damage*count,0)/1500,38);
});
