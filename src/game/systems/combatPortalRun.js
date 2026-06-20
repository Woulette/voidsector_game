import { store } from "../../core/store.js";
import { getFirmHomeMapName, normalizeFirmId } from "../../data/firms.js";
import { PORTAL_WAVE_TOTAL } from "../combatData.js";

export function createCombatPortalRunSystem({
  mapList,
  getState
}){
  function getPortalBatchEnd(startWave){
    if(startWave >= 27) return PORTAL_WAVE_TOTAL;
    return Math.min(PORTAL_WAVE_TOTAL, startWave + 1);
  }

  function getPlayerFirmId(){
    return normalizeFirmId(store.state.player?.firmId || store.state.player?.firm || store.state.player?.company || store.state.player?.faction || "astra");
  }

  function getHomeMapForPlayer(){
    const targetName = getFirmHomeMapName(getPlayerFirmId());
    return mapList.find(map=>String(map.name || "").toUpperCase() === targetName) || mapList[0];
  }

  function spawnExit(){
    const {currentMap, gameMode} = getState();
    if(!currentMap || gameMode !== "portal") return;
    const homeMap = getHomeMapForPlayer();
    currentMap.portal = {
      x:0,
      y:0,
      r:110,
      safeRadius:270,
      activationRadius:320,
      targetMap:homeMap.id,
      targetX:homeMap.spawn?.x ?? 0,
      targetY:homeMap.spawn?.y ?? 0,
      label:`SORTIE ${homeMap.name}`
    };
  }

  function spawnWave(){
    return false;
  }

  function completeRun(){
    return false;
  }

  function loadArena(){
    return false;
  }

  return {
    getPortalBatchEnd,
    getHomeMapForPlayer,
    spawnExit,
    spawnWave,
    completeRun,
    loadArena
  };
}
