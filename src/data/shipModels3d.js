export const SHIP_MODELS_3D = Object.freeze({
  asterion:Object.freeze({
    url:new URL("../../assets/ships/models/asterion-meshy-v1/asterion.glb", import.meta.url).href,
    rotation:Object.freeze([0, 0, 0]),
    displayScale:1,
    enginePortScale:.82,
    credit:"Meshy 7.1 · modèle créé pour Avosoma"
  })
});

export function getShipModel3d(ship){
  return SHIP_MODELS_3D[String(ship?.id || "")] || null;
}
