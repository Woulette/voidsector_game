import { store } from "./store.js";

export const GRAPHICS_QUALITY_PRESETS = [
  {id:"high", name:"Haute", multiplier:1, desc:"Decor complet"},
  {id:"medium", name:"Moyenne", multiplier:.5, desc:"50% etoiles, sans nuages proches"},
  {id:"low", name:"Basse", multiplier:.2, desc:"Planete et 20% etoiles"}
];

export function normalizeGraphicsQuality(value){
  return GRAPHICS_QUALITY_PRESETS.some(preset=>preset.id === value) ? value : "high";
}

export function getGraphicsQuality(){
  return normalizeGraphicsQuality(store.state?.graphicsQuality);
}

export function setGraphicsQuality(value){
  store.state.graphicsQuality = normalizeGraphicsQuality(value);
  return store.state.graphicsQuality;
}
