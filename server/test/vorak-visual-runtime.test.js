import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {VORAK_VISUAL_PROFILES,VORAK_THRUSTER_TEXTURE} from "../../src/game/combatData/vorakVisuals.js";
import {ENEMY_TYPES} from "../../src/game/combatData/enemies.js";
import {stepVorakRuntime,drawAnimatedVorak} from "../../src/game/render/enemyVorak.js";
import {vorakPose} from "../../src/game/render/vorakMotion.js";
import {advanceVorakWake} from "../../src/game/render/vorakWake.js";
import {drawEnemies} from "../../src/game/render/entities.js";
import {hasCompactQuestAsset,getEnemyAssetRotation,canEnemyRotateFully} from "../../src/data/enemyVisuals.js";

test("both Voraks use approved art, complete quest icons and their existing combat dimensions",()=>{
  for(const [kind,profile] of Object.entries(VORAK_VISUAL_PROFILES)){
    assert.equal(ENEMY_TYPES[kind].img,profile.sprite);
    assert(readFileSync(new URL('../../'+profile.sprite,import.meta.url)).length>1000);
    assert(!hasCompactQuestAsset(kind));assert.equal(getEnemyAssetRotation(kind),0);
  }
  assert.equal(ENEMY_TYPES.raider_astral.width,120);assert.equal(ENEMY_TYPES.raider_astral.radius,36);
  assert.equal(ENEMY_TYPES.boss_raider_astral.width,104);assert.equal(ENEMY_TYPES.boss_raider_astral.radius,42);
  assert(canEnemyRotateFully("raider_astral"));assert(!canEnemyRotateFully("boss_raider_astral"));
});

test("cosmetic timing reads frozen snapshots and never creates an attack on its own",()=>{
  const state={},enemy=Object.freeze({kind:"raider_astral",x:10,y:20,attackT:0,hp:800,shield:400});
  for(const time of [0,100,1000,3000,7000]){
    const frame=stepVorakRuntime(state,enemy,time);
    assert.equal(frame.shotAge,-10);assert.equal(vorakPose(time/1000,frame.shotAge).flash,0);
  }
  assert.equal(enemy.hp,800);assert.equal(enemy.shield,400);
});

test("an authoritative shot lights the weapon once and retriggers only for the next shot",()=>{
  const state={};stepVorakRuntime(state,{attackT:0},0);
  assert.equal(stepVorakRuntime(state,{attackT:.22},1000).shotAge,0);
  assert(Math.abs(stepVorakRuntime(state,{attackT:.12},1100).shotAge-.1)<1e-8);
  const after=stepVorakRuntime(state,{attackT:0},1200);
  assert(vorakPose(1.2,after.shotAge).flash>0);
  assert.equal(vorakPose(1.6,stepVorakRuntime(state,{attackT:0},1600).shotAge).flash,0);
  assert.equal(stepVorakRuntime(state,{attackT:.22},2350).shotAge,0);
});

test("returning to a hidden tab expires vapor without a line across skipped movement",()=>{
  const state={wake:{}};const still={kind:"raider_astral",x:0,y:0,angle:0,width:120,height:120,attackT:0};
  stepVorakRuntime(state,still,0);advanceVorakWake(state.wake,still,.016);
  const moving={...still,x:12};let frame=stepVorakRuntime(state,moving,100);advanceVorakWake(state.wake,moving,frame.dt);
  assert(state.wake.particles.length>0);
  const resumed={...moving,x:120};frame=stepVorakRuntime(state,resumed,10000);advanceVorakWake(state.wake,resumed,frame.dt);
  assert.equal(state.wake.particles.length,0);assert.equal(state.wake.power,0);
});

test("other species stay on their own render path",()=>{
  assert.equal(drawAnimatedVorak({enemy:{kind:"chasseur_spectral"},cache:null}),false);
});

test("decoding art does not briefly replay the legacy Vorak body",()=>{
  for(const kind of Object.keys(VORAK_VISUAL_PROFILES)){
    const cache={[VORAK_VISUAL_PROFILES[kind].sprite]:{complete:false},[VORAK_THRUSTER_TEXTURE]:{complete:false}};
    assert.equal(drawAnimatedVorak({enemy:{kind},cache}),true);
  }
});

test("the native render path draws the new rig and lights without mutating frozen server entities",()=>{
  const previous=globalThis.document;
  function context(canvas){
    const ctx={canvas,draws:[],globalAlpha:1,strokes:0,createRadialGradient:()=>({addColorStop(){}}),
      getImageData:()=>({data:new Uint8ClampedArray(256*256*4)}),putImageData(){},drawImage(image){this.draws.push(image);},stroke(){this.strokes++;}};
    for(const name of ['save','restore','translate','scale','rotate','beginPath','arc','ellipse','clip','closePath','moveTo','lineTo','fill','fillRect'])ctx[name]=()=>{};
    return ctx;
  }
  globalThis.document={createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=context(canvas);return canvas;}};
  try{
    for(const kind of Object.keys(VORAK_VISUAL_PROFILES)){
      const oldArt={complete:true,naturalWidth:512},art={complete:true,naturalWidth:1254};
      const cache={oldArt,[VORAK_VISUAL_PROFILES[kind].sprite]:art,
        [VORAK_THRUSTER_TEXTURE]:{complete:true,naturalWidth:256,naturalHeight:256}};
      const enemy=Object.freeze({...ENEMY_TYPES[kind],kind,id:kind,x:200,y:200,img:'oldArt',attackT:.22,aggro:false,idle:true});
      const ctx=context({width:800,height:600});
      drawEnemies({ctx,camera:{x:10,y:20},cache,enemies:[enemy],selectedEnemy:null});
      assert(ctx.draws.length>=4);assert(ctx.strokes>=14,'the approved hull/wing lamps must be present');
      assert(!ctx.draws.includes(oldArt),'legacy body must not be stacked on the approved rig');
      assert.equal(enemy.x,200);assert.equal(enemy.attackT,.22);
    }
  }finally{globalThis.document=previous;}
});
