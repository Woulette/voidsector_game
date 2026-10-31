import { getEnemyLifeTheme } from "../../src/game/render/enemyLife.js";
import { drawMonochromeBeam } from "../../src/game/render/weaponVfx.js";
import { createEnemyImpactEffect } from "../../src/game/systems/combatEnemyImpacts.js";
import { drawEnemyWeaponImpact } from "../../src/game/render/enemyWeaponImpact.js";
import { alpha, clamp, glow, line, shard, sprite } from "./drawing.js";

export const creaturePalettes = {
  drone_pirate:{color:"rgba(55,156,255,1)", core:"rgba(211,237,255,1)", form:"orb"},
  raider_astral:{color:"rgba(239,61,76,1)", core:"rgba(255,217,209,1)", form:"pulse"},
  chasseur_spectral:{color:"rgba(143,222,35,1)", core:"rgba(229,255,136,1)", form:"toxin"},
  cuirasse_nebulaire:{color:"rgba(91,179,255,1)", core:"rgba(221,245,255,1)", form:"electric"},
  cuirasse_ambre:{color:"rgba(255,171,47,1)", core:"rgba(255,246,192,1)", form:"heavy"},
  eclanite:{color:"rgba(190,128,255,1)", core:"rgba(249,227,255,1)", form:"crystal"}
};

export function shotPoint(shot, progress){
  const p = clamp(progress);
  const dx = shot.toX - shot.fromX, dy = shot.toY - shot.fromY;
  const distance = Math.hypot(dx, dy) || 1;
  const curve = (shot.curve || 0) * Math.sin(Math.PI * p) * (1 - p * .18);
  return {x:shot.fromX + dx * p - dy / distance * curve, y:shot.fromY + dy * p + dx / distance * curve};
}

