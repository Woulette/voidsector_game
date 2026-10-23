import {
  PRISMATIC_GUARDIAN_ASSET,
  PRISMATIC_PLANET_ASSETS,
  PRISMATIC_PORTAL_MAP,
  isPrismaticPortal,
  normalizePrismaticObjective
} from "../../data/prismaticPortal.js?v=20260726-prismatic1";
import { getCachedCombatImage } from "../combatAssets.js?v=20261022-helion-hub1";

const ELEMENT_PALETTES = Object.freeze({
  fire:Object.freeze({
    main:"#fb923c",
    light:"#ffedd5",
    dark:"#7c2d12",
    glow:"rgba(249,115,22,.92)"
  }),
  water:Object.freeze({
    main:"#38bdf8",
    light:"#cffafe",
    dark:"#0c4a6e",
    glow:"rgba(14,165,233,.92)"
  }),
  red:Object.freeze({
    main:"#fb7185",
    light:"#ffe4e6",
    dark:"#881337",
    glow:"rgba(244,63,94,.92)"
  }),
  green:Object.freeze({
    main:"#4ade80",
    light:"#dcfce7",
    dark:"#14532d",
    glow:"rgba(34,197,94,.92)"
  }),
  blue:Object.freeze({
    main:"#60a5fa",
    light:"#dbeafe",
    dark:"#1e3a8a",
    glow:"rgba(59,130,246,.92)"
  })
});

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value){
  return Math.max(0, Math.min(1, finite(value)));
}

function paletteFor(value){
  return ELEMENT_PALETTES[String(value || "").toLowerCase()] || ELEMENT_PALETTES.red;
}

export function getPrismaticEntityColor(enemy, fallback = "red"){
  const explicit = String(
    enemy?.prismaticColor
    || enemy?.prismaticElement
    || enemy?.colorKey
    || enemy?.bossColor
    || enemy?.element
    || ""
  ).toLowerCase();
  if(ELEMENT_PALETTES[explicit]) return explicit;
  const identity = `${enemy?.renderMode || ""} ${enemy?.id || ""} ${enemy?.kind || ""} ${enemy?.type || ""}`.toLowerCase();
  const parsed = identity.match(/(?:^|[^a-z])(fire|water|red|green|blue)(?:[^a-z]|$)/)?.[1];
  return ELEMENT_PALETTES[parsed] ? parsed : fallback;
}

function readyImage(cache, src){
  const image = getCachedCombatImage(cache, src);
  return image?.complete && Number(image.naturalWidth || 0) > 0 ? image : null;
}

function entityPoint(entity, camera){
  return {
    x:finite(entity?.x) - finite(camera?.x),
    y:finite(entity?.y) - finite(camera?.y)
  };
}

function drawVitalBar(ctx, {
  x,
  y,
  width,
  hp,
  maxHp,
  color,
  label = ""
}){
  const ratio = clamp01(finite(hp) / Math.max(1, finite(maxHp, 1)));
  ctx.save();
  ctx.fillStyle = "rgba(2,6,23,.94)";
  ctx.fillRect(x - width / 2, y, width, 15);
  ctx.fillStyle = ratio > .20 ? color : "#ef4444";
  ctx.shadowColor = ratio > .20 ? color : "#ef4444";
  ctx.shadowBlur = 9;
  ctx.fillRect(x - width / 2 + 2, y + 2, Math.max(0, width - 4) * ratio, 11);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(226,232,240,.66)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - width / 2, y, width, 15);
  if(label){
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 12px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, y - 5);
  }
  ctx.restore();
}

function findEnemy(state, id){
  const targetId = String(id || "");
  if(!targetId) return null;
  return (state?.enemies || []).find(enemy=>
    String(enemy?.serverId || enemy?.id || "") === targetId
  ) || null;
}

