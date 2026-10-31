import { AZURON_TOTAL_WAVES, AZURON_WAVES_PER_BATCH, getAzuronWaveDefinition } from "../data/azuronPortal.js";
import { isWavePortal } from "../data/wavePortalTiers.js";

export function sanitizeAzuronProgress(value){
  if(!value || typeof value !== "object" || !/^[a-zA-Z0-9_-]{1,80}$/.test(String(value.runId || ""))) return null;
  const portalId=String(value.portalId || "blue");
  if(!isWavePortal(portalId))return null;
  const nextWave = Math.floor(Number(value.nextWave));
  const lives = Math.min(3, Math.max(0, Math.floor(Number(value.lives))));
  if(!Number.isFinite(lives) || lives < 1 || !Number.isFinite(nextWave)
    || nextWave < 1 || nextWave > AZURON_TOTAL_WAVES || (nextWave-1) % AZURON_WAVES_PER_BATCH !== 0) return null;
  const phase = ["active", "ready", "parked"].includes(value.phase) ? value.phase : "active";
  const defeated = [...new Set((Array.isArray(value.defeated) ? value.defeated : []).filter(key=>{
    const [wave, index] = String(key).split(":").map(Number);
    return Number.isInteger(wave) && Number.isInteger(index) && wave >= nextWave
      && wave < nextWave+AZURON_WAVES_PER_BATCH && index >= 1 && index <= getAzuronWaveDefinition(wave).count;
  }).map(String))].slice(0,50);
  return {version:1, ...(portalId!=="blue" ? {portalId} : {}), runId:String(value.runId), nextWave, lives, phase, defeated,
    updatedAt:Math.max(0, Number(value.updatedAt) || 0)};
}

export function canRecordAzuronEnemyReward(profile, reward){
  if(!reward?.azuronRunId) return true;
  const progress = sanitizeAzuronProgress(profile?.azuronProgress);
  const wave = Math.floor(Number(reward.azuronWave));
  const index = Math.floor(Number(reward.azuronIndex));
  return Boolean(progress && String(progress.portalId || "blue")===String(reward.azuronPortalId || "blue")
    && progress.runId === reward.azuronRunId && progress.phase === "active"
    && wave >= progress.nextWave && wave < progress.nextWave+AZURON_WAVES_PER_BATCH
    && index >= 1 && index <= getAzuronWaveDefinition(wave).count
    && !progress.defeated.includes(`${wave}:${index}`));
}

// This receipt is committed in the same profile mutation as currency and XP.
export function recordAzuronEnemyReward(profile, reward){
  if(!canRecordAzuronEnemyReward(profile, reward)) return false;
  if(reward?.azuronRunId){
    const progress = sanitizeAzuronProgress(profile.azuronProgress);
    progress.defeated.push(`${Math.floor(Number(reward.azuronWave))}:${Math.floor(Number(reward.azuronIndex))}`);
    progress.updatedAt = Date.now();
    profile.azuronProgress = progress;
  }
  return true;
}
