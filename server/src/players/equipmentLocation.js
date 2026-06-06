import { WORLD_MAPS } from "../world/definitions.js";

export function createEquipmentLocationManager({io, players, profileManager, setPlayerMap}){
  function getPlayerFirmId(player, profile = null){
    return String(profile?.player?.firmId || player?.account?.firmId || "astra").toLowerCase();
  }

  function getHomeMapForFirm(firmId){
    const targetName = `${String(firmId || "astra").toUpperCase()}-01`;
    return Object.values(WORLD_MAPS).find(map=>String(map.name || "").toUpperCase() === targetName) || WORLD_MAPS["0"];
  }

  function getConnectedGamePlayerForAccount(player){
    if(!player?.accountId) return player?.clientMode === "game" && player.connected !== false ? player : null;
    return [...players.values()].find(candidate=>
      candidate.accountId === player.accountId
      && candidate.clientMode === "game"
      && candidate.connected !== false
      && candidate.state
    ) || null;
  }

  function isStateAtFirmSpawn(state, firmId){
    const homeMap = getHomeMapForFirm(firmId);
    if(!state || !homeMap?.spawn) return false;
    if(String(state.mapId ?? "0") !== String(homeMap.id)) return false;
    const distance = Math.hypot(Number(state.x || 0) - homeMap.spawn.x, Number(state.y || 0) - homeMap.spawn.y);
    return distance <= (homeMap.spawn.r || 320) + 90;
  }

  function canChangeActiveShipAtFirmSpawn(player){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const profile = profileManager.getProfileForPlayer(player);
    const firmId = getPlayerFirmId(player, profile);
    const gamePlayer = getConnectedGamePlayerForAccount(player);
    const homeMap = getHomeMapForFirm(firmId);
    if(!gamePlayer?.state){
      return {ok:true, firmId, homeMap:homeMap?.name || "ASTRA-01", homeMapId:String(homeMap?.id || "0"), source:"disconnected"};
    }
    if(isStateAtFirmSpawn(gamePlayer.state, firmId)){
      return {ok:true, firmId, homeMap:homeMap?.name || "ASTRA-01", homeMapId:String(homeMap?.id || "0"), source:"live-spawn", gamePlayerId:gamePlayer.id};
    }
    return {
      ok:false,
      reason:`Changement de vaisseau possible uniquement au spawn ${homeMap?.name || "ASTRA-01"}, ou une fois deconnecte du jeu.`
    };
  }

  function canChangeEquipmentAtFirmSpawn(player){
    const result = canChangeActiveShipAtFirmSpawn(player);
    if(result.ok) return result;
    return {
      ...result,
      reason:String(result.reason || "").replace("Changement de vaisseau", "Modification d'equipement")
    };
  }

  function buildFirmSpawnSession({shipId, firmId, state = null} = {}){
    const homeMap = getHomeMapForFirm(firmId);
    const spawn = homeMap?.spawn || WORLD_MAPS["0"].spawn;
    return {
      source:"ship-change",
      mapId:String(homeMap?.id || "0"),
      x:Number(spawn.x || 0),
      y:Number(spawn.y || 0),
      angle:Number(state?.angle || 0),
      hp:1,
      maxHp:1,
      shield:0,
      maxShield:0,
      shipId:String(shipId || state?.shipId || "unknown"),
      shipImg:String(state?.shipImg || ""),
      updatedAt:Date.now()
    };
  }

  function accountSocketsForPlayer(player){
    if(!player?.accountId) return [player].filter(Boolean);
    return [...players.values()].filter(candidate=>candidate.accountId === player.accountId);
  }

  function finishEquipmentChangeAtFirmSpawn(player, location, result, event){
    const liveGamePlayer = location?.gamePlayerId ? players.get(location.gamePlayerId) : null;
    const activeShip = String(result?.profile?.activeShip || liveGamePlayer?.state?.shipId || "");
    const spawnSession = buildFirmSpawnSession({
      shipId:activeShip,
      firmId:location?.firmId,
      state:liveGamePlayer?.state || profileManager.getWorldSessionForPlayer(player)
    });
    let profile = result?.profile || null;
    if(liveGamePlayer?.state){
      liveGamePlayer.state = {
        ...liveGamePlayer.state,
        ...spawnSession,
        shipId:activeShip,
        updatedAt:Date.now()
      };
      liveGamePlayer.mapId = spawnSession.mapId;
      const gameSocket = io.sockets.sockets.get(liveGamePlayer.id);
      if(gameSocket) setPlayerMap(gameSocket, spawnSession.mapId);
      profile = profileManager.saveWorldSession({player:liveGamePlayer, state:liveGamePlayer.state, force:true}) || profile;
    }else{
      profile = profileManager.saveWorldSession({player, state:spawnSession, force:true}) || profile;
    }
    for(const accountPlayer of accountSocketsForPlayer(player)){
      const accountSocket = io.sockets.sockets.get(accountPlayer.id);
      if(!accountSocket) continue;
      accountSocket.emit("equipment:updated", event);
      if(accountPlayer.clientMode === "game") accountSocket.emit("player:resume", spawnSession);
      if(profile) accountSocket.emit("profile:sync", profile);
    }
  }

  return {
    accountSocketsForPlayer,
    buildFirmSpawnSession,
    canChangeActiveShipAtFirmSpawn,
    canChangeEquipmentAtFirmSpawn,
    finishEquipmentChangeAtFirmSpawn
  };
}
