import { LASER_VISUAL_SPEC, M6_VISUAL_SPEC } from "../../src/game/combatData/weaponVisuals.js";
import { getEnemyWeaponContact } from "../../src/game/combatData/enemyWeaponContact.js";
export { M6_VISUAL_SPEC };

export function weaponTiming(ammo, proposed){
  if(ammo.id === "ammo_x6") return {period:M6_VISUAL_SPEC.cooldown, offsets:M6_VISUAL_SPEC.pulseOffsets, duration:M6_VISUAL_SPEC.travelTime};
  if(ammo.weaponClass === "laser") return {period:Number(ammo.cooldown || 1), offsets:[0, LASER_VISUAL_SPEC.duration], duration:LASER_VISUAL_SPEC.duration};
  if(ammo.weaponClass === "missile") return {period:2.7, offsets:[0, .085, .17], duration:.92};
  return {period:2.15, offsets:[0], duration:.78};
}

function muzzle(origin, forward, lateral){
  const angle = (origin.angle ?? Math.PI / 2) - Math.PI / 2;
  return {x:origin.x + Math.cos(angle) * forward - Math.sin(angle) * lateral,
    y:origin.y + Math.sin(angle) * forward + Math.cos(angle) * lateral};
}

export function createWeaponShots({ammo, origin, target, time, proposed, palette, surface = "shield"}){
  const timing = weaponTiming(ammo, proposed);
  const sequence = Math.max(0, Math.floor((time - .28) / timing.period));
  const monochrome = ammo.id === "ammo_x6";
  const starts = monochrome ? [[29, 0], [23, -11], [23, 11], [29, 0]] : null;
  const shots = [];
  for(let batch = Math.max(0, sequence - 1); batch <= sequence; batch++){
    timing.offsets.forEach((offset, index)=>{
      const startsAt = .28 + batch * timing.period + offset;
      const age = time - startsAt;
      if(age < -.6 || age > timing.duration + .65) return;
      const point = starts ? muzzle(origin, ...starts[index]) : muzzle(origin, 29, ammo.weaponClass === "missile" ? (index - 1) * 8 : 0);
      const contact = getEnemyWeaponContact({target:{...target, width:82, height:82, radius:13},
        fromX:point.x, fromY:point.y, shield:surface === "shield" ? 100 : 0});
      shots.push({kind:ammo.weaponClass, ammoId:ammo.id, fromX:point.x, fromY:point.y,
        toX:contact.x, toY:contact.y, targetCenter:target, duration:timing.duration,
        age, startsAt, curve:ammo.weaponClass === "missile" ? (index - 1) * 55 : 0,
        color:monochrome ? M6_VISUAL_SPEC.palette.glow : ammo.color,
        particle:monochrome ? M6_VISUAL_SPEC.palette.core : ammo.particle,
        palette:monochrome ? M6_VISUAL_SPEC.palette : palette, monochrome,
        sprite:ammo.projectileImg, seed:index + 2, sequence:batch, passIndex:index, passCount:timing.offsets.length});
    });
  }
  return shots;
}

export function weaponPhase(ammo, time, proposed){
  const timing = weaponTiming(ammo, proposed);
  const sequence = Math.max(0, Math.floor((time - .28) / timing.period));
  const age = time - (.28 + sequence * timing.period);
  const end = timing.offsets.at(-1) + timing.duration;
  if(age < 0) return "Préparation";
  if(age < end){
    if(ammo.id === "ammo_x6"){
      const index = timing.offsets.filter(offset=>age >= offset).length;
      return `M-6 · impulsion ${index} / 4`;
    }
    return "Trajet du tir";
  }
  if(age < end + .65) return "Impact";
  return ammo.id === "ammo_x6" ? "Recharge · cycle de 3 s" : "Recharge";
}
