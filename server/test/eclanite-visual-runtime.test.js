import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ECLANITE_SOURCE,ECLANITE_SCALE,isEclaniteKind} from "../../src/game/combatData/eclaniteVisuals.js";
import {ENEMY_TYPES} from "../../src/game/combatData/enemies.js";
import {stepEclaniteRuntime,drawAnimatedEclanite} from "../../src/game/render/enemyEclanite.js";
import {advanceEclaniteWake} from "../../src/game/render/eclaniteWake.js";
import {eclaniteAttack} from "../../src/game/render/eclaniteMotion.js";
import {drawEnemies} from "../../src/game/render/entities.js";
import {preloadCombatAssets} from "../../src/game/combatAssets.js";
import {canEnemyRotateFully,getEnemyRenderRotation} from "../../src/data/enemyVisuals.js";

test("the approved common mineral keeps its native size, fixed orientation and combat rules",()=>{
  const enemy=ENEMY_TYPES.eclanite;
  assert.equal(enemy.img,ECLANITE_SOURCE);assert.equal(ECLANITE_SCALE,1.02);
  assert(readFileSync(new URL('../../'+ECLANITE_SOURCE,import.meta.url)).length>1000);
  assert(isEclaniteKind('eclanite'));assert(!isEclaniteKind('cristanite'));
  assert.deepEqual([enemy.width,enemy.height,enemy.radius,enemy.speed(),enemy.attackCooldown,enemy.projectileSpeed],[82,82,35,240,1,560]);
  assert(!canEnemyRotateFully('eclanite'));
  for(const angle of [0,1,3,6])assert.equal(getEnemyRenderRotation('eclanite',angle),0);
});

test("native crystal flashes follow received shots only, including repeated pulses",()=>{
  const state={},enemy=Object.freeze({x:0,y:0,attackT:0});
  for(const time of [0,100,2000])assert.equal(stepEclaniteRuntime(state,enemy,time).shotAge,-10);
  assert.deepEqual(eclaniteAttack(-10),{charge:0,flash:0});
  assert.equal(stepEclaniteRuntime(state,Object.freeze({...enemy,attackT:.22}),3000).shotAge,0);
  assert.equal(eclaniteAttack(0).flash,1);
  assert(Math.abs(stepEclaniteRuntime(state,{...enemy,attackT:.12},3100).shotAge-.1)<1e-8);
  assert.equal(stepEclaniteRuntime(state,enemy,4000).shotAge,1);
  assert.equal(stepEclaniteRuntime(state,{...enemy,attackT:.22},4700).shotAge,0);
});

test("resuming a hidden tab expires old dust without a line bridging skipped movement",()=>{
  const state={wake:{}},enemy={x:0,y:0,width:82,height:82,attackT:0};
  stepEclaniteRuntime(state,enemy,0);advanceEclaniteWake(state.wake,enemy,.016);
  let moved={...enemy,x:12},frame=stepEclaniteRuntime(state,moved,100);
  advanceEclaniteWake(state.wake,moved,frame.dt);assert(state.wake.particles.length>0);
  moved={...enemy,x:120};frame=stepEclaniteRuntime(state,moved,10000);
  advanceEclaniteWake(state.wake,moved,frame.dt);
  assert.equal(state.wake.particles.length,0);assert.equal(state.wake.power,0);
});

test("the native renderer owns the mineral pieces, excluding the old whole sprite and idle effects",()=>{
  assert.equal(drawAnimatedEclanite({enemy:{kind:'cristanite'}}),false);
  assert.equal(drawAnimatedEclanite({enemy:{kind:'eclanite'},cache:{[ECLANITE_SOURCE]:{complete:false}}}),true);
  const pixels=new Uint8ClampedArray(512*512*4);
  for(const [cx,cy] of [[256,280],[256,100],[380,200],[390,380],[256,430],[120,380],[120,200]]){
    for(let y=cy-10;y<cy+10;y++)for(let x=cx-8;x<cx+8;x++)pixels.set([180,60,240,255],(y*512+x)*4);
  }
  const makeContext=canvas=>{
    const stack=[],ctx={canvas,draws:[],angle:0,globalAlpha:1,
      getImageData:()=>({data:pixels}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
      createRadialGradient:()=>({addColorStop(){}}),putImageData(){},
      drawImage(image){this.draws.push({image,angle:this.angle});},
      rotate(angle){this.angle+=angle;},
      save(){stack.push([this.angle,this.globalAlpha]);},
      restore(){[this.angle,this.globalAlpha]=stack.pop();}};
    for(const name of ['translate','scale','beginPath','arc','moveTo','lineTo','closePath','fill','fillRect'])ctx[name]=()=>{};
    return ctx;
  };
  const previous=globalThis.document;
  globalThis.document={createElement(){const canvas={};canvas.getContext=()=>canvas.ctx??=makeContext(canvas);return canvas;}};
  try{
    const image={complete:true,naturalWidth:1024},oldArt={complete:true,naturalWidth:400};
    const enemy=Object.freeze({...ENEMY_TYPES.eclanite,kind:'eclanite',id:'mineral',x:200,y:200,img:'oldArt',angle:2,attackT:.22,aggro:false,idle:true});
    const ctx=makeContext({width:800,height:600});
    drawEnemies({ctx,camera:{x:10,y:20},cache:{oldArt,[ECLANITE_SOURCE]:image},enemies:[enemy],selectedEnemy:null});
    assert(ctx.draws.length>=14);assert(!ctx.draws.some(draw=>draw.image===oldArt || draw.image===image));
    assert(ctx.draws.every(draw=>Math.abs(draw.angle)<.15));
    assert.equal(ctx.draws.at(-1).angle,0,'the core itself stays upright');
    assert.equal(enemy.img,'oldArt');assert.equal(enemy.attackT,.22);
  }finally{globalThis.document=previous;}
});

test("the combat preload includes the approved crystal source exactly once",()=>{
  const previous=globalThis.Image,paths=[];
  globalThis.Image=class {set src(value){paths.push(value);}};
  try{
    preloadCombatAssets({cache:{}});
    assert.equal(paths.filter(path=>path===ECLANITE_SOURCE).length,1);
  }finally{globalThis.Image=previous;}
});
