import { addInventoryItemAmount } from "../economy/inventoryStacks.js";
import { WORLD_ENEMY_TYPES } from "../world/definitions.js";
import { AZURON_PORTAL_ID } from "./portalDefinitions.js";

export const AZURON_ENEMY_LEVEL = 10;
export const AZURON_TOTAL_WAVES = 20;
export const AZURON_WAVES_PER_BATCH = 4;
export const AZURON_WAVE_INTERVAL_MS = 10_000;
export const AZURON_LASER_ITEM_ID = "laser_mk4";
export const AZURON_REPEAT_LASER_DROP_CHANCE = 0.25;

const SPAWN_COLUMNS = [-1320, -660, 0, 660, 1320];

function getAzuronEnemyKind(wave, index){
  if(wave >= AZURON_TOTAL_WAVES) return "cuirasse_nebulaire";
  if(wave >= 13 && (wave + index) % 4 === 0) return "boss_drone_pirate";
  if(wave >= 5 && (wave + index) % 2 === 0) return "raider_astral";
  return "drone_pirate";
}

function getAzuronWaveEnemyCount(wave){
  if(wave >= AZURON_TOTAL_WAVES) return 1;
  return Math.min(5, 2 + Math.floor((Math.max(1, wave) - 1) / 6));
}

export function createAzuronEnemy(kind, wave, index, x, y, {boss = false, now = Date.now()} = {}){
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const batch = Math.ceil(Math.max(1, wave) / AZURON_WAVES_PER_BATCH);
  const durabilityMultiplier = boss ? 2 : 1 + (batch - 1) * 0.04;
  const attackMultiplier = boss ? 0.85 : 0.65 + (batch - 1) * 0.035;
  const hp = Math.max(1, Math.round(base.hp(AZURON_ENEMY_LEVEL) * durabilityMultiplier));
  const shield = Math.max(0, Math.round(base.shield(AZURON_ENEMY_LEVEL) * durabilityMultiplier));
  return {
    id:`AZ-${wave}-${index}-${now.toString(36)}`,
    serverControlled:true,
    azuronEnemy:true,
    azuronBoss:boss,
    kind:base.kind,
    type:boss ? "Gardien d’Azuron" : base.type,
    img:base.img,
    level:AZURON_ENEMY_LEVEL,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:Math.PI,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:Math.round(base.radius * (boss ? 1.18 : 1)),
    width:Math.round(base.width * (boss ? 1.2 : 1)),
    height:Math.round(base.height * (boss ? 1.2 : 1)),
    speed:base.speed(AZURON_ENEMY_LEVEL),
    attackRange:base.attackRange,
    attackDamage:Math.max(1, Math.round(base.attackDamage(AZURON_ENEMY_LEVEL) * attackMultiplier)),
    attackCooldown:base.attackCooldown,
    staggerFirstAttack:true,
    projectileSpeed:base.projectileSpeed || 600,
    particle:base.particle || base.color,
    onHitEffect:null,
    reward:base.reward(AZURON_ENEMY_LEVEL),
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0
  };
}

export function buildAzuronPortalWave(wave, now = Date.now()){
  const normalizedWave = Math.max(1, Math.min(AZURON_TOTAL_WAVES, Math.floor(Number(wave || 1))));
  const bossWave = normalizedWave === AZURON_TOTAL_WAVES;
  const count = getAzuronWaveEnemyCount(normalizedWave);
  return Array.from({length:count}, (_, index)=>{
    const column = SPAWN_COLUMNS[index % SPAWN_COLUMNS.length];
    const row = Math.floor(index / SPAWN_COLUMNS.length);
    const x = bossWave ? 0 : column;
    const y = -980 - row * 180 - (index % 2) * 90;
    return createAzuronEnemy(
      getAzuronEnemyKind(normalizedWave, index),
      normalizedWave,
      index + 1,
      x,
      y,
      {boss:bossWave, now}
    );
  });
}

export function grantAzuronLaserReward(profile, {random = Math.random} = {}){
  const previousCompletions = Math.max(0, Number(profile?.completedPortals?.[AZURON_PORTAL_ID] || 0));
  const firstClear = previousCompletions === 0;
  const awarded = firstClear || Number(random()) < AZURON_REPEAT_LASER_DROP_CHANCE;
  if(awarded) addInventoryItemAmount(profile, AZURON_LASER_ITEM_ID, 1);
  return {
    itemId:AZURON_LASER_ITEM_ID,
    awarded,
    firstClear,
    chance:firstClear ? 1 : AZURON_REPEAT_LASER_DROP_CHANCE
  };
}

