import { ammoTypes, defaultState, droneCatalog, equipment, portals, questCatalog, rawMaterialCatalog, refineryRecipes, ships, skills } from "../data/catalog.js";
import { clone, fmt } from "./utils.js";
import { normalizeSlotKeybinds } from "./keybinds.js";



import {
  RANK_TABLE,
  RANK_POINT_RULES,
  LOCAL_LEADERBOARD_PREVIEW,
  buildLeaderboardRows,
  buildRankBreakdown,
  calculateRankScore,
  getNextRankForScore,
  getRankAssetPath,
  getRankById,
  getRankForScore as findRankForScore,
  getRankProgressForScore
} from "../data/ranks.js";
export { RANK_TABLE, RANK_POINT_RULES, LOCAL_LEADERBOARD_PREVIEW, getRankAssetPath, getRankById };

export const store = {
  state:null,
  shopFilter:"vaisseau",
  currentView:"hangar",
  hangarDetailOpen:false,
  hangarTab:"vaisseau",
  selectedInventoryUid:null,
  selectedShopProduct:null,
  selectedRefineryUpgrade:null,
  selectedRefineryTab:"forge",
  selectedRefineryShipmentMaterial:null,
  selectedRefineryShipmentAmount:30
};

const MAX_ACTIVE_QUESTS = 5;
const MIN_PLAYER_CREDITS = 1000000000;
const MIN_PLAYER_PREMIUM = 1000000;
const REFINERY_RUSH_NOVA_PER_MINUTE = 15;
const REFINERY_PRODUCTION_TICK_MS = 30000;
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
  cuivre_orbital:["cuivre_orbital", "nickel_brut"],
  zinc_spatial:["zinc_spatial", "nickel_brut"],
  nickel_brut:["zinc_spatial", "titane_fissure"],
  titane_fissure:["nickel_brut", "silice_conductrice"],
  silice_conductrice:["titane_fissure", "nickel_brut"]
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

export function getShip(id){ return ships.find(s=>s.id===id) || ships[0]; }
export function getItem(id){ return equipment.find(i=>i.id===id); }
export function getAmmo(id){ return ammoTypes.find(a=>a.id===id) || null; }
export function getDroneCatalog(id="combat_drone"){ return droneCatalog.find(d=>d.id===id) || droneCatalog[0]; }
export function isWeapon(id){ return getItem(id)?.category === "canon"; }
export function isGenerator(id){ return getItem(id)?.category === "generateur"; }
export function getInventoryItem(uid){ return store.state?.inventoryItems?.find(entry=>entry.uid === uid) || null; }
export function getItemFromInventoryUid(uid){ return getItem(getInventoryItem(uid)?.itemId); }
function getItemFromInventoryUidIn(uid, inventoryItems = store.state?.inventoryItems || []){
  return getItem(inventoryItems.find(entry=>entry.uid === uid)?.itemId);
}
export function priceLabel(type, price){ return type === "premium" ? `${fmt(price)} NOVA` : `${fmt(price)} CR`; }
export function canAfford(type, price){ return type === "premium" ? store.state.player.premium >= price : store.state.player.credits >= price; }
function enforcePlayerCurrencyMinimums(player = store.state?.player){
  if(!player) return;
  player.credits = Math.max(MIN_PLAYER_CREDITS, Number(player.credits || 0));
  player.premium = Math.max(MIN_PLAYER_PREMIUM, Number(player.premium || 0));
}
export function spend(type, price){
  if(type === "premium") store.state.player.premium -= price;
  else store.state.player.credits -= price;
  enforcePlayerCurrencyMinimums();
}
export function getPortal(id){ return portals.find(p=>p.id===id) || null; }
export function getQuest(id){ return questCatalog.find(q=>q.id === id) || null; }
export function getAllQuests(){ return questCatalog.slice(); }
export function getRawMaterial(id){ return rawMaterialCatalog.find(item=>item.id === id) || null; }
export function getAllRawMaterials(){ return rawMaterialCatalog.slice(); }
export function getRefineryRecipe(id){ return refineryRecipes.find(recipe=>recipe.id === id) || null; }
export function getRefineryRecipes(){ return refineryRecipes.slice(); }
export function getPortalPieces(id){ return Math.max(0, Number(store.state.portalPieces?.[id] || 0)); }
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

