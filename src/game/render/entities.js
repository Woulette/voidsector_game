import { drawRotatedImage } from "./player.js";

export function drawProjectiles({ctx, camera, bullets}){
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for(const bullet of bullets){
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

  ctx.save();
  ctx.fillStyle = "rgba(239,68,68,.25)";
  ctx.fillRect(sx - 32, sy - 45, 64, 5);
  ctx.fillStyle = "rgba(239,68,68,.9)";
  ctx.fillRect(sx - 32, sy - 45, 64 * Math.max(0, enemy.hp / enemy.maxHp), 5);
  ctx.fillStyle = "#fecaca";
  ctx.font = "700 11px Rajdhani, Arial";
  ctx.textAlign = "center";
  ctx.fillText(`NIV ${enemy.level}`, sx, sy - 50);
  ctx.restore();
}

export function drawEnemies({ctx, camera, cache, enemies, selectedEnemy}){
  for(const enemy of enemies){
    drawRotatedImage({
      ctx,
      camera,
      img:cache[enemy.img] || cache["assets/ships/intercepteur.png"],
      x:enemy.x,
      y:enemy.y,
      w:enemy.width || 72,
      h:enemy.height || 72,
      angle:enemy.angle
    });
    const isSelected = selectedEnemy && selectedEnemy.id === enemy.id;
    if(isSelected){
      drawSelectedEnemyOverlay({
        ctx,
        enemy,
        sx:enemy.x - camera.x,
        sy:enemy.y - camera.y
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
