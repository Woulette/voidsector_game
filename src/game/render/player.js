export function drawRotatedImage({ctx, camera, img, x, y, w, h, angle, fallbackColor = "#38bdf8"}){
  ctx.save();
  ctx.translate(Math.round(x - camera.x), Math.round(y - camera.y));
  ctx.rotate(angle);
  if(img && img.complete){
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  }else{
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(0, h / 3);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function getEngineProfile({ship, defaultProfile, profiles}){
  const profile = profiles[ship.id] || defaultProfile;
  return {
    ...defaultProfile,
    ...profile,
    colors:{...defaultProfile.colors, ...(profile.colors || {})},
    ports:profile.ports || defaultProfile.ports
  };
}

function engineRgba(rgb, alpha){
  return `rgba(${rgb},${Math.max(0, Math.min(1, alpha))})`;
}

function localToWorld(player, x, y, angle = player.angle){
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x:player.x + x * cos - y * sin,
    y:player.y + x * sin + y * cos
  };
}

export function spawnPlayerEngineParticles({dt, player, ship, particles, defaultProfile, profiles}){
  if(!player) return;
  const power = Math.max(0, Math.min(1, player.enginePower || 0));
  if(power <= 0.05){
    player.engineParticleT = 0;
    return;
  }

  const profile = getEngineProfile({ship, defaultProfile, profiles});
  const layout = profile.ports;
  const colors = profile.colors;
  const angle = player.angle;
  const backX = -Math.sin(angle);
  const backY = Math.cos(angle);
  const sideX = Math.cos(angle);
  const sideY = Math.sin(angle);
  const rate = (10 + power * 22) * (profile.particleRate || 1);
  player.engineParticleT = (player.engineParticleT || 0) + dt * rate;

  while(player.engineParticleT >= 1){
    player.engineParticleT -= 1;
    const port = layout[Math.floor(Math.random() * layout.length)] || defaultProfile.ports[0];
    const portWidth = port.width || 1;
    const origin = localToWorld(player, port.x + (Math.random() - .5) * 5 * portWidth, port.y + 4, angle);
    const speed = (58 + Math.random() * 115 + power * 90) * (profile.particleSpeed || 1);
    const jitter = (Math.random() - .5) * (38 + power * 28) * (profile.particleSpread || 1) * portWidth;
    const size = (2.4 + Math.random() * 5.8) * (port.size || 1) * (profile.particleSize || 1);
    const life = (.28 + Math.random() * .22) * (profile.particleLife || 1);
    particles.push({
      kind:"engine",
      x:origin.x,
      y:origin.y,
      vx:backX * speed + sideX * jitter,
      vy:backY * speed + sideY * jitter,
      angle,
      life,
      max:life,
      size,
      color:Math.random() > .22 ? engineRgba(colors.particle, .74) : engineRgba(colors.spark, .72)
    });
  }
}

function drawPlayerEngineTrail({ctx, camera, player, ship, defaultProfile, profiles}){
  if(!player) return;
  const power = Math.max(0, Math.min(1, player.enginePower || 0));
  if(power <= 0.02) return;

  const profile = getEngineProfile({ship, defaultProfile, profiles});
  const colors = profile.colors;
  const time = performance.now() / 1000;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  profile.ports.forEach((port, index)=>{
    const size = port.size || 1;
    const pulse = .84 + Math.sin(time * 25 + index * 1.7) * .12 + Math.sin(time * 51 + index) * .05;
    const length = ((profile.baseLength || 22) + power * (profile.powerLength || 30)) * size * (port.length || 1) * pulse;
    const width = ((profile.baseWidth || 7.5) + power * (profile.powerWidth || 7)) * size * (port.width || 1);
    const pos = localToWorld(player, port.x, port.y, player.angle);

    ctx.save();
    ctx.translate(pos.x - camera.x, pos.y - camera.y);
    ctx.rotate(player.angle);
    ctx.globalAlpha = .34 + power * .54;

    const glow = ctx.createRadialGradient(0, length * .32, 1, 0, length * .38, length * .86);
    glow.addColorStop(0, engineRgba(colors.core, .58 * power));
    glow.addColorStop(.26, engineRgba(colors.hot, .48 * power));
    glow.addColorStop(.66, engineRgba(colors.mid, .24 * power));
    glow.addColorStop(1, engineRgba(colors.edge, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, length * .38, width * 1.75, length * .64, 0, 0, Math.PI * 2);
    ctx.fill();

    const flame = ctx.createLinearGradient(0, 0, 0, length);
    flame.addColorStop(0, engineRgba(colors.core, .90 * power));
    flame.addColorStop(.22, engineRgba(colors.hot, .84 * power));
    flame.addColorStop(.70, engineRgba(colors.mid, .38 * power));
    flame.addColorStop(1, engineRgba(colors.edge, 0));
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-width * .52, 0);
    ctx.quadraticCurveTo(-width * .20, length * .44, 0, length);
    ctx.quadraticCurveTo(width * .20, length * .44, width * .52, 0);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = .60 * power;
    ctx.fillStyle = engineRgba(colors.core, .95);
    ctx.beginPath();
    ctx.ellipse(0, length * .18, width * .23, Math.max(4.5, length * .22), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.restore();
}

function drawPlayerDrones({ctx, camera, cache, player, drones, getItemFromInventoryUid}){
  if(!drones.length) return;
  const img = cache["assets/equipment/drone_orbital.svg"];
  const time = performance.now() / 850;
  drones.forEach((uid, index)=>{
    const orbit = 74 + (index % 2) * 16;
    const angle = time + index * (Math.PI * 2 / Math.max(1, drones.length));
    const x = player.x + Math.cos(angle) * orbit;
    const y = player.y + Math.sin(angle) * (orbit * 0.7);
    const module = getItemFromInventoryUid(uid);
    drawRotatedImage({ctx, camera, img, x, y, w:34, h:34, angle:-angle * 1.2});
    if(module){
      ctx.save();
      ctx.translate(x - camera.x, y - camera.y);
      ctx.fillStyle = module.category === "canon" ? "rgba(56,189,248,.95)" : "rgba(34,197,94,.95)";
      ctx.beginPath();
      ctx.arc(0, 18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawPlayerLabel({ctx, camera, cache, player, rank, rankAssetPath, pilotName}){
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const rankImg = cache[rankAssetPath];
  ctx.save();
  ctx.font = "800 15px Rajdhani, Arial";
  ctx.textBaseline = "middle";
  const labelY = py + 62;
  const iconSize = 24;
  const gap = 6;
  const nameWidth = ctx.measureText(pilotName).width;
  const groupWidth = (rankImg ? iconSize + gap : 0) + nameWidth;
  const startX = px - groupWidth / 2;
  if(rankImg) ctx.drawImage(rankImg, startX, labelY - iconSize / 2, iconSize, iconSize);
  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.shadowColor = "rgba(2,6,17,.95)";
  ctx.shadowBlur = 7;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(2,6,17,.82)";
  ctx.strokeText(pilotName, startX + (rankImg ? iconSize + gap : 0), labelY);
  ctx.fillText(pilotName, startX + (rankImg ? iconSize + gap : 0), labelY);
  ctx.restore();
}

export function drawPlayerLayer({
  ctx,
  camera,
  cache,
  player,
  ship,
  drones,
  rank,
  rankAssetPath,
  pilotName,
  getItemFromInventoryUid,
  defaultProfile,
  profiles
}){
  drawPlayerEngineTrail({ctx, camera, player, ship, defaultProfile, profiles});
  drawRotatedImage({ctx, camera, img:cache[ship.combatImg || ship.img], x:player.x, y:player.y, w:96, h:96, angle:player.angle});
  drawPlayerDrones({ctx, camera, cache, player, drones, getItemFromInventoryUid});
  drawPlayerLabel({ctx, camera, cache, player, rank, rankAssetPath, pilotName});
}
