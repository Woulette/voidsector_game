import { multiplayer } from "./client.js?v=20261018-map-transfer1";
import { drawPlayerLayer } from "../game/render/player.js?v=20261022-helion-hub1";
import { getFirmBadgeAsset } from "../data/firms.js";
import { getCachedCombatImage } from "../game/combatAssets.js?v=20261022-helion-hub1";
import { drawTargetSelectionOverlay } from "../game/render/targetOverlay.js";
import { isRemoteStateInViewport, sampleBufferedState, updateRemoteRenderState } from "./remoteInterpolation.js?v=20260905-motion3";

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

function buildRemoteShip(remote, state, ships = []){
  const cacheKey = `${state.shipId || ""}:${state.shipImg || ""}`;
  if(remote.renderShip?.cacheKey === cacheKey) return remote.renderShip.value;
  const value = ships.find(ship=>ship.id === state.shipId) || {
    id:state.shipId || "remote_ship",
    img:state.shipImg || "assets/ships/intercepteur.png",
    combatImg:state.shipImg || "assets/ships/intercepteur.png"
  };
  remote.renderShip = {cacheKey, value};
  return value;
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
  if(remote.renderDrones?.length === count) return remote.renderDrones;
  remote.renderDrones = Array.from({length:count}, (_, index)=>`remote:${remote.id}:drone:${index}`);
  return remote.renderDrones;
}

function drawSelectedRemoteOverlay({ctx, camera, remote, render, state, selectedEnemy}){
  if(!selectedEnemy?.isPlayerTarget || selectedEnemy.playerId !== remote.id) return;
  const x = Number(render.x || 0) - camera.x;
  const y = Number(render.y || 0) - camera.y;
  const radius = Math.max(48, Number(state.radius || 48)) + 15;
  drawTargetSelectionOverlay({ctx, x, y, radius});
}

function findRemoteLockedTarget({remote, player, getEnemyById}){
  const targetId = String(remote?.state?.attackTargetId || "");
  if(!targetId) return null;
  if(targetId === `player:${multiplayer.playerId}`) return player || null;
  if(targetId.startsWith("player:")) return multiplayer.remotePlayers.get(targetId.slice(7))?.state || null;
  return getEnemyById(targetId);
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
  mouse = null,
  graphicsEffects = {}
}){
  const now = Date.now();
  const renderNow = performance.now();
  let enemyById = null;
  const getEnemyById = id=>{
    if(!enemyById){
      enemyById = new Map(enemies.map(enemy=>[String(enemy.serverId || enemy.id || ""), enemy]));
    }
    return enemyById.get(String(id || "")) || null;
  };
  for(const remote of multiplayer.remotePlayers.values()){
    const state = remote.state;
    if(!state || (remote.connected !== false && now - Number(remote.lastReceivedAt || state.updatedAt || 0) > 10000)) continue;
    if(currentMapId !== null && String(state.mapId) !== String(currentMapId)) continue;
    remote.sampledState ||= {};
    remote.interpolationState ||= {};
    const sampledState = sampleBufferedState(remote.stateSamples, {
      now:renderNow,
      target:remote.sampledState,
      timing:remote.interpolationState,
      diagnostics:remote.networkDiagnostics
    }) || state;
    const render = updateRemoteRenderState(remote, sampledState, renderNow);
    if(!isRemoteStateInViewport({render, camera, canvas:ctx.canvas, radius:sampledState.radius})) continue;
    const lockedTarget = findRemoteLockedTarget({remote, player, getEnemyById});
    if(lockedTarget){
      render.angle = Math.atan2(Number(lockedTarget.y || 0) - render.y, Number(lockedTarget.x || 0) - render.x) + Math.PI / 2;
    }
    const ship = buildRemoteShip(remote, sampledState, ships);
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
        pilotTitle:String(sampledState.pilotTitle || "").slice(0, 64),
        pilotOrnamentId:String(sampledState.pilotOrnamentId || "").slice(0, 64),
        mouse,
        ornamentAnimationKey:`remote-player:${remote.id}`,
        getItemFromInventoryUid:()=>null,
        getDronePermanentUpgrade:index=>Boolean(sampledState.droneUpgrades?.[index]),
        droneFormation:sampledState.activeDroneFormation || "base",
        defaultProfile,
        profiles,
        graphicsEffects
      });
      drawSelectedRemoteOverlay({ctx, camera, remote, render, state:sampledState, selectedEnemy});
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
      drawSelectedRemoteOverlay({ctx, camera, remote, render, state:sampledState, selectedEnemy});
    }
  }
}
