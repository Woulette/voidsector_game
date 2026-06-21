import { WORLD_ENEMY_TYPES } from "./definitions.js";
import { getFirmIdFromMapName, normalizeFirmId } from "../../../src/data/firms.js";
import { scaleMonsterReward, scaleMonsterStat } from "./enemyProgression.js";

export function publicEnemy(enemy){
  return {
    id:enemy.id,
    serverControlled:true,
    kind:enemy.kind,
    type:enemy.type,
    img:enemy.img,
    level:enemy.level,
    x:enemy.x,
    y:enemy.y,
    vx:enemy.vx || 0,
    vy:enemy.vy || 0,
    angle:enemy.angle || 0,
    hp:enemy.hp,
    maxHp:enemy.maxHp,
    shield:enemy.shield,
    maxShield:enemy.maxShield,
    radius:enemy.radius,
    width:enemy.width,
    height:enemy.height,
    speed:enemy.speed || 0,
    moving:Boolean(enemy.moving),
    aggro:Boolean(enemy.lockedPlayerId),
    idle:!enemy.lockedPlayerId && !enemy.moving && Math.hypot(Number(enemy.vx || 0), Number(enemy.vy || 0)) < 4,
    color:enemy.color,
    particle:enemy.particle,
    projectileSpeed:enemy.projectileSpeed || 600,
    attackT:Math.max(0, Number(enemy.attackAnimUntil || 0) - Date.now()) / 1000,
    recentHitTimer:enemy.recentHitTimer || 0,
    renderMode:enemy.renderMode || "",
    static:Boolean(enemy.static)
  };
}

