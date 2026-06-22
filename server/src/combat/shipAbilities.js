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
