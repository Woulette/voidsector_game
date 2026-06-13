export const MONSTER_STAT_GROWTH_PER_LEVEL = 0.05;
export const MONSTER_REWARD_GROWTH_PER_LEVEL = 0.10;

function levelDifference(level, baseLevel){
  return Math.max(0, Math.floor(Number(level || 1)) - Math.max(1, Math.floor(Number(baseLevel || 1))));
}

export function scaleMonsterStat(baseValue, baseLevel, level){
  const value = Math.max(0, Number(baseValue || 0));
  return Math.round(value * (1 + levelDifference(level, baseLevel) * MONSTER_STAT_GROWTH_PER_LEVEL));
}

export function scaleMonsterReward(baseReward = {}, baseLevel, level){
  const multiplier = 1 + levelDifference(level, baseLevel) * MONSTER_REWARD_GROWTH_PER_LEVEL;
  return Object.fromEntries(Object.entries(baseReward || {}).map(([key, value])=>[
    key,
    Math.max(0, Math.round(Number(value || 0) * multiplier))
  ]));
}