function getDefaultRefineryLevel(id){
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
export function addPortalPiece(id, amount=1){
  if(!store.state.portalPieces) store.state.portalPieces = {};
  store.state.portalPieces[id] = getPortalPieces(id) + Math.max(0, Number(amount || 0));
  return store.state.portalPieces[id];
}
export function isPortalUnlocked(id){ return Array.isArray(store.state.unlockedPortals) && store.state.unlockedPortals.includes(id); }
export function unlockPortal(id){
  if(!store.state.unlockedPortals) store.state.unlockedPortals = [];
  if(!store.state.unlockedPortals.includes(id)) store.state.unlockedPortals.push(id);
}
export function markPortalCompleted(id){
  if(!store.state.completedPortals || typeof store.state.completedPortals !== "object") store.state.completedPortals = {};
  store.state.completedPortals[id] = (store.state.completedPortals[id] || 0) + 1;
}
export function getCompletedPortalCount(){
  const completed = store.state.completedPortals || {};
  return Object.values(completed).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
}

export function getMaterialCount(id){
  return Math.max(0, Number(store.state?.cargoHold?.[id] || 0));
}

export function addMaterial(id, amount=1){
  if(!getRawMaterial(id)) return 0;
  if(!store.state.cargoHold) store.state.cargoHold = {};
  const current = getMaterialCount(id);
  const cap = getMaterialStorageCap(id);
  store.state.cargoHold[id] = Math.min(cap, current + Math.max(0, Number(amount || 0)));
  return store.state.cargoHold[id];
}

export function consumeMaterial(id, amount=1){
  const need = Math.max(0, Number(amount || 0));
  if(getMaterialCount(id) < need) return false;
  store.state.cargoHold[id] -= need;
  return true;
}

export function getCargoUsed(){
  return rawMaterialCatalog.reduce((sum, item)=>sum + getMaterialCount(item.id), 0);
}

function makeEmptyMaterialCargo(){
  return rawMaterialCatalog.reduce((cargo, material)=>{
    cargo[material.id] = 0;
    return cargo;
  }, {});
}

export function getShipCargo(shipId = store.state.activeShip){
  if(!store.state.shipCargo || typeof store.state.shipCargo !== "object") store.state.shipCargo = {};
  if(!store.state.shipCargo[shipId] || typeof store.state.shipCargo[shipId] !== "object"){
    store.state.shipCargo[shipId] = makeEmptyMaterialCargo();
  }
  for(const material of rawMaterialCatalog){
    store.state.shipCargo[shipId][material.id] = Math.max(0, Number(store.state.shipCargo[shipId][material.id] || 0));
  }
  return store.state.shipCargo[shipId];
}

export function getShipCargoUsed(shipId = store.state.activeShip){
  const cargo = getShipCargo(shipId);
  return rawMaterialCatalog.reduce((sum, material)=>sum + Math.max(0, Number(cargo[material.id] || 0)), 0);
}

export function getShipCargoCapacity(shipId = store.state.activeShip){
  return Math.max(0, Math.round(Number(getShipCombatStats(shipId).cargo || 0)));
}

export function addShipCargoMaterial(id, amount=1, shipId = store.state.activeShip){
  if(!getRawMaterial(id)) return {added:0, remaining:Math.max(0, Number(amount || 0)), used:getShipCargoUsed(shipId), capacity:getShipCargoCapacity(shipId)};
  const requested = Math.max(0, Math.ceil(Number(amount || 0)));
  const capacity = getShipCargoCapacity(shipId);
  const used = getShipCargoUsed(shipId);
  const free = Math.max(0, capacity - used);
  const added = Math.min(requested, free);
  if(added > 0){
    const cargo = getShipCargo(shipId);
    cargo[id] = Math.max(0, Number(cargo[id] || 0)) + added;
  }
  return {added, remaining:requested - added, used:getShipCargoUsed(shipId), capacity};
}

export function getRefineryJob(){
  return store.state.refineryJob || null;
}

export function isRefineryComplete(){
  const job = getRefineryJob();
  return Boolean(job && Number(job.endsAt || 0) <= Date.now());
}

export function startRefineryJob(recipeId){
  if(getRefineryJob()) return {ok:false, reason:"Le raffineur est deja occupé."};
  const recipe = getRefineryRecipe(recipeId);
  if(!recipe) return {ok:false, reason:"Recette introuvable."};
  for(const [materialId, amount] of Object.entries(recipe.costs || {})){
    if(getMaterialCount(materialId) < amount) return {ok:false, reason:`Matériaux insuffisants : ${getRawMaterial(materialId).name || materialId}.`};
  }
  for(const [materialId, amount] of Object.entries(recipe.costs || {})) consumeMaterial(materialId, amount);
  store.state.refineryJob = {recipeId:recipe.id, startedAt:Date.now(), endsAt:Date.now() + Number(recipe.durationMs || 0)};
  return {ok:true, recipe};
}

export function claimRefineryJob(){
  const job = getRefineryJob();
  if(!job) return {ok:false, reason:"Aucun raffinage en cours."};
  if(!isRefineryComplete()) return {ok:false, reason:"Raffinage non terminé."};
  const recipe = getRefineryRecipe(job.recipeId);
  if(!recipe) return {ok:false, reason:"Recette invalide."};
  addMaterial(recipe.outputId, recipe.outputAmount || 1);
  store.state.refineryJob = null;
  return {ok:true, recipe};
}

export function getEquipmentUpgradeLevel(itemId){
  return Math.max(0, Number(store.state?.equipmentUpgrades?.[itemId] || 0));
}

export function getEquipmentUpgradeCost(itemLike){
  const item = typeof itemLike === "string" ? getItem(itemLike) : itemLike;
  const level = getEquipmentUpgradeLevel(item.id);
  if(item.category === "canon") return {materialId:"conducteur_renforce", amount:1 + level};
  if(item.category === "generateur") return {materialId:"blindage_composite", amount:1 + level};
  return null;
}

export function upgradeEquipment(itemId){
  const item = getItem(itemId);
  if(!item || !["canon","generateur"].includes(item.category)) return {ok:false, reason:"Équipement non améliorable."};
  const current = getEquipmentUpgradeLevel(itemId);
  if(current >= 10) return {ok:false, reason:"Niveau maximum atteint."};
  const cost = getEquipmentUpgradeCost(item);
  if(!cost || getMaterialCount(cost.materialId) < cost.amount) return {ok:false, reason:"Matériaux raffinés insuffisants."};
  if(!store.state.equipmentUpgrades) store.state.equipmentUpgrades = {};
  consumeMaterial(cost.materialId, cost.amount);
  store.state.equipmentUpgrades[itemId] = current + 1;
  return {ok:true, level:current + 1, cost};
}

export function getSkillDefinition(id){
  return skills.find(skill=>skill.id === id) || null;
}

export function getSkillLevel(id){
  return Math.max(0, Number(store.state?.skillLevels?.[id] || 0));
}

export function getSkillUpgradeData(id){
  const skill = getSkillDefinition(id);
  if(!skill) return null;
  const level = getSkillLevel(id);
  return skill.levels?.[level] || null;
}

export function upgradeSkill(id){
  const skill = getSkillDefinition(id);
  if(!skill) return {ok:false, reason:"Compétence introuvable."};
  const level = getSkillLevel(id);
  if(level >= Number(skill.maxLevel || skill.levels.length || 0)) return {ok:false, reason:"Niveau maximum atteint."};
  const next = getSkillUpgradeData(id);
  if(!next) return {ok:false, reason:"Palier introuvable."};
  if(Number(store.state.player.skillPoints || 0) < Number(next.skillPoints || 0)) return {ok:false, reason:"Pas assez de points de compétence."};
  if(!canAfford(next.priceType, next.price)) return {ok:false, reason: next.priceType === "premium" ? "Pas assez de NOVA." : "Pas assez de crédits."};
  store.state.player.skillPoints -= Number(next.skillPoints || 0);
  spend(next.priceType, next.price);
  if(!store.state.skillLevels || typeof store.state.skillLevels !== "object") store.state.skillLevels = {};
  store.state.skillLevels[id] = level + 1;
  return {ok:true, level:level + 1, step:next, skill};
}

export function getActiveQuest(){
  return getQuest(store.state.activeQuestId) || null;
}

export function getActiveQuests(){
  const ids = Array.isArray(store.state?.activeQuestIds) ? store.state.activeQuestIds : [];
  return ids.map(id=>getQuest(id)).filter(Boolean);
}

export function getQuestProgress(id){
  return Math.max(0, Number(store.state?.questProgress?.[id] || 0));
}

export function canClaimQuest(id){
  const quest = getQuest(id);
  if(!quest) return false;
  if(store.state.completedQuestClaims?.[id]) return false;
  return getQuestProgress(id) >= Math.max(0, Number(quest.objective.count || 0));
}

export function acceptQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quête introuvable."};
  const requiredLevel = Number(quest.requiredLevel || 1);
  if(Number(store.state.player?.level || 1) < requiredLevel) return {ok:false, reason:`Niveau ${requiredLevel} requis.`};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quête déjà terminée."};
  if(!Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = [];
  store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>getQuest(questId) && !store.state.completedQuestClaims?.[questId]).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestIds.includes(id)) return {ok:false, reason:"Quête déjà en cours."};
  if(store.state.activeQuestIds.length >= MAX_ACTIVE_QUESTS) return {ok:false, reason:`Maximum ${MAX_ACTIVE_QUESTS} quêtes en cours.`};
  store.state.activeQuestIds.push(id);
  store.state.activeQuestId = id;
  if(!store.state.questProgress) store.state.questProgress = {};
  if(!store.state.questProgress[id]) store.state.questProgress[id] = 0;
  return {ok:true, quest};
}

