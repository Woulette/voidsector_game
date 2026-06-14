export function createCombatPortalNavigationSystem({
  mapList,
  getState,
  setState,
  actions,
  getMapPortals,
  findMapPortalAt,
  createMapPortalTransition,
  getMapState,
  getHomeMapForPlayer,
  loadMap,
  startServerPortal,
  showToast
}){
  function tryUseMapPortal(){
    const {portalTransition, gameMode, portalCompleted, currentMap, player, teleportLock} = getState();
    if(portalTransition) return true;
    if(gameMode === "portal"){
      if(!portalCompleted) return false;
      const exitPortal = findMapPortalAt({map:currentMap, point:player, getMapPortals});
      if(!exitPortal) return false;
      const targetMap = mapList.find(map=>map.id === exitPortal.targetMap) || getHomeMapForPlayer();
      loadMap(targetMap.id, exitPortal.targetX, exitPortal.targetY, {safeNow:true});
      showToast(`Retour vers ${targetMap.name}.`);
      return true;
    }
    if(gameMode !== "open") return false;
    const portal = findMapPortalAt({map:currentMap, point:player, getMapPortals});
    if(!portal) return false;
    if(teleportLock > 0) return true;
    if(portal.dungeonPortal && portal.portalId){
      const started = startServerPortal?.(portal.portalId);
      if(started !== false){
        player.vx = 0;
        player.vy = 0;
        setState({
          teleportLock:2,
          moveTarget:null,
          selectedEnemy:null
        });
        actions.setActiveLaserSlot(null);
        actions.updateGameActionBar();
      }
      return true;
    }
    const targetMap = mapList.find(map=>map.id === portal.targetMap);
    if(targetMap) getMapState(targetMap);
    player.vx = 0;
    player.vy = 0;
    setState({
      portalTransition:createMapPortalTransition(portal),
      moveTarget:null,
      selectedEnemy:null
    });
    actions.setActiveLaserSlot(null);
    actions.updateGameActionBar();
    showToast(`Transfert vers ${targetMap?.name || "secteur"}...`);
    return true;
  }

  return {tryUseMapPortal};
}
