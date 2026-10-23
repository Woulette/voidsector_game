export function getPlayerPvpBlockReason({sameGroup = false, attackerLevel = 1, targetLevel = 1} = {}){
  if(sameGroup) return "Tir refuse sur membre du groupe.";
  if(Number(attackerLevel) < 10) return "Tu dois atteindre le niveau 10 pour attaquer un joueur.";
  if(Number(targetLevel) < 10) return "Ce joueur est protege jusqu'au niveau 10.";
  return "";
}

function playerMapId(player){
  return String(player?.mapId ?? player?.state?.mapId ?? "");
}

function effectiveMapRoom(player){
  return String(player?.mapRoom || `map:${playerMapId(player)}`);
}

export function isPreparedPlayerImpactValid({
  players,
  attacker,
  target,
  attackerLifeGeneration = 0,
  targetLifeGeneration = 0,
  mapId = "",
  mapRoom = "",
  isPvpBlocked = ()=>false,
  isSafe = ()=>false
} = {}){
  if(!attacker?.id || !target?.id || attacker.id === target.id) return false;
  if(players?.get?.(attacker.id) !== attacker || players?.get?.(target.id) !== target) return false;
  if(attacker.connected === false || target.connected === false) return false;
  if(Number(attacker.combatLifeGeneration || 0) !== Number(attackerLifeGeneration || 0)) return false;
  if(Number(target.combatLifeGeneration || 0) !== Number(targetLifeGeneration || 0)) return false;
  if(attacker.deathState || target.deathState) return false;
  if(Number(attacker.state?.hp || 0) <= 0 || Number(target.state?.hp || 0) <= 0) return false;
  if(playerMapId(attacker) !== String(mapId) || playerMapId(target) !== String(mapId)) return false;
  if(effectiveMapRoom(attacker) !== String(mapRoom) || effectiveMapRoom(target) !== String(mapRoom)) return false;
  if(isPvpBlocked()) return false;
  if(isSafe()) return false;
  return true;
}
