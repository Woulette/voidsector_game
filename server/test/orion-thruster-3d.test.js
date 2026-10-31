import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../../vendor/three-r187/three.module.js";
import { createShipThruster3dSystem } from "../../src/game/render/shipThruster3d.js";
import { createThrusterMotion,advanceThrusterMotion,THRUSTER_WAKE_CAPACITY,THRUSTER_WAKE_STRIDE } from "../../src/game/render/shipThruster3dMotion.js";

const options={power:1,angle:0,emitter:{x:0,y:0,z:60},direction:{x:0,y:0,z:1},scale:96};
test("a long flight reuses one bounded wake buffer instead of accumulating particles", ()=>{
  const state=createThrusterMotion(),buffer=state.points;
  for(let i=0;i<20000;i++) advanceThrusterMotion(state,{...options,time:i/60,emitter:{x:i*.5,y:0,z:60}});
  assert.equal(state.points,buffer);assert.equal(state.points.length,THRUSTER_WAKE_CAPACITY*THRUSTER_WAKE_STRIDE);
  assert(state.count>15 && state.count<=THRUSTER_WAKE_CAPACITY);
  assert(state.points.every(Number.isFinite));assert(state.power>.99);
});

test("turning preserves the positions and direction of already emitted exhaust", ()=>{
  const state=createThrusterMotion();
  for(let i=0;i<25;i++) advanceThrusterMotion(state,{...options,time:i/60});
  const index=state.head*THRUSTER_WAKE_STRIDE,x=state.points[index],z=state.points[index+2];
  advanceThrusterMotion(state,{...options,time:25/60,angle:Math.PI/2,direction:{x:1,y:0,z:0}});
  assert.equal(state.points[index],x);assert(state.points[index+2]>z);
  assert.equal(state.points[index+6],0);assert(state.points[index+8]>0);
});

test("teleport, suspended frames, and disabled effects clear stale trails", ()=>{
  const state=createThrusterMotion();
  for(let i=0;i<60;i++) advanceThrusterMotion(state,{...options,time:i/60});
  assert(state.count>0);
  advanceThrusterMotion(state,{...options,time:5});assert.equal(state.count,0);
  for(let i=1;i<60;i++) advanceThrusterMotion(state,{...options,time:5+i/60});
  advanceThrusterMotion(state,{...options,time:6,emitter:{x:9999,y:0,z:0}});assert.equal(state.count,0);
  advanceThrusterMotion(state,{...options,time:6.016,enabled:false});assert.equal(state.count,0);
});

test("thrust ramps and stops consistently at different frame rates", ()=>{
  const run=fps=>{
    const state=createThrusterMotion();
    for(let i=0;i<=fps;i++) advanceThrusterMotion(state,{...options,time:i/fps});
    const full=state.power;
    for(let i=1;i<=fps;i++) advanceThrusterMotion(state,{...options,time:1+i/fps,power:0});
    return {full,stopped:state.power};
  };
  for(const fps of [30,60,144]){const result=run(fps);assert(result.full>.99);assert(result.stopped<.001);}
});

test("thirty Orion share three batches, create no engine textures, and release their private resources", ()=>{
  const scene=new THREE.Scene(),system=createShipThruster3dSystem(scene);
  const actors=Array.from({length:30},()=>{const object=new THREE.Group();object.add(new THREE.Group());object.scale.setScalar(96);return object;});
  const resourceIds=scene.children.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]);
  for(let frame=0;frame<1000;frame++){
    system.begin(frame/60);
    for(let i=0;i<actors.length;i++){
      actors[i].position.x=i*110;
      system.enqueue({key:actors[i],object:actors[i],power:1,angle:0});
    }
    system.finish();
  }
  const stats=system.getStats();
  assert.equal(stats.ships,30);assert.equal(stats.plumes,30);assert.equal(stats.textures,0);
  assert.equal(stats.maxDrawCalls,3);assert(stats.arrayBytes<400000);
  assert.deepEqual(scene.children.map(mesh=>[mesh.geometry.uuid,mesh.material.uuid]),resourceIds);
  system.begin(100);system.finish();assert.equal(system.getStats().states,0);
  system.dispose();assert.equal(scene.children.length,0);
});

test("the nozzle uses this frame's hull position and bank matrix before the renderer runs", ()=>{
  const scene=new THREE.Scene(),system=createShipThruster3dSystem(scene),object=new THREE.Group();
  object.add(new THREE.Group());object.scale.setScalar(96);object.position.set(100,0,200);
  const matrix=new THREE.Matrix4();system.begin(0);system.enqueue({key:object,object,power:1});
  scene.children[0].getMatrixAt(0,matrix);
  assert(Math.abs(matrix.elements[12]-100)<.001);assert(Math.abs(matrix.elements[14]-(200+.36*96))<.001);
  object.position.x=400;object.rotation.y=Math.PI/2;
  system.begin(.016);system.enqueue({key:object,object,power:1});scene.children[0].getMatrixAt(0,matrix);
  assert(Math.abs(matrix.elements[12]-(400+.36*96))<.001);assert(Math.abs(matrix.elements[14]-200)<.001);
  system.dispose();
});

test("the flame visibly lags both turning directions and settles straight after the turn", ()=>{
  for(const sign of [-1,1]){
    const state=createThrusterMotion();
    for(let i=0;i<=60;i++) advanceThrusterMotion(state,{...options,time:i/60,angle:sign*i/30});
    assert(sign*state.bend>.4,"a sustained turn must produce a visible tail deflection");
    for(let i=61;i<=150;i++) advanceThrusterMotion(state,{...options,time:i/60,angle:sign*2});
    assert(Math.abs(state.bend)<.001,"the flame must settle after steering stops");
  }
});

test("the curved volume keeps its root on the nozzle and its thickness in either turn", ()=>{
  for(const sign of [-1,1]){
    const scene=new THREE.Scene(),system=createShipThruster3dSystem(scene),object=new THREE.Group();
    const bank=new THREE.Group();object.add(bank);object.scale.setScalar(96);bank.rotation.z=.3;
    for(let frame=0;frame<=60;frame++){
      system.begin(frame/60);system.enqueue({key:object,object,power:1,angle:sign*frame/30});system.finish();
    }
    const plume=scene.children[1],matrix=new THREE.Matrix4();plume.getMatrixAt(0,matrix);
    const bend=plume.instanceColor.getY(0),root=new THREE.Vector3(-bend*.5,0,0).applyMatrix4(matrix);
    const attachment=new THREE.Vector3(0,-.008,.388).applyMatrix4(bank.matrixWorld);
    assert(root.distanceTo(attachment)<.001,"the expanded volume must not move the flame attachment");
    const tip=new THREE.Vector3(bend*.5,0,1).applyMatrix4(matrix);
    const straight=new THREE.Vector3(0,-.008,.388+Math.hypot(...matrix.elements.slice(8,11))/96).applyMatrix4(bank.matrixWorld);
    assert(sign*(tip.x-straight.x)>15,"the tail must bend clearly to the correct side");
    assert(Math.abs(Math.hypot(...matrix.elements.slice(4,7))-.15*96)<.001,"bending must keep the jet thickness");
    system.dispose();
  }
});
