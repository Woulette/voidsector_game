import * as THREE from "../../../vendor/three-r187/three.module.js";
import { GLTFLoader } from "../../../vendor/three-r187/GLTFLoader.js";
import { applyShipSurface } from "./ship3dSurface.js";

// Loading a hull must not create a second WebGL context in the sector view.
const loader = new GLTFLoader();

export async function loadShipModel3d(definition){
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
  centered.add(asset);asset.position.sub(center);centered.scale.setScalar(scale);
  const bank = new THREE.Group();bank.add(centered);
  const yaw = new THREE.Group();yaw.add(bank);
  asset.traverse(object=>{
    if(!object.isMesh) return;
    for(const material of Array.isArray(object.material) ? object.material : [object.material]){
      applyShipSurface(material,definition.surface);
      for(const channel of ["map", "normalMap", "metalnessMap", "roughnessMap"]){
        if(material[channel]) material[channel].anisotropy = 4;
      }
    }
  });
  return {yaw, bank, asset, size:{x:size.x * scale, y:size.y * scale, z:size.z * scale}};
}
