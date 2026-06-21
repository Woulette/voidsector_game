import { getNovaDiscountedPrice, isPremiumActive } from "../../../src/data/premium.js";
import { getXpNextForLevel } from "../../../src/data/xpCurve.js";

export { getXpNextForLevel };

export const PROTECTED_PLAYER_FIELDS = [
  "name",
  "firmId",
  "firmSelected",
  "credits",
  "premium",
  "premiumUntil",
  "premiumActive",
  "xp",
  "totalXp",
  "level",
  "xpNext",
  "skillPoints",
  "reputation",
  "totalKills",
  "totalPlayerKills",
  "monsterRankPoints",
  "rankScore",
  "totalPlaySeconds",
  "laserShotsFired",
  "rocketShotsFired",
  "missileShotsFired"
];

export function getProgressionSnapshot(player = {}){
  const normalized = normalizeProgressionPlayer(player);
  return Object.fromEntries(PROTECTED_PLAYER_FIELDS.map(field=>[field, normalized[field]]));
}

export function normalizeProgressionPlayer(player = {}){
  let level = Math.max(1, Math.floor(Number(player.level || 1)));
  let xp = Math.max(0, Math.round(Number(player.xp || 0)));
  let skillPoints = Math.max(0, Math.round(Number(player.skillPoints || 0)));
  let xpNext = getXpNextForLevel(level);
  while(xp >= xpNext){
    xp -= xpNext;
    level += 1;
    skillPoints += 1;
    xpNext = getXpNextForLevel(level);
  }
  return {
    ...player,
    credits:Math.max(0, Math.round(Number(player.credits || 0))),
    premium:Math.max(0, Math.round(Number(player.premium || 0))),
    premiumUntil:Math.max(0, Number(player.premiumUntil || 0)),
    premiumActive:isPremiumActive(player),
    xp,
    totalXp:Math.max(0, Math.round(Number(player.totalXp || 0))),
    reputation:Math.max(0, Math.round(Number(player.reputation || 0))),
    totalKills:Math.max(0, Math.round(Number(player.totalKills || 0))),
    totalPlayerKills:Math.max(0, Math.round(Number(player.totalPlayerKills || 0))),
    monsterRankPoints:Math.max(0, Number(player.monsterRankPoints || 0)),
    rankScore:Math.max(0, Number(player.rankScore || 0)),
    totalPlaySeconds:Math.max(0, Number(player.totalPlaySeconds || 0)),
    laserShotsFired:Math.max(0, Math.floor(Number(player.laserShotsFired || 0))),
    rocketShotsFired:Math.max(0, Math.floor(Number(player.rocketShotsFired || 0))),
    missileShotsFired:Math.max(0, Math.floor(Number(player.missileShotsFired || 0))),
    level,
    xpNext,
    skillPoints
  };
}

export function preserveProtectedProgression({incomingPlayer = {}, existingPlayer = {}} = {}){
  const existing = normalizeProgressionPlayer(existingPlayer);
  return {
    ...incomingPlayer,
    ...Object.fromEntries(PROTECTED_PLAYER_FIELDS.map(field=>[field, existing[field]]))
  };
}

export function applyProgressionReward(player = {}, reward = {}){
  const next = normalizeProgressionPlayer(player);
  const credits = Math.max(0, Math.round(Number(reward.credits || 0)));
  const premium = Math.max(0, Math.round(Number(reward.premium || 0)));
  let xp = Math.max(0, Math.round(Number(reward.xp || 0)));
  next.credits += credits;
  next.premium += premium;
  next.totalXp += xp;
  next.xp += xp;
  while(next.xp >= next.xpNext){
    next.xp -= next.xpNext;
    next.level += 1;
    next.skillPoints += 1;
    next.xpNext = getXpNextForLevel(next.level);
  }
  return next;
}

export function spendCurrency(player = {}, priceType = "credits", amount = 0){
  const next = normalizeProgressionPlayer(player);
  const baseCost = Math.max(0, Math.round(Number(amount || 0)));
  const cost = priceType === "premium" ? getNovaDiscountedPrice(baseCost, next) : baseCost;
  const field = priceType === "premium" ? "premium" : "credits";
  if(cost <= 0) return {ok:true, player:next, field, cost};
  if(Number(next[field] || 0) < cost) return {ok:false, player:next, field, cost, reason:"Fonds insuffisants."};
  next[field] -= cost;
  return {ok:true, player:next, field, cost};
}
