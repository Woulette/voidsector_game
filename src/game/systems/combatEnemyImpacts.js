import { LASER_VISUAL_SPEC, M6_VISUAL_SPEC, SHIELD_VISUAL_SPEC } from "../combatData/weaponVisuals.js";
import { getEnemyWeaponContact } from "../combatData/enemyWeaponContact.js";

export function createEnemyImpactEffect({target, fromX, fromY, shield, color, monochrome = false, delay = 0} = {}){
  const contact = getEnemyWeaponContact({target, fromX, fromY, shield});
  if(!contact) return null;
  const life = contact.surface === "shield" ? SHIELD_VISUAL_SPEC.duration : .22;
  return {kind:"enemyWeaponImpact", ...contact, target, color, monochrome, delay, life, max:life};
}

export function createCombatEnemyImpactSystem({getState, now = ()=>performance.now()} = {}){
  const shots = new Map(), processed = new Map();
  const key = event=>`${event.attackerId || ""}:${event.shotId || ""}`;
  function trim(entries){
    for(const [id, entry] of entries) if(now() - entry.at > 2500) entries.delete(id);
    while(entries.size > 256) entries.delete(entries.keys().next().value);
  }
  function observeShot(event){
    trim(shots);
    const start = event?.starts?.[0];
    if(event?.shotId) shots.set(key(event), {at:now(), fromX:start?.x ?? event.fromX, fromY:start?.y ?? event.fromY});
  }
  function addHit(event, target){
    const state = getState();
    if(!event || event.accepted === false || event.outcome === "rejected" || event.hit === false
      || event.targetDestroyed === true || (target && Number(target.hp) <= 0)
      || !(Number(event.damage) > 0) || event.targetPlayerId || String(event.enemyId || "").startsWith("player:")
      || String(event.mapId ?? state.currentMap?.id ?? "") !== String(state.currentMap?.id ?? state.currentMap?.name ?? "")) return;
    const at = Number(event.at || 0);
    if(at > 1_000_000_000_000 && Date.now() - at > 2000) return;
    trim(processed);
    const id = key(event);
    if(event.shotId && processed.has(id)) return;
    // Read the authoritative value BEFORE this hit, including a shield-breaking hit.
    const shield = Number.isFinite(Number(event.shieldBefore)) ? Number(event.shieldBefore) : Number(target?.shield || 0);
    const enemy = target || {x:event.x, y:event.y, radius:event.radius};
    const kind = String(event.weaponClass || "laser");
    const m6 = event.ammoId === "ammo_x6";
    const shot = shots.get(id);
    const elapsed = shot ? Math.max(0, (now() - shot.at) / 1000) : 0;
    const arrivals = kind === "laser"
      ? m6 ? M6_VISUAL_SPEC.pulseOffsets.map(offset=>offset + M6_VISUAL_SPEC.travelTime)
        : [LASER_VISUAL_SPEC.duration, LASER_VISUAL_SPEC.duration * 2]
      : [0];
    const fromX = Number(shot?.fromX ?? event.fromX ?? enemy.x - 1), fromY = Number(shot?.fromY ?? event.fromY ?? enemy.y);
    const dx = enemy.x - fromX, dy = enemy.y - fromY, distance = Math.hypot(dx,dy) || 1;
    const effects = arrivals.map((arrival,index)=>{
      const side = m6 ? [0,-11,11,0][index] : 0, back = side ? 6 : 0;
      return createEnemyImpactEffect({target:enemy,
      fromX:fromX - dx / distance * back - dy / distance * side,
      fromY:fromY - dy / distance * back + dx / distance * side, shield, monochrome:m6,
      color:event.ammoId === "ammo_x4" ? "rgba(255,222,64,1)" : kind === "laser" ? "rgba(255,92,72,1)" : "rgba(255,187,95,1)",
      delay:Math.max(0, arrival - elapsed)});
    }).filter(Boolean);
    if(!effects.length) return;
    if(!Array.isArray(state.impactEffects)) return;
    state.impactEffects.push(...effects);
    // The existing effects update also caps the total pool at 96 and expires it.
    if(event.shotId) processed.set(id, {at:now()});
  }
  return {observeShot, addHit};
}
