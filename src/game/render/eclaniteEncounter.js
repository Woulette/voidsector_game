import {
  ECLANITE_BOSS_ASSETS,
  ECLANITE_CORE_ASSET,
  ECLANITE_PORTAL_MAP,
  getEclanitePortalWalls,
  isEclanitePortal,
  normalizeEclaniteObjective
} from "../../data/eclanitePortal.js?v=20260726-nox1";
import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";

const BOSS_COLORS = Object.freeze({
  green:Object.freeze({solid:"#4ade80", glow:"rgba(34,197,94,.88)", dark:"rgba(5,46,22,.88)"}),
  red:Object.freeze({solid:"#f87171", glow:"rgba(239,68,68,.88)", dark:"rgba(69,10,10,.88)"}),
  blue:Object.freeze({solid:"#60a5fa", glow:"rgba(59,130,246,.88)", dark:"rgba(23,37,84,.88)"})
});

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function zoneDefinition(zone){
  const index = Math.max(0, Math.min(ECLANITE_PORTAL_MAP.zones.length - 1, Math.floor(finite(zone, 1)) - 1));
  return ECLANITE_PORTAL_MAP.zones[index];
}

function bossPalette(color){
  return BOSS_COLORS[String(color || "").toLowerCase()] || BOSS_COLORS.green;
}

function readyImage(cache, src){
  const image = getCachedCombatImage(cache, src);
  return image?.complete && Number(image.naturalWidth || 0) > 0 ? image : null;
}

function drawVitalBar(ctx, {x, y, width, hp, maxHp, color, label}){
  const ratio = Math.max(0, Math.min(1, finite(hp) / Math.max(1, finite(maxHp, 1))));
  ctx.save();
  ctx.fillStyle = "rgba(2,6,23,.92)";
  ctx.fillRect(x - width / 2, y, width, 15);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 9;
  ctx.fillRect(x - width / 2 + 2, y + 2, (width - 4) * ratio, 11);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(226,232,240,.68)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - width / 2, y, width, 15);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 11px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(label, x, y - 5);
  ctx.restore();
}

function drawZoneLabels(ctx, camera, activeZone){
  const now = performance.now();
  for(const zone of ECLANITE_PORTAL_MAP.zones){
    const active = Number(zone.id) === Number(activeZone);
    const pulse = active ? .72 + Math.sin(now / 240) * .12 : .24;
    const x = zone.x - camera.x;
    const y = zone.y - camera.y;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = pulse;
    ctx.fillStyle = zone.color;
    ctx.shadowColor = zone.color;
    ctx.shadowBlur = active ? 18 : 6;
    ctx.font = `${active ? "900 27px" : "800 21px"} Rajdhani, Arial`;
    ctx.fillText(zone.label, x, y - 270);
    ctx.font = "800 12px Rajdhani, Arial";
    ctx.fillText(active ? "OBJECTIF ACTIF" : "VERROUILLAGE SEQUENTIEL", x, y - 244);
    ctx.restore();
  }
}

