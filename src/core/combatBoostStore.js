import { consumeShipCargoMaterial, getShipCargo } from "./cargoStore.js";
import { store } from "./store.js";

export const COMBAT_BOOST_DEFS = {
  alliage_cuivre_zinc:{
    name:"Alliage",
    targets:{laser:{percent:0.10}, rocket:{percent:0.10}}
  },
  plaque_nickel_titane:{
    name:"Plaque",
    targets:{generator:{percent:0.10}, drone:{percent:0.10}}
  },
  conducteur_renforce:{
    name:"Conducteur",
    targets:{laser:{percent:0.25}, rocket:{percent:0.25}}
  },
  blindage_composite:{
    name:"Blindage",
    targets:{generator:{percent:0.25}, drone:{percent:0.25}}
  },
  noyau_astra:{
    name:"Noyau Astra",
    targets:{laser:{percent:0.50}, rocket:{percent:0.50}, generator:{percent:0.40}, drone:{percent:0.40}}
  }
};

const TARGET_ALIASES = {
  laser:"laser",
  Laser:"laser",
  Roquettes:"rocket",
  rocket:"rocket",
  Generateurs:"generator",
  "Générateurs":"generator",
  generator:"generator",
  Drones:"drone",
  drone:"drone"
};

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

export function normalizeCombatBoostTarget(target){
  return TARGET_ALIASES[target] || TARGET_ALIASES[String(target || "").toLowerCase()] || "";
}

export function getCombatBoostMaterialInfo(materialId){
  return COMBAT_BOOST_DEFS[materialId] || null;
}

export function getCombatBoostTargetMaterialInfo(target, materialId){
  const normalized = normalizeCombatBoostTarget(target);
  const def = getCombatBoostMaterialInfo(materialId);
  const targetDef = def?.targets?.[normalized];
  return targetDef ? {...targetDef, target:normalized, materialId, name:def.name} : null;
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

function getUnitAmountForTarget(target){
  if(target === "laser") return 10;
  if(target === "rocket") return 1;
  return 60;
}

function getStoreFieldForTarget(target){
  return target === "laser" || target === "rocket" ? "charges" : "seconds";
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
  const field = getStoreFieldForTarget(normalized);
  const slot = boosts[normalized][materialId] || {materialId, percent:info.percent, charges:0, seconds:0};
  slot.percent = info.percent;
  slot[field] = Math.max(0, Number(slot[field] || 0)) + count * getUnitAmountForTarget(normalized);
  boosts[normalized][materialId] = slot;
  return {ok:true, target:normalized, materialId, materialName:info.name, amount:count, added:count * getUnitAmountForTarget(normalized), field, percent:info.percent};
}

function getBestBoostEntry(target){
  const boosts = ensureCombatBoosts()[target] || {};
  const field = getStoreFieldForTarget(target);
  return Object.values(boosts)
    .filter(entry=>Math.max(0, Number(entry[field] || 0)) > 0)
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
  const field = getStoreFieldForTarget(normalized);
  const entry = getBestBoostEntry(normalized);
  return {
    target:normalized,
    materialId:entry?.materialId || null,
    percent:entry ? Math.max(0, Number(entry.percent || 0)) : 0,
    remaining:entry ? Math.max(0, Number(entry[field] || 0)) : 0,
    field,
    entries:Object.values(boosts)
  };
}
