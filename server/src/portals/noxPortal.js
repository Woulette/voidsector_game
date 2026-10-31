import { getInstanceGroups } from "./portalSessions.js";
import { applyDamageToEnemy } from "../combat/enemyHits.js";
import { createWorldEnemy, seededRandom } from "../world/spawn.js";
import { rollEnemyDamage } from "../../../src/shared/enemyDamage.js";
import {
  NOX_CORE_MAX_HP,
  NOX_DEFENSE_MAX_HP,
  NOX_KAMIKAZE_BLAST_RADIUS,
  NOX_PORTAL_ID,
  NOX_PORTAL_LEVEL,
  NOX_PORTAL_MAP,
  NOX_SHIELD_MAX_HP,
  NOX_WAVE_GROUP_SIZE,
  NOX_WAVE_TOTAL
} from "../../../src/data/noxPortal.js";

export {
  NOX_CORE_MAX_HP,
  NOX_DEFENSE_MAX_HP,
  NOX_KAMIKAZE_BLAST_RADIUS,
  NOX_PORTAL_ID,
  NOX_PORTAL_LEVEL,
  NOX_PORTAL_MAP,
  NOX_SHIELD_MAX_HP,
  NOX_WAVE_GROUP_SIZE,
  NOX_WAVE_TOTAL
};

export const NOX_TOTAL_WAVES = NOX_WAVE_TOTAL;
export const NOX_WAVE_INTERVAL_MS = 10_000;
export const NOX_TURRET_DAMAGE_MIN = 30_000;
export const NOX_TURRET_DAMAGE_MAX = 50_000;
export const NOX_TURRET_COOLDOWN_MS = 1_000;
export const NOX_SUMMON_COOLDOWN_MS = 20_000;
export const NOX_DRONES_PER_SUMMONER = 3;
export const NOX_DRONE_MAX_HP = 20_000;
export const NOX_DRONE_DAMAGE_MIN = 3_000;
export const NOX_DRONE_DAMAGE_MAX = 5_000;
export const NOX_DRONE_RANGE = 500;
export const NOX_DRONE_SPEED = 400;
export const NOX_KAMIKAZE_DAMAGE = 100_000;
export const NOX_BOSS_MAX_HP = 5_000_000;
export const NOX_BOSS_MAX_SHIELD = 5_000_000;

const EFFECT_RETENTION_MS = 1_200;
const NORMAL_PLAYER_PROXIMITY = 1_050;
const NORMAL_PLAYER_MEMORY_RANGE = 2_400;
const KAMIKAZE_SPEED = 520;
const KAMIKAZE_TRIGGER_DISTANCE = 80;
const INFRASTRUCTURE_ATTACK_RANGE = 220;
const NORMAL_KINDS = Object.freeze(["eclanite", "cristanite", "astranite"]);