function drawMonochromeImpact(ctx, shot, surface){
  const p = clamp((shot.age - shot.duration) / .25);
  if(shot.age < shot.duration || p >= 1) return;
  const fade = (1 - p) ** 2;
  const x = shot.toX, y = shot.toY;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  glow(ctx, x, y, 12 + p * 20, "rgba(255,255,255,1)", fade * .4);
  ctx.lineWidth = 4 * fade + .6;
  ctx.strokeStyle = `rgba(255,255,255,${fade})`;
  ctx.beginPath();
  if(surface === "shield"){
    const center = shot.targetCenter;
    const a = Math.atan2(y - center.y, x - center.x);
    ctx.arc(center.x, center.y, 43 + p * 3, a - .2 - p * .55, a + .2 + p * .55);
  }else ctx.arc(x, y, 3 + p * 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(0,0,0,${fade})`;
  ctx.lineWidth = 1.8 * fade;
  ctx.stroke();
  for(let i = 0; i < 6; i++){
    const a = i * Math.PI / 3 + shot.seed * .4;
    const d = p * (16 + i % 3 * 7);
    const point = [x + Math.cos(a) * d, y + Math.sin(a) * d];
    const end = [point[0] + Math.cos(a) * 5 * fade, point[1] + Math.sin(a) * 5 * fade];
    line(ctx, [point, end], `rgba(255,255,255,${fade})`, 2.3);
    line(ctx, [point, end], `rgba(0,0,0,${fade})`, .8);
  }
  ctx.fillStyle = `rgba(0,0,0,${fade})`;
  ctx.beginPath();
  ctx.arc(x, y, 2 + fade * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawNewImpact(ctx, shot, surface){
  if(!shot.enemyKind){
    const effect = createEnemyImpactEffect({target:{...shot.targetCenter, width:82, height:82, radius:13},
      fromX:shot.fromX, fromY:shot.fromY, shield:surface === "shield" ? 100 : 0,
      color:shot.particle || shot.color, monochrome:shot.monochrome});
    if(effect){effect.life -= shot.age - shot.duration; drawEnemyWeaponImpact(ctx,effect);}
    return;
  }
  if(shot.monochrome){drawMonochromeImpact(ctx, shot, surface); return;}
  const progress = clamp((shot.age - shot.duration) / .46);
  if(shot.age < shot.duration || progress >= 1) return;
  const palette = shot.enemyKind ? (creaturePalettes[shot.enemyKind] || getEnemyLifeTheme(shot.enemyKind)) : null;
  const color = palette?.color || shot.palette?.glow || shot.color;
  const core = palette?.core || shot.palette?.core || "rgba(255,247,221,1)";
  const x = shot.toX, y = shot.toY;
  const fade = (1 - progress) ** 2;
  const explosive = shot.kind === "rocket" || shot.kind === "missile" || palette?.form === "heavy";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, x, y, 12 + progress * (explosive ? 46 : 24), color, fade);
  if(surface === "shield"){
    const center = shot.targetCenter || {x:x + 42, y};
    ctx.strokeStyle = alpha(color, fade * .82);
    ctx.lineWidth = 1.2 + fade * 1.2;
    ctx.beginPath();
    const a = Math.atan2(y - center.y, x - center.x);
    ctx.arc(center.x, center.y, 43 + progress * 6, a - .2 - progress * 1.15, a + .2 + progress * 1.15);
    ctx.stroke();
    ctx.strokeStyle = alpha(core, fade * .55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 3 + progress * 22, 0, Math.PI * 2);
    ctx.stroke();
  }else if(explosive){
    for(let i = 0; i < 5; i++){
      const a = i * 2.399;
      const radius = (8 + progress * 25) * (.65 + i * .07);
      glow(ctx, x + Math.cos(a) * progress * 20, y + Math.sin(a) * progress * 20, radius, i % 2 ? color : "rgba(255,136,37,1)", fade * .65);
    }
    ctx.strokeStyle = alpha(color, fade * .52);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(x, y, 6 + progress * 43, 0, Math.PI * 2);
    ctx.stroke();
  }
  const count = surface === "shield" ? 5 : explosive ? 12 : 8;
  for(let i = 0; i < count; i++){
    const a = i * 2.399 + shot.seed * .61;
    const distance = progress * (18 + (i % 4) * 12);
    const px = x + Math.cos(a) * distance, py = y + Math.sin(a) * distance;
    if(palette?.form === "crystal") shard(ctx, px, py, 2.5 * fade, a + progress * 4, alpha(core, fade));
    else line(ctx, [[px, py], [px + Math.cos(a) * 5 * fade, py + Math.sin(a) * 5 * fade]], i % 3 ? alpha(color, fade) : alpha(core, fade), surface === "shield" ? 1 : 1.5);
  }
  glow(ctx, x, y, 7 * fade + 1, core, fade);
  ctx.restore();
}

function drawCreatureProjectile(ctx, shot, point, angle, time){
  const palette = shot.enemyKind ? (creaturePalettes[shot.enemyKind] || getEnemyLifeTheme(shot.enemyKind)) : null;
  const {color, core, form} = palette;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  glow(ctx, 0, 0, form === "heavy" ? 23 : 17, color, .75);
  if(form === "orb"){
    const fill = ctx.createRadialGradient(-2, -2, .4, 0, 0, 6.5);
    fill.addColorStop(0, core);
    fill.addColorStop(.4, "rgba(107,193,255,1)");
    fill.addColorStop(1, "rgba(27,104,224,.9)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }else if(form === "pulse"){
    for(const side of [-3.4, 3.4]){
      line(ctx, [[-6, side], [5, side]], alpha(color, .7), 4);
      line(ctx, [[-6, side], [5, side]], core, 1.2);
    }
  }else if(form === "toxin"){
    ctx.fillStyle = alpha(color, .75);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 + Math.sin(time * 24) * 1.5, 6, Math.sin(time * 12) * .3, 0, Math.PI * 2);
    ctx.fill();
    for(let i = 0; i < 3; i++){
      const points = Array.from({length:8}, (_, n)=>[-n * 4, Math.sin(time * 18 - n * .6 + i * 2) * n * .65]);
      line(ctx, points, alpha(color, .4), 1.2);
    }
    glow(ctx, 2, -1, 4, core, .65);
  }else if(form === "electric"){
    const points = Array.from({length:9}, (_, i)=>[-32 + i * 4.5, i === 0 || i === 8 ? 0 : Math.sin(Math.floor(time * 28) + i * 7) * 5]);
    line(ctx, points, color, 3, .6);
    line(ctx, points, core, 1);
    shard(ctx, 3, 0, 9, 0, core);
  }else if(form === "heavy"){
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-3, 0, 4, 11, time * 7, 0, Math.PI * 2);
    ctx.stroke();
    glow(ctx, 3, 0, 6, core);
  }else{
    shard(ctx, 0, 0, 13, time * 12, color);
    shard(ctx, 0, 0, 7, time * 12, core);
    for(let i = 1; i <= 3; i++) shard(ctx, -i * 10, Math.sin(time * 17 + i) * 4, 4 - i * .7, -time * 10, alpha(color, .7 - i * .15));
  }
  ctx.restore();
}

export function drawNewShot(ctx, shot, time, images, surface){
  if(shot.age < 0 || shot.age > shot.duration + (surface === "hull" ? .65 : .46)) return;
  drawNewImpact(ctx, shot, surface);
  if(shot.age >= shot.duration) return;
  const progress = clamp(shot.age / shot.duration);
  const point = shotPoint(shot, progress);
  const previous = shotPoint(shot, Math.max(0, progress - .015));
  const angle = Math.atan2(point.y - previous.y, point.x - previous.x);
  const color = (shot.enemyKind ? (creaturePalettes[shot.enemyKind] || getEnemyLifeTheme(shot.enemyKind)).color : null) || shot.palette?.glow || shot.color;
  const core = shot.palette?.core || "rgba(255,250,232,1)";
  ctx.save();
  if(shot.monochrome){
    drawMonochromeBeam(ctx, shot);
    ctx.restore();
    return;
  }
  ctx.globalCompositeOperation = "lighter";
  if(shot.age < .11) glow(ctx, shot.fromX, shot.fromY, 16 * (1 - shot.age / .11), color, .9);
  if(shot.enemyKind){
    drawCreatureProjectile(ctx, shot, point, angle, time);
  }else if(shot.kind === "laser"){
    const length = Math.min(82, Math.hypot(point.x - shot.fromX, point.y - shot.fromY));
    const tail = [point.x - Math.cos(angle) * length, point.y - Math.sin(angle) * length];
    line(ctx, [tail, [point.x, point.y]], color, 7, .16);
    line(ctx, [tail, [point.x, point.y]], color, 3.4, .85);
    line(ctx, [tail, [point.x, point.y]], core, 1.25);
    glow(ctx, point.x, point.y, 9, color, .85);
  }else{
    for(let i = 10; i >= 1; i--){
      const age = shot.age - i * .025;
      if(age < 0) continue;
      const a = shotPoint(shot, age / shot.duration);
      const b = shotPoint(shot, Math.min(shot.age, age + .03) / shot.duration);
      const fade = 1 - i / 11;
      line(ctx, [[a.x, a.y], [b.x, b.y]], color, 1 + fade * 1.5, fade * .5);
      if(shot.kind === "rocket"){
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(128,145,160,${fade * .15})`;
        ctx.beginPath();
        ctx.arc(a.x + Math.sin(i * 6 + shot.seed) * i * .3, a.y, 2 + i * .7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    const flame = 14 + Math.sin(time * 67 + shot.seed) * 3;
    glow(ctx, -15, 0, 16, color, .8);
    line(ctx, [[-12, 0], [-12 - flame, Math.sin(time * 35) * 1.3]], color, 3.3, .65);
    line(ctx, [[-12, 0], [-17 - flame * .45, 0]], core, 1.3);
    ctx.globalCompositeOperation = "source-over";
    sprite(ctx, images[shot.sprite], 0, 0, shot.kind === "missile" ? 34 : 40, shot.kind === "missile" ? 12 : 14);
    ctx.restore();
  }
  ctx.restore();
}
