import test from "node:test";
import assert from "node:assert/strict";
import {eclaniteAttack,eclaniteCrystalPose} from "./motion.js";
import {advanceEclaniteWake,ECLANITE_WAKE_LIMIT} from "./wake.js";
import {getEnemyRenderRotation} from "../../../src/data/enemyVisuals.js";
import {ENEMY_TYPES} from "../../../src/game/combatData/enemies.js";

const at=(x=0,y=0)=>({x,y,width:82,height:82});

test("six mineral fragments drift independently, stay close and remain continuous",()=>{
  const poses=Array.from({length:6},(_,i)=>eclaniteCrystalPose(i,2.7));
  assert.equal(new Set(poses.map(p=>`${p.orbit.toFixed(5)}:${p.radial.toFixed(5)}`)).size,6);
  for(let i=0;i<6;i++)for(let frame=0;frame<240*12;frame++){
    const p=eclaniteCrystalPose(i,frame/240),next=eclaniteCrystalPose(i,(frame+1)/240);
    assert(Math.abs(p.orbit)<=.12 && Math.abs(p.radial)<=.035 && Math.abs(p.twist)<=.065);
    assert(Math.abs(next.orbit-p.orbit)<.002 && Math.abs(next.radial-p.radial)<.001);
    assert(p.light>=0 && p.light<=1);
  }
});

test("the attack briefly charges and lights the crystals while the body keeps its fixed orientation",()=>{
  assert.deepEqual(eclaniteAttack(-10),{charge:0,flash:0});
  assert(eclaniteAttack(-.01).charge>.99);
  assert.equal(eclaniteAttack(0).flash,1);
  assert.deepEqual(eclaniteAttack(.5),{charge:0,flash:0});
  for(const angle of [0,1,2,4,6])assert.equal(getEnemyRenderRotation("eclanite",angle),0);
  const {width,height,radius,speed,attackCooldown,projectileSpeed}=ENEMY_TYPES.eclanite;
  assert.deepEqual({width,height,radius,speed:speed(),attackCooldown,projectileSpeed},
    {width:82,height:82,radius:35,speed:240,attackCooldown:1,projectileSpeed:560});
});

for(const fps of [30,60,120,144,240])test(`crystal dust remains consistent at ${fps} Hz with repeated 60 Hz positions`,()=>{
  const state={};advanceEclaniteWake(state,at(),1/fps);
  for(let frame=1;frame<=fps*3;frame++){
    const tick=Math.floor(frame/fps*60+1e-7);
    advanceEclaniteWake(state,Object.freeze(at(tick/60*90)),1/fps);
    assert(state.particles.length<=ECLANITE_WAKE_LIMIT);
  }
  assert(state.serial>=112 && state.serial<=114);assert(state.particles.length>0);
});

test("dust retains actual turns, stops emitting at rest and clears across a teleport",()=>{
  const state={};let enemy=at();advanceEclaniteWake(state,enemy,1/60);
  for(let i=1;i<=50;i++){enemy=at(i*1.5);advanceEclaniteWake(state,enemy,1/60);}
  const old=state.particles.at(-1),{vx,vy}=old;
  for(let i=1;i<=12;i++){enemy=at(75,i*1.5);advanceEclaniteWake(state,enemy,1/60);}
  assert.equal(old.vx,vx);assert.equal(old.vy,vy);
  const serial=state.serial;
  for(let i=0;i<140;i++)advanceEclaniteWake(state,{...enemy,vx:200,vy:0},1/60);
  assert.equal(state.serial,serial);assert.equal(state.particles.length,0);assert(state.power<.01);
  advanceEclaniteWake(state,at(1000,1000),1/60);
  assert.equal(state.particles.length,0);assert.equal(state.carry,0);
});