function drawArenaLinks(ctx, camera, objective){
  const riftX = objective.rift.x - camera.x;
  const riftY = objective.rift.y - camera.y;
  const pulse = .5 + .5 * Math.sin(performance.now() / 520);
  ctx.save();
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 24]);
  ctx.lineDashOffset = -performance.now() / 48;
  for(const planet of objective.planets){
    const palette = paletteFor(planet.element);
    const gradient = ctx.createLinearGradient(
      planet.x - camera.x,
      planet.y - camera.y,
      riftX,
      riftY
    );
    gradient.addColorStop(0, planet.destroyed ? "rgba(100,116,139,.08)" : palette.glow);
    gradient.addColorStop(1, "rgba(192,132,252,.12)");
    ctx.strokeStyle = gradient;
    ctx.globalAlpha = planet.destroyed ? .22 : .18 + pulse * .11;
    ctx.beginPath();
    ctx.moveTo(planet.x - camera.x, planet.y - camera.y);
    ctx.lineTo(riftX, riftY);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawDestroyedPlanet(ctx, x, y, radius, palette){
  const pulse = .5 + .5 * Math.sin(performance.now() / 190);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(148,163,184,${.28 + pulse * .10})`;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 22]);
  ctx.lineDashOffset = performance.now() / 32;
  for(const factor of [.56, .88, 1.12]){
    ctx.beginPath();
    ctx.arc(0, 0, radius * factor, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = palette.main;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-radius * .58, -radius * .58);
  ctx.lineTo(radius * .58, radius * .58);
  ctx.moveTo(radius * .58, -radius * .58);
  ctx.lineTo(-radius * .58, radius * .58);
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(ctx, cache, camera, planet){
  const x = planet.x - camera.x;
  const y = planet.y - camera.y;
  const palette = paletteFor(planet.element);
  const pulse = .5 + .5 * Math.sin(performance.now() / 240 + planet.x * .0004);
  const radius = 178;
  const image = readyImage(cache, PRISMATIC_PLANET_ASSETS[planet.element]);
  ctx.save();
  ctx.translate(x, y);
  const aura = ctx.createRadialGradient(0, 0, radius * .32, 0, 0, radius * 1.48);
  aura.addColorStop(0, planet.destroyed ? "rgba(100,116,139,.08)" : `${palette.main}33`);
  aura.addColorStop(.62, planet.destroyed ? "rgba(51,65,85,.04)" : `${palette.main}14`);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.48, 0, Math.PI * 2);
  ctx.fill();
  if(planet.destroyed){
    ctx.globalAlpha = .20;
    ctx.filter = "grayscale(1) brightness(.45)";
  }else{
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 24 + pulse * 12;
  }
  if(image){
    const size = radius * 2;
    ctx.rotate(performance.now() / 72_000 * (planet.element === "water" ? -1 : 1));
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
  }else{
    const sphere = ctx.createRadialGradient(-radius * .34, -radius * .38, 8, 0, 0, radius);
    sphere.addColorStop(0, palette.light);
    sphere.addColorStop(.30, palette.main);
    sphere.addColorStop(.72, palette.dark);
    sphere.addColorStop(1, "#020617");
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if(planet.destroyed){
    drawDestroyedPlanet(ctx, x, y, radius, palette);
  }else if(planet.guardiansRemaining > 0){
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${.30 + pulse * .18})`;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 16 + pulse * 8;
    ctx.lineWidth = 4;
    ctx.setLineDash([24, 14]);
    ctx.lineDashOffset = -performance.now() / 36;
    ctx.beginPath();
    ctx.arc(x, y, radius + 36 + pulse * 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawVitalBar(ctx, {
    x,
    y:y + radius + 49,
    width:280,
    hp:planet.hp,
    maxHp:planet.maxHp,
    color:palette.main,
    label:planet.destroyed
      ? `${planet.label} · DÉTRUITE`
      : `${planet.label} · ${planet.guardiansRemaining} GARDIEN(S)`
  });
}

function drawRift(ctx, camera, rift){
  if(!rift.active) return;
  const x = rift.x - camera.x;
  const y = rift.y - camera.y;
  const radius = Math.max(60, rift.radius);
  const now = performance.now();
  const pulse = .5 + .5 * Math.sin(now / 170);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(0, 0, radius * .38, 0, 0, radius * 2.05);
  halo.addColorStop(0, "rgba(0,0,0,0)");
  halo.addColorStop(.38, "rgba(15,23,42,.72)");
  halo.addColorStop(.54, `rgba(192,132,252,${.42 + pulse * .13})`);
  halo.addColorStop(.68, "rgba(56,189,248,.20)");
  halo.addColorStop(1, "rgba(30,64,175,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.05, 0, Math.PI * 2);
  ctx.fill();
  for(let index = 0; index < 5; index += 1){
    const ringRadius = radius * (.92 + index * .15);
    ctx.strokeStyle = index % 2 === 0
      ? `rgba(216,180,254,${.66 - index * .08})`
      : `rgba(103,232,249,${.58 - index * .07})`;
    ctx.shadowColor = index % 2 === 0 ? "#a855f7" : "#22d3ee";
    ctx.shadowBlur = 18;
    ctx.lineWidth = Math.max(2, 8 - index);
    ctx.setLineDash([42 - index * 4, 18 + index * 6]);
    ctx.lineDashOffset = (index % 2 ? 1 : -1) * now / (14 + index * 5);
    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius * 1.36, ringRadius * .48, -.18, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "source-over";
  const core = ctx.createRadialGradient(-radius * .18, -radius * .18, 2, 0, 0, radius);
  core.addColorStop(0, "#000000");
  core.addColorStop(.64, "#02010a");
  core.addColorStop(.88, "#13072c");
  core.addColorStop(1, "#7e22ce");
  ctx.fillStyle = core;
  ctx.shadowColor = "#c084fc";
  ctx.shadowBlur = 26 + pulse * 12;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (.76 + pulse * .025), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(224,242,254,.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius * .80, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = rift.entered ? "#bbf7d0" : "#f3e8ff";
  ctx.font = "900 15px Rajdhani, Arial";
  ctx.fillText(rift.entered ? "FAILLE TRAVERSÉE" : "ENTREZ DANS LE TROU NOIR", 0, -radius * 1.22);
  ctx.restore();
}

function effectAgeMs(effect, now){
  const at = finite(effect?.at);
  if(at <= 0) return 0;
  const receivedAt = finite(effect?.receivedAt);
  const serverAt = finite(effect?.serverAt);
  if(receivedAt > 0 && serverAt > 0){
    return Math.max(0, (now - receivedAt) + (serverAt - at));
  }
  return at > 100_000_000_000 ? Math.max(0, now - at) : 0;
}

function resolveEffectWorldPoint(state, effect){
  const target = findEnemy(state, effect.targetBossId || effect.targetId);
  if(target) return {x:finite(target.x), y:finite(target.y)};
  const type = String(effect.type || "");
  if((type.includes("burn") || type.includes("slow"))
    && state?.player
    && !String(effect.targetBossId || "")){
    return {x:finite(state.player.x), y:finite(state.player.y)};
  }
  if(effect.to) return {x:finite(effect.to.x), y:finite(effect.to.y)};
  if(effect.x || effect.y) return {x:finite(effect.x), y:finite(effect.y)};
  return {x:PRISMATIC_PORTAL_MAP.rift.x, y:PRISMATIC_PORTAL_MAP.rift.y};
}

function drawBurnEffect(ctx, x, y, progress, alpha){
  const radius = 58 + progress * 36;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(let index = 0; index < 9; index += 1){
    const angle = index / 9 * Math.PI * 2 + progress * 2.6;
    const distance = radius * (.42 + (index % 3) * .16);
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance - progress * 34;
    ctx.fillStyle = index % 2
      ? `rgba(251,146,60,${alpha})`
      : `rgba(239,68,68,${alpha * .88})`;
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 13;
    ctx.beginPath();
    ctx.moveTo(px, py - 15);
    ctx.quadraticCurveTo(px + 11, py, px, py + 16);
    ctx.quadraticCurveTo(px - 10, py, px, py - 15);
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(254,215,170,${alpha * .9})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHealEffect(ctx, x, y, progress, alpha){
  const radius = 55 + progress * 82;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(74,222,128,${alpha})`;
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 20;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(220,252,231,${alpha})`;
  ctx.fillRect(x - 9, y - 34, 18, 68);
  ctx.fillRect(x - 34, y - 9, 68, 18);
  ctx.restore();
}

function drawSlowEffect(ctx, x, y, progress, alpha){
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(96,165,250,${alpha})`;
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 18;
  for(let index = 0; index < 3; index += 1){
    ctx.lineWidth = Math.max(2, 6 - index);
    ctx.setLineDash([13, 9 + index * 3]);
    ctx.lineDashOffset = (index % 2 ? -1 : 1) * performance.now() / 28;
    ctx.beginPath();
    ctx.arc(x, y, 52 + index * 26 + progress * 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(219,234,254,${alpha * .9})`;
  ctx.font = "900 18px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.fillText("VITESSE -50 %", x, y - 102);
  ctx.restore();
}

function drawRiftOpenEffect(ctx, x, y, progress, alpha){
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(216,180,254,${alpha})`;
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 28;
  ctx.lineWidth = 10 * (1 - progress) + 2;
  ctx.beginPath();
  ctx.arc(x, y, 80 + progress * 520, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEffect(ctx, camera, state, effect, now){
  const duration = Math.max(100, finite(effect.durationMs, 900));
  const age = effectAgeMs(effect, now);
  if(age > duration) return;
  const progress = clamp01(age / duration);
  const alpha = Math.max(.08, 1 - progress);
  const point = resolveEffectWorldPoint(state, effect);
  const x = point.x - camera.x;
  const y = point.y - camera.y;
  const type = String(effect.type || "").toLowerCase();
  if(type.includes("rift") || type.includes("black_hole")){
    drawRiftOpenEffect(ctx, x, y, progress, alpha);
  }else if(type.includes("heal") || effect.color === "green"){
    drawHealEffect(ctx, x, y, progress, alpha);
  }else if(type.includes("slow") || effect.color === "blue"){
    drawSlowEffect(ctx, x, y, progress, alpha);
  }else if(type.includes("burn") || type.includes("fire") || effect.color === "red"){
    drawBurnEffect(ctx, x, y, progress, alpha);
  }
}

export function getPrismaticEntityVisualKind(enemy){
  const renderMode = String(enemy?.renderMode || "").toLowerCase();
  if(renderMode === "prismatic_planet") return "planet";
  if(renderMode === "prismatic_guardian" || renderMode === "ancestral_guardian") return "guardian";
  if(renderMode === "prismatic_boss") return "boss";
  const identity = `${enemy?.id || ""} ${enemy?.kind || ""} ${enemy?.type || ""}`.toLowerCase();
  if(identity.includes("prismatic_planet")) return "planet";
  if(identity.includes("prismatic") && identity.includes("boss")) return "boss";
  if(identity.includes("prismatic") && (identity.includes("guardian") || identity.includes("ancestral"))) return "guardian";
  return "";
}

function drawGuardianVisual({ctx, camera, cache, enemy}){
  const point = entityPoint(enemy, camera);
  const element = getPrismaticEntityColor(enemy);
  const palette = paletteFor(element);
  const width = Math.max(92, Math.min(155, finite(enemy?.width, 116)));
  const height = Math.max(92, Math.min(155, finite(enemy?.height, width)));
  const pulse = .5 + .5 * Math.sin(performance.now() / 160 + String(enemy?.id || "").length);
  const image = readyImage(cache, enemy?.img || PRISMATIC_GUARDIAN_ASSET);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(finite(enemy?.angle));
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 18 + pulse * 10;
  if(image){
    const filter = element === "water"
      ? "hue-rotate(145deg) saturate(1.25)"
      : element === "fire"
        ? "sepia(.35) saturate(1.35)"
        : "hue-rotate(315deg) saturate(1.25)";
    ctx.filter = filter;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.filter = "none";
  }else{
    ctx.fillStyle = palette.dark;
    ctx.strokeStyle = palette.main;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -height * .48);
    ctx.lineTo(width * .48, 0);
    ctx.lineTo(width * .18, height * .40);
    ctx.lineTo(0, height * .22);
    ctx.lineTo(-width * .18, height * .40);
    ctx.lineTo(-width * .48, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.strokeStyle = `${palette.main}aa`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 9]);
  ctx.lineDashOffset = -performance.now() / 32;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(width, height) * .62 + pulse * 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBossVisual({ctx, camera, cache, enemy}){
  const point = entityPoint(enemy, camera);
  const color = getPrismaticEntityColor(enemy);
  const palette = paletteFor(color);
  const width = Math.max(190, Math.min(320, finite(enemy?.width, 250)));
  const height = Math.max(170, Math.min(300, finite(enemy?.height, width)));
  const pulse = .5 + .5 * Math.sin(performance.now() / 125 + String(enemy?.id || "").length);
  const image = readyImage(cache, enemy?.img);
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = palette.main;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 25 + pulse * 15;
  ctx.lineWidth = 5;
  ctx.setLineDash([22, 14]);
  ctx.lineDashOffset = (color === "green" ? 1 : -1) * performance.now() / 24;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(width, height) * .59 + pulse * 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalCompositeOperation = "source-over";
  ctx.rotate(finite(enemy?.angle));
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 28;
  if(image){
    ctx.filter = color === "green"
      ? "grayscale(.38) sepia(.82) saturate(5.6) hue-rotate(72deg) brightness(1.03) contrast(1.08)"
      : color === "blue"
        ? "grayscale(.30) sepia(.70) saturate(5.2) hue-rotate(155deg) brightness(1.06) contrast(1.10)"
        : "grayscale(.34) sepia(.82) saturate(6.2) hue-rotate(312deg) brightness(1.02) contrast(1.10)";
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.filter = "none";
  }else{
    ctx.fillStyle = palette.dark;
    ctx.strokeStyle = palette.light;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(width * .48, 0);
    ctx.lineTo(width * .10, -height * .46);
    ctx.lineTo(-width * .44, -height * .27);
    ctx.lineTo(-width * .22, 0);
    ctx.lineTo(-width * .44, height * .27);
    ctx.lineTo(width * .10, height * .46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = palette.light;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 12;
  ctx.font = "900 16px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.fillText(`BOSS PRISMATIQUE ${color.toUpperCase()}`, point.x, point.y - height * .68);
  ctx.restore();
}

export function drawPrismaticEnemyVisual({ctx, camera, cache, enemy}){
  const kind = getPrismaticEntityVisualKind(enemy);
  if(kind === "planet") return true;
  if(kind === "guardian"){
    drawGuardianVisual({ctx, camera, cache, enemy});
    return true;
  }
  if(kind === "boss"){
    drawBossVisual({ctx, camera, cache, enemy});
    return true;
  }
  return false;
}

export function getPrismaticObjectiveMarkers(objective, enemies = []){
  const state = normalizePrismaticObjective(objective);
  const markers = state.planets.map(planet=>({
    x:planet.x,
    y:planet.y,
    markerKind:`prismatic_planet_${planet.element}`,
    number:planet.element === "fire" ? "F" : planet.element === "water" ? "E" : "R",
    active:!planet.destroyed,
    unlocked:true
  }));
  if(state.rift.active && !state.rift.entered){
    markers.push({
      x:state.rift.x,
      y:state.rift.y,
      markerKind:"prismatic_rift",
      number:"◉",
      active:true,
      unlocked:true
    });
  }
  if(state.stage === "bosses"){
    for(const boss of state.bosses.filter(candidate=>candidate.alive)){
      const entity = enemies.find(enemy=>
        String(enemy?.serverId || enemy?.id || "") === boss.id
      );
      if(!entity) continue;
      markers.push({
        x:finite(entity.x),
        y:finite(entity.y),
        markerKind:"prismatic_boss",
        number:"!",
        active:true,
        unlocked:true
      });
    }
  }
  return markers;
}

export function createPrismaticEncounterRenderer({ctx, cache, getState}){
  function drawArena(state = getState()){
    if(state.gameMode !== "portal" || !isPrismaticPortal(state.activePortal)) return;
    const objective = normalizePrismaticObjective(state.portalObjective);
    const camera = state.camera;
    ctx.save();
    drawArenaLinks(ctx, camera, objective);
    for(const planet of objective.planets) drawPlanet(ctx, cache, camera, planet);
    drawRift(ctx, camera, objective.rift);
    const now = Date.now();
    for(const effect of objective.effects) drawEffect(ctx, camera, state, effect, now);
    ctx.restore();
  }

  return {drawArena};
}
