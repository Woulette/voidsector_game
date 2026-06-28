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

const PROJECTILE_TRAIL_SAMPLE_INTERVAL = 1 / 45;
const PROJECTILE_TRAIL_MAX_POINTS = 6;
const PROJECTILE_TRAIL_MIN_DISTANCE = 13;
const PROJECTILE_TRAIL_LIFE = .34;

export function createProjectile({owner, startX, startY, targetId, damage, travelTime, radius, color, particle, slotIndex, hitChance, sourceId, kind, sprite, curveSide = 0, curveStrength = 0, visualOnly = false, onHitEffect = null, salvoId = null, salvoSize = 1, ammoId = null, serverFireCount = 1}){
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
    ammoId,
    serverFireCount,
    curveSide,
    curveStrength,
    trail:kind === "rocket" || kind === "missile" ? [] : null,
    trailSampleT:0,
    angle:0,
    hitChance
  };
}

function compactLivingTrail(trail, maxLength){
  if(!Array.isArray(trail)) return trail;
  let write = 0;
  for(let read = 0; read < trail.length; read += 1){
    const point = trail[read];
    if(point.life <= 0) continue;
    trail[write] = point;
    write += 1;
  }
  trail.length = write;
  if(trail.length > maxLength) trail.splice(0, trail.length - maxLength);
  return trail;
}

function recycleOldestTrailPoint(trail){
  if(trail.length < PROJECTILE_TRAIL_MAX_POINTS) return {};
  return trail.shift() || {};
}

function updateProjectileTrail(bullet, dt){
  if(!Array.isArray(bullet.trail)) return;
  for(const point of bullet.trail) point.life -= dt;
  compactLivingTrail(bullet.trail, PROJECTILE_TRAIL_MAX_POINTS);
  bullet.trailSampleT = Number(bullet.trailSampleT || 0) + dt;
  const last = bullet.trail[bullet.trail.length - 1];
  const distanceFromLast = last
    ? Math.hypot(Number(bullet.x || 0) - Number(last.x || 0), Number(bullet.y || 0) - Number(last.y || 0))
    : Infinity;
  if(bullet.trail.length
    && bullet.trailSampleT < PROJECTILE_TRAIL_SAMPLE_INTERVAL
    && distanceFromLast < PROJECTILE_TRAIL_MIN_DISTANCE){
    return;
  }
  bullet.trailSampleT = 0;
  const point = recycleOldestTrailPoint(bullet.trail);
  point.x = bullet.x;
  point.y = bullet.y;
  point.life = PROJECTILE_TRAIL_LIFE;
  point.max = PROJECTILE_TRAIL_LIFE;
  bullet.trail.push(point);
}

function compactActiveProjectiles(bullets){
  let write = 0;
  for(let read = 0; read < bullets.length; read += 1){
    const bullet = bullets[read];
    if(bullet.done) continue;
    bullets[write] = bullet;
    write += 1;
  }
  bullets.length = write;
  return bullets;
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
      updateProjectileTrail(bullet, dt);
    }
    if(progress >= 1){
      onImpact(bullet);
      bullet.done = true;
    }
  }
  return compactActiveProjectiles(bullets);
}