export function createAzuronWaveRuntime({
  emitInstance,
  emitPortalComplete,
  buildWave = buildAzuronPortalWave,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = ()=>Date.now()
} = {}){
  const timersByInstance = new Map();

  function getTimerSet(instance){
    const id = String(instance?.id || "");
    if(!timersByInstance.has(id)) timersByInstance.set(id, new Set());
    return timersByInstance.get(id);
  }

  function cancel(instance){
    const id = String(instance?.id || "");
    const timers = timersByInstance.get(id);
    if(!timers) return;
    for(const timer of timers) clearTimeoutFn(timer);
    timersByInstance.delete(id);
  }

  function isCurrentAzuronInstance(group, instance){
    return group?.instance === instance
      && instance?.type === "portal"
      && instance?.portal?.id === AZURON_PORTAL_ID
      && !instance.completed;
  }

  function spawnWave(group, wave, {emit = true} = {}){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return false;
    const normalizedWave = Math.max(1, Math.min(AZURON_TOTAL_WAVES, Math.floor(Number(wave || 1))));
    instance.enemies = (instance.enemies || []).filter(enemy=>Number(enemy.hp || 0) > 0);
    instance.enemies.push(...buildWave(normalizedWave, now()));
    instance.wave = normalizedWave;
    instance.azuronBatchLastSpawned = normalizedWave;
    if(emit) emitInstance?.(group);
    return true;
  }

  function scheduleBatchRemainder(group, batchStart){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return;
    const batchEnd = Math.min(AZURON_TOTAL_WAVES, batchStart + AZURON_WAVES_PER_BATCH - 1);
    instance.azuronBatchStart = batchStart;
    instance.azuronBatchEnd = batchEnd;
    const scheduledAt = Number(now());
    instance.azuronScheduledWaves = [];
    for(let wave = batchStart + 1; wave <= batchEnd; wave += 1){
      const timerSet = getTimerSet(instance);
      const dueAt = scheduledAt + (wave - batchStart) * AZURON_WAVE_INTERVAL_MS;
      instance.azuronScheduledWaves.push({wave, dueAt});
      let timer = null;
      timer = setTimeoutFn(()=>{
        timerSet.delete(timer);
        if(timerSet.size === 0) timersByInstance.delete(String(instance.id || ""));
        if(!isCurrentAzuronInstance(group, instance)) return;
        instance.azuronScheduledWaves = (instance.azuronScheduledWaves || []).filter(entry=>entry.wave !== wave);
        instance.nextWaveAt = Number(instance.azuronScheduledWaves[0]?.dueAt || 0);
        instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : "clear_batch";
        spawnWave(group, wave);
      }, (wave - batchStart) * AZURON_WAVE_INTERVAL_MS);
      timer?.unref?.();
      timerSet.add(timer);
    }
    instance.nextWaveAt = Number(instance.azuronScheduledWaves[0]?.dueAt || 0);
    instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : "clear_batch";
  }

  function start(group, {emit = false} = {}){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return false;
    cancel(instance);
    instance.enemies = [];
    instance.wave = 0;
    instance.azuronBatchStart = 1;
    instance.azuronBatchEnd = AZURON_WAVES_PER_BATCH;
    instance.azuronBatchLastSpawned = 0;
    instance.azuronScheduledWaves = [];
    instance.nextWaveAt = 0;
    instance.waveState = "wave_countdown";
    spawnWave(group, 1, {emit});
    scheduleBatchRemainder(group, 1);
    return true;
  }

  function handleEnemyDeath(group){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return false;
    if((instance.enemies || []).some(enemy=>Number(enemy.hp || 0) > 0)){
      if(Number(instance.azuronBatchLastSpawned || 0) >= Number(instance.azuronBatchEnd || 0)){
        instance.waveState = "clear_batch";
      }
      return true;
    }
    if(Number(instance.azuronBatchLastSpawned || 0) < Number(instance.azuronBatchEnd || 0)){
      instance.waveState = "wave_countdown";
      return true;
    }
    if(Number(instance.azuronBatchEnd || 0) >= AZURON_TOTAL_WAVES){
      instance.nextWaveAt = 0;
      instance.waveState = "completed";
      cancel(instance);
      emitPortalComplete?.(group);
      return true;
    }
    const nextBatchStart = Number(instance.azuronBatchEnd || 0) + 1;
    spawnWave(group, nextBatchStart);
    scheduleBatchRemainder(group, nextBatchStart);
    return true;
  }

  return {cancel, handleEnemyDeath, spawnWave, start};
}