function questMatchesKill(quest, kind, zoneName){
  if(!quest || quest.objective.type !== "kill") return false;
  if(quest.objective.target && quest.objective.target !== kind) return false;
  if(quest.objective.zone && quest.objective.zone !== zoneName) return false;
  return true;
}

function canProgressQuest(quest){
  if(!quest || store.state.completedQuestClaims?.[quest.id]) return false;
  return getQuestProgress(quest.id) < Math.max(0, Number(quest.objective.count || 0));
}

function progressQuestKill(quest){
  if(!store.state.questProgress) store.state.questProgress = {};
  const target = Math.max(0, Number(quest.objective.count || 0));
  const next = Math.min(target, getQuestProgress(quest.id) + 1);
  store.state.questProgress[quest.id] = next;
  return next >= target;
}

export function recordQuestKill(kind, zoneName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const trackedQuest = getQuest(store.state.activeQuestId);
  if(trackedQuest && activeIds.includes(trackedQuest.id) && canProgressQuest(trackedQuest) && questMatchesKill(trackedQuest, kind, zoneName)){
    return progressQuestKill(trackedQuest);
  }
  const fallbackQuest = activeIds
    .map(id=>getQuest(id))
    .find(quest=>canProgressQuest(quest) && questMatchesKill(quest, kind, zoneName));
  return fallbackQuest ? progressQuestKill(fallbackQuest) : false;
}

export function claimQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quête introuvable."};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quête déjà terminée."};
  if(!canClaimQuest(id)) return {ok:false, reason:"Objectif non rempli."};
  store.state.player.credits += Number(quest.rewards.credits || 0);
  addXP(Number(quest.rewards.xp || 0));
  for(const [materialId, amount] of Object.entries(quest.rewards.materials || {})) addMaterial(materialId, amount);
  if(!store.state.completedQuestClaims || typeof store.state.completedQuestClaims !== "object") store.state.completedQuestClaims = {};
  store.state.completedQuestClaims[id] = true;
  if(Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>questId !== id).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestId === id) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
  return {ok:true, quest};
}

export function getRankForScore(score){
  return findRankForScore(score);
}

