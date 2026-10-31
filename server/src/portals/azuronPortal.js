import { addInventoryItemAmount } from "../economy/inventoryStacks.js";
import { WORLD_ENEMY_TYPES } from "../world/definitions.js";
import { AZURON_PORTAL_ID } from "./portalDefinitions.js";
import { scaleMonsterReward, scaleMonsterStat } from "../world/enemyProgression.js";
import { getEnemyDamageRange } from "../../../src/shared/enemyDamage.js";
import { getWavePortalTier,isWavePortal } from "../../../src/data/wavePortalTiers.js";
import {
  AZURON_ENEMY_LEVEL, AZURON_TOTAL_WAVES, AZURON_WAVES_PER_BATCH,
  AZURON_WAVE_INTERVAL_MS, AZURON_INTERMISSION_MS,
  AZURON_STATIONARY_RING_RADIUS_MIN, AZURON_STATIONARY_RING_RADIUS_MAX,
  getAzuronWaveDefinition, getAzuronSpawnPositions, getAzuronStageGates
} from "../../../src/data/azuronPortal.js";

export { AZURON_ENEMY_LEVEL, AZURON_TOTAL_WAVES, AZURON_WAVES_PER_BATCH, AZURON_WAVE_INTERVAL_MS, AZURON_INTERMISSION_MS };
export const AZURON_LASER_ITEM_ID = "laser_mk4";
export const AZURON_REPEAT_LASER_DROP_CHANCE = 0.25;

export function publicAzuronObjective(instance){
  if(!isWavePortal(instance?.portal) || instance.objective?.kind !== "azuron") return null;
  const objective = instance.objective;
  return {kind:"azuron", batchReady:Boolean(objective.batchReady), nextWave:Number(objective.nextWave || 0),
    completed:Boolean(instance.completed), saveError:Boolean(objective.saveError),
    gates:objective.batchReady ? getAzuronStageGates({nextWave:objective.nextWave,completed:instance.completed,portalId:instance.portal.id}) : []};
}

function levelTenStat(value, baseLevel){
  return scaleMonsterStat(value, baseLevel, AZURON_ENEMY_LEVEL);
}

export function createAzuronEnemy(kind, wave, index, x, y, {now = Date.now(), runId = "", portalId = "blue"} = {}){
  const base = WORLD_ENEMY_TYPES[kind] || WORLD_ENEMY_TYPES.drone_pirate;
  const tier=getWavePortalTier(portalId) || getWavePortalTier("blue");
  const baseLevel = Math.max(1, Number(base.baseLevel || 1));
  const stat = value=>Math.round(levelTenStat(value, baseLevel)*tier.multiplier);
  const hp = Math.max(1, stat(base.hp(baseLevel)));
  const shield = Math.max(0, stat(base.shield(baseLevel)));
  const attackDamage = Math.max(1, stat(base.attackDamage(baseLevel)));
  return {
    id:`AZ-${wave}-${index}-${runId || now.toString(36)}`,
    ...(runId ? {azuronRunId:runId, azuronWave:wave, azuronIndex:index} : {}),
    serverControlled:true,
    azuronEnemy:true,
    azuronPortalId:tier.id,
    permanentAggro:true,
    // A stable, varied distance per monster avoids a perfectly uniform circle.
    stationaryRingRadius:AZURON_STATIONARY_RING_RADIUS_MIN
      + (wave * 5 + index * 7) % (AZURON_STATIONARY_RING_RADIUS_MAX - AZURON_STATIONARY_RING_RADIUS_MIN + 1),
    azuronBoss:false,
    kind:base.kind,
    type:base.type,
    img:base.img,
    level:tier.level,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:0,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:base.radius,
    width:base.width,
    height:base.height,
    speed:base.speed(AZURON_ENEMY_LEVEL),
    attackRange:base.attackRange,
    attackDamage,
    ...getEnemyDamageRange(attackDamage),
    useExactDamageRange:true,
    attackCooldown:base.attackCooldown,
    staggerFirstAttack:true,
    projectileSpeed:base.projectileSpeed || 600,
    particle:base.particle || base.color,
    onHitEffect:null,
    reward:Object.fromEntries(Object.entries(scaleMonsterReward(base.reward(baseLevel), baseLevel, AZURON_ENEMY_LEVEL))
      .map(([key,value])=>[key,value*tier.multiplier])),
    color:base.color,
    shieldAbsorbRatio:base.shieldAbsorbRatio,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0
  };
}

