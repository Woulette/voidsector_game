import { drawDamageTexts as drawDamageTextsCanvas, drawMiniMap as drawMiniMapCanvas } from "./canvasHud.js";
import { drawBeams, drawCargoBoxes, drawEnemies, drawGroundMaterials, drawImpactEffects, drawParticles, drawProjectiles } from "./entities.js";
import { drawPlayerLayer } from "./player.js";
import { drawPortalTransitionOverlay } from "./portalTransition.js";
import { drawWorldLayer } from "./world.js";
import { drawRemotePlayers } from "../../multiplayer/render.js";
import { getFirmBadgeAsset } from "../../data/firms.js";

function lerp(a, b, t){
  return a + (b - a) * t;
}

function lerpAngle(a, b, t){
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

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
  getMapPortals,
  getClosedMapPortals,
  getCanvasViewWidth,
  getCanvasViewHeight,
  getActiveShip,
  getCurrentRank,
  getRankAssetPath,
  getDroneLoadout,
  getItemFromInventoryUid,
  getDronePermanentUpgrade,
  getPlayerTitle,
  getLocalPlayerRole = ()=>"",
  getGroupRemotePlayers,
  getGroupPingTarget,
  miniMap,
  defaultEngineProfile,
  engineProfiles
}){
  let portalAllyRenderState = null;

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
      graphicsQuality:getGraphicsQuality(),
      getMapPortals,
      getClosedMapPortals
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
      groupPingTarget:getGroupPingTarget?.() || null,
      getMapPortals
    });
  }

  function drawPortalBeacons(){
    const {camera, portalBeacons} = getState();
    const now = Date.now();
    for(const beacon of Array.isArray(portalBeacons) ? portalBeacons : []){
      if(Number(beacon.expiresAt || 0) <= now) continue;
      const x = Number(beacon.x || 0) - camera.x;
      const y = Number(beacon.y || 0) - camera.y;
      const radius = Math.max(20, Number(beacon.radius || 250));
      const pulse = (Math.sin(now / 180) + 1) / 2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const fill = ctx.createRadialGradient(x, y, radius * .08, x, y, radius);
      fill.addColorStop(0, "rgba(34,197,94,.24)");
      fill.addColorStop(.58, "rgba(34,197,94,.10)");
      fill.addColorStop(1, "rgba(34,197,94,0)");
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(74,222,128,${.38 + pulse * .24})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius * (.88 + pulse * .08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(125,211,252,${.22 + pulse * .20})`;
      ctx.beginPath();
      ctx.arc(x, y, 22 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPortalAlly(){
    const {portalAlly} = getState();
    if(!portalAlly || portalAlly.alive === false || Number(portalAlly.hp || 0) <= 0) return;
    const speed = Math.hypot(Number(portalAlly.vx || 0), Number(portalAlly.vy || 0));
    const now = performance.now();
    const snapshotAge = Number.isFinite(Number(portalAlly.receivedAt))
      ? Math.max(0, Math.min(.16, (now - Number(portalAlly.receivedAt)) / 1000))
      : 0;
    const targetX = Number(portalAlly.x || 0) + Number(portalAlly.vx || 0) * snapshotAge;
    const targetY = Number(portalAlly.y || 0) + Number(portalAlly.vy || 0) * snapshotAge;
    const targetAngle = Number(portalAlly.clientAimUntil || 0) > now
      ? Number(portalAlly.clientAimAngle || portalAlly.angle || 0)
      : Number(portalAlly.angle || 0);
    const targetEnginePower = speed > 8 ? Math.max(.26, Math.min(1, speed / Math.max(240, Number(portalAlly.speed || 360)))) : 0;
    if(!portalAllyRenderState || portalAllyRenderState.id !== portalAlly.id || Math.hypot(portalAllyRenderState.x - targetX, portalAllyRenderState.y - targetY) > 900){
      portalAllyRenderState = {
        id:portalAlly.id,
        x:targetX,
        y:targetY,
        angle:targetAngle,
        enginePower:targetEnginePower,
        lastAt:now
      };
    }else{
      const dt = Math.max(.001, Math.min(.05, (now - portalAllyRenderState.lastAt) / 1000));
      const moveBlend = Math.min(1, dt * 13);
      const angleBlend = Math.min(1, dt * 10);
      portalAllyRenderState.x = lerp(portalAllyRenderState.x, targetX, moveBlend);
      portalAllyRenderState.y = lerp(portalAllyRenderState.y, targetY, moveBlend);
      portalAllyRenderState.angle = lerpAngle(portalAllyRenderState.angle, targetAngle, angleBlend);
      portalAllyRenderState.enginePower = lerp(portalAllyRenderState.enginePower || 0, targetEnginePower, Math.min(1, dt * 8));
      portalAllyRenderState.lastAt = now;
    }
    const allyPlayer = {
      ...portalAlly,
      x:portalAllyRenderState.x,
      y:portalAllyRenderState.y,
      angle:portalAllyRenderState.angle,
      enginePower:portalAllyRenderState.enginePower,
      repairBotActive:false
    };
    const allyShip = {
      id:"ricky_companion",
      img:portalAlly.img || "assets/ships/npc/npc_saucer.png",
      combatImg:portalAlly.img || "assets/ships/npc/npc_saucer.png",
      renderAngleOffset:-Math.PI / 2,
      renderWidth:98,
      renderHeight:98,
      stats:{}
    };
    drawPlayerLayer({
      ctx,
      camera:getState().camera,
      cache,
      player:allyPlayer,
      ship:allyShip,
      drones:[],
      rank:null,
      rankAssetPath:"",
      pilotFirmAssetPath:"",
      pilotName:portalAlly.name || "Ricky",
      pilotRole:"",
      pilotTitle:"Soutien",
      getItemFromInventoryUid,
      getDronePermanentUpgrade,
      droneFormation:"base",
      defaultProfile:defaultEngineProfile,
      profiles:engineProfiles
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
    drawPortalBeacons();
    drawCargoBoxes({ctx, camera, cache, cargoBoxes:state.cargo.getCargoBoxes()});
    drawEnemies({ctx, camera, cache, enemies, selectedEnemy});
    drawImpactEffects({ctx, camera, impactEffects});
    drawBeams({ctx, camera, beams:beams.getBeams()});
    drawPortalAlly();
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
      pilotRole:getLocalPlayerRole(),
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