function drawWall(ctx, camera, wall){
  const x = wall.minX - camera.x;
  const y = wall.minY - camera.y;
  const width = wall.maxX - wall.minX;
  const height = wall.maxY - wall.minY;
  const horizontal = width >= height;
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, "rgba(6,78,59,.96)");
  gradient.addColorStop(.48, "rgba(15,23,42,.98)");
  gradient.addColorStop(1, "rgba(30,64,175,.92)");
  ctx.save();
  ctx.fillStyle = gradient;
  ctx.shadowColor = "rgba(52,211,153,.42)";
  ctx.shadowBlur = 14;
  ctx.fillRect(x, y, width, height);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(134,239,172,.72)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = "rgba(125,211,252,.28)";
  ctx.lineWidth = 2;
  const length = horizontal ? width : height;
  for(let offset = 30; offset < length; offset += 82){
    ctx.beginPath();
    if(horizontal){
      ctx.moveTo(x + offset, y + 8);
      ctx.lineTo(x + offset - 24, y + height - 8);
    }else{
      ctx.moveTo(x + 8, y + offset);
      ctx.lineTo(x + width - 8, y + offset - 24);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBreach(ctx, camera, gate, open, label, horizontal){
  const pulse = .5 + .5 * Math.sin(performance.now() / 135);
  const thickness = ECLANITE_PORTAL_MAP.wallThickness;
  const width = horizontal ? gate.halfSize * 2 : thickness;
  const height = horizontal ? thickness : gate.halfSize * 2;
  const x = gate.x - camera.x;
  const y = gate.y - camera.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if(open){
    ctx.strokeStyle = `rgba(74,222,128,${.55 + pulse * .35})`;
    ctx.shadowColor = "rgba(34,197,94,.9)";
    ctx.shadowBlur = 18 + pulse * 8;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.setLineDash([]);
    ctx.fillStyle = "#bbf7d0";
    ctx.font = "900 13px Rajdhani, Arial";
    ctx.fillText(`${label} OUVERTE`, 0, horizontal ? -height / 2 - 23 : -height / 2 - 22);
  }else{
    const field = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    field.addColorStop(0, `rgba(239,68,68,${.20 + pulse * .08})`);
    field.addColorStop(.5, `rgba(16,185,129,${.22 + pulse * .08})`);
    field.addColorStop(1, `rgba(59,130,246,${.20 + pulse * .08})`);
    ctx.fillStyle = field;
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeStyle = `rgba(248,113,113,${.72 + pulse * .24})`;
    ctx.shadowColor = "rgba(239,68,68,.9)";
    ctx.shadowBlur = 18 + pulse * 8;
    ctx.lineWidth = 4;
    ctx.strokeRect(-width / 2, -height / 2, width, height);
    ctx.fillStyle = "#fecaca";
    ctx.font = "900 13px Rajdhani, Arial";
    ctx.fillText(`${label} VERROUILLEE`, 0, horizontal ? -height / 2 - 23 : 0);
  }
  ctx.restore();
}

function findObjectiveEntity(state, id){
  const targetId = String(id || "");
  if(!targetId) return null;
  return (state?.enemies || []).find(enemy=>
    String(enemy?.serverId || enemy?.id || "") === targetId
  ) || null;
}

function drawCore(ctx, cache, camera, objective, state){
  if(objective.phase !== "core" || !objective.core) return;
  const zone = zoneDefinition(objective.zone);
  const entity = findObjectiveEntity(state, objective.core.id);
  const x = finite(entity?.x, zone.x) - camera.x;
  const y = finite(entity?.y, zone.y) - camera.y;
  const pulse = .5 + .5 * Math.sin(performance.now() / 110);
  const radius = 112 + pulse * 10;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(x, y, 12, x, y, radius * 1.55);
  aura.addColorStop(0, "rgba(255,255,255,.68)");
  aura.addColorStop(.24, "rgba(251,146,60,.42)");
  aura.addColorStop(.62, "rgba(239,68,68,.18)");
  aura.addColorStop(1, "rgba(239,68,68,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if(!entity){
    const image = readyImage(cache, ECLANITE_CORE_ASSET);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(performance.now() / 5500);
    ctx.shadowColor = objective.core.exposed ? "rgba(251,146,60,.95)" : "rgba(100,116,139,.72)";
    ctx.shadowBlur = objective.core.exposed ? 28 + pulse * 12 : 12;
    if(image){
      const size = radius * 1.75;
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    }else{
      const core = ctx.createRadialGradient(-22, -24, 5, 0, 0, radius);
      core.addColorStop(0, "#fff7ed");
      core.addColorStop(.24, "#fb923c");
      core.addColorStop(.62, "#b91c1c");
      core.addColorStop(1, "#19070a");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawVitalBar(ctx, {
    x,
    y:y + radius + 38,
    width:250,
    hp:objective.core.hp,
    maxHp:objective.core.maxHp,
    color:"#fb923c",
    label:objective.core.exposed ? "NOYAU EXPOSE · DEGATS x5" : "NOYAU PROTEGE"
  });
}

function findBossEntity(state, objective){
  return findObjectiveEntity(state, objective.boss?.id);
}

function drawBoss(ctx, cache, camera, objective, state){
  if(objective.phase !== "boss" || !objective.boss) return;
  const zone = zoneDefinition(objective.zone);
  const entity = findBossEntity(state, objective);
  const worldX = finite(entity?.x, zone.x);
  const worldY = finite(entity?.y, zone.y);
  const x = worldX - camera.x;
  const y = worldY - camera.y;
  const colorKey = String(objective.boss.color || "green").toLowerCase();
  const palette = bossPalette(colorKey);
  const pulse = .5 + .5 * Math.sin(performance.now() / 125);
  const radius = 138 + pulse * 18;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = palette.solid;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 22 + pulse * 14;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 16]);
  ctx.beginPath();
  ctx.arc(x, y, radius + 24, -performance.now() / 1150, Math.PI * 2 - performance.now() / 1150);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if(!entity){
    const image = readyImage(cache, ECLANITE_BOSS_ASSETS[colorKey] || ECLANITE_BOSS_ASSETS.green);
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 28;
    if(image){
      const size = 170;
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    }else{
      ctx.fillStyle = palette.dark;
      ctx.strokeStyle = palette.solid;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -82);
      ctx.lineTo(70, -24);
      ctx.lineTo(43, 72);
      ctx.lineTo(-48, 68);
      ctx.lineTo(-72, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawVitalBar(ctx, {
    x,
    y:y + radius + 38,
    width:280,
    hp:objective.boss.hp,
    maxHp:objective.boss.maxHp,
    color:palette.solid,
    label:`BOSS ${colorKey.toUpperCase()}`
  });
}

export function getEclaniteObjectiveMarkers(objective){
  const normalized = normalizeEclaniteObjective(objective);
  if(normalized.phase !== "core" && normalized.phase !== "boss") return [];
  const zone = zoneDefinition(normalized.zone);
  return [{
    x:zone.x,
    y:zone.y,
    markerKind:normalized.phase === "boss" ? "eclanite_boss" : "eclanite_core",
    number:normalized.phase === "boss" ? "!" : "x5",
    active:true,
    unlocked:true
  }];
}

export function createEclaniteEncounterRenderer({ctx, cache, getState}){
  function drawArena(state = getState()){
    if(state.gameMode !== "portal" || !isEclanitePortal(state.activePortal)) return;
    const objective = normalizeEclaniteObjective(state.portalObjective);
    const camera = state.camera;
    ctx.save();
    drawZoneLabels(ctx, camera, objective.zone);
    for(const wall of getEclanitePortalWalls(objective.breaches)){
      drawWall(ctx, camera, wall);
    }
    drawBreach(ctx, camera, ECLANITE_PORTAL_MAP.breachOne, objective.breaches.oneOpen, "BRECHE I", false);
    drawBreach(ctx, camera, ECLANITE_PORTAL_MAP.breachTwo, objective.breaches.twoOpen, "BRECHE II", true);
    drawCore(ctx, cache, camera, objective, state);
    drawBoss(ctx, cache, camera, objective, state);
    ctx.restore();
  }

  return {drawArena};
}
