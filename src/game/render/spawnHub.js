import { beginSpawnStationHighlight, drawSpawnStationHoverLabel } from "./spawnStationHighlight.js";

function drawSpawnAsset({ctx, cache, src, x, y, width, height, alpha = 1, rotation = 0}){
  const img = cache?.[src];
  if(!img || !img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.translate(x, y);
  if(rotation) ctx.rotate(rotation);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}

function drawSpawnPath({ctx, from, to, color = "56,189,248"}){
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = -dy / distance;
  const ny = dx / distance;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(${color},.10)`;
  ctx.lineWidth = 38;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${color},.28)`;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  ctx.moveTo(from.x + nx * 13, from.y + ny * 13);
  ctx.lineTo(to.x + nx * 13, to.y + ny * 13);
  ctx.moveTo(from.x - nx * 13, from.y - ny * 13);
  ctx.lineTo(to.x - nx * 13, to.y - ny * 13);
  ctx.stroke();
  ctx.restore();
}

export function drawSpawnHub({ctx, cache, spawn, stations}){
  if(!spawn) return;
  if(spawn.visual){
    const {asset, x, y, width, height, title, color} = spawn.visual;
    if(drawSpawnAsset({ctx, cache, src:asset, x, y, width, height})){
      drawFacilityLabel({ctx, text:title, x, y:y + height / 2 + 28, color});
    }
    return;
  }
  const now = performance.now();
  const pulse = .5 + Math.sin(now / 260) * .5;
  const dockBob = Math.sin(now / 2200) * 18;
  ctx.save();
  for(const station of stations){
    drawSpawnPath({
      ctx,
      from:{x:spawn.x, y:spawn.y - 20},
      to:{x:station.x, y:station.y + 20},
      color:station.id === "quests" ? "56,189,248" : "250,204,21"
    });
  }
  ctx.globalCompositeOperation = "screen";
  const dockGlow = ctx.createRadialGradient(spawn.x, spawn.y, 40, spawn.x, spawn.y, 198);
  dockGlow.addColorStop(0, `rgba(34,211,238,${.18 + pulse * .08})`);
  dockGlow.addColorStop(.52, "rgba(14,165,233,.08)");
  dockGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = dockGlow;
  ctx.beginPath();
  ctx.arc(spawn.x, spawn.y, 198, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const drawn = drawSpawnAsset({
    ctx,
    cache,
    src:"assets/spawn/spawn_dock.png",
    x:spawn.x,
    y:spawn.y - 2 + dockBob,
    width:1460,
    height:1460
  });
  if(!drawn){
    ctx.strokeStyle = "rgba(125,211,252,.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(spawn.x-92, spawn.y-32, 184, 64);
    ctx.strokeRect(spawn.x-42, spawn.y-118, 84, 236);
    ctx.fillStyle = "rgba(2,132,199,.10)";
    ctx.fillRect(spawn.x-88, spawn.y-28, 176, 56);
  }
  ctx.restore();
}

function getSpawnStationBob(station, now){
  if(station.presentation === "industrial") return 0;
  const phase = station.id === "quests" ? .45 : 2.15;
  return Math.sin(now / 900 + phase) * 10;
}

export function drawSpawnStations({ctx, cache, stations, hoveredStation = null, camera}){
  const now = performance.now();
  const active = stations.includes(hoveredStation) ? hoveredStation : null;
  const hoverAlpha = beginSpawnStationHighlight({ctx, cache, station:active, now});
  for(const station of stations){
    if(station.presentation === "industrial"){
      drawSpawnAsset({ctx, cache, src:station.asset, x:station.x, y:station.y,
        width:station.assetWidth, height:station.assetHeight});
      if(station === active) drawSpawnStationHoverLabel({ctx, station, alpha:hoverAlpha, camera});
      continue;
    }
    const bob = getSpawnStationBob(station, now);
    const glow = 6 + Math.sin(now/220 + station.x*0.002) * 4;
    ctx.save();
    ctx.translate(station.x, station.y + bob);
    const color = station.color || (station.id === "quests" ? "56,189,248" : "250,204,21");
    const assetDrawn = drawSpawnAsset({
      ctx,
      cache,
      src:station.asset,
      x:0,
      y:0,
      width:station.assetWidth || 180,
      height:station.assetHeight || 180
    });
    if(!assetDrawn){
      ctx.fillStyle = station.id === "quests" ? "rgba(14,165,233,.22)" : "rgba(251,191,36,.18)";
      ctx.strokeStyle = station.id === "quests" ? "rgba(56,189,248,.92)" : "rgba(250,204,21,.92)";
      ctx.shadowColor = station.id === "quests" ? "rgba(56,189,248,.75)" : "rgba(250,204,21,.65)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(-38,-28,76,56,14);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(226,232,240,.95)";
      ctx.font = "700 18px Rajdhani, Arial";
      ctx.textAlign = "center";
      ctx.fillText(station.id === "quests" ? "Q" : "R", 0, 7);
    }
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.beginPath();
    ctx.arc(0, 0, station.radius + glow, 0, Math.PI*2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(${color},.52)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, station.radius, 0, Math.PI*2);
    ctx.stroke();
    const labelY = Math.max(48, (station.assetHeight || 76) / 2 + 16);
    ctx.font = "700 12px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(248,250,252,.94)";
    ctx.fillText(station.title, 0, labelY);
    ctx.restore();
  }
}

export function drawSpawnStationPrompts({ctx, stations}){
  const now = performance.now();
  for(const station of stations){
    const marker = station.marker;
    if(!marker) continue;
    if(station.presentation === "industrial"){
      drawFacilityPrompt({ctx, marker, color:station.color});
      continue;
    }
    const pulse = .5 + Math.sin(now / 210 + station.x * .003) * .5;
    const color = station.color || (station.id === "quests" ? "56,189,248" : "250,204,21");
    const dark = station.dark || (station.id === "quests" ? "4,20,35" : "28,18,4");
    const label = station.promptLabel || (station.id === "quests" ? "MISSIONS" : "RAFFINAGE");
    const r = marker.radius || 42;
    const bob = getSpawnStationBob(station, now);
    ctx.save();
    ctx.translate(marker.x, marker.y + bob - pulse * 5);

    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, r + 54);
    glow.addColorStop(0, `rgba(${color},${.24 + pulse * .10})`);
    glow.addColorStop(.55, `rgba(${color},.08)`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r + 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${color},.30)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, r + 32);
    ctx.lineTo(0, r + 80);
    ctx.stroke();

    ctx.shadowColor = `rgba(${color},.85)`;
    ctx.shadowBlur = 16 + pulse * 10;
    ctx.fillStyle = `rgba(${dark},.94)`;
    ctx.strokeStyle = `rgba(${color},${.82 + pulse * .14})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * .82, -r * .58);
    ctx.lineTo(-r * .40, -r);
    ctx.lineTo(r * .40, -r);
    ctx.lineTo(r * .82, -r * .58);
    ctx.lineTo(r * .82, r * .44);
    ctx.lineTo(0, r + 24);
    ctx.lineTo(-r * .82, r * .44);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${color},.34)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -2, r * .62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(${color},.48)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r - 12, -r * .36);
    ctx.lineTo(-r - 28, -r * .36);
    ctx.lineTo(-r - 28, r * .12);
    ctx.moveTo(r + 12, -r * .36);
    ctx.lineTo(r + 28, -r * .36);
    ctx.lineTo(r + 28, r * .12);
    ctx.stroke();

    ctx.fillStyle = `rgba(${color},.96)`;
    ctx.font = station.id === "quests" ? "900 48px Rajdhani, Arial" : "900 36px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(marker.text || (station.id === "quests" ? "!" : "R"), 0, station.id === "quests" ? -5 : -4);

    ctx.fillStyle = "rgba(226,242,255,.94)";
    ctx.font = "800 10px Rajdhani, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(label, 0, r * .68);

    ctx.strokeStyle = `rgba(${color},${.22 + pulse * .14})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -2, r + 16 + pulse * 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFacilityLabel({ctx, text, x, y, color = "237,157,137"}){
  ctx.save();
  ctx.font = "600 16px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(text).width + 30;
  ctx.fillStyle = "rgba(5,8,13,.85)";
  ctx.fillRect(x - width / 2, y - 14, width, 28);
  ctx.fillStyle = `rgb(${color})`;
  ctx.fillRect(x - width / 2, y - 14, 3, 28);
  ctx.fillStyle = "#eee7e3";
  ctx.fillText(text, x + 2, y);
  ctx.restore();
}

function drawFacilityPrompt({ctx, marker, color}){
  ctx.save();
  ctx.translate(marker.x, marker.y);
  ctx.fillStyle = "rgba(5,8,13,.88)";
  ctx.strokeStyle = `rgba(${color},.8)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-marker.radius, -marker.radius, marker.radius * 2, marker.radius * 2, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgb(${color})`;
  ctx.font = "700 27px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(marker.text, 0, 1);
  ctx.restore();
}

