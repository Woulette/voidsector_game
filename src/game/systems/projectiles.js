export function rollBetween(min, max){
  const lo = Number(min ?? 0);
  const hi = Number(max ?? lo);
  return lo + Math.random() * Math.max(0, hi - lo);
}

export function describeAmmo(ammo){
  if(!ammo) return "Aucune";
  if(ammo.weaponClass === "rocket") return `${ammo.name} (${ammo.damageMin}-${ammo.damageMax})`;
  if(ammo.weaponClass === "missile") return `${ammo.name} (${ammo.damageMin}-${ammo.damageMax})`;
  return `${ammo.name} (x${ammo.multiplier})`;
}

export function getAmmoCooldownKey(ammo){
  if(ammo.weaponClass === "rocket") return "rocket";
  return "laser";
}

export function getAmmoCooldown(ammoCooldowns, ammoOrId, getAmmo){
  const ammo = typeof ammoOrId === "string" && getAmmo ? getAmmo(ammoOrId) : ammoOrId;
  const key = ammo ? getAmmoCooldownKey(ammo) : ammoOrId;
  return Math.max(0, ammoCooldowns?.[key] || 0);
}

export function setAmmoCooldown(ammoCooldowns, ammo, seconds, getCooldown){
  if(!ammo) return;
  const key = getAmmoCooldownKey(ammo);
  ammoCooldowns[key] = Math.max(getCooldown(ammo), seconds || ammo.cooldown || 1);
}

export function createProjectile({owner, startX, startY, targetId, damage, travelTime, radius, color, particle, slotIndex, hitChance, sourceId, kind, sprite, curveSide = 0, curveStrength = 0, visualOnly = false, onHitEffect = null, salvoId = null, salvoSize = 1}){
  return {
    owner,
    fromX:startX,
    fromY:startY,
    x:startX,
    y:startY,
    damage,
    travelTime,
    elapsed:0,
    r:radius,
    color,
    particle,
    slotIndex,
    targetId,
    sourceId,
    kind,
    sprite,
    visualOnly,
    onHitEffect,
    salvoId,
    salvoSize,
    curveSide,
    curveStrength,
    trail:kind === "rocket" || kind === "missile" ? [] : null,
    angle:0,
    hitChance
  };
}

export function updateProjectiles({bullets, dt, getTarget, onImpact}){
  for(const bullet of bullets){
    bullet.elapsed += dt;
    const target = getTarget(bullet);
    if(!target){
      bullet.done = true;
      continue;
    }
    const progress = Math.min(1, bullet.elapsed / Math.max(.001, bullet.travelTime || .1));
    const baseX = bullet.fromX + (target.x - bullet.fromX) * progress;
    const baseY = bullet.fromY + (target.y - bullet.fromY) * progress;
    const dx = target.x - bullet.fromX;
    const dy = target.y - bullet.fromY;
    const distance = Math.hypot(dx, dy) || 1;
    const sideX = -dy / distance;
    const sideY = dx / distance;
    const curve = (bullet.curveSide || 0) * (bullet.curveStrength || 0) * Math.sin(Math.PI * progress) * Math.max(0, 1 - progress * .18);
    const prevX = bullet.x;
    const prevY = bullet.y;
    bullet.x = baseX + sideX * curve;
    bullet.y = baseY + sideY * curve;
    bullet.angle = Math.atan2(bullet.y - prevY, bullet.x - prevX);
    if((bullet.kind === "rocket" || bullet.kind === "missile") && bullet.trail){
      bullet.trail.push({x:bullet.x, y:bullet.y, life:.42, max:.42});
      for(const point of bullet.trail) point.life -= dt;
      bullet.trail = bullet.trail.filter(point=>point.life > 0).slice(-8);
    }
    if(progress >= 1){
      onImpact(bullet);
      bullet.done = true;
    }
  }
  return bullets.filter(bullet=>!bullet.done);
}
