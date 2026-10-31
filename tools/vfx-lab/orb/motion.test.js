import test from "node:test";
import assert from "node:assert/strict";
import {orbRotation,orbPose,ORB_CYCLE,ORB_BURST_START,ORB_BURST_DURATION} from "./motion.js";
import {advanceOrbWake,ORB_WAKE_LIMIT} from "./wake.js";
import {ORB_VISUAL_PROFILES,isOrbKind} from "./profiles.js";

test("the branches turn slowly then accelerate strongly without angle resets between cycles", ()=>{
  const slow=orbRotation(1),fast=orbRotation(ORB_BURST_START+ORB_BURST_DURATION/2);
  assert(fast.speed>slow.speed*15);assert.equal(slow.burst,false);assert.equal(fast.burst,true);
  for(const boundary of [ORB_BURST_START,ORB_BURST_START+ORB_BURST_DURATION,ORB_CYCLE,ORB_CYCLE*2]){
    const a=orbRotation(boundary-1e-5),b=orbRotation(boundary+1e-5);
    assert(Math.abs(b.angle-a.angle)<.001);assert(b.angle>=a.angle);
  }
});

test("eight separate branches retain their spacing and idle never fabricates an attack flash", ()=>{
  const pose=orbPose(3,-10);assert.equal(pose.branches.length,8);assert.equal(pose.flash,0);assert.equal(pose.charge,0);
  for(const branch of pose.branches) assert(Math.abs(branch.rotation-pose.angle)<.04);
  assert(orbPose(1,-.05).charge>.8);assert.equal(orbPose(1,0).flash,1);assert.equal(orbPose(1,1).flash,0);
});

test("the common orb has six smaller legs while the approved eight-branch illustration belongs to the boss", ()=>{
  const common=ORB_VISUAL_PROFILES.drone_pirate,boss=ORB_VISUAL_PROFILES.boss_drone_pirate;
  assert(isOrbKind("drone_pirate"));assert(isOrbKind("boss_drone_pirate"));assert(!isOrbKind("raider_astral"));
  assert.equal(boss.sprite,"assets/enemies/orb-rig-v1/orb-source.png");assert.notEqual(common.sprite,boss.sprite);
  assert.equal(orbPose(3,-10,common.branches).branches.length,6);
  assert.equal(orbPose(3,-10,boss.branches).branches.length,8);
  assert(common.size*92<boss.size*120);assert(common.light<boss.light);
});

test("world-space dust stays behind when the orb turns and entirely evaporates after stopping", ()=>{
  const state={};let enemy={x:0,y:0,width:92,height:92};
  advanceOrbWake(state,enemy,1/60);
  for(let i=0;i<60;i++){enemy={...enemy,x:enemy.x+1};advanceOrbWake(state,enemy,1/60);}
  assert(state.particles.length>0);const old=state.particles[0],vx=old.vx,vy=old.vy;
  for(let i=0;i<8;i++){enemy={...enemy,y:enemy.y+1};advanceOrbWake(state,enemy,1/60);}
  assert.equal(old.vx,vx);assert.equal(old.vy,vy);
  for(let i=0;i<130;i++)advanceOrbWake(state,enemy,1/60);
  assert.equal(state.particles.length,0);
});

test("emission remains bounded at low frame rates and a teleport leaves no dust line across the map", ()=>{
  const state={};let enemy={x:0,y:0,width:92,height:92};
  for(let i=0;i<1000;i++){enemy={...enemy,x:enemy.x+9};advanceOrbWake(state,enemy,1/30);assert(state.particles.length<=ORB_WAKE_LIMIT);}
  advanceOrbWake(state,{...enemy,x:enemy.x+1000},1/60);assert.equal(state.particles.length,0);
});

test("comparable movement at 30 and 144 fps emits the same number of clouds", ()=>{
  const run=fps=>{const state={};advanceOrbWake(state,{x:0,y:0,width:92,height:92},1/fps);
    for(let i=1;i<=fps;i++)advanceOrbWake(state,{x:i*60/fps,y:0,width:92,height:92},1/fps);
    return state.particles.length;};
  assert(Math.abs(run(30)-run(144))<=2);
});
