import test from "node:test";
import assert from "node:assert/strict";
import {trackerAttack,trackerVertex,trackerHeading} from "./motion.js";
import {advanceTrackerWake,TRACKER_WAKE_LIMIT} from "./wake.js";
import {getEnemyRenderRotation} from "../../../src/data/enemyVisuals.js";
import {ENEMY_TYPES} from "../../../src/game/combatData/enemies.js";

const at=(x=0,y=0)=>({x,y,width:106,height:106});

test("selected blue core and all six roots stay rigid while its appendages flex independently",()=>{
  const pose={time:1.7,power:1,attack:{charge:1,flash:0}};
  for(const [u,v] of [[.5,.3],[.46,.5],[.54,.6],[.355,.36],[.645,.36],[.335,.50],[.665,.50],[.36,.62],[.64,.62]]){
    const p=trackerVertex(u,v,pose);
    assert(Math.hypot(p.x-u,p.y-v)<1e-10);
  }
  const offsets=[];
  for(const [u,v] of [[.34,.17],[.66,.17],[.11,.76],[.89,.76],[.30,.86],[.70,.86]]){
    const a=trackerVertex(u,v,pose);
    const path=Array.from({length:40},(_,i)=>trackerVertex(u,v,{...pose,time:1.7+i/20}));
    assert(Math.max(...path.map(p=>Math.hypot(p.x-a.x,p.y-a.y)))>.005);
    assert(Math.hypot(a.x-u,a.y-v)<.10);
    offsets.push((a.x-u).toFixed(5)+':'+(a.y-v).toFixed(5));
  }
  assert.equal(new Set(offsets).size,6);
});

test("lighting follows only the shot age and the native fixed orientation is preserved",()=>{
  assert.equal(trackerAttack(-10).flash,0);assert.equal(trackerAttack(-10).charge,0);
  assert(trackerAttack(-.02).charge>.95);assert.equal(trackerAttack(0).flash,1);
  assert.equal(trackerAttack(.5).flash,0);
  for(const angle of [0,1,2,4,6]){
    assert.equal(getEnemyRenderRotation('cuirasse_nebulaire',angle),0);
    assert.equal(trackerHeading('cuirasse_nebulaire',angle),0);
  }
  assert.deepEqual(ENEMY_TYPES.cuirasse_nebulaire.deathEffect,{type:'slow',ratio:.5,duration:5,radius:100});
});

for(const fps of [30,60,120,144,240])test(`cold dust emits at ${fps} Hz with repeated 60 Hz positions`,()=>{
  const state={};advanceTrackerWake(state,at(),1/fps);
  for(let frame=1;frame<=fps*3;frame++){
    const tick=Math.floor(frame/fps*60+1e-7);
    advanceTrackerWake(state,Object.freeze(at(tick/60*90)),1/fps);
    assert(state.particles.length<=TRACKER_WAKE_LIMIT);
  }
  assert(state.serial>=112 && state.serial<=114);assert(state.particles.length>0);
});

test("dust follows actual turns, expires at a stop and clears on teleport",()=>{
  const state={};let enemy=at();advanceTrackerWake(state,enemy,1/60);
  for(let i=1;i<=50;i++){enemy=at(i*1.5);advanceTrackerWake(state,enemy,1/60);}
  const old=state.particles.at(-1),{vx,vy}=old;
  for(let i=1;i<=12;i++){enemy=at(75,i*1.5);advanceTrackerWake(state,enemy,1/60);}
  assert.equal(old.vx,vx);assert.equal(old.vy,vy);
  const serial=state.serial;
  for(let i=0;i<140;i++)advanceTrackerWake(state,{...enemy,vx:200,vy:0},1/60);
  assert.equal(state.serial,serial);assert.equal(state.particles.length,0);
  assert(state.power<.01);
  advanceTrackerWake(state,at(1000,1000),1/60);
  assert.equal(state.particles.length,0);assert.equal(state.carry,0);
});
