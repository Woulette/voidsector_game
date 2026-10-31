import assert from "node:assert/strict";
import test from "node:test";
import { createCombatMultiplayerSyncSystem } from "../../src/game/systems/combatMultiplayerSync.js";
import { syncServerControlledEnemies, hasServerControlledEnemies } from "../../src/multiplayer/enemies.js";
import { spawnEnemyDeathExplosion } from "../../src/game/systems/combatEnemyDeath.js";
import { createCombatEnemyRuntime } from "../../src/game/systems/combatEnemyRuntime.js";
import { createCombatStatusEffectSystem } from "../../src/game/systems/combatStatusEffects.js";
import { createEnemyDeathExplosion, drawEnemyDeathExplosion } from "../../src/game/render/enemyDeathExplosion.js";
import { drawImpactEffects } from "../../src/game/render/entities.js";
import { ENEMY_TYPES } from "../../src/game/combatData/enemies.js";

function fixture(){
  const serverEnemy = Object.freeze({id:"mob",kind:"drone_pirate",x:100,y:200,hp:100,maxHp:100,shield:50,radius:30,width:80,height:80});
  const state = {enemies:[],impactEffects:[],currentMap:{id:"0"},selectedEnemy:null};
  const multiplayer = {connected:true,serverEnemyScopeKey:"world:0",serverEnemySnapshotAt:1000,serverEnemies:new Map([["mob",serverEnemy]])};
  const system = createCombatMultiplayerSyncSystem({multiplayer,getState:()=>state,
    setState:patch=>Object.assign(state,patch),hasServerControlledEnemies,syncServerControlledEnemies,
    actions:{setActiveLaserSlot(){},updateGameActionBar(){}},beams:{clear(){}},showToast(){}});
  const snapshot = (enemies,scope="world:0")=>{
    multiplayer.serverEnemyScopeKey=scope;
    multiplayer.serverEnemySnapshotAt+=100;
    multiplayer.serverEnemies=new Map(enemies.map(enemy=>[enemy.id,enemy]));
    system.syncEnemies();
  };
  system.syncEnemies();
  return {state,multiplayer,system,serverEnemy,snapshot};
}

test("a living enemy removed by the authoritative snapshot explodes once at its last visual position",()=>{
  const f=fixture();
  assert.equal(f.state.impactEffects.length,0);
  f.state.enemies[0].x=112; f.state.enemies[0].y=193;
  f.snapshot([]);
  assert.equal(f.state.enemies.length,0);
  assert.equal(f.state.impactEffects.length,1);
  assert.equal(f.state.impactEffects[0].x,112);
  assert.equal(f.state.impactEffects[0].y,193);
  for(let i=0;i<10;i++) f.system.syncEnemies();
  f.snapshot([]);
  assert.equal(f.state.impactEffects.length,1);
  assert.equal(f.serverEnemy.hp,100);
  assert.equal(f.serverEnemy.shield,50);
});

test("death detection covers all enemy families regardless of the weapon or killer",()=>{
  for(const kind of [...Object.keys(ENEMY_TYPES),"shared_orb","shared_crystal","deadly_eclaireur"]){
    const f=fixture();
    f.snapshot([{...f.serverEnemy,kind}]);
    f.snapshot([]);
    assert.equal(f.state.impactEffects.length,1,kind);
    assert.deepEqual(f.state.impactEffects[0],createEnemyDeathExplosion({x:100,y:200}));
  }
});

test("a confirmed zero-HP snapshot and its subsequent removal cannot emit twice",()=>{
  const f=fixture();
  f.snapshot([{...f.serverEnemy,hp:0}]);
  f.snapshot([]);
  assert.equal(f.state.impactEffects.length,1);
});

test("a later respawn with the same server ID gets its own death visual",()=>{
  const f=fixture();
  f.snapshot([]);
  f.snapshot([{...f.serverEnemy,x:400}]);
  f.snapshot([]);
  assert.equal(f.state.impactEffects.length,2);
  assert.equal(f.state.impactEffects[1].x,400);
});

test("initial snapshots, map changes, instance changes and reconnects produce no false deaths",()=>{
  for(const transition of ["map","instance","disconnect"]){
    const f=fixture();
    if(transition==="map"){
      f.state.currentMap={id:"1"};
      f.snapshot([],"world:1");
    }else if(transition==="instance") f.snapshot([],"coop:new-instance");
    else{
      f.multiplayer.connected=false;
      f.system.syncEnemies();
      f.multiplayer.connected=true;
      f.snapshot([]);
    }
    assert.equal(f.state.impactEffects.length,0,transition);
  }
});

test("solo deaths use the same visual without changing rewards, vitals or the map",()=>{
  const enemy=Object.freeze({id:1,x:20,y:35,hp:0,shield:0});
  const state={bullets:[],enemies:[enemy],impactEffects:[],currentMap:{id:"0"},player:{x:0,y:0}};
  const mapState={};
  const runtime=createCombatEnemyRuntime({multiplayer:{},getState:()=>state,
    setState:patch=>Object.assign(state,patch),getMapState:()=>mapState});
  runtime.updateBullets(1/60);
  runtime.updateBullets(1/60);
  assert.equal(state.enemies.length,0);
  assert.equal(state.impactEffects.length,1);
  assert.equal(enemy.hp,0);
  assert.equal(enemy.shield,0);
  assert.equal(state.currentMap.id,"0");
});

test("death effects expire through the native particle update at low and high frame rates",()=>{
  for(const fps of [30,60,144,240]){
    const state={player:{},particles:[],damageTexts:[],impactEffects:[createEnemyDeathExplosion({x:0,y:0})]};
    const effects=createCombatStatusEffectSystem({getState:()=>state,setState:patch=>Object.assign(state,patch)});
    for(let i=0;i<Math.ceil(2.3*fps);i++) effects.updateParticles(1/fps);
    assert.equal(state.impactEffects.length,0,`${fps} Hz`);
  }
});

test("rapid mass deaths stay bounded and preserve other combat effects",()=>{
  const existing={kind:"laser",life:1,max:1};
  const effects=[existing];
  for(let i=0;i<50;i++)spawnEnemyDeathExplosion(effects,Object.freeze({x:i,y:0}));
  assert.equal(effects.filter(effect=>effect.kind==="enemyDeathExplosion").length,8);
  assert.equal(effects[0],existing);
  assert.equal(effects.at(-1).x,49);
  const player=Object.freeze({x:1,y:2,isPlayerTarget:true});
  assert.equal(spawnEnemyDeathExplosion(effects,player),null);
});

test("disabled or offscreen explosions do no drawing or texture work",()=>{
  drawEnemyDeathExplosion(null,createEnemyDeathExplosion({x:0,y:0}),{showExplosions:false,showSparksSmoke:false});
  const ctx={canvas:{width:800,height:600},save(){},restore(){},translate(){}};
  drawImpactEffects({ctx,camera:{x:0,y:0},impactEffects:[createEnemyDeathExplosion({x:-1000,y:-1000})]});
  drawImpactEffects({ctx,camera:{x:0,y:0},impactEffects:[createEnemyDeathExplosion({x:100,y:100})],showExplosions:false,showSparksSmoke:false});
});
