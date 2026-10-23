import { drawMiniMapScenery } from "./miniMapScenery.js?v=20261023-minimap4";
import {
  drawMiniMapFrame, drawMiniMapBorder,
  drawMiniMapService, drawMiniMapHome, drawMiniMapPortal, drawMiniMapPilot, drawMiniMapRoute
} from "./miniMapChrome.js?v=20261023-minimap4";

const DAMAGE_TEXT_DETAIL_LIMIT = 8;

export function drawDamageTexts({ctx, camera, damageTexts}){
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const detailedText = damageTexts.length <= DAMAGE_TEXT_DETAIL_LIMIT;
  for(const t of damageTexts){
    const a = Math.max(0, t.life / t.max);
    const progress = Math.max(0, Math.min(1, 1 - a));
    const label = typeof t.value === "string" ? t.value : `-${t.value}`;
    const isMiss = label === "MISS";
    const isLevelUp = t.kind === "levelUp";
    const isNumber = !Number.isNaN(Number(t.value));
    const pop = Math.sin(Math.min(1, progress / .28) * Math.PI);
    const grow = 1 - Math.pow(1 - progress, 2.2);
    const jitter = isLevelUp ? 0 : Math.sin(progress * Math.PI * 8 + (t.wobble || 0)) * (1 - progress) * (isMiss ? .6 : 1.2);
    const fade = Math.min(1, a * 1.65);
    const size = isLevelUp
      ? 28 + grow * 9 + pop * 5
      : isMiss ? 15 + grow * 3 + pop * 2 : 16 + grow * 8 + pop * 4;
    const x = t.x - camera.x + jitter;
    const y = t.y - camera.y;
    const fill = t.color ? `${t.color}${fade})` : `rgba(255,78,64,${fade})`;
    const glow = t.shadowColor || (isNumber ? "rgba(255,70,42,.95)" : "rgba(96,165,250,.82)");

    ctx.font = `900 ${size}px Rajdhani, Arial`;
    ctx.lineJoin = "round";
    ctx.shadowColor = glow;
    ctx.shadowBlur = isLevelUp ? 22 + pop * 18 : detailedText ? (isMiss ? 8 + pop * 5 : 11 + pop * 22 + grow * 6) : (isMiss ? 5 : 7);
    ctx.strokeStyle = isLevelUp ? `rgba(1,8,18,${fade})` : `rgba(22,2,5,${fade})`;
    ctx.lineWidth = isLevelUp ? 5.5 : detailedText ? (isMiss ? 3 : 3.5 + pop * 1.5) : (isMiss ? 2.5 : 3);
    ctx.strokeText(label, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(label, x, y);

    if(isLevelUp){
      ctx.shadowBlur = 0;
      ctx.globalAlpha = fade * .72;
      ctx.strokeStyle = `rgba(125,211,252,${fade * .78})`;
      ctx.lineWidth = 1.6;
      ctx.strokeText(label, x, y + 1);
      ctx.globalAlpha = 1;
    }else if(detailedText && !isMiss){
      ctx.shadowBlur = 0;
      ctx.globalAlpha = fade * (0.22 + grow * 0.18);
      ctx.strokeStyle = t.shadowColor || "rgba(255,112,67,.72)";
      ctx.lineWidth = 1.4;
      ctx.strokeText(label, x, y);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

let combatHudTextWarmupStarted = false;

function drawCombatHudTextWarmup(){
  if(typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if(!ctx) return false;
  drawDamageTexts({
    ctx,
    camera:{x:0, y:0},
    damageTexts:[
      {
        x:62,
        y:34,
        value:1234,
        life:.82,
        max:.82,
        color:"rgba(248,113,113,",
        shadowColor:"rgba(248,113,113,.78)",
        wobble:0
      },
      {
        x:154,
        y:34,
        value:"MISS",
        life:.82,
        max:.82,
        color:"rgba(226,232,240,",
        shadowColor:"rgba(148,163,184,.78)",
        wobble:1.7
      },
      {
        x:112,
        y:70,
        value:"+88 HP",
        life:.82,
        max:.82,
        color:"rgba(134,239,172,",
        shadowColor:"rgba(34,197,94,.85)",
        wobble:.8
      }
    ]
  });
  return true;
}

export function warmCombatHudTextRendering(){
  if(combatHudTextWarmupStarted) return true;
  combatHudTextWarmupStarted = true;
  const warmed = drawCombatHudTextWarmup();
  const fonts = typeof document !== "undefined" ? document.fonts : null;
  if(fonts?.load){
    Promise.all([
      fonts.load("900 24px Rajdhani"),
      fonts.load("900 18px Rajdhani")
    ])
      .then(()=>drawCombatHudTextWarmup())
      .catch(()=>{});
  }
  return warmed;
}

function getDefaultMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

export function drawMiniMap({
  ctx,
  canvas,
  cache,
  currentMap,
  stations = currentMap?.spawnStations || currentMap?.questStations || [],
  player,
  enemies,
  rect,
  moveTarget,
  revealAllEnemies = false,
  collisionWalls = [],
  objectiveMarkers = [],
  beacons = [],
  allies = [],
  groupPlayers = [],
  groupPingTarget = null,
  closedPortals = [],
  getMapPortals = getDefaultMapPortals
}){
  ctx.save();
  const contentRect = drawMiniMapFrame({ctx, rect, currentMap, player, cache});
  const {x, y, w, h} = contentRect;
  const sx = w/currentMap.width, sy = h/currentMap.height;
  const mapX = wx => x + (wx + currentMap.width/2)*sx;
  const mapY = wy => y + (wy + currentMap.height/2)*sy;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = "#050c15"; ctx.fillRect(x, y, w, h);
  drawMiniMapScenery({ctx, currentMap, stations, cache,
    rect:contentRect, pixelRatio:canvas?.__dpr || 1});

  for(const station of stations){
    if(station.id !== "quests" && station.id !== "commerce") continue;
    const px = Math.max(x + 8, Math.min(x + w - 8, mapX(station.x)));
    const py = Math.max(y + 8, Math.min(y + h - 8, mapY(station.y)));
    drawMiniMapService({ctx, x:px, y:py, kind:station.id});
  }

  for(const wall of collisionWalls || []){
    const left = mapX(wall.minX);
    const top = mapY(wall.minY);
    const width = Math.max(1, mapX(wall.maxX) - left);
    const height = Math.max(1, mapY(wall.maxY) - top);
    ctx.fillStyle = "rgba(14,165,233,.28)";
    ctx.strokeStyle = "rgba(56,189,248,.92)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);
  }
  for(const marker of objectiveMarkers || []){
    const mx = mapX(marker.x);
    const my = mapY(marker.y);
    const markerKind = String(marker.markerKind || "");
    ctx.save();
    if(markerKind.startsWith("prismatic_")){
      const pulse = .5 + .5 * Math.sin(performance.now() / 135);
      const planetColor = markerKind.endsWith("_fire")
        ? "#fb923c"
        : markerKind.endsWith("_water")
          ? "#38bdf8"
          : markerKind.endsWith("_red")
            ? "#fb7185"
            : "";
      const isRift = markerKind === "prismatic_rift";
      const isBoss = markerKind === "prismatic_boss";
      ctx.fillStyle = isRift
        ? "rgba(3,2,12,.98)"
        : isBoss
          ? "rgba(127,29,29,.98)"
          : planetColor || "rgba(126,34,206,.98)";
      ctx.strokeStyle = isRift ? "#d8b4fe" : isBoss ? "#fecaca" : marker.active ? "#f8fafc" : "#64748b";
      ctx.shadowColor = isRift ? "#a855f7" : isBoss ? "#ef4444" : planetColor;
      ctx.shadowBlur = 8 + pulse * 5;
      ctx.globalAlpha = marker.active ? 1 : .42;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, isBoss ? 8 + pulse * 2 : isRift ? 8 + pulse * 2 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if(isRift){
        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -performance.now() / 40;
        ctx.beginPath();
        ctx.arc(mx, my, 12 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 9px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(marker.number || ""), mx, my + .5);
      ctx.restore();
      continue;
    }
    if(markerKind.startsWith("nox_")){
      const pulse = .5 + .5 * Math.sin(performance.now() / 145);
      if(markerKind === "nox_shield"){
        const radius = Math.max(
          8,
          Number(marker.radius || 0) * Math.min(sx, sy)
        );
        ctx.fillStyle = marker.active ? "rgba(34,211,238,.10)" : "rgba(127,29,29,.08)";
        ctx.strokeStyle = marker.active ? `rgba(103,232,249,${.66 + pulse * .28})` : "#ef4444";
        ctx.shadowColor = marker.active ? "#22d3ee" : "#ef4444";
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.setLineDash(marker.active ? [5, 3] : [3, 5]);
        ctx.beginPath();
        ctx.arc(mx, my, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        continue;
      }
      const isCore = markerKind === "nox_core";
      const color = isCore
        ? "#c084fc"
        : markerKind === "nox_laser"
          ? "#22d3ee"
          : markerKind === "nox_missile"
            ? "#fbbf24"
            : "#e879f9";
      ctx.globalAlpha = marker.active ? 1 : .45;
      ctx.fillStyle = marker.active ? color : "#7f1d1d";
      ctx.strokeStyle = marker.active ? "#f8fafc" : "#fecaca";
      ctx.shadowColor = marker.active ? color : "#ef4444";
      ctx.shadowBlur = 7 + pulse * 4;
      ctx.lineWidth = 1.5;
      if(isCore){
        ctx.beginPath();
        ctx.arc(mx, my, 8 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }else{
        ctx.translate(mx, my);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-5.5, -5.5, 11, 11);
        ctx.strokeRect(-5.5, -5.5, 11, 11);
        ctx.rotate(-Math.PI / 4);
        ctx.translate(-mx, -my);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${isCore ? 9 : 8}px Rajdhani, Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(marker.number || ""), mx, my + .5);
      ctx.restore();
      continue;
    }
    if(markerKind.startsWith("ancient_")){
      const pulse = .5 + .5 * Math.sin(performance.now() / 125);
      const isBomb = markerKind === "ancient_bomb";
      const isAngel = markerKind === "ancient_angel";
      const isTalisman = markerKind === "ancient_talisman" || markerKind === "ancient_beacon";
      const isRift = markerKind === "ancient_rift";
      const isGod = markerKind === "ancient_god";
      const color = isBomb
        ? "#ef4444"
        : isAngel
          ? "#fef3c7"
          : isTalisman
            ? "#fbbf24"
            : isRift
              ? "#c084fc"
              : isGod
                ? "#ffffff"
                : markerKind === "ancient_room_discovered"
                  ? "#f97316"
                  : "#7c2d12";
      ctx.globalAlpha = marker.active === false ? .44 : 1;
      ctx.fillStyle = isRift ? "rgba(20,3,35,.98)" : color;
      ctx.strokeStyle = isBomb ? "#fecaca" : isGod || isAngel ? "#ffffff" : "#ffedd5";
      ctx.shadowColor = color;
      ctx.shadowBlur = 7 + pulse * 5;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if(isTalisman){
        ctx.rect(mx - 6, my - 6, 12, 12);
      }else{
        ctx.arc(mx, my, isBomb || isGod || isRift ? 8 + pulse * 1.6 : 7, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      if(isRift || isGod){
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -performance.now() / 45;
        ctx.beginPath();
        ctx.arc(mx, my, 12 + pulse * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = isRift ? "#f5d0fe" : "#1c0a08";
      if(isBomb || markerKind === "ancient_room_unknown") ctx.fillStyle = "#ffffff";
      ctx.font = "900 9px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(marker.number || ""), mx, my + .5);
      ctx.restore();
      continue;
    }
    if(markerKind === "vesper_boss"){
      const pulse = .5 + .5 * Math.sin(performance.now() / 120);
      ctx.fillStyle = "rgba(127,29,29,.98)";
      ctx.strokeStyle = "#fecaca";
      ctx.shadowColor = "rgba(239,68,68,.95)";
      ctx.shadowBlur = 8 + pulse * 5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 8 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff1f2";
      ctx.font = "900 10px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", mx, my + .5);
      ctx.restore();
      continue;
    }
    ctx.fillStyle = marker.active
      ? "rgba(34,197,94,.98)"
      : marker.unlocked
        ? "rgba(37,99,235,.98)"
        : "rgba(30,41,59,.98)";
    ctx.strokeStyle = marker.active ? "#bbf7d0" : marker.unlocked ? "#bae6fd" : "#64748b";
    ctx.shadowColor = "rgba(56,189,248,.92)";
    ctx.shadowBlur = 7;
    ctx.lineWidth = 1.5;
    if(markerKind === "vesper_cage"){
      ctx.fillRect(mx - 6, my - 6, 12, 12);
      ctx.strokeRect(mx - 6, my - 6, 12, 12);
    }else{
      ctx.beginPath();
      ctx.arc(mx, my, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 9px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(marker.number || ""), mx, my + .5);
    ctx.restore();
  }
  for(const beacon of beacons || []){
    const bx = mapX(beacon.x);
    const by = mapY(beacon.y);
    const radius = Math.max(4, Number(beacon.radius || 250) * Math.min(sx, sy));
    ctx.save();
    ctx.strokeStyle = "rgba(56,189,248,.95)";
    ctx.fillStyle = "rgba(14,165,233,.22)";
    ctx.shadowColor = "rgba(56,189,248,.82)";
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  if(currentMap.spawn && currentMap.spawn.kind !== "portal"){
    drawMiniMapHome({ctx, x:mapX(currentMap.spawn.x), y:mapY(currentMap.spawn.y)});
  }
  for(const portal of getMapPortals(currentMap)){
    const px = mapX(portal.x);
    const py = mapY(portal.y);
    if(portal?.prepared || portal?.dungeonPortal){
      const pulse = .5 + .5 * Math.sin(performance.now() / 180);
      ctx.save();
      ctx.fillStyle = "rgba(168,85,247,.98)";
      ctx.strokeStyle = "#f5d0fe";
      ctx.shadowColor = "rgba(216,180,254,.98)";
      ctx.shadowBlur = 9 + pulse * 5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `rgba(216,180,254,${.55 + pulse * .4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 11 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 5;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 9px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("PORTAIL", px, py - 13);
      ctx.restore();
      continue;
    }
    drawMiniMapPortal({ctx, x:px, y:py});
  }
  for(const portal of closedPortals || []){
    const px = mapX(portal.x);
    const py = mapY(portal.y);
    ctx.save();
    ctx.fillStyle = "rgba(127,29,29,.88)";
    ctx.strokeStyle = "rgba(248,113,113,.98)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - 3, py - 3);
    ctx.lineTo(px + 3, py + 3);
    ctx.moveTo(px + 3, py - 3);
    ctx.lineTo(px - 3, py + 3);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(126,219,242,.24)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),Math.max(5,player.radar*sx),0,Math.PI*2); ctx.stroke();
  if(moveTarget){
    drawMiniMapRoute({ctx, fromX:mapX(player.x), fromY:mapY(player.y),
      toX:mapX(moveTarget.x), toY:mapY(moveTarget.y)});
  }
  for(const e of enemies){
    if(!revealAllEnemies && Math.hypot(e.x-player.x,e.y-player.y) > player.radar) continue;
    const renderMode = String(e?.renderMode || "");
    if(renderMode === "vesper_cage" || renderMode === "prismatic_planet" || renderMode === "prismatic_boss") continue;
    const ex = mapX(e.x);
    const ey = mapY(e.y);
    ctx.fillStyle = renderMode === "vesper_turret" ? "#fb923c" : "#ef4444";
    const size = renderMode === "vesper_boss" ? 7 : renderMode === "vesper_turret" ? 5 : 4;
    ctx.fillRect(ex - size / 2, ey - size / 2, size, size);
    if(renderMode === "vesper_boss"){
      ctx.strokeStyle = "#fecaca";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  for(const ally of allies || []){
    if(ally?.alive === false || Number(ally?.hp || 0) <= 0) continue;
    const ax = mapX(ally.x);
    const ay = mapY(ally.y);
    ctx.save();
    const isNoxDrone = String(ally?.renderMode || "") === "nox_ally_drone";
    ctx.fillStyle = isNoxDrone ? "#7e22ce" : "#dc2626";
    ctx.strokeStyle = isNoxDrone ? "#e9d5ff" : "#fee2e2";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 5);
    ctx.lineTo(ax + 5, ay);
    ctx.lineTo(ax, ay + 5);
    ctx.lineTo(ax - 5, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  for(const remote of groupPlayers || []){
    const state = remote.state;
    if(!state) continue;
    const mapToken = String(currentMap?.id ?? currentMap?.name ?? "");
    if(mapToken && String(state.mapId ?? "") !== mapToken) continue;
    const gx = mapX(Number(state.x || 0));
    const gy = mapY(Number(state.y || 0));
    ctx.save();
    ctx.fillStyle = "rgba(250,204,21,.96)";
    ctx.strokeStyle = "rgba(2,6,23,.88)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 6);
    ctx.lineTo(gx + 6, gy);
    ctx.lineTo(gx, gy + 6);
    ctx.lineTo(gx - 6, gy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if(groupPingTarget?.targetId === remote.id && groupPingTarget.expiresAt > performance.now()){
      const pulse = .5 + .5 * Math.sin(performance.now() / 110);
      ctx.strokeStyle = `rgba(250,204,21,${.45 + pulse * .55})`;
      ctx.lineWidth = 2 + pulse * 2;
      ctx.beginPath();
      ctx.arc(gx, gy, 10 + pulse * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#fef9c3";
    ctx.font = "800 9px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(remote.name || "ALLY").slice(0, 8).toUpperCase(), gx, gy - 9);
    ctx.restore();
  }
  drawMiniMapPilot({ctx, x:mapX(player.x), y:mapY(player.y), angle:player.angle});
  ctx.restore();
  drawMiniMapBorder({ctx, rect:contentRect});
  ctx.restore();
}
