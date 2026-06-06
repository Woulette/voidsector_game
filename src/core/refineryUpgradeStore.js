import { refineryRecipes } from "../data/catalog.js";
import { consumeMaterial, getMaterialCount } from "./cargoStore.js";
import { getRefineryMaterialLevel, getRefineryModuleLevel } from "./refineryStateStore.js";
import { enforcePlayerCurrencyMinimums, getRawMaterial, store } from "./store.js";
import {
  REFINERY_MAX_LEVEL,
  REFINERY_MODULES,
  REFINERY_RAW_UPGRADE_COSTS,
  REFINERY_RUSH_NOVA_PER_MINUTE,
  getRawUpgradeMaterialAmount,
  getRecipeUpgradeUnitCost,
  getRefineryModuleUpgradeMaterials,
  getRefineryUpgradeDuration,
  getRefineryUpgradeTuning,
  interpolateRounded,
  refineryUpgradeProgressFactor
} from "./refineryRules.js";

export function getRefineryModuleUpgradeData(id){
  const def = REFINERY_MODULES[id];
  if(!def) return null;
  const level = getRefineryModuleLevel(id);
  if(level >= def.maxLevel) return null;
  const nextLevel = level + 1;
  const credits = Math.round(def.baseCost * Math.pow(nextLevel, 1.42));
  const materials = getRefineryModuleUpgradeMaterials(id, nextLevel);
  const activeJob = getRefineryUpgradeJob("module", id);
  const canAffordMaterials = Object.entries(materials).every(([materialId, amount])=>getMaterialCount(materialId) >= amount);
  return {
    id,
    name:def.name,
    level,
    nextLevel,
    maxLevel:def.maxLevel,
    credits,
    materials,
    duration:getRefineryUpgradeDuration("module", {nextLevel}),
    canAfford:!activeJob && store.state.player.credits >= credits && canAffordMaterials
  };
}