export function getRankScore(){
  return calculateRankScore(store.state.player || {}, getCompletedPortalCount());
}

export function getRankBreakdown(){
  return buildRankBreakdown(store.state.player || {}, getCompletedPortalCount());
}

export function getCurrentRank(){
  return getRankForScore(getRankScore());
}

export function getNextRank(){
  return getNextRankForScore(getRankScore());
}

export function getRankProgress(){
  return getRankProgressForScore(getRankScore());
}

export function getLeaderboardRows(){
  return buildLeaderboardRows(store.state.player || {}, getCompletedPortalCount())
    .sort((a,b)=>b.points - a.points || b.level - a.level || a.pilot.localeCompare(b.pilot))
    .map((row,index)=>({...row, position:index+1}));
}

export function registerKill(kind){
  const player = store.state.player;
  player.totalKills = Math.max(0, Number(player.totalKills || 0)) + 1;
  if(!store.state.killStats || typeof store.state.killStats !== "object") store.state.killStats = {};
  store.state.killStats[kind || "unknown"] = Math.max(0, Number(store.state.killStats[kind || "unknown"] || 0)) + 1;
  player.rankScore = getRankScore();
}

export function getRequiredLevel(entity){ return Math.max(0, Number(entity?.unlockLevel ?? 1)); }
export function isUnlockedForPlayer(entity){ return true; }
export function getWeaponAverageDamage(item){
  if(!item.weapon) return 0;
  const upgradeBonus = getEquipmentUpgradeLevel(item.id) * 10;
  const min = Number(item.weapon.minDamage ?? item.weapon.damage ?? 0);
  const max = Number(item.weapon.maxDamage ?? item.weapon.damage ?? min);
  return (min + max) / 2 + upgradeBonus;
}

export function getAmmoCount(id){
  return Math.max(0, Number(store.state.ammoInventory?.[id] || 0));
}

export function addAmmo(id, amount){
  if(!getAmmo(id)) return 0;
  if(!store.state.ammoInventory) store.state.ammoInventory = {};
  store.state.ammoInventory[id] = getAmmoCount(id) + Math.max(0, Number(amount || 0));
  return store.state.ammoInventory[id];
}

export function consumeAmmo(id, amount){
  const need = Math.max(0, Number(amount || 0));
  if(getAmmoCount(id) < need) return false;
  store.state.ammoInventory[id] -= need;
  return true;
}

function isValidActionSlotItem(id){
  if(getAmmo(id)) return true;
  const item = getItem(id);
  return item.category === "extra";
}

export function setActionSlot(index, itemId){
  if(!store.state.actionSlots) store.state.actionSlots = Array(9).fill(null);
  if(index < 0 || index >= 9) return false;
  store.state.actionSlots[index] = itemId && isValidActionSlotItem(itemId) ? itemId : null;
  return true;
}

export function makeEmptyLoadout(shipId){
  const ship = getShip(shipId);
  return {lasers:Array(ship.stats.maxLasers).fill(null), generators:Array(ship.stats.maxGenerators).fill(null), extras:Array(ship.stats.maxExtras || 3).fill(null)};
}

export function cleanLoadout(shipId, raw){
  const ship = getShip(shipId);
  const lasers = Array.from({length:ship.stats.maxLasers}, (_,i)=>{
    const uid = raw?.lasers?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "canon" ? uid : null;
  });
  const generators = Array.from({length:ship.stats.maxGenerators}, (_,i)=>{
    const uid = raw?.generators?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "generateur" ? uid : null;
  });
  const extras = Array.from({length:ship.stats.maxExtras || 3}, (_,i)=>{
    const uid = raw?.extras?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "extra" ? uid : null;
  });
  return {lasers, generators, extras};
}

export function cleanDroneLoadout(raw, inventoryItems = store.state?.inventoryItems || []){
  const max = getDroneCatalog().maxOwned || 8;
  const source = Array.isArray(raw) ? raw : [];
  return Array.from({length:Math.min(max, source.length)}, (_,i)=>{
    const uid = source[i] ?? null;
    const item = uid ? getItemFromInventoryUidIn(uid, inventoryItems) : null;
    return uid && item && ["canon","generateur"].includes(item.category) ? uid : null;
  });
}

export function addInventoryItem(itemId){
  const item = getItem(itemId);
  if(!item) return null;
  const uid = `inv_${itemId}_${store.state.nextInventoryUid || 1}`;
  store.state.nextInventoryUid = (store.state.nextInventoryUid || 1) + 1;
  const entry = {uid, itemId};
  store.state.inventoryItems.push(entry);
  return entry;
}

export function getInventoryCount(itemId){
  return store.state.inventoryItems.filter(entry=>entry.itemId === itemId).length;
}

export function getDronePurchasePrice(index = store.state.ownedDroneCount){
  const drone = getDroneCatalog();
  return drone.basePrice * Math.pow(2, Math.max(0, Number(index || 0)));
}

export function getDroneLoadout(){
  const owned = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(store.state.ownedDroneCount || 0)));
  store.state.droneLoadout = Array.isArray(store.state.droneLoadout) ? store.state.droneLoadout : [];
  while(store.state.droneLoadout.length < owned) store.state.droneLoadout.push(null);
  store.state.droneLoadout = store.state.droneLoadout.slice(0, owned);
  return store.state.droneLoadout;
}

