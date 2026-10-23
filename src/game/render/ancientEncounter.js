import {
  ANCIENT_BOMB_RADIUS,
  ANCIENT_PORTAL_MAP,
  getAncientObjectiveMarkers as getSharedAncientObjectiveMarkers,
  isAncientPortal,
  normalizeAncientObjective
} from "../../data/ancientPortal.js?v=20260726-ancient1";

const BOMB_WARNING_MS = 3_000;
const TAU = Math.PI * 2;

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value){
  return Math.max(0, Math.min(1, finite(value)));
}

function clock(){
  return globalThis.performance?.now?.() ?? Date.now();
}

function screen(point, camera){
  return {
    x:finite(point?.x) - finite(camera?.x),
    y:finite(point?.y) - finite(camera?.y)
  };
}

export function getAncientRoomVisualState(room, rawRoom = room){
  const discovered = Boolean(room?.discovered);
  const role = discovered ? String(rawRoom?.role || room?.role || "empty") : "unknown";
  const freed = Boolean(room?.angelFreed);
  const cageDestroyed = Boolean(room?.cageDestroyed);
  return {
    discovered,
    role,
    freed,
    cageDestroyed,
    status:!discovered
      ? "unknown"
      : role === "angel"
        ? freed ? "freed" : cageDestroyed ? "opening" : "captive"
        : role === "talisman"
          ? "talisman"
          : "empty",
    accent:!discovered
      ? "#64748b"
      : role === "angel"
        ? freed ? "#86efac" : "#fde68a"
        : role === "talisman"
          ? "#f8fafc"
          : "#fb7185"
  };
}

export function getAncientBombVisualState(bomb, now = Date.now()){
  const remainingMs = Math.max(0, finite(bomb?.detonateAt) - finite(now));
  return {
    remainingMs,
    progress:clamp01(1 - remainingMs / BOMB_WARNING_MS),
    radius:Math.max(20, finite(bomb?.radius, ANCIENT_BOMB_RADIUS)),
    imminent:remainingMs <= 1_000,
    label:remainingMs > 0 ? `${Math.max(1, Math.ceil(remainingMs / 1_000))}` : "0"
  };
}

export function getAncientObjectiveMarkers(objective){
  return getSharedAncientObjectiveMarkers(objective);
}

export function getAncientRoomVisual(room){
  const state = getAncientRoomVisualState(room);
  return {
    ...state,
    color:state.accent,
    glow:state.role === "angel"
      ? "#38bdf8"
      : state.role === "talisman"
        ? "#f59e0b"
        : state.role === "empty"
          ? "#7f1d1d"
          : "#334155",
    label:state.status === "captive"
      ? "VAISSEAU-ANGE"
      : state.status === "talisman"
        ? "TALISMAN"
        : state.status === "empty"
          ? "CELLULE VIDE"
          : "SALLE INCONNUE",
    cageVisible:!state.cageDestroyed,
    captiveVisible:state.status === "captive",
    talismanVisible:state.status === "talisman"
  };
}

export function getAncientEnemyOverlayKind(enemy){
  if(enemy?.precursorTalismanIcon) return "talisman";
  if(enemy?.precursorBoss || enemy?.precursorRole === "demon_king") return "king";
  if(enemy?.precursorRole === "infernal_cage") return "cage";
  return "";
}

function pathCircle(ctx, x, y, radius){
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
}

