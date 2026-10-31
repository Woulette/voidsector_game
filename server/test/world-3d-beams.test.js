import assert from "node:assert/strict";
import test from "node:test";
import { sampleWorld3dBeam } from "../../src/game/render/world3dBeams.js";

test("3D lasers keep the combat pulse timing and segment length without changing hit data", ()=>{
  const beam={fromX:20,fromY:30,toX:420,toY:30,age:.1,duration:.2,beamLength:160,widthScale:1.5,targetId:"enemy-7"};
  const before={...beam},sample=sampleWorld3dBeam(beam);
  assert.equal(sample.head,.875);assert.equal(sample.tail,.475);
  assert.equal((sample.head-sample.tail)*400,160);
  assert.equal(sample.width,1.5);assert.equal(sample.fade,1);
  assert.deepEqual(beam,before);
});

test("future and expired pulses stay hidden, while M-6 keeps its accepted black and white renderer", ()=>{
  const beam={fromX:0,fromY:0,toX:0,toY:0,age:.05,duration:.2};
  assert.equal(sampleWorld3dBeam({...beam,age:-.01}),null);
  assert.equal(sampleWorld3dBeam({...beam,age:.2}),null);
  assert.equal(sampleWorld3dBeam({...beam,monochrome:true}),null);
  assert(Number.isFinite(sampleWorld3dBeam(beam).head));
  assert(sampleWorld3dBeam({...beam,age:.19}).fade<1);
});
