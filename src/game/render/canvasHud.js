export function drawDamageTexts({ctx, camera, damageTexts}){
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for(const t of damageTexts){
    const a = Math.max(0, t.life / t.max);
    const progress = Math.max(0, Math.min(1, 1 - a));
    const label = typeof t.value === "string" ? t.value : `-${t.value}`;
    const isMiss = label === "MISS";
    const isNumber = !Number.isNaN(Number(t.value));
    const pop = Math.sin(Math.min(1, progress / .28) * Math.PI);
    const grow = 1 - Math.pow(1 - progress, 2.2);
    const jitter = Math.sin(progress * Math.PI * 8 + (t.wobble || 0)) * (1 - progress) * (isMiss ? .6 : 1.2);
    const fade = Math.min(1, a * 1.65);
    const size = isMiss ? 15 + grow * 3 + pop * 2 : 16 + grow * 8 + pop * 4;
    const x = t.x - camera.x + jitter;
    const y = t.y - camera.y;
    const fill = t.color ? `${t.color}${fade})` : `rgba(255,78,64,${fade})`;
    const glow = t.shadowColor || (isNumber ? "rgba(255,70,42,.95)" : "rgba(96,165,250,.82)");

    ctx.font = `900 ${size}px Rajdhani, Arial`;
    ctx.lineJoin = "round";
    ctx.shadowColor = glow;
    ctx.shadowBlur = isMiss ? 8 + pop * 5 : 11 + pop * 22 + grow * 6;
    ctx.strokeStyle = `rgba(22,2,5,${fade})`;
    ctx.lineWidth = isMiss ? 3 : 3.5 + pop * 1.5;
    ctx.strokeText(label, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(label, x, y);

    if(!isMiss){
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

function getDefaultMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

function formatCompactCoord({x, y}){
  const shortX = Math.round(Number(x || 0) / 10);
  const shortY = Math.round(Number(y || 0) / 10);
  return `X ${shortX}  Y ${shortY}`;
}

export function drawMiniMap({
  ctx,
  currentMap,
  player,
  enemies,
  rect,
  moveTarget,
  revealAllEnemies = false,
  collisionWalls = [],
  objectiveMarkers = [],
  beacons = [],
  groupPlayers = [],
  groupPingTarget = null,
  closedPortals = [],
  getMapPortals = getDefaultMapPortals
}){
  const {x, y, w, h} = rect;
  const headerH = 22;
  const sx = w/currentMap.width, sy = h/currentMap.height;
  const mapX = wx => x + (wx + currentMap.width/2)*sx;
  const mapY = wy => y + headerH + (wy + currentMap.height/2)*((h - headerH)/currentMap.height);
  ctx.save();
  ctx.fillStyle = "rgba(3,12,24,.86)";
  ctx.strokeStyle = "rgba(56,189,248,.36)";
  ctx.lineWidth = 1;
  ctx.fillRect(x,y,w,h);
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = "rgba(7,24,42,.88)";
  ctx.fillRect(x, y, w, headerH);
  ctx.fillStyle = "#8ee7ff";
  ctx.font = "700 11px Rajdhani, Arial";
  ctx.fillText(currentMap.displayName || currentMap.name, x+9, y+15);
  ctx.fillStyle = "#bfefff";
  ctx.font = "600 12px Rajdhani, Arial";
  ctx.fillText(formatCompactCoord(player), x + 88, y + 15);
  const minus = {x:x+w-42, y:y+4, w:16, h:14};
  const plus = {x:x+w-22, y:y+4, w:16, h:14};
  for(const [label, box] of [["-", minus], ["+", plus]]){
    ctx.strokeStyle = "rgba(56,189,248,.42)";
    ctx.fillStyle = "rgba(2,10,19,.78)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = "#dff6ff";
    ctx.font = "900 12px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, box.x + box.w / 2, box.y + 10);
  }
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(56,189,248,.16)";
  for(let i=1;i<5;i++){ ctx.beginPath(); ctx.moveTo(x+i*w/5,y+headerH); ctx.lineTo(x+i*w/5,y+h); ctx.stroke(); }
  for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(x,y+headerH+i*(h-headerH)/4); ctx.lineTo(x+w,y+headerH+i*(h-headerH)/4); ctx.stroke(); }

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
    ctx.save();
    ctx.fillStyle = marker.active
      ? "rgba(34,197,94,.98)"
      : marker.unlocked
        ? "rgba(37,99,235,.98)"
        : "rgba(30,41,59,.98)";
    ctx.strokeStyle = marker.active ? "#bbf7d0" : marker.unlocked ? "#bae6fd" : "#64748b";
    ctx.shadowColor = "rgba(56,189,248,.92)";
    ctx.shadowBlur = 7;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
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
    const radius = Math.max(4, Number(beacon.radius || 250) * Math.min(sx, (h - headerH) / currentMap.height));
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
    ctx.fillStyle = "rgba(86,255,79,.55)";
    ctx.beginPath(); ctx.arc(mapX(currentMap.spawn.x),mapY(currentMap.spawn.y),5,0,Math.PI*2); ctx.fill();
  }
  for(const portal of getMapPortals(currentMap)){
    ctx.fillStyle = "rgba(168,85,247,.95)";
    ctx.beginPath(); ctx.arc(mapX(portal.x),mapY(portal.y),5,0,Math.PI*2); ctx.fill();
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
  ctx.strokeStyle = "rgba(56,189,248,.25)";
  ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),Math.max(5,player.radar*sx),0,Math.PI*2); ctx.stroke();
  if(moveTarget){
    ctx.strokeStyle = "rgba(250,204,21,.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5,4]);
    ctx.beginPath();
    ctx.moveTo(mapX(player.x), mapY(player.y));
    ctx.lineTo(mapX(moveTarget.x), mapY(moveTarget.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(250,204,21,.95)";
    ctx.beginPath(); ctx.arc(mapX(moveTarget.x), mapY(moveTarget.y),4,0,Math.PI*2); ctx.fill();
  }
  for(const e of enemies){
    if(!revealAllEnemies && Math.hypot(e.x-player.x,e.y-player.y) > player.radar) continue;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(mapX(e.x)-2,mapY(e.y)-2,4,4);
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
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath(); ctx.arc(mapX(player.x),mapY(player.y),4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
