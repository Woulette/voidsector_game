import { drawDamageTexts as drawDamageTextsCanvas, drawMiniMap as drawMiniMapCanvas } from "./canvasHud.js?v=level-up-1";
import { drawBeams, drawCargoBoxes, drawEnemies, drawGroundMaterials, drawImpactEffects, drawParticles, drawProjectiles } from "./entities.js?v=level-up-1";
import { drawPlayerLayer } from "./player.js?v=elite-lasers-1";
import { drawPortalTransitionOverlay } from "./portalTransition.js?v=action-slots-save-1-fps-burst-1";
import { drawWorldLayer } from "./world.js?v=action-slots-save-1-fps-burst-1";
import { drawRemotePlayers } from "../../multiplayer/render.js?v=action-slots-save-1-fps-burst-1";
import { getFirmBadgeAsset } from "../../data/firms.js";
import { RICKY_PORTAL_ASSETS, getRickyPortalWalls, RICKY_PORTAL_MAP } from "../../data/rickyPortal.js";
import { getCachedCombatImage } from "../combatAssets.js";
import { isCombatProfilerFlagEnabled, setCombatProfilerMetric, timeCombatProfiler } from "../systems/combatFrameProfiler.js?v=action-slots-save-1-fps-burst-1";

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
  getGraphicsEffects = ()=>({}),
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
      spawnProtected:safeAreas.some(area=>area.id === "spawn"),
      stations:getSpawnStations(),
      graphicsQuality:getGraphicsQuality(),
      graphicsEffects:getGraphicsEffects(),
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
    if(isCombatProfilerFlagEnabled("hideDamageTexts")) return;
    const {camera, damageTexts} = getState();
    drawDamageTextsCanvas({ctx, camera, damageTexts});
  }

  function drawMiniMap(){
    const {currentMap, player, enemies, moveTarget, gameMode, activePortal, portalObjective, portalBeacons} = getState();
    const groupPlayers = getGroupRemotePlayers(currentMap?.id ?? currentMap?.name ?? null);
    const isRickyPortal = gameMode === "portal" && activePortal?.id === "ricky";
    drawMiniMapCanvas({
      ctx,
      canvas,
      currentMap,
      player,
      enemies,
      rect:miniMap.rect(),
      moveTarget,
      revealAllEnemies:gameMode === "portal",
      collisionWalls:isRickyPortal ? getRickyPortalWalls(Boolean(portalObjective?.breachOpen)) : [],
      objectiveMarkers:isRickyPortal ? portalObjective?.levers || [] : [],
      beacons:isRickyPortal ? portalBeacons || [] : [],
      groupPlayers,
      groupPingTarget:getGroupPingTarget?.() || null,
      closedPortals:getClosedMapPortals(currentMap),
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

  function readyRickyAsset(src){
    const image = getCachedCombatImage(cache, src);
    return image?.complete && Number(image.naturalWidth || 0) > 0 ? image : null;
  }

  function drawRickyAsteroidWall(wall, image, camera){
    const width = wall.maxX - wall.minX;
    const height = wall.maxY - wall.minY;
    const horizontal = width >= height;
    const axisLength = horizontal ? width : height;
    const tileCount = Math.max(1, Math.ceil(axisLength / 390));
    const step = axisLength / tileCount;
    const drawLength = step + 48;
    const aspect = Number(image.naturalWidth || 1) / Math.max(1, Number(image.naturalHeight || 1));
    const drawDepth = Math.max(205, Math.min(245, drawLength / aspect));
    const centerX = (wall.minX + wall.maxX) / 2;
    const centerY = (wall.minY + wall.maxY) / 2;

    for(let index = 0; index < tileCount; index += 1){
      const offset = -axisLength / 2 + step * (index + .5);
      const x = (horizontal ? centerX + offset : centerX) - camera.x;
      const y = (horizontal ? centerY : centerY + offset) - camera.y;
      ctx.save();
      ctx.translate(x, y);
      if(!horizontal) ctx.rotate(Math.PI / 2);
      if(index % 2) ctx.scale(-1, 1);
      ctx.globalAlpha = .98;
      ctx.drawImage(image, -drawLength / 2, -drawDepth / 2, drawLength, drawDepth);
      ctx.restore();
    }
  }

  function drawRickyAsteroidCorners(image, camera){
    const {left, right, top, bottom} = RICKY_PORTAL_MAP.chamber;
    const width = 350;
    const height = width * Number(image.naturalHeight || 1) / Math.max(1, Number(image.naturalWidth || 1));
    const anchorX = width * .29;
    const anchorY = height * .69;
    const corners = [
      {x:left, y:top, scaleX:1, scaleY:-1, rotation:0},
      {x:right, y:top, scaleX:1, scaleY:1, rotation:Math.PI},
      {x:right, y:bottom, scaleX:-1, scaleY:1, rotation:0},
      {x:left, y:bottom, scaleX:1, scaleY:1, rotation:0}
    ];
    for(const corner of corners){
      ctx.save();
      ctx.translate(corner.x - camera.x, corner.y - camera.y);
      ctx.rotate(corner.rotation);
      ctx.scale(corner.scaleX, corner.scaleY);
      ctx.drawImage(image, -anchorX, -anchorY, width, height);
      ctx.restore();
    }
  }

  function drawFallbackRickyWall(wall, camera){
    const x = wall.minX - camera.x;
    const y = wall.minY - camera.y;
    const width = wall.maxX - wall.minX;
    const height = wall.maxY - wall.minY;
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "rgba(15,23,42,.98)");
    gradient.addColorStop(.5, "rgba(51,65,85,.98)");
    gradient.addColorStop(1, "rgba(2,6,23,.98)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  function drawRickyArena(){
    const {activePortal, camera, portalObjective, portalCinematic, portalCompleted} = getState();
    if(activePortal?.id !== "ricky") return;
    const now = performance.now();
    const pulse = (Math.sin(now / 260) + 1) / 2;
    const wallImage = readyRickyAsset(RICKY_PORTAL_ASSETS.asteroidWallStraight);
    const cornerImage = readyRickyAsset(RICKY_PORTAL_ASSETS.asteroidWallCorner);
    ctx.save();
    for(const wall of getRickyPortalWalls(Boolean(portalObjective?.breachOpen))){
      if(wallImage) drawRickyAsteroidWall(wall, wallImage, camera);
      else drawFallbackRickyWall(wall, camera);
    }
    if(cornerImage) drawRickyAsteroidCorners(cornerImage, camera);

    for(const lever of portalObjective?.levers || []){
      const x = Number(lever.x || 0) - camera.x;
      const y = Number(lever.y || 0) - camera.y;
      const active = Boolean(lever.active);
      const unlocked = Boolean(lever.unlocked);
      const leverImage = readyRickyAsset(active ? RICKY_PORTAL_ASSETS.leverActive : RICKY_PORTAL_ASSETS.leverInactive);
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = active ? "rgba(74,222,128,.9)" : unlocked ? "rgba(56,189,248,.85)" : "rgba(100,116,139,.7)";
      ctx.shadowBlur = 18 + pulse * 8;
      if(leverImage){
        const drawWidth = 150;
        const drawHeight = drawWidth * Number(leverImage.naturalHeight || 1) / Math.max(1, Number(leverImage.naturalWidth || 1));
        const baseRatio = active ? .50 : .70;
        ctx.drawImage(leverImage, -drawWidth / 2, -drawHeight * baseRatio, drawWidth, drawHeight);
      }else{
        ctx.fillStyle = active ? "rgba(22,101,52,.95)" : unlocked ? "rgba(8,47,73,.98)" : "rgba(15,23,42,.98)";
        ctx.strokeStyle = active ? "#4ade80" : unlocked ? "#38bdf8" : "#64748b";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.textAlign = "center";
      ctx.font = "900 12px Rajdhani, Arial";
      ctx.fillStyle = active ? "#dcfce7" : unlocked ? "#e0f2fe" : "#94a3b8";
      ctx.fillText(`LEVIER ${lever.number || ""}`, 0, active ? -96 : -150);
      ctx.font = "800 10px Rajdhani, Arial";
      ctx.fillStyle = active ? "#86efac" : unlocked ? "#7dd3fc" : "#94a3b8";
      ctx.fillText(active ? "ACTIVE" : unlocked ? "ACTIVER" : "VERROUILLE", 0, 92);
      const activation = lever.activation;
      if(activation){
        const barY = active ? -126 : -180;
        ctx.fillStyle = "rgba(2,6,23,.92)";
        ctx.fillRect(-72, barY, 144, 12);
        ctx.fillStyle = activation.blocked ? "#f87171" : "#facc15";
        ctx.fillRect(-70, barY + 2, 140 * Math.max(0, Math.min(1, Number(activation.progress || 0))), 8);
        ctx.strokeStyle = "rgba(226,232,240,.65)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-72, barY, 144, 12);
      }
      ctx.restore();
    }

    if(portalObjective?.breachOpen || portalObjective?.cageSpawned || portalCinematic){
      const cageX = RICKY_PORTAL_MAP.cage.x - camera.x;
      const cageY = RICKY_PORTAL_MAP.cage.y - camera.y;
      const destroyed = Boolean(portalCompleted || portalObjective?.completedAt || portalObjective?.stage === "complete");
      const cageImage = readyRickyAsset(destroyed ? RICKY_PORTAL_ASSETS.cageDestroyed : RICKY_PORTAL_ASSETS.cageIntact);
      ctx.save();
      ctx.translate(cageX, cageY);
      ctx.shadowColor = destroyed ? "rgba(249,115,22,.72)" : "rgba(250,204,21,.8)";
      ctx.shadowBlur = 22;
      if(cageImage){
        const drawWidth = destroyed ? 350 : 300;
        const drawHeight = drawWidth * Number(cageImage.naturalHeight || 1) / Math.max(1, Number(cageImage.naturalWidth || 1));
        ctx.drawImage(cageImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      }else{
        ctx.strokeStyle = destroyed ? "#f97316" : "#facc15";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(0, 0, RICKY_PORTAL_MAP.cage.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(253,224,71,.75)";
        ctx.lineWidth = 5;
        if(!destroyed){
          for(let x = -105; x <= 105; x += 35){
            ctx.beginPath();
            ctx.moveTo(x, -112);
            ctx.lineTo(x, 112);
            ctx.stroke();
          }
        }
      }
      ctx.shadowBlur = 0;
      if(portalCinematic){
        ctx.textAlign = "center";
        ctx.fillStyle = "#fef08a";
        ctx.font = "900 32px Rajdhani, Arial";
        ctx.fillText(portalCinematic.message || "A l'aiiiideeee !!", 0, -205);
      }
      ctx.restore();
    }
    ctx.restore();
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

  function drawPortgunChannel(){
    const {camera, player, portgunChannel} = getState();
    if(!portgunChannel || !player) return;
    const remainingMs = Math.max(0, Number(portgunChannel.completeAt || 0) - Date.now());
    if(remainingMs <= 0) return;
    const durationMs = Math.max(1, Number(portgunChannel.durationMs || 20000));
    const progress = Math.max(0, Math.min(1, 1 - remainingMs / durationMs));
    const x = Number(player.x || 0) - camera.x;
    const y = Number(player.y || 0) - camera.y;
    const pulse = (Math.sin(performance.now() / 110) + 1) / 2;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3;
    for(let index = 0; index < 4; index += 1){
      const phase = (progress + index / 4) % 1;
      const radius = 32 + (1 - phase) * 110;
      ctx.strokeStyle = `rgba(74,222,128,${.22 + phase * .62})`;
      ctx.shadowColor = "rgba(34,211,238,.9)";
      ctx.shadowBlur = 12 + pulse * 8;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 76);
    glow.addColorStop(0, `rgba(74,222,128,${.18 + pulse * .10})`);
    glow.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 23px Rajdhani, Arial";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(2,6,23,.95)";
    ctx.fillStyle = "#86efac";
    const timer = `${Math.max(1, Math.ceil(remainingMs / 1000))} SEC`;
    ctx.strokeText(timer, x, y - 112);
    ctx.fillText(timer, x, y - 112);
    ctx.font = "800 14px Rajdhani, Arial";
    ctx.fillStyle = "#bae6fd";
    ctx.fillText(String(portgunChannel.targetMapName || "secteur").toUpperCase(), x, y - 88);
    ctx.restore();
  }

  function draw(){
    const state = getState();
    const {camera, bullets, particles, enemies, selectedEnemy, impactEffects, beams, player, currentMap, portalTransition} = state;
    const dpr = canvas.__dpr || 1;
    const viewW = getCanvasViewWidth();
    const viewH = getCanvasViewHeight();
    const zoom = camera?.zoom || 1;
    const graphicsEffects = getGraphicsEffects();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    canvas.__renderWidth = viewW / zoom;
    canvas.__renderHeight = viewH / zoom;
    ctx.save();
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    setCombatProfilerMetric("draw.enemies.count", enemies?.length || 0);
    setCombatProfilerMetric("draw.bullets.count", bullets?.length || 0);
    setCombatProfilerMetric("draw.particles.count", particles?.length || 0);
    setCombatProfilerMetric("draw.damageTexts.count", state.damageTexts?.length || 0);
    timeCombatProfiler("draw.background", drawBackground);
    timeCombatProfiler("draw.rickyArena", drawRickyArena);
    timeCombatProfiler("draw.projectiles", ()=>drawProjectiles({ctx, camera, cache, bullets, showTrails:graphicsEffects.projectileTrails !== false}));
    if(!isCombatProfilerFlagEnabled("hideParticles")){
      timeCombatProfiler("draw.particles.main", ()=>drawParticles({ctx, camera, particles, repairLayer:false, graphicsEffects}));
    }
    timeCombatProfiler("draw.groundMaterials", ()=>drawGroundMaterials({ctx, camera, cache, materials:state.cargo.getGroundMaterials()}));
    timeCombatProfiler("draw.portalBeacons", drawPortalBeacons);
    timeCombatProfiler("draw.cargoBoxes", ()=>drawCargoBoxes({ctx, camera, cache, cargoBoxes:state.cargo.getCargoBoxes()}));
    timeCombatProfiler("draw.enemies", ()=>drawEnemies({ctx, camera, cache, enemies, selectedEnemy}));
    timeCombatProfiler("draw.impactEffects", ()=>drawImpactEffects({ctx, camera, impactEffects, showExplosions:graphicsEffects.explosionsImpacts !== false, showSparksSmoke:graphicsEffects.impactSparksSmoke !== false}));
    if(graphicsEffects.laserBeams !== false) timeCombatProfiler("draw.beams", ()=>drawBeams({ctx, camera, beams:beams.getBeams()}));
    timeCombatProfiler("draw.portalAlly", drawPortalAlly);
    const rank = getCurrentRank();
    timeCombatProfiler("draw.player", ()=>drawPlayerLayer({
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
      profiles:engineProfiles,
      graphicsEffects
    }));
    timeCombatProfiler("draw.portgun", drawPortgunChannel);
    timeCombatProfiler("draw.remotePlayers", ()=>drawRemotePlayers({
      ctx,
      camera,
      cache,
      currentMapId:currentMap?.id ?? currentMap?.name ?? null,
      ships:shipList,
      defaultProfile:defaultEngineProfile,
      profiles:engineProfiles,
      selectedEnemy,
      player,
      enemies,
      graphicsEffects
    }));
    if(!isCombatProfilerFlagEnabled("hideParticles")){
      timeCombatProfiler("draw.particles.repair", ()=>drawParticles({ctx, camera, particles, repairLayer:true, graphicsEffects}));
    }
    timeCombatProfiler("draw.damageTexts", drawDamageTexts);
    ctx.restore();
    canvas.__renderWidth = null;
    canvas.__renderHeight = null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    timeCombatProfiler("draw.radiation", drawRadiationOverlay);
    timeCombatProfiler("draw.minimap", drawMiniMap);
    if(graphicsEffects.portalWarp !== false) timeCombatProfiler("draw.portalTransition", ()=>drawPortalTransitionOverlay({ctx, transition:portalTransition, maps:mapList, viewW, viewH}));
  }

  return {drawBackground, drawRadiationOverlay, drawDamageTexts, drawMiniMap, draw};
}
