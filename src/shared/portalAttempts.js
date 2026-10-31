import { PROGRESSION_PORTAL_IDS } from "./progressionUnlocks.js";

export const PORTAL_ATTEMPTS_VERSION = 1;
export const PORTAL_REWARD_DISPLAY_DELAY_MS = 7000;
export const PORTAL_EXIT_DURATION_MS = 4000;
export const isFragmentPortal = id=>PROGRESSION_PORTAL_IDS.includes(String(id || ""));

export function sanitizePortalAttempt(value){
  if(!value || !isFragmentPortal(value.portalId) || !/^[a-zA-Z0-9_-]{1,120}$/.test(String(value.id || ""))) return null;
  const lives=Math.floor(Number(value.lives));
  if(!Number.isFinite(lives) || lives<1 || lives>3) return null;
  return {id:String(value.id),portalId:String(value.portalId),lives,
    phase:["prepared","active","parked"].includes(value.phase) ? value.phase : "prepared",
    invokedAt:Math.max(0,Number(value.invokedAt) || 0)};
}

// unlockedPortals now holds at most one assembled, unused attempt per portal.
// An old permanent unlock never becomes another free attempt after a victory.
export function normalizePortalAttempts(profile = {}){
  let unlockedPortals=[...new Set((profile.unlockedPortals || []).map(String).filter(isFragmentPortal))];
  let portalAttempt=sanitizePortalAttempt(profile.portalAttempt);
  if(Number(profile.portalAttemptsVersion)!==PORTAL_ATTEMPTS_VERSION){
    const prepared=profile.preparedPortal;
    const checkpoint=profile.azuronProgress;
    const savedId=String(profile.worldSession?.mapId || "").replace(/^portal-/,"");
    const portalId=isFragmentPortal(prepared?.portalId) ? prepared.portalId
      : checkpoint ? String(checkpoint.portalId || "blue") : isFragmentPortal(savedId) ? savedId : "";
    if(!portalAttempt && portalId){
      portalAttempt=sanitizePortalAttempt({id:prepared?.id || checkpoint?.runId || `legacy-${portalId}`,
        portalId,lives:checkpoint?.lives || 3,phase:prepared ? "prepared" : "parked",invokedAt:prepared?.preparedAt || 0});
    }
    unlockedPortals=unlockedPortals.filter(id=>id!==portalAttempt?.portalId && !Number(profile.completedPortals?.[id] || 0));
  }
  return {portalAttemptsVersion:PORTAL_ATTEMPTS_VERSION,portalAttempt,unlockedPortals};
}
