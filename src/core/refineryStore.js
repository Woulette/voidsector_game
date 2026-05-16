import { rawMaterialCatalog, refineryRecipes } from "../data/catalog.js";
import { addMaterial, addShipCargoMaterial, consumeMaterial, consumeShipCargoMaterial, getMaterialCount, getShipCargo, getShipCargoCapacity, getShipCargoUsed } from "./cargoStore.js";
import { enforcePlayerCurrencyMinimums, getRawMaterial, getShip, store } from "./store.js";
const REFINERY_RUSH_NOVA_PER_MINUTE = 15;
const REFINERY_PRODUCTION_TICK_MS = 30000;
const REFINERY_MAX_LEVEL = 20;
export const REFINERY_MODULES = {
  storage:{name:"Stockage", maxLevel:20, baseCost:18000},
  transport:{name:"Transport", maxLevel:20, baseCost:14000}
};
const REFINERY_SHIPMENT_MATERIALS_PER_MINUTE = 30;
const REFINERY_SHIPMENT_BLOCKED = new Set(["nickel_brut", "catalyseur_quantique"]);
const REFINERY_SHIPMENT_CREDIT_RATE = {
  raw:12,
  refined:40,
  special:40,
  advanced:120,
  final:500
};
const REFINERY_RAW_UPGRADE_COSTS = {
  cuivre_orbital:["cuivre_orbital", "zinc_spatial"],
  zinc_spatial:["cuivre_orbital", "nickel_brut"],
  nickel_brut:["zinc_spatial", "titane_fissure"],
  titane_fissure:["silice_conductrice", "nickel_brut"],
  silice_conductrice:["silice_conductrice", "titane_fissure"]
};
const REFINERY_PRODUCTION_BY_KIND = {
  raw:{base:1500, max:140000},
  refined:{base:150, max:14000},
  special:{base:150, max:14000},
  advanced:{base:15, max:1400},
  final:{base:2, max:140}
};
const REFINERY_STORAGE_BY_KIND = {
  raw:{base:25000, max:10000000},
  refined:{base:10000, max:1000000},
  special:{base:10000, max:1000000},
  advanced:{base:8000, max:100000},
  final:{base:2000, max:10000}
};
const REFINERY_UPGRADE_TUNING = {
  raw:{baseCredits:8000, maxCredits:6000000, baseHours:1, maxHours:36, exponent:2.05},
  refined:{baseCredits:25000, maxCredits:25000000, baseHours:2, maxHours:96, exponent:2.15},
  special:{baseCredits:35000, maxCredits:30000000, baseHours:3, maxHours:120, exponent:2.18},
  advanced:{baseCredits:100000, maxCredits:60000000, baseHours:6, maxHours:168, exponent:2.25},
  final:{baseCredits:500000, maxCredits:150000000, baseHours:12, maxHours:336, exponent:2.35}
};

export function getRefineryMaterialLevel(id){
  const material = getRawMaterial(id);
  const max = Number(material?.maxLevel || 20);
  return Math.max(0, Math.min(max, Number(store.state?.refineryLevels?.[id] ?? getDefaultRefineryLevel(id))));
}

export function isRefineryProductionEnabled(id){
  return Boolean(getRawMaterial(id)) && !store.state?.refineryProductionDisabled?.[id];
}

export function toggleRefineryProduction(id){
  if(!getRawMaterial(id)) return false;
  if(!store.state.refineryProductionDisabled || typeof store.state.refineryProductionDisabled !== "object"){
    store.state.refineryProductionDisabled = {};
  }
  store.state.refineryProductionDisabled[id] = !store.state.refineryProductionDisabled[id];
  return !store.state.refineryProductionDisabled[id];
}

export function getDefaultRefineryLevel(id){
  const material = getRawMaterial(id);
  return material?.kind === "raw" ? 1 : 0;
}

export function getRefineryModuleLevel(id){
  const def = REFINERY_MODULES[id];
  if(!def) return 0;
  return Math.max(1, Math.min(def.maxLevel, Number(store.state?.refineryModules?.[id] || 1)));
}

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

function refineryLevelProgress(level, maxLevel = REFINERY_MAX_LEVEL, exponent = 1){
  const clamped = Math.max(1, Math.min(maxLevel, Number(level || 1)));
  const raw = maxLevel <= 1 ? 1 : (clamped - 1) / (maxLevel - 1);
  return Math.pow(raw, exponent);
}

