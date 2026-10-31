import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_ENEMY_TYPES, WORLD_MAPS } from "../src/world/definitions.js";
import { createWorldEnemy } from "../src/world/spawn.js";
import { createWorldStateManager } from "../src/world/state.js";
import { createDeadlyEnemy } from "../src/portals/deadlyEnemies.js";
import { ENEMY_TYPES, getEnemyStatsForLevel } from "../../src/game/combatData/enemies.js";
import { createMapEnemy } from "../../src/game/systems/mapState.js";
import { getMonsterTierMultiplier } from "../../src/shared/enemyProgression.js";

const BASES = {
  drone_pirate:[1,400,200,800,1,400],
  raider_astral:[4,800,400,1600,2,800],
  chasseur_spectral:[9,3000,1000,4000,4,2000],
  pondeuse_astrale:[15,40000,40000,50000,32,25000],
  cuirasse_nebulaire:[10,5000,3000,6000,6,3000],
  cuirasse_ambre:[19,50000,50000,80000,40,32000],
  eclanite:[14,20000,20000,24000,16,12000],
  cristanite:[20,60000,60000,72000,48,36000],
  astranite:[24,200000,200000,400000,144,108000]
};
const MAP = {id:"balance-test",width:10000,height:8000,level:[1,4],enemyTypes:[["drone_pirate",1]]};

function serverEnemy(kind, level){
  return createWorldEnemy(MAP,1,()=>.5,kind,{level,x:0,y:0});
}

test("all nine species have the requested base health, shield and rewards in both runtimes", ()=>{
  for(const [kind,[level,hp,shield,credits,premium,xp]] of Object.entries(BASES)){
    const server = serverEnemy(kind,level);
    const client = getEnemyStatsForLevel(kind,level);
    assert.equal(WORLD_ENEMY_TYPES[kind].baseLevel,level,kind);
    assert.equal(ENEMY_TYPES[kind].baseLevel,level,kind);
    assert.deepEqual([server.maxHp,server.maxShield,server.reward.credits,server.reward.premium,server.reward.xp],
      [hp,shield,credits,premium,xp],kind);
    assert.deepEqual([client.maxHp,client.maxShield,client.loot.credits,client.loot.premium,client.loot.xp],
      [hp,shield,credits,premium,xp],kind);
  }
});

test("confirmed five-level thresholds add fifty percent without growth between thresholds", ()=>{
  const cases = [
    ["drone_pirate",1,1],["drone_pirate",4,1],["drone_pirate",5,1.5],["drone_pirate",9,1.5],["drone_pirate",10,2],
    ["raider_astral",4,1],["raider_astral",5,1],["raider_astral",9,1],["raider_astral",10,1.5],["raider_astral",15,2],
    ["chasseur_spectral",9,1],["chasseur_spectral",10,1],["chasseur_spectral",14,1],["chasseur_spectral",15,1.5],
    ["eclanite",14,1],["eclanite",15,1],["eclanite",19,1],["eclanite",20,1.5],["eclanite",25,2],
    ["cuirasse_ambre",19,1],["cuirasse_ambre",20,1],["cuirasse_ambre",25,1.5],
    ["astranite",24,1],["astranite",25,1],["astranite",30,1.5]
  ];
  for(const [kind,level,multiplier] of cases){
    const [reference,hp,shield,credits,premium,xp] = BASES[kind];
    const actual = serverEnemy(kind,level);
    assert.equal(getMonsterTierMultiplier(reference,level),multiplier,`${kind} level ${level}`);
    assert.deepEqual([actual.maxHp,actual.maxShield,actual.reward.credits,actual.reward.premium,actual.reward.xp],
      [hp,shield,credits,premium,xp].map(value=>Math.round(value*multiplier)),`${kind} level ${level}`);
    assert.equal(actual.attackDamage,Math.round(serverEnemy(kind,reference).attackDamage*multiplier));
    const client = getEnemyStatsForLevel(kind,level);
    assert.equal(client.attackDamage,actual.attackDamage);
    assert.equal(client.maxHp,actual.maxHp);
    assert.equal(client.maxShield,actual.maxShield);
    assert.equal(client.loot.premium,actual.reward.premium);
  }
});

