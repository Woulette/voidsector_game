import {
  getVesperEntityVisualKind,
  isVesperPortal,
  normalizeVesperObjective,
  VESPER_CAGE_DESTROYED_ASSET,
  VESPER_CAGE_INTACT_ASSET,
  VESPER_DRONE_ASSET
} from "../../data/vesperPortal.js?v=20260726-kharon1";
import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";

function clamp01(value){
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function entityScreenPoint(entity, camera){
  return {
    x:Number(entity?.x || 0) - Number(camera?.x || 0),
    y:Number(entity?.y || 0) - Number(camera?.y || 0)
  };
}

function readyImage(cache, src){
  const image = getCachedCombatImage(cache, src);
  return image?.complete && Number(image.naturalWidth || 0) > 0 ? image : null;
}

function getCageNumber(cage){
  const explicit = Number(cage?.number || cage?.vesperCageNumber || 0);
  if(Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const match = String(cage?.type || cage?.id || "").match(/(?:cage|vesper)[^\d]*(\d+)/i);
  return match ? Number(match[1]) : "";
}

function drawRedDroneSprite({ctx, camera, cache, entity, width, height, alpha = 1, glow = 16}){
  const point = entityScreenPoint(entity, camera);
  const image = readyImage(cache, entity?.img || VESPER_DRONE_ASSET);
  const angle = Number(entity?.angle || 0);
  ctx.save();
  ctx.translate(Math.round(point.x), Math.round(point.y));
  ctx.rotate(angle);
  ctx.globalAlpha = clamp01(alpha);
  ctx.shadowColor = "rgba(239,51,64,.92)";
  ctx.shadowBlur = glow;
  if(image){
    ctx.filter = "grayscale(.72) sepia(1) saturate(7.5) hue-rotate(315deg) brightness(.88) contrast(1.12)";
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.filter = "none";
    ctx.strokeStyle = "rgba(254,202,202,.82)";
    ctx.lineWidth = Math.max(1.5, width * .018);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(width, height) * .31, 0, Math.PI * 2);
    ctx.stroke();
  }else{
    ctx.fillStyle = "#ef3340";
    ctx.beginPath();
    ctx.moveTo(0, -height / 2);
    ctx.lineTo(width / 2, height * .34);
    ctx.lineTo(width * .18, height / 2);
    ctx.lineTo(0, height * .26);
    ctx.lineTo(-width * .18, height / 2);
    ctx.lineTo(-width / 2, height * .34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawCapturedDrone({ctx, cache, cageWidth, pulse}){
  const image = readyImage(cache, VESPER_DRONE_ASSET);
  const size = Math.max(58, cageWidth * .40);
  ctx.save();
  ctx.translate(0, -cageWidth * .035);
  ctx.fillStyle = "rgba(2,6,23,.88)";
  ctx.shadowColor = "rgba(239,51,64,.9)";
  ctx.shadowBlur = 15 + pulse * 7;
  ctx.beginPath();
  ctx.arc(0, 0, size * .50, 0, Math.PI * 2);
  ctx.fill();
  if(image){
    ctx.filter = "grayscale(.72) sepia(1) saturate(7.5) hue-rotate(315deg) brightness(.88) contrast(1.12)";
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.filter = "none";
  }else{
    ctx.fillStyle = "#ef3340";
    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 2, size * .30);
    ctx.lineTo(0, size * .20);
    ctx.lineTo(-size / 2, size * .30);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(251,146,60,.82)";
  ctx.lineWidth = Math.max(2, cageWidth * .018);
  for(const x of [-size * .35, 0, size * .35]){
    ctx.beginPath();
    ctx.moveTo(x, -size * .58);
    ctx.lineTo(x, size * .58);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCageVisual({ctx, camera, cache, cage, destroyed = false, showLabel = true}){
  const point = entityScreenPoint(cage, camera);
  const image = readyImage(cache, destroyed ? VESPER_CAGE_DESTROYED_ASSET : VESPER_CAGE_INTACT_ASSET);
  const width = Math.max(150, Number(cage?.width || cage?.radius * 2.25 || 250));
  const cageNumber = getCageNumber(cage);
  const pulse = .5 + Math.sin(performance.now() / 220 + Number(cageNumber || 0)) * .5;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.shadowColor = destroyed ? "rgba(74,222,128,.58)" : "rgba(192,38,211,.84)";
  ctx.shadowBlur = 18 + pulse * 10;
  if(image){
    const height = width * Number(image.naturalHeight || 1) / Math.max(1, Number(image.naturalWidth || 1));
    ctx.globalAlpha = destroyed ? .72 : 1;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    if(!destroyed) drawCapturedDrone({ctx, cache, cageWidth:width, pulse});
  }else{
    const radius = Math.max(60, Number(cage?.radius || 115));
    ctx.strokeStyle = destroyed ? "#4ade80" : "#c026d3";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    if(!destroyed){
      drawCapturedDrone({ctx, cache, cageWidth:width, pulse});
      ctx.lineWidth = 4;
      for(let offset = -radius * .65; offset <= radius * .65; offset += radius * .32){
        ctx.beginPath();
        ctx.moveTo(offset, -radius * .72);
        ctx.lineTo(offset, radius * .72);
        ctx.stroke();
      }
    }
  }
  ctx.shadowBlur = 0;
  if(!destroyed){
    const radius = Math.max(75, Number(cage?.radius || 115));
    ctx.strokeStyle = `rgba(239,68,68,${.18 + pulse * .20})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 42 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if(showLabel){
    ctx.textAlign = "center";
    ctx.font = "900 14px Rajdhani, Arial";
    ctx.fillStyle = destroyed ? "#86efac" : "#f5d0fe";
    ctx.fillText(
      destroyed ? `CAGE ${cageNumber} LIBÉRÉE` : `CAGE ${cageNumber}`,
      0,
      -width * .58
    );
    if(!destroyed && Number(cage?.turretsRemaining || 0) > 0){
      ctx.font = "800 11px Rajdhani, Arial";
      ctx.fillStyle = "#fca5a5";
      ctx.fillText(`${Number(cage.turretsRemaining)} TOURELLE(S) ACTIVE(S)`, 0, width * .58);
    }
  }
  ctx.restore();
}

function drawTurretVisual({ctx, camera, enemy}){
  const point = entityScreenPoint(enemy, camera);
  const size = Math.max(56, Number(enemy?.width || enemy?.radius * 2 || 86));
  const pulse = .5 + Math.sin(performance.now() / 170 + String(enemy?.id || "").length) * .5;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.shadowColor = "rgba(248,113,113,.9)";
  ctx.shadowBlur = 12 + pulse * 7;
  const base = ctx.createRadialGradient(0, 0, 5, 0, 0, size * .48);
  base.addColorStop(0, "#fb7185");
  base.addColorStop(.25, "#7f1d1d");
  base.addColorStop(.68, "#1f2937");
  base.addColorStop(1, "#020617");
  ctx.fillStyle = base;
  ctx.strokeStyle = "#f87171";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, size * .43, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(Number(enemy?.angle || 0));
  ctx.fillStyle = "#450a0a";
  ctx.strokeStyle = "#fecaca";
  ctx.lineWidth = 2;
  ctx.fillRect(size * .04, -size * .105, size * .58, size * .21);
  ctx.strokeRect(size * .04, -size * .105, size * .58, size * .21);
  ctx.fillStyle = `rgba(254,202,202,${.65 + pulse * .35})`;
  ctx.beginPath();
  ctx.arc(size * .62, 0, size * .075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGuardPosture({ctx, camera, enemy}){
  const point = entityScreenPoint(enemy, camera);
  const radius = Math.max(30, Number(enemy?.radius || 35)) + 15;
  const pulse = .5 + Math.sin(performance.now() / 260 + String(enemy?.id || "").length) * .5;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.strokeStyle = `rgba(251,146,60,${.20 + pulse * .18})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, radius + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawVesperEnemyVisual({ctx, camera, cache, enemy}){
  const kind = getVesperEntityVisualKind(enemy);
  if(kind === "cage"){
    drawCageVisual({ctx, camera, cache, cage:enemy, destroyed:false});
    return true;
  }
  if(kind === "turret"){
    drawTurretVisual({ctx, camera, enemy});
    return true;
  }
  if(kind === "boss" || kind === "orbiter"){
    const boss = kind === "boss";
    const width = Math.max(boss ? 230 : 42, Number(enemy?.width || (boss ? 280 : 54)));
    const height = Math.max(boss ? 230 : 42, Number(enemy?.height || width));
    drawRedDroneSprite({
      ctx,
      camera,
      cache,
      entity:enemy,
      width,
      height,
      glow:boss ? 34 : 14
    });
    if(boss){
      const point = entityScreenPoint(enemy, camera);
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#fecaca";
      ctx.shadowColor = "#ef3340";
      ctx.shadowBlur = 12;
      ctx.font = "900 17px Rajdhani, Arial";
      ctx.fillText("DRONE GÉANT DE VESPER", point.x, point.y - height * .62);
      ctx.restore();
    }
    return true;
  }
  if(kind === "guard") drawGuardPosture({ctx, camera, enemy});
  return false;
}

function drawAllyStatus({ctx, camera, ally}){
  const point = entityScreenPoint(ally, camera);
  const width = 72;
  const top = point.y - Math.max(42, Number(ally?.height || 68) * .58);
  const hpRatio = clamp01(Number(ally?.hp || 0) / Math.max(1, Number(ally?.maxHp || 1)));
  const shieldRatio = clamp01(Number(ally?.shield || 0) / Math.max(1, Number(ally?.maxShield || 1)));
  ctx.save();
  ctx.textAlign = "center";
  ctx.shadowBlur = 0;
  ctx.font = "900 11px Rajdhani, Arial";
  ctx.fillStyle = "#fecaca";
  ctx.fillText(String(ally?.name || "DRONE LIBÉRÉ").toUpperCase(), point.x, top - 11);
  ctx.fillStyle = "rgba(22,101,52,.55)";
  ctx.fillRect(point.x - width / 2, top, width, 5);
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(point.x - width / 2, top, width * hpRatio, 5);
  if(Number(ally?.maxShield || 0) > 0){
    ctx.fillStyle = "rgba(14,116,144,.48)";
    ctx.fillRect(point.x - width / 2, top + 7, width, 4);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(point.x - width / 2, top + 7, width * shieldRatio, 4);
  }
  ctx.restore();
}

export function createVesperEncounterRenderer({ctx, cache, getState}){
  const allyStates = new Map();

  function drawArena(state = getState()){
    const {activePortal, camera, portalObjective, enemies = []} = state;
    if(!isVesperPortal(activePortal) || !portalObjective) return;
    const objective = normalizeVesperObjective(portalObjective);
    const liveCages = enemies.filter(enemy=>getVesperEntityVisualKind(enemy) === "cage");
    for(const cage of objective.cages){
      const hasLiveEntity = liveCages.some(enemy=>
        String(enemy.id || "") === cage.id
        || Math.hypot(Number(enemy.x || 0) - cage.x, Number(enemy.y || 0) - cage.y) < 40
      );
      if(hasLiveEntity && !cage.destroyed) continue;
      drawCageVisual({ctx, camera, cache, cage, destroyed:cage.destroyed});
    }
    for(const orbiter of objective.bossOrbiters){
      drawRedDroneSprite({
        ctx,
        camera,
        cache,
        entity:orbiter,
        width:orbiter.size,
        height:orbiter.size,
        alpha:.92,
        glow:13
      });
    }
  }

  function drawAllies(state = getState()){
    const {activePortal, camera, portalObjective} = state;
    if(!isVesperPortal(activePortal) || !portalObjective) return;
    const objective = normalizeVesperObjective(portalObjective);
    const seen = new Set();
    const now = performance.now();
    for(const ally of objective.allies){
      if(!ally.alive) continue;
      seen.add(ally.id);
      const snapshotAge = Number.isFinite(Number(ally.receivedAt))
        ? Math.max(0, Math.min(.18, (now - Number(ally.receivedAt)) / 1000))
        : 0;
      const targetX = Number(ally.x || 0) + Number(ally.vx || 0) * snapshotAge;
      const targetY = Number(ally.y || 0) + Number(ally.vy || 0) * snapshotAge;
      let state = allyStates.get(ally.id);
      if(!state || Math.hypot(state.x - targetX, state.y - targetY) > 800){
        state = {x:targetX, y:targetY, angle:Number(ally.angle || 0), lastAt:now};
      }else{
        const dt = Math.max(.001, Math.min(.05, (now - state.lastAt) / 1000));
        const blend = Math.min(1, dt * 13);
        state.x += (targetX - state.x) * blend;
        state.y += (targetY - state.y) * blend;
        const delta = Math.atan2(Math.sin(Number(ally.angle || 0) - state.angle), Math.cos(Number(ally.angle || 0) - state.angle));
        state.angle += delta * Math.min(1, dt * 10);
        state.lastAt = now;
      }
      allyStates.set(ally.id, state);
      const rendered = {...ally, ...state};
      const speed = Math.hypot(Number(ally.vx || 0), Number(ally.vy || 0));
      if(speed > 20){
        const point = entityScreenPoint(rendered, camera);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(Number(rendered.angle || 0));
        ctx.strokeStyle = "rgba(248,113,113,.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 22);
        ctx.lineTo(0, 42 + Math.min(24, speed / 16));
        ctx.stroke();
        ctx.restore();
      }
      drawRedDroneSprite({
        ctx,
        camera,
        cache,
        entity:rendered,
        width:Number(ally.width || 68),
        height:Number(ally.height || 68),
        glow:18
      });
      drawAllyStatus({ctx, camera, ally:rendered});
    }
    for(const id of allyStates.keys()){
      if(!seen.has(id)) allyStates.delete(id);
    }
  }

  return {drawArena, drawAllies};
}
