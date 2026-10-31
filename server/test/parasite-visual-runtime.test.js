import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PARASITE_PROFILES} from "../../src/game/combatData/parasiteVisuals.js";
import {ENEMY_TYPES} from "../../src/game/combatData/enemies.js";
import {stepParasiteRuntime,drawAnimatedParasite} from "../../src/game/render/enemyParasite.js";
import {parasiteBossPose,parasiteCrownPose} from "../../src/game/render/parasiteBossMotion.js";
import {parasiteAttack} from "../../src/game/render/parasiteMotion.js";
import {advanceParasiteWake} from "../../src/game/render/parasiteWake.js";
import {drawEnemies} from "../../src/game/render/entities.js";
import {hasCompactQuestAsset,getEnemyAssetRotation,canEnemyRotateFully} from "../../src/data/enemyVisuals.js";

function context(canvas){
  const ctx={canvas,draws:[],globalAlpha:1,createRadialGradient:()=>({addColorStop(){}}),
    getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},
    drawImage(image){this.draws.push(image);}};
  for(const name of ['save','restore','translate','scale','rotate','transform','beginPath','arc','ellipse',
    'clip','closePath','moveTo','lineTo','fill','stroke','fillRect','clearRect'])ctx[name]=()=>{};
  return ctx;
}

test("approved Parasites use complete art and preserve native dimensions and orientation",()=>{
  for(const [kind,profile] of Object.entries(PARASITE_PROFILES)){
    assert.equal(ENEMY_TYPES[kind].img,profile.sprite);
    assert(readFileSync(new URL('../../'+profile.sprite,import.meta.url)).length>1000);
    assert(!hasCompactQuestAsset(kind));assert.equal(getEnemyAssetRotation(kind),0);assert(canEnemyRotateFully(kind));
  }
  assert.equal(ENEMY_TYPES.chasseur_spectral.width,86);assert.equal(ENEMY_TYPES.chasseur_spectral.radius,34);
  assert.equal(ENEMY_TYPES.boss_chasseur_spectral.width,104);assert.equal(ENEMY_TYPES.boss_chasseur_spectral.radius,42);
});

test("idle authoritative snapshots never fabricate a shot or open the crown",()=>{
  const state={},enemy=Object.freeze({kind:"boss_chasseur_spectral",x:10,y:20,attackT:0,hp:6000,shield:2000});
  for(const time of [0,100,1000,3000,7000]){
    const frame=stepParasiteRuntime(state,enemy,time),pose=parasiteBossPose(time/1000,frame.shotAge);
    assert.equal(frame.shotAge,-10);assert.equal(pose.flash,0);assert.equal(pose.charge,0);
    assert(parasiteCrownPose(pose,0).offset<.002);
  }
  assert.equal(enemy.hp,6000);assert.equal(enemy.shield,2000);
});

test("a received attack pulse opens the boss crown immediately without needing a predicted shot",()=>{
  const state={};stepParasiteRuntime(state,{attackT:0},0);
  const shot=stepParasiteRuntime(state,{attackT:.22},1000);
  assert.equal(shot.shotAge,0);
  const pose=parasiteBossPose(1,shot.shotAge);
  assert.equal(pose.flash,1);assert(parasiteCrownPose(pose,0).offset>.017);
  assert.equal(parasiteAttack(shot.shotAge).flash,1);
  assert(Math.abs(stepParasiteRuntime(state,{attackT:.12},1100).shotAge-.1)<1e-8);
  assert.equal(parasiteBossPose(1.6,stepParasiteRuntime(state,{attackT:0},1600).shotAge).flash,0);
  assert.equal(stepParasiteRuntime(state,{attackT:.22},2550).shotAge,0);
});

test("resuming a hidden tab expires old mist and does not connect skipped movement",()=>{
  const state={wake:{}},still={kind:"chasseur_spectral",x:0,y:0,width:86,height:86,attackT:0};
  stepParasiteRuntime(state,still,0);advanceParasiteWake(state.wake,still,.016);
  const moving={...still,x:12};let frame=stepParasiteRuntime(state,moving,100);advanceParasiteWake(state.wake,moving,frame.dt);
  assert(state.wake.particles.length>0);
  const resumed={...moving,x:120};frame=stepParasiteRuntime(state,resumed,10000);advanceParasiteWake(state.wake,resumed,frame.dt);
  assert.equal(state.wake.particles.length,0);assert.equal(state.wake.power,0);
});

test("other species keep their own renderer and undecoded Parasites never show the old body",()=>{
  assert.equal(drawAnimatedParasite({enemy:{kind:"raider_astral"}}),false);
  for(const [kind,profile] of Object.entries(PARASITE_PROFILES)){
    assert.equal(drawAnimatedParasite({enemy:{kind},cache:{[profile.sprite]:{complete:false}}}),true);
  }
});

test("the native renderer draws articulated Parasites on frozen snapshots without the legacy body",()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=context(canvas);return canvas;}};
  try{
    for(const [kind,profile] of Object.entries(PARASITE_PROFILES)){
      const oldArt={complete:true,naturalWidth:512},image={complete:true,naturalWidth:1254};
      const cache={oldArt,[profile.sprite]:image};
      const enemy=Object.freeze({...ENEMY_TYPES[kind],kind,id:kind,x:200,y:200,img:"oldArt",attackT:.22,aggro:false,idle:true});
      const ctx=context({width:800,height:600});
      drawEnemies({ctx,camera:{x:10,y:20},cache,enemies:[enemy],selectedEnemy:null});
      assert(ctx.draws.length>3);assert(!ctx.draws.includes(oldArt));
      assert.equal(enemy.x,200);assert.equal(enemy.attackT,.22);assert.equal(enemy.img,"oldArt");
    }
  }finally{globalThis.document=previous;}
});
