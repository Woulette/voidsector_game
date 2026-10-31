import { drawDamageTexts as drawDamageTextsCanvas, drawMiniMap as drawMiniMapCanvas } from "./canvasHud.js?v=20261023-minimap4";
import { drawBeams, drawCargoBoxes, drawEnemies, drawGroundMaterials, drawImpactEffects, drawParticles, drawProjectiles } from "./entities.js?v=20261022-helion-hub1";
import { drawPlayerLayer } from "./player.js?v=20261022-helion-hub1";
import { drawPortalTransitionOverlay } from "./portalTransition.js?v=20260726-kharon1";
import { drawWorldLayer } from "./world.js?v=20261022-helion-hub1";
import { drawSectorPortalTransferFocus } from "./sectorPortalVisual.js?v=20261024-sector-portals1";
import { drawAzuronPortalTransferFocus } from "./azuronPortalVisual.js";
import { drawRemotePlayers } from "../../multiplayer/render.js?v=20261022-helion-hub1";
import { getFirmBadgeAsset } from "../../data/firms.js";
import { RICKY_PORTAL_ASSETS, getRickyPortalWalls, RICKY_PORTAL_MAP } from "../../data/rickyPortal.js";
import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";
import { isCombatProfilerFlagEnabled, setCombatProfilerMetric, timeCombatProfiler } from "../systems/combatFrameProfiler.js?v=20260726-kharon1";
import { hasCompletedProgressionPortal, STELLAR_SYSTEM_TITLE } from "../../shared/progressionUnlocks.js?v=20260726-kharon1";
import { getVesperObjectiveMarkers, isVesperPortal } from "../../data/vesperPortal.js?v=20260726-kharon1";
import { createVesperEncounterRenderer } from "./vesperEncounter.js?v=20261022-helion-hub1";
import { createKharonEncounterRenderer } from "./kharonEncounter.js?v=20260804-motion2";
import { getEclanitePortalWalls, isEclanitePortal } from "../../data/eclanitePortal.js?v=20260726-nox1";
import { createEclaniteEncounterRenderer, getEclaniteObjectiveMarkers } from "./eclaniteEncounter.js?v=20261022-helion-hub1";
import { isNoxPortal } from "../../data/noxPortal.js?v=20260726-nox2";
import { createNoxEncounterRenderer, getNoxObjectiveMarkers } from "./noxEncounter.js?v=20260804-motion2";
import { isPrismaticPortal } from "../../data/prismaticPortal.js?v=20260726-prismatic1";
import { createPrismaticEncounterRenderer, getPrismaticObjectiveMarkers } from "./prismaticEncounter.js?v=20261022-helion-hub1";
import { isAncientPortal } from "../../data/ancientPortal.js?v=20260726-ancient1";
import { createAncientEncounterRenderer, getAncientObjectiveMarkers } from "./ancientEncounter.js?v=20260804-motion2";
import { RICKY_SAUCER_ASSET } from "../../data/rickyVisuals.js?v=20261024-ricky-visuals1";
import { drawRickySaucerEffects, sampleRickySaucerAnimation } from "./rickySaucer.js?v=20261024-ricky-visuals1";
import { drawRickyHealBeacons } from "./rickyHealBeacon.js?v=20261024-ricky-heal1";

function lerp(a, b, t){
  return a + (b - a) * t;
}

