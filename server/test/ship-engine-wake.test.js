import test from "node:test";
import assert from "node:assert/strict";
import {advanceEngineWake,drawEngineWake,engineWakeCloudSpec} from "../../src/game/render/shipEngineWake.js";

const ports=x=>Array.from({length:3},(_,i)=>({x,y:i*12,dx:-1,dy:0,width:10}));
for(const fps of [30,60,120,144,240])test(`ship smoke: each nozzle emits at the same rate at ${fps} Hz`,()=>{
  const state={};
  for(let frame=0;frame<fps*3;frame++)advanceEngineWake(state,ports(frame/fps*120),{x:0,y:0},1/fps,.9,1.4);
  assert(Math.abs(state.serial-135)<=1);
  for(const track of state.tracks){
    assert(track.length<=72 && track.length>50);
    assert(track.some(p=>p.serial%2===0));assert(track.some(p=>p.serial%2===1));
  }
});

test("ship smoke expands with age and fades completely after emission stops",()=>{
  const point={age:.12,life:1.4,width:10,power:1,seed:.6};
  const young=engineWakeCloudSpec(point),old=engineWakeCloudSpec({...point,age:.8});
  assert(old.width>young.width*1.5);assert(old.opacity<young.opacity);
  assert.equal(engineWakeCloudSpec({...point,age:1.4}).opacity,0);
  const state={};for(let i=0;i<60;i++)advanceEngineWake(state,ports(i*2),{x:0,y:0},1/60,1,1.4);
  const oldPoint=state.tracks[0].at(-1),heading={vx:oldPoint.vx,vy:oldPoint.vy};
  advanceEngineWake(state,ports(120).map(p=>({...p,dx:0,dy:1})),{x:0,y:0},1/60,1,1.4);
  assert.equal(oldPoint.vx,heading.vx);assert.equal(oldPoint.vy,heading.vy);
  const emitted=state.serial;
  for(let i=0;i<100;i++)advanceEngineWake(state,[],{x:0,y:0},1/60,0,1.4);
  assert.equal(state.serial,emitted);assert(state.tracks.every(track=>track.length===0));
});

test("mid-life smoke retains a broad visible cloud instead of falling back to a thin faint ribbon",()=>{
  const cloud=engineWakeCloudSpec({age:.7,life:1.4,width:10,power:1,seed:.6});
  assert(cloud.width>=43);assert(cloud.opacity>.35);assert(cloud.opacity<1);
});

test("ship smoke uses contrast over scenery and bounded texture draws without mutating history",()=>{
  const previousDocument=globalThis.document;
  const gradient={addColorStop(){}};
  globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>gradient,fillRect(){}})})};
  try{
    const state={};for(let i=0;i<160;i++)advanceEngineWake(state,ports(i*2),{x:0,y:0},1/60,1,1.4);
    const snapshot=structuredClone(state.tracks),draws=[];
    const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){draws.push({blend:this.globalCompositeOperation,alpha:this.globalAlpha});}};
    drawEngineWake(ctx,state.tracks,"125,211,252");
    assert(draws.some(p=>p.blend==="source-over"));assert(draws.some(p=>p.blend==="screen"));
    assert(draws.length<=72*3);assert(draws.every(p=>p.alpha>0 && p.alpha<=1));
    assert.deepEqual(state.tracks,snapshot);
  }finally{globalThis.document=previousDocument;}
});
