import { PORTAL_WAVE_TOTAL } from "../combatData.js";
import { resolveRickyPortalPoint } from "../../data/rickyPortal.js";

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
  updatePlayerSlow = ()=>{},
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
    setState({teleportLock:Math.max(0, state.teleportLock - dt)});
    if(portalTransition){
      const completed = advancePortalTransition(portalTransition, dt);
      player.vx = 0;
      player.vy = 0;
      player.enginePower = 0;
      if(portalTransition.cleanupDone !== true){
        portalTransition.cleanupDone = true;
        setState({
          moveTarget:null,
          bullets:state.bullets.filter(bullet=>bullet.owner !== "enemy" && bullet.owner !== "serverEnemy")
        });
        beams.clear();
      }
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
    updatePlayerSlow(dt);
    player.safeZoneLock = Math.max(0, Number(player.safeZoneLock || 0) - dt);
    updateLootPopup();
    if(player.isDead){
      serverEvents.applyAll();
      const refreshed = getState();
      updateCamera({
        camera:refreshed.camera || camera,
        player:refreshed.player || player,
        canvas:getCanvas(),
        follow:1
      });
      updateHud();
      return;
    }

    if(isSafeModeActive()){
      setState({bullets:getState().bullets.filter(bullet=>bullet.owner !== "enemy")});
      for(const enemy of getState().enemies) enemy.aggro = false;
    }
    const movementLocked = cargo.isMovementLocked?.() || Boolean(state.portalCinematic);
    if(movementLocked){
      player.vx = 0;
      player.vy = 0;
      player.enginePower = 0;
      setState({moveTarget:null, mouseMoveHeld:false});
    }else{
      if(mouseMoveHeld && mouse) setState({moveTarget:worldFromScreen(mouse.x, mouse.y)});
      state = getState();
      const isRickyPortal = state.gameMode === "portal" && state.activePortal?.id === "ricky";
      const movedTarget = updatePlayerMovement({
        player,
        moveTarget:state.moveTarget,
        dt,
        map:state.currentMap,
        clampToMap:state.gameMode !== "open",
        resolvePosition:isRickyPortal
          ? (previous, requested)=>resolveRickyPortalPoint(previous, requested, Boolean(state.portalObjective?.breachOpen), player.radius || 48)
          : null
      });
      setState({moveTarget:movedTarget});
    }
    syncServerControlledEnemies();
    state = getState();
    const lockedEnemy = validSelectedEnemy();
    const activeLaserSlot = getActiveLaserSlot();
    const attackTargetId = lockedEnemy && activeLaserSlot !== null
      ? (lockedEnemy.isPlayerTarget ? `player:${lockedEnemy.playerId}` : String(lockedEnemy.serverId || lockedEnemy.id || ""))
      : "";
    const attackAmmo = attackTargetId ? actions.getCombatAmmo(activeLaserSlot) : null;
    if(lockedEnemy && attackTargetId){
      player.angle = Math.atan2(lockedEnemy.y-player.y, lockedEnemy.x-player.x)+Math.PI/2;
    }
    player.engineTrailLocked = Boolean(lockedEnemy);
    const rank = getCurrentRank();
    const activeShip = getActiveShip();
    const droneLoadout = Array.isArray(state.store?.state?.droneLoadout) ? state.store.state.droneLoadout : [];
    const droneUpgrades = droneLoadout.slice(0, 10).map((uid, index)=>Boolean(uid && state.store?.state?.dronePermanentUpgrades?.[index]));
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
      engineTrailLocked:Boolean(player.engineTrailLocked),
      mapId:state.currentMap?.id ?? state.currentMap?.name ?? "unknown",
      shipId:activeShip.id || state.store.state.activeShip || "unknown",
      shipImg:activeShip.combatImg || activeShip.img || "",
      level:Number(state.store?.state?.player?.level || 1),
      speed:Number(player.speed || activeShip.stats?.vitesse || 300),
      radius:Number(player.radius || 48),
      droneCount:droneLoadout.filter(Boolean).length,
      droneUpgrades,
      activeDroneFormation:state.store?.state?.activeDroneFormation || "base",
      rankName:rank.name || "",
      rankAssetPath:getRankAssetPath(rank),
      moveTarget:state.moveTarget ? {x:Number(state.moveTarget.x || 0), y:Number(state.moveTarget.y || 0)} : null,
      lockedTargetId:state.selectedEnemy
        ? (state.selectedEnemy.isPlayerTarget ? `player:${state.selectedEnemy.playerId}` : String(state.selectedEnemy.serverId || state.selectedEnemy.id || ""))
        : "",
      attackTargetId,
      attackAmmoId:attackAmmo?.id || "",
      attackWeaponClass:attackAmmo?.weaponClass || "",
      repairBotActive:Boolean(player.repairBotActive),
      pageHidden:document.hidden === true
    });
    updateRadiation(dt);
    serverEvents.applyAll();
    state = getState();
    if(state.gameMode === "portal" && multiplayer.portalInstance?.portal){
      setState({
        portalWave:Math.max(state.portalWave || 0, Number(multiplayer.portalInstance.wave || 0)),
        portalCompleted:multiplayer.portalInstance.completed ? true : state.portalCompleted,
        portalAlly:multiplayer.portalAlly || null,
        portalBeacons:Array.isArray(multiplayer.portalBeacons) ? multiplayer.portalBeacons : [],
        portalObjective:multiplayer.portalObjective || multiplayer.portalInstance.objective || null
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
    const cinematic = getState().portalCinematic;
    if(cinematic){
      const elapsed = performance.now() - Number(cinematic.startedAt || 0);
      const duration = Math.max(1000, Number(cinematic.durationMs || 5600));
      const focus = elapsed < duration * .72
        ? cinematic.target
        : player;
      updateCamera({camera, player:{x:Number(focus?.x || 0), y:Number(focus?.y || 0)}, canvas:getCanvas(), follow:.08});
      if(elapsed >= duration) setState({portalCinematic:null});
    }else{
      updateCamera({camera, player, canvas:getCanvas(), follow:1});
    }
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
