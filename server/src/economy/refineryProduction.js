import { refineryMaterialCatalog, refineryRecipes } from "../../../src/data/catalog.js";
import {
  REFINERY_MAX_LEVEL,
  REFINERY_MODULES,
  REFINERY_PRODUCTION_BY_KIND,
  REFINERY_PRODUCTION_TICK_MS,
  REFINERY_STORAGE_BY_KIND,
  interpolateRounded,
  refineryLevelProgress
} from "./refineryRules.js";
import {
  getMaterialCount,
  getRawMaterial,
  getRefineryMaterialLevel,
  getRefineryModuleLevel,
  isRefineryProductionEnabled,
  setMaterialCount
} from "./refineryProfile.js";

function getRefineryProductionRateAt(profile, id, levelOverride = null){
  const material = getRawMaterial(id);
  const level = Number(levelOverride ?? getRefineryMaterialLevel(profile, id));
  if(!material || level <= 0 || material.nonProductible) return 0;
  if(material.kind !== "raw" && !refineryRecipes.find(item=>item.outputId === id)) return 0;
  const tuning = REFINERY_PRODUCTION_BY_KIND[material.kind] || REFINERY_PRODUCTION_BY_KIND.raw;
  return interpolateRounded(tuning.base, tuning.max, refineryLevelProgress(level, Number(material.maxLevel || REFINERY_MAX_LEVEL), 1.55));
}

function getRefineryProductionRate(profile, id){
  if(!isRefineryProductionEnabled(profile, id)) return 0;
  return getRefineryProductionRateAt(profile, id);
}

function getMaterialStorageCapAt(id, storageLevel){
  const material = getRawMaterial(id);
  if(!material) return 0;
  const tuning = REFINERY_STORAGE_BY_KIND[material.kind] || REFINERY_STORAGE_BY_KIND.raw;
  return Math.max(1, interpolateRounded(tuning.base, tuning.max, refineryLevelProgress(storageLevel, REFINERY_MODULES.storage.maxLevel, 1.35)));
}

function getMaterialStorageCap(profile, id){
  return getMaterialStorageCapAt(id, getRefineryModuleLevel(profile, "storage"));
}

export function tickServerRefineryProduction(profile, now = Date.now()){
  if(!profile || typeof profile !== "object") return false;
  const lastTick = Math.max(0, Number(profile.refineryLastTick || now));
  const elapsed = Math.max(0, now - lastTick);
  const ticks = Math.floor(elapsed / REFINERY_PRODUCTION_TICK_MS);
  if(ticks <= 0){
    if(!Number(profile.refineryLastTick || 0)) profile.refineryLastTick = now;
    return false;
  }
  if(!profile.refineryProductionRemainders
    || typeof profile.refineryProductionRemainders !== "object"
    || Array.isArray(profile.refineryProductionRemainders)){
    profile.refineryProductionRemainders = {};
  }
  // Advancing the production clock and its fractional balances is itself a
  // state change that must be persisted, even before a whole unit is ready.
  let changed = true;
  for(const material of refineryMaterialCatalog){
    const rate = getRefineryProductionRate(profile, material.id);
    if(rate <= 0) continue;
    const perTick = rate * REFINERY_PRODUCTION_TICK_MS / 3600000;
    const previousRemainder = Math.max(0, Math.min(1, Number(profile.refineryProductionRemainders[material.id] || 0)));
    const accumulated = previousRemainder + perTick * ticks;
    const produced = Math.floor(accumulated + 1e-9);
    profile.refineryProductionRemainders[material.id] = Math.max(0, accumulated - produced);
    if(produced <= 0) continue;
    const current = getMaterialCount(profile, material.id);
    const cap = getMaterialStorageCap(profile, material.id);
    const next = Math.min(cap, current + produced);
    if(next !== current){
      setMaterialCount(profile, material.id, next);
    }
  }
  profile.refineryLastTick = lastTick + ticks * REFINERY_PRODUCTION_TICK_MS;
  return changed;
}
