import { normalizeFirmId } from "../../data/firms.js";

export function createCombatRemoteTargetResolver({store, multiplayer, getCurrentMap}){
  function buildRemotePlayerTarget(remote){
    const state = remote?.state;
    if(!remote?.id || !state) return null;
    const playerFirmId = normalizeFirmId(store.state?.player?.firmId || "astra");
    const targetFirmId = normalizeFirmId(remote.firmId || state.firmId || "astra");
    const level = Math.max(1, Math.floor(Number(state.level || remote.level || 1)));
    const playerLevel = Math.max(1, Math.floor(Number(store.state?.player?.level || 1)));
    const groupMembers = Array.isArray(multiplayer.group?.members) ? multiplayer.group.members : [];
    const sameGroup = groupMembers.some(member=>member?.id === remote.id);
    const canAttack = !sameGroup && playerLevel >= 10 && level >= 10;
    const attackBlockedReason = sameGroup
      ? "Impossible d'attaquer un membre du groupe."
      : playerLevel < 10
        ? "Tu dois atteindre le niveau 10 pour attaquer un joueur."
        : level < 10
          ? "Ce joueur est protege jusqu'au niveau 10."
        : "";
    return {
      id:`player:${remote.id}`,
      playerId:remote.id,
      isPlayerTarget:true,
      hostile:targetFirmId !== playerFirmId,
      sameGroup,
      canAttack,
      attackBlockedReason,
      type:String(remote.name || "Pilote"),
      name:String(remote.name || "Pilote"),
      level,
      firmId:targetFirmId,
      x:Number(state.x || 0),
      y:Number(state.y || 0),
      radius:Math.max(48, Number(state.radius || 48)),
      hp:Number(state.hp || 0),
      maxHp:Number(state.maxHp || 1),
      shield:Number(state.shield || 0),
      maxShield:Number(state.maxShield || 0),
      shieldAbsorbRatio:Number(state.shieldAbsorbRatio ?? 0.8),
      angle:Number(state.angle || 0),
      recentHitTimer:0
    };
  }

  function getCurrentMapToken(){
    const currentMap = getCurrentMap?.();
    return String(currentMap?.id ?? currentMap?.name ?? "");
  }

  function findRemotePlayerTargetById(playerId){
    const remote = multiplayer.remotePlayers.get(playerId);
    if(!remote?.state) return null;
    const mapToken = getCurrentMapToken();
    if(String(remote.state.mapId ?? "") !== mapToken) return null;
    return buildRemotePlayerTarget(remote);
  }

  function findRemotePlayerAt(world){
    const mapToken = getCurrentMapToken();
    let best = null;
    let bestDistance = Infinity;
    for(const remote of multiplayer.remotePlayers.values()){
      const state = remote?.state;
      if(!state || String(state.mapId ?? "") !== mapToken) continue;
      const distance = Math.hypot(Number(world.x || 0) - Number(state.x || 0), Number(world.y || 0) - Number(state.y || 0));
      const radius = Math.max(48, Number(state.radius || 48));
      if(distance <= radius + 34 && distance < bestDistance){
        best = buildRemotePlayerTarget(remote);
        bestDistance = distance;
      }
    }
    return best;
  }

  return {
    buildRemotePlayerTarget,
    findRemotePlayerTargetById,
    findRemotePlayerAt
  };
}
