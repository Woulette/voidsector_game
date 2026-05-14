export function rollBetween(min, max){
  const lo = Number(min ?? 0);
  const hi = Number(max ?? lo);
  return lo + Math.random() * Math.max(0, hi - lo);
}

export function describeAmmo(ammo){
  if(!ammo) return "Aucune";
  return ammo.weaponClass === "rocket" ? `${ammo.name} (${ammo.damageMin}-${ammo.damageMax})` : `${ammo.name} (x${ammo.multiplier})`;
}

export function getAmmoCooldownKey(ammo){
  return ammo.weaponClass === "rocket" ? ammo.id : "laser";
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

export function createProjectile({owner, startX, startY, targetId, damage, travelTime, radius, color, particle, slotIndex, hitChance, sourceId}){
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
    bullet.x = bullet.fromX + (target.x - bullet.fromX) * progress;
    bullet.y = bullet.fromY + (target.y - bullet.fromY) * progress;
    if(progress >= 1){
      onImpact(bullet);
      bullet.done = true;
    }
  }
  return bullets.filter(bullet=>!bullet.done);
}
