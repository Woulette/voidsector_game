import { multiplayer } from "./client.js?v=action-slots-save-1-fps-burst-1";
import { drawPlayerLayer } from "../game/render/player.js?v=elite-lasers-1";
import { getFirmBadgeAsset } from "../data/firms.js";
import { getCachedCombatImage } from "../game/combatAssets.js";
import { drawTargetSelectionOverlay } from "../game/render/targetOverlay.js";

function lerp(a, b, t){
  return a + (b - a) * t;
}

function lerpAngle(a, b, t){
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

function sampleBufferedState(samples, delayMs = 115){
  if(!Array.isArray(samples) || samples.length <= 0) return null;
  const ordered = samples.filter(sample=>Number.isFinite(sample?.receivedAt)).sort((a, b)=>a.receivedAt - b.receivedAt);
  if(!ordered.length) return null;
  const targetTime = performance.now() - delayMs;
  if(targetTime <= ordered[0].receivedAt) return ordered[0];
  for(let i = 0; i < ordered.length - 1; i++){
    const from = ordered[i];
    const to = ordered[i + 1];
    if(targetTime < from.receivedAt || targetTime > to.receivedAt) continue;
    const span = Math.max(1, to.receivedAt - from.receivedAt);
    const t = Math.max(0, Math.min(1, (targetTime - from.receivedAt) / span));
    return {
      x:lerp(Number(from.x || 0), Number(to.x || 0), t),
      y:lerp(Number(from.y || 0), Number(to.y || 0), t),
      angle:lerpAngle(Number(from.angle || 0), Number(to.angle || 0), t),
      engineAngle:lerpAngle(Number(from.engineAngle ?? from.angle ?? 0), Number(to.engineAngle ?? to.angle ?? 0), t),
      vx:lerp(Number(from.vx || 0), Number(to.vx || 0), t),
      vy:lerp(Number(from.vy || 0), Number(to.vy || 0), t),
      enginePower:lerp(Number(from.enginePower || 0), Number(to.enginePower || 0), t),
      hp:to.hp,
      maxHp:to.maxHp,
      shield:to.shield,
      maxShield:to.maxShield,
      level:to.level,
      speed:to.speed,
      radius:to.radius,
      droneCount:to.droneCount,
      droneUpgrades:to.droneUpgrades,
      activeDroneFormation:to.activeDroneFormation,
      shipId:to.shipId,
      shipImg:to.shipImg,
      rankName:to.rankName,
      rankAssetPath:to.rankAssetPath,
      mapId:to.mapId,
      attackTargetId:to.attackTargetId || "",
      engineTrailLocked:Boolean(to.engineTrailLocked || to.attackTargetId)
    };
  }
  const latest = ordered[ordered.length - 1];
  const extrapolateSeconds = Math.max(0, Math.min(.12, (targetTime - latest.receivedAt) / 1000));
  return {
    ...latest,
    x:Number(latest.x || 0) + Number(latest.vx || 0) * extrapolateSeconds,
    y:Number(latest.y || 0) + Number(latest.vy || 0) * extrapolateSeconds
  };
}

function getCachedImage(cache, src){
  return getCachedCombatImage(cache, src);
}

function colorWithAlpha(color, alpha){
  const value = String(color || "");
  const rgba = value.match(/^rgba?\(([^)]+)\)$/);
  if(!rgba) return `rgba(56,189,248,${alpha})`;
  const parts = rgba[1].split(",").map(part=>part.trim());
  return `rgba(${parts[0] || 56},${parts[1] || 189},${parts[2] || 248},${alpha})`;
}

function getRemoteRenderState(remote, state){
  const buffered = sampleBufferedState(remote.stateSamples) || state;
  if(!remote.renderState){
    remote.renderState = {
      x:Number(buffered.x || 0),
      y:Number(buffered.y || 0),
      angle:Number(buffered.angle || 0),
      engineAngle:Number(buffered.engineAngle ?? buffered.angle ?? 0),
      enginePower:Number(buffered.enginePower || 0)
    };
    return remote.renderState;
  }
  const render = remote.renderState;
  render.x = lerp(render.x, Number(buffered.x || 0), .55);
  render.y = lerp(render.y, Number(buffered.y || 0), .55);
  render.angle = lerpAngle(render.angle, Number(buffered.angle || 0), .55);
  render.engineAngle = lerpAngle(render.engineAngle ?? render.angle, Number(buffered.engineAngle ?? buffered.angle ?? 0), .55);
  const speed = Math.hypot(Number(buffered.vx || 0), Number(buffered.vy || 0));
  const targetPower = Math.max(Number(buffered.enginePower || 0), Math.min(1, speed / 120));
  render.enginePower = lerp(render.enginePower || 0, targetPower, .50);
  return render;
}

