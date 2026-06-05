const XP_FIXED_NEXT_BY_LEVEL = {
  1:3000,
  2:12000,
  3:35000,
  4:51000,
  5:80000,
  6:113000,
  7:169000,
  8:220000,
  9:314000,
  10:580000,
  11:984000,
  12:1432000,
  13:2035000,
  14:2822000,
  15:3920000,
  16:5200000,
  17:6900000,
  18:9000000,
  19:12000000,
  20:16000000
};

export const PROTECTED_PLAYER_FIELDS = [
  "credits",
  "premium",
  "xp",
  "totalXp",
  "level",
  "xpNext",
  "skillPoints"
];

export function getXpNextForLevel(level = 1){
  const targetLevel = Math.max(1, Math.floor(Number(level || 1)));
  if(XP_FIXED_NEXT_BY_LEVEL[targetLevel]) return XP_FIXED_NEXT_BY_LEVEL[targetLevel];
  const previous = XP_FIXED_NEXT_BY_LEVEL[20];
  return Math.round(previous * Math.pow(1.18, targetLevel - 20));
}

export function normalizeProgressionPlayer(player = {}){
  const level = Math.max(1, Math.floor(Number(player.level || 1)));
  const xpNext = getXpNextForLevel(level);
  return {
    ...player,
    credits:Math.max(0, Math.round(Number(player.credits || 0))),
    premium:Math.max(0, Math.round(Number(player.premium || 0))),
    xp:Math.max(0, Math.min(xpNext, Math.round(Number(player.xp || 0)))),
    totalXp:Math.max(0, Math.round(Number(player.totalXp || 0))),
    level,
    xpNext,
    skillPoints:Math.max(0, Math.round(Number(player.skillPoints || 0)))
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
  const cost = Math.max(0, Math.round(Number(amount || 0)));
  const field = priceType === "premium" ? "premium" : "credits";
  if(cost <= 0) return {ok:true, player:next, field, cost};
  if(Number(next[field] || 0) < cost) return {ok:false, player:next, field, cost, reason:"Fonds insuffisants."};
  next[field] -= cost;
  return {ok:true, player:next, field, cost};
}
