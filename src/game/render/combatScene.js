import { drawDamageTexts as drawDamageTextsCanvas, drawMiniMap as drawMiniMapCanvas } from "./canvasHud.js";
import { drawBeams, drawCargoBoxes, drawEnemies, drawGroundMaterials, drawImpactEffects, drawParticles, drawProjectiles } from "./entities.js";
import { drawPlayerLayer } from "./player.js";
import { drawPortalTransitionOverlay } from "./portalTransition.js";
import { drawWorldLayer } from "./world.js";
import { drawRemotePlayers, drawRemoteTargetLocks } from "../../multiplayer/render.js";
import { getFirmBadgeAsset } from "../../data/firms.js";

export function createCombatSceneRenderer({
  ctx,
  canvas,
  cache,
  mapList,
  shipList,
  store,
  getState,
  getGraphicsQuality,
  getSpawnStations,
  getSafeAreas,
  isSafeModeActive,
  isPlayerOutsideMap,
  getCanvasViewWidth,
  getCanvasViewHeight,
  getActiveShip,
  getCurrentRank,
  getRankAssetPath,
  getDroneLoadout,
  getItemFromInventoryUid,
  getDronePermanentUpgrade,
  getPlayerTitle,
  getGroupRemotePlayers,
  getGroupPingTarget,
  miniMap,
  defaultEngineProfile,
  engineProfiles
}){
  function drawBackground(){
    const {currentMap, camera, nebulae, stars, dust, asteroids, player} = getState();
    const safeAreas = getSafeAreas();
    drawWorldLayer({
      ctx,
      canvas,
      cache,
      currentMap,
      camera,
      nebulae,
      stars,
      dust,
      asteroids,
      player,
      safeReady:isSafeModeActive(),
      spawnProtected:safeAreas.some(area=>area.type === "spawn"),
      stations:getSpawnStations(),
      graphicsQuality:getGraphicsQuality()
    });
  }

  function drawRadiationOverlay(){
    const {gameMode} = getState();
    if(gameMode !== "open" || !isPlayerOutsideMap()) return;
    const viewW = getCanvasViewWidth();
    const viewH = getCanvasViewHeight();
    const pulse = (Math.sin(performance.now() / 155) + 1) / 2;
    const alpha = .07 + pulse * .16;
    ctx.save();
    ctx.fillStyle = `rgba(185,28,28,${alpha})`;
    ctx.fillRect(0, 0, viewW, viewH);
    const g = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * .20, viewW / 2, viewH / 2, Math.max(viewW, viewH) * .72);
    g.addColorStop(0, "rgba(127,29,29,0)");
    g.addColorStop(.58, `rgba(127,29,29,${alpha * .42})`);
    g.addColorStop(1, `rgba(220,38,38,${alpha * 1.35})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
  }

  function drawDamageTexts(){
    const {camera, damageTexts} = getState();
    drawDamageTextsCanvas({ctx, camera, damageTexts});
  }

  function drawMiniMap(){
    const {currentMap, player, enemies, moveTarget, gameMode} = getState();
    const groupPlayers = getGroupRemotePlayers(currentMap?.id ?? currentMap?.name ?? null);
    drawMiniMapCanvas({
      ctx,
      canvas,
      currentMap,
      player,
      enemies,
      rect:miniMap.rect(),
      moveTarget,
      revealAllEnemies:gameMode === "portal",
      groupPlayers,
      groupPingTarget:getGroupPingTarget?.() || null
    });
  }

  function draw(){
    const state = getState();
    const {camera, bullets, particles, enemies, selectedEnemy, impactEffects, beams, player, currentMap, portalTransition} = state;
    const dpr = canvas.__dpr || 1;
    const viewW = getCanvasViewWidth();
    const viewH = getCanvasViewHeight();
    const zoom = camera?.zoom || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    canvas.__renderWidth = viewW / zoom;
    canvas.__renderHeight = viewH / zoom;
    ctx.save();
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    drawBackground();
    drawProjectiles({ctx, camera, cache, bullets});
    drawParticles({ctx, camera, particles, repairLayer:false});
    drawGroundMaterials({ctx, camera, cache, materials:state.cargo.getGroundMaterials()});
    drawCargoBoxes({ctx, camera, cache, cargoBoxes:state.cargo.getCargoBoxes()});
    drawEnemies({ctx, camera, cache, enemies, selectedEnemy});
    drawImpactEffects({ctx, camera, impactEffects});
    drawBeams({ctx, camera, beams:beams.getBeams()});
    const rank = getCurrentRank();
    drawPlayerLayer({
      ctx,
      camera,
      cache,
      player,
      ship:getActiveShip(),
      drones:getDroneLoadout(),
      rank,
      rankAssetPath:getRankAssetPath(rank),
      pilotFirmAssetPath:getFirmBadgeAsset(store.state.player?.firmId),
      pilotName:store.state.player.name || "PILOTE",
      pilotTitle:getPlayerTitle(),
      getItemFromInventoryUid,
      getDronePermanentUpgrade,
      droneFormation:store.state.activeDroneFormation,
      defaultProfile:defaultEngineProfile,
      profiles:engineProfiles
    });
    drawRemotePlayers({
      ctx,
      camera,
      cache,
      currentMapId:currentMap?.id ?? currentMap?.name ?? null,
      ships:shipList,
      defaultProfile:defaultEngineProfile,
      profiles:engineProfiles,
      selectedEnemy,
      player,
      enemies
    });
    drawRemoteTargetLocks({
      ctx,
      camera,
      player,
      enemies,
      currentMapId:currentMap?.id ?? currentMap?.name ?? null
    });
    drawParticles({ctx, camera, particles, repairLayer:true});
    drawDamageTexts();
    ctx.restore();
    canvas.__renderWidth = null;
    canvas.__renderHeight = null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRadiationOverlay();
    drawMiniMap();
    drawPortalTransitionOverlay({ctx, transition:portalTransition, maps:mapList, viewW, viewH});
  }

  return {drawBackground, drawRadiationOverlay, drawDamageTexts, drawMiniMap, draw};
}
