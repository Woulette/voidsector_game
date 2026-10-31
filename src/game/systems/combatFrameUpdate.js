import { PORTAL_WAVE_TOTAL } from "../combatData.js?v=20261022-helion-hub1";
import { resolveRickyPortalPoint } from "../../data/rickyPortal.js";
import { isEclanitePortal, resolveEclanitePortalPoint } from "../../data/eclanitePortal.js?v=20260726-nox1";
import { isNoxPortal } from "../../data/noxPortal.js?v=20260726-nox1";
import { isPrismaticPortal } from "../../data/prismaticPortal.js?v=20260726-prismatic1";
import { isAncientPortal, resolveAncientPortalPoint } from "../../data/ancientPortal.js?v=20260726-ancient1";
import { maxCombatProfilerMetric, setCombatProfilerMetric, timeCombatProfiler } from "./combatFrameProfiler.js?v=20260726-kharon1";

export function createCombatFrameUpdateSystem({
  multiplayer,
  getState,
  setState,
  advancePortalTransition,
  completeDungeonTransition,
  loadMap,
  updatePlayerMovement,
  updateCamera,
  tickPlayerVisualCorrection = ()=>0,
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
  levelUpEffects,
  worldFromScreen,
  defaultEngineProfile,
  engineProfiles
}){
  function sendCurrentPlayerSnapshot({active = false, force = false, attackTargetId = "", attackAmmo = null} = {}){
    timeCombatProfiler("net.playerSnapshot", ()=>sendPlayerSnapshot(()=>{
      const snapshotState = getState();
      const player = snapshotState.player;
      const rank = getCurrentRank();
      const activeShip = getActiveShip();
      const droneLoadout = Array.isArray(snapshotState.store?.state?.droneLoadout)
        ? snapshotState.store.state.droneLoadout
        : [];
      return {
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
        mapId:snapshotState.currentMap?.id ?? snapshotState.currentMap?.name ?? "unknown",
        shipId:activeShip.id || snapshotState.store.state.activeShip || "unknown",
        shipImg:activeShip.combatImg || activeShip.img || "",
        level:Number(snapshotState.store?.state?.player?.level || 1),
        speed:Number(player.speed || activeShip.stats?.vitesse || 300),
        radius:Number(player.radius || 48),
        droneCount:droneLoadout.filter(Boolean).length,
        droneUpgrades:droneLoadout.slice(0, 10).map((uid, index)=>Boolean(
          uid && snapshotState.store?.state?.dronePermanentUpgrades?.[index]
        )),
        activeDroneFormation:snapshotState.store?.state?.activeDroneFormation || "base",
        rankName:rank.name || "",
        rankAssetPath:getRankAssetPath(rank),
        moveTarget:snapshotState.moveTarget
          ? {x:Number(snapshotState.moveTarget.x || 0), y:Number(snapshotState.moveTarget.y || 0)}
          : null,
        lockedTargetId:snapshotState.selectedEnemy
          ? (snapshotState.selectedEnemy.isPlayerTarget
            ? `player:${snapshotState.selectedEnemy.playerId}`
            : String(snapshotState.selectedEnemy.serverId || snapshotState.selectedEnemy.id || ""))
          : "",
        attackTargetId,
        attackAmmoId:attackAmmo?.id || "",
        attackWeaponClass:attackAmmo?.weaponClass || "",
        repairBotActive:Boolean(player.repairBotActive),
        ...(snapshotState.portalTransition || snapshotState.autoTravelTransition ? {portalTransfer:true} : {}),
        pageHidden:document.hidden === true
      };
    }, {active, force, coalesce:!force}));
  }

  function update(dt){
    let state = getState();
    const {player, camera, portalTransition, mouseMoveHeld, mouse, currentMap} = state;
    if(!player) return;
    const frameStartPlayerX = Number(player.x || 0);
    const frameStartPlayerY = Number(player.y || 0);
    const frameStartCameraX = Number(camera?.x || 0);
    const frameStartCameraY = Number(camera?.y || 0);
    const visualOffsetPx = tickPlayerVisualCorrection(player, dt);

    function recordPlayerCameraMotion(){
      const latestState = getState();
      const latestPlayer = latestState.player || player;
      const latestCamera = latestState.camera || camera;
      const playerStepPx = Math.hypot(
        Number(latestPlayer?.x || 0) - frameStartPlayerX,
        Number(latestPlayer?.y || 0) - frameStartPlayerY
      );
      const cameraStepPx = Math.hypot(
        Number(latestCamera?.x || 0) - frameStartCameraX,
        Number(latestCamera?.y || 0) - frameStartCameraY
      );
      setCombatProfilerMetric("sync.player.lastStepPx", playerStepPx);
      setCombatProfilerMetric("sync.camera.lastStepPx", cameraStepPx);
      setCombatProfilerMetric("sync.player.visualOffsetPx", visualOffsetPx);
      maxCombatProfilerMetric("sync.player.maxStepPx", playerStepPx);
      maxCombatProfilerMetric("sync.camera.maxStepPx", cameraStepPx);
    }

    setState({teleportLock:Math.max(0, state.teleportLock - dt)});
    rewards?.tick?.(dt);
    if(portalTransition || state.autoTravelTransition){
      const transition = portalTransition || state.autoTravelTransition;
      if(portalTransition?.azuronAction){
        serverEvents?.applyAll?.();
        if(getState().portalTransition !== portalTransition) return;
        if(player.isDead){setState({portalTransition:null});updateHud();return;}
      }
      // Automatic travel is timed and committed by the server; only manual jumps advance here.
      const completed = portalTransition ? advancePortalTransition(portalTransition, dt) : false;
      player.vx = 0;
      player.vy = 0;
      player.enginePower = 0;
      const startingTransfer = transition.cleanupDone !== true;
      if(startingTransfer){
        transition.cleanupDone = true;
        setState({
          moveTarget:null,
          mouseMoveHeld:false,
          bullets:state.bullets.filter(bullet=>bullet.owner !== "enemy" && bullet.owner !== "serverEnemy")
        });
        beams.clear();
      }
      timeCombatProfiler("sim.particles", ()=>updateParticles(dt));
      updateCamera({camera, player, canvas:getCanvas(), follow:1});
      recordPlayerCameraMotion();
      if(completed && !portalTransition.serverControlled){
        const target = portalTransition.portal;
        setState({portalTransition:null});
        if(!completeDungeonTransition?.(portalTransition)){
          loadMap(target.targetMap, target.targetX, target.targetY, {safeNow:true});
        }
        sendCurrentPlayerSnapshot({force:true});
      }else{
        sendCurrentPlayerSnapshot({force:startingTransfer});
        updateHud();
      }
      return;
    }
    tickCombatBoosts(dt);
    updatePlayerPoison(dt);
    updatePlayerSlow(dt);
    player.safeZoneLock = Math.max(0, Number(player.safeZoneLock || 0) - dt);
    updateLootPopup();
    if(player.isDead){
      timeCombatProfiler("events.applyAll", ()=>serverEvents.applyAll());
      levelUpEffects?.update?.(dt);
      const refreshed = getState();
      updateCamera({
        camera:refreshed.camera || camera,
        player:refreshed.player || player,
        canvas:getCanvas(),
        follow:1
      });
      recordPlayerCameraMotion();
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
      const isEclaniteEncounter = state.gameMode === "portal" && isEclanitePortal(state.activePortal);
      const isAncientEncounter = state.gameMode === "portal" && isAncientPortal(state.activePortal);
      const movedTarget = updatePlayerMovement({
        player,
        moveTarget:state.moveTarget,
        dt,
        map:state.currentMap,
        clampToMap:state.gameMode !== "open",
        resolvePosition:isRickyPortal
          ? (previous, requested)=>resolveRickyPortalPoint(previous, requested, Boolean(state.portalObjective?.breachOpen), player.radius || 48)
          : isEclaniteEncounter
            ? (previous, requested)=>resolveEclanitePortalPoint(previous, requested, state.portalObjective?.breaches, player.radius || 48)
            : isAncientEncounter
              ? (previous, requested)=>resolveAncientPortalPoint(
                  previous,
                  requested,
                  state.portalObjective,
                  player.radius || 48
                )
              : null
      });
      setState({moveTarget:movedTarget});
    }
    timeCombatProfiler("sync.enemies", syncServerControlledEnemies);
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
    const playerStateActive = document.hidden !== true && Boolean(
        state.moveTarget
        || attackTargetId
        || Math.abs(Number(player.vx || 0)) > .5
        || Math.abs(Number(player.vy || 0)) > .5
        || Number(player.enginePower || 0) > .02
      );
    sendCurrentPlayerSnapshot({active:playerStateActive, attackTargetId, attackAmmo});
    updateRadiation(dt);
    timeCombatProfiler("events.applyAll", ()=>serverEvents.applyAll());
    levelUpEffects?.update?.(dt);
    state = getState();
    if(state.gameMode === "portal" && multiplayer.portalInstance?.portal){
      const nextWaveAt = Math.max(0, Number(multiplayer.portalInstance.nextWaveAt || 0));
      const authoritativeLives = multiplayer.portalInstance.lives;
      setState({
        portalWave:Math.max(state.portalWave || 0, Number(multiplayer.portalInstance.wave || 0)),
        portalDelay:nextWaveAt > 0 ? Math.max(0, (nextWaveAt - Date.now()) / 1000) : 0,
        portalCompleted:multiplayer.portalInstance.completed ? true : state.portalCompleted,
        portalAlly:multiplayer.portalAlly || null,
        portalBeacons:Array.isArray(multiplayer.portalBeacons) ? multiplayer.portalBeacons : [],
        portalObjective:multiplayer.portalObjective || multiplayer.portalInstance.objective || null,
        ...(typeof authoritativeLives === "number" && Number.isFinite(authoritativeLives)
          ? {portalLives:Math.max(0, Math.min(3, Math.round(authoritativeLives)))}
          : {})
      });
    }
    if(player.isDead){
      updateCamera({camera, player, canvas:getCanvas(), follow:1});
      recordPlayerCameraMotion();
      updateHud();
      return;
    }
    timeCombatProfiler("cargo.tick", ()=>cargo.tick());
    timeCombatProfiler("cargo.pending", ()=>cargo.updatePending(player));

    state = getState();
    if(state.gameMode === "portal"
      && !multiplayer.portalInstance
      && !isNoxPortal(state.activePortal)
      && !isPrismaticPortal(state.activePortal)
      && !isAncientPortal(state.activePortal)){
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

    timeCombatProfiler("sim.enemies", ()=>updateEnemies(dt));
    timeCombatProfiler("sim.weapons", ()=>updateWeapons(dt));
    timeCombatProfiler("sim.bullets", ()=>updateBullets(dt));
    timeCombatProfiler("sim.respawns", ()=>updateMapRespawns(dt));
    timeCombatProfiler("sim.beams", ()=>beams.update(dt));
    timeCombatProfiler("sim.particles", ()=>updateParticles(dt));
    timeCombatProfiler("sim.repairBot", ()=>updateRepairBot(dt));
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
    recordPlayerCameraMotion();
    state = getState();
    const hudT = state.hudT - dt;
    setState({hudT});
    if(hudT <= 0){
      setState({hudT:.15});
      updateHud();
      timeCombatProfiler("hud.actionBar", ()=>actions.updateGameActionBar());
    }
    const refreshedState = getState();
    setCombatProfilerMetric("count.enemies", refreshedState.enemies?.length || 0);
    setCombatProfilerMetric("count.bullets", refreshedState.bullets?.length || 0);
    setCombatProfilerMetric("count.particles", refreshedState.particles?.length || 0);
    setCombatProfilerMetric("count.damageTexts", refreshedState.damageTexts?.length || 0);
    const quickPanel = document.getElementById("combatQuickPanel");
    if(quickPanel && !quickPanel.classList.contains("hidden")){
      const quickPanelRefreshT = state.quickPanelRefreshT - dt;
      setState({quickPanelRefreshT});
      if(quickPanelRefreshT <= 0){
        if(!quickPanel.matches(":hover") && !quickPanel.contains(document.activeElement)) actions.renderCombatQuickPanel();
        setState({quickPanelRefreshT:1});
      }
    }
    timeCombatProfiler("panels.tick", ()=>panels.tick(dt));
  }

  return {update, sendCurrentPlayerSnapshot};
}
