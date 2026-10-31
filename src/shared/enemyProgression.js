export const MONSTER_LEVEL_STEP = 5;
export const MONSTER_TIER_GROWTH = 0.5;

export const ENEMY_REFERENCE_LEVELS = Object.freeze({
  drone_pirate:1,
  raider_astral:4,
  chasseur_spectral:9,
  cuirasse_nebulaire:10,
  eclanite:14,
  pondeuse_astrale:15,
  cuirasse_ambre:19,
  cristanite:20,
  astranite:24
});

const SECTOR_TOP_ENEMIES = Object.freeze({
  1:"raider_astral",
  5:"chasseur_spectral",
  10:"eclanite",
  15:"cuirasse_ambre",
  20:"astranite",
  25:"cuirasse_nebulaire"
});

export function getBaseEnemyKind(kind){
  return String(kind || "drone_pirate").replace(/^boss_/, "");
}

export function getEnemyReferenceLevel(kind){
  return ENEMY_REFERENCE_LEVELS[getBaseEnemyKind(kind)] || 1;
}

export function getSectorEnemyLevel(kind, range){
  const minimum = Math.max(1, Math.floor(Number(range?.[0]) || getEnemyReferenceLevel(kind)));
  const maximum = Math.max(minimum, Math.floor(Number(range?.[1]) || minimum));
  return getBaseEnemyKind(kind) === SECTOR_TOP_ENEMIES[minimum] ? maximum : minimum;
}

export function getMonsterTierMultiplier(baseLevel, level){
  const reference = Math.max(1, Math.floor(Number(baseLevel) || 1));
  const current = Math.max(1, Math.floor(Number(level) || reference));
  // The first sector starts at 1; subsequent steps start at 5, 10, 15, etc.
  // A sector's strongest mob keeps its base stats in the following sector.
  const anchor = reference === 1 ? 0 : Math.ceil(reference / MONSTER_LEVEL_STEP) * MONSTER_LEVEL_STEP;
  const tiers = Math.max(0, Math.floor((current - anchor) / MONSTER_LEVEL_STEP));
  return 1 + tiers * MONSTER_TIER_GROWTH;
}

export function scaleMonsterStat(baseValue, baseLevel, level){
  return Math.round(Math.max(0, Number(baseValue) || 0) * getMonsterTierMultiplier(baseLevel, level));
}

export function scaleMonsterReward(baseReward = {}, baseLevel, level){
  return Object.fromEntries(Object.entries(baseReward).map(([key, value])=>[
    key, scaleMonsterStat(value, baseLevel, level)
  ]));
}