test("fixed sector levels apply to all firms and ordinary bosses in server and local spawns", ()=>{
  const strongest = {1:"raider_astral",5:"chasseur_spectral",10:"eclanite",15:"cuirasse_ambre",20:"astranite",25:"cuirasse_nebulaire"};
  for(const map of Object.values(WORLD_MAPS)){
    const kinds = new Set([...map.enemyTypes.map(([kind])=>kind),...Object.keys(map.fixedEnemyCounts || {})]);
    for(const kind of kinds){
      const expected = kind.replace(/^boss_/,"") === strongest[map.level[0]] ? map.level[1] : map.level[0];
      for(const random of [.1,.5,.9]){
        const enemy = createWorldEnemy(map,1,()=>random,kind);
        const local = createMapEnemy({map:{...map,enemyLevel:map.level,enemyTypes:[{id:kind,weight:1}]},id:1,rnd:()=>random,kind});
        assert.equal(enemy.level,expected,`${map.name} ${kind}`);
        assert.equal(local.level,expected,`${map.name} ${kind} local`);
        assert.equal(local.maxHp,enemy.maxHp);
        assert.equal(local.maxShield,enemy.maxShield);
        assert.equal(local.attackDamage,enemy.attackDamage);
        assert.deepEqual([local.loot.credits,local.loot.premium,local.loot.xp],
          [enemy.reward.credits,enemy.reward.premium,enemy.reward.xp]);
      }
    }
  }
});

test("all five sector bosses are exactly x2 in health, shield, attacks, poison and rewards", ()=>{
  for(const kind of ["drone_pirate","raider_astral","chasseur_spectral","cuirasse_nebulaire","cuirasse_ambre"]){
    for(const level of [BASES[kind][0],5,10,15,20,25,34]){
      const normal = serverEnemy(kind,level);
      const boss = serverEnemy(`boss_${kind}`,level);
      const clientBoss = getEnemyStatsForLevel(`boss_${kind}`,level);
      for(const field of ["maxHp","maxShield","attackDamage"]){
        if(normal[field] == null) continue;
        assert.equal(boss[field],normal[field]*2,`${kind} ${field}`);
        assert.equal(clientBoss[field],boss[field],`${kind} client ${field}`);
      }
      // Integer bounds are rounded after the doubled nominal damage.
      for(const [field,multiplier] of [["attackDamageMin",.82],["attackDamageMax",1.18]]){
        assert.equal(boss[field],Math.round(boss.attackDamage*multiplier));
        assert.equal(clientBoss[field],boss[field]);
      }
      for(const field of ["credits","premium","xp"]) assert.equal(boss.reward[field],normal.reward[field]*2);
      if(normal.onHitEffect) assert.equal(boss.onHitEffect.damage,normal.onHitEffect.damage*2);
    }
  }
});

test("children and respawns follow their sector's fixed levels", ()=>{
  const manager = createWorldStateManager({io:{to:()=>({emit(){}})},players:new Map(),presence:{isActiveForWorld:()=>true},progressProfileQuestAction(){}});
  const map = manager.getWorldMapState("4");
  const parent = map.enemies.find(enemy=>enemy.kind === "astranite");
  assert.equal(parent.level,24);
  const children = manager.spawnWorldEnemyChildren("4",parent);
  assert.equal(children.length,1);
  assert.equal(children[0].kind,"cristanite");
  assert.equal(children[0].level,20);
  manager.respawnWorldEnemy("4",parent.id);
  assert.equal(map.enemies.find(enemy=>enemy.id === parent.id).level,24);
});

test("all six Deadly species use level ten and the requested independent rewards", ()=>{
  const expected = {
    deadly_eclaireur:[10000,10000,20000,16,9000],
    deadly_intercepteur:[15000,15000,28000,20,12000],
    deadly_gardien:[60000,60000,150000,75,56000],
    deadly_traqueur:[50000,50000,120000,65,48000],
    deadly_ravageur:[55000,55000,180000,90,72000],
    deadly_amiral_k137:[1000000,1000000,4000000,5000,1000000]
  };
  for(const [kind,values] of Object.entries(expected)){
    const enemy = createDeadlyEnemy(kind,{id:kind,x:0,y:0,now:1000});
    assert.equal(enemy.level,10);
    assert.deepEqual([enemy.maxHp,enemy.maxShield,enemy.reward.credits,enemy.reward.premium,enemy.reward.xp],values,kind);
  }
});
