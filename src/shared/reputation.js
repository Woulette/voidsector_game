export const FRIENDLY_KILL_BASE_PENALTY = 1_000;
export const FRIENDLY_KILL_RESET_MS = 7 * 24 * 60 * 60 * 1_000;
export const OUTLAW_REPUTATION = -500_000;

export function normalizeReputation(value){
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(-Number.MAX_SAFE_INTEGER, Math.min(Number.MAX_SAFE_INTEGER, Math.round(numeric)))
    : 0;
}

export function isReputationOutlaw(player){
  return normalizeReputation(player?.reputation) <= OUTLAW_REPUTATION;
}

export function getReputationShopSurcharge(player){
  const debt = -normalizeReputation(player?.reputation);
  if(debt >= 400_000) return 50;
  if(debt >= 300_000) return 40;
  if(debt >= 200_000) return 30;
  if(debt >= 100_000) return 20;
  if(debt >= 10_000) return 10;
  return 0;
}

export function getNextFriendlyKillPenalty(player, now = Date.now()){
  const lastPenalty = Math.max(0, normalizeReputation(player?.friendlyFireLastPenalty));
  const lastAt = Math.max(0, normalizeReputation(player?.friendlyFireLastKillAt));
  if(!lastPenalty || now - lastAt >= FRIENDLY_KILL_RESET_MS) return FRIENDLY_KILL_BASE_PENALTY;
  return Math.min(Number.MAX_SAFE_INTEGER, lastPenalty * 2);
}

export function applyFriendlyKillPenalty(player, now = Date.now()){
  const penalty = getNextFriendlyKillPenalty(player, now);
  player.reputation = normalizeReputation(normalizeReputation(player.reputation) - penalty);
  player.friendlyFireLastPenalty = penalty;
  player.friendlyFireLastKillAt = Math.max(0, Math.floor(now));
  return {penalty, reputation:player.reputation, resetsAt:now + FRIENDLY_KILL_RESET_MS};
}
