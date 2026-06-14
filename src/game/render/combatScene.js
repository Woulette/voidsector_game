import { drawDamageTexts as drawDamageTextsCanvas, drawMiniMap as drawMiniMapCanvas } from "./canvasHud.js";
import { drawBeams, drawCargoBoxes, drawEnemies, drawGroundMaterials, drawImpactEffects, drawParticles, drawProjectiles } from "./entities.js";
import { drawPlayerLayer } from "./player.js";
import { drawPortalTransitionOverlay } from "./portalTransition.js";
import { drawWorldLayer } from "./world.js";
import { drawRemotePlayers } from "../../multiplayer/render.js";
import { getFirmBadgeAsset } from "../../data/firms.js";
import { getRickyPortalWalls, RICKY_PORTAL_MAP } from "../../data/rickyPortal.js";

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

  function drawRickyArena(){
    const {activePortal, camera, portalObjective, portalCinematic} = getState();
    if(activePortal?.id !== "ricky") return;
    const now = performance.now();
    const pulse = (Math.sin(now / 260) + 1) / 2;
    ctx.save();
    for(const wall of getRickyPortalWalls(Boolean(portalObjective?.breachOpen))){
      const x = wall.minX - camera.x;
      const y = wall.minY - camera.y;
      const width = wall.maxX - wall.minX;
      const height = wall.maxY - wall.minY;
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, "rgba(14,39,58,.98)");
      gradient.addColorStop(.5, "rgba(32,68,82,.98)");
      gradient.addColorStop(1, "rgba(8,22,37,.98)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = "rgba(34,211,238,.62)";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
    }
    const breachX = -camera.x;
    const breachY = RICKY_PORTAL_MAP.chamber.bottom - camera.y;
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = portalObjective?.breachOpen
      ? `rgba(74,222,128,${.45 + pulse * .35})`
      : `rgba(250,204,21,${.32 + pulse * .20})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(breachX - RICKY_PORTAL_MAP.chamber.breachHalfWidth, breachY);
    ctx.lineTo(breachX + RICKY_PORTAL_MAP.chamber.breachHalfWidth, breachY);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    for(const lever of portalObjective?.levers || []){
      const x = Number(lever.x || 0) - camera.x;
      const y = Number(lever.y || 0) - camera.y;
      const active = Boolean(lever.active);
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = active ? "rgba(74,222,128,.9)" : "rgba(56,189,248,.85)";
      ctx.shadowBlur = 18 + pulse * 8;
      ctx.fillStyle = active ? "rgba(22,101,52,.95)" : "rgba(8,47,73,.98)";
      ctx.strokeStyle = active ? "#4ade80" : "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = active ? "#dcfce7" : "#e0f2fe";
      ctx.font = "900 18px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.fillText(active ? "ON" : "ACTIVER", 0, 6);
      const activation = lever.activation;
      if(activation){
        ctx.fillStyle = "rgba(2,6,23,.92)";
        ctx.fillRect(-72, -86, 144, 12);
        ctx.fillStyle = activation.blocked ? "#f87171" : "#facc15";
        ctx.fillRect(-70, -84, 140 * Math.max(0, Math.min(1, Number(activation.progress || 0))), 8);
        ctx.strokeStyle = "rgba(226,232,240,.65)";
        ctx.lineWidth = 1;
        ctx.strokeRect(-72, -86, 144, 12);
      }
      ctx.restore();
    }

    if(portalObjective?.breachOpen || portalObjective?.cageSpawned || portalCinematic){
      const cageX = RICKY_PORTAL_MAP.cage.x - camera.x;
      const cageY = RICKY_PORTAL_MAP.cage.y - camera.y;
      ctx.save();
      ctx.translate(cageX, cageY);
      ctx.shadowColor = "rgba(250,204,21,.8)";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, RICKY_PORTAL_MAP.cage.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(253,224,71,.75)";
      ctx.lineWidth = 5;
      for(let x = -105; x <= 105; x += 35){
        ctx.beginPath();
        ctx.moveTo(x, -112);
        ctx.lineTo(x, 112);
        ctx.stroke();
      }
      ctx.fillStyle = "#f8fafc";
      ctx.font = "900 24px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.fillText("DEADLY", 0, 8);
      if(portalCinematic){
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    canvas.__renderWidth = viewW / zoom;
    canvas.__renderHeight = viewH / zoom;
    ctx.save();
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    drawBackground();
    drawRickyArena();
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
    drawPortgunChannel();
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