export function seededRandom(seed){
  let value = Math.max(1, Math.floor(Number(seed || 1))) % 2147483647;
  return ()=>{
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function pickWeighted(entries, rnd){
  const total = entries.reduce((sum, entry)=>sum + Number(entry[1] || 0), 0) || 1;
  let roll = rnd() * total;
  for(const entry of entries){
    roll -= Number(entry[1] || 0);
    if(roll <= 0) return entry[0];
  }
  return entries[entries.length - 1]?.[0] || "drone_pirate";
}

export function randomLevel(map, rnd){
  const min = Math.floor(Number(map.level?.[0] || 1));
  const max = Math.floor(Number(map.level?.[1] || min));
  return Math.floor(min + rnd() * (max - min + 1));
}

export function getWorldSafePortals(map){
  return [
    ...(Array.isArray(map?.portals) ? map.portals : []),
    ...(map?.portal ? [map.portal] : []),
    ...(Array.isArray(map?.closedPortals) ? map.closedPortals : [])
  ];
}

export function isPointInWorldSafeArea(point, map, padding = 0){
  if(!point || !map) return false;
  const x = Number(point.x || 0);
  const y = Number(point.y || 0);
  const spawn = map.spawn;
  if(spawn){
    const rect = spawn.safeRect;
    if(rect){
      if(x >= Number(rect.minX) - padding
        && x <= Number(rect.maxX) + padding
        && y >= Number(rect.minY) - padding
        && y <= Number(rect.maxY) + padding){
        return true;
      }
    } else {
      const radius = Number(spawn.safeRadius || spawn.r || 320) + padding;
      if(Math.hypot(x - Number(spawn.x || 0), y - Number(spawn.y || 0)) <= radius) return true;
    }
  }
  for(const portal of getWorldSafePortals(map)){
    const radius = Number(portal.safeRadius || Math.max(330, Number(portal.r || 90) * 3.5)) * 1.95 + padding;
    if(Math.hypot(x - Number(portal.x || 0), y - Number(portal.y || 0)) <= radius) return true;
  }
  return false;
}

export function isPointInFriendlyWorldSafeArea(point, map, firmId, padding = 0){
  const territoryFirmId = map?.firmId || getFirmIdFromMapName(map?.name);
  if(territoryFirmId && normalizeFirmId(territoryFirmId) !== normalizeFirmId(firmId)) return false;
  return isPointInWorldSafeArea(point, map, padding);
}

export function findWorldSpawn(map, rnd){
  for(let tries = 0; tries < 120; tries++){
    const x = rnd() * map.width - map.width / 2;
    const y = rnd() * map.height - map.height / 2;
    if(isPointInWorldSafeArea({x, y}, map, 620)) continue;
    return {x, y};
  }
  return {x:0, y:0};
}

export function createWorldEnemy(map, index, rnd = Math.random, forcedKind = null, options = {}){
  const kind = forcedKind || pickWeighted(map.enemyTypes, rnd);
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const forcedLevel = Number(options.level);
  const level = Number.isFinite(forcedLevel)
    ? Math.max(1, Math.floor(forcedLevel))
    : randomLevel(map, rnd);
  const baseLevel = Math.max(1, Math.floor(Number(base.baseLevel || 1)));
  const statSource = WORLD_ENEMY_TYPES[base.statSourceKind] || base;
  const statSourceBaseLevel = Math.max(1, Math.floor(Number(statSource.baseLevel || 1)));
  const statMultiplier = Math.max(0, Number(base.statMultiplier || 1));
  const generatedSpawn = findWorldSpawn(map, rnd);
  const x = Number.isFinite(Number(options.x)) ? Number(options.x) : generatedSpawn.x;
  const y = Number.isFinite(Number(options.y)) ? Number(options.y) : generatedSpawn.y;
  const hp = Math.round(scaleMonsterStat(statSource.hp(statSourceBaseLevel), statSourceBaseLevel, level) * statMultiplier);
  const shieldGrowthPerLevel = Number(base.shieldGrowthPerLevel);
  const shield = Number.isFinite(shieldGrowthPerLevel)
    ? Math.round(base.shield(baseLevel) * (1 + Math.max(0, level - baseLevel) * shieldGrowthPerLevel))
    : scaleMonsterStat(base.shield(baseLevel), baseLevel, level);
  const attackDamage = Math.round(scaleMonsterStat(statSource.attackDamage(statSourceBaseLevel), statSourceBaseLevel, level) * statMultiplier);
  const attackDamageMin = statSource.attackDamageMin === undefined
    ? undefined
    : Math.round(scaleMonsterStat(statSource.attackDamageMin, statSourceBaseLevel, level) * statMultiplier);
  const attackDamageMax = statSource.attackDamageMax === undefined
    ? undefined
    : Math.round(scaleMonsterStat(statSource.attackDamageMax, statSourceBaseLevel, level) * statMultiplier);
  const onHitEffect = base.onHitEffect
    ? {...base.onHitEffect, damage:scaleMonsterStat(base.onHitEffect.damage, baseLevel, level)}
    : null;
  const rewardSource = WORLD_ENEMY_TYPES[base.rewardSourceKind] || base;
  const rewardSourceBaseLevel = Math.max(1, Math.floor(Number(rewardSource.baseLevel || 1)));
  const rewardMultiplier = Math.max(0, Number(base.rewardMultiplier || 1));
  const reward = Object.fromEntries(Object.entries(
    scaleMonsterReward(rewardSource.reward(rewardSourceBaseLevel), rewardSourceBaseLevel, level)
  ).map(([key, value])=>[key, Math.round(Number(value || 0) * rewardMultiplier)]));
  return {
    id:options.id || `W-${map.id}-E${index}`,
    serverControlled:true,
    worldMapId:map.id,
    kind:base.kind,
    type:base.type,
    img:base.img,
    baseLevel,
    level,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:rnd() * Math.PI * 2,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:base.radius,
    width:base.width,
    height:base.height,
    speed:base.speed(level),
    attackRange:base.attackRange,
    attackDamage,
    attackDamageMin,
    attackDamageMax,
    useExactDamageRange:Boolean(base.useExactDamageRange),
    attackCooldown:base.attackCooldown,
    projectileSpeed:base.projectileSpeed || 600,
    particle:base.particle || base.color,
    onHitEffect,
    requiresPlayerAttack:Boolean(base.requiresPlayerAttack),
    followBeforeAttacked:Boolean(base.followBeforeAttacked),
    targetMemoryMs:Math.max(0, Number(base.targetMemoryMs || 0)),
    deathEffect:base.deathEffect ? {...base.deathEffect} : null,
    deathSpawn:base.deathSpawn ? {...base.deathSpawn} : null,
    reward,
    nextAttackAt:0,
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    recentHitTimer:0,
    vx:0,
    vy:0,
    moving:false,
    damageThreat:{},
    threatRecalcAt:0,
    wanderT:0,
    wanderX:x,
    wanderY:y,
    respawning:false,
    temporarySpawn:Boolean(options.temporarySpawn),
    spawnedBy:options.spawnedBy || null
  };
}
