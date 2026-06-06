import { refineryRecipes } from "../../../src/data/catalog.js";
import { spendCurrency } from "../players/progression.js";
import {
  REFINERY_MODULES,
  REFINERY_RAW_UPGRADE_COSTS,
  REFINERY_RUSH_NOVA_PER_MINUTE,
  getRawUpgradeMaterialAmount,
  getRecipeUpgradeUnitCost,
  getRefineryModuleUpgradeMaterials,
  getRefineryUpgradeTuning,
  getUpgradeDuration,
  interpolateRounded,
  refineryUpgradeProgressFactor
} from "./refineryRules.js";
import {
  consumeMaterial,
  getMaterialCount,
  getRawMaterial,
  getRefineryMaterialLevel,
  getRefineryModuleLevel
} from "./refineryProfile.js";

function refineryUpgradeKey(type, id){
  return `${type}:${id}`;
}

function getRefineryUpgradeJob(profile, type, id){
  const key = refineryUpgradeKey(type, id);
  const job = profile.refineryUpgradeJobs?.[key];
  return job && job.type === type && job.id === id ? job : null;
}

function getMaterialUpgradeData(profile, id){
  const material = getRawMaterial(id);
  if(!material) return null;
  const level = getRefineryMaterialLevel(profile, id);
  const maxLevel = Number(material.maxLevel || 20);
  if(level >= maxLevel) return null;
  const nextLevel = level + 1;
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
    for(const materialId of REFINERY_RAW_UPGRADE_COSTS[id] || []) materials[materialId] = amount;
  }
  for(const key of Object.keys(materials)) if(materials[key] <= 0) delete materials[key];
  return {id, material, name:material.name, kind:material.kind, level, nextLevel, credits, materials, duration:getUpgradeDuration("material", {nextLevel, kind:material.kind})};
}

function getModuleUpgradeData(profile, id){
  const def = REFINERY_MODULES[id];
  if(!def) return null;
  const level = getRefineryModuleLevel(profile, id);
  if(level >= def.maxLevel) return null;
  const nextLevel = level + 1;
  const credits = Math.round(def.baseCost * Math.pow(nextLevel, 1.42));
  const materials = getRefineryModuleUpgradeMaterials(id, nextLevel);
  return {id, name:def.name, level, nextLevel, credits, materials, duration:getUpgradeDuration("module", {nextLevel})};
}

function assertCosts(profile, data){
  if(!data) return {ok:false, reason:"Module introuvable ou niveau maximum."};
  if(Number(profile.player?.credits || 0) < data.credits) return {ok:false, reason:"Credits insuffisants."};
  for(const [materialId, amount] of Object.entries(data.materials || {})){
    if(getMaterialCount(profile, materialId) < amount) return {ok:false, reason:`Stock insuffisant : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  return {ok:true};
}

export function completeServerRefineryUpgrades(profile, now = Date.now()){
  const jobs = profile.refineryUpgradeJobs;
  if(!jobs || typeof jobs !== "object") return false;
  let changed = false;
  for(const [key, job] of Object.entries(jobs)){
    if(Number(job?.endsAt || 0) > now) continue;
    if(job.type === "material"){
      if(!profile.refineryLevels || typeof profile.refineryLevels !== "object") profile.refineryLevels = {};
      const material = getRawMaterial(job.id);
      const max = Number(material?.maxLevel || 20);
      profile.refineryLevels[job.id] = Math.max(0, Math.min(max, Number(job.toLevel || 0)));
      changed = true;
    }else if(job.type === "module"){
      const def = REFINERY_MODULES[job.id];
      if(def){
        if(!profile.refineryModules || typeof profile.refineryModules !== "object") profile.refineryModules = {};
        profile.refineryModules[job.id] = Math.max(1, Math.min(def.maxLevel, Number(job.toLevel || 1)));
        changed = true;
      }
    }
    delete jobs[key];
  }
  return changed;
}

export function startServerRefineryUpgrade(profile, {type, id, now = Date.now()} = {}){
  const safeType = type === "module" ? "module" : "material";
  if(getRefineryUpgradeJob(profile, safeType, id)) return {ok:false, reason:"Amelioration deja en cours."};
  const data = safeType === "module" ? getModuleUpgradeData(profile, id) : getMaterialUpgradeData(profile, id);
  const costs = assertCosts(profile, data);
  if(!costs.ok) return costs;
  profile.player = spendCurrency(profile.player || {}, "credits", data.credits).player;
  for(const [materialId, amount] of Object.entries(data.materials || {})) consumeMaterial(profile, materialId, amount);
  if(!profile.refineryUpgradeJobs || typeof profile.refineryUpgradeJobs !== "object") profile.refineryUpgradeJobs = {};
  profile.refineryUpgradeJobs[refineryUpgradeKey(safeType, id)] = {
    type:safeType,
    id,
    name:data.name,
    fromLevel:data.level,
    toLevel:data.nextLevel,
    startedAt:now,
    endsAt:now + data.duration,
    duration:data.duration
  };
  return {ok:true, type:safeType, id, name:data.name, level:data.nextLevel, duration:data.duration};
}

export function rushServerRefineryUpgrade(profile, {type, id, now = Date.now()} = {}){
  const safeType = type === "module" ? "module" : "material";
  const job = getRefineryUpgradeJob(profile, safeType, id);
  if(!job) return {ok:false, reason:"Aucune amelioration en cours."};
  const remaining = Math.max(0, Number(job.endsAt || now) - now);
  const cost = Math.max(1, Math.ceil(remaining / 60000)) * REFINERY_RUSH_NOVA_PER_MINUTE;
  const spend = spendCurrency(profile.player || {}, "premium", cost);
  if(!spend.ok) return {...spend, reason:"Pas assez de NOVA."};
  profile.player = spend.player;
  job.endsAt = now;
  completeServerRefineryUpgrades(profile, now);
  return {ok:true, type:safeType, id, name:job.name, level:job.toLevel, cost};
}
