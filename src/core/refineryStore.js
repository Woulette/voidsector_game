import { rawMaterialCatalog, refineryRecipes } from "../data/catalog.js";
import { addMaterial, getMaterialCount } from "./cargoStore.js";
import { enforcePlayerCurrencyMinimums, getRawMaterial, store } from "./store.js";
import { completeRefineryShipment } from "./refineryShipmentStore.js";
import { completeRefineryUpgradeJobs } from "./refineryUpgradeStore.js";
import { getDefaultRefineryLevel, getRefineryMaterialLevel, getRefineryModuleLevel, isRefineryProductionEnabled } from "./refineryStateStore.js";
import {
  REFINERY_MAX_LEVEL,
  REFINERY_MODULES,
  REFINERY_PRODUCTION_BY_KIND,
  REFINERY_PRODUCTION_TICK_MS,
  REFINERY_STORAGE_BY_KIND,
  interpolateRounded,
  refineryLevelProgress
} from "./refineryRules.js";
export { REFINERY_MODULES, formatDuration } from "./refineryRules.js";
export { getDefaultRefineryLevel, getRefineryMaterialLevel, getRefineryModuleLevel, isRefineryProductionEnabled, toggleRefineryProduction } from "./refineryStateStore.js";
export { completeRefineryUpgradeJobs, getRefineryModuleUpgradeData, getRefineryRushCost, getRefineryUpgradeData, getRefineryUpgradeJob, getRefineryUpgradeProgress, rushRefineryUpgrade, startRefineryMaterialUpgrade, startRefineryModuleUpgrade, upgradeRefineryMaterial, upgradeRefineryModule } from "./refineryUpgradeStore.js";
export { canShipRefineryMaterial, completeRefineryShipment, getRefineryShipmentData, getRefineryShipmentJob, getRefineryShipmentProgress, getRefineryShipmentRushCost, getRefineryTransportCapacity, getRefineryTransportCapacityAt, getShipRefineryRecipeData, getShippableRefineryMaterials, refineShipCargoRecipe, rushRefineryShipment, startRefineryShipment } from "./refineryShipmentStore.js";

export function getRefineryProductionRateAt(id, levelOverride){
  const material = getRawMaterial(id);
  const level = Number(levelOverride ?? getRefineryMaterialLevel(id));
  if(!material || level <= 0 || material.nonProductible) return 0;
  if(material.kind !== "raw" && !refineryRecipes.find(item=>item.outputId === id)) return 0;
  const tuning = REFINERY_PRODUCTION_BY_KIND[material.kind] || REFINERY_PRODUCTION_BY_KIND.raw;
  return interpolateRounded(tuning.base, tuning.max, refineryLevelProgress(level, Number(material.maxLevel || REFINERY_MAX_LEVEL), 1.55));
}

export function getRefineryProductionRate(id){
  if(!isRefineryProductionEnabled(id)) return 0;
  return getRefineryProductionRateAt(id, getRefineryMaterialLevel(id));
}

export function getMaterialStorageCapAt(id, storageLevel){
  const material = getRawMaterial(id);
  if(!material) return 0;
  const tuning = REFINERY_STORAGE_BY_KIND[material.kind] || REFINERY_STORAGE_BY_KIND.raw;
  return Math.max(1, interpolateRounded(tuning.base, tuning.max, refineryLevelProgress(storageLevel, REFINERY_MODULES.storage.maxLevel, 1.35)));
}

export function getMaterialStorageCap(id){
  return getMaterialStorageCapAt(id, getRefineryModuleLevel("storage"));
}

export function tickRefineryProduction(now=Date.now()){
  if(!store.state) return false;
  let changed = completeRefineryUpgradeJobs(now);
  if(completeRefineryShipment(now)) changed = true;
  const previous = Number(store.state.refineryLastTick || now);
  const elapsedMs = Math.max(0, now - previous);
  const ticks = Math.floor(elapsedMs / REFINERY_PRODUCTION_TICK_MS);
  if(ticks <= 0) return changed;
  store.state.refineryLastTick = previous + ticks * REFINERY_PRODUCTION_TICK_MS;
  for(const material of rawMaterialCatalog){
    const level = getRefineryMaterialLevel(material.id);
    if(level <= 0 || material.nonProductible || !isRefineryProductionEnabled(material.id)) continue;
    const rate = getRefineryProductionRate(material.id);
    if(rate <= 0) continue;
    const cap = getMaterialStorageCap(material.id);
    const current = getMaterialCount(material.id);
    if(current >= cap) continue;
    const outputAmount = Math.ceil(rate * (REFINERY_PRODUCTION_TICK_MS / 3600000)) * ticks;
    const producedAmount = Math.min(outputAmount, Math.max(0, cap - current));
    if(producedAmount <= 0) continue;
    if(material.kind === "raw"){
      addMaterial(material.id, producedAmount);
      changed = true;
      continue;
    }
    const recipe = refineryRecipes.find(item=>item.outputId === material.id);
    if(!recipe) continue;
    const multiplier = producedAmount / Math.max(1, Number(recipe.outputAmount || 1));
    const canProduce = Object.entries(recipe.costs || {}).every(([materialId, amount])=>getMaterialCount(materialId) >= amount * multiplier);
    if(!canProduce) continue;
    for(const [materialId, amount] of Object.entries(recipe.costs || {})){
      store.state.cargoHold[materialId] = Math.max(0, getMaterialCount(materialId) - amount * multiplier);
    }
    addMaterial(material.id, producedAmount);
    changed = true;
  }
  return changed;
}

