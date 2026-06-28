export const VITAL_STATE_CORRECTION_THROTTLE_MS = 1000;

const VITAL_CORRECTION_FIELDS = new Set(["hp", "maxHp", "shield", "maxShield"]);

export function isVitalOnlyStateCorrection(validation = {}){
  if(!validation?.corrected) return false;
  const details = Array.isArray(validation.correctionDetails) ? validation.correctionDetails : [];
  return details.length > 0 && details.every(detail=>VITAL_CORRECTION_FIELDS.has(String(detail?.field || "")));
}

export function shouldEmitPlayerStateCorrection({
  player,
  validation,
  now = Date.now(),
  throttleMs = VITAL_STATE_CORRECTION_THROTTLE_MS
} = {}){
  if(!validation?.corrected) return false;
  if(!isVitalOnlyStateCorrection(validation)) return true;
  if(!player) return true;
  const nextAt = Number(player.nextVitalStateCorrectionAt || 0);
  if(nextAt > 0 && now < nextAt) return false;
  player.nextVitalStateCorrectionAt = now + Math.max(0, Number(throttleMs || 0));
  return true;
}
