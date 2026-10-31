import { alpha, clamp, glow, line, shard, sprite } from "./vfxPrimitives.js";
import { getEnemyLifeTheme } from "./enemyLife.js";

export function drawCreatureProjectile(ctx, shot, point, angle, time){
  const palette = getEnemyLifeTheme(shot.enemyKind);
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

export function drawWeaponProjectile({ctx, bullet, time, image, showTrails = true}){
  if(bullet.enemyKind || bullet.owner === "enemy" || bullet.owner === "serverEnemy"){
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawCreatureProjectile(ctx, {enemyKind:bullet.enemyKind}, bullet, bullet.angle || 0, time);
    ctx.restore();
    return true;
  }
  if(!["rocket", "missile"].includes(bullet.kind) || !image?.complete) return false;
  const color = bullet.color || "rgba(251,146,60,1)";
  const core = "rgba(255,250,232,1)";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if(showTrails){
    const trail = bullet.trail || [];
    for(let i = 1; i < trail.length; i++){
      const a = trail[i - 1], b = trail[i];
      const fade = clamp(b.life / (b.max || .34));
      line(ctx, [[a.x, a.y], [b.x, b.y]], color, 1 + fade * 1.5, fade * .48);
      if(bullet.kind === "rocket" && i % 2){
        glow(ctx, a.x, a.y, 3 + (1 - fade) * 8, "rgba(128,145,160,1)", fade * .16);
      }
    }
  }
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(bullet.angle || 0);
  const flame = 14 + Math.sin(time * 67 + Number(bullet.slotIndex || 0)) * 3;
  glow(ctx, -15, 0, 16, color, .65);
  line(ctx, [[-12, 0], [-12 - flame, Math.sin(time * 35) * 1.3]], color, 3.3, .65);
  line(ctx, [[-12, 0], [-17 - flame * .45, 0]], core, 1.3);
  ctx.globalCompositeOperation = "source-over";
  sprite(ctx, image, 0, 0, bullet.kind === "missile" ? 34 : 40, bullet.kind === "missile" ? 12 : 14);
  ctx.restore();
  return true;
}

export function drawMonochromeBeam(ctx, beam){
  if(!beam.monochrome) return false;
  if(beam.age < 0 || beam.age >= beam.duration) return true;
  const progress = clamp(beam.age / beam.duration);
  const dx = beam.toX - beam.fromX, dy = beam.toY - beam.fromY;
  const distance = Math.hypot(dx, dy) || 1;
  const head = distance * progress;
  const length = Math.min(88, head), tail = head - length;
  const fade = Math.min(1, progress / .1) * Math.min(1, (1 - progress) / .13);
  ctx.save();
  ctx.translate(beam.fromX + dx / distance * tail, beam.fromY + dy / distance * tail);
  ctx.rotate(Math.atan2(dy, dx));
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha *= fade;
  // Selected variant B: two short white filaments on black channels.
  // Normal compositing keeps the black visible over the scene and other lasers.
  const points = Array.from({length:15}, (_,i)=>{
    const p = i / 14;
    return [length * p, Math.sin(p * Math.PI * 2.2 + Number(beam.passIndex || 0) * .8) * Math.sin(p * Math.PI) * 4.5];
  });
  for(const side of [-1, 1]){
    const strand = points.map(([x,y])=>[x,y * side]);
    line(ctx, strand, "rgba(0,0,0,.96)", 4.2);
    line(ctx, strand, "rgba(255,255,255,.98)", 1.35);
  }
  glow(ctx, length, 0, 4.5, "rgba(255,255,255,1)", .75);
  ctx.restore();
  if(progress < .3) glow(ctx, beam.fromX, beam.fromY, 7, "rgba(255,255,255,1)", (1 - progress / .3) * .4);
  return true;
}

export function drawSlowBomb(ctx, effect){
  const progress = clamp(1 - effect.life / effect.max);
  const radius = Math.max(1, Number(effect.radius || 100));
  const fade = (1 - progress) ** 1.5;
  const ring = radius * Math.min(1, progress / .52);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glow(ctx, effect.x, effect.y, Math.max(2, ring), "rgba(62,170,255,1)", fade * .2);
  ctx.strokeStyle = `rgba(132,220,255,${fade * .8})`;
  ctx.lineWidth = 1 + fade * 2;
  ctx.beginPath(); ctx.arc(effect.x, effect.y, ring, 0, Math.PI * 2); ctx.stroke();
  for(let i = 0; i < 10; i++){
    const a = i * Math.PI / 5;
    const r = ring * (.78 + i % 3 * .06);
    shard(ctx, effect.x + Math.cos(a) * r, effect.y + Math.sin(a) * r, 3 * fade, a, `rgba(208,245,255,${fade})`);
  }
  ctx.restore();
}