function lerpAngle(a, b, t){
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

export function getLocalCombatPilotIdentity(profile){
  const player = profile?.player || {};
  const equipped = player.titleVisible !== false
    && String(player.activeTitleId || "") === STELLAR_SYSTEM_TITLE.id
    && hasCompletedProgressionPortal(profile, STELLAR_SYSTEM_TITLE.portalId);
  return {
    pilotTitle:equipped ? STELLAR_SYSTEM_TITLE.name : "",
    pilotOrnamentId:equipped ? STELLAR_SYSTEM_TITLE.ornamentId : ""
  };
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
  getHoveredStation = ()=>null,
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
  getLocalPlayerRole = ()=>"",
  getGroupRemotePlayers,
  getGroupPingTarget,
  miniMap,
  defaultEngineProfile,
  engineProfiles
}){
  let portalAllyRenderState = null;
  const vesperEncounter = createVesperEncounterRenderer({ctx, cache, getState});
  const kharonEncounter = createKharonEncounterRenderer({ctx, getState});
  const eclaniteEncounter = createEclaniteEncounterRenderer({ctx, cache, getState});
  const noxEncounter = createNoxEncounterRenderer({ctx, getState});
  const prismaticEncounter = createPrismaticEncounterRenderer({ctx, cache, getState});
  const ancientEncounter = createAncientEncounterRenderer({ctx, getState});

  function drawBackground(state = getState()){
    const {currentMap, camera, nebulae, stars, dust, asteroids, player} = state;
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
      hoveredStation:getHoveredStation(),
      graphicsQuality:getGraphicsQuality(),
      graphicsEffects:getGraphicsEffects(),
      getMapPortals,
      getClosedMapPortals,
      portalTransition:state.portalTransition || state.autoTravelTransition
    });
  }

  function drawRadiationOverlay(state = getState()){
    const {gameMode} = state;
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

  function drawDamageTexts(state = getState()){
    if(isCombatProfilerFlagEnabled("hideDamageTexts")) return;
    const {camera, damageTexts} = state;
    drawDamageTextsCanvas({ctx, camera, damageTexts});
  }

  function drawMiniMap(state = getState()){
    const {currentMap, player, enemies, selectedEnemy, moveTarget, gameMode, activePortal, portalObjective, portalBeacons} = state;
    const groupPlayers = getGroupRemotePlayers(currentMap?.id ?? currentMap?.name ?? null);
    const isRickyPortal = gameMode === "portal" && activePortal?.id === "ricky";
    const isVesperEncounter = gameMode === "portal" && isVesperPortal(activePortal);
    const isEclaniteEncounter = gameMode === "portal" && isEclanitePortal(activePortal);
    const isNoxEncounter = gameMode === "portal" && isNoxPortal(activePortal);
    const isPrismaticEncounter = gameMode === "portal" && isPrismaticPortal(activePortal);
    const isAncientEncounter = gameMode === "portal" && isAncientPortal(activePortal);
    drawMiniMapCanvas({
      ctx,
      canvas,
      cache,
      currentMap,
      stations:getSpawnStations(),
      player,
      enemies,
      selectedEnemy,
      rect:miniMap.rect(),
      moveTarget,
      revealAllEnemies:gameMode === "portal",
      collisionWalls:isRickyPortal
        ? getRickyPortalWalls(Boolean(portalObjective?.breachOpen))
        : isEclaniteEncounter
          ? getEclanitePortalWalls(portalObjective?.breaches)
          : [],
      objectiveMarkers:isRickyPortal
        ? portalObjective?.levers || []
        : isVesperEncounter
          ? getVesperObjectiveMarkers(portalObjective, enemies)
          : isEclaniteEncounter
            ? getEclaniteObjectiveMarkers(portalObjective)
            : isNoxEncounter
              ? getNoxObjectiveMarkers(portalObjective)
            : isPrismaticEncounter
              ? getPrismaticObjectiveMarkers(portalObjective, enemies)
            : isAncientEncounter
              ? getAncientObjectiveMarkers(portalObjective)
              : [],
      beacons:isRickyPortal ? portalBeacons || [] : [],
      allies:isVesperEncounter || isAncientEncounter ? portalObjective?.allies || [] : [],
      groupPlayers,
      groupPingTarget:getGroupPingTarget?.() || null,
      closedPortals:getClosedMapPortals(currentMap),
      getMapPortals
    });
  }

  function drawPortalBeacons(state = getState()){
    drawRickyHealBeacons({ctx,camera:state.camera,beacons:state.portalBeacons || [],effects:getGraphicsEffects().portalEffects !== false});
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

  function drawRickyArena(state = getState()){
    const {activePortal, camera, portalObjective, portalCinematic, portalCompleted} = state;
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

  function drawPortalAlly(state = getState()){
    const {portalAlly} = state;
    if(!portalAlly || portalAlly.alive === false || Number(portalAlly.hp || 0) <= 0) return;
    const speed = Math.hypot(Number(portalAlly.vx || 0), Number(portalAlly.vy || 0));
    const now = performance.now();
    const graphicsEffects=getGraphicsEffects();
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
    const pose=sampleRickySaucerAnimation(portalAlly,now);
    const bodyAngle=portalAllyRenderState.angle-Math.PI/2;
    const allyPlayer = {
      ...portalAlly,
      x:portalAllyRenderState.x,
      y:portalAllyRenderState.y,
      angle:portalAllyRenderState.angle,
      enginePower:portalAllyRenderState.enginePower,
      repairBotActive:false,
      visualCorrectionOffsetX:-Math.cos(bodyAngle)*pose.recoil,
      visualCorrectionOffsetY:pose.hover-Math.sin(bodyAngle)*pose.recoil
    };
    const allyShip = {
      id:"ricky_companion",
      img:RICKY_SAUCER_ASSET,
      combatImg:RICKY_SAUCER_ASSET,
      renderAngleOffset:-Math.PI / 2,
      renderWidth:112,
      renderHeight:112,
      stats:{}
    };
    const beacon=(state.portalBeacons || []).filter(entry=>Number(entry.expiresAt)>Date.now()).at(-1);
    const effect={ctx,x:allyPlayer.x+allyPlayer.visualCorrectionOffsetX-state.camera.x,y:allyPlayer.y+allyPlayer.visualCorrectionOffsetY-state.camera.y,
      angle:bodyAngle,size:112,entity:allyPlayer,time:now,beacon:beacon ? {x:beacon.x-state.camera.x,y:beacon.y-state.camera.y} : null,
      portalEffects:graphicsEffects.portalEffects !== false,muzzleFlashes:graphicsEffects.muzzleFlashes !== false,engineTrail:graphicsEffects.shipEngineTrail !== false};
    drawRickySaucerEffects({...effect,layer:"under"});
    drawPlayerLayer({
      ctx,
      camera:state.camera,
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
      profiles:engineProfiles,
      graphicsEffects:{...graphicsEffects,shipEngineTrail:false}
    });
    drawRickySaucerEffects(effect);
  }

  function drawPortgunChannel(state = getState()){
    const {camera, player, portgunChannel} = state;
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
    const {camera, mouse, bullets, particles, enemies, selectedEnemy, impactEffects, beams, player, currentMap, portalTransition} = state;
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
    timeCombatProfiler("draw.background", ()=>drawBackground(state));
    timeCombatProfiler("draw.rickyArena", ()=>drawRickyArena(state));
    timeCombatProfiler("draw.vesperArena", ()=>vesperEncounter.drawArena(state));
    timeCombatProfiler("draw.eclaniteArena", ()=>eclaniteEncounter.drawArena(state));
    timeCombatProfiler("draw.noxArena", ()=>noxEncounter.drawArena(state));
    timeCombatProfiler("draw.prismaticArena", ()=>prismaticEncounter.drawArena(state));
    timeCombatProfiler("draw.ancientArena", ()=>ancientEncounter.drawArena(state));
    timeCombatProfiler("draw.projectiles", ()=>drawProjectiles({ctx, camera, cache, bullets, showTrails:graphicsEffects.projectileTrails !== false}));
    if(!isCombatProfilerFlagEnabled("hideParticles")){
      timeCombatProfiler("draw.particles.main", ()=>drawParticles({ctx, camera, particles, repairLayer:false, graphicsEffects}));
    }
    timeCombatProfiler("draw.groundMaterials", ()=>drawGroundMaterials({ctx, camera, cache, materials:state.cargo.getGroundMaterials()}));
    timeCombatProfiler("draw.portalBeacons", ()=>drawPortalBeacons(state));
    timeCombatProfiler("draw.cargoBoxes", ()=>drawCargoBoxes({ctx, camera, cache, cargoBoxes:state.cargo.getCargoBoxes()}));
    timeCombatProfiler("draw.enemies", ()=>drawEnemies({ctx, camera, cache, enemies, selectedEnemy}));
    timeCombatProfiler("draw.ancientEnemyOverlays", ()=>ancientEncounter.drawEnemyOverlays(state));
    timeCombatProfiler("draw.kharonHazards", ()=>kharonEncounter.drawHazards(state));
    timeCombatProfiler("draw.impactEffects", ()=>drawImpactEffects({ctx, camera, impactEffects, showExplosions:graphicsEffects.explosionsImpacts !== false, showSparksSmoke:graphicsEffects.impactSparksSmoke !== false}));
    if(graphicsEffects.laserBeams !== false) timeCombatProfiler("draw.beams", ()=>drawBeams({ctx, camera, beams:beams.getBeams()}));
    timeCombatProfiler("draw.portalAlly", ()=>drawPortalAlly(state));
    timeCombatProfiler("draw.vesperAllies", ()=>vesperEncounter.drawAllies(state));
    timeCombatProfiler("draw.ancientAllies", ()=>ancientEncounter.drawAllies(state));
    const rank = getCurrentRank();
    const localPilotIdentity = getLocalCombatPilotIdentity(store.state);
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
      pilotTitle:localPilotIdentity.pilotTitle,
      pilotOrnamentId:localPilotIdentity.pilotOrnamentId,
      mouse,
      ornamentAnimationKey:"local-player",
      getItemFromInventoryUid,
      getDronePermanentUpgrade,
      droneFormation:store.state.activeDroneFormation,
      defaultProfile:defaultEngineProfile,
      profiles:engineProfiles,
      graphicsEffects
    }));
    timeCombatProfiler("draw.portgun", ()=>drawPortgunChannel(state));
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
      mouse,
      graphicsEffects
    }));
    if(!isCombatProfilerFlagEnabled("hideParticles")){
      timeCombatProfiler("draw.particles.repair", ()=>drawParticles({ctx, camera, particles, repairLayer:true, graphicsEffects}));
    }
    timeCombatProfiler("draw.damageTexts", ()=>drawDamageTexts(state));
    if(graphicsEffects.portalEffects !== false) timeCombatProfiler("draw.sectorPortalFocus", ()=>drawSectorPortalTransferFocus({ctx,camera,transition:portalTransition || state.autoTravelTransition}));
    if(graphicsEffects.portalEffects !== false) timeCombatProfiler("draw.azuronPortalFocus", ()=>drawAzuronPortalTransferFocus({ctx,camera,transition:portalTransition}));
    ctx.restore();
    canvas.__renderWidth = null;
    canvas.__renderHeight = null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    timeCombatProfiler("draw.radiation", ()=>drawRadiationOverlay(state));
    timeCombatProfiler("draw.minimap", ()=>drawMiniMap(state));
    if(graphicsEffects.portalWarp !== false) timeCombatProfiler("draw.portalTransition", ()=>drawPortalTransitionOverlay({ctx, transition:portalTransition || state.autoTravelTransition, maps:mapList, viewW, viewH}));
  }

  return {drawBackground, drawRadiationOverlay, drawDamageTexts, drawMiniMap, draw};
}
