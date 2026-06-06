export const DEFAULT_COMBAT_EXTRA_BONUS = {
  autoRocket:false,
  autoMissile:false,
  rocketCooldownMultiplier:1,
  rocketDamageBonus:0,
  repairBot:false,
  repairBotAuto:false,
  repairBotHealRate:0.02,
  repairBotDelay:15
};

function getCombatStatFields(stats, extraBonusFallback){
  return {
    regen:stats.regen,
    speed:stats.vitesseReelle,
    displayedSpeed:stats.vitesseReelle,
    damageBonus:stats.weaponDamage,
    damageMultiplier:Number(stats.weaponDamageMultiplier || (1 + Number(stats.weaponDamagePercent || 0))),
    shieldAbsorbRatio:Math.max(0, Math.min(0.9, Number(stats.shieldAbsorbRatio ?? 0.5))),
    evasionChance:Math.max(0, Math.min(0.75, Number(stats.evasionChance || 0))),
    damageToHpChance:Math.max(0, Math.min(0.5, Number(stats.damageToHpChance || 0))),
    blueLaserBeams:Boolean(stats.blueLaserBeams),
    extraBonus:stats.extraBonus || extraBonusFallback
  };
}

export function applyCombatStatFields(player, stats, extraBonusFallback = player.extraBonus){
  Object.assign(player, getCombatStatFields(stats, extraBonusFallback));
  return player;
}

export function createCombatPlayer(stats, radarRange){
  return {
    x:0,
    y:0,
    angle:0,
    hp:stats.vie,
    maxHp:stats.vie,
    shield:stats.bouclier,
    maxShield:stats.bouclier,
    ...getCombatStatFields(stats, DEFAULT_COMBAT_EXTRA_BONUS),
    radar:radarRange,
    droneOrbit:0,
    secondsSinceDamage:999,
    repairBotActive:false,
    repairBotTickTimer:0,
    isDead:false,
    safeZoneLock:0,
    lastAggression:0,
    vx:0,
    vy:0,
    enginePower:0,
    engineAngle:0,
    engineParticleT:0,
    radiationTimer:30
  };
}
