import test from "node:test";
import assert from "node:assert/strict";
import {parasiteAttack,parasiteVertex,PARASITE_ROOT,PARASITE_SCALE} from "./motion.js";
import {advanceParasiteWake,PARASITE_WAKE_LIMIT} from "./wake.js";
import {PARASITE_PROFILES,parasiteSize} from "./profiles.js";
import {ENEMY_TYPES} from "../../../src/game/combatData/enemies.js";
import {canEnemyRotateFully} from "../../../src/data/enemyVisuals.js";

const enemyAt=(x=0,y=0)=>({x,y,width:86,height:86,angle:0});

test("all six roots stay anchored while the distal tentacles flex independently",()=>{
  const samples=[];
  for(let arm=0;arm<6;arm++){
    const root=parasiteVertex(arm,PARASITE_ROOT,0,2,{power:1,lagX:1,charge:1});
    assert.equal(root.x,root.u);assert.equal(root.y,root.v);
    const a=parasiteVertex(arm,.46,0,1),b=parasiteVertex(arm,.46,0,1.4);
    assert(Math.hypot(a.x-b.x,a.y-b.y)>.001);
    assert(Math.hypot(a.x-a.u,a.y-a.v)<.12);
    samples.push((a.x-a.u).toFixed(5)+':'+(a.y-a.v).toFixed(5));
  }
  assert.equal(new Set(samples).size,6);assert(Math.abs(PARASITE_SCALE/.94-1.15)<1e-10);
});

test("movement drags only the soft tips and shooting lights the nucleus without an invented idle attack",()=>{
  const still=parasiteVertex(0,.46,0,1,{power:1}),moving=parasiteVertex(0,.46,0,1,{power:1,lagX:1});
  assert(moving.x<still.x);assert.equal(parasiteAttack(-10).flash,0);
  assert(parasiteAttack(-.02).charge>.9);assert.equal(parasiteAttack(0).flash,1);
  assert.equal(parasiteAttack(.5).flash,0);
});

for(const fps of [30,60,120,144,240])test(`green vapor emits at ${fps} Hz with repeated 60 Hz positions`,()=>{
  const state={};advanceParasiteWake(state,enemyAt(),1/fps);
  for(let frame=1;frame<=fps*3;frame++){
    const tick=Math.floor(frame/fps*60+1e-7);
    advanceParasiteWake(state,Object.freeze(enemyAt(tick/60*90)),1/fps);
    assert(state.particles.length<=PARASITE_WAKE_LIMIT);
  }
  assert(state.serial>=112 && state.serial<=114);assert(state.particles.length>0);
});

test("world-space vapor keeps the old turn and evaporates after an actual stop",()=>{
  const state={};let enemy=enemyAt();advanceParasiteWake(state,enemy,1/60);
  for(let i=1;i<=50;i++){enemy=enemyAt(i*1.5);advanceParasiteWake(state,enemy,1/60);}
  const old=state.particles.at(-1),{vx,vy}=old;
  for(let i=1;i<=12;i++){enemy=enemyAt(75,i*1.5);advanceParasiteWake(state,enemy,1/60);}
  assert.equal(old.vx,vx);assert.equal(old.vy,vy);
  const serial=state.serial;
  for(let i=0;i<140;i++)advanceParasiteWake(state,{...enemy,vx:200,vy:0},1/60);
  assert.equal(state.serial,serial);assert.equal(state.particles.length,0);assert(state.power<.01);
});

test("a teleport clears vapor instead of joining distant positions",()=>{
  const state={};advanceParasiteWake(state,enemyAt(),1/60);
  for(let i=1;i<=20;i++)advanceParasiteWake(state,enemyAt(i*2),1/60);
  assert(state.particles.length>0);
  advanceParasiteWake(state,enemyAt(900),1/60);assert.equal(state.particles.length,0);
});

test("common and boss Parasites gain fifteen percent visually while keeping their native size ratio",()=>{
  const common=PARASITE_PROFILES.chasseur_spectral,boss=PARASITE_PROFILES.boss_chasseur_spectral;
  assert.equal(common.scale,.94*1.15);assert.equal(boss.scale,common.scale);assert.equal(common.root,.192);assert.equal(common.core,.207);
  assert.equal(common.flex,1);assert.equal(common.light,1);
  const ratio=parasiteSize({...ENEMY_TYPES.boss_chasseur_spectral,kind:"boss_chasseur_spectral"})/
    parasiteSize({...ENEMY_TYPES.chasseur_spectral,kind:"chasseur_spectral"});
  assert(ratio>1.2 && ratio<1.22);assert(boss.crown);
  assert(canEnemyRotateFully("chasseur_spectral"));assert(canEnemyRotateFully("boss_chasseur_spectral"));
});

for(const fps of [30,60,120,144,240])test(`boss Parasite vapor follows repeated 60 Hz positions at ${fps} Hz`,()=>{
  const state={},base={...ENEMY_TYPES.boss_chasseur_spectral,kind:"boss_chasseur_spectral",x:0,y:0};
  advanceParasiteWake(state,base,1/fps);
  for(let frame=1;frame<=fps*3;frame++){
    const tick=Math.floor(frame/fps*60+1e-7);
    advanceParasiteWake(state,Object.freeze({...base,x:tick/60*90}),1/fps);
    assert(state.particles.length<=PARASITE_WAKE_LIMIT);
  }
  assert(state.serial>=112 && state.serial<=114);assert(state.particles.length>0);
});