export function buildAzuronPortalWave(wave, now = Date.now(), spawnContext = {}){
  const definition = getAzuronWaveDefinition(wave);
  const defeated = new Set(spawnContext.defeated || []);
  return getAzuronSpawnPositions(wave).flatMap(({x, y}, index)=>{
    if(defeated.has(`${definition.wave}:${index+1}`)) return [];
    const enemy = createAzuronEnemy(definition.kind, definition.wave, index + 1, x, y, {now,runId:spawnContext.runId,portalId:spawnContext.portalId});
    enemy.angle = Math.atan2(-y, -x);
    return enemy;
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
    guaranteed:firstClear,
    chance:firstClear ? 1 : AZURON_REPEAT_LASER_DROP_CHANCE
  };
}

export function createAzuronWaveRuntime({
  emitInstance,
  emitPortalComplete,
  onBatchReady,
  buildWave = buildAzuronPortalWave,
  getSpawnContext = ()=>({}),
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
      && isWavePortal(instance?.portal)
      && !instance.completed;
  }

  function spawnWave(group, wave, {emit = true} = {}){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return false;
    const normalizedWave = Math.max(1, Math.min(AZURON_TOTAL_WAVES, Math.floor(Number(wave || 1))));
    instance.enemies = (instance.enemies || []).filter(enemy=>Number(enemy.hp || 0) > 0);
    instance.enemies.push(...buildWave(normalizedWave, now(), {
      ...getSpawnContext(group),portalId:instance.portal.id,runId:instance.azuronRunId || "",defeated:instance.azuronDefeated || []
    }));
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
        handleEnemyDeath(group);
      }, (wave - batchStart) * AZURON_WAVE_INTERVAL_MS);
      timer?.unref?.();
      timerSet.add(timer);
    }
    instance.nextWaveAt = Number(instance.azuronScheduledWaves[0]?.dueAt || 0);
    instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : "clear_batch";
  }

  function start(group, {emit = false, progress = null} = {}){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return false;
    cancel(instance);
    instance.enemies = [];
    instance.wave = 0;
    const firstWave = Math.max(1, Math.min(AZURON_TOTAL_WAVES, Number(progress?.nextWave || 1)));
    instance.azuronRunId = String(progress?.runId || "");
    instance.azuronDefeated = [...(progress?.defeated || [])];
    instance.azuronBatchStart = firstWave;
    instance.azuronBatchEnd = Math.min(AZURON_TOTAL_WAVES,firstWave+AZURON_WAVES_PER_BATCH-1);
    instance.azuronBatchLastSpawned = 0;
    instance.azuronScheduledWaves = [];
    instance.nextWaveAt = 0;
    instance.waveState = "wave_countdown";
    instance.objective = {kind:"azuron",batchReady:false,nextWave:0,gates:[]};
    spawnWave(group, firstWave, {emit:false});
    scheduleBatchRemainder(group, firstWave);
    if(emit) emitInstance?.(group);
    return true;
  }

  function handleEnemyDeath(group){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group, instance)) return false;
    if(instance.waveState === "batch_ready" || instance.waveState === "completed") return true;
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
      instance.objective = {kind:"azuron",batchReady:true,nextWave:0,completed:true,gates:getAzuronStageGates({completed:true,portalId:instance.portal.id})};
      cancel(instance);
      emitPortalComplete?.(group);
      return true;
    }
    const nextBatchStart = Number(instance.azuronBatchEnd || 0) + 1;
    cancel(instance);
    instance.waveState = "batch_ready";
    instance.nextWaveAt = 0;
    instance.objective = {kind:"azuron",batchReady:true,nextWave:nextBatchStart,
      gates:getAzuronStageGates({nextWave:nextBatchStart,portalId:instance.portal.id})};
    onBatchReady?.(group,nextBatchStart);
    emitInstance?.(group);
    return true;
  }

  function continueBatch(group){
    const instance = group?.instance;
    if(!isCurrentAzuronInstance(group,instance) || instance.waveState !== "batch_ready") return false;
    const nextWave = Number(instance.objective?.nextWave || 0);
    if(nextWave < 1 || nextWave > AZURON_TOTAL_WAVES) return false;
    instance.azuronDefeated = [];
    instance.objective = {kind:"azuron",batchReady:false,nextWave:0,gates:[]};
    spawnWave(group,nextWave,{emit:false});
    scheduleBatchRemainder(group,nextWave);
    emitInstance?.(group);
    return true;
  }

  return {cancel, handleEnemyDeath, spawnWave, start, continueBatch};
}