export function findEquippedSlot(uid){
  for(const shipId of Object.keys(store.state.shipLoadouts || {})){
    const loadout = getLoadout(shipId);
    const laserIndex = loadout?.lasers?.indexOf(uid) ?? -1;
    if(laserIndex >= 0) return {location:"ship", shipId, type:"laser", index:laserIndex};
    const generatorIndex = loadout?.generators?.indexOf(uid) ?? -1;
    if(generatorIndex >= 0) return {location:"ship", shipId, type:"generator", index:generatorIndex};
    const extraIndex = loadout?.extras?.indexOf(uid) ?? -1;
    if(extraIndex >= 0) return {location:"ship", shipId, type:"extra", index:extraIndex};
  }
  const drones = getDroneLoadout();
  const droneIndex = drones.indexOf(uid);
  if(droneIndex >= 0){
    const item = getItemFromInventoryUid(uid);
    return {location:"drone", type:item?.category === "canon" ? "laser" : "generator", index:droneIndex};
  }
  return null;
}

export function unequipInventoryItem(uid){
  const equipped = findEquippedSlot(uid);
  if(!equipped) return false;
  if(equipped.location === "drone"){
    getDroneLoadout()[equipped.index] = null;
    return true;
  }
  const loadout = getLoadout(equipped.shipId);
  if(equipped.type === "laser") loadout.lasers[equipped.index] = null;
  else if(equipped.type === "generator") loadout.generators[equipped.index] = null;
  else if(equipped.type === "extra") loadout.extras[equipped.index] = null;
  return true;
}

export function getInventoryByCategory(category){
  return store.state.inventoryItems
    .map(entry=>({...entry, item:getItem(entry.itemId), equipped:findEquippedSlot(entry.uid)}))
    .filter(entry=>entry.item.category === category);
}

export function getLoadout(shipId = store.state.activeShip){
  if(!store.state.shipLoadouts) store.state.shipLoadouts = {};
  store.state.shipLoadouts[shipId] = cleanLoadout(shipId, store.state.shipLoadouts[shipId] || makeEmptyLoadout(shipId));
  return store.state.shipLoadouts[shipId];
}

export function ensureShipLoadout(shipId){
  if(!store.state.shipLoadouts) store.state.shipLoadouts = {};
  if(!store.state.shipLoadouts[shipId]) store.state.shipLoadouts[shipId] = makeEmptyLoadout(shipId);
  store.state.shipLoadouts[shipId] = cleanLoadout(shipId, store.state.shipLoadouts[shipId]);
  return store.state.shipLoadouts[shipId];
}

