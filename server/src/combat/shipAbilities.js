import {
  getShipAbilityDefinition,
  getShipAbilityDefinitions,
  getShipAbilityStatus,
  normalizeShipAbilityState
} from "../../../src/shared/shipAbilities.js";

function ensureAbilityStates(profile){
  if(!profile.shipAbilityStates || typeof profile.shipAbilityStates !== "object" || Array.isArray(profile.shipAbilityStates)){
    profile.shipAbilityStates = {};
  }
  return profile.shipAbilityStates;
}

function getStoredAbilityState(shipState, abilityId){
  if(shipState && typeof shipState === "object" && !Array.isArray(shipState)){
    if(Object.hasOwn(shipState, "activeUntil") || Object.hasOwn(shipState, "cooldownUntil")) return shipState;
    if(shipState[abilityId] && typeof shipState[abilityId] === "object") return shipState[abilityId];
  }
  return {};
}

export function getMutableShipAbilityState(profile, shipId, abilityId){
  if(!profile || !shipId || !abilityId) return null;
  const states = ensureAbilityStates(profile);
  const current = states[shipId];
  if(current && typeof current === "object" && !Array.isArray(current)){
    if(Object.hasOwn(current, "activeUntil") || Object.hasOwn(current, "cooldownUntil")){
      states[shipId] = {[abilityId]:current};
      return states[shipId][abilityId];
    }
    if(!current[abilityId] || typeof current[abilityId] !== "object" || Array.isArray(current[abilityId])){
      current[abilityId] = {};
    }
    return current[abilityId];
  }
  states[shipId] = {[abilityId]:{}};
  return states[shipId][abilityId];
}

function storeAbilityState(states, shipId, abilityId, next){
  const shipState = states[shipId];
  const nested = shipState && typeof shipState === "object" && !Array.isArray(shipState)
    && !Object.hasOwn(shipState, "activeUntil")
    && !Object.hasOwn(shipState, "cooldownUntil")
    ? shipState
    : {};
  states[shipId] = {...nested, [abilityId]:next};
}

export function activateServerShipAbility({player, profile, abilityId = "", now = Date.now()} = {}){
  if(!player?.state || !profile) return {ok:false, reason:"Vaisseau actif introuvable."};
  const shipId = String(profile.activeShip || player.state.shipId || "");
  const definition = getShipAbilityDefinition(shipId, abilityId);
  if(!definition) return {ok:false, reason:"Ce vaisseau ne possède aucune compétence active."};
  if(String(player.state.shipId || "") !== shipId) return {ok:false, reason:"Synchronisation du vaisseau en cours."};
  if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.includes(shipId)){
    return {ok:false, reason:"Vaisseau non possédé."};
  }
  const states = ensureAbilityStates(profile);
  const previous = normalizeShipAbilityState(getStoredAbilityState(states[shipId], definition.id));
  if(previous.cooldownUntil > now){
    return {
      ok:false,
      reason:`${definition.name} en recharge : ${Math.ceil((previous.cooldownUntil - now) / 1000)} s.`,
      status:getShipAbilityStatus(shipId, previous, now, definition.id)
    };
  }
  const next = {
    activeUntil:now + definition.durationMs,
    cooldownUntil:now + definition.cooldownMs
  };
  if(definition.effectType === "laser_double_strike" && Number(definition.chargeMs || 0) > 0){
    next.chargeStartedAt = now;
    next.chargeReadyAt = now + Math.max(1, Number(definition.chargeMs || 0));
  }
  storeAbilityState(states, shipId, definition.id, next);
  return {
    ok:true,
    changed:true,
    status:getShipAbilityStatus(shipId, next, now, definition.id)
  };
}

