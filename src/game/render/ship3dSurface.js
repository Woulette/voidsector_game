// Keep painted colours while preventing tiny PBR variations from sparkling in flight.
export function applyShipSurface(material, surface){
  material.envMapIntensity = surface?.environment ?? 1;
  if(material.normalScale) material.normalScale.multiplyScalar(surface?.normalStrength ?? .65);
  if(!surface) return;
  if(surface.normalStrength === 0) material.normalMap = null;
  if(Number.isFinite(surface.roughness)){
    material.roughnessMap = null;
    material.roughness = surface.roughness;
  }
  if(Number.isFinite(surface.metalness)){
    material.metalnessMap = null;
    material.metalness = surface.metalness;
  }
}
