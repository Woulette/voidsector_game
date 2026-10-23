import {
  NOX_CORE_MAX_HP,
  NOX_KAMIKAZE_BLAST_RADIUS,
  NOX_PORTAL_MAP,
  isNoxPortal,
  normalizeNoxObjective
} from "../../data/noxPortal.js?v=20260726-nox2";

const TYPE_COLORS = Object.freeze({
  laser:Object.freeze({main:"#67e8f9", dark:"#0e7490", label:"LASER"}),
  missile:Object.freeze({main:"#fbbf24", dark:"#b45309", label:"MISSILES"}),
  summoner:Object.freeze({main:"#c084fc", dark:"#7e22ce", label:"DRONES"})
});

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value){
  return Math.max(0, Math.min(1, finite(value)));
}

function drawVitalBar(ctx, {x, y, width, hp, maxHp, color, label = ""}){
  const ratio = clamp01(finite(hp) / Math.max(1, finite(maxHp, 1)));
  ctx.save();
  ctx.fillStyle = "rgba(2,6,23,.94)";
  ctx.fillRect(x - width / 2, y, width, 13);
  ctx.fillStyle = ratio > .25 ? color : "#ef4444";
  ctx.shadowColor = ratio > .25 ? color : "#ef4444";
  ctx.shadowBlur = 8;
  ctx.fillRect(x - width / 2 + 2, y + 2, Math.max(0, width - 4) * ratio, 9);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(226,232,240,.58)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - width / 2, y, width, 13);
  if(label){
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 10px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, y - 4);
  }
  ctx.restore();
}