export function upgradeRefineryModule(id){
  const data = getRefineryModuleUpgradeData(id);
  if(!data) return {ok:false, reason:"Module introuvable ou niveau maximum."};
  if(store.state.player.credits < data.credits) return {ok:false, reason:"Credits insuffisants."};
  for(const [materialId, amount] of Object.entries(data.materials || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Stock insuffisant : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  store.state.player.credits -= data.credits;
  enforcePlayerCurrencyMinimums();
  for(const [materialId, amount] of Object.entries(data.materials || {})) consumeMaterial(materialId, amount);
  if(!store.state.refineryModules) store.state.refineryModules = {};
  store.state.refineryModules[id] = data.nextLevel;
  return {ok:true, module:data.name, level:data.nextLevel};
}

function refineryUpgradeKey(type, id){
  return `${type}:${id}`;
}

export function getRefineryUpgradeJob(type, id){
  const key = refineryUpgradeKey(type, id);
  const job = store.state?.refineryUpgradeJobs?.[key];
  return job && job.type === type && job.id === id ? job : null;
}

export function getRefineryUpgradeProgress(type, id, now = Date.now()){
  const job = getRefineryUpgradeJob(type, id);
  if(!job) return null;
  const duration = Math.max(1, Number(job.duration || (job.endsAt - job.startedAt) || 1));
  const elapsed = Math.max(0, Math.min(duration, now - Number(job.startedAt || now)));
  const remaining = Math.max(0, Number(job.endsAt || now) - now);
  return {...job, elapsed, remaining, percent:Math.max(0, Math.min(100, elapsed / duration * 100))};
}

export function getRefineryRushCost(type, id, now = Date.now()){
  const job = getRefineryUpgradeProgress(type, id, now);
  if(!job) return null;
  const minutes = Math.max(1, Math.ceil(Number(job.remaining || 0) / 60000));
  const cost = minutes * REFINERY_RUSH_NOVA_PER_MINUTE;
  return {
    cost,
    minutes,
    remaining:job.remaining,
    canAfford:store.state.player.premium >= cost
  };
}

export function rushRefineryUpgrade(type, id, now = Date.now()){
  const job = getRefineryUpgradeJob(type, id);
  if(!job) return {ok:false, reason:"Aucune amelioration en cours."};
  const rush = getRefineryRushCost(type, id, now);
  if(!rush) return {ok:false, reason:"Aucune amelioration en cours."};
  if(store.state.player.premium < rush.cost) return {ok:false, reason:"Pas assez de NOVA."};
  store.state.player.premium -= rush.cost;
  enforcePlayerCurrencyMinimums();
  job.endsAt = now;
  completeRefineryUpgradeJobs(now);
  return {ok:true, cost:rush.cost, name:job.name, level:job.toLevel};
}

function hasActiveRefineryUpgrade(type, id){
  return Boolean(getRefineryUpgradeJob(type, id));
}

export function startRefineryMaterialUpgrade(id, now = Date.now()){
  if(hasActiveRefineryUpgrade("material", id)) return {ok:false, reason:"Amelioration deja en cours."};
  const data = getRefineryUpgradeData(id);
  const material = getRawMaterial(id);
  if(!data || !material) return {ok:false, reason:"Module introuvable ou niveau maximum."};
  if(store.state.player.credits < data.credits) return {ok:false, reason:"Credits insuffisants."};
  for(const [materialId, amount] of Object.entries(data.materials || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Stock insuffisant : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  store.state.player.credits -= data.credits;
  enforcePlayerCurrencyMinimums();
  for(const [materialId, amount] of Object.entries(data.materials || {})) consumeMaterial(materialId, amount);
  if(!store.state.refineryUpgradeJobs) store.state.refineryUpgradeJobs = {};
  const duration = getRefineryUpgradeDuration("material", data);
  store.state.refineryUpgradeJobs[refineryUpgradeKey("material", id)] = {
    type:"material",
    id,
    name:material.name,
    fromLevel:data.level,
    toLevel:data.nextLevel,
    startedAt:now,
    endsAt:now + duration,
    duration
  };
  return {ok:true, material, level:data.nextLevel, duration};
}

export function startRefineryModuleUpgrade(id, now = Date.now()){
  if(hasActiveRefineryUpgrade("module", id)) return {ok:false, reason:"Amelioration deja en cours."};
  const data = getRefineryModuleUpgradeData(id);
  if(!data) return {ok:false, reason:"Module introuvable ou niveau maximum."};
  if(store.state.player.credits < data.credits) return {ok:false, reason:"Credits insuffisants."};
  for(const [materialId, amount] of Object.entries(data.materials || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Stock insuffisant : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  store.state.player.credits -= data.credits;
  enforcePlayerCurrencyMinimums();
  for(const [materialId, amount] of Object.entries(data.materials || {})) consumeMaterial(materialId, amount);
  if(!store.state.refineryUpgradeJobs) store.state.refineryUpgradeJobs = {};
  const duration = getRefineryUpgradeDuration("module", data);
  store.state.refineryUpgradeJobs[refineryUpgradeKey("module", id)] = {
    type:"module",
    id,
    name:data.name,
    fromLevel:data.level,
    toLevel:data.nextLevel,
    startedAt:now,
    endsAt:now + duration,
    duration
  };
  return {ok:true, module:data.name, level:data.nextLevel, duration};
}

export function completeRefineryUpgradeJobs(now = Date.now()){
  const jobs = store.state?.refineryUpgradeJobs;
  if(!jobs || typeof jobs !== "object") return false;
  let changed = false;
  for(const [key, job] of Object.entries(jobs)){
    if(Number(job?.endsAt || 0) > now) continue;
    if(job.type === "material"){
      if(!store.state.refineryLevels) store.state.refineryLevels = {};
      const material = getRawMaterial(job.id);
      const max = Number(material?.maxLevel || 20);
      store.state.refineryLevels[job.id] = Math.max(0, Math.min(max, Number(job.toLevel || 0)));
      changed = true;
    }else if(job.type === "module"){
      const def = REFINERY_MODULES[job.id];
      if(def){
        if(!store.state.refineryModules) store.state.refineryModules = {};
        store.state.refineryModules[job.id] = Math.max(1, Math.min(def.maxLevel, Number(job.toLevel || 1)));
        changed = true;
      }
    }
    delete jobs[key];
  }
  return changed;
}

export function getRefineryUpgradeData(id){
  const material = getRawMaterial(id);
  if(!material) return null;
  const level = getRefineryMaterialLevel(id);
  const maxLevel = Number(material.maxLevel || 20);
  if(level >= maxLevel) return null;
  const activeJob = getRefineryUpgradeJob("material", id);
  const nextLevel = level + 1;
  const tier = Number(material.tier || 1);
  const tuning = getRefineryUpgradeTuning(material.kind);
  const progress = refineryUpgradeProgressFactor(nextLevel, tuning.exponent);
  const credits = interpolateRounded(tuning.baseCredits, tuning.maxCredits, progress);
  const recipe = refineryRecipes.find(item=>item.outputId === id);
  const materials = {};
  if(recipe){
    for(const [materialId, amount] of Object.entries(recipe.costs || {})){
      const input = getRawMaterial(materialId);
      const unit = getRecipeUpgradeUnitCost(material.kind, input?.kind || "raw", nextLevel);
      materials[materialId] = Math.ceil(Number(amount || 0) * unit);
    }
  }else if(material.kind === "raw" && nextLevel > 1){
    const amount = getRawUpgradeMaterialAmount(nextLevel);
    for(const materialId of REFINERY_RAW_UPGRADE_COSTS[id] || []){
      materials[materialId] = amount;
    }
  }
  for(const key of Object.keys(materials)) if(materials[key] <= 0) delete materials[key];
  const canAffordUpgrade = store.state.player.credits >= credits
    && Object.entries(materials).every(([materialId, amount])=>getMaterialCount(materialId) >= amount);
  return {
    id,
    level,
    nextLevel,
    maxLevel,
    tier,
    kind:material.kind,
    credits,
    materials,
    duration:getRefineryUpgradeDuration("material", {nextLevel, tier, kind:material.kind}),
    canAfford:!activeJob && canAffordUpgrade
  };
}

export function upgradeRefineryMaterial(id){
  const data = getRefineryUpgradeData(id);
  const material = getRawMaterial(id);
  if(!data || !material) return {ok:false, reason:"Module introuvable ou niveau maximum."};
  if(store.state.player.credits < data.credits) return {ok:false, reason:"Credits insuffisants."};
  for(const [materialId, amount] of Object.entries(data.materials || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Stock insuffisant : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  store.state.player.credits -= data.credits;
  enforcePlayerCurrencyMinimums();
  for(const [materialId, amount] of Object.entries(data.materials || {})) consumeMaterial(materialId, amount);
  if(!store.state.refineryLevels) store.state.refineryLevels = {};
  store.state.refineryLevels[id] = data.nextLevel;
  return {ok:true, material, level:data.nextLevel};
}
