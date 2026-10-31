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

function turningFlight({fps=60,rate=1.5,check=()=>{},stop=false}={}){
  const scene=new THREE.Scene(),system=createShipThruster3dSystem(scene),object=new THREE.Group(),bank=new THREE.Group();
  object.add(bank);object.scale.setScalar(96);
  let x=40000,z=-23000,angle=0;
  const total=(stop ? 3 : 2)*fps;
  for(let frame=0;frame<=total;frame++){
    const time=frame/fps,turn=time>.5 && time<1.8 ? rate : 0;
    angle+=turn/fps;x+=Math.sin(angle)*318/fps;z-=Math.cos(angle)*318/fps;
    // Moving the camera origin must not change the shared flame/smoke path.
    const offset={x:40000+frame*.7,y:0,z:-23000+frame*.2};
    object.position.set(x-offset.x,0,z-offset.z);object.rotation.y=-angle;bank.rotation.z=-turn*.1;
    system.begin(time);system.enqueue({key:object,object,power:1,angle,worldOffset:offset});system.finish();
    if(time>1 && time<1.7 || frame===total) check({scene,object,bank,time});
  }
  system.dispose();
}

test("the flame connects to the existing smoke through left/right turns at different frame rates", ()=>{
  for(const fps of [30,60,144]) for(const rate of [-3,-.8,.8,3]){
    let bent=false;
    turningFlight({fps,rate,check:({scene,bank,time})=>{
      if(time>=1.7) return;
      const plume=scene.children[1],wake=scene.children[2],matrix=new THREE.Matrix4(),wakeMatrix=new THREE.Matrix4();
      plume.getMatrixAt(0,matrix);const bend=plume.instanceColor.getY(0);
      const root=new THREE.Vector3(-bend*.5,0,0).applyMatrix4(matrix);
      assert(root.distanceTo(new THREE.Vector3(0,-.008,.388).applyMatrix4(bank.matrixWorld))<.001,"root stays on the nozzle");
      const tip=new THREE.Vector3(bend*.5,0,1).applyMatrix4(matrix);
      const blend=new THREE.Vector3(bend*(.65*.65-.5),0,.65).applyMatrix4(matrix);
      let distance=Infinity,blendDistance=Infinity,previous=null;
      for(let i=0;i<wake.count;i++){
        // Only the young, connected part of the smoke may guide the flame.
        if(wake.instanceColor.getY(i)>.25/.85) continue;
        wake.getMatrixAt(i,wakeMatrix);const point=new THREE.Vector3().setFromMatrixPosition(wakeMatrix);
        if(previous){
          const closest=new THREE.Line3(previous,point).closestPointToPoint(tip,true,new THREE.Vector3());
          distance=Math.min(distance,tip.distanceTo(closest));
          const overlap=new THREE.Line3(previous,point).closestPointToPoint(blend,true,new THREE.Vector3());
          blendDistance=Math.min(blendDistance,blend.distanceTo(overlap));
        }
        previous=point;
      }
      // The source connects the newest wisp to the current emitter between
      // 30 Hz emissions, including when rendering at that exact interval.
      if(previous){
        const source=new THREE.Vector3(0,-.008,.61).applyMatrix4(bank.matrixWorld);
        const segment=new THREE.Line3(previous,source);
        distance=Math.min(distance,tip.distanceTo(segment.closestPointToPoint(tip,true,new THREE.Vector3())));
        blendDistance=Math.min(blendDistance,blend.distanceTo(segment.closestPointToPoint(blend,true,new THREE.Vector3())));
      }
      assert(distance<96*.04,`flame must join the smoke core (${fps} FPS, turn ${rate}, gap ${distance})`);
      assert(blendDistance<96*.035,"the luminous flame and the start of the smoke must overlap");
      const localTip=tip.clone().applyMatrix4(bank.matrixWorld.clone().invert());
      assert(rate*localTip.x>0,"the flame follows the same side as the smoke");
      const length=Math.hypot(...matrix.elements.slice(8,11));
      assert(Math.hypot(localTip.x,localTip.y+.008)<=length/96*.301,"sharp turns cannot produce an exaggerated hook");
      assert(Math.abs(Math.hypot(...matrix.elements.slice(4,7))-.15*96)<.001,"jet thickness stays constant");
      if(bend>.01) bent=true;
    }});
    assert(bent,"the shared trajectory must retain a visible, restrained bend");
  }
});

test("the flame settles with the smoke after steering stops instead of retaining its own bend", ()=>{
  for(const rate of [-3,3]) turningFlight({rate,stop:true,check:({scene,time})=>{
    if(time===3) assert(Math.abs(scene.children[1].instanceColor.getY(0))<.001);
  }});
});
