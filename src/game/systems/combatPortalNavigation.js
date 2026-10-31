import { createMapPortalTransition as makePortalTransition, getPortalActivationRadius } from "./mapPortalTransfer.js";
import { isWavePortal } from "../../data/wavePortalTiers.js";

export function createCombatPortalNavigationSystem({
  mapList,
  getState,
  setState,
  actions,
  getMapPortals,
  findMapPortalAt,
  createMapPortalTransition = makePortalTransition,
  getMapState,
  getHomeMapForPlayer,
  loadMap,
  startServerPortal,
  interactAzuronPortal,
  showToast
}){
  function startAzuronTransition(portal,action){
    const {player}=getState();
    player.vx=0;player.vy=0;
    setState({portalTransition:{...createMapPortalTransition(portal),azuronAction:action},
      teleportLock:1,moveTarget:null,selectedEnemy:null,mouseMoveHeld:false});
    actions.setActiveLaserSlot?.(null);actions.updateGameActionBar?.();
  }

  function completeDungeonTransition(transition){
    if(!["enter","continue"].includes(transition?.azuronAction)) return false;
    const {player,gameMode}=getState(),portal=transition.portal;
    if(player.isDead || Number(player.hp)<=0
      || (transition.azuronAction === "enter" ? gameMode !== "open" : gameMode !== "portal")
      || Math.hypot(player.x-portal.x,player.y-portal.y)>getPortalActivationRadius(portal)){
      showToast?.("Transfert annule : approche du portail.");return true;
    }
    setState({teleportLock:2,moveTarget:null,selectedEnemy:null});
    if(transition.azuronAction === "enter") startServerPortal?.(portal.portalId);
    else interactAzuronPortal?.("continue");
    return true;
  }

  function tryUseMapPortal(){
    const {portalTransition, gameMode, portalCompleted, currentMap, player, teleportLock} = getState();
    if(portalTransition) return true;
    if(gameMode === "portal"){
      const stageGate=findMapPortalAt({map:currentMap,point:player,getMapPortals});
      if(stageGate?.azuronGate){
        if(teleportLock>0) return true;
        if(stageGate.action === "continue") startAzuronTransition(stageGate,"continue");
        else{
          interactAzuronPortal?.(stageGate.action);
          setState({teleportLock:1,moveTarget:null,selectedEnemy:null});
        }
        return true;
      }
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
      if(isWavePortal(portal.portalId)){
        startAzuronTransition(portal,"enter");return true;
      }
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

  return {tryUseMapPortal,completeDungeonTransition};
}
