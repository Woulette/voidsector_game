import { refineryRecipes } from "../../../src/data/catalog.js";
import { isPremiumActive, PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER } from "../../../src/data/premium.js";
import { spendCurrency } from "../players/progression.js";
import {
  REFINERY_MODULES,
  REFINERY_RUSH_NOVA_PER_MINUTE,
  REFINERY_SHIPMENT_BLOCKED,
  REFINERY_SHIPMENT_CREDIT_RATE,
  REFINERY_SHIPMENT_MATERIALS_PER_MINUTE,
  interpolateRounded
} from "./refineryRules.js";
import {
  addMaterial,
  addShipCargoMaterial,
  consumeMaterial,
  consumeShipCargoMaterial,
  getMaterialCount,
  getRawMaterial,
  getRefineryModuleLevel,
  getShip,
  getShipCargo,
  getShipCargoCapacity,
  getShipCargoUsed
} from "./refineryProfile.js";

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

function getRefineryShipmentDuration(amount, profile = null){
  const safeAmount = Math.max(1, Math.ceil(Number(amount || 0)));
  const baseDuration = Math.max(1000, Math.ceil(safeAmount * 60000 / REFINERY_SHIPMENT_MATERIALS_PER_MINUTE));
  const multiplier = isPremiumActive(profile?.player) ? PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER : 1;
  return Math.max(1000, Math.ceil(baseDuration * multiplier));
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
  const duration = getRefineryShipmentDuration(safeAmount, profile);
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
  return {ok:true, cost:spend.cost, baseCost:cost, materialName:job.materialName, amount:job.amount};
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
