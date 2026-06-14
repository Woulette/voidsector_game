import { consumeShipCargoMaterial, getShipCargo } from "./cargoStore.js";
import { store } from "./store.js";
import {
  COMBAT_BOOST_DEFS,
  getCombatBoostMaterialInfo,
  getCombatBoostStoreField,
  getCombatBoostTargetMaterialInfo,
  getCombatBoostUnitAmount,
  normalizeCombatBoostTarget
} from "../data/combatBoosts.js";

export {
  COMBAT_BOOST_DEFS,
  getCombatBoostMaterialInfo,
  getCombatBoostTargetMaterialInfo,
  normalizeCombatBoostTarget
} from "../data/combatBoosts.js";

function ensureCombatBoosts(){
  if(!store.state.combatBoosts || typeof store.state.combatBoosts !== "object"){
    store.state.combatBoosts = {};
  }
  for(const target of ["laser", "rocket", "generator", "drone"]){
    if(!store.state.combatBoosts[target] || typeof store.state.combatBoosts[target] !== "object"){
      store.state.combatBoosts[target] = {};
    }
  }
  return store.state.combatBoosts;
}

export function getCombatBoostTooltip(materialId){
  const def = getCombatBoostMaterialInfo(materialId);
  if(!def) return "";
  const parts = [];
  if(def.targets.laser) parts.push(`Laser +${Math.round(def.targets.laser.percent * 100)}% degats, 1 materiau = 10 tirs`);
  if(def.targets.rocket) parts.push(`Roquettes +${Math.round(def.targets.rocket.percent * 100)}% degats, 1 materiau = 1 tir`);
  if(def.targets.generator) parts.push(`Generateurs +${Math.round(def.targets.generator.percent * 100)}%, 1 materiau = 1 min`);
  if(def.targets.drone) parts.push(`Drones +${Math.round(def.targets.drone.percent * 100)}%, 1 materiau = 1 min`);
  return parts.join(" | ");
}

export function depositCombatBoostMaterial(target, materialId, amount = 1, shipId = store.state.activeShip){
  const normalized = normalizeCombatBoostTarget(target);
  const info = getCombatBoostTargetMaterialInfo(normalized, materialId);
  if(!info) return {ok:false, reason:"Ce materiau ne peut pas etre utilise dans ce slot."};
  const count = Math.max(1, Math.floor(Number(amount || 1)));
  const cargo = getShipCargo(shipId);
  if(Math.max(0, Number(cargo[materialId] || 0)) < count) return {ok:false, reason:"Quantite insuffisante dans la soute."};
  if(!consumeShipCargoMaterial(materialId, count, shipId)) return {ok:false, reason:"Quantite insuffisante dans la soute."};
  const boosts = ensureCombatBoosts();
  const field = getCombatBoostStoreField(normalized);
  const slot = boosts[normalized][materialId] || {materialId, percent:info.percent, charges:0, seconds:0};
  slot.percent = info.percent;
  slot[field] = Math.max(0, Number(slot[field] || 0)) + count * getCombatBoostUnitAmount(normalized);
  boosts[normalized][materialId] = slot;
  return {ok:true, target:normalized, materialId, materialName:info.name, amount:count, added:count * getCombatBoostUnitAmount(normalized), field, percent:info.percent};
}

function getEntryRemaining(entry, target){
  const field = getCombatBoostStoreField(target);
  if(field === "charges") return Math.max(0, Number(entry?.charges || 0));
  if(Number(entry?.expiresAt || 0) > 0) return Math.max(0, (Number(entry.expiresAt) - Date.now()) / 1000);
  return Math.max(0, Number(entry?.seconds || 0));
}

function getBestBoostEntry(target){
  const boosts = ensureCombatBoosts()[target] || {};
  return Object.values(boosts)
    .filter(entry=>getEntryRemaining(entry, target) > 0)
    .sort((a,b)=>Number(b.percent || 0) - Number(a.percent || 0))[0] || null;
}

export function consumeCombatBoostCharges(target, amount = 1){
  const normalized = normalizeCombatBoostTarget(target);
  if(!["laser", "rocket"].includes(normalized)) return 0;
  const entry = getBestBoostEntry(normalized);
  if(!entry) return 0;
  entry.charges = Math.max(0, Number(entry.charges || 0) - Math.max(1, Number(amount || 1)));
  return Math.max(0, Number(entry.percent || 0));
}

export function getCombatTimedBoostPercent(target){
  const normalized = normalizeCombatBoostTarget(target);
  if(!["generator", "drone"].includes(normalized)) return 0;
  const entry = getBestBoostEntry(normalized);
  return entry ? Math.max(0, Number(entry.percent || 0)) : 0;
}

export function tickCombatBoosts(dt){
  const boosts = ensureCombatBoosts();
  let changed = false;
  for(const target of ["generator", "drone"]){
    for(const entry of Object.values(boosts[target] || {})){
      if(Number(entry.expiresAt || 0) > 0) continue;
      const before = Math.max(0, Number(entry.seconds || 0));
      if(before <= 0) continue;
      entry.seconds = Math.max(0, before - Math.max(0, Number(dt || 0)));
      if(entry.seconds !== before) changed = true;
    }
  }
  return changed;
}

export function getCombatBoostSummary(target){
  const normalized = normalizeCombatBoostTarget(target);
  const boosts = ensureCombatBoosts()[normalized] || {};
  const field = getCombatBoostStoreField(normalized);
  const entry = getBestBoostEntry(normalized);
  return {
    target:normalized,
    materialId:entry?.materialId || null,
    percent:entry ? Math.max(0, Number(entry.percent || 0)) : 0,
    remaining:entry ? getEntryRemaining(entry, normalized) : 0,
    field,
    entries:Object.values(boosts)
  };
}
