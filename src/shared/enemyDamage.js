export const ENEMY_DAMAGE_VARIATION = .18;

export function getEnemyDamageRange(damage){
  const amount = Math.max(1, Number(damage) || 1);
  return {
    attackDamageMin:Math.max(1, Math.round(amount * (1 - ENEMY_DAMAGE_VARIATION))),
    attackDamageMax:Math.max(1, Math.round(amount * (1 + ENEMY_DAMAGE_VARIATION)))
  };
}

export function rollEnemyDamage(damage, random = Math.random){
  const {attackDamageMin:min, attackDamageMax:max} = getEnemyDamageRange(damage);
  const roll = Math.max(0, Math.min(1, Number(random()) || 0));
  return Math.min(max, min + Math.floor(roll * (max - min + 1)));
}
