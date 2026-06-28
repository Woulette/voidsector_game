import { WORLD_ENEMY_TYPES } from "../world/definitions.js";

export function createPortalEnemy(kind, wave, index, x, y, boss = false, now = Date.now()){
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const level = Math.max(1, Math.round((boss ? 20 : 1) + wave * 0.75));
  const hp = Math.round(base.hp(level) * (boss ? 2.6 : 1 + wave * 0.035));
  const shield = Math.round(base.shield(level) * (boss ? 2.6 : 1 + wave * 0.025));
  return {
    id:`P-${wave}-${index}-${now.toString(36)}`,
    serverControlled:true,
    kind:base.kind,
    type:boss ? `${base.type} Alpha` : base.type,
    img:base.img,
    level,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:Math.PI,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:Math.round(base.radius * (boss ? 1.2 : 1)),
    width:Math.round(base.width * (boss ? 1.22 : 1)),
    height:Math.round(base.height * (boss ? 1.22 : 1)),
    speed:base.speed(level),
    attackRange:base.attackRange,
    attackDamage:Math.round(base.attackDamage(level) * (boss ? 1.65 : 1)),
    attackCooldown:base.attackCooldown,
    staggerFirstAttack:true,
    projectileSpeed:base.projectileSpeed || 600,
    particle:base.particle || base.color,
    onHitEffect:base.onHitEffect || null,
    reward:base.reward(level),
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0
  };
}

export function buildServerPortalWave(wave, portalWaveTotal, now = Date.now()){
  if(wave >= portalWaveTotal){
    return [createPortalEnemy("chasseur_spectral", wave, 1, 0, -1040, true, now)];
  }
  const batch = Math.ceil(wave / 5);
  const count = Math.min(9, 3 + Math.floor((wave - 1) / 3));
  const kinds = batch <= 2
    ? ["drone_pirate", "raider_astral"]
    : batch <= 4
      ? ["raider_astral", "chasseur_spectral"]
      : ["chasseur_spectral", "boss_cuirasse_nebulaire"];
  return Array.from({length:count}, (_, i)=>{
    const side = i % 3;
    const x = side === 0 ? -1480 + i * 80 : side === 1 ? 1480 - i * 75 : -480 + i * 105;
    const y = -1040 - (i % 4) * 96;
    return createPortalEnemy(kinds[i % kinds.length], wave, i + 1, x, y, false, now);
  });
}
