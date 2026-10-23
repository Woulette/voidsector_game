import {
  getKharonBombVisualState,
  getKharonBossEffectVisualState,
  isKharonPortal,
  normalizeKharonObjective
} from "../../data/kharonPortal.js?v=20260726-kharon1";

function drawTeleportArrival(ctx, x, y, visual){
  if(visual.teleportProgress >= 1) return;
  const progress = visual.teleportProgress;
  const collapse = 1 - progress;
  const pulse = (Math.sin(performance.now() / 55) + 1) / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(x, y);
  ctx.rotate(progress * Math.PI * 1.7);
  ctx.strokeStyle = `rgba(125,211,252,${collapse * .92})`;
  ctx.shadowColor = "rgba(56,189,248,.95)";
  ctx.shadowBlur = 24 + pulse * 16;
  ctx.lineWidth = 4 + collapse * 5;
  for(let index = 0; index < 3; index += 1){
    const radius = 42 + index * 38 + collapse * 145;
    ctx.beginPath();
    ctx.arc(0, 0, radius, index * .9, index * .9 + Math.PI * (1.05 + progress * .55));
    ctx.stroke();
  }
  const beam = ctx.createLinearGradient(0, -260 * collapse, 0, 260 * collapse);
  beam.addColorStop(0, "rgba(56,189,248,0)");
  beam.addColorStop(.5, `rgba(224,242,254,${collapse * .65})`);
  beam.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = beam;
  ctx.fillRect(-18 - collapse * 14, -260 * collapse, 36 + collapse * 28, 520 * collapse);
  ctx.restore();
}

