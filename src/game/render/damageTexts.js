import { DAMAGE_FEEDBACK_SPEC as SPEC } from "../combatData/damageFeedback.js";

const DETAIL_LIMIT = 8;

function metallicFill(ctx, x, y, size){
  if(typeof ctx.createLinearGradient !== "function") return null;
  const gradient = ctx.createLinearGradient(x, y - size * .45, x, y + size * .4);
  for(const [offset, color] of SPEC.metallicDamage){
    gradient.addColorStop(offset, color);
  }
  return gradient;
}

export function formatCombatDamageText(value){
  if(typeof value === "number" || /^-?\d+$/.test(String(value))){
    const amount = Math.abs(Math.round(Number(value)));
    return `-${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
  }
  return String(value);
}

function drawAuxiliaryText(ctx, camera, text, detailed, remaining){
  const progress = 1 - remaining;
  const levelUp = text.kind === "levelUp";
  const pop = Math.sin(Math.min(1, progress / .28) * Math.PI);
  const grow = 1 - Math.pow(1 - progress, 2.2);
  const fade = Math.min(1, remaining * 1.65);
  const size = levelUp ? 28 + grow * 9 + pop * 5 : 16 + grow * 8 + pop * 4;
  const jitter = levelUp ? 0 : Math.sin(progress * Math.PI * 8 + (text.wobble || 0)) * (1 - progress) * 1.2;
  const x = text.x - camera.x + jitter, y = text.y - camera.y;
  ctx.font = `900 ${size}px Rajdhani, Arial`;
  ctx.shadowColor = text.shadowColor || "rgba(96,165,250,.82)";
  ctx.shadowBlur = levelUp ? 22 + pop * 18 : detailed ? 11 + pop * 22 + grow * 6 : 7;
  ctx.strokeStyle = levelUp ? `rgba(1,8,18,${fade})` : `rgba(22,2,5,${fade})`;
  ctx.lineWidth = levelUp ? 5.5 : detailed ? 3.5 + pop * 1.5 : 3;
  ctx.strokeText(String(text.value), x, y);
  ctx.fillStyle = `${text.color || "rgba(255,255,255,"}${fade})`;
  ctx.fillText(String(text.value), x, y);
  if(levelUp || detailed){
    ctx.shadowBlur = 0;
    ctx.globalAlpha = fade * (levelUp ? .72 : .22 + grow * .18);
    ctx.strokeStyle = levelUp ? `rgba(125,211,252,${fade * .78})` : text.shadowColor || "rgba(255,112,67,.72)";
    ctx.lineWidth = levelUp ? 1.6 : 1.4;
    ctx.strokeText(String(text.value), x, y + (levelUp ? 1 : 0));
    ctx.globalAlpha = 1;
  }
}

export function drawDamageTexts({ctx, camera, damageTexts}){
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const detailed = damageTexts.length <= DETAIL_LIMIT;
  for(const text of damageTexts){
    if(text.life <= 0) continue;
    const remaining = Math.max(0, Math.min(1, text.life / (text.max || SPEC.textLife)));
    const progress = 1 - remaining;
    const label = formatCombatDamageText(text.value);
    const isMiss = label === "MISS";
    const damage = text.kind === "damage" || typeof text.value === "number" || /^-?\d+$/.test(String(text.value)) || isMiss;
    if(!damage){
      drawAuxiliaryText(ctx, camera, text, detailed, remaining);
      continue;
    }
    const age = progress * (text.max || SPEC.textLife);
    const pop = Math.sin(Math.min(1, age / .12) * Math.PI);
    const fade = Math.min(1, remaining / .32);
    const size = (isMiss ? 16 : SPEC.fontSize) + pop * SPEC.fontPop;
    const incoming = text.direction === "incoming";
    const color = incoming ? SPEC.incoming : SPEC.outgoing;
    const x = text.x - camera.x, y = text.y - camera.y;
    ctx.font = `800 ${size}px Rajdhani, Arial`;
    ctx.strokeStyle = `rgba(2,6,14,${fade * .96})`;
    ctx.lineWidth = isMiss ? 2 : SPEC.outlineWidth;
    // Stroke without bloom keeps the outline crisp on bright and dark scenery.
    ctx.shadowBlur = 0;
    ctx.strokeText(label, x, y);
    const metal = isMiss ? null : metallicFill(ctx, x, y, size);
    ctx.fillStyle = metal || `${color}${fade})`;
    ctx.globalAlpha = metal ? fade : 1;
    ctx.shadowColor = incoming ? SPEC.incomingGlow : SPEC.outgoingGlow;
    ctx.shadowBlur = detailed ? 1.5 + pop * .5 : 0;
    ctx.fillText(label, x, y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
