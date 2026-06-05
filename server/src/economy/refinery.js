import { rawMaterialCatalog, refineryRecipes, ships } from "../../../src/data/catalog.js";
import { spendCurrency } from "../players/progression.js";

const REFINERY_RUSH_NOVA_PER_MINUTE = 15;
const REFINERY_MAX_LEVEL = 20;
const REFINERY_MODULES = {
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
const REFINERY_PRODUCTION_TICK_MS = 30000;
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

function getRawMaterial(id){
  return rawMaterialCatalog.find(material=>material.id === id) || null;
}

function getMaterialCount(profile, id){
  return Math.max(0, Number(profile.cargoHold?.[id] || 0));
}

function setMaterialCount(profile, id, amount){
  if(!getRawMaterial(id)) return false;
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  profile.cargoHold[id] = Math.max(0, Math.round(Number(amount || 0)));
  return true;
}

function addMaterial(profile, id, amount){
  if(!getRawMaterial(id)) return false;
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  profile.cargoHold[id] = getMaterialCount(profile, id) + Math.max(0, Math.round(Number(amount || 0)));
  return true;
}

function getShip(shipId){
  return ships.find(ship=>ship.id === shipId) || null;
}

function getShipCargo(profile, shipId = profile.activeShip){
  const ship = getShip(shipId);
  if(!ship) return null;
  if(!profile.shipCargo || typeof profile.shipCargo !== "object") profile.shipCargo = {};
  if(!profile.shipCargo[ship.id] || typeof profile.shipCargo[ship.id] !== "object") profile.shipCargo[ship.id] = {};
  for(const material of rawMaterialCatalog){
    profile.shipCargo[ship.id][material.id] = Math.max(0, Number(profile.shipCargo[ship.id][material.id] || 0));
  }
  return profile.shipCargo[ship.id];
}

function getShipCargoUsed(profile, shipId = profile.activeShip){
  const cargo = getShipCargo(profile, shipId);
  if(!cargo) return 0;
  return rawMaterialCatalog.reduce((sum, material)=>sum + Math.max(0, Number(cargo[material.id] || 0)), 0);
}

function getShipCargoCapacity(shipId){
  return Math.max(0, Math.round(Number(getShip(shipId)?.stats?.cargo || 0)));
}

function addShipCargoMaterial(profile, id, amount, shipId = profile.activeShip){
  if(!getRawMaterial(id)) return {added:0, remaining:Math.max(0, Number(amount || 0))};
  const cargo = getShipCargo(profile, shipId);
  if(!cargo) return {added:0, remaining:Math.max(0, Number(amount || 0))};
  const requested = Math.max(0, Math.ceil(Number(amount || 0)));
  const free = Math.max(0, getShipCargoCapacity(shipId) - getShipCargoUsed(profile, shipId));
  const added = Math.min(requested, free);
  if(added > 0) cargo[id] = Math.max(0, Number(cargo[id] || 0)) + added;
  return {added, remaining:requested - added};
}

function consumeShipCargoMaterial(profile, id, amount, shipId = profile.activeShip){
  const cargo = getShipCargo(profile, shipId);
  if(!cargo || !getRawMaterial(id)) return false;
  const need = Math.max(0, Number(amount || 0));
  if(Math.max(0, Number(cargo[id] || 0)) < need) return false;
  cargo[id] -= need;
  return true;
}

function consumeMaterial(profile, id, amount){
  const need = Math.max(0, Math.round(Number(amount || 0)));
  if(getMaterialCount(profile, id) < need) return false;
  profile.cargoHold[id] = getMaterialCount(profile, id) - need;
  return true;
}

function refineryUpgradeKey(type, id){
  return `${type}:${id}`;
}

function getDefaultRefineryLevel(id){
  const material = getRawMaterial(id);
  return material?.kind === "raw" ? 1 : 0;
}

function getRefineryMaterialLevel(profile, id){
  const material = getRawMaterial(id);
  const max = Number(material?.maxLevel || 20);
  return Math.max(0, Math.min(max, Number(profile.refineryLevels?.[id] ?? getDefaultRefineryLevel(id))));
}

function getRefineryModuleLevel(profile, id){
  const def = REFINERY_MODULES[id];
  if(!def) return 0;
  return Math.max(1, Math.min(def.maxLevel, Number(profile.refineryModules?.[id] || 1)));
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
    ? {titane_fissure:amount(900, 750000), silice_conductrice:amount(900, 750000)}
    : {cuivre_orbital:amount(800, 650000), zinc_spatial:amount(800, 650000)};
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
  if(nextLevel >= 18) costs.noyau_astra = amount(5, 1200);
  for(const key of Object.keys(costs)) if(costs[key] <= 0) delete costs[key];
  return costs;
}

function getUpgradeDuration(type, data){
  const nextLevel = Math.max(1, Number(data?.nextLevel || 1));
  if(type === "material"){
    const tuning = getRefineryUpgradeTuning(data?.kind || "raw");
    const progress = refineryUpgradeProgressFactor(nextLevel, tuning.exponent * 0.72);
    const hours = Number(tuning.baseHours || 1) + (Number(tuning.maxHours || tuning.baseHours || 1) - Number(tuning.baseHours || 1)) * progress;
    return Math.round(hours * 60 * 60 * 1000);
  }
  return Math.round(60 * 60 * 1000 * nextLevel);
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

export function toggleServerRefineryProduction(profile, id){
  if(!getRawMaterial(String(id || ""))) return {ok:false, reason:"Materiau introuvable."};
  if(!profile.refineryProductionDisabled || typeof profile.refineryProductionDisabled !== "object") profile.refineryProductionDisabled = {};
  profile.refineryProductionDisabled[id] = !profile.refineryProductionDisabled[id];
  return {ok:true, id, enabled:!profile.refineryProductionDisabled[id]};
}

export function startServerRefineryJob(profile, {recipeId, now = Date.now()} = {}){
  if(profile.refineryJob) return {ok:false, reason:"Le raffineur est deja occupe."};
  const recipe = refineryRecipes.find(item=>item.id === recipeId) || null;
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  for(const [materialId, amount] of Object.entries(recipe.costs || {})){
    if(getMaterialCount(profile, materialId) < amount) return {ok:false, reason:`Materiaux insuffisants : ${getRawMaterial(materialId)?.name || materialId}.`};
  }
  for(const [materialId, amount] of Object.entries(recipe.costs || {})) consumeMaterial(profile, materialId, amount);
  profile.refineryJob = {
    recipeId:recipe.id,
    startedAt:now,
    endsAt:now + Number(recipe.durationMs || 0)
  };
  return {ok:true, recipe:{id:recipe.id, name:recipe.name, outputId:recipe.outputId, outputAmount:recipe.outputAmount}};
}

export function claimServerRefineryJob(profile, {now = Date.now()} = {}){
  const job = profile.refineryJob;
  if(!job) return {ok:false, reason:"Aucun raffinage en cours."};
  if(Number(job.endsAt || 0) > now) return {ok:false, reason:"Raffinage non termine."};
  const recipe = refineryRecipes.find(item=>item.id === job.recipeId) || null;
  if(!recipe) return {ok:false, reason:"Recette invalide."};
  addMaterial(profile, recipe.outputId, recipe.outputAmount || 1);
  profile.refineryJob = null;
  return {ok:true, recipe:{id:recipe.id, name:recipe.name, outputId:recipe.outputId, outputAmount:recipe.outputAmount}};
}

function canShipRefineryMaterial(id){
  return Boolean(getRawMaterial(id)) && !REFINERY_SHIPMENT_BLOCKED.has(id);
}

function getRefineryTransportCapacityAt(level){
  const clamped = Math.max(1, Math.min(REFINERY_MODULES.transport.maxLevel, Number(level || 1)));
  const raw = (clamped - 1) / Math.max(1, REFINERY_MODULES.transport.maxLevel - 1);
  return interpolateRounded(250, 6000, Math.pow(raw, 1.08));
}

function getRefineryTransportCapacity(profile){
  return getRefineryTransportCapacityAt(getRefineryModuleLevel(profile, "transport"));
}

function isRefineryProductionEnabled(profile, id){
  return Boolean(getRawMaterial(id)) && !profile.refineryProductionDisabled?.[id];
}

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
  let changed = false;
  for(const material of rawMaterialCatalog){
    const rate = getRefineryProductionRate(profile, material.id);
    if(rate <= 0) continue;
    const perTick = rate * REFINERY_PRODUCTION_TICK_MS / 3600000;
    const produced = Math.floor(perTick * ticks);
    if(produced <= 0) continue;
    const current = getMaterialCount(profile, material.id);
    const cap = getMaterialStorageCap(profile, material.id);
    const next = Math.min(cap, current + produced);
    if(next !== current){
      setMaterialCount(profile, material.id, next);
      changed = true;
    }
  }
  profile.refineryLastTick = lastTick + ticks * REFINERY_PRODUCTION_TICK_MS;
  return changed;
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

function getRefineryShipmentJob(profile){
  const job = profile.refineryShipmentJob;
  return job && job.materialId && job.shipId ? job : null;
}

export function startServerRefineryShipment(profile, {materialId, amount, shipId = profile.activeShip, now = Date.now()} = {}){
  if(getRefineryShipmentJob(profile)) return {ok:false, reason:"Expedition deja en cours."};
  const material = getRawMaterial(String(materialId || ""));
  const ship = getShip(String(shipId || ""));
  if(!ship) return {ok:false, reason:"Aucun vaisseau equipe."};
  if(!material || !canShipRefineryMaterial(material.id)) return {ok:false, reason:"Materiau non expeditionnable."};
  const requested = Math.max(1, Math.ceil(Number(amount || 1)));
  const stock = getMaterialCount(profile, material.id);
  const transportCap = getRefineryTransportCapacity(profile);
  const shipFree = Math.max(0, getShipCargoCapacity(ship.id) - getShipCargoUsed(profile, ship.id));
  const safeAmount = Math.min(requested, stock, transportCap, shipFree);
  if(safeAmount <= 0) return {ok:false, reason:"Aucune place ou stock insuffisant."};
  const credits = getRefineryShipmentCredits(material.id, safeAmount);
  if(Number(profile.player?.credits || 0) < credits) return {ok:false, reason:"Credits insuffisants."};
  profile.player = spendCurrency(profile.player || {}, "credits", credits).player;
  consumeMaterial(profile, material.id, safeAmount);
  const duration = getRefineryShipmentDuration(safeAmount);
  profile.refineryShipmentJob = {
    materialId:material.id,
    materialName:material.name,
    shipId:ship.id,
    shipName:ship.name,
    amount:safeAmount,
    credits,
    startedAt:now,
    endsAt:now + duration,
    duration
  };
  return {ok:true, material:{id:material.id, name:material.name}, amount:safeAmount, ship:{id:ship.id, name:ship.name}, credits, duration};
}

export function completeServerRefineryShipment(profile, now = Date.now()){
  const job = getRefineryShipmentJob(profile);
  if(!job || Number(job.endsAt || 0) > now) return false;
  const result = addShipCargoMaterial(profile, job.materialId, job.amount, job.shipId);
  if(result.remaining > 0) addMaterial(profile, job.materialId, result.remaining);
  profile.refineryShipmentJob = null;
  return true;
}

export function rushServerRefineryShipment(profile, {now = Date.now()} = {}){
  const job = getRefineryShipmentJob(profile);
  if(!job) return {ok:false, reason:"Aucune expedition en cours."};
  const remaining = Math.max(0, Number(job.endsAt || now) - now);
  const cost = Math.max(1, Math.ceil(remaining / 60000)) * REFINERY_RUSH_NOVA_PER_MINUTE;
  const spend = spendCurrency(profile.player || {}, "premium", cost);
  if(!spend.ok) return {...spend, reason:"Pas assez de NOVA."};
  profile.player = spend.player;
  job.endsAt = now;
  completeServerRefineryShipment(profile, now);
  return {ok:true, cost, materialName:job.materialName, amount:job.amount};
}

export function refineServerShipCargoRecipe(profile, {recipeId, amount = 1, shipId = profile.activeShip} = {}){
  const recipe = refineryRecipes.find(item=>item.id === recipeId) || null;
  const ship = getShip(String(shipId || ""));
  if(!ship) return {ok:false, reason:"Aucun vaisseau equipe."};
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  const count = Math.max(1, Math.floor(Number(amount || 1)));
  const cargo = getShipCargo(profile, ship.id);
  for(const [materialId, cost] of Object.entries(recipe.costs || {})){
    const need = Math.max(0, Number(cost || 0)) * count;
    if(Math.max(0, Number(cargo[materialId] || 0)) < need) return {ok:false, reason:"Materiaux insuffisants."};
  }
  const outputAmount = Math.max(1, Number(recipe.outputAmount || 1)) * count;
  const totalInput = Object.values(recipe.costs || {}).reduce((sum, cost)=>sum + Math.max(0, Number(cost || 0)) * count, 0);
  const outputDelta = outputAmount - totalInput;
  if(outputDelta > 0 && getShipCargoUsed(profile, ship.id) + outputDelta > getShipCargoCapacity(ship.id)){
    return {ok:false, reason:"Soute insuffisante."};
  }
  for(const [materialId, cost] of Object.entries(recipe.costs || {})){
    consumeShipCargoMaterial(profile, materialId, Math.max(0, Number(cost || 0)) * count, ship.id);
  }
  const result = addShipCargoMaterial(profile, recipe.outputId, outputAmount, ship.id);
  if(result.remaining > 0) return {ok:false, reason:"Soute insuffisante."};
  const output = getRawMaterial(recipe.outputId);
  return {
    ok:true,
    recipe:{id:recipe.id, name:recipe.name, outputId:recipe.outputId},
    output:{id:output?.id || recipe.outputId, name:output?.name || recipe.outputId},
    amount:count,
    outputAmount
  };
}
