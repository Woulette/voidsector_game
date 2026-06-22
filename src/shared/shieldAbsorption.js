export const DEFAULT_SHIELD_ABSORB_RATIO = 0.5;
export const MAX_SHIELD_ABSORB_RATIO = 0.9;

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function calculateShieldAbsorbRatio(contributions = [], skillBonus = 0){
  let totalCapacity = 0;
  let weightedRatio = 0;
  for(const contribution of contributions){
    const capacity = Math.max(0, finite(contribution?.capacity));
    if(capacity <= 0) continue;
    const ratio = Math.max(0, Math.min(1, finite(contribution?.ratio, DEFAULT_SHIELD_ABSORB_RATIO)));
    totalCapacity += capacity;
    weightedRatio += capacity * ratio;
  }
  const equipmentRatio = totalCapacity > 0
    ? weightedRatio / totalCapacity
    : DEFAULT_SHIELD_ABSORB_RATIO;
  return Math.max(0, Math.min(MAX_SHIELD_ABSORB_RATIO, equipmentRatio + finite(skillBonus)));
}