export function normalizeState(saved){
  const base = clone(defaultState);
  const merged = {...base, ...(saved || {})};
  merged.player = {...base.player, ...(saved?.player || {})};
  merged.player.totalXp = Math.max(0, Number(merged.player.totalXp || 0));
  merged.player.totalKills = Math.max(0, Number(merged.player.totalKills || 0));
  enforcePlayerCurrencyMinimums(merged.player);
  merged.ownedShips = Array.isArray(saved?.ownedShips) ? saved.ownedShips.filter(id=>ships.some(s=>s.id===id)) : base.ownedShips;
  merged.ownedItems = Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)) : base.ownedItems;
  merged.inventoryItems = Array.isArray(saved?.inventoryItems)
    ? saved.inventoryItems.filter(entry=>entry?.uid && equipment.some(i=>i.id===entry.itemId))
    : (Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)).map((itemId,index)=>({uid:`inv_${itemId}_${index+1}`, itemId})) : clone(base.inventoryItems));
  if(!merged.inventoryItems.some(entry=>entry.itemId === "laser_mk1")) merged.inventoryItems.unshift({uid:"inv_laser_mk1_1", itemId:"laser_mk1"});
  merged.inventoryItems = dedupeInventoryUids(merged.inventoryItems);
  merged.nextInventoryUid = Math.max(
    Number(saved?.nextInventoryUid || base.nextInventoryUid || 1),
    getNextInventoryUid(merged.inventoryItems)
  );
  merged.unlockedSkills = Array.isArray(saved?.unlockedSkills) ? saved.unlockedSkills.filter(id=>skills.some(s=>s.id===id)) : base.unlockedSkills;
  merged.skillLevels = {...(base.skillLevels || {})};
  if(saved?.skillLevels && typeof saved.skillLevels === "object"){
    for(const skill of skills){
      merged.skillLevels[skill.id] = Math.max(0, Math.min(Number(skill.maxLevel || skill.levels.length || 0), Number(saved.skillLevels[skill.id] || 0)));
    }
  }
  // Migration légère de l'ancien système (liste de compétences débloquées) vers les nouvelles branches.
  if((!saved?.skillLevels || typeof saved.skillLevels !== "object") && Array.isArray(saved?.unlockedSkills) && saved.unlockedSkills.length){
    const legacyCount = saved.unlockedSkills.length;
    if(legacyCount >= 1) merged.skillLevels.damage = Math.min(1, skills.find(s=>s.id === "damage").maxLevel || 1);
    if(legacyCount >= 2) merged.skillLevels.shield = Math.min(1, skills.find(s=>s.id === "shield").maxLevel || 1);
    if(legacyCount >= 3) merged.skillLevels.utility = Math.min(1, skills.find(s=>s.id === "utility").maxLevel || 1);
  }
  merged.ammoInventory = {...base.ammoInventory};
  if(saved?.ammoInventory && typeof saved.ammoInventory === "object"){
    for(const ammo of ammoTypes) merged.ammoInventory[ammo.id] = Math.max(0, Number(saved.ammoInventory[ammo.id] || 0));
  }
  merged.actionSlots = Array.from({length:9}, (_,i)=>{
    const value = Array.isArray(saved?.actionSlots) ? saved.actionSlots[i] : base.actionSlots[i];
    return value && (ammoTypes.some(a=>a.id === value) || equipment.some(item=>item.id === value && item.category === "extra")) ? value : null;
  });
  merged.slotKeybinds = normalizeSlotKeybinds(saved?.slotKeybinds || base.slotKeybinds);
  merged.portalPieces = {...(base.portalPieces || {})};
  if(saved?.portalPieces && typeof saved.portalPieces === "object") for(const key of Object.keys(base.portalPieces || {})) merged.portalPieces[key] = Math.max(0, Number(saved.portalPieces[key] || 0));
  merged.unlockedPortals = Array.isArray(saved?.unlockedPortals) ? saved.unlockedPortals.filter(id=>portals.some(p=>p.id === id)) : clone(base.unlockedPortals || []);
  merged.completedPortals = saved?.completedPortals && typeof saved.completedPortals === "object" ? {...saved.completedPortals} : {...(base.completedPortals || {})};
  merged.killStats = saved?.killStats && typeof saved.killStats === "object" ? {...saved.killStats} : {};
  merged.cargoHold = {...(base.cargoHold || {})};
  if(saved?.cargoHold && typeof saved.cargoHold === "object"){
    for(const mat of rawMaterialCatalog) merged.cargoHold[mat.id] = Math.max(0, Number(saved.cargoHold[mat.id] || 0));
    if(!Object.keys(saved.cargoHold).some(id=>rawMaterialCatalog.some(mat=>mat.id === id))){
      merged.cargoHold.cuivre_orbital = Math.max(0, Number(saved.cargoHold.ferraille || 0));
      merged.cargoHold.zinc_spatial = Math.max(0, Number(saved.cargoHold.cristal || 0));
      merged.cargoHold.titane_fissure = Math.max(0, Number(saved.cargoHold.plasma || 0));
      merged.cargoHold.conducteur_renforce = Math.max(0, Number(saved.cargoHold.alliage || 0));
      merged.cargoHold.blindage_composite = Math.max(0, Number(saved.cargoHold.noyau || 0));
    }
    if(saved.cargoHold.carbone_dense && !merged.cargoHold.silice_conductrice){
      merged.cargoHold.silice_conductrice = Math.max(0, Number(saved.cargoHold.carbone_dense || 0));
    }
  }
  merged.shipCargo = {};
  if(saved?.shipCargo && typeof saved.shipCargo === "object"){
    for(const ship of ships){
      const savedCargo = saved.shipCargo[ship.id];
      merged.shipCargo[ship.id] = {};
      for(const material of rawMaterialCatalog){
        merged.shipCargo[ship.id][material.id] = Math.max(0, Number(savedCargo?.[material.id] || 0));
      }
    }
  }
  merged.refineryLevels = {};
  for(const mat of rawMaterialCatalog){
    const max = Number(mat.maxLevel || 20);
    const fallback = getDefaultRefineryLevel(mat.id);
    merged.refineryLevels[mat.id] = Math.max(0, Math.min(max, Number(saved?.refineryLevels?.[mat.id] ?? base.refineryLevels?.[mat.id] ?? fallback)));
  }
  merged.refineryProductionDisabled = {};
  for(const mat of rawMaterialCatalog){
    merged.refineryProductionDisabled[mat.id] = Boolean(saved?.refineryProductionDisabled?.[mat.id]);
  }
  merged.refineryModules = {...(base.refineryModules || {})};
  for(const id of Object.keys(REFINERY_MODULES)){
    const def = REFINERY_MODULES[id];
    merged.refineryModules[id] = Math.max(1, Math.min(def.maxLevel, Number(saved?.refineryModules?.[id] ?? base.refineryModules?.[id] ?? 1)));
  }
  merged.refineryUpgradeJobs = {};
  if(saved?.refineryUpgradeJobs && typeof saved.refineryUpgradeJobs === "object"){
    for(const [key, job] of Object.entries(saved.refineryUpgradeJobs)){
      if(!job || typeof job !== "object") continue;
      const type = job.type === "module" ? "module" : job.type === "material" ? "material" : null;
      if(!type) continue;
      if(type === "material" && !getRawMaterial(job.id)) continue;
      if(type === "module" && !REFINERY_MODULES[job.id]) continue;
      const startedAt = Number(job.startedAt || Date.now());
      const endsAt = Number(job.endsAt || startedAt);
      if(endsAt <= 0) continue;
      merged.refineryUpgradeJobs[key] = {
        type,
        id:job.id,
        name:String(job.name || job.id),
        fromLevel:Math.max(0, Number(job.fromLevel || 0)),
        toLevel:Math.max(1, Number(job.toLevel || 1)),
        startedAt,
        endsAt,
        duration:Math.max(1, Number(job.duration || endsAt - startedAt || 1))
      };
    }
  }
  merged.refineryLastTick = Math.max(0, Number(saved?.refineryLastTick || Date.now()));
  merged.refineryShipmentJob = null;
  if(saved?.refineryShipmentJob && typeof saved.refineryShipmentJob === "object"){
    const job = saved.refineryShipmentJob;
    const material = getRawMaterial(job.materialId);
    const ship = getShip(job.shipId);
    if(material && canShipRefineryMaterial(material.id) && ship){
      const startedAt = Number(job.startedAt || Date.now());
      const endsAt = Number(job.endsAt || startedAt);
      merged.refineryShipmentJob = {
        materialId:material.id,
        materialName:String(job.materialName || material.name),
        shipId:ship.id,
        shipName:String(job.shipName || ship.name),
        amount:Math.max(1, Math.ceil(Number(job.amount || 1))),
        credits:Math.max(0, Math.ceil(Number(job.credits || 0))),
        startedAt,
        endsAt,
        duration:Math.max(1, Number(job.duration || endsAt - startedAt || 1))
      };
    }
  }
  merged.refineryJob = saved?.refineryJob && typeof saved.refineryJob === "object" ? {...saved.refineryJob} : base.refineryJob;
  merged.equipmentUpgrades = saved?.equipmentUpgrades && typeof saved.equipmentUpgrades === "object" ? {...saved.equipmentUpgrades} : {...(base.equipmentUpgrades || {})};
  const savedActiveQuestIds = Array.isArray(saved?.activeQuestIds) ? saved.activeQuestIds : [];
  const legacyActiveQuestId = getQuest(saved?.activeQuestId)?.id || null;
  merged.activeQuestIds = [...new Set([...savedActiveQuestIds, legacyActiveQuestId].filter(id=>getQuest(id) && !saved?.completedQuestClaims?.[id]))].slice(0, MAX_ACTIVE_QUESTS);
  merged.activeQuestId = merged.activeQuestIds.includes(legacyActiveQuestId) ? legacyActiveQuestId : (merged.activeQuestIds[0] || base.activeQuestId);
  merged.questProgress = saved?.questProgress && typeof saved.questProgress === "object" ? {...saved.questProgress} : {...(base.questProgress || {})};
  merged.completedQuestClaims = saved?.completedQuestClaims && typeof saved.completedQuestClaims === "object" ? {...saved.completedQuestClaims} : {...(base.completedQuestClaims || {})};
  merged.uiLayout = {...(base.uiLayout || {})};
  if(saved?.uiLayout && typeof saved.uiLayout === "object"){
    merged.uiLayout = {...merged.uiLayout, ...saved.uiLayout};
  }
  merged.ownedDroneCount = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(saved?.ownedDroneCount ?? base.ownedDroneCount ?? 0)));
  merged.droneLoadout = cleanDroneLoadout(saved?.droneLoadout || base.droneLoadout || [], merged.inventoryItems);
  while(merged.droneLoadout.length < merged.ownedDroneCount) merged.droneLoadout.push(null);
  const starterShipId = "orion";
  if(!merged.ownedShips.includes(starterShipId)) merged.ownedShips.unshift(starterShipId);
  if(!merged.ownedItems.includes("laser_mk1")) merged.ownedItems.unshift("laser_mk1");
  if(merged.activeShip !== null && (!ships.some(s=>s.id===merged.activeShip) || !merged.ownedShips.includes(merged.activeShip))) merged.activeShip = starterShipId;
  if(!ships.some(s=>s.id===merged.selectedShip) || !merged.ownedShips.includes(merged.selectedShip)) merged.selectedShip = merged.activeShip;
  if(!merged.selectedShip) merged.selectedShip = starterShipId;
  merged.shipLoadouts = saved?.shipLoadouts && typeof saved.shipLoadouts === "object" ? saved.shipLoadouts : clone(base.shipLoadouts);
  if(Object.keys(merged.shipLoadouts).length === 0 && Array.isArray(saved?.slots)){
    merged.shipLoadouts[merged.activeShip] = {
      lasers: saved.slots.filter(id=>id && equipment.find(i=>i.id===id)?.category === "canon"),
      generators: [],
      extras: []
    };
  }
  store.state = merged;
  migrateLoadoutItemIds();
  for(const shipId of merged.ownedShips) ensureShipLoadout(shipId);
  getDroneLoadout();
  merged.player.rankScore = getRankScore();
  return merged;
}

