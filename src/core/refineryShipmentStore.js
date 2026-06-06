import { rawMaterialCatalog, refineryRecipes } from "../data/catalog.js";
import { addMaterial, addShipCargoMaterial, consumeMaterial, consumeShipCargoMaterial, getMaterialCount, getShipCargo, getShipCargoCapacity, getShipCargoUsed } from "./cargoStore.js";
import { enforcePlayerCurrencyMinimums, getRawMaterial, getShip, store } from "./store.js";
import {
  REFINERY_MODULES,
  REFINERY_RUSH_NOVA_PER_MINUTE,
  REFINERY_SHIPMENT_BLOCKED,
  REFINERY_SHIPMENT_CREDIT_RATE,
  REFINERY_SHIPMENT_MATERIALS_PER_MINUTE,
  interpolateRounded,
  refineryLevelProgress
} from "./refineryRules.js";

function getRefineryModuleLevel(id){
  const def = REFINERY_MODULES[id];
  if(!def) return 0;
  return Math.max(1, Math.min(def.maxLevel, Number(store.state?.refineryModules?.[id] || 1)));
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
