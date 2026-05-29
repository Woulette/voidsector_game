import { PORTAL_WAVE_TOTAL } from "../combatData.js";

export function createCombatFrameUpdateSystem({
  multiplayer,
  getState,
  setState,
  advancePortalTransition,
  loadMap,
  updatePlayerMovement,
  updateCamera,
  updateRadiation,
  updatePlayerPoison,
  updateLootPopup,
  tickCombatBoosts,
  isSafeModeActive,
  isPlayerOutsideMap,
  emitPlayerEngineParticles,
  updateHud,
  syncServerControlledEnemies,
  sendPlayerSnapshot,
  getCurrentRank,
  getActiveShip,
  getRankAssetPath,
  serverEvents,
  updateEnemies,
  updateWeapons,
  updateBullets,
  updateMapRespawns,
  updateParticles,
  updateRepairBot,
  spawnPortalWave,
  completePortalRun,
  validSelectedEnemy,
  getCanvas,
  getActiveLaserSlot,
  actions,
  panels,
  rewards,
  cargo,
  beams,
  worldFromScreen,
  defaultEngineProfile,
  engineProfiles
}){
  function update(dt){
    let state = getState();
    const {player, camera, portalTransition, mouseMoveHeld, mouse, currentMap} = state;
    if(!player) return;
    if(state.store?.state?.player){
      state.store.state.player.totalPlaySeconds = Math.max(0, Number(state.store.state.player.totalPlaySeconds || 0)) + Math.max(0, Number(dt || 0));
    }
    setState({teleportLock:Math.max(0, state.teleportLock - dt)});
    if(portalTransition){
      const completed = advancePortalTransition(portalTransition, dt);
      player.vx = 0;
      player.vy = 0;
      player.enginePower = 0;
      setState({
        moveTarget:null,
        bullets:state.bullets.filter(bullet=>bullet.owner !== "enemy")
      });
      beams.clear();
      updateParticles(dt);
      updateCamera({camera, player, canvas:getCanvas(), follow:1});
      if(completed){
        const target = portalTransition.portal;
        setState({portalTransition:null});
        loadMap(target.targetMap, target.targetX, target.targetY, {safeNow:true});
      }else{
        updateHud();
      }
      return;
    }
    rewards.tick(dt);
    tickCombatBoosts(dt);
    updatePlayerPoison(dt);
    player.safeZoneLock = Math.max(0, Number(player.safeZoneLock || 0) - dt);
    updateLootPopup();
    if(player.isDead){
      updateCamera({camera, player, canvas:getCanvas(), follow:1});
      updateHud();
      return;
    }

    if(isSafeModeActive()){
      setState({bullets:getState().bullets.filter(bullet=>bullet.owner !== "enemy")});
      for(const enemy of getState().enemies) enemy.aggro = false;
    }
    if(mouseMoveHeld && mouse) setState({moveTarget:worldFromScreen(mouse.x, mouse.y)});
    state = getState();
    const movedTarget = updatePlayerMovement({player, moveTarget:state.moveTarget, dt, map:state.currentMap, clampToMap:state.gameMode !== "open"});
    setState({moveTarget:movedTarget});
    syncServerControlledEnemies();
    state = getState();
    const rank = getCurrentRank();
    const activeShip = getActiveShip();
    sendPlayerSnapshot({
      x:player.x,
      y:player.y,
      angle:player.angle,
      hp:player.hp,
      maxHp:player.maxHp,
      shield:player.shield,
      maxShield:player.maxShield,
      vx:player.vx || 0,
      vy:player.vy || 0,
      enginePower:player.enginePower || 0,
      engineAngle:player.engineAngle || player.angle || 0,
      mapId:state.currentMap?.id ?? state.currentMap?.name ?? "unknown",
      shipId:activeShip.id || state.store.state.activeShip || "unknown",
      shipImg:activeShip.combatImg || activeShip.img || "",
      rankName:rank.name || "",
      rankAssetPath:getRankAssetPath(rank)
    });
    updateRadiation(dt);
    serverEvents.applyAll();
    state = getState();
    if(state.gameMode === "portal" && multiplayer.portalInstance?.portal){
      setState({
        portalWave:Math.max(state.portalWave || 0, Number(multiplayer.portalInstance.wave || 0)),
        portalCompleted:multiplayer.portalInstance.completed ? true : state.portalCompleted
      });
    }
    if(player.isDead){
      updateCamera({camera, player, canvas:getCanvas(), follow:1});
      updateHud();
      return;
    }
    cargo.tick();
    cargo.updatePending(player);

    state = getState();
    if(state.gameMode === "portal" && !multiplayer.portalInstance){
      if(!state.portalCompleted){
        if(state.portalWave < PORTAL_WAVE_TOTAL){
          const portalDelay = state.portalDelay - dt;
          setState({portalDelay});
          if(state.enemies.length === 0 || portalDelay <= 0) spawnPortalWave(state.portalWave + 1);
        }else if(state.enemies.length === 0){
          completePortalRun();
        }
      }
    }

    const enemy = validSelectedEnemy();
    if(enemy && getActiveLaserSlot() !== null) player.angle = Math.atan2(enemy.y-player.y, enemy.x-player.x)+Math.PI/2;
    emitPlayerEngineParticles({
      dt,
      player,
      ship:getActiveShip(),
      particles:getState().particles,
      defaultProfile:defaultEngineProfile,
      profiles:engineProfiles
    });

    updateEnemies(dt);
    updateWeapons(dt);
    updateBullets(dt);
    updateMapRespawns(dt);
    beams.update(dt);
    updateParticles(dt);
    updateRepairBot(dt);
    if(player.maxShield > 0) player.shield = Math.min(player.maxShield, player.shield + (player.regen || 0)*dt);
    const targetZoom = isPlayerOutsideMap() ? 0.78 : 1;
    camera.zoom = (camera.zoom || 1) + (targetZoom - (camera.zoom || 1)) * Math.min(1, dt * 4.5);
    updateCamera({camera, player, canvas:getCanvas(), follow:1});
    state = getState();
    const hudT = state.hudT - dt;
    setState({hudT});
    if(hudT <= 0){
      setState({hudT:.15});
      updateHud();
      actions.updateGameActionBar();
    }
    const quickPanel = document.getElementById("combatQuickPanel");
    if(quickPanel && !quickPanel.classList.contains("hidden")){
      const quickPanelRefreshT = state.quickPanelRefreshT - dt;
      setState({quickPanelRefreshT});
      if(quickPanelRefreshT <= 0){
        if(!quickPanel.matches(":hover") && !quickPanel.contains(document.activeElement)) actions.renderCombatQuickPanel();
        setState({quickPanelRefreshT:1});
      }
    }
    panels.tick(dt);
  }

  return {update};
}