function refineryUpgradeProgressFactor(nextLevel, exponent = 2){
  const clamped = Math.max(2, Math.min(REFINERY_MAX_LEVEL, Number(nextLevel || 2)));
  const raw = (clamped - 2) / Math.max(1, REFINERY_MAX_LEVEL - 2);
  return Math.pow(raw, exponent);
}

function interpolateRounded(base, max, progress){
  return Math.max(0, Math.round(Number(base || 0) + (Number(max || 0) - Number(base || 0)) * Math.max(0, Math.min(1, progress))));
}

function getRefineryUpgradeTuning(kind){
  return REFINERY_UPGRADE_TUNING[kind] || REFINERY_UPGRADE_TUNING.raw;
}

function getRecipeUpgradeUnitCost(outputKind, inputKind, nextLevel){
  const progress = refineryUpgradeProgressFactor(nextLevel, getRefineryUpgradeTuning(outputKind).exponent);
  if(outputKind === "final"){
    const target = inputKind === "advanced" ? 42500 : inputKind === "special" ? 650000 : 250000;
    return interpolateRounded(800, target, progress);
  }
  if(outputKind === "advanced") return interpolateRounded(900, 180000, progress);
  if(outputKind === "special") return interpolateRounded(1000, 160000, progress);
  return interpolateRounded(1000, 160000, progress);
}

function getRawUpgradeMaterialAmount(nextLevel){
  return interpolateRounded(1000, 1200000, refineryUpgradeProgressFactor(nextLevel, REFINERY_UPGRADE_TUNING.raw.exponent));
}

