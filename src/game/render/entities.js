import { drawRotatedImage } from "./player.js";

function colorWithAlpha(color, alpha, fallback = "rgba(255,255,255,1)"){
  if(typeof color !== "string") return fallback.replace(/,[\d.]+\)$/g, `,${alpha})`);
  if(color.startsWith("rgba(")) return color.replace(/,[\d.]+\)$/g, `,${alpha})`);
  if(color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  return color;
}

export function drawProjectiles({ctx, camera, cache, bullets}){
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for(const bullet of bullets){
    if(bullet.kind === "rocket" || bullet.kind === "missile"){
      const img = cache?.[bullet.sprite || (bullet.kind === "rocket" ? "assets/equipment/rocket_projectile.png" : "")] || null;
      const angle = bullet.angle ?? Math.atan2(bullet.y - bullet.fromY, bullet.x - bullet.fromX);
      const pulse = .75 + Math.sin(performance.now() / 55 + bullet.elapsed * 12) * .25;
      if(bullet.trail?.length){
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        if(bullet.trail.length > 1){
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          for(let i = 1; i < bullet.trail.length; i++){
            const from = bullet.trail[i - 1];
            const to = bullet.trail[i];
            const alpha = Math.max(0, Math.min(from.life, to.life) / from.max);
            ctx.strokeStyle = colorWithAlpha(bullet.color, alpha * (bullet.kind === "missile" ? .30 : .34), bullet.kind === "missile" ? `rgba(167,139,250,${alpha * .30})` : `rgba(96,165,250,${alpha * .34})`);
            ctx.shadowColor = colorWithAlpha(bullet.color, bullet.kind === "missile" ? .38 : .42, bullet.kind === "missile" ? "rgba(129,140,248,.38)" : "rgba(56,189,248,.42)");
            ctx.shadowBlur = bullet.kind === "missile" ? 5 : 7;
            ctx.lineWidth = (bullet.kind === "missile" ? 1.8 : 2.6) * alpha;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            ctx.strokeStyle = colorWithAlpha(bullet.particle || bullet.color, alpha * (bullet.kind === "missile" ? .18 : .24), bullet.kind === "missile" ? `rgba(125,211,252,${alpha * .18})` : `rgba(255,180,72,${alpha * .20})`);
            ctx.shadowColor = colorWithAlpha(bullet.particle || bullet.color, bullet.kind === "missile" ? .28 : .38, bullet.kind === "missile" ? "rgba(56,189,248,.28)" : "rgba(255,132,24,.36)");
            ctx.shadowBlur = 5;
            ctx.lineWidth = 1.2 * alpha;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
          }
        }
        for(let i = 0; i < bullet.trail.length; i++){
          const point = bullet.trail[i];
          const alpha = Math.max(0, point.life / point.max);
          const scale = 1 - i / Math.max(1, bullet.trail.length);
          ctx.fillStyle = colorWithAlpha(bullet.color, alpha * (bullet.kind === "missile" ? .07 : .10), bullet.kind === "missile" ? `rgba(148,163,184,${alpha * .07})` : `rgba(146,163,178,${alpha * .10})`);
          ctx.shadowColor = colorWithAlpha(bullet.color, bullet.kind === "missile" ? .14 : .20, bullet.kind === "missile" ? "rgba(129,140,248,.14)" : "rgba(125,211,252,.20)");
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.ellipse(point.x, point.y, bullet.kind === "missile" ? 5 + scale * 3 : 8 + scale * 4, bullet.kind === "missile" ? 2 + scale : 3.2 + scale * 1.5, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = "lighter";
      if(bullet.kind === "missile"){
        ctx.fillStyle = colorWithAlpha(bullet.particle || bullet.color, .20 + pulse * .16, `rgba(96,165,250,${.20 + pulse * .16})`);
        ctx.shadowColor = colorWithAlpha(bullet.particle || bullet.color, .62, "rgba(96,165,250,.62)");
        ctx.shadowBlur = 8 + pulse * 6;
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
        ctx.shadowColor = colorWithAlpha(bullet.color, .72, "rgba(255,132,24,.72)");
        ctx.shadowBlur = 10 + pulse * 8;
        ctx.beginPath();
        ctx.ellipse(-17, 0, 17, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colorWithAlpha(bullet.particle || bullet.color, .42 + pulse * .22, `rgba(125,211,252,${.42 + pulse * .22})`);
        ctx.shadowColor = colorWithAlpha(bullet.particle || bullet.color, .85, "rgba(56,189,248,.85)");
        ctx.shadowBlur = 8 + pulse * 8;
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
  const easeOutCubic = value=>1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3);
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
    const sideX = -dirY;
    const sideY = dirX;

    strokeBeam({fromX:tailX, fromY:tailY, toX:headX, toY:headY, color:beam.flare, shadowColor:beam.glow, alpha:fade * .46, width:8, blur:13});
    strokeBeam({fromX:tailX, fromY:tailY, toX:headX, toY:headY, color:beam.glow, shadowColor:beam.glow, alpha:fade * .78, width:3.8, blur:8});
    strokeBeam({fromX:tailX, fromY:tailY, toX:headX, toY:headY, color:beam.core, shadowColor:beam.glow, alpha:fade, width:2.2, blur:3});

    for(const offset of [-4.5, 4.5]){
      const sideFade = fade * .22;
      strokeBeam({fromX:tailX + sideX * offset, fromY:tailY + sideY * offset, toX:headX + sideX * offset * .45, toY:headY + sideY * offset * .45, color:beam.glow, shadowColor:beam.glow, alpha:sideFade, width:.8, blur:3});
    }

    drawGlowCircle({x:headX, y:headY, radius:5 + fade * 3, color:beam.glow, alpha:fade * .64, blur:11});
    drawGlowCircle({x:headX, y:headY, radius:2.2 + fade * 1.4, color:beam.core, alpha:fade, blur:5});

    if(progress < .22){
      const startAlpha = (1 - progress / .22) * .72;
      drawGlowCircle({x:beam.fromX, y:beam.fromY, radius:7 + progress * 14, color:beam.glow, alpha:startAlpha * .75, blur:12});
      drawGlowCircle({x:beam.fromX, y:beam.fromY, radius:2.8 + progress * 5, color:beam.core, alpha:startAlpha, blur:5});
    }

    if(progress > .78){
      const impactProgress = Math.min(1, (progress - .78) / .22);
      const impactAlpha = (1 - impactProgress) * .9;
      drawGlowCircle({x:beam.toX, y:beam.toY, radius:6 + impactProgress * 13, color:beam.glow, alpha:impactAlpha * .78, blur:14});
      drawGlowCircle({x:beam.toX, y:beam.toY, radius:2.4 + impactProgress * 4.5, color:beam.core, alpha:impactAlpha, blur:5});
    }
  }
  ctx.restore();
}

export function drawParticles({ctx, camera, particles}){
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for(const particle of particles){
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
