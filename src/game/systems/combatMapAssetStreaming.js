export const MAP_ASSET_PRELOAD_DISTANCE = 1400;
export const MAP_ASSET_STREAM_INTERVAL = .25;

export function createCombatMapAssetStreamingSystem({
  mapList,
  getState,
  getMapPortals,
  preloadMapAssets,
  preloadDistance = MAP_ASSET_PRELOAD_DISTANCE,
  interval = MAP_ASSET_STREAM_INTERVAL
}){
  let timer = 0;

  function findMap(mapId){
    return mapList.find(map=>String(map.id) === String(mapId)) || null;
  }

  function preloadMap(mapId){
    const map = findMap(mapId);
    if(!map) return false;
    preloadMapAssets(map);
    return true;
  }

  function getNearestPortalTarget({currentMap, player}){
    const portals = getMapPortals(currentMap) || [];
    let nearest = null;
    for(const portal of portals){
      if(portal?.targetMap == null || portal.closed || portal.damaged) continue;
      const distance = Math.hypot(Number(portal.x || 0) - player.x, Number(portal.y || 0) - player.y);
      if(!nearest || distance < nearest.distance) nearest = {portal, distance};
    }
    if(!nearest) return null;
    const speed = Math.max(0, Number(player.speed || 0));
    const threshold = Math.max(preloadDistance, speed * 4);
    return nearest.distance <= threshold ? nearest.portal.targetMap : null;
  }

  function update(dt){
    timer -= Math.max(0, Number(dt || 0));
    if(timer > 0) return false;
    timer = interval;
    const state = getState();
    const directTarget = state.portgunChannel?.targetMapId ?? state.portalTransition?.portal?.targetMap;
    if(directTarget != null) return preloadMap(directTarget);
    if(state.gameMode !== "open" || !state.currentMap || !state.player) return false;
    const targetMapId = getNearestPortalTarget(state);
    return targetMapId != null ? preloadMap(targetMapId) : false;
  }

  function reset(){
    timer = 0;
  }

  return {update, preloadMap, reset};
}
