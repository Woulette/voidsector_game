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

function produceRawMaterial(profile, materialId, requestedAmount){
  const current = getMaterialCount(profile, materialId);
  const cap = getMaterialStorageCap(profile, materialId);
  const produced = Math.min(Math.max(0, Math.floor(requestedAmount)), Math.max(0, cap - current));
  if(produced <= 0) return 0;
  setMaterialCount(profile, materialId, current + produced);
  return produced;
}

function produceRecipeMaterial(profile, materialId, requestedAmount){
  const recipe = refineryRecipes.find(item=>item.outputId === materialId);
  if(!recipe) return 0;
  const outputAmount = Math.max(1, Math.floor(Number(recipe.outputAmount || 1)));
  const current = getMaterialCount(profile, materialId);
  const cap = getMaterialStorageCap(profile, materialId);
  const requestedCrafts = Math.floor(Math.max(0, requestedAmount) / outputAmount);
  const storageCrafts = Math.floor(Math.max(0, cap - current) / outputAmount);
  let affordableCrafts = Math.min(requestedCrafts, storageCrafts);
  for(const [inputId, amount] of Object.entries(recipe.costs || {})){
    const inputPerCraft = Math.max(0, Number(amount || 0));
    if(inputPerCraft <= 0) continue;
    affordableCrafts = Math.min(affordableCrafts, Math.floor(getMaterialCount(profile, inputId) / inputPerCraft));
  }
  if(affordableCrafts <= 0) return 0;
  for(const [inputId, amount] of Object.entries(recipe.costs || {})){
    const consumed = Math.max(0, Number(amount || 0)) * affordableCrafts;
    if(consumed <= 0) continue;
    setMaterialCount(profile, inputId, getMaterialCount(profile, inputId) - consumed);
  }
  const produced = affordableCrafts * outputAmount;
  setMaterialCount(profile, materialId, current + produced);
  return produced;
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
    const requestedProduction = Math.floor(accumulated + 1e-9);
    profile.refineryProductionRemainders[material.id] = Math.max(0, accumulated - requestedProduction);
    if(requestedProduction <= 0) continue;
    if(material.kind === "raw") produceRawMaterial(profile, material.id, requestedProduction);
    else produceRecipeMaterial(profile, material.id, requestedProduction);
  }
  profile.refineryLastTick = lastTick + ticks * REFINERY_PRODUCTION_TICK_MS;
  return changed;
}
