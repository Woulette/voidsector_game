import { WORLD_ENEMY_TYPES } from "./definitions.js";
import { getFirmIdFromMapName, normalizeFirmId } from "../../../src/data/firms.js";

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
    recentHitTimer:enemy.recentHitTimer || 0
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

export function createWorldEnemy(map, index, rnd = Math.random, forcedKind = null){
  const kind = forcedKind || pickWeighted(map.enemyTypes, rnd);
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const level = randomLevel(map, rnd);
  const {x, y} = findWorldSpawn(map, rnd);
  const hp = base.hp(level);
  const shield = base.shield(level);
  return {
    id:`W-${map.id}-E${index}`,
    serverControlled:true,
    worldMapId:map.id,
    kind:base.kind,
    type:base.type,
    img:base.img,
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
    attackDamage:base.attackDamage(level),
    attackDamageMin:base.attackDamageMin,
    attackDamageMax:base.attackDamageMax,
    attackCooldown:base.attackCooldown,
    projectileSpeed:base.projectileSpeed || 600,
    particle:base.particle || base.color,
    onHitEffect:base.onHitEffect || null,
    reward:base.reward(level),
    nextAttackAt:0,
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    recentHitTimer:0,
    vx:0,
    vy:0,
    moving:false,
    wanderT:0,
    wanderX:x,
    wanderY:y,
    respawning:false
  };
}
