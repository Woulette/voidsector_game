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

const REPAIR_DRONE_IMG = "assets/equipment/drone_repair_starter.png";

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

function lerp(a, b, t){ return a + (b - a) * t; }
function smoothstep(t){ return t * t * (3 - 2 * t); }
function lerpAngle(current, target, amount){
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

function triadPoint(points, memberIndex, time, phase = 0, movePortion = .52){
  const cycle = (time + phase) % points.length;
  const step = Math.floor(cycle);
  const rawMix = cycle - step;
  const mix = rawMix >= movePortion ? 1 : smoothstep(rawMix / movePortion);
  const from = points[(memberIndex + step) % points.length];
  const to = points[(memberIndex + step + 1) % points.length];
  return {
    x:lerp(from.x, to.x, mix),
    y:lerp(from.y, to.y, mix)
  };
}

function pointAlongPath(points, t){
  if(points.length === 1) return points[0];
  const scaled = Math.max(0, Math.min(.999, t)) * (points.length - 1);
  const fromIndex = Math.floor(scaled);
  const mix = scaled - fromIndex;
  const from = points[fromIndex];
  const to = points[Math.min(points.length - 1, fromIndex + 1)];
  return {x:lerp(from.x, to.x, mix), y:lerp(from.y, to.y, mix)};
}

function tirFormationRecoil(time){
  const cycle = (time * .72) % 1;
  if(cycle < .58) return smoothstep(cycle / .58) * 18;
  if(cycle < .68) return 18 - smoothstep((cycle - .58) / .10) * 28;
  return -10 + smoothstep((cycle - .68) / .32) * 10;
}

function formationPoint(index, time, formationId = null, count = 1){
  if(formationId === "cuirasse"){
    const radius = 138;
    const angle = time * .82 + (index / Math.max(1, count)) * Math.PI * 2;
    return {x:Math.cos(angle) * radius, y:Math.sin(angle) * radius};
  }
  if(formationId === "tir"){
    const leftCount = Math.ceil(count / 2);
    const isLeft = index < leftCount;
    const localIndex = isLeft ? index : index - leftCount;
    const localCount = isLeft ? leftCount : Math.max(1, count - leftCount);
    const leftPath = [{x:-154,y:-88},{x:-154,y:86},{x:-72,y:86}];
    const rightPath = [{x:154,y:-88},{x:154,y:86},{x:72,y:86}];
    const point = pointAlongPath(isLeft ? leftPath : rightPath, localCount <= 1 ? .5 : localIndex / (localCount - 1));
    const recoil = tirFormationRecoil(time);
    return {
      x:point.x,
      y:point.y + recoil + Math.sin(time * 3.2 + index * .7) * 2
    };
  }
  if(formationId === "vitesse"){
    const speedPulse = Math.sin(time * 4.4 + index * .6) * 2.6;
    const points = [
      {x:0, y:-176},
      {x:-48, y:-138},
      {x:48, y:-138},
      {x:-94, y:-100},
      {x:94, y:-100},
      {x:-116, y:118},
      {x:-58, y:82},
      {x:0, y:130},
      {x:58, y:82},
      {x:116, y:118}
    ];
    const point = points[index] || points[points.length - 1];
    return {x:point.x, y:point.y + speedPulse};
  }
  const fixedDrift = Math.sin(time * Math.PI * 2) * 3;
  const leftTriad = [
    {x:-112, y:-72},
    {x:-154, y:-8},
    {x:-110, y:64}
  ];
  const rightTriad = [
    {x:112, y:-72},
    {x:154, y:-8},
    {x:110, y:64}
  ];

  if(index === 0) return {x:0, y:-150 - fixedDrift};
  if(index === 1) return {x:0, y:154 + fixedDrift};
  if(index >= 2 && index <= 4) return triadPoint(leftTriad, index - 2, time * .32, 0);
  if(index >= 5 && index <= 7) return triadPoint(rightTriad, index - 5, time * .32, 1.35);
  if(index === 8) return {x:-72 + Math.sin(time * 2.1) * 2, y:124 + Math.cos(time * 1.7) * 2};
  if(index === 9) return {x:72 + Math.sin(time * 2.1 + Math.PI) * 2, y:124 + Math.cos(time * 1.7 + Math.PI) * 2};
  return {x:0, y:140};
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

function drawDroneSprite({ctx, camera, img, x, y, angle, upgraded}){
  ctx.save();
  ctx.translate(Math.round(x - camera.x), Math.round(y - camera.y));
  ctx.rotate(angle);
  if(upgraded){
    ctx.shadowColor = "rgba(239,68,68,.78)";
    ctx.shadowBlur = 16;
  }
  if(img && img.complete){
    ctx.drawImage(img, -17, -17, 34, 34);
    if(upgraded){
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(239,68,68,.58)";
      ctx.fillRect(-17, -17, 34, 34);
    }
  }else{
    ctx.fillStyle = upgraded ? "#ef4444" : "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(17, 17);
    ctx.lineTo(0, 11);
    ctx.lineTo(-17, 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawPlayerDrones({ctx, camera, cache, player, drones, getItemFromInventoryUid, getDronePermanentUpgrade, droneFormation}){
  if(!drones.length) return;
  const img = cache["assets/drones/drone_test_sprite.webp"];
  const time = performance.now() / 1000;
  const previousTime = Number.isFinite(player.droneRenderTime) ? player.droneRenderTime : time;
  const dt = Math.max(0, Math.min(.05, time - previousTime));
  player.droneRenderTime = time;
  player.droneFormationAngle = Number.isFinite(player.droneFormationAngle)
    ? lerpAngle(player.droneFormationAngle, player.angle, .028)
    : player.angle;
  const speedRatio = player.speed > 0 ? Math.min(1, Math.hypot(player.vx || 0, player.vy || 0) / player.speed) : 0;
  const targetSpeedTrail = droneFormation === "vitesse" ? speedRatio * 92 : 0;
  const trailResponse = targetSpeedTrail > (player.droneSpeedTrail || 0) ? 7.5 : 4.2;
  player.droneSpeedTrail = (player.droneSpeedTrail || 0) + (targetSpeedTrail - (player.droneSpeedTrail || 0)) * Math.min(1, dt * trailResponse);
  const visibleDrones = drones.slice(0, 10);
  visibleDrones.forEach((uid, index)=>{
    const point = formationPoint(index, time, droneFormation, visibleDrones.length);
    if(droneFormation === "vitesse"){
      point.y += player.droneSpeedTrail * (.78 + Math.max(0, point.y) / 360);
    }
    const pulse = Math.sin(time * 4.2 + index * .9) * 1.4;
    const pos = localToWorld(player, point.x, point.y + pulse, player.droneFormationAngle);
    const x = pos.x;
    const y = pos.y;
    drawDroneSprite({ctx, camera, img, x, y, angle:player.angle, upgraded:Boolean(getDronePermanentUpgrade?.(index))});
  });
}

function drawRepairDrone({ctx, camera, cache, player}){
  if(!player?.repairBotActive) return;
  const repairImg = player.extraBonus?.repairBotImg || REPAIR_DRONE_IMG;
  const img = cache[repairImg] || cache[REPAIR_DRONE_IMG];
  const time = performance.now() / 1000;
  const orbit = time * 1.15;
  const hover = Math.sin(time * 5.2) * 3;
  const orbitRadiusX = 92;
  const orbitRadiusY = 78;
  const centerPulse = Math.sin(time * 7.5) * 2;
  const contactLocal = {x:centerPulse, y:centerPulse * .35};
  const droneLocal = {
    x:Math.cos(orbit) * orbitRadiusX + Math.cos(time * 2.7) * 5,
    y:Math.sin(orbit) * orbitRadiusY + hover
  };
  const contact = localToWorld(player, contactLocal.x, contactLocal.y, player.angle);
  const drone = localToWorld(player, droneLocal.x, droneLocal.y, player.angle);
  const sx = drone.x - camera.x;
  const sy = drone.y - camera.y;
  const tx = contact.x - camera.x;
  const ty = contact.y - camera.y;
  const pulse = (Math.sin(time * 16) + 1) / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(34,211,238,${.34 + pulse * .22})`;
  ctx.shadowColor = "rgba(34,211,238,.85)";
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2.2 + pulse * 1.4;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  ctx.fillStyle = `rgba(134,239,172,${.28 + pulse * .28})`;
  ctx.shadowColor = "rgba(34,197,94,.75)";
  ctx.shadowBlur = 10;
  for(let i = 0; i < 4; i++){
    const t = (time * 2.5 + i * .25) % 1;
    const px = sx + (tx - sx) * t + Math.sin(time * 8 + i) * 2;
    const py = sy + (ty - sy) * t + Math.cos(time * 7 + i) * 2;
    ctx.beginPath();
    ctx.arc(px, py, 2.1 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawRotatedImage({
    ctx,
    camera,
    img,
    x:drone.x,
    y:drone.y,
    w:42,
    h:42,
    angle:Math.atan2(player.y - drone.y, player.x - drone.x) + Math.PI / 2 + Math.PI,
    fallbackColor:"#22d3ee"
  });
}

function drawPlayerLabel({ctx, camera, cache, player, rank, rankAssetPath, pilotFirmAssetPath, pilotName, pilotTitle}){
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const rankImg = cache[rankAssetPath];
  const firmImg = cache[pilotFirmAssetPath];
  ctx.save();
  ctx.font = "800 15px Rajdhani, Arial";
  ctx.textBaseline = "middle";
  const labelY = py + 94;
  const nameY = labelY + 3;
  const iconSize = 29;
  const firmIconSize = 24;
  const firmGap = -4;
  const nameGap = 6;
  const nameWidth = ctx.measureText(pilotName).width;
  const groupWidth = (firmImg ? firmIconSize + firmGap : 0) + (rankImg ? iconSize + nameGap : 0) + nameWidth;
  const startX = px - groupWidth / 2;
  let textX = startX;
  if(firmImg){
    ctx.drawImage(firmImg, textX, labelY - firmIconSize / 2 - 1, firmIconSize, firmIconSize);
    textX += firmIconSize + firmGap;
  }
  if(rankImg){
    ctx.drawImage(rankImg, textX, labelY - iconSize / 2 - 1, iconSize, iconSize);
    textX += iconSize + nameGap;
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#e2e8f0";
  ctx.shadowColor = "rgba(2,6,17,.95)";
  ctx.shadowBlur = 7;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(2,6,17,.82)";
  ctx.strokeText(pilotName, textX, nameY);
  ctx.fillText(pilotName, textX, nameY);
  if(pilotTitle){
    ctx.font = "800 12px Rajdhani, Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fef08a";
    ctx.strokeStyle = "rgba(2,6,17,.86)";
    ctx.lineWidth = 3;
    ctx.strokeText(pilotTitle, px, nameY + 18);
    ctx.fillText(pilotTitle, px, nameY + 18);
  }
  ctx.restore();
}

function drawPlayerStatusBars({ctx, camera, player}){
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const width = 58;
  const height = 5;
  const gap = 4;
  const hpRatio = Math.max(0, Math.min(1, Number(player.hp || 0) / Math.max(1, Number(player.maxHp || 1))));
  const shieldRatio = Math.max(0, Math.min(1, Number(player.shield || 0) / Math.max(1, Number(player.maxShield || 1))));
  const hasShield = Number(player.maxShield || 0) > 0 && Number(player.shield || 0) > 0;
  const totalHeight = hasShield ? height * 2 + gap : height;
  const x = Math.round(px - width / 2);
  const y = Math.round(py - 74 - totalHeight / 2);

  const drawBar = (barY, ratio, fill, glow)=>{
    ctx.fillStyle = "rgba(2,10,19,.78)";
    ctx.fillRect(x, barY, width, height);
    ctx.strokeStyle = "rgba(148,163,184,.22)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, barY + .5, width - 1, height - 1);
    ctx.fillStyle = fill;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 5;
    ctx.fillRect(x + 1, barY + 1, Math.max(0, (width - 2) * ratio), height - 2);
    ctx.shadowBlur = 0;
  };

  ctx.save();
  drawBar(y, hpRatio, "#22c55e", "rgba(34,197,94,.68)");
  if(hasShield) drawBar(y + height + gap, shieldRatio, "#38bdf8", "rgba(56,189,248,.68)");
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
  pilotFirmAssetPath,
  pilotName,
  pilotTitle,
  getItemFromInventoryUid,
  getDronePermanentUpgrade,
  droneFormation,
  defaultProfile,
  profiles
}){
  drawPlayerEngineTrail({ctx, camera, player, ship, defaultProfile, profiles});
  drawPlayerStatusBars({ctx, camera, player});
  drawRotatedImage({ctx, camera, img:cache[ship.combatImg || ship.img], x:player.x, y:player.y, w:96, h:96, angle:player.angle});
  drawRepairDrone({ctx, camera, cache, player});
  drawPlayerDrones({ctx, camera, cache, player, drones, getItemFromInventoryUid, getDronePermanentUpgrade, droneFormation});
  drawPlayerLabel({ctx, camera, cache, player, rank, rankAssetPath, pilotFirmAssetPath, pilotName, pilotTitle});
}
