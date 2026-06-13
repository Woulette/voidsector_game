import { getRefineryMaterial, store } from "./store.js";
import { REFINERY_MODULES } from "./refineryRules.js";

export function getDefaultRefineryLevel(id){
  const material = getRefineryMaterial(id);
  return material?.kind === "raw" ? 1 : 0;
}

export function getRefineryMaterialLevel(id){
  const material = getRefineryMaterial(id);
  const max = Number(material?.maxLevel || 20);
  return Math.max(0, Math.min(max, Number(store.state?.refineryLevels?.[id] ?? getDefaultRefineryLevel(id))));
}

export function isRefineryProductionEnabled(id){
  return Boolean(getRefineryMaterial(id)) && !store.state?.refineryProductionDisabled?.[id];
}

export function toggleRefineryProduction(id){
  if(!getRefineryMaterial(id)) return false;
  if(!store.state.refineryProductionDisabled || typeof store.state.refineryProductionDisabled !== "object"){
    store.state.refineryProductionDisabled = {};
  }
  store.state.refineryProductionDisabled[id] = !store.state.refineryProductionDisabled[id];
  return !store.state.refineryProductionDisabled[id];
}

export function getRefineryModuleLevel(id){
  const def = REFINERY_MODULES[id];
  if(!def) return 0;
  return Math.max(1, Math.min(def.maxLevel, Number(store.state?.refineryModules?.[id] || 1)));
}
