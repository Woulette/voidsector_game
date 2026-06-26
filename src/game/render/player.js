import { getCachedCombatImage } from "../combatAssets.js";

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
const STAFF_BADGES = {
  owner:{label:"[OWN]", color:"#ff4d5f", shadow:"rgba(248,113,113,.95)"},
  admin:{label:"[ADM]", color:"#ff4d5f", shadow:"rgba(248,113,113,.95)"},
  moderator:{label:"[MOD]", color:"#facc15", shadow:"rgba(250,204,21,.9)"}
};
const RANK_VISIBLE_CENTER_CACHE = new WeakMap();
const FIRST_DYNAMICALLY_ALIGNED_RANK = 6;
const RANK_ALPHA_THRESHOLD = 24;

function getStaffBadge(role){
  return STAFF_BADGES[String(role || "").toLowerCase()] || null;
}

function shouldDynamicallyAlignRank(rankAssetPath){
  const match = String(rankAssetPath || "")
    .replaceAll("\\", "/")
    .match(/(?:^|\/)(\d{2})_[^/?#]+(?:[?#].*)?$/);
  return Number(match?.[1] || 0) >= FIRST_DYNAMICALLY_ALIGNED_RANK;
}

function getVisibleImageCenterRatio(image){
  if(!image?.naturalWidth || !image?.naturalHeight) return .5;
  const cached = RANK_VISIBLE_CENTER_CACHE.get(image);
  if(cached !== undefined) return cached;
  let centerRatio = .5;
  try{
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.min(128, image.naturalWidth));
    canvas.height = Math.max(1, Math.min(128, image.naturalHeight));
    const sample = canvas.getContext("2d", {willReadFrequently:true});
    sample.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = sample.getImageData(0, 0, canvas.width, canvas.height).data;
    let minY = canvas.height;
    let maxY = -1;
    for(let y = 0; y < canvas.height; y++){
      for(let x = 0; x < canvas.width; x++){
        if(pixels[(y * canvas.width + x) * 4 + 3] < RANK_ALPHA_THRESHOLD) continue;
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    if(maxY >= minY) centerRatio = (minY + maxY + 1) / (2 * canvas.height);
  }catch{
    centerRatio = .5;
  }
  RANK_VISIBLE_CENTER_CACHE.set(image, centerRatio);
  return centerRatio;
}

export function getRankIconDrawY({rankAssetPath, iconSize, nameY, defaultY, visibleCenterRatio = .5}){
  if(!shouldDynamicallyAlignRank(rankAssetPath)) return defaultY;
  const numericCenterRatio = Number(visibleCenterRatio);
  const safeCenterRatio = Number.isFinite(numericCenterRatio)
    ? Math.max(0, Math.min(1, numericCenterRatio))
    : .5;
  return nameY - iconSize * safeCenterRatio;
}

export function getFirmIconDrawY({firmIconSize, nameY}){
  return nameY - firmIconSize / 2 - 2.5;
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
    const pulse = .92 + Math.sin(time * 25 + index * 1.7) * .07 + Math.sin(time * 51 + index) * .03;
    const length = ((profile.baseLength || 22) + power * (profile.powerLength || 30)) * size * (port.length || 1) * pulse;
    const width = ((profile.baseWidth || 7.5) + power * (profile.powerWidth || 7)) * size * (port.width || 1);
    const sway = Math.sin(time * (18 + power * 8) + index * 1.9) * width * .12;
    const pos = localToWorld(player, port.x, port.y, player.angle);

    ctx.save();
    ctx.translate(pos.x - camera.x, pos.y - camera.y);
    ctx.rotate(player.angle);
    ctx.globalAlpha = .24 + power * .46;

    const glow = ctx.createRadialGradient(sway * .18, length * .30, 1, sway * .22, length * .38, length * .62);
    glow.addColorStop(0, engineRgba(colors.core, .38 * power));
    glow.addColorStop(.34, engineRgba(colors.hot, .30 * power));
    glow.addColorStop(.72, engineRgba(colors.mid, .13 * power));
    glow.addColorStop(1, engineRgba(colors.edge, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(sway * .18, length * .40, width * 1.08, length * .48, 0, 0, Math.PI * 2);
    ctx.fill();

    const outer = ctx.createLinearGradient(0, 0, sway, length);
    outer.addColorStop(0, engineRgba(colors.core, .78 * power));
    outer.addColorStop(.18, engineRgba(colors.hot, .70 * power));
    outer.addColorStop(.62, engineRgba(colors.mid, .34 * power));
    outer.addColorStop(1, engineRgba(colors.edge, 0));
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(-width * .46, 0);
    ctx.bezierCurveTo(-width * .74, length * .25, sway - width * .20, length * .76, sway, length);
    ctx.bezierCurveTo(sway + width * .20, length * .76, width * .74, length * .25, width * .46, 0);
    ctx.closePath();
    ctx.fill();

    const coreLength = length * (.70 + Math.sin(time * 34 + index) * .05);
    const core = ctx.createLinearGradient(0, 0, sway * .55, coreLength);
    core.addColorStop(0, engineRgba(colors.core, .94 * power));
    core.addColorStop(.42, engineRgba(colors.hot, .70 * power));
    core.addColorStop(1, engineRgba(colors.mid, 0));
    ctx.globalAlpha = .48 + power * .34;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(-width * .18, 1);
    ctx.quadraticCurveTo(-width * .10, coreLength * .43, sway * .55, coreLength);
    ctx.quadraticCurveTo(width * .10, coreLength * .43, width * .18, 1);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = .50 * power;
    ctx.strokeStyle = engineRgba(colors.core, .88);
    ctx.lineWidth = Math.max(.8, width * .12);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, Math.max(2, length * .06));
    ctx.quadraticCurveTo(sway * .25, length * .42, sway * .62, length * .78);
    ctx.stroke();

    const nozzle = ctx.createRadialGradient(0, 0, 1, 0, 0, width * 1.1);
    nozzle.addColorStop(0, engineRgba(colors.core, .92 * power));
    nozzle.addColorStop(.36, engineRgba(colors.hot, .48 * power));
    nozzle.addColorStop(1, engineRgba(colors.mid, 0));
    ctx.globalAlpha = .58 * power;
    ctx.fillStyle = nozzle;
    ctx.beginPath();
    ctx.ellipse(0, 0, width * .72, Math.max(2.4, width * .24), 0, 0, Math.PI * 2);
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
  const img = getCachedCombatImage(cache, "assets/drones/drone_test_sprite.webp");
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
  const img = getCachedCombatImage(cache, repairImg)
    || getCachedCombatImage(cache, REPAIR_DRONE_IMG);
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

function drawPlayerLabel({ctx, camera, cache, player, rank, rankAssetPath, pilotFirmAssetPath, pilotName, pilotRole, pilotTitle}){
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const rankImg = getCachedCombatImage(cache, rankAssetPath);
  const firmImg = getCachedCombatImage(cache, pilotFirmAssetPath);
  const rankReady = Boolean(rankImg?.complete && rankImg.naturalWidth);
  const firmReady = Boolean(firmImg?.complete && firmImg.naturalWidth);
  const staffBadge = getStaffBadge(pilotRole);
  ctx.save();
  ctx.font = "800 15px Rajdhani, Arial";
  ctx.textBaseline = "middle";
  const labelY = py + 94;
  const nameY = labelY + 3;
  const iconSize = 29;
  const firmIconSize = 24;
  const firmGap = -4;
  const nameGap = 6;
  const badgeGap = staffBadge ? 5 : 0;
  const badgeWidth = staffBadge ? ctx.measureText(staffBadge.label).width : 0;
  const nameWidth = ctx.measureText(pilotName).width;
  const groupWidth = (firmReady ? firmIconSize + firmGap : 0)
    + (rankReady ? iconSize + nameGap : 0)
    + badgeWidth
    + badgeGap
    + nameWidth;
  const startX = px - groupWidth / 2;
  let textX = startX;
  if(firmReady){
    ctx.drawImage(firmImg, textX, getFirmIconDrawY({firmIconSize, nameY}), firmIconSize, firmIconSize);
    textX += firmIconSize + firmGap;
  }
  if(rankReady){
    const rankY = getRankIconDrawY({
      rankAssetPath,
      iconSize,
      nameY,
      defaultY:labelY - iconSize / 2 - 1,
      visibleCenterRatio:getVisibleImageCenterRatio(rankImg)
    });
    ctx.drawImage(rankImg, textX, rankY, iconSize, iconSize);
    textX += iconSize + nameGap;
  }
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(2,6,17,.95)";
  ctx.shadowBlur = 7;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(2,6,17,.82)";
  if(staffBadge){
    ctx.fillStyle = staffBadge.color;
    ctx.shadowColor = staffBadge.shadow;
    ctx.strokeText(staffBadge.label, textX, nameY);
    ctx.fillText(staffBadge.label, textX, nameY);
    textX += badgeWidth + badgeGap;
    ctx.shadowColor = "rgba(2,6,17,.95)";
  }
  ctx.fillStyle = "#e2e8f0";
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

function drawSpectralDoubleShotCharge({ctx, camera, player, ship}){
  const charge = player?.spectralDoubleShotCharge;
  if(!charge || charge.abilityId !== "spectral_double_shot") return;
  const now = Date.now();
  const activeUntil = Math.max(0, Number(charge.activeUntil || 0));
  if(activeUntil <= now) return;
  const chargeMs = Math.max(1, Number(charge.chargeMs || 3_000));
  const segments = Math.max(1, Math.min(6, Math.round(Number(charge.chargeSegments || 3))));
  const startedAt = Math.max(0, Number(charge.chargeStartedAt || now));
  const readyAt = Math.max(startedAt + chargeMs, Number(charge.chargeReadyAt || startedAt + chargeMs));
  const elapsed = Math.max(0, Math.min(chargeMs, now - startedAt));
  const ready = now >= readyAt;
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const shipHeight = Math.max(96, Number(ship?.renderHeight || 96));
  const y = Math.round(py - shipHeight / 2 - 24);
  const spacing = 14;
  const radius = 4.5;
  const plateWidth = Math.max(36, (segments - 1) * spacing + 24);
  const plateHeight = 18;
  const pulse = (Math.sin(performance.now() / 90) + 1) / 2;

  ctx.save();
  ctx.translate(Math.round(px), y);
  ctx.fillStyle = "rgba(2,6,23,.68)";
  ctx.strokeStyle = ready ? `rgba(216,180,254,${.58 + pulse * .22})` : "rgba(148,163,184,.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-plateWidth / 2, -plateHeight / 2, plateWidth, plateHeight, 9);
  ctx.fill();
  ctx.stroke();

  for(let index = 0; index < segments; index++){
    const x = (index - (segments - 1) / 2) * spacing;
    const threshold = ((index + 1) / segments) * chargeMs;
    const segmentStart = (index / segments) * chargeMs;
    const filled = ready || elapsed >= threshold;
    const partial = !filled && elapsed > segmentStart;
    const partialRatio = partial ? Math.max(.18, Math.min(1, (elapsed - segmentStart) / (chargeMs / segments))) : 0;

    ctx.save();
    if(filled || ready){
      ctx.shadowColor = "rgba(168,85,247,.92)";
      ctx.shadowBlur = ready ? 10 + pulse * 8 : 8;
      ctx.fillStyle = ready ? `rgba(233,213,255,${.88 + pulse * .12})` : "rgba(196,181,253,.92)";
      ctx.beginPath();
      ctx.arc(x, 0, radius + (ready ? pulse * 1.1 : 0), 0, Math.PI * 2);
      ctx.fill();
    }else{
      ctx.strokeStyle = "rgba(148,163,184,.48)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      if(partialRatio > 0){
        ctx.fillStyle = `rgba(168,85,247,${.32 + partialRatio * .44})`;
        ctx.beginPath();
        ctx.arc(x, 0, radius * partialRatio, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
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
  pilotRole,
  pilotTitle,
  getItemFromInventoryUid,
  getDronePermanentUpgrade,
  droneFormation,
  defaultProfile,
  profiles,
  graphicsEffects = {}
}){
  if(graphicsEffects.shipEngineTrail !== false) drawPlayerEngineTrail({ctx, camera, player, ship, defaultProfile, profiles});
  drawPlayerStatusBars({ctx, camera, player});
  drawSpectralDoubleShotCharge({ctx, camera, player, ship});
  drawRotatedImage({
    ctx,
    camera,
    img:getCachedCombatImage(cache, ship.combatImg || ship.img),
    x:player.x,
    y:player.y,
    w:ship.renderWidth || 96,
    h:ship.renderHeight || 96,
    angle:player.angle + Number(ship.renderAngleOffset || 0)
  });
  if(graphicsEffects.repairDrone !== false) drawRepairDrone({ctx, camera, cache, player});
  if(graphicsEffects.combatDrones !== false) drawPlayerDrones({ctx, camera, cache, player, drones, getItemFromInventoryUid, getDronePermanentUpgrade, droneFormation});
  drawPlayerLabel({ctx, camera, cache, player, rank, rankAssetPath, pilotFirmAssetPath, pilotName, pilotRole, pilotTitle});
}