function drawRemoteEngine(ctx, power){
  const p = Math.max(0, Math.min(1, Number(power || 0)));
  if(p <= .03) return;
  const flicker = .82 + Math.random() * .22;
  const length = (26 + p * 38) * flicker;
  const width = 14 + p * 18;
  const gradient = ctx.createLinearGradient(0, 36, 0, 36 + length);
  gradient.addColorStop(0, `rgba(255,255,255,${.58 * p})`);
  gradient.addColorStop(.28, `rgba(56,189,248,${.78 * p})`);
  gradient.addColorStop(1, "rgba(14,165,233,0)");
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, 38 + length);
  ctx.lineTo(width, 28);
  ctx.lineTo(0, 42);
  ctx.lineTo(-width, 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function buildRemoteShip(state, ships = []){
  return ships.find(ship=>ship.id === state.shipId) || {
    id:state.shipId || "remote_ship",
    img:state.shipImg || "assets/ships/intercepteur.png",
    combatImg:state.shipImg || "assets/ships/intercepteur.png"
  };
}

function buildRemotePlayer(render, state){
  return {
    x:render.x,
    y:render.y,
    angle:render.angle,
    engineAngle:Number(render.engineAngle ?? state.engineAngle ?? render.angle),
    vx:Number(state.vx || 0),
    vy:Number(state.vy || 0),
    speed:Number(state.speed || 0),
    hp:Number(state.hp || 0),
    maxHp:Number(state.maxHp || state.hp || 1),
    shield:Number(state.shield || 0),
    maxShield:Number(state.maxShield || state.shield || 0),
    enginePower:render.enginePower,
    engineTrailLocked:Boolean(state.engineTrailLocked || state.attackTargetId),
    engineParticleT:0,
    repairBotActive:false
  };
}

function buildRemoteDrones(remote, state){
  const count = Math.max(0, Math.min(10, Math.floor(Number(state?.droneCount || 0))));
  return Array.from({length:count}, (_, index)=>`remote:${remote.id}:drone:${index}`);
}

function drawSelectedRemoteOverlay({ctx, camera, remote, state, selectedEnemy}){
  if(!selectedEnemy?.isPlayerTarget || selectedEnemy.playerId !== remote.id) return;
  const x = Number(state.x || 0) - camera.x;
  const y = Number(state.y || 0) - camera.y;
  const radius = Math.max(48, Number(state.radius || 48)) + 15;
  drawTargetSelectionOverlay({ctx, x, y, radius});
}

function findRemoteLockedTarget({remote, player, enemies = []}){
  const targetId = String(remote?.state?.attackTargetId || "");
  if(!targetId) return null;
  if(targetId === `player:${multiplayer.playerId}`) return player || null;
  if(targetId.startsWith("player:")) return multiplayer.remotePlayers.get(targetId.slice(7))?.state || null;
  return enemies.find(enemy=>String(enemy.serverId || enemy.id || "") === targetId) || null;
}

export function drawRemotePlayers({
  ctx,
  camera,
  cache = {},
  currentMapId = null,
  ships = [],
  defaultProfile = null,
  profiles = {},
  selectedEnemy = null,
  player = null,
  enemies = [],
  graphicsEffects = {}
}){
  const now = Date.now();
  for(const remote of multiplayer.remotePlayers.values()){
    const state = remote.state;
    if(!state || (remote.connected !== false && now - Number(state.updatedAt || 0) > 10000)) continue;
    if(currentMapId !== null && String(state.mapId) !== String(currentMapId)) continue;
    const render = getRemoteRenderState(remote, state);
    const sampledState = sampleBufferedState(remote.stateSamples) || state;
    const lockedTarget = findRemoteLockedTarget({remote, player, enemies});
    if(lockedTarget){
      render.angle = Math.atan2(Number(lockedTarget.y || 0) - render.y, Number(lockedTarget.x || 0) - render.x) + Math.PI / 2;
    }
    const ship = buildRemoteShip(sampledState, ships);
    getCachedImage(cache, "assets/drones/drone_test_sprite.webp");
    getCachedImage(cache, ship.combatImg || ship.img);
    getCachedImage(cache, sampledState.rankAssetPath);

    if(defaultProfile){
      drawPlayerLayer({
        ctx,
        camera,
        cache,
        player:buildRemotePlayer(render, sampledState),
        ship,
        drones:buildRemoteDrones(remote, sampledState),
        rank:{name:sampledState.rankName || ""},
        rankAssetPath:sampledState.rankAssetPath || "",
        pilotFirmAssetPath:getFirmBadgeAsset(remote.firmId || "astra"),
        pilotName:String(remote.name || "Pilote").slice(0, 24),
        pilotRole:remote.role || "",
        pilotTitle:"",
        getItemFromInventoryUid:()=>null,
        getDronePermanentUpgrade:index=>Boolean(sampledState.droneUpgrades?.[index]),
        droneFormation:sampledState.activeDroneFormation || "base",
        defaultProfile,
        profiles,
        graphicsEffects
      });
      drawSelectedRemoteOverlay({ctx, camera, remote, state:{...sampledState, x:render.x, y:render.y}, selectedEnemy});
    }else{
      const x = render.x - camera.x;
      const y = render.y - camera.y;
      const angle = render.angle;
      const shipImg = getCachedImage(cache, state.shipImg);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      drawRemoteEngine(ctx, render.enginePower);
      ctx.shadowColor = "rgba(34,211,238,.75)";
      ctx.shadowBlur = 18;
      if(shipImg?.complete) ctx.drawImage(shipImg, -48, -48, 96, 96);
      else{
        ctx.fillStyle = "rgba(56,189,248,.88)";
        ctx.strokeStyle = "rgba(226,232,240,.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(30, 34);
        ctx.lineTo(0, 18);
        ctx.lineTo(-30, 34);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      drawSelectedRemoteOverlay({ctx, camera, remote, state:{...sampledState, x:render.x, y:render.y}, selectedEnemy});
    }
  }
}