function clamp(value, min, max){
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function rollBetween(min, max, random = Math.random){
  const low = Math.min(Number(min || 0), Number(max || min || 0));
  const high = Math.max(Number(min || 0), Number(max || min || 0));
  return low + random() * Math.max(0, high - low);
}

function living(entries){
  return (Array.isArray(entries) ? entries : []).filter(entry=>
    entry?.alive !== false && Number(entry?.hp || 0) > 0
  );
}

function noxEnemyMap(kind){
  return {
    id:`portal-${NOX_PORTAL_ID}`,
    width:NOX_PORTAL_MAP.width,
    height:NOX_PORTAL_MAP.height,
    enemyTypes:[[kind, 1]],
    level:[NOX_PORTAL_LEVEL, NOX_PORTAL_LEVEL]
  };
}

function prepareNoxEnemy(enemy){
  enemy.reward = {...(enemy.reward || {credits:0, xp:0, premium:0})};
  enemy.noReward = false;
  enemy.temporarySpawn = true;
  enemy.serverControlled = true;
  enemy.noxRuntimeControlled = true;
  enemy.worldMapId = `portal-${NOX_PORTAL_ID}`;
  return enemy;
}

function waveSpawnPoint(wave, index){
  const edge = (Math.max(1, Number(wave || 1)) + Math.max(0, Number(index || 0))) % 4;
  const spanX = NOX_PORTAL_MAP.width / 2 - 180;
  const spanY = NOX_PORTAL_MAP.height / 2 - 180;
  const lane = ((index * 719 + wave * 431) % 3200) - 1600;
  if(edge === 0) return {x:clamp(lane, -spanX + 200, spanX - 200), y:-spanY};
  if(edge === 1) return {x:spanX, y:clamp(lane, -spanY + 200, spanY - 200)};
  if(edge === 2) return {x:clamp(lane, -spanX + 200, spanX - 200), y:spanY};
  return {x:-spanX, y:clamp(lane, -spanY + 200, spanY - 200)};
}

function normalKindForWave(wave, index){
  if(wave <= 8) return NORMAL_KINDS[(wave + index) % 2];
  if(wave <= 18) return NORMAL_KINDS[(wave + index) % NORMAL_KINDS.length];
  return ["cristanite", "astranite", "eclanite"][(wave + index) % 3];
}

function normalCountForWave(wave){
  return Math.min(8, 3 + Math.floor((Math.max(1, Number(wave || 1)) - 1) / 5));
}

function kamikazeCountForWave(wave){
  if(wave >= NOX_WAVE_TOTAL) return 0;
  if(wave % 5 === 0) return 2;
  return wave % 3 === 0 ? 1 : 0;
}

export function createNoxEnemy(kind, wave, index, position, now = Date.now()){
  const seed = Math.max(1, Number(wave || 1) * 10_000 + Number(index || 1) * 137);
  const enemy = createWorldEnemy(
    noxEnemyMap(kind),
    seed,
    seededRandom(seed + Math.floor(Number(now || 0))),
    kind,
    {
      id:`NOX-${wave}-${index}-${Number(now || 0).toString(36)}`,
      level:NOX_PORTAL_LEVEL,
      x:Number(position?.x || 0),
      y:Number(position?.y || 0),
      temporarySpawn:true
    }
  );
  return prepareNoxEnemy({
    ...enemy,
    noxEnemy:true,
    noxWave:Number(wave || 1),
    followBeforeAttacked:true,
    requiresPlayerAttack:false,
    targetMemoryMs:8_000
  });
}

export function createNoxKamikaze(wave, index, position, now = Date.now()){
  const enemy = createNoxEnemy("raider_astral", wave, index, position, now);
  const hp = Math.max(1, Math.round(45_000 + Math.max(0, Number(wave || 1) - 1) * 1_500));
  return {
    ...enemy,
    type:"Kamikaze de Nox",
    hp,
    maxHp:hp,
    shield:0,
    maxShield:0,
    speed:KAMIKAZE_SPEED,
    attackRange:0,
    attackDamage:0,
    nextAttackAt:Infinity,
    radius:42,
    width:110,
    height:110,
    color:"rgba(239,68,68,.98)",
    particle:"rgba(251,146,60,.88)",
    noxKamikaze:true,
    noxBlastRadius:NOX_KAMIKAZE_BLAST_RADIUS,
    noxBlastDamage:NOX_KAMIKAZE_DAMAGE
  };
}

export function createNoxBoss(position = waveSpawnPoint(NOX_WAVE_TOTAL, 0), now = Date.now()){
  const enemy = createNoxEnemy("astranite", NOX_WAVE_TOTAL, 1, position, now);
  return {
    ...enemy,
    id:`NOX-BOSS-${Number(now || 0).toString(36)}`,
    type:"Dévoreur de station",
    hp:NOX_BOSS_MAX_HP,
    maxHp:NOX_BOSS_MAX_HP,
    shield:NOX_BOSS_MAX_SHIELD,
    maxShield:NOX_BOSS_MAX_SHIELD,
    radius:135,
    width:310,
    height:310,
    speed:285,
    attackRange:300,
    attackDamage:75_000,
    attackDamageMin:60_000,
    attackDamageMax:90_000,
    useExactDamageRange:true,
    attackCooldown:1_000,
    color:"rgba(139,92,246,.98)",
    particle:"rgba(196,181,253,.86)",
    noxBoss:true,
    noxFocusInfrastructure:true
  };
}

export function buildNoxPortalWave(wave, now = Date.now()){
  const safeWave = Math.max(1, Math.min(NOX_WAVE_TOTAL, Math.floor(Number(wave || 1))));
  if(safeWave === NOX_WAVE_TOTAL) return [createNoxBoss(waveSpawnPoint(safeWave, 0), now)];
  const result = [];
  const normalCount = normalCountForWave(safeWave);
  for(let index = 0; index < normalCount; index += 1){
    result.push(createNoxEnemy(
      normalKindForWave(safeWave, index),
      safeWave,
      index + 1,
      waveSpawnPoint(safeWave, index),
      now
    ));
  }
  for(let index = 0; index < kamikazeCountForWave(safeWave); index += 1){
    result.push(createNoxKamikaze(
      safeWave,
      normalCount + index + 1,
      waveSpawnPoint(safeWave, normalCount + index),
      now
    ));
  }
  return result;
}

export function createNoxDefenseState(startedAt = Date.now()){
  return NOX_PORTAL_MAP.defenses.map(definition=>({
    ...definition,
    hp:NOX_DEFENSE_MAX_HP,
    maxHp:NOX_DEFENSE_MAX_HP,
    alive:true,
    nextAttackAt:Number(startedAt || 0),
    nextSummonAt:Number(startedAt || 0),
    dronesAlive:0
  }));
}

export function createNoxObjective(startedAt = Date.now()){
  const station = NOX_PORTAL_MAP.station;
  return {
    kind:"nox",
    stage:"defense",
    phase:"waves",
    wave:0,
    waveTotal:NOX_WAVE_TOTAL,
    waveState:"preparing",
    waveBatchEnd:NOX_WAVE_GROUP_SIZE,
    batchEnd:NOX_WAVE_GROUP_SIZE,
    nextWaveAt:0,
    shield:{
      id:"nox_station_shield",
      x:station.x,
      y:station.y,
      radius:NOX_PORTAL_MAP.shieldRadius,
      hp:NOX_SHIELD_MAX_HP,
      maxHp:NOX_SHIELD_MAX_HP,
      alive:true
    },
    core:{
      id:"nox_station_core",
      x:station.x,
      y:station.y,
      radius:NOX_PORTAL_MAP.coreRadius,
      hp:NOX_CORE_MAX_HP,
      maxHp:NOX_CORE_MAX_HP,
      alive:true
    },
    defenses:createNoxDefenseState(startedAt),
    drones:[],
    droneSequence:0,
    effectSequence:0,
    attackEvents:[],
    recentEffects:[],
    failedAt:0,
    completedAt:0,
    failureReason:""
  };
}

export function isNoxPortalInstance(instance){
  return Boolean(
    instance?.type === "portal"
    && String(instance?.portal?.id || "") === NOX_PORTAL_ID
  );
}

function getInfrastructureTarget(objective, targetOrId){
  const id = String(typeof targetOrId === "object" ? targetOrId?.id : targetOrId || "");
  if(id === String(objective?.core?.id || "")) return objective.core;
  return (objective?.defenses || []).find(defense=>String(defense.id || "") === id) || null;
}

export function applyNoxInfrastructureDamage(instance, targetOrId, amount){
  const objective = instance?.objective;
  const target = getInfrastructureTarget(objective, targetOrId);
  let incoming = Math.max(0, Number(amount || 0));
  if(!objective || objective.kind !== "nox" || !target || target.alive === false || Number(target.hp || 0) <= 0){
    return {absorbed:0, applied:0, remaining:incoming, target:null};
  }
  const shield = objective.shield;
  const absorbed = shield && Number(shield.hp || 0) > 0
    ? Math.min(Number(shield.hp || 0), incoming)
    : 0;
  if(absorbed > 0){
    shield.hp = Math.max(0, Number(shield.hp || 0) - absorbed);
    shield.alive = shield.hp > 0;
    incoming -= absorbed;
  }
  const before = Math.max(0, Number(target.hp || 0));
  if(incoming > 0){
    target.hp = Math.max(0, before - incoming);
    target.alive = target.hp > 0;
  }
  return {
    absorbed,
    applied:Math.max(0, before - Number(target.hp || 0)),
    remaining:Math.max(0, incoming - before),
    target
  };
}

function pushEffect(objective, effect, at = Date.now()){
  objective.effectSequence = Number(objective.effectSequence || 0) + 1;
  const entry = {
    id:`nox-fx-${objective.effectSequence}`,
    durationMs:effect.durationMs || 650,
    ...effect,
    at:Number(at || Date.now())
  };
  objective.attackEvents.push(entry);
  objective.recentEffects = objective.attackEvents;
  return entry;
}

function pruneEffects(objective, at){
  objective.attackEvents = (objective.attackEvents || []).filter(effect=>
    Number(at || 0) - Number(effect?.at || 0) <= EFFECT_RETENTION_MS
  );
  objective.recentEffects = objective.attackEvents;
}

function infrastructureInRadius(objective, point, radius){
  return [objective?.core, ...(objective?.defenses || [])].filter(target=>
    target?.alive !== false
    && Number(target?.hp || 0) > 0
    && Math.hypot(Number(target.x || 0) - point.x, Number(target.y || 0) - point.y) <= radius
  );
}

export function chooseNoxKamikazeImpactPoint(instance, source = null){
  const objective = instance?.objective;
  const candidates = living([objective?.core, ...(objective?.defenses || [])]);
  let best = candidates[0] || objective?.core || {x:0, y:0};
  let bestScore = -1;
  let bestDistance = Infinity;
  for(const candidate of candidates){
    const score = infrastructureInRadius(objective, candidate, NOX_KAMIKAZE_BLAST_RADIUS).length;
    const distance = source
      ? Math.hypot(Number(candidate.x || 0) - Number(source.x || 0), Number(candidate.y || 0) - Number(source.y || 0))
      : 0;
    if(score > bestScore || (score === bestScore && distance < bestDistance)){
      best = candidate;
      bestScore = score;
      bestDistance = distance;
    }
  }
  return {x:Number(best.x || 0), y:Number(best.y || 0), targetId:String(best.id || "")};
}

export function explodeNoxKamikaze(instance, enemy, at = Date.now()){
  const objective = instance?.objective;
  if(!objective || objective.kind !== "nox" || !enemy?.noxKamikaze || Number(enemy.hp || 0) <= 0) return null;
  const point = chooseNoxKamikazeImpactPoint(instance, enemy);
  const shield = objective.shield;
  const shieldBefore = Math.max(0, Number(shield?.hp || 0));
  const absorbed = Math.min(shieldBefore, NOX_KAMIKAZE_DAMAGE);
  if(shield && absorbed > 0){
    shield.hp = shieldBefore - absorbed;
    shield.alive = shield.hp > 0;
  }
  const overflow = Math.max(0, NOX_KAMIKAZE_DAMAGE - absorbed);
  const affected = infrastructureInRadius(objective, point, NOX_KAMIKAZE_BLAST_RADIUS);
  const damagePerTarget = shieldBefore > 0 ? overflow : NOX_KAMIKAZE_DAMAGE;
  if(damagePerTarget > 0){
    for(const target of affected){
      target.hp = Math.max(0, Number(target.hp || 0) - damagePerTarget);
      target.alive = target.hp > 0;
    }
  }
  enemy.noReward = true;
  enemy.hp = 0;
  enemy.shield = 0;
  enemy.moving = false;
  enemy.vx = 0;
  enemy.vy = 0;
  return pushEffect(objective, {
    type:"nox_kamikaze_explosion",
    x:point.x,
    y:point.y,
    radius:NOX_KAMIKAZE_BLAST_RADIUS,
    damage:NOX_KAMIKAZE_DAMAGE,
    shieldAbsorbed:absorbed,
    affectedIds:affected.map(target=>target.id),
    from:{x:Number(enemy.x || 0), y:Number(enemy.y || 0)},
    to:{x:point.x, y:point.y},
    durationMs:900
  }, at);
}

function publicVital(value){
  if(!value) return null;
  return {
    id:String(value.id || ""),
    x:Number(value.x || 0),
    y:Number(value.y || 0),
    hp:Math.max(0, Number(value.hp || 0)),
    maxHp:Math.max(1, Number(value.maxHp || 1)),
    alive:value.alive !== false && Number(value.hp || 0) > 0
  };
}

export function publicNoxObjective(instance, currentTime = Date.now()){
  if(!isNoxPortalInstance(instance) || instance?.objective?.kind !== "nox") return null;
  const objective = instance.objective;
  const enemies = living(instance.enemies);
  const boss = enemies.find(enemy=>enemy.noxBoss) || null;
  const events = (objective.attackEvents || []).filter(event=>
    Number(currentTime || 0) - Number(event?.at || 0) <= EFFECT_RETENTION_MS
  ).map(event=>({...event}));
  return {
    kind:"nox",
    stage:String(objective.stage || "defense"),
    phase:String(objective.phase || "waves"),
    wave:Number(instance.wave || objective.wave || 0),
    waveTotal:NOX_WAVE_TOTAL,
    waveState:String(instance.waveState || objective.waveState || ""),
    waveBatchEnd:Number(instance.waveBatchEnd || objective.waveBatchEnd || 0),
    batchEnd:Number(instance.waveBatchEnd || objective.batchEnd || 0),
    nextWaveAt:Number(instance.nextWaveAt || objective.nextWaveAt || 0),
    nextWaveDelayMs:Math.max(0, Number(instance.nextWaveAt || objective.nextWaveAt || 0) - Number(currentTime || 0)),
    shield:publicVital(objective.shield),
    core:publicVital(objective.core),
    defenses:(objective.defenses || []).map(defense=>({
      ...publicVital(defense),
      type:String(defense.type || ""),
      angle:Number(defense.angle || 0),
      dronesAlive:living(objective.drones).filter(drone=>drone.ownerId === defense.id).length
    })),
    drones:living(objective.drones).map(drone=>({
      ...publicVital(drone),
      ownerId:String(drone.ownerId || ""),
      angle:Number(drone.angle || 0)
    })),
    enemiesRemaining:enemies.length,
    kamikazesRemaining:enemies.filter(enemy=>enemy.noxKamikaze).length,
    boss:boss ? {
      ...publicVital(boss),
      shield:Math.max(0, Number(boss.shield || 0)),
      maxShield:Math.max(0, Number(boss.maxShield || 0))
    } : null,
    recentEffects:events,
    attackEvents:events,
    failedAt:Math.max(0, Number(objective.failedAt || 0)),
    completedAt:Math.max(0, Number(objective.completedAt || 0)),
    at:Number(currentTime || Date.now())
  };
}

function moveEntity(entity, point, speed, dt, stopRange = 0){
  const dx = Number(point.x || 0) - Number(entity.x || 0);
  const dy = Number(point.y || 0) - Number(entity.y || 0);
  const distance = Math.hypot(dx, dy);
  if(distance <= Math.max(0, stopRange)){
    entity.vx = 0;
    entity.vy = 0;
    entity.moving = false;
    return distance;
  }
  const nx = dx / Math.max(1, distance);
  const ny = dy / Math.max(1, distance);
  const step = Math.min(Math.max(0, distance - stopRange), Math.max(0, speed) * Math.max(0, dt));
  entity.x = clamp(Number(entity.x || 0) + nx * step, -NOX_PORTAL_MAP.width / 2 + 60, NOX_PORTAL_MAP.width / 2 - 60);
  entity.y = clamp(Number(entity.y || 0) + ny * step, -NOX_PORTAL_MAP.height / 2 + 60, NOX_PORTAL_MAP.height / 2 - 60);
  entity.vx = nx * speed;
  entity.vy = ny * speed;
  entity.angle = Math.atan2(ny, nx) + Math.PI / 2;
  entity.moving = step > 0;
  return Math.max(0, distance - step);
}

function applyDirectDamage(target, amount){
  const before = Math.max(0, Number(target?.hp || 0));
  if(!target || before <= 0) return 0;
  target.hp = Math.max(0, before - Math.max(0, Number(amount || 0)));
  target.alive = target.hp > 0;
  return before - target.hp;
}

export function createNoxPortalRuntime({
  groups,
  players = new Map(),
  presence,
  launchEnemyAttack,
  emitInstance,
  emitPortalComplete,
  failPortal,
  buildWave = buildNoxPortalWave,
  random = Math.random,
  now = ()=>Date.now()
} = {}){
  function isCurrent(group, instance = group?.instance){
    return Boolean(
      group?.instance === instance
      && isNoxPortalInstance(instance)
      && !instance.completed
      && !instance.noxFailed
    );
  }

  function syncObjective(instance){
    const objective = instance.objective;
    objective.wave = Number(instance.wave || 0);
    objective.waveState = String(instance.waveState || "");
    objective.waveBatchEnd = Number(instance.waveBatchEnd || 0);
    objective.batchEnd = Number(instance.waveBatchEnd || 0);
    objective.nextWaveAt = Number(instance.nextWaveAt || 0);
  }

  function spawnWave(group, wave, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const safeWave = Math.max(1, Math.min(NOX_WAVE_TOTAL, Math.floor(Number(wave || 1))));
    instance.enemies = (instance.enemies || []).filter(enemy=>Number(enemy.hp || 0) > 0);
    instance.enemies.push(...buildWave(safeWave, at));
    instance.wave = safeWave;
    instance.noxLastSpawnedWave = safeWave;
    if(safeWave < Number(instance.waveBatchEnd || safeWave)){
      instance.nextWaveAt = Number(at) + NOX_WAVE_INTERVAL_MS;
      instance.waveState = "wave_countdown";
    }else{
      instance.nextWaveAt = 0;
      instance.waveState = "clear_batch";
    }
    syncObjective(instance);
    emitInstance?.(group);
    return true;
  }

  function beginBatch(group, startWave, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const safeStart = Math.max(1, Math.min(NOX_WAVE_TOTAL, Math.floor(Number(startWave || 1))));
    instance.waveBatchEnd = Math.min(NOX_WAVE_TOTAL, safeStart + NOX_WAVE_GROUP_SIZE - 1);
    instance.noxLastSpawnedWave = safeStart - 1;
    instance.nextWaveAt = 0;
    instance.waveState = "wave_countdown";
    return spawnWave(group, safeStart, at);
  }

  function summonDroneBatch(instance, defense, at){
    const objective = instance.objective;
    const ownedLiving = living(objective.drones).filter(drone=>drone.ownerId === defense.id);
    defense.dronesAlive = ownedLiving.length;
    if(ownedLiving.length > 0 || at < Number(defense.nextSummonAt || 0)) return false;
    for(let index = 0; index < NOX_DRONES_PER_SUMMONER; index += 1){
      objective.droneSequence = Number(objective.droneSequence || 0) + 1;
      const angle = Math.PI * 2 * index / NOX_DRONES_PER_SUMMONER + Number(defense.angle || 0);
      objective.drones.push({
        id:`NOX-DR-${objective.droneSequence}`,
        ownerId:defense.id,
        x:Number(defense.x || 0) + Math.cos(angle) * 90,
        y:Number(defense.y || 0) + Math.sin(angle) * 90,
        angle,
        hp:NOX_DRONE_MAX_HP,
        maxHp:NOX_DRONE_MAX_HP,
        alive:true,
        nextAttackAt:at,
        speed:NOX_DRONE_SPEED
      });
    }
    defense.dronesAlive = NOX_DRONES_PER_SUMMONER;
    defense.nextSummonAt = at + NOX_SUMMON_COOLDOWN_MS;
    pushEffect(objective, {
      type:"nox_drone_summon",
      x:defense.x,
      y:defense.y,
      from:{x:defense.x, y:defense.y},
      to:{x:defense.x, y:defense.y},
      ownerId:defense.id
    }, at);
    return true;
  }

  function preferredDefenseTarget(enemies, source){
    return [...enemies].sort((left, right)=>{
      const priority = enemy=>enemy.noxKamikaze ? 0 : enemy.noxBoss ? 1 : 2;
      const delta = priority(left) - priority(right);
      if(delta) return delta;
      return Math.hypot(left.x - source.x, left.y - source.y)
        - Math.hypot(right.x - source.x, right.y - source.y);
    })[0] || null;
  }

  function updateDefenses(instance, dt, at){
    const objective = instance.objective;
    let changed = false;
    for(const defense of objective.defenses){
      if(defense.alive === false || Number(defense.hp || 0) <= 0) continue;
      if(defense.type === "summoner"){
        if(summonDroneBatch(instance, defense, at)) changed = true;
        continue;
      }
      const currentEnemies = living(instance.enemies);
      if(at < Number(defense.nextAttackAt || 0) || currentEnemies.length <= 0) continue;
      const target = preferredDefenseTarget(currentEnemies, defense);
      const range = defense.type === "missile" ? 1_650 : 1_300;
      if(!target || Math.hypot(target.x - defense.x, target.y - defense.y) > range) continue;
      const damage = Math.round(rollBetween(NOX_TURRET_DAMAGE_MIN, NOX_TURRET_DAMAGE_MAX, random));
      applyDamageToEnemy(target, damage);
      defense.nextAttackAt = at + NOX_TURRET_COOLDOWN_MS;
      pushEffect(objective, {
        type:defense.type === "missile" ? "nox_missile_attack" : "nox_laser_attack",
        from:{x:defense.x, y:defense.y},
        to:{x:target.x, y:target.y},
        x:target.x,
        y:target.y,
        sourceId:defense.id,
        targetId:target.id,
        damage
      }, at);
      changed = true;
    }
    return changed;
  }

  function updateDrones(instance, dt, at){
    const objective = instance.objective;
    for(const drone of living(objective.drones)){
      const target = preferredDefenseTarget(living(instance.enemies), drone);
      if(!target){
        const owner = objective.defenses.find(defense=>defense.id === drone.ownerId);
        if(owner) moveEntity(drone, owner, NOX_DRONE_SPEED, dt, 120);
        continue;
      }
      const distance = moveEntity(drone, target, NOX_DRONE_SPEED, dt, NOX_DRONE_RANGE * .72);
      if(distance > NOX_DRONE_RANGE || at < Number(drone.nextAttackAt || 0)) continue;
      const damage = Math.round(rollBetween(NOX_DRONE_DAMAGE_MIN, NOX_DRONE_DAMAGE_MAX, random));
      applyDamageToEnemy(target, damage);
      drone.nextAttackAt = at + 1_000;
      pushEffect(objective, {
        type:"nox_drone_attack",
        from:{x:drone.x, y:drone.y},
        to:{x:target.x, y:target.y},
        x:target.x,
        y:target.y,
        sourceId:drone.id,
        targetId:target.id,
        damage
      }, at);
    }
    objective.drones = living(objective.drones);
    for(const defense of objective.defenses){
      defense.dronesAlive = living(objective.drones).filter(drone=>drone.ownerId === defense.id).length;
    }
  }

  function portalPlayers(group, instance, at){
    const joined = new Set(
      (Array.isArray(instance.joinedMemberIds) ? instance.joinedMemberIds : group.members || []).map(String)
    );
    return [...joined]
      .map(id=>players.get(id))
      .filter(player=>player?.state && Number(player.state.hp || 0) > 0)
      .filter(player=>String(player.state.mapId || player.mapId || "") === `portal-${NOX_PORTAL_ID}`)
      .filter(player=>typeof presence?.isActiveForWorld !== "function" || presence.isActiveForWorld(player, at));
  }

  function infrastructureTarget(objective, enemy, boss = false){
    if(boss && objective.core?.alive !== false && Number(objective.core?.hp || 0) > 0) return objective.core;
    const defenses = living(objective.defenses);
    if(defenses.length){
      return defenses.sort((left, right)=>
        Math.hypot(left.x - enemy.x, left.y - enemy.y)
        - Math.hypot(right.x - enemy.x, right.y - enemy.y)
      )[0];
    }
    return objective.core?.alive !== false && Number(objective.core?.hp || 0) > 0 ? objective.core : null;
  }

  function normalEnemyTarget(group, instance, enemy, at){
    const drones = living(instance.objective.drones);
    if(drones.length){
      return {
        kind:"drone",
        value:drones.sort((left, right)=>
          Math.hypot(left.x - enemy.x, left.y - enemy.y)
          - Math.hypot(right.x - enemy.x, right.y - enemy.y)
        )[0]
      };
    }
    const candidates = portalPlayers(group, instance, at);
    const attacked = candidates.find(player=>String(player.id || "") === String(enemy.attackedPlayerId || ""));
    if(attacked && Math.hypot(attacked.state.x - enemy.x, attacked.state.y - enemy.y) <= NORMAL_PLAYER_MEMORY_RANGE){
      return {kind:"player", value:attacked};
    }
    const nearest = candidates
      .map(player=>({
        player,
        distance:Math.hypot(player.state.x - enemy.x, player.state.y - enemy.y)
      }))
      .sort((left, right)=>left.distance - right.distance)[0];
    if(nearest && nearest.distance <= NORMAL_PLAYER_PROXIMITY) return {kind:"player", value:nearest.player};
    return {kind:"infrastructure", value:infrastructureTarget(instance.objective, enemy)};
  }

  function attackInfrastructure(instance, enemy, target, at){
    const amount = rollEnemyDamage(enemy.attackDamage, random);
    const result = applyNoxInfrastructureDamage(instance, target, amount);
    pushEffect(instance.objective, {
      type:enemy.noxBoss ? "nox_boss_impact" : "nox_enemy_attack",
      from:{x:enemy.x, y:enemy.y},
      to:{x:target.x, y:target.y},
      x:target.x,
      y:target.y,
      sourceId:enemy.id,
      targetId:target.id,
      damage:amount,
      shieldAbsorbed:result.absorbed
    }, at);
  }

  function updateEnemy(group, instance, enemy, dt, at){
    if(Number(enemy.hp || 0) <= 0) return;
    enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - Math.max(0, Number(dt || 0)));
    if(enemy.noxKamikaze){
      const point = chooseNoxKamikazeImpactPoint(instance, enemy);
      const distance = moveEntity(enemy, point, KAMIKAZE_SPEED, dt, KAMIKAZE_TRIGGER_DISTANCE);
      if(distance <= KAMIKAZE_TRIGGER_DISTANCE) explodeNoxKamikaze(instance, enemy, at);
      return;
    }
    const targetDescriptor = enemy.noxBoss
      ? {kind:"infrastructure", value:infrastructureTarget(instance.objective, enemy, true)}
      : normalEnemyTarget(group, instance, enemy, at);
    const target = targetDescriptor.value;
    if(!target) return;
    const targetState = targetDescriptor.kind === "player" ? target.state : target;
    const attackRange = targetDescriptor.kind === "infrastructure"
      ? Math.max(INFRASTRUCTURE_ATTACK_RANGE, Number(enemy.attackRange || 0))
      : Number(enemy.attackRange || 320);
    const distance = moveEntity(enemy, targetState, Number(enemy.speed || 200), dt, attackRange * .82);
    if(distance > attackRange || at < Number(enemy.nextAttackAt || 0)) return;
    const cooldown = Math.max(500, Number(enemy.attackCooldown || 1_000));
    enemy.nextAttackAt = at + cooldown;
    if(targetDescriptor.kind === "player"){
      const amount = rollEnemyDamage(enemy.attackDamage, random);
      launchEnemyAttack?.({
        enemy,
        map:{
          id:`portal-${NOX_PORTAL_ID}`,
          room:`instance:${instance.id}`,
          width:NOX_PORTAL_MAP.width,
          height:NOX_PORTAL_MAP.height
        },
        target,
        amount,
        now:at,
        attackStyle:"nox_assault"
      });
      return;
    }
    if(targetDescriptor.kind === "drone"){
      const damage = rollEnemyDamage(enemy.attackDamage, random);
      applyDirectDamage(target, damage);
      pushEffect(instance.objective, {
        type:"nox_enemy_drone_attack",
        from:{x:enemy.x, y:enemy.y},
        to:{x:target.x, y:target.y},
        x:target.x,
        y:target.y,
        sourceId:enemy.id,
        targetId:target.id,
        damage
      }, at);
      return;
    }
    attackInfrastructure(instance, enemy, target, at);
  }

  function fail(group, reason, at){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || Number(instance.objective?.failedAt || 0) > 0) return false;
    const objective = instance.objective;
    objective.stage = "failed";
    objective.phase = "failed";
    objective.failedAt = Number(at || now());
    objective.failureReason = String(reason || "Le noyau de la station a été détruit.");
    instance.waveState = "failed";
    instance.nextWaveAt = 0;
    instance.noxFailed = true;
    syncObjective(instance);
    emitInstance?.(group);
    failPortal?.(group, {
      code:"NOX_CORE_DESTROYED",
      reason:objective.failureReason,
      at:objective.failedAt
    });
    return true;
  }

  function complete(group, at){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || Number(instance.objective?.completedAt || 0) > 0) return false;
    instance.objective.stage = "complete";
    instance.objective.phase = "complete";
    instance.objective.completedAt = Number(at || now());
    instance.waveState = "completed";
    instance.nextWaveAt = 0;
    syncObjective(instance);
    emitPortalComplete?.(group);
    return true;
  }

  function advanceIfCleared(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    if(Number(instance.objective?.core?.hp || 0) <= 0) return fail(group, "Le noyau de la station a été détruit.", at);
    if(living(instance.enemies).length > 0) return false;
    if(Number(instance.noxLastSpawnedWave || 0) < Number(instance.waveBatchEnd || 0)){
      instance.waveState = "wave_countdown";
      syncObjective(instance);
      return false;
    }
    if(Number(instance.waveBatchEnd || 0) >= NOX_WAVE_TOTAL) return complete(group, at);
    return beginBatch(group, Number(instance.waveBatchEnd || 0) + 1, at);
  }

  function updateGroup(group, dt = .05, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const objective = instance.objective;
    pruneEffects(objective, at);
    let changed = false;
    while(instance.nextWaveAt > 0 && at >= Number(instance.nextWaveAt || 0)){
      const dueAt = Number(instance.nextWaveAt || at);
      const nextWave = Number(instance.noxLastSpawnedWave || 0) + 1;
      if(nextWave > Number(instance.waveBatchEnd || 0)){
        instance.nextWaveAt = 0;
        instance.waveState = "clear_batch";
        break;
      }
      spawnWave(group, nextWave, dueAt);
      changed = true;
    }
    changed = updateDefenses(instance, dt, at) || changed;
    updateDrones(instance, dt, at);
    for(const enemy of living(instance.enemies)) updateEnemy(group, instance, enemy, dt, at);
    objective.drones = living(objective.drones);
    if(Number(objective.core?.hp || 0) <= 0){
      fail(group, "Le noyau de la station a été détruit.", at);
      return true;
    }
    if(advanceIfCleared(group, at)) changed = true;
    return changed;
  }

  function start(group, {emit = true} = {}){
    const instance = group?.instance;
    if(!isNoxPortalInstance(instance) || instance.completed) return false;
    const at = Number(now());
    instance.enemies = [];
    instance.wave = 0;
    instance.noxFailed = false;
    instance.objective = createNoxObjective(at);
    const started = beginBatch(group, 1, at);
    if(started && !emit){
      // beginBatch already emitted the authoritative initial wave.
    }
    return started;
  }

  function handleEnemyDeath(group, enemy, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || Number(enemy?.hp || 0) > 0) return false;
    return advanceIfCleared(group, at) || true;
  }

  function updateNoxEncounters(dt, at = now()){
    for(const group of getInstanceGroups(groups)){
      if(isCurrent(group)) updateGroup(group, dt, at);
    }
  }

  function cancel(instance){
    if(!isNoxPortalInstance(instance)) return false;
    instance.nextWaveAt = 0;
    return true;
  }

  return {
    advanceIfCleared,
    beginBatch,
    cancel,
    handleEnemyDeath,
    spawnWave,
    start,
    updateGroup,
    updateNoxEncounters
  };
}