function getRefineryModuleUpgradeMaterials(id, nextLevel){
  const progress = refineryUpgradeProgressFactor(nextLevel, 2.05);
  const amount = (base, max)=>interpolateRounded(base, max, progress);
  const costs = id === "storage"
    ? {
        titane_fissure:amount(900, 750000),
        silice_conductrice:amount(900, 750000)
      }
    : {
        cuivre_orbital:amount(800, 650000),
        zinc_spatial:amount(800, 650000)
      };
  if(nextLevel >= 6){
    costs.alliage_cuivre_zinc = amount(500, 180000);
    if(id === "storage") costs.plaque_nickel_titane = amount(500, 180000);
  }
  if(nextLevel >= 10){
    costs.plaque_nickel_titane = amount(900, 240000);
    costs.catalyseur_quantique = amount(250, 60000);
  }
  if(nextLevel >= 14){
    costs.conducteur_renforce = amount(120, 32000);
    costs.blindage_composite = amount(120, 32000);
  }
  if(nextLevel >= 18){
    costs.noyau_astra = amount(5, 1200);
  }
  for(const key of Object.keys(costs)) if(costs[key] <= 0) delete costs[key];
  return costs;
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

export function formatDuration(ms){
  const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if(hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if(minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

function getRefineryUpgradeDuration(type, data){
  const nextLevel = Math.max(1, Number(data?.nextLevel || 1));
  if(type === "material"){
    const tuning = getRefineryUpgradeTuning(data?.kind || "raw");
    const progress = refineryUpgradeProgressFactor(nextLevel, tuning.exponent * 0.72);
    const hours = Number(tuning.baseHours || 1) + (Number(tuning.maxHours || tuning.baseHours || 1) - Number(tuning.baseHours || 1)) * progress;
    return Math.round(hours * 60 * 60 * 1000);
  }
  return Math.round(60 * 60 * 1000 * nextLevel);
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

export function getRefineryTransportCapacityAt(level){
  return interpolateRounded(250, 6000, refineryLevelProgress(level, REFINERY_MODULES.transport.maxLevel, 1.08));
}

export function getRefineryTransportCapacity(){
  return getRefineryTransportCapacityAt(getRefineryModuleLevel("transport"));
}

export function canShipRefineryMaterial(id){
  return Boolean(getRawMaterial(id)) && !REFINERY_SHIPMENT_BLOCKED.has(id);
}

export function getShippableRefineryMaterials(){
  return rawMaterialCatalog.filter(material=>canShipRefineryMaterial(material.id));
}

export function getRefineryShipmentJob(){
  const job = store.state?.refineryShipmentJob;
  return job && job.materialId && job.shipId ? job : null;
}

function getRefineryShipmentDuration(amount){
  const safeAmount = Math.max(1, Math.ceil(Number(amount || 0)));
  return Math.max(1000, Math.ceil(safeAmount * 60000 / REFINERY_SHIPMENT_MATERIALS_PER_MINUTE));
}

function getRefineryShipmentCredits(materialId, amount){
  const material = getRawMaterial(materialId);
  const rate = REFINERY_SHIPMENT_CREDIT_RATE[material?.kind || "raw"] || REFINERY_SHIPMENT_CREDIT_RATE.raw;
  return Math.ceil(Math.max(1, Number(amount || 0)) * rate);
}

export function getRefineryShipmentData(materialId, amount, shipId = store.state.activeShip){
  const material = getRawMaterial(materialId);
  const requested = Math.max(0, Math.ceil(Number(amount || 0)));
  if(!shipId) return {ok:false, reason:"Aucun vaisseau equipe.", material, amount:requested, maxAmount:0, credits:0, duration:0};
  const activeJob = getRefineryShipmentJob();
  if(!material || !canShipRefineryMaterial(materialId)){
    return {ok:false, reason:"Materiau non expeditionnable.", material:null, amount:requested};
  }
  const ship = getShip(shipId);
  const stock = getMaterialCount(materialId);
  const transportCap = getRefineryTransportCapacity();
  const shipCapacity = getShipCargoCapacity(shipId);
  const shipUsed = getShipCargoUsed(shipId);
  const shipFree = Math.max(0, shipCapacity - shipUsed);
  const maxAmount = Math.max(0, Math.min(stock, transportCap, shipFree));
  const safeAmount = Math.min(requested || Math.min(30, maxAmount), maxAmount);
  const credits = safeAmount > 0 ? getRefineryShipmentCredits(materialId, safeAmount) : 0;
  return {
    ok:!activeJob && safeAmount > 0 && store.state.player.credits >= credits,
    reason:activeJob ? "Expedition deja en cours." : safeAmount <= 0 ? "Aucune place ou stock insuffisant." : store.state.player.credits < credits ? "Credits insuffisants." : "",
    material,
    ship,
    shipId,
    amount:safeAmount,
    requested,
    maxAmount,
    stock,
    transportCap,
    shipCapacity,
    shipUsed,
    shipFree,
    credits,
    duration:getRefineryShipmentDuration(safeAmount)
  };
}

export function startRefineryShipment(materialId, amount, shipId = store.state.activeShip, now = Date.now()){
  if(getRefineryShipmentJob()) return {ok:false, reason:"Expedition deja en cours."};
  if(!shipId) return {ok:false, reason:"Aucun vaisseau equipe."};
  const data = getRefineryShipmentData(materialId, amount, shipId);
  if(!data.material) return {ok:false, reason:data.reason || "Materiau non expeditionnable."};
  if(data.amount <= 0) return {ok:false, reason:data.reason || "Quantite invalide."};
  if(store.state.player.credits < data.credits) return {ok:false, reason:"Credits insuffisants."};
  if(getMaterialCount(materialId) < data.amount) return {ok:false, reason:"Stock insuffisant."};
  store.state.player.credits -= data.credits;
  enforcePlayerCurrencyMinimums();
  consumeMaterial(materialId, data.amount);
  const duration = getRefineryShipmentDuration(data.amount);
  store.state.refineryShipmentJob = {
    materialId,
    materialName:data.material.name,
    shipId,
    shipName:data.ship.name,
    amount:data.amount,
    credits:data.credits,
    startedAt:now,
    endsAt:now + duration,
    duration
  };
  return {ok:true, material:data.material, amount:data.amount, ship:data.ship, duration};
}

export function getShipRefineryRecipeData(recipeId, amount = 1, shipId = store.state.activeShip){
  const recipe = refineryRecipes.find(item=>item.id === recipeId) || null;
  const requested = Math.max(1, Math.floor(Number(amount || 1)));
  if(!recipe) return {ok:false, reason:"Recette introuvable.", recipe:null, amount:requested, maxAmount:0};
  const cargo = getShipCargo(shipId);
  const outputAmount = Math.max(1, Number(recipe.outputAmount || 1));
  const totalInputPerCraft = Object.values(recipe.costs || {}).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
  const outputDelta = outputAmount - totalInputPerCraft;
  const inputMax = Object.entries(recipe.costs || {}).reduce((max, [materialId, cost])=>{
    const perCraft = Math.max(1, Number(cost || 1));
    return Math.min(max, Math.floor(Math.max(0, Number(cargo[materialId] || 0)) / perCraft));
  }, Infinity);
  const capacity = getShipCargoCapacity(shipId);
  const used = getShipCargoUsed(shipId);
  const capacityMax = outputDelta > 0 ? Math.floor(Math.max(0, capacity - used) / outputDelta) : Infinity;
  const maxAmount = Math.max(0, Math.min(Number.isFinite(inputMax) ? inputMax : 0, Number.isFinite(capacityMax) ? capacityMax : inputMax));
  const safeAmount = Math.max(1, Math.min(requested, maxAmount || 1));
  return {
    ok:maxAmount > 0,
    reason:maxAmount <= 0 ? "Materiaux ou espace de soute insuffisants." : "",
    recipe,
    output:getRawMaterial(recipe.outputId),
    amount:safeAmount,
    requested,
    maxAmount,
    outputAmount,
    capacity,
    used
  };
}

export function refineShipCargoRecipe(recipeId, amount = 1, shipId = store.state.activeShip){
  const data = getShipRefineryRecipeData(recipeId, amount, shipId);
  if(!data.recipe) return {ok:false, reason:data.reason || "Recette introuvable."};
  if(!data.ok) return {ok:false, reason:data.reason || "Fusion impossible."};
  const count = Math.max(1, Math.min(Math.floor(Number(amount || 1)), data.maxAmount));
  for(const [materialId, cost] of Object.entries(data.recipe.costs || {})){
    const need = Math.max(0, Number(cost || 0)) * count;
    if(Math.max(0, Number(getShipCargo(shipId)[materialId] || 0)) < need){
      return {ok:false, reason:"Materiaux insuffisants."};
    }
  }
  for(const [materialId, cost] of Object.entries(data.recipe.costs || {})){
    consumeShipCargoMaterial(materialId, Math.max(0, Number(cost || 0)) * count, shipId);
  }
  const result = addShipCargoMaterial(data.recipe.outputId, Math.max(1, Number(data.recipe.outputAmount || 1)) * count, shipId);
  if(result.remaining > 0) return {ok:false, reason:"Soute insuffisante."};
  return {ok:true, recipe:data.recipe, output:data.output, amount:count, outputAmount:Math.max(1, Number(data.recipe.outputAmount || 1)) * count};
}

export function getRefineryShipmentProgress(now = Date.now()){
  const job = getRefineryShipmentJob();
  if(!job) return null;
  const duration = Math.max(1, Number(job.duration || (job.endsAt - job.startedAt) || 1));
  const elapsed = Math.max(0, Math.min(duration, now - Number(job.startedAt || now)));
  const remaining = Math.max(0, Number(job.endsAt || now) - now);
  return {...job, elapsed, remaining, percent:Math.max(0, Math.min(100, elapsed / duration * 100))};
}

export function getRefineryShipmentRushCost(now = Date.now()){
  const job = getRefineryShipmentProgress(now);
  if(!job) return null;
  const minutes = Math.max(1, Math.ceil(Number(job.remaining || 0) / 60000));
  const cost = minutes * REFINERY_RUSH_NOVA_PER_MINUTE;
  return {cost, minutes, remaining:job.remaining, canAfford:store.state.player.premium >= cost};
}

export function completeRefineryShipment(now = Date.now()){
  const job = getRefineryShipmentJob();
  if(!job || Number(job.endsAt || 0) > now) return false;
  const result = addShipCargoMaterial(job.materialId, job.amount, job.shipId);
  if(result.remaining > 0) addMaterial(job.materialId, result.remaining);
  store.state.refineryShipmentJob = null;
  return true;
}

export function rushRefineryShipment(now = Date.now()){
  const job = getRefineryShipmentJob();
  if(!job) return {ok:false, reason:"Aucune expedition en cours."};
  const rush = getRefineryShipmentRushCost(now);
  if(!rush) return {ok:false, reason:"Aucune expedition en cours."};
  if(store.state.player.premium < rush.cost) return {ok:false, reason:"Pas assez de NOVA."};
  store.state.player.premium -= rush.cost;
  enforcePlayerCurrencyMinimums();
  job.endsAt = now;
  completeRefineryShipment(now);
  return {ok:true, cost:rush.cost, materialName:job.materialName, amount:job.amount};
}

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