function label(ctx, text, x, y, color = "#f8fafc", size = 15){
  ctx.save();
  ctx.font = `900 ${size}px Rajdhani, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(2,6,23,.94)";
  ctx.strokeText(String(text), x, y);
  ctx.fillStyle = color;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function drawHellFloor(ctx, camera, now){
  const hub = screen(ANCIENT_PORTAL_MAP.hub, camera);
  const pulse = .5 + Math.sin(now / 620) * .5;
  ctx.save();
  ctx.fillStyle = "#120407";
  ctx.fillRect(
    -ANCIENT_PORTAL_MAP.width / 2 - finite(camera?.x),
    -ANCIENT_PORTAL_MAP.height / 2 - finite(camera?.y),
    ANCIENT_PORTAL_MAP.width,
    ANCIENT_PORTAL_MAP.height
  );
  for(const room of ANCIENT_PORTAL_MAP.rooms){
    const point = screen(room, camera);
    ctx.strokeStyle = "rgba(239,68,68,.22)";
    ctx.lineWidth = 450;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hub.x, hub.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(251,146,60,${.22 + pulse * .12})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 22]);
    ctx.lineDashOffset = -now / 35;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const hubGlow = ctx.createRadialGradient(hub.x, hub.y, 80, hub.x, hub.y, ANCIENT_PORTAL_MAP.hub.radius);
  hubGlow.addColorStop(0, "rgba(127,29,29,.52)");
  hubGlow.addColorStop(1, "rgba(15,2,4,.08)");
  ctx.fillStyle = hubGlow;
  pathCircle(ctx, hub.x, hub.y, ANCIENT_PORTAL_MAP.hub.radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(248,113,113,.38)";
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
}

function drawAngelGlyph(ctx, x, y, scale = 1, color = "#fef3c7"){
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(13, 4);
  ctx.lineTo(43, 27);
  ctx.lineTo(17, 25);
  ctx.lineTo(0, 44);
  ctx.lineTo(-17, 25);
  ctx.lineTo(-43, 27);
  ctx.lineTo(-13, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#67e8f9";
  pathCircle(ctx, 0, 5, 7);
  ctx.fill();
  ctx.restore();
}

function drawCage(ctx, x, y, roomVisual){
  if(roomVisual.cageDestroyed){
    ctx.save();
    ctx.strokeStyle = "rgba(251,113,133,.5)";
    ctx.lineWidth = 5;
    for(const side of [-1, 1]){
      ctx.beginPath();
      ctx.moveTo(x + side * 22, y - 55);
      ctx.lineTo(x + side * 68, y + 52);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.fillStyle = "rgba(15,23,42,.84)";
  ctx.strokeStyle = "#f97316";
  ctx.shadowColor = "#dc2626";
  ctx.shadowBlur = 14;
  ctx.lineWidth = 5;
  ctx.fillRect(x - 70, y - 62, 140, 124);
  ctx.strokeRect(x - 70, y - 62, 140, 124);
  ctx.lineWidth = 4;
  for(let offset = -45; offset <= 45; offset += 30){
    ctx.beginPath();
    ctx.moveTo(x + offset, y - 58);
    ctx.lineTo(x + offset, y + 58);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHellRoom(ctx, camera, room, rawRoom, now){
  const point = screen(room, camera);
  const visual = getAncientRoomVisualState(room, rawRoom);
  const pulse = .5 + Math.sin(now / 400 + room.number) * .5;
  ctx.save();
  const gradient = ctx.createRadialGradient(point.x, point.y, 70, point.x, point.y, room.radius);
  gradient.addColorStop(0, visual.discovered ? "rgba(69,10,10,.82)" : "rgba(15,23,42,.93)");
  gradient.addColorStop(1, visual.discovered ? "rgba(28,4,8,.76)" : "rgba(2,6,23,.72)");
  ctx.fillStyle = gradient;
  pathCircle(ctx, point.x, point.y, room.radius);
  ctx.fill();
  ctx.strokeStyle = visual.accent;
  ctx.globalAlpha = visual.discovered ? .72 : .35;
  ctx.lineWidth = visual.discovered ? 7 : 4;
  ctx.setLineDash(visual.discovered ? [] : [18, 22]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  label(ctx, visual.discovered ? room.label : `${room.label} · ?`, point.x, point.y - room.radius + 55, visual.accent, 19);
  if(!visual.discovered){
    label(ctx, "?", point.x, point.y, "#94a3b8", 64);
  }else if(visual.role === "angel"){
    if(!visual.freed){
      drawAngelGlyph(ctx, point.x, point.y, .72);
      drawCage(ctx, point.x, point.y, visual);
      label(ctx, "VAISSEAU-ANGE CAPTIF", point.x, point.y + 105, "#fde68a", 15);
    }else{
      drawAngelGlyph(ctx, point.x, point.y, .9, "#86efac");
      label(ctx, "ANGE LIBÉRÉ", point.x, point.y + 90, "#86efac", 16);
    }
  }else if(visual.role === "talisman"){
    ctx.fillStyle = `rgba(248,250,252,${.75 + pulse * .25})`;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 24;
    ctx.fillRect(point.x - 30, point.y - 42, 60, 84);
    label(ctx, "GARDIEN DU TALISMAN", point.x, point.y + 90, "#f8fafc", 15);
  }else{
    drawCage(ctx, point.x, point.y, visual);
    label(ctx, "SALLE VIDE", point.x, point.y + 100, "#fb7185", 14);
  }
  ctx.restore();
}

function drawBeaconAndRift(ctx, camera, objective, now){
  const beacon = screen(objective.beacon, camera);
  ctx.save();
  ctx.translate(beacon.x, beacon.y);
  ctx.rotate(now / 4200);
  ctx.strokeStyle = objective.beacon.active ? "#facc15" : "rgba(148,163,184,.38)";
  ctx.fillStyle = objective.beacon.active ? "rgba(113,63,18,.55)" : "rgba(30,41,59,.65)";
  ctx.shadowColor = objective.beacon.active ? "#f59e0b" : "transparent";
  ctx.shadowBlur = 22;
  ctx.lineWidth = 6;
  for(let ring = 0; ring < 3; ring += 1){
    ctx.rotate(Math.PI / 3);
    ctx.strokeRect(-70 - ring * 18, -70 - ring * 18, 140 + ring * 36, 140 + ring * 36);
  }
  ctx.fillRect(-45, -45, 90, 90);
  ctx.restore();
  if(objective.beacon.active) label(ctx, "BALISE · PLACEZ LE TALISMAN", beacon.x, beacon.y + 150, "#fde68a", 16);
  if(!objective.rift.open) return;
  const rift = screen(objective.rift, camera);
  const radius = objective.rift.radius;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const portal = ctx.createRadialGradient(rift.x, rift.y, 20, rift.x, rift.y, radius);
  portal.addColorStop(0, "rgba(255,255,255,.95)");
  portal.addColorStop(.28, "rgba(125,211,252,.75)");
  portal.addColorStop(.62, "rgba(167,139,250,.48)");
  portal.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = portal;
  pathCircle(ctx, rift.x, rift.y, radius);
  ctx.fill();
  ctx.strokeStyle = "#e0f2fe";
  ctx.lineWidth = 9;
  ctx.setLineDash([38, 16]);
  ctx.lineDashOffset = -now / 22;
  ctx.stroke();
  ctx.restore();
  label(ctx, "FAILLE VERS LE PARADIS", rift.x, rift.y + radius + 38, "#e0f2fe", 18);
}

function drawParadiseFloor(ctx, camera, now){
  const arena = screen(ANCIENT_PORTAL_MAP.paradiseArena, camera);
  ctx.save();
  const sky = ctx.createRadialGradient(arena.x, arena.y, 100, arena.x, arena.y, ANCIENT_PORTAL_MAP.paradiseArena.radius);
  sky.addColorStop(0, "rgba(224,242,254,.88)");
  sky.addColorStop(.45, "rgba(56,189,248,.20)");
  sky.addColorStop(1, "rgba(250,204,21,.04)");
  ctx.fillStyle = sky;
  pathCircle(ctx, arena.x, arena.y, ANCIENT_PORTAL_MAP.paradiseArena.radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(254,240,138,.7)";
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.setLineDash([50, 30]);
  ctx.lineDashOffset = -now / 45;
  for(const radius of [700, 1_400, 2_050]){
    pathCircle(ctx, arena.x, arena.y, radius);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
  label(ctx, "PARADIS DES PRÉCURSEURS", arena.x, arena.y - 2_050, "#fef3c7", 24);
}

function drawAlly(ctx, camera, ally){
  const point = screen(ally, camera);
  drawAngelGlyph(ctx, point.x, point.y, .72, ally.color || "#fef3c7");
  const durability = finite(ally.hp) + finite(ally.shield);
  const maximum = Math.max(1, finite(ally.maxHp) + finite(ally.maxShield));
  ctx.save();
  ctx.fillStyle = "rgba(2,6,23,.85)";
  ctx.fillRect(point.x - 48, point.y + 44, 96, 7);
  ctx.fillStyle = durability / maximum > .25 ? "#86efac" : "#f87171";
  ctx.fillRect(point.x - 47, point.y + 45, 94 * clamp01(durability / maximum), 5);
  ctx.restore();
}

function drawBomb(ctx, camera, bomb, now){
  const point = screen(bomb, camera);
  const visual = getAncientBombVisualState(bomb, now);
  const pulse = .5 + Math.sin(clock() / 80) * .5;
  ctx.save();
  ctx.fillStyle = visual.imminent ? "rgba(239,68,68,.32)" : "rgba(249,115,22,.18)";
  ctx.strokeStyle = visual.imminent ? "#fff" : "#fb923c";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 18 + pulse * 16;
  ctx.lineWidth = visual.imminent ? 8 : 5;
  pathCircle(ctx, point.x, point.y, visual.radius);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#fef2f2";
  ctx.lineWidth = 3;
  pathCircle(ctx, point.x, point.y, Math.max(10, visual.radius * visual.progress));
  ctx.stroke();
  ctx.restore();
  label(ctx, visual.label, point.x, point.y, "#fff", 28);
}

function drawGod(ctx, camera, god, now){
  if(!god.visible) return;
  const point = screen(god, camera);
  const pulse = .5 + Math.sin(now / 180) * .5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const aura = ctx.createRadialGradient(point.x, point.y, 10, point.x, point.y, god.radius * 2.2);
  aura.addColorStop(0, "rgba(255,255,255,.98)");
  aura.addColorStop(.25, "rgba(254,240,138,.72)");
  aura.addColorStop(1, "rgba(125,211,252,0)");
  ctx.fillStyle = aura;
  pathCircle(ctx, point.x, point.y, god.radius * 2.2);
  ctx.fill();
  ctx.restore();
  drawAngelGlyph(ctx, point.x, point.y, 2.1 + pulse * .12, "#fff");
  label(ctx, "DIEU DES VAISSEAUX · CLIQUEZ", point.x, point.y + god.radius + 80, "#fef3c7", 20);
}

function drawEffect(ctx, camera, effect, now){
  const age = Math.max(0, finite(now) - finite(effect.receivedAt, now) + finite(effect.serverAt) - finite(effect.at));
  const duration = Math.max(100, finite(effect.durationMs, 1_000));
  if(age > duration) return;
  const progress = clamp01(age / duration);
  const point = screen(effect, camera);
  const type = String(effect.type || "");
  const healing = type.includes("heal") || type.includes("buff") || type.includes("angel");
  const explosion = type.includes("explosion") || type.includes("expired");
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.strokeStyle = healing ? "#86efac" : explosion ? "#ef4444" : "#fde68a";
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 20;
  ctx.lineWidth = 7;
  pathCircle(ctx, point.x, point.y, 25 + progress * Math.max(80, finite(effect.radius, 130)));
  ctx.stroke();
  ctx.restore();
}

function drawEnemyOverlay(ctx, camera, enemy){
  const kind = getAncientEnemyOverlayKind(enemy);
  if(!kind) return;
  const point = screen(enemy, camera);
  if(kind === "talisman"){
    const pulse = .5 + Math.sin(clock() / 145) * .5;
    ctx.save();
    ctx.translate(point.x, point.y - Math.max(90, finite(enemy?.height, 120) * .62));
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#facc15";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 15 + pulse * 10;
    ctx.lineWidth = 3;
    ctx.fillRect(-18, -24, 36, 48);
    ctx.strokeRect(-18, -24, 36, 48);
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2;
    for(const y of [-12, -3, 6, 15]){
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.lineTo(10, y);
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, "GARDIEN DU TALISMAN", point.x, point.y - Math.max(135, finite(enemy?.height, 120) * .82), "#ffffff", 16);
  }else if(kind === "king"){
    const pulse = .5 + Math.sin(clock() / 180) * .5;
    ctx.save();
    ctx.strokeStyle = `rgba(239,68,68,${.50 + pulse * .34})`;
    ctx.shadowColor = "#7f1d1d";
    ctx.shadowBlur = 24;
    ctx.lineWidth = 8;
    ctx.setLineDash([28, 14]);
    ctx.lineDashOffset = -clock() / 24;
    pathCircle(ctx, point.x, point.y, Math.max(165, finite(enemy?.radius, 130) * 1.45));
    ctx.stroke();
    ctx.restore();
    label(ctx, "ROI DES DÉMONS", point.x, point.y - Math.max(180, finite(enemy?.height, 150) * .72), "#fecaca", 20);
  }
}

export function createAncientEncounterRenderer({ctx, getState}){
  function drawArena(state = getState()){
    if(state.gameMode !== "portal" || !isAncientPortal(state.activePortal)) return;
    const rawObjective = state.portalObjective || {};
    const objective = normalizeAncientObjective(rawObjective);
    const rawRooms = new Map((rawObjective.rooms || []).map(room=>[String(room?.id || ""), room]));
    const camera = state.camera || {x:0, y:0};
    const now = Date.now();
    ctx.save();
    if(objective.phase === "hell" || objective.phase === "failed"){
      drawHellFloor(ctx, camera, clock());
      for(const room of objective.rooms){
        drawHellRoom(ctx, camera, room, rawRooms.get(room.id), clock());
      }
      drawBeaconAndRift(ctx, camera, objective, clock());
    }else{
      drawParadiseFloor(ctx, camera, clock());
      for(const bomb of objective.bombs) drawBomb(ctx, camera, bomb, now);
      drawGod(ctx, camera, objective.god, clock());
    }
    for(const effect of objective.effects) drawEffect(ctx, camera, effect, now);
    ctx.restore();
  }
  function drawAllies(state = getState()){
    if(state.gameMode !== "portal" || !isAncientPortal(state.activePortal)) return;
    const objective = normalizeAncientObjective(state.portalObjective || {});
    if(objective.phase !== "paradise" && objective.phase !== "epilogue") return;
    for(const ally of objective.allies) drawAlly(ctx, state.camera || {x:0, y:0}, ally);
  }
  function drawEnemyOverlays(state = getState()){
    if(state.gameMode !== "portal" || !isAncientPortal(state.activePortal)) return;
    for(const enemy of state.enemies || []) drawEnemyOverlay(ctx, state.camera || {x:0, y:0}, enemy);
  }
  return {drawArena, drawAllies, drawEnemyOverlays};
}