function drawStationDeck(ctx, camera){
  const station = NOX_PORTAL_MAP.station;
  const x = station.x - camera.x;
  const y = station.y - camera.y;
  const pulse = .5 + Math.sin(performance.now() / 620) * .5;
  ctx.save();
  const deck = ctx.createRadialGradient(x, y, 110, x, y, 930);
  deck.addColorStop(0, "rgba(30,41,59,.66)");
  deck.addColorStop(.58, "rgba(15,23,42,.46)");
  deck.addColorStop(1, "rgba(15,23,42,0)");
  ctx.fillStyle = deck;
  ctx.beginPath();
  ctx.arc(x, y, 930, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(167,139,250,${.16 + pulse * .08})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([32, 24]);
  for(const radius of [390, 760, 930]){
    ctx.beginPath();
    ctx.arc(x, y, radius, performance.now() / 9200, Math.PI * 2 + performance.now() / 9200);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(103,232,249,.15)";
  ctx.lineWidth = 4;
  for(const defense of NOX_PORTAL_MAP.defenses){
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(defense.x - camera.x, defense.y - camera.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEntryGuide(ctx, camera){
  const start = NOX_PORTAL_MAP.spawn;
  const station = NOX_PORTAL_MAP.station;
  const startX = start.x - camera.x;
  const startY = start.y - camera.y;
  const stationX = station.x - camera.x;
  const stationY = station.y - camera.y;
  const dx = stationX - startX;
  const dy = stationY - startY;
  const angle = Math.atan2(dy, dx);
  const pulse = .5 + .5 * Math.sin(performance.now() / 180);

  ctx.save();
  ctx.strokeStyle = `rgba(103,232,249,${.28 + pulse * .18})`;
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 10;
  ctx.lineWidth = 5;
  ctx.setLineDash([22, 18]);
  ctx.lineDashOffset = -performance.now() / 35;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(stationX, stationY);
  ctx.stroke();
  ctx.setLineDash([]);

  for(const progress of [.18, .38, .58, .78]){
    const x = startX + dx * progress;
    const y = startY + dy * progress;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = `rgba(165,243,252,${.55 + pulse * .35})`;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowBlur = 8;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = "900 18px Rajdhani, Arial";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(2,6,23,.96)";
  ctx.fillStyle = "#cffafe";
  const labelY = startY - 58;
  ctx.strokeText("BASE À PROTÉGER", startX, labelY);
  ctx.fillText("BASE À PROTÉGER", startX, labelY);
  ctx.font = "800 12px Rajdhani, Arial";
  ctx.fillStyle = "#67e8f9";
  ctx.strokeText("SUIVEZ LES FLÈCHES CYAN", startX, labelY + 18);
  ctx.fillText("SUIVEZ LES FLÈCHES CYAN", startX, labelY + 18);
  ctx.restore();
}

function drawShield(ctx, camera, shield){
  const ratio = clamp01(finite(shield.hp) / Math.max(1, finite(shield.maxHp, 1)));
  const station = NOX_PORTAL_MAP.station;
  const x = station.x - camera.x;
  const y = station.y - camera.y;
  const radius = NOX_PORTAL_MAP.shieldRadius;
  const pulse = .5 + .5 * Math.sin(performance.now() / 150);
  ctx.save();
  if(ratio > 0){
    ctx.globalCompositeOperation = "lighter";
    const field = ctx.createRadialGradient(x, y, radius * .74, x, y, radius * 1.03);
    field.addColorStop(0, "rgba(56,189,248,0)");
    field.addColorStop(.78, `rgba(59,130,246,${.025 + ratio * .035})`);
    field.addColorStop(.96, `rgba(103,232,249,${.09 + ratio * .08})`);
    field.addColorStop(1, "rgba(103,232,249,0)");
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ratio > .25
      ? `rgba(103,232,249,${.48 + pulse * .20})`
      : `rgba(248,113,113,${.62 + pulse * .28})`;
    ctx.shadowColor = ratio > .25 ? "#22d3ee" : "#ef4444";
    ctx.shadowBlur = 18 + pulse * 14;
    ctx.lineWidth = 7;
    ctx.setLineDash([62, 18]);
    ctx.lineDashOffset = -performance.now() / 32;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }else{
    ctx.strokeStyle = "rgba(239,68,68,.35)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 28]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  drawVitalBar(ctx, {
    x,
    y:y - radius - 52,
    width:310,
    hp:shield.hp,
    maxHp:shield.maxHp,
    color:"#22d3ee",
    label:ratio > 0 ? "BARRIÈRE DE STATION" : "BARRIÈRE DÉTRUITE"
  });
}

function drawCore(ctx, camera, core){
  const station = NOX_PORTAL_MAP.station;
  const x = finite(core.x, station.x) - camera.x;
  const y = finite(core.y, station.y) - camera.y;
  const alive = core.alive && core.hp > 0;
  const pulse = .5 + .5 * Math.sin(performance.now() / 125);
  const radius = NOX_PORTAL_MAP.coreRadius;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, radius * 1.7);
  aura.addColorStop(0, alive ? "rgba(255,255,255,.72)" : "rgba(127,29,29,.36)");
  aura.addColorStop(.28, alive ? "rgba(192,132,252,.42)" : "rgba(239,68,68,.18)");
  aura.addColorStop(1, "rgba(88,28,135,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  ctx.rotate(performance.now() / 8000);
  ctx.fillStyle = alive ? "#160d35" : "#19090b";
  ctx.strokeStyle = alive ? "#c084fc" : "#7f1d1d";
  ctx.shadowColor = alive ? "#a855f7" : "#ef4444";
  ctx.shadowBlur = alive ? 22 + pulse * 12 : 6;
  ctx.lineWidth = 8;
  ctx.beginPath();
  for(let index = 0; index < 12; index += 1){
    const angle = index / 12 * Math.PI * 2;
    const pointRadius = index % 2 ? radius * .78 : radius;
    const px = Math.cos(angle) * pointRadius;
    const py = Math.sin(angle) * pointRadius;
    if(index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.rotate(-performance.now() / 3900);
  ctx.strokeStyle = alive ? "#67e8f9" : "#991b1b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius * .54, 0, Math.PI * 1.55);
  ctx.stroke();
  ctx.restore();
  drawVitalBar(ctx, {
    x,
    y:y + radius + 46,
    width:330,
    hp:core.hp,
    maxHp:core.maxHp || NOX_CORE_MAX_HP,
    color:"#c084fc",
    label:alive ? "NOYAU DE NOX · À PROTÉGER" : "NOYAU DÉTRUIT"
  });
}

function drawLaserTurret(ctx, palette){
  ctx.fillStyle = palette.dark;
  ctx.strokeStyle = palette.main;
  ctx.lineWidth = 4;
  ctx.fillRect(-42, -34, 84, 68);
  ctx.strokeRect(-42, -34, 84, 68);
  ctx.fillStyle = palette.main;
  ctx.fillRect(-8, -78, 16, 70);
  ctx.fillRect(-28, -76, 13, 54);
  ctx.fillRect(15, -76, 13, 54);
}

function drawMissileTurret(ctx, palette){
  ctx.fillStyle = palette.dark;
  ctx.strokeStyle = palette.main;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for(const side of [-1, 1]){
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(side * 20 - 10, -72, 20, 58);
    ctx.strokeRect(side * 20 - 10, -72, 20, 58);
    ctx.fillStyle = palette.main;
    for(let y = -62; y <= -30; y += 16){
      ctx.beginPath();
      ctx.arc(side * 20, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSummoner(ctx, palette){
  ctx.fillStyle = palette.dark;
  ctx.strokeStyle = palette.main;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for(let index = 0; index < 6; index += 1){
    const angle = -Math.PI / 2 + index / 6 * Math.PI * 2;
    const px = Math.cos(angle) * 52;
    const py = Math.sin(angle) * 52;
    if(index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#f5d0fe";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22, 0);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 22);
  ctx.stroke();
}

function drawDefense(ctx, camera, defense){
  const palette = TYPE_COLORS[defense.type] || TYPE_COLORS.laser;
  const x = defense.x - camera.x;
  const y = defense.y - camera.y;
  const alive = defense.alive && defense.hp > 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(finite(defense.angle));
  ctx.globalAlpha = alive ? 1 : .38;
  ctx.shadowColor = alive ? palette.main : "#ef4444";
  ctx.shadowBlur = alive ? 14 : 3;
  if(defense.type === "missile") drawMissileTurret(ctx, palette);
  else if(defense.type === "summoner") drawSummoner(ctx, palette);
  else drawLaserTurret(ctx, palette);
  if(!alive){
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-46, -46);
    ctx.lineTo(46, 46);
    ctx.moveTo(46, -46);
    ctx.lineTo(-46, 46);
    ctx.stroke();
  }
  ctx.restore();
  drawVitalBar(ctx, {
    x,
    y:y + 82,
    width:150,
    hp:defense.hp,
    maxHp:defense.maxHp,
    color:palette.main,
    label:`${palette.label}${defense.type === "summoner" ? ` · ${defense.dronesAlive || 0}/3` : ""}`
  });
}

function drawDrone(ctx, camera, drone){
  const x = drone.x - camera.x;
  const y = drone.y - camera.y;
  const angle = finite(drone.angle);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 13;
  ctx.fillStyle = "#3b0764";
  ctx.strokeStyle = "#e9d5ff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(19, 17);
  ctx.lineTo(0, 10);
  ctx.lineTo(-19, 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#67e8f9";
  ctx.beginPath();
  ctx.arc(0, -2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function effectAgeMs(effect, now){
  const at = finite(effect.at);
  if(at <= 0) return 0;
  const receivedAt = finite(effect.receivedAt);
  const serverAt = finite(effect.serverAt);
  if(receivedAt > 0 && serverAt > 0){
    return Math.max(0, (now - receivedAt) + (serverAt - at));
  }
  return at > 100_000_000_000 ? Math.max(0, now - at) : Math.max(0, performance.now() - at);
}

function drawEffect(ctx, camera, effect, now){
  const age = effectAgeMs(effect, now);
  const duration = Math.max(100, finite(effect.durationMs, 500));
  if(age > duration) return;
  const progress = clamp01(age / duration);
  const alpha = 1 - progress;
  const type = String(effect.type || "").toLowerCase();
  const from = effect.from;
  const to = effect.to;
  if((type === "nox_drone_attack" || type === "nox_enemy_drone_attack" || type === "nox_enemy_attack") && from && to){
    const x1 = from.x - camera.x;
    const y1 = from.y - camera.y;
    const x2 = to.x - camera.x;
    const y2 = to.y - camera.y;
    const enemyShot = type !== "nox_drone_attack";
    ctx.save();
    ctx.strokeStyle = enemyShot ? `rgba(248,113,113,${alpha})` : `rgba(192,132,252,${alpha})`;
    ctx.shadowColor = enemyShot ? "#ef4444" : "#67e8f9";
    ctx.shadowBlur = 13;
    ctx.lineWidth = enemyShot ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.fillStyle = enemyShot ? "#fecaca" : "#cffafe";
    ctx.beginPath();
    ctx.arc(x2, y2, 5 + (1 - progress) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if(type === "nox_drone_summon"){
    const x = finite(effect.x, to?.x ?? from?.x) - camera.x;
    const y = finite(effect.y, to?.y ?? from?.y) - camera.y;
    const radius = 35 + progress * 95;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(216,180,254,${alpha})`;
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 20;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(103,232,249,${alpha * .72})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * .65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }  if((type.includes("laser") || type.includes("missile")) && from && to){
    const x1 = from.x - camera.x;
    const y1 = from.y - camera.y;
    const x2 = to.x - camera.x;
    const y2 = to.y - camera.y;
    ctx.save();
    if(type.includes("laser")){
      ctx.strokeStyle = `rgba(103,232,249,${alpha})`;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 16;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }else{
      const travel = Math.min(1, progress * 2.4);
      const px = x1 + (x2 - x1) * travel;
      const py = y1 + (y2 - y1) * travel;
      ctx.strokeStyle = `rgba(251,191,36,${alpha * .65})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fef3c7";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if(type.includes("explosion") || type.includes("kamikaze") || type.includes("impact")){
    const x = finite(effect.x, to?.x) - camera.x;
    const y = finite(effect.y, to?.y) - camera.y;
    const radius = Math.max(30, finite(effect.radius, type.includes("kamikaze") ? NOX_KAMIKAZE_BLAST_RADIUS : 80));
    const visualRadius = radius * (.22 + progress * .78);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const blast = ctx.createRadialGradient(x, y, 0, x, y, visualRadius);
    blast.addColorStop(0, `rgba(255,255,255,${alpha})`);
    blast.addColorStop(.24, `rgba(251,146,60,${alpha * .88})`);
    blast.addColorStop(.72, `rgba(239,68,68,${alpha * .42})`);
    blast.addColorStop(1, "rgba(127,29,29,0)");
    ctx.fillStyle = blast;
    ctx.beginPath();
    ctx.arc(x, y, visualRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(254,202,202,${alpha * .8})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, visualRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function getNoxObjectiveMarkers(objective){
  const state = normalizeNoxObjective(objective);
  const markers = [
    {
      x:NOX_PORTAL_MAP.station.x,
      y:NOX_PORTAL_MAP.station.y,
      radius:NOX_PORTAL_MAP.shieldRadius,
      markerKind:"nox_shield",
      number:"",
      active:state.shield.alive,
      unlocked:true
    },
    {
      x:NOX_PORTAL_MAP.station.x,
      y:NOX_PORTAL_MAP.station.y,
      markerKind:"nox_core",
      number:"N",
      active:state.core.alive,
      unlocked:true
    }
  ];
  for(const defense of state.defenses){
    markers.push({
      x:defense.x,
      y:defense.y,
      markerKind:`nox_${defense.type}`,
      number:defense.type === "laser" ? "L" : defense.type === "missile" ? "M" : "D",
      active:defense.alive,
      unlocked:defense.alive
    });
  }
  return markers;
}

export function createNoxEncounterRenderer({ctx, getState}){
  function drawArena(state = getState()){
    if(state.gameMode !== "portal" || !isNoxPortal(state.activePortal)) return;
    const objective = normalizeNoxObjective(state.portalObjective);
    const camera = state.camera;
    ctx.save();
    drawStationDeck(ctx, camera);
    drawEntryGuide(ctx, camera);
    drawShield(ctx, camera, objective.shield);
    for(const defense of objective.defenses) drawDefense(ctx, camera, defense);
    drawCore(ctx, camera, objective.core);
    for(const drone of objective.drones) drawDrone(ctx, camera, drone);
    const now = Date.now();
    for(const effect of objective.recentEffects) drawEffect(ctx, camera, effect, now);
    ctx.restore();
  }

  return {drawArena};
}
