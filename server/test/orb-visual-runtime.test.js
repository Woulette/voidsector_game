import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ORB_VISUAL_PROFILES} from "../../src/game/combatData/orbVisuals.js";
import {ENEMY_TYPES} from "../../src/game/combatData/enemies.js";
import {stepOrbRuntime,drawAnimatedOrb} from "../../src/game/render/enemyOrb.js";
import {orbPose} from "../../src/game/render/orbMotion.js";
import {advanceOrbWake} from "../../src/game/render/orbWake.js";
import {drawEnemies} from "../../src/game/render/entities.js";
import {hasCompactQuestAsset} from "../../src/data/enemyVisuals.js";

test("the published common and boss use the approved art and retain their existing combat size", ()=>{
  for(const [kind,profile] of Object.entries(ORB_VISUAL_PROFILES)){
    assert.equal(ENEMY_TYPES[kind].img,profile.sprite);
    assert(readFileSync(new URL('../../'+profile.sprite,import.meta.url)).length>1000);
  }
  assert.equal(ENEMY_TYPES.drone_pirate.width,92);assert.equal(ENEMY_TYPES.drone_pirate.radius,26);
  assert.equal(ENEMY_TYPES.boss_drone_pirate.width,120);assert.equal(ENEMY_TYPES.boss_drone_pirate.radius,32);
  assert(hasCompactQuestAsset("drone_pirate"));assert(!hasCompactQuestAsset("boss_drone_pirate"));
});

test("render timing reads immutable server entities and never invents periodic attacks", ()=>{
  const state={},enemy=Object.freeze({kind:"drone_pirate",x:10,y:20,attackT:0,hp:400,shield:200});
  for(const time of [0,100,1000,3000,7000]){
    const pose=stepOrbRuntime(state,enemy,time);
    assert.equal(pose.shotAge,-10);assert.equal(orbPose(time/1000,pose.shotAge,6).flash,0);
  }
  assert.equal(enemy.hp,400);assert.equal(enemy.shield,200);
});

test("an actual attack pulse lights the core once, fades after the pulse, and retriggers for the next attack", ()=>{
  const state={};stepOrbRuntime(state,{attackT:0},0);
  assert.equal(stepOrbRuntime(state,{attackT:.22},1000).shotAge,0);
  assert(Math.abs(stepOrbRuntime(state,{attackT:.12},1100).shotAge-.1)<1e-8);
  const after=stepOrbRuntime(state,{attackT:0},1200);
  assert(orbPose(1.2,after.shotAge,6).flash>0);
  assert.equal(orbPose(1.6,stepOrbRuntime(state,{attackT:0},1600).shotAge,6).flash,0);
  assert.equal(stepOrbRuntime(state,{attackT:.22},2250).shotAge,0);
});

test("returning from a hidden tab expires old vapor without drawing an exhaust line across skipped movement", ()=>{
  const state={wake:{}};
  stepOrbRuntime(state,{x:0,y:0,attackT:0},0);
  advanceOrbWake(state.wake,{x:0,y:0,width:92,height:92},.016);
  const moving={x:12,y:0,width:92,height:92,attackT:0};
  let frame=stepOrbRuntime(state,moving,100);advanceOrbWake(state.wake,moving,frame.dt);
  assert(state.wake.particles.length>0);
  const resumed={...moving,x:120};frame=stepOrbRuntime(state,resumed,10000);
  advanceOrbWake(state.wake,resumed,frame.dt);assert.equal(state.wake.particles.length,0);
});

test("non-orb enemies keep their original renderer without loading orb images", ()=>{
  assert.equal(drawAnimatedOrb({enemy:{kind:"raider_astral"},cache:null}),false);
});

test("the real enemy render path replaces old Orb art without mutating frozen server snapshots", ()=>{
  const oldDocument=globalThis.document;
  function context(canvas){
    const draws=[];
    const ctx={canvas,draws,globalAlpha:1,createRadialGradient:()=>({addColorStop(){}}),drawImage(image){draws.push(image);}};
    for(const name of ['save','restore','translate','scale','rotate','beginPath','arc','clip','closePath','moveTo','fill','stroke','fillRect'])ctx[name]=()=>{};
    return ctx;
  }
  globalThis.document={createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=(context(canvas));return canvas;}};
  try{
    for(const kind of Object.keys(ORB_VISUAL_PROFILES)){
      const oldArt={complete:true,naturalWidth:512},art={complete:true,naturalWidth:1254};
      const cache={oldArt,[ORB_VISUAL_PROFILES[kind].sprite]:art};
      const enemy=Object.freeze({...ENEMY_TYPES[kind],kind,id:kind,x:200,y:200,img:'oldArt',attackT:.22,aggro:false,idle:true});
      const ctx=context({width:800,height:600});
      drawEnemies({ctx,camera:{x:10,y:20},cache,enemies:[enemy],selectedEnemy:null});
      assert(ctx.draws.length>=ORB_VISUAL_PROFILES[kind].branches+1);
      assert(!ctx.draws.includes(oldArt),'old sprite must not be drawn over the new rig');
      assert.equal(enemy.x,200);assert.equal(enemy.y,200);assert.equal(enemy.attackT,.22);
    }
  }finally{globalThis.document=oldDocument;}
});
