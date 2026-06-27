import { enrichFirmSnapshot } from "./firmSnapshots.js";

export const FIRM_RANKING_BROADCAST_INTERVAL_MS = 10 * 60 * 1000;

let lastFirmRankingBroadcastAt = 0;

export function resetFirmRankingBroadcastThrottle(){
  lastFirmRankingBroadcastAt = 0;
}

export function emitThrottledFirmRanking({
  io,
  profileManager,
  snapshot,
  force = false,
  now = Date.now
} = {}){
  if(!io?.emit || !snapshot) return false;
  const currentTime = Math.max(0, Number(typeof now === "function" ? now() : Date.now()));
  if(!force
    && lastFirmRankingBroadcastAt > 0
    && currentTime - lastFirmRankingBroadcastAt < FIRM_RANKING_BROADCAST_INTERVAL_MS){
    return false;
  }
  lastFirmRankingBroadcastAt = currentTime;
  io.emit("firm:ranking", enrichFirmSnapshot(profileManager, snapshot));
  return true;
}

export function buildPersonalFirmSeasonSnapshot({
  firmWarManager,
  profileManager,
  playerKey = "",
  profile = null,
  player = null
} = {}){
  if(!firmWarManager || !playerKey) return null;
  const snapshot = enrichFirmSnapshot(profileManager, firmWarManager.snapshot({
    playerKey,
    profile,
    player
  }));
  return {
    generatedAt:snapshot.generatedAt,
    seasonStartedAt:snapshot.seasonStartedAt,
    seasonEndsAt:snapshot.seasonEndsAt,
    seasonObjectives:snapshot.seasonObjectives || [],
    personal:snapshot.personal || {key:String(playerKey)}
  };
}
