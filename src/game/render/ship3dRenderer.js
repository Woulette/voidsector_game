import * as THREE from "../../../vendor/three-r187/three.module.js";
import { RoomEnvironment } from "../../../vendor/three-r187/RoomEnvironment.js";
import { getShipFlightPose } from "./ship3dProjection.js";
import { createShipThruster3dSystem } from "./shipThruster3d.js";

export function createShip3dRenderer(){
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:"high-performance"});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  const scene = new THREE.Scene();
  const thrusters = createShipThruster3dSystem(scene,{maxShips:1});
  const camera = new THREE.OrthographicCamera(-.82, .82, .82, -.82, .01, 20);
  camera.position.set(0, 5, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .85;
  room.dispose();
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffebdb, 1.8);
  key.position.set(-3, 5, -2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7fcfff, .9);
  fill.position.set(3, 2, 3);
  scene.add(fill, new THREE.HemisphereLight(0xcbdfff, 0x20151f, .7));
  let activeModel = null;
  let resolution = 0;
  let lost = false;
  renderer.domElement.addEventListener("webglcontextlost", event=>{ event.preventDefault(); lost = true; });
  renderer.domElement.addEventListener("webglcontextrestored", ()=>{ lost = false; });

  function render(model, {angle = 0, flightPose = null, resolution:nextResolution = 256, inspection = null,
    shipId,engineKey=model,enginePower=0,engineEnabled=true,worldOffset=null} = {}){
    if(activeModel !== model){
      if(activeModel) scene.remove(activeModel.yaw);
      scene.add(model.yaw);
      activeModel = model;
    }
    if(nextResolution !== resolution){
      resolution = nextResolution;
      renderer.setSize(resolution, resolution, false);
    }
    if(inspection){
      model.yaw.rotation.y = -angle;
      model.bank.rotation.set(.10, 0, 0);
      camera.position.set(Math.sin(inspection.azimuth) * Math.sin(inspection.polar) * 5, Math.cos(inspection.polar) * 5, Math.cos(inspection.azimuth) * Math.sin(inspection.polar) * 5);
      camera.up.set(0, 1, 0);
    }else{
      const pose = flightPose || getShipFlightPose({angle});
      model.yaw.rotation.y = pose.yaw;
      model.bank.rotation.set(pose.pitch, 0, pose.roll);
      camera.position.set(0, Math.cos(pose.tilt) * 5, Math.sin(pose.tilt) * 5);
      camera.up.set(0, 1, 0);
    }
    camera.lookAt(0, 0, 0);
    thrusters.begin(performance.now()/1000);
    if(shipId === "orion") thrusters.enqueue({key:engineKey,object:model.yaw,power:enginePower,angle,enabled:engineEnabled,worldOffset});
    thrusters.finish();
    renderer.render(scene, camera);
    renderer.domElement.dataset.thruster3d=JSON.stringify(thrusters.getStats());
    return renderer.domElement;
  }

  function dispose(){
    if(activeModel) scene.remove(activeModel.yaw);
    activeModel = null;scene.clear();scene.environment = null;
    thrusters.dispose();
    environment.dispose();renderer.dispose();renderer.forceContextLoss();
  }
  return {render,dispose,isContextLost:()=>lost || renderer.getContext().isContextLost()};
}