function dedupeInventoryUids(items){
  const used = new Set();
  let next = 1;
  return items.map(entry=>{
    let uid = typeof entry.uid === "string" && entry.uid ? entry.uid : "";
    if(!uid || used.has(uid)){
      do{
        uid = `inv_${entry.itemId}_${next++}`;
      }while(used.has(uid));
    }
    used.add(uid);
    return {...entry, uid};
  });
}

function getNextInventoryUid(items){
  const maxSuffix = items.reduce((max, entry)=>{
    const match = String(entry.uid || "").match(/_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return Math.max(items.length + 1, maxSuffix + 1);
}

function migrateLoadoutItemIds(){
  const used = new Set();
  for(const shipId of Object.keys(store.state.shipLoadouts || {})){
    const raw = store.state.shipLoadouts[shipId] || {};
    for(const part of ["lasers", "generators", "extras"]){
      raw[part] = (raw[part] || []).map(value=>{
        if(!value) return null;
        if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
        const item = getItem(value);
        if(!item) return null;
        let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
        if(!entry) entry = addInventoryItem(value);
        used.add(entry.uid);
        return entry.uid;
      });
    }
  }
  store.state.droneLoadout = (store.state.droneLoadout || []).map(value=>{
    if(!value) return null;
    if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
    const item = getItem(value);
    if(!item || !["canon","generateur"].includes(item.category)) return null;
    let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
    if(!entry) entry = addInventoryItem(value);
    used.add(entry.uid);
    return entry.uid;
  });
}

export function loadState(){
  try{
    const raw = localStorage.getItem("voidsector-prototype-state");
    return normalizeState(raw ? JSON.parse(raw) : null);
  }catch(e){
    return normalizeState(null);
  }
}

export function saveState(){
  if(globalThis.__voidsectorResetInProgress) return;
  if(store.state.player) store.state.player.rankScore = getRankScore();
  enforcePlayerCurrencyMinimums();
  localStorage.setItem("voidsector-prototype-state", JSON.stringify(store.state));
}

export function getSkillBonus(){
  const bonus = {};
  for(const skill of skills){
    const level = getSkillLevel(skill.id);
    for(let i=0;i<level;i++){
      const stats = skill.levels?.[i]?.stats || {};
      for(const [k,v] of Object.entries(stats)) bonus[k] = (bonus[k] || 0) + v;
    }
  }
  return bonus;
}

export function getEquippedGenerators(shipId = store.state.activeShip){
  return getLoadout(shipId).generators.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedExtras(shipId = store.state.activeShip){
  return getLoadout(shipId).extras.map(getItemFromInventoryUid).filter(Boolean);
}

export function getExtraBonus(shipId = store.state.activeShip){
  const skill = getSkillBonus();
  const bonus = {
    autoRocket:false,
    rocketCooldownMultiplier:1,
    rocketDamageBonus:0,
    repairBot:false,
    repairBotAuto:false,
    repairBotHealRate:0.02,
    repairBotDelay:Math.max(6, 15 - Math.max(0, Number(skill.repairBotDelayReduction || 0)))
  };
  for(const item of getEquippedExtras(shipId)){
    const effect = item.effect || {};
    if(effect.autoRocket) bonus.autoRocket = true;
    if(effect.rocketCooldownMultiplier) bonus.rocketCooldownMultiplier *= effect.rocketCooldownMultiplier;
    if(effect.rocketDamageBonus) bonus.rocketDamageBonus += effect.rocketDamageBonus;
    if(effect.repairBot) bonus.repairBot = true;
    if(effect.repairBotAuto) bonus.repairBotAuto = true;
    if(effect.repairBotHealRate) bonus.repairBotHealRate = Math.max(bonus.repairBotHealRate, effect.repairBotHealRate);
    if(effect.repairBotDelay) bonus.repairBotDelay = Math.max(1, Math.min(bonus.repairBotDelay, effect.repairBotDelay));
  }
  bonus.rocketCooldownMultiplier = Math.max(0.25, bonus.rocketCooldownMultiplier);
  return bonus;
}

export function getRealSpeedFromStat(vitesse){
  return Math.round(120 + Number(vitesse || 0) * 2.15);
}

export function getEquippedLasers(shipId = store.state.activeShip){
  return getLoadout(shipId).lasers.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedDroneItems(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedDroneLasers(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "canon");
}

export function getEquippedDroneGenerators(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "generateur");
}

export function getShipCombatStats(shipId = store.state.activeShip){
  const ship = getShip(shipId);
  const skill = getSkillBonus();
  const generators = [...getEquippedGenerators(shipId), ...getEquippedDroneGenerators()];
  const shieldFromGenerators = generators.reduce((sum, item)=>sum + (item.stats.bouclier || 0) + (item.stats.bouclier ? getEquipmentUpgradeLevel(item.id) * 30 : 0), 0);
  const regen = generators.reduce((sum, item)=>sum + (item.stats.regen || 0) + (item.stats.regen ? getEquipmentUpgradeLevel(item.id) : 0), 0);
  const generatorSpeed = generators.reduce((sum, item)=>sum + (item.stats.vitesse || 0) + (item.stats.vitesse ? getEquipmentUpgradeLevel(item.id) * 2 : 0), 0);
  const vitesse = ship.stats.vitesse + (skill.vitesse || 0) + generatorSpeed;
  return {
    vie: ship.stats.vie + (skill.vie || 0),
    vitesse,
    vitesseReelle:getRealSpeedFromStat(vitesse),
    cargo: ship.stats.cargo + (skill.cargo || 0),
    maxLasers: ship.stats.maxLasers,
    maxGenerators: ship.stats.maxGenerators,
    maxExtras:ship.stats.maxExtras || 3,
    droneCount: getDroneLoadout().length,
    bouclier: shieldFromGenerators > 0 ? shieldFromGenerators + (skill.shieldBonus || 0) : 0,
    regen: regen + (skill.regen || 0),
    weaponDamage: skill.weaponDamage || 0,
    weaponDamagePercent: skill.weaponDamagePercent || 0,
    shieldAbsorbRatio: Math.max(0, Math.min(0.9, 0.5 + Number(skill.shieldAbsorbBonus || 0))),
    extraBonus:getExtraBonus(shipId)
  };
}

export function addXP(amount){
  const gain = Math.max(0, Number(amount || 0));
  store.state.player.xp += gain;
  store.state.player.totalXp = Math.max(0, Number(store.state.player.totalXp || 0)) + gain;
  let leveled = false;
  while(store.state.player.xp >= store.state.player.xpNext){
    store.state.player.xp -= store.state.player.xpNext;
    store.state.player.level += 1;
    store.state.player.skillPoints += 1;
    store.state.player.xpNext = Math.round(store.state.player.xpNext * 1.35 + 50);
    leveled = true;
  }
  store.state.player.rankScore = getRankScore();
  return leveled;
}


