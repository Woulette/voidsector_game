import { store } from "./store.js";
import { GRAPHICS_EFFECT_GROUPS, GRAPHICS_PRESET_EFFECTS, normalizeGraphicsBasePreset } from "./settingsSchema.js";
import { getGameSettings, setGraphicsPreset } from "./settingsStore.js";

export const GRAPHICS_QUALITY_PRESETS = [
  {id:"low", name:"Bas", multiplier:.2, desc:"Effets essentiels uniquement"},
  {id:"medium", name:"Moyen", multiplier:.5, desc:"Équilibre qualité / fluidité"},
  {id:"high", name:"Haut", multiplier:1, desc:"Tous les effets activés"},
  {id:"custom", name:"Personnalisé", multiplier:1, desc:"Réglage manuel"}
];

export { GRAPHICS_EFFECT_GROUPS, GRAPHICS_PRESET_EFFECTS };

export function normalizeGraphicsQuality(value){
  return normalizeGraphicsBasePreset(value);
}

export function getGraphicsQuality(){
  return getGameSettings().graphics.basePreset;
}

export function getGraphicsPreset(){
  return getGameSettings().graphics.preset;
}

export function getGraphicsEffects(){
  return getGameSettings().graphics.effects;
}

export function isGraphicsEffectEnabled(id){
  return getGraphicsEffects()[id] !== false;
}

export function setGraphicsQuality(value){
  setGraphicsPreset(value);
  store.state.graphicsQuality = getGameSettings().graphics.basePreset;
  return getGameSettings().graphics.preset;
}