function drawTeleportDeparture(ctx, x, y, visual){
  if(visual.teleportProgress >= 1 || !Number.isFinite(Number(visual.fromX)) || !Number.isFinite(Number(visual.fromY))) return;
  const progress = visual.teleportProgress;
  const fade = 1 - progress;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(192,132,252,${fade * .9})`;
  ctx.shadowColor = "rgba(168,85,247,.95)";
  ctx.shadowBlur = 25;
  ctx.lineWidth = 7 * fade + 2;
  ctx.beginPath();
  ctx.arc(0, 0, 28 + progress * 125, 0, Math.PI * 2);
  ctx.stroke();
  const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, 120 + progress * 80);
  flash.addColorStop(0, `rgba(255,255,255,${fade * .72})`);
  flash.addColorStop(.25, `rgba(125,211,252,${fade * .48})`);
  flash.addColorStop(.65, `rgba(168,85,247,${fade * .24})`);
  flash.addColorStop(1, "rgba(76,29,149,0)");
  ctx.fillStyle = flash;
  ctx.beginPath();
  ctx.arc(0, 0, 120 + progress * 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawChargingBomb(ctx, x, y, visual){
  const radius = visual.displayRadius;
  const pulse = (Math.sin(performance.now() / 95) + 1) / 2;
  const urgency = .35 + visual.chargeProgress * .65;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";

  const danger = ctx.createRadialGradient(0, 0, 8, 0, 0, radius);
  danger.addColorStop(0, `rgba(255,255,255,${.12 + pulse * .12})`);
  danger.addColorStop(.28, `rgba(251,146,60,${.08 + urgency * .08})`);
  danger.addColorStop(.78, `rgba(239,68,68,${.04 + urgency * .08})`);
  danger.addColorStop(1, "rgba(127,29,29,0)");
  ctx.fillStyle = danger;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = "rgba(248,113,113,.95)";
  ctx.shadowBlur = 14 + pulse * 15;
  ctx.lineWidth = 4 + visual.chargeProgress * 3;
  ctx.strokeStyle = `rgba(248,113,113,${.68 + urgency * .3})`;
  ctx.setLineDash([18, 11]);
  ctx.lineDashOffset = -performance.now() / 35;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const innerRadius = 17 + pulse * 7;
  const core = ctx.createRadialGradient(0, 0, 1, 0, 0, innerRadius);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(.28, "#fde68a");
  core.addColorStop(.68, "#f97316");
  core.addColorStop(1, "rgba(220,38,38,.12)");
  ctx.fillStyle = core;
  ctx.shadowColor = "rgba(249,115,22,.95)";
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 28px Rajdhani, Arial";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(2,6,23,.96)";
  ctx.fillStyle = visual.countdownSeconds <= 1 ? "#fef2f2" : "#ffedd5";
  const countdown = visual.countdownSeconds > 0 ? String(visual.countdownSeconds) : "!";
  ctx.strokeText(countdown, 0, -54);
  ctx.fillText(countdown, 0, -54);
  ctx.font = "900 13px Rajdhani, Arial";
  ctx.fillStyle = "#fecaca";
  ctx.fillText("ZONE D’EXPLOSION", 0, radius + 25);
  ctx.restore();
}

function drawExplosion(ctx, x, y, visual){
  const progress = visual.explosionProgress;
  const fade = 1 - progress;
  const radius = visual.maxRadius * (.82 + progress * .55);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  flash.addColorStop(0, `rgba(255,255,255,${fade * .92})`);
  flash.addColorStop(.12, `rgba(254,240,138,${fade * .88})`);
  flash.addColorStop(.42, `rgba(249,115,22,${fade * .52})`);
  flash.addColorStop(.82, `rgba(239,68,68,${fade * .24})`);
  flash.addColorStop(1, "rgba(127,29,29,0)");
  ctx.fillStyle = flash;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(254,202,202,${fade * .95})`;
  ctx.shadowColor = "rgba(248,113,113,.95)";
  ctx.shadowBlur = 24;
  ctx.lineWidth = 12 * fade + 2;
  ctx.beginPath();
  ctx.arc(0, 0, visual.maxRadius * (.4 + progress * .72), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBossAbsorption(ctx, x, y, visual){
  const fade = 1 - visual.progress;
  const pulse = (Math.sin(performance.now() / 70) + 1) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, visual.radius * 1.35);
  glow.addColorStop(0, `rgba(220,252,231,${fade * .38})`);
  glow.addColorStop(.45, `rgba(74,222,128,${fade * .24})`);
  glow.addColorStop(1, "rgba(21,128,61,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, visual.radius * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(134,239,172,${fade * (.62 + pulse * .28)})`;
  ctx.shadowColor = "rgba(34,197,94,.95)";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 4;
  for(let index = 0; index < 3; index += 1){
    const radius = visual.radius * (.62 + index * .18 + pulse * .04);
    ctx.beginPath();
    ctx.arc(0, 0, radius, index * 1.2, index * 1.2 + Math.PI * 1.35);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBossPoisonWave(ctx, x, y, visual){
  const radius = Math.max(24, visual.radius * (.12 + visual.progress * .88));
  const fade = 1 - visual.progress;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(74,222,128,${.28 + fade * .68})`;
  ctx.shadowColor = "rgba(34,197,94,.95)";
  ctx.shadowBlur = 20;
  ctx.lineWidth = 12 * fade + 3;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  const cloud = ctx.createRadialGradient(0, 0, radius * .12, 0, 0, radius);
  cloud.addColorStop(0, `rgba(190,242,100,${fade * .18})`);
  cloud.addColorStop(.55, `rgba(34,197,94,${fade * .12})`);
  cloud.addColorStop(1, "rgba(21,128,61,0)");
  ctx.fillStyle = cloud;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBossSpectralCharge(ctx, x, y, visual){
  const pulse = (Math.sin(performance.now() / 62) + 1) / 2;
  const progress = visual.progress;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(progress * Math.PI * 2.4);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(216,180,254,${.55 + pulse * .36})`;
  ctx.shadowColor = "rgba(168,85,247,.95)";
  ctx.shadowBlur = 22;
  ctx.lineWidth = 3 + progress * 4;
  for(let index = 0; index < 3; index += 1){
    const radius = visual.radius * (1.15 - progress * .48 + index * .19);
    ctx.beginPath();
    ctx.arc(0, 0, radius, index * 1.4, index * 1.4 + Math.PI * 1.18);
    ctx.stroke();
  }
  const coreRadius = 12 + progress * 30 + pulse * 5;
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
  core.addColorStop(0, "rgba(255,255,255,.95)");
  core.addColorStop(.3, "rgba(233,213,255,.82)");
  core.addColorStop(.72, "rgba(168,85,247,.46)");
  core.addColorStop(1, "rgba(88,28,135,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBossSpectralImpact(ctx, x, y, visual){
  const fade = 1 - visual.progress;
  const radius = visual.radius * (.42 + visual.progress * 1.05);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalCompositeOperation = "lighter";
  const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  flash.addColorStop(0, `rgba(255,255,255,${fade * .92})`);
  flash.addColorStop(.22, `rgba(233,213,255,${fade * .80})`);
  flash.addColorStop(.58, `rgba(168,85,247,${fade * .50})`);
  flash.addColorStop(1, "rgba(88,28,135,0)");
  ctx.fillStyle = flash;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(216,180,254,${fade * .92})`;
  ctx.shadowColor = "rgba(192,132,252,.95)";
  ctx.shadowBlur = 24;
  ctx.lineWidth = 9 * fade + 2;
  ctx.beginPath();
  ctx.arc(0, 0, visual.radius * (.22 + visual.progress * .82), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawKharonBossEffectVisual({ctx, camera, effect, now = Date.now()}){
  const visual = getKharonBossEffectVisualState(effect, now);
  if(!visual.visible) return false;
  const x = Number(visual.x || 0) - Number(camera?.x || 0);
  const y = Number(visual.y || 0) - Number(camera?.y || 0);
  if(visual.kind === "boss_absorption") drawBossAbsorption(ctx, x, y, visual);
  else if(visual.kind === "boss_poison_wave") drawBossPoisonWave(ctx, x, y, visual);
  else if(visual.kind === "boss_spectral_charge") drawBossSpectralCharge(ctx, x, y, visual);
  else if(visual.kind === "boss_spectral_impact") drawBossSpectralImpact(ctx, x, y, visual);
  else return false;
  return true;
}

export function drawKharonHazardVisual({ctx, camera, hazard, now = Date.now()}){
  const visual = getKharonBombVisualState(hazard, now);
  if(!visual.visible) return false;
  const x = Number(visual.x || 0) - Number(camera?.x || 0);
  const y = Number(visual.y || 0) - Number(camera?.y || 0);
  const viewWidth = ctx.canvas.__renderWidth || ctx.canvas.__viewWidth || ctx.canvas.clientWidth || ctx.canvas.width;
  const viewHeight = ctx.canvas.__renderHeight || ctx.canvas.__viewHeight || ctx.canvas.clientHeight || ctx.canvas.height;
  const margin = Number(visual.maxRadius || 500) + 90;
  if(x < -margin || x > viewWidth + margin || y < -margin || y > viewHeight + margin) return true;
  if(visual.phase === "exploded"){
    drawExplosion(ctx, x, y, visual);
    return true;
  }
  if(Number.isFinite(Number(visual.fromX)) && Number.isFinite(Number(visual.fromY))){
    drawTeleportDeparture(
      ctx,
      Number(visual.fromX) - Number(camera?.x || 0),
      Number(visual.fromY) - Number(camera?.y || 0),
      visual
    );
  }
  drawTeleportArrival(ctx, x, y, visual);
  drawChargingBomb(ctx, x, y, visual);
  return true;
}

export function createKharonEncounterRenderer({ctx, getState}){
  function drawHazards(state = getState()){
    const {activePortal, portalObjective, camera} = state;
    if(!isKharonPortal(activePortal)) return;
    const objective = normalizeKharonObjective(portalObjective);
    const now = Date.now();
    for(const effect of objective.bossEffects){
      drawKharonBossEffectVisual({ctx, camera, effect, now});
    }
    for(const hazard of objective.hazards){
      drawKharonHazardVisual({ctx, camera, hazard, now});
    }
  }
  return {drawHazards};
}
