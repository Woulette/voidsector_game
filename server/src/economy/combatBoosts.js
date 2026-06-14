import {
  COMBAT_BOOST_TARGETS,
  getCombatBoostStoreField,
  getCombatBoostTargetMaterialInfo,
  getCombatBoostUnitAmount,
  normalizeCombatBoostTarget
} from "../../../src/data/combatBoosts.js";
import { consumeShipCargoMaterial, getShip } from "./refineryProfile.js";

function getEntryRemaining(entry, target, now = Date.now()){
  const field = getCombatBoostStoreField(target);
  if(field === "charges") return Math.max(0, Math.floor(Number(entry?.charges || 0)));
  return Math.max(0, (Number(entry?.expiresAt || 0) - now) / 1000);
}

export function sanitizeCombatBoosts(value, now = Date.now()){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const boosts = {};
  for(const target of COMBAT_BOOST_TARGETS){
    boosts[target] = {};
    const entries = source[target];
    if(!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    for(const [materialId, entry] of Object.entries(entries)){
      const info = getCombatBoostTargetMaterialInfo(target, materialId);
      if(!info || !entry || typeof entry !== "object") continue;
      const charges = Math.max(0, Math.floor(Number(entry.charges || 0)));
      const legacySeconds = Math.max(0, Number(entry.seconds || 0));
      const expiresAt = Math.max(0, Number(entry.expiresAt || (legacySeconds > 0 ? now + legacySeconds * 1000 : 0)));
      if(charges <= 0 && expiresAt <= now) continue;
      boosts[target][materialId] = {
        materialId,
        percent:info.percent,
        charges,
        expiresAt
      };
    }
  }
  return boosts;
}

function ensureCombatBoosts(profile, now = Date.now()){
  profile.combatBoosts = sanitizeCombatBoosts(profile.combatBoosts, now);
  return profile.combatBoosts;
}

function getBestBoostEntry(profile, target, now = Date.now()){
  const normalized = normalizeCombatBoostTarget(target);
  if(!normalized) return null;
  return Object.values(ensureCombatBoosts(profile, now)[normalized] || {})
    .filter(entry=>getEntryRemaining(entry, normalized, now) > 0)
    .sort((a,b)=>Number(b.percent || 0) - Number(a.percent || 0))[0] || null;
}

export function depositServerCombatBoostMaterial(profile, {target, materialId, amount = 1, shipId = profile.activeShip, now = Date.now()} = {}){
  const normalized = normalizeCombatBoostTarget(target);
  const info = getCombatBoostTargetMaterialInfo(normalized, materialId);
  const ship = getShip(String(shipId || ""));
  if(!ship) return {ok:false, reason:"Aucun vaisseau equipe."};
  if(!info) return {ok:false, reason:"Ce materiau ne peut pas etre utilise dans ce slot."};
  const count = Math.max(1, Math.floor(Number(amount || 1)));
  if(!consumeShipCargoMaterial(profile, materialId, count, ship.id)){
    return {ok:false, reason:"Quantite insuffisante dans la soute."};
  }
  const boosts = ensureCombatBoosts(profile, now);
  const field = getCombatBoostStoreField(normalized);
  const slot = boosts[normalized][materialId] || {materialId, percent:info.percent, charges:0, expiresAt:0};
  const added = count * getCombatBoostUnitAmount(normalized);
  slot.percent = info.percent;
  if(field === "charges") slot.charges = Math.max(0, Number(slot.charges || 0)) + added;
  else slot.expiresAt = Math.max(now, Number(slot.expiresAt || 0)) + added * 1000;
  boosts[normalized][materialId] = slot;
  return {
    ok:true,
    target:normalized,
    materialId,
    materialName:info.name,
    amount:count,
    added,
    field,
    percent:info.percent,
    shipId:ship.id
  };
}

export function consumeServerCombatBoostCharges(profile, target, amount = 1, now = Date.now()){
  const normalized = normalizeCombatBoostTarget(target);
  if(!["laser", "rocket"].includes(normalized)) return 0;
  const entry = getBestBoostEntry(profile, normalized, now);
  if(!entry) return 0;
  entry.charges = Math.max(0, Number(entry.charges || 0) - Math.max(1, Number(amount || 1)));
  return Math.max(0, Number(entry.percent || 0));
}

export function getServerCombatTimedBoostPercent(profile, target, now = Date.now()){
  const normalized = normalizeCombatBoostTarget(target);
  if(!["generator", "drone"].includes(normalized)) return 0;
  const entry = getBestBoostEntry(profile, normalized, now);
  return entry ? Math.max(0, Number(entry.percent || 0)) : 0;
}
