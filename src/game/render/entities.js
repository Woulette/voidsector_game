import { drawRotatedImage } from "./player.js";

const impactSpriteCache = new Map();

function colorWithAlpha(color, alpha, fallback = "rgba(255,255,255,1)"){
  if(typeof color !== "string") return fallback.replace(/,[\d.]+\)$/g, `,${alpha})`);
  if(color.startsWith("rgba(")) return color.replace(/,[\d.]+\)$/g, `,${alpha})`);
  if(color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  return color;
}

function easeOutCubic(value){
  const t = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - t, 3);
}

function drawFastProjectileTrail(ctx, bullet, angle){
  const trail = bullet.trail || [];
  if(trail.length < 2) return;
  const isMissile = bullet.kind === "missile";
  const samples = isMissile ? 5 : 6;
  const start = Math.max(1, trail.length - samples);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  for(let i = start; i < trail.length; i += 2){
    const from = trail[i - 1];
    const to = trail[i];
    const alpha = Math.max(0, Math.min(from.life, to.life) / Math.max(.001, from.max));
    ctx.strokeStyle = colorWithAlpha(bullet.color, alpha * (isMissile ? .30 : .36), isMissile ? `rgba(167,139,250,${alpha * .30})` : `rgba(96,165,250,${alpha * .36})`);
    ctx.lineWidth = Math.max(.8, (isMissile ? 2.3 : 3.1) * alpha);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  const last = trail[trail.length - 1];
  const alpha = Math.max(0, last.life / Math.max(.001, last.max));
  ctx.fillStyle = colorWithAlpha(bullet.particle || bullet.color, alpha * (isMissile ? .18 : .25), isMissile ? `rgba(125,211,252,${alpha * .18})` : `rgba(255,180,72,${alpha * .25})`);
  ctx.save();
  ctx.translate(last.x, last.y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, isMissile ? 7 : 10, isMissile ? 2.4 : 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawImpactSpark(ctx, effect, spark, progress, alpha, scale = 1){
  const travel = spark.speed * easeOutCubic(progress) * scale;
  const x = effect.x + Math.cos(spark.angle) * travel;
  const y = effect.y + Math.sin(spark.angle) * travel;
  const tail = spark.length * (1 - progress * .35) * scale;
  ctx.strokeStyle = colorWithAlpha(spark.color || effect.color, alpha * spark.alpha, "rgba(255,255,255,.8)");
  ctx.shadowColor = colorWithAlpha(spark.color || effect.color, alpha * .72, "rgba(255,255,255,.7)");
  ctx.shadowBlur = 3 * scale;
  ctx.lineWidth = Math.max(.7, spark.width * (1 - progress * .45) * scale);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(spark.angle) * tail, y - Math.sin(spark.angle) * tail);
  ctx.stroke();
}

function getImpactSprite(kind){
  const key = kind === "missile" ? "missile" : "rocket";
  if(impactSpriteCache.has(key)) return impactSpriteCache.get(key);
  const isMissile = key === "missile";
  const size = isMissile ? 192 : 136;
  const center = size / 2;
  const buffer = document.createElement("canvas");
  buffer.width = size;
  buffer.height = size;
  const bctx = buffer.getContext("2d");
  const hot = isMissile ? "rgba(248,250,252,1)" : "rgba(255,251,235,1)";
  const core = isMissile ? "rgba(125,211,252,.92)" : "rgba(251,191,36,.92)";
  const mid = isMissile ? "rgba(59,130,246,.42)" : "rgba(249,115,22,.42)";
  const edge = isMissile ? "rgba(30,64,175,0)" : "rgba(127,29,29,0)";

  const glow = bctx.createRadialGradient(center, center, 0, center, center, center * .92);
  glow.addColorStop(0, hot);
  glow.addColorStop(.16, core);
  glow.addColorStop(.48, mid);
  glow.addColorStop(1, edge);
  bctx.fillStyle = glow;
  bctx.beginPath();
  bctx.arc(center, center, center * .92, 0, Math.PI * 2);
  bctx.fill();

  bctx.globalCompositeOperation = "lighter";
  bctx.strokeStyle = isMissile ? "rgba(186,230,253,.78)" : "rgba(254,240,138,.76)";
  bctx.lineWidth = isMissile ? 5 : 4;
  bctx.beginPath();
  bctx.arc(center, center, center * .42, 0, Math.PI * 2);
  bctx.stroke();
  bctx.strokeStyle = isMissile ? "rgba(96,165,250,.42)" : "rgba(251,146,60,.42)";
  bctx.lineWidth = isMissile ? 3 : 2.5;
  bctx.beginPath();
  bctx.arc(center, center, center * .68, 0, Math.PI * 2);
  bctx.stroke();

  const sparkCount = isMissile ? 14 : 9;
  bctx.strokeStyle = isMissile ? "rgba(191,219,254,.82)" : "rgba(254,215,170,.82)";
  bctx.lineCap = "round";
  for(let i = 0; i < sparkCount; i++){
    const angle = i / sparkCount * Math.PI * 2 + (isMissile ? .08 : .16);
    const inner = center * (isMissile ? .30 : .34);
    const outer = center * (isMissile ? (.67 + (i % 3) * .06) : (.58 + (i % 2) * .07));
    bctx.lineWidth = isMissile ? (1.7 + (i % 3) * .45) : (1.4 + (i % 2) * .4);
    bctx.beginPath();
    bctx.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
    bctx.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
    bctx.stroke();
  }
  bctx.globalCompositeOperation = "source-over";
  impactSpriteCache.set(key, buffer);
  return buffer;
}

export function drawProjectiles({ctx, camera, cache, bullets}){
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for(const bullet of bullets){
    if(bullet.kind === "rocket" || bullet.kind === "missile"){
      const img = cache?.[bullet.sprite || (bullet.kind === "rocket" ? "assets/equipment/rocket_projectile.png" : "")] || null;
      const angle = bullet.angle ?? Math.atan2(bullet.y - bullet.fromY, bullet.x - bullet.fromX);
      const pulse = .75 + Math.sin(performance.now() / 55 + bullet.elapsed * 12) * .25;
      drawFastProjectileTrail(ctx, bullet, angle);
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = "lighter";
      if(bullet.kind === "missile"){
        ctx.fillStyle = colorWithAlpha(bullet.particle || bullet.color, .20 + pulse * .16, `rgba(96,165,250,${.20 + pulse * .16})`);
        ctx.shadowColor = colorWithAlpha(bullet.particle || bullet.color, .38, "rgba(96,165,250,.38)");
        ctx.shadowBlur = 4 + pulse * 3;
        ctx.beginPath();
        ctx.ellipse(-12, 0, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        if(img && img.complete) ctx.drawImage(img, -18, -6.75, 36, 13.5);
        else{
          ctx.fillStyle = "rgba(203,213,225,.95)";
          ctx.strokeStyle = "rgba(15,23,42,.86)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(3, -3.5);
          ctx.lineTo(-9, -3.2);
          ctx.lineTo(-13, 0);
          ctx.lineTo(-9, 3.2);
          ctx.lineTo(3, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = colorWithAlpha(bullet.color, .90, "rgba(56,189,248,.90)");
          ctx.beginPath();
          ctx.rect(-1, -1.5, 5, 3);
          ctx.fill();
        }
      }else{
        ctx.fillStyle = colorWithAlpha(bullet.color, .36 + pulse * .18, `rgba(255,132,24,${.36 + pulse * .18})`);
        ctx.shadowColor = colorWithAlpha(bullet.color, .42, "rgba(255,132,24,.42)");
        ctx.shadowBlur = 5 + pulse * 4;
        ctx.beginPath();
        ctx.ellipse(-17, 0, 17, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colorWithAlpha(bullet.particle || bullet.color, .42 + pulse * .22, `rgba(125,211,252,${.42 + pulse * .22})`);
        ctx.shadowColor = colorWithAlpha(bullet.particle || bullet.color, .48, "rgba(56,189,248,.48)");
        ctx.shadowBlur = 4 + pulse * 4;
        ctx.beginPath();
        ctx.ellipse(-14, 0, 7 + pulse * 2, 2.4 + pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        if(img && img.complete) ctx.drawImage(img, -20, -7.5, 40, 15);
        else{
        ctx.fillStyle = bullet.color || "rgba(248,113,22,.95)";
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-14, -6);
        ctx.lineTo(-9, 0);
        ctx.lineTo(-14, 6);
        ctx.closePath();
        ctx.fill();
        }
      }
      ctx.restore();
      continue;
    }
    ctx.fillStyle = bullet.color || "rgba(125,211,252,.95)";
    ctx.shadowColor = bullet.color || "#38bdf8";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

export function drawBeams({ctx, camera, beams}){
  if(!beams?.length) return;
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  function strokeBeam({fromX, fromY, toX, toY, color, shadowColor, alpha, width, blur}){
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = blur;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }
  function drawGlowCircle({x, y, radius, color, alpha, blur}){
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for(const beam of beams){
    const progress = Math.max(0, Math.min(1, beam.age / beam.duration));
    const fade = progress < .76 ? 1 : Math.max(0, 1 - (progress - .76) / .24);
    const dx = beam.toX - beam.fromX;
    const dy = beam.toY - beam.fromY;
    const distance = beam.distance || Math.hypot(dx, dy) || 1;
    const dirX = dx / distance;
    const dirY = dy / distance;
    const headDistance = easeOutCubic(progress) * distance;
    const tailDistance = Math.max(0, headDistance - (beam.beamLength || 160));
    const headX = beam.fromX + dirX * Math.min(distance, headDistance);
    const headY = beam.fromY + dirY * Math.min(distance, headDistance);
    const tailX = beam.fromX + dirX * tailDistance;
    const tailY = beam.fromY + dirY * tailDistance;
    strokeBeam({fromX:tailX, fromY:tailY, toX:headX, toY:headY, color:beam.glow, shadowColor:beam.glow, alpha:fade * .62, width:5.2, blur:4});
    strokeBeam({fromX:tailX, fromY:tailY, toX:headX, toY:headY, color:beam.core, shadowColor:beam.glow, alpha:fade, width:2.1, blur:1.5});

    drawGlowCircle({x:headX, y:headY, radius:4.5 + fade * 2, color:beam.glow, alpha:fade * .48, blur:4});

    if(progress < .22){
      const startAlpha = (1 - progress / .22) * .72;
      drawGlowCircle({x:beam.fromX, y:beam.fromY, radius:6 + progress * 10, color:beam.glow, alpha:startAlpha * .48, blur:4});
    }

    if(progress > .78){
      const impactProgress = Math.min(1, (progress - .78) / .22);
      const impactAlpha = (1 - impactProgress) * .9;
      drawGlowCircle({x:beam.toX, y:beam.toY, radius:5 + impactProgress * 10, color:beam.glow, alpha:impactAlpha * .55, blur:5});
    }
  }
  ctx.restore();
}

export function drawImpactEffects({ctx, camera, impactEffects}){
  if(!impactEffects?.length) return;
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for(const effect of impactEffects){
    if(effect.delay > 0) continue;
    const progress = 1 - Math.max(0, effect.life) / Math.max(.001, effect.max);
    const alpha = Math.max(0, effect.life / Math.max(.001, effect.max));
    const radius = effect.radius || 28;
    const color = effect.color || "rgba(125,211,252,.9)";
    const core = effect.core || "rgba(255,255,255,.95)";

    if(effect.kind === "laser"){
      const ring = 7 + easeOutCubic(progress) * radius;
      ctx.strokeStyle = colorWithAlpha(color, alpha * .78, "rgba(125,211,252,.78)");
      ctx.shadowColor = colorWithAlpha(color, alpha * .45, "rgba(125,211,252,.45)");
      ctx.shadowBlur = 5;
      ctx.lineWidth = 1.7 * alpha;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, ring, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = colorWithAlpha(core, alpha, "rgba(255,255,255,1)");
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 2.5 + alpha * 5, 0, Math.PI * 2);
      ctx.fill();
      for(const spark of effect.sparks || []) drawImpactSpark(ctx, effect, spark, progress, alpha, 1);
      continue;
    }

    const isMissile = effect.kind === "missile";
    const sprite = getImpactSprite(effect.kind);
    const scale = .54 + easeOutCubic(progress) * (isMissile ? .58 : .42);
    const size = radius * 2.35 * scale;
    ctx.save();
    ctx.globalAlpha = alpha * (isMissile ? 1 : .92);
    ctx.translate(effect.x, effect.y);
    ctx.rotate((effect.rotation || 0) + progress * (isMissile ? .20 : .12));
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();

    ctx.strokeStyle = colorWithAlpha(color, alpha * (isMissile ? .72 : .58), "rgba(255,180,72,.58)");
    ctx.shadowBlur = 0;
    ctx.lineWidth = (isMissile ? 2.3 : 1.8) * alpha;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 8 + easeOutCubic(progress) * radius, 0, Math.PI * 2);
    ctx.stroke();

    for(const spark of effect.sparks || []) drawImpactSpark(ctx, effect, spark, progress, alpha, isMissile ? 1.15 : .95);

    if(effect.smoke?.length){
      ctx.globalCompositeOperation = "source-over";
      for(const smoke of effect.smoke || []){
        const drift = smoke.speed * progress;
        const sx = effect.x + Math.cos(smoke.angle) * drift;
        const sy = effect.y + Math.sin(smoke.angle) * drift;
        ctx.fillStyle = `rgba(100,116,139,${alpha * smoke.alpha})`;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(sx, sy, smoke.size * (.55 + progress), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "lighter";
    }
  }
  ctx.restore();
}

export function drawParticles({ctx, camera, particles, repairLayer = false}){
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for(const particle of particles){
    const isRepairPlus = particle.kind === "repairPlus";
    if(repairLayer !== isRepairPlus) continue;
    const alpha = Math.max(0, particle.life / particle.max);
    const color = particle.color?.replace ? particle.color.replace(/,[\d.]+\)$/g, `,${alpha})`) : `rgba(125,211,252,${alpha})`;
    ctx.fillStyle = color;
    if(particle.kind === "engine"){
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle || 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1.2, particle.size * .55 * alpha), Math.max(2.4, particle.size * 1.8 * alpha), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }else if(particle.kind === "repairPlus"){
      const size = Math.max(4, particle.size * (.55 + alpha * .45));
      const arm = size * .38;
      const thick = Math.max(2, size * .16);
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.angle || 0) + (particle.spin || 0) * (1 - alpha));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(20,255,70,1)";
      ctx.shadowBlur = 13 * alpha;
      ctx.fillRect(-thick / 2, -arm, thick, arm * 2);
      ctx.fillRect(-arm, -thick / 2, arm * 2, thick);
      ctx.restore();
    }else{
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSelectedEnemyOverlay({ctx, enemy, sx, sy}){
  sx = Math.round(sx);
  sy = Math.round(sy);
  ctx.save();
  ctx.strokeStyle = "rgba(86,255,79,.9)";
  ctx.shadowColor = "#56ff4f";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, enemy.radius + 12 + Math.sin(performance.now() / 120) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEnemyStatusBars({ctx, enemy, sx, sy}){
  sx = Math.round(sx);
  sy = Math.round(sy);
  const maxShield = Number(enemy.maxShield || 0);
  const shield = Math.max(0, Number(enemy.shield ?? maxShield));
  const hasShield = maxShield > 0;
  const barWidth = hasShield ? 78 : 64;
  const barX = sx - barWidth / 2;
  const spriteTop = sy - Number(enemy.height || enemy.radius * 2 || 72) / 2;
  const topY = spriteTop - (hasShield ? 24 : 17);
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(239,68,68,.25)";
  ctx.fillRect(barX, topY, barWidth, 5);
  ctx.fillStyle = "rgba(239,68,68,.9)";
  ctx.fillRect(barX, topY, barWidth * Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)), 5);
  if(hasShield){
    ctx.fillStyle = "rgba(14,116,144,.36)";
    ctx.fillRect(barX, topY + 7, barWidth, 5);
    ctx.fillStyle = "rgba(56,189,248,.98)";
    ctx.shadowColor = "rgba(56,189,248,.62)";
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, topY + 7, barWidth * Math.max(0, Math.min(1, shield / maxShield)), 5);
  }
  ctx.fillStyle = "#fecaca";
  ctx.shadowBlur = 0;
  ctx.font = "700 11px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.fillText(`NIV ${enemy.level}`, sx, topY - 5);
  ctx.restore();
}

export function drawEnemies({ctx, camera, cache, enemies, selectedEnemy}){
  const time = performance.now();
  for(const enemy of enemies){
    const isPaused = Number(enemy.wanderPauseT || 0) > 0 && !enemy.aggro;
    const idlePhase = time / 420 + enemy.id * 1.37;
    const idleY = isPaused ? Math.sin(idlePhase) * 4 : 0;
    const idleX = isPaused ? Math.cos(idlePhase * .72) * 2 : 0;
    const idleAngle = isPaused ? Math.sin(idlePhase * .85) * .08 : 0;
    drawRotatedImage({
      ctx,
      camera,
      img:cache[enemy.img] || cache["assets/ships/intercepteur.png"],
      x:enemy.x + idleX,
      y:enemy.y + idleY,
      w:enemy.width || 72,
      h:enemy.height || 72,
      angle:enemy.angle + idleAngle
    });
    const isSelected = selectedEnemy && selectedEnemy.id === enemy.id;
    if(isSelected || Number(enemy.recentHitTimer || 0) > 0){
      drawEnemyStatusBars({
        ctx,
        enemy,
        sx:enemy.x + idleX - camera.x,
        sy:enemy.y + idleY - camera.y
      });
    }
    if(isSelected){
      drawSelectedEnemyOverlay({
        ctx,
        enemy,
        sx:enemy.x + idleX - camera.x,
        sy:enemy.y + idleY - camera.y
      });
    }
  }
}

export function drawCargoBoxes({ctx, camera, cache, cargoBoxes}){
  const boxImg = cache["assets/materials/cargo_box.svg"];
  const time = performance.now() / 260;
  for(const box of cargoBoxes){
    const sx = Math.round(box.x - camera.x);
    const sy = Math.round(box.y - camera.y + Math.sin(time + box.id * 0.7) * 3);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(34,197,94,.62)";
    ctx.shadowColor = "rgba(34,197,94,.72)";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 34 + Math.sin(time) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    if(boxImg && boxImg.complete) ctx.drawImage(boxImg, -24, -24, 48, 48);
    else{
      ctx.fillStyle = "rgba(34,197,94,.7)";
      ctx.fillRect(-18, -18, 36, 36);
    }
    ctx.fillStyle = "#bbf7d0";
    ctx.font = "800 11px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillText("CARGO", 0, 38);
    ctx.restore();
  }
}

export function drawGroundMaterials({ctx, camera, cache, materials}){
  const time = performance.now() / 420;
  for(const node of materials || []){
    const img = cache[node.img];
    const sx = Math.round(node.x - camera.x);
    const sy = Math.round(node.y - camera.y + Math.sin(time + node.phase) * 2);
    const size = node.size || 42;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalCompositeOperation = "lighter";
    const glowSize = size * (.72 + Math.sin(time + node.phase) * .04);
    const glow = ctx.createRadialGradient(0, 0, size * .12, 0, 0, glowSize);
    glow.addColorStop(0, node.glowCore || node.glow || "rgba(125,211,252,.32)");
    glow.addColorStop(.48, node.glow || "rgba(125,211,252,.18)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowBlur = 0;
    if(img && img.complete) ctx.drawImage(img, -size / 2, -size / 2, size, size);
    else{
      ctx.fillStyle = node.fallback || "rgba(125,211,252,.72)";
      ctx.beginPath();
      ctx.arc(0, 0, size * .28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