export function applyServerShipLifeSteal({player, profile, damageDealt, weaponClass = "", now = Date.now()} = {}){
  if(!player?.state || !profile || Number(player.state.hp || 0) <= 0) return {healed:0};
  const shipId = String(profile.activeShip || player.state.shipId || "");
  if(String(player.state.shipId || "") !== shipId) return {healed:0};
  const definitions = getShipAbilityDefinitions(shipId);
  if(!definitions.length) return {healed:0};
  const shipState = profile.shipAbilityStates?.[shipId];
  const definition = definitions.find(candidate=>{
    if(Number(candidate.lifeStealRatio || 0) <= 0) return false;
    if(candidate.weaponClass && candidate.weaponClass !== String(weaponClass || "")) return false;
    return getShipAbilityStatus(shipId, shipState, now, candidate.id).active;
  });
  if(!definition) return {healed:0};
  const status = getShipAbilityStatus(shipId, shipState, now, definition.id);
  const maximum = Math.max(1, Number(player.state.maxHp || player.state.hp || 1));
  const before = Math.max(0, Number(player.state.hp || 0));
  const requested = Math.max(0, Math.round(Number(damageDealt || 0) * definition.lifeStealRatio));
  player.state.hp = Math.min(maximum, before + requested);
  player.state.updatedAt = now;
  return {
    healed:Math.max(0, Math.round(player.state.hp - before)),
    requested,
    status
  };
}

export function applyServerLaserDoubleStrike({
  player,
  profile,
  weaponClass = "",
  hit = false,
  damage = 0,
  now = Date.now()
} = {}){
  if(!player?.state || !profile || String(weaponClass || "") !== "laser") return {triggered:false, bonusDamage:0};
  const shipId = String(profile.activeShip || player.state.shipId || "");
  if(String(player.state.shipId || "") !== shipId) return {triggered:false, bonusDamage:0};
  const definitions = getShipAbilityDefinitions(shipId);
  const definition = definitions.find(candidate=>{
    if(candidate.effectType !== "laser_double_strike") return false;
    if(candidate.weaponClass && candidate.weaponClass !== "laser") return false;
    return getShipAbilityStatus(shipId, profile.shipAbilityStates?.[shipId], now, candidate.id).active;
  });
  if(!definition) return {triggered:false, bonusDamage:0};
  const mutable = getMutableShipAbilityState(profile, shipId, definition.id);
  if(!mutable) return {triggered:false, bonusDamage:0};
  const chargeMs = Math.max(1, Math.round(Number(definition.chargeMs || 3_000)));
  const chargeSegments = Math.max(1, Math.round(Number(definition.chargeSegments || 3)));
  if(!Number.isFinite(Number(mutable.chargeStartedAt)) || Number(mutable.chargeStartedAt) <= 0){
    mutable.chargeStartedAt = now;
  }
  if(!Number.isFinite(Number(mutable.chargeReadyAt)) || Number(mutable.chargeReadyAt) <= 0){
    mutable.chargeReadyAt = Number(mutable.chargeStartedAt || now) + chargeMs;
  }
  const readyAt = Math.max(0, Number(mutable.chargeReadyAt || 0));
  if(now < readyAt){
    return {
      triggered:false,
      bonusDamage:0,
      chargeMs,
      chargeSegments,
      chargeStartedAt:Number(mutable.chargeStartedAt || now),
      chargeReadyAt:readyAt,
      chargeReady:false,
      status:getShipAbilityStatus(shipId, profile.shipAbilityStates?.[shipId], now, definition.id)
    };
  }
  const baseDamage = Math.max(0, Math.round(Number(damage || 0)));
  const multiplier = Math.max(0, Number(definition.bonusHitMultiplier || 1));
  const bonusDamage = hit && baseDamage > 0 ? Math.max(1, Math.round(baseDamage * multiplier)) : 0;
  mutable.chargeStartedAt = now;
  mutable.chargeReadyAt = now + chargeMs;
  return {
    triggered:true,
    bonusDamage,
    baseDamage,
    chargeMs,
    chargeSegments,
    chargeStartedAt:mutable.chargeStartedAt,
    chargeReadyAt:mutable.chargeReadyAt,
    chargeReady:false,
    status:getShipAbilityStatus(shipId, profile.shipAbilityStates?.[shipId], now, definition.id)
  };
}
