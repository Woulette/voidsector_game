import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TRACKER_VISUAL_PROFILES,isTrackerKind} from "../../src/game/combatData/trackerVisuals.js";
import {ENEMY_TYPES} from "../../src/game/combatData/enemies.js";
import {stepTrackerRuntime,drawAnimatedTracker} from "../../src/game/render/enemyTracker.js";
import {trackerAttack} from "../../src/game/render/trackerMotion.js";
import {advanceTrackerWake} from "../../src/game/render/trackerWake.js";
import {drawEnemies} from "../../src/game/render/entities.js";
import {canEnemyRotateFully,getEnemyRenderRotation} from "../../src/data/enemyVisuals.js";
import {drawAbyssalTracker,setTrackerArtwork} from "../../src/game/render/trackerSprite.js";

test("approved common and boss sources face up once while preserving their native sizes and rules",()=>{
  const profile=TRACKER_VISUAL_PROFILES.cuirasse_nebulaire;
  assert.equal(ENEMY_TYPES.cuirasse_nebulaire.img,profile.sprite);
  assert(readFileSync(new URL('../../'+profile.sprite,import.meta.url)).length>1000);
  assert.equal(ENEMY_TYPES.cuirasse_nebulaire.width,106);assert.equal(ENEMY_TYPES.cuirasse_nebulaire.radius,46);
  assert(isTrackerKind('boss_cuirasse_nebulaire'));
  assert.equal(ENEMY_TYPES.boss_cuirasse_nebulaire.img,TRACKER_VISUAL_PROFILES.boss_cuirasse_nebulaire.sprite);
  assert.equal(ENEMY_TYPES.boss_cuirasse_nebulaire.width,126);assert.equal(ENEMY_TYPES.boss_cuirasse_nebulaire.radius,54);
  for(const kind of ['cuirasse_nebulaire','boss_cuirasse_nebulaire']){
    assert(!canEnemyRotateFully(kind));
    assert.deepEqual(ENEMY_TYPES[kind].deathEffect,{type:'slow',ratio:.5,duration:5,radius:100});
    for(const angle of [0,1,3,6])assert.equal(getEnemyRenderRotation(kind,angle),0);
  }
});

test("only a received pulse lights the native Tracker, including repeated shots",()=>{
  const state={},enemy=Object.freeze({attackT:0,x:0,y:0});
  for(const time of [0,100,2000])assert.equal(stepTrackerRuntime(state,enemy,time).shotAge,-10);
  assert.equal(trackerAttack(-10).flash,0);
  assert.equal(stepTrackerRuntime(state,Object.freeze({...enemy,attackT:.22}),3000).shotAge,0);
  assert.equal(trackerAttack(0).flash,1);
  assert(Math.abs(stepTrackerRuntime(state,{attackT:.12},3100).shotAge-.1)<1e-8);
  assert.equal(stepTrackerRuntime(state,{attackT:0},4000).shotAge,1);
  assert.equal(stepTrackerRuntime(state,{attackT:.22},4700).shotAge,0);
});

test("a hidden-tab gap expires Tracker dust instead of bridging skipped movement",()=>{
  const state={wake:{}},enemy={kind:'cuirasse_nebulaire',x:0,y:0,width:106,height:106,attackT:0};
  stepTrackerRuntime(state,enemy,0);advanceTrackerWake(state.wake,enemy,.016);
  const moved={...enemy,x:12};let frame=stepTrackerRuntime(state,moved,100);advanceTrackerWake(state.wake,moved,frame.dt);
  assert(state.wake.particles.length>0);
  const resumed={...moved,x:120};frame=stepTrackerRuntime(state,resumed,10000);advanceTrackerWake(state.wake,resumed,frame.dt);
  assert.equal(state.wake.particles.length,0);assert.equal(state.wake.power,0);
});

test("the boss slows only its visual clock, keeping real movement and received shot timing",()=>{
  const makeContext=()=>{
    const ctx={globalAlpha:1,createRadialGradient:()=>({addColorStop(){}}),
      getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
      createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})};
    for(const name of ['putImageData','drawImage','save','restore','translate','rotate','transform','beginPath','clip','closePath','moveTo','lineTo','fill','stroke','arc','fillRect','clearRect'])ctx[name]=()=>{};
    return ctx;
  };
  const previous=globalThis.document;
  globalThis.document={createElement(){return {getContext:()=>makeContext()};}};
  try{
    for(const kind of ['cuirasse_nebulaire','boss_cuirasse_nebulaire']){
      const times=[],flashes=[],profile=TRACKER_VISUAL_PROFILES[kind],state={};
      const visual={...profile,vertex:(u,v,pose)=>{times.push(pose.time);flashes.push(pose.attack.flash);return {x:u,y:v};}};
      const enemy={...ENEMY_TYPES[kind],kind,id:kind,x:0,y:0};
      setTrackerArtwork({complete:true,naturalWidth:1254},kind);
      drawAbyssalTracker(makeContext(),Object.freeze(enemy),10,-10,.1,state,visual);
      assert(times.every(t=>Math.abs(t-10*(profile.timeScale ?? 1))<1e-10));
      times.length=0;flashes.length=0;
      drawAbyssalTracker(makeContext(),Object.freeze({...enemy,x:9}),10.1,0,.1,state,visual);
      assert(times.every(t=>Math.abs(t-10.1*(profile.timeScale ?? 1))<1e-10));
      assert(flashes.every(f=>f===1));assert.equal(state.wake.vx,90);
    }
  }finally{globalThis.document=previous;}
});

test("the native renderer owns common Trackers, emits electrical strokes and never draws their old body",()=>{
  assert.equal(drawAnimatedTracker({enemy:{kind:'raider_astral'}}),false);
  const profile=TRACKER_VISUAL_PROFILES.cuirasse_nebulaire;
  assert.equal(drawAnimatedTracker({enemy:{kind:'cuirasse_nebulaire'},cache:{[profile.sprite]:{complete:false}}}),true);
  const makeContext=canvas=>{
    const ctx={canvas,draws:[],strokes:0,globalAlpha:1,createRadialGradient:()=>({addColorStop(){}}),
      getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
      createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},
      drawImage(image){this.draws.push(image);},stroke(){this.strokes++;}};
    for(const name of ['save','restore','translate','scale','rotate','transform','beginPath','arc','ellipse','clip','closePath','moveTo','lineTo','fill','fillRect','clearRect'])ctx[name]=()=>{};
    return ctx;
  };
  const previous=globalThis.document;
  globalThis.document={createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=makeContext(canvas);return canvas;}};
  try{
    for(const kind of ['cuirasse_nebulaire','boss_cuirasse_nebulaire']){
      const oldArt={complete:true,naturalWidth:400},image={complete:true,naturalWidth:1254};
      const cache={oldArt,[TRACKER_VISUAL_PROFILES[kind].sprite]:image};
      const enemy=Object.freeze({...ENEMY_TYPES[kind],kind,id:kind,x:200,y:200,img:'oldArt',attackT:.22,aggro:false,idle:true});
      const ctx=makeContext({width:800,height:600});
      drawEnemies({ctx,camera:{x:10,y:20},cache,enemies:[enemy],selectedEnemy:null});
      assert(ctx.draws.length>=3);assert(!ctx.draws.includes(oldArt));assert(ctx.strokes>=4);
      assert.equal(enemy.img,'oldArt');assert.equal(enemy.attackT,.22);
    }
  }finally{globalThis.document=previous;}
});
