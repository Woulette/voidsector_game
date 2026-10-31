import * as THREE from "../../../vendor/three-r187/three.module.js";
import { plumeVertex,plumeFragment,wakeVertex,wakeFragment } from "./shipThruster3dShaders.js";
import { createThrusterMotion,advanceThrusterMotion,THRUSTER_WAKE_CAPACITY,THRUSTER_WAKE_STRIDE,THRUSTER_WAKE_LIFETIME } from "./shipThruster3dMotion.js";

export function createShipThruster3dSystem(scene,{maxShips=128}={}){
  const states=new Map();
  const profile=[[.034,-.025],[.043,-.022],[.048,.010],[.047,.026],[.035,.026],[.030,.010],[.030,-.018]];
  const nozzleGeometry=new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,z)),24);
  nozzleGeometry.rotateX(Math.PI/2);
  const nozzleMaterial=new THREE.MeshStandardMaterial({color:0x515d6a,metalness:.78,roughness:.43});
  const plumeGeometry=new THREE.BoxGeometry(1,1,1);plumeGeometry.translate(0,0,.5);
  const plumeMaterial=new THREE.ShaderMaterial({vertexShader:plumeVertex,fragmentShader:plumeFragment,
    uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:THREE.BackSide,
    blending:THREE.AdditiveBlending,toneMapped:false});
  const wakeMaterial=new THREE.ShaderMaterial({vertexShader:wakeVertex,fragmentShader:wakeFragment,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  const wakeGeometry=new THREE.PlaneGeometry(1,1);
  function instances(geometry,material,count,colored=false){
    const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if(colored){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*3),3);mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);}
    scene.add(mesh);return mesh;
  }
  const nozzles=instances(nozzleGeometry,nozzleMaterial,maxShips);
  const plumes=instances(plumeGeometry,plumeMaterial,maxShips,true);
  const wakes=instances(wakeGeometry,wakeMaterial,maxShips*THRUSTER_WAKE_CAPACITY,true);
  const batches=[nozzles,plumes,wakes];
  const local=new THREE.Object3D(),matrix=new THREE.Matrix4(),emitter=new THREE.Vector3(),direction=new THREE.Vector3(),tail=new THREE.Vector3();
  const color=new THREE.Color(),offset=new THREE.Vector3();
  let now=0;

  function begin(time){
    now=time;nozzles.count=plumes.count=wakes.count=0;
    plumeMaterial.uniforms.time.value=time;
    for(const [key,state] of states) if(time-state.time>1.5) states.delete(key);
  }
  function enqueue({key,object,power=0,angle=0,enabled=true,worldOffset=null}){
    if(nozzles.count>=maxShips) return;
    let state=states.get(key);
    if(!state){state=createThrusterMotion();states.set(key,state);}
    object.children[0].updateWorldMatrix(true,false);
    const transform=object.children[0].matrixWorld;
    const elements=transform.elements,scale=Math.hypot(elements[0],elements[1],elements[2]);
    offset.set(worldOffset?.x || 0,worldOffset?.y || 0,worldOffset?.z || 0);
    emitter.set(0,-.008,.61).applyMatrix4(transform).add(offset);
    direction.set(0,0,1).transformDirection(transform);
    advanceThrusterMotion(state,{time:now,power,angle,emitter,direction,scale,enabled});
    local.position.set(0,-.008,.36);local.rotation.set(0,0,0);local.scale.set(1,1,1);local.updateMatrix();
    matrix.multiplyMatrices(transform,local.matrix);nozzles.setMatrixAt(nozzles.count++,matrix);
    if(state.power>.008 && enabled){
      local.position.set(0,-.008,.388);local.scale.set(.18,.15,.12+Math.sqrt(state.power)*.33);local.updateMatrix();
      matrix.multiplyMatrices(transform,local.matrix);plumes.setMatrixAt(plumes.count,matrix);
      color.setRGB(state.power,state.bend,(nozzles.count%17)/17);plumes.setColorAt(plumes.count++,color);
    }
    for(let i=0;i<state.count;i++){
      if(wakes.count>=wakes.instanceMatrix.count) break;
      const index=((state.head+i)%THRUSTER_WAKE_CAPACITY)*THRUSTER_WAKE_STRIDE;
      const age=Math.min(1,state.points[index+3]/THRUSTER_WAKE_LIFETIME);
      // Start the wisps near the end of the jet, preserving their original world direction.
      tail.set(state.points[index],state.points[index+1],state.points[index+2]).sub(offset);
      const size=scale*(.09+age*.22)*1.25;
      local.position.copy(tail);local.scale.setScalar(size);local.rotation.set(0,0,0);local.updateMatrix();
      wakes.setMatrixAt(wakes.count,local.matrix);color.setRGB(state.points[index+4],age,state.points[index+5]);wakes.setColorAt(wakes.count++,color);
    }
  }
  function finish(){
    for(const mesh of batches){
      mesh.visible=mesh.count>0;
      if(!mesh.visible) continue;
      mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,mesh.count*16);mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor){
        mesh.instanceColor.clearUpdateRanges();mesh.instanceColor.addUpdateRange(0,mesh.count*3);mesh.instanceColor.needsUpdate=true;
      }
    }
  }
  function dispose(){
    for(const mesh of batches){scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}
    states.clear();
  }
  function getStats(){
    let motionBytes=0;for(const state of states.values()) motionBytes+=state.points.byteLength+state.emitter.byteLength;
    return {ships:nozzles.count,plumes:plumes.count,wakePoints:wakes.count,states:states.size,
      arrayBytes:motionBytes+batches.reduce((sum,mesh)=>sum+mesh.instanceMatrix.array.byteLength+(mesh.instanceColor?.array.byteLength || 0),0),
      textures:0,maxDrawCalls:3};
  }
  return {begin,enqueue,finish,dispose,getStats};
}
