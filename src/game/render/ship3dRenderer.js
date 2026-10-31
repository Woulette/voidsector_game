import * as THREE from "../../../vendor/three-r187/three.module.js";
import { GLTFLoader } from "../../../vendor/three-r187/GLTFLoader.js";
import { RoomEnvironment } from "../../../vendor/three-r187/RoomEnvironment.js";
import { getShipFlightPose } from "./ship3dProjection.js";

export function createShip3dRenderer(){
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:"high-performance"});
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  const scene = new THREE.Scene();
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
  const loader = new GLTFLoader();
  let activeModel = null;
  let resolution = 0;
  let lost = false;
  renderer.domElement.addEventListener("webglcontextlost", event=>{ event.preventDefault(); lost = true; });
  renderer.domElement.addEventListener("webglcontextrestored", ()=>{ lost = false; });

  async function loadModel(definition){
    const gltf = await loader.loadAsync(definition.url);
    const asset = gltf.scene;
    asset.rotation.set(...definition.rotation);
    asset.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(asset);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const length = Math.max(size.x, size.z);
    if(!Number.isFinite(length) || length <= 0) throw new Error("Le modèle 3D n’a pas de dimensions valides.");
    const scale = Number(definition.displayScale || 1) / length;
    const centered = new THREE.Group();
    centered.add(asset);
    asset.position.sub(center);
    centered.scale.setScalar(scale);
    const bank = new THREE.Group();
    bank.add(centered);
    const yaw = new THREE.Group();
    yaw.add(bank);
    asset.traverse(object=>{
      if(!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for(const material of materials){
        material.envMapIntensity = 1;
        if(material.normalScale) material.normalScale.multiplyScalar(.65);
        for(const key of ["map", "normalMap", "metalnessMap", "roughnessMap"]){
          if(material[key]) material[key].anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        }
      }
    });
    return {yaw, bank, asset, size:{x:size.x * scale, y:size.y * scale, z:size.z * scale}};
  }

  function render(model, {angle = 0, flightPose = null, resolution:nextResolution = 256, inspection = null} = {}){
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
    renderer.render(scene, camera);
    return renderer.domElement;
  }

  return {loadModel, render, isContextLost:()=>lost || renderer.getContext().isContextLost()};
}
