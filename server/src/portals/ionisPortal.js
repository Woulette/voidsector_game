import { createWorldEnemy, seededRandom } from "../world/spawn.js";

export const IONIS_PORTAL_ID = "ionis";
export const IONIS_PORTAL_LEVEL = 25;
export const IONIS_TOTAL_WAVES = 40;
export const IONIS_WAVES_PER_GROUP = 4;
export const IONIS_WAVE_INTERVAL_MS = 10_000;
export const IONIS_ELITE_WAVE = 40;
export const IONIS_ELITE_DURABILITY_MULTIPLIER = 1.75;
export const IONIS_ELITE_DAMAGE_MULTIPLIER = 1.4;

const SPAWN_COLUMNS = Object.freeze([-1_500, -1_000, -500, 0, 500, 1_000, 1_500]);

function ionisMapForEnemy(kind){
  return {
    id:`portal-${IONIS_PORTAL_ID}`,
    width:5_200,
    height:3_600,
    enemyTypes:[[kind, 1]],
    level:[IONIS_PORTAL_LEVEL, IONIS_PORTAL_LEVEL]
  };
}

function getIonisWaveKinds(wave){
  if(wave === IONIS_ELITE_WAVE) return ["cuirasse_ambre", "cristanite", "eclanite"];
  if(wave <= 8) return ["chasseur_spectral", "cuirasse_nebulaire"];
  if(wave <= 20) return ["cuirasse_nebulaire", "pondeuse_astrale", "eclanite"];
  if(wave <= 36) return ["pondeuse_astrale", "eclanite", "cristanite"];
  return ["eclanite", "cristanite", "cuirasse_ambre"];
}

function getIonisWaveEnemyCount(wave){
  if(wave === IONIS_ELITE_WAVE) return 7;
  return Math.min(7, 3 + Math.floor((Math.max(1, Number(wave || 1)) - 1) / 8));
}

export function createIonisEnemy(kind, wave, index, x, y, now = Date.now()){
  const seed = Math.max(1, Number(wave || 1) * 1_000 + Number(index || 1) * 113);
  const enemy = createWorldEnemy(
    ionisMapForEnemy(kind),
    seed,
    seededRandom(Math.max(1, Number(now || 1) + seed)),
    kind,
    {
      id:`IO-${wave}-${index}-${Number(now || 0).toString(36)}`,
      level:IONIS_PORTAL_LEVEL,
      x,
      y,
      temporarySpawn:true
    }
  );
  const elite = Number(wave) === IONIS_ELITE_WAVE;
  const durabilityMultiplier = elite ? IONIS_ELITE_DURABILITY_MULTIPLIER : 1;
  const damageMultiplier = elite ? IONIS_ELITE_DAMAGE_MULTIPLIER : 1;
  const hp = Math.max(1, Math.round(Number(enemy.hp || 1) * durabilityMultiplier));
  const shield = Math.max(0, Math.round(Number(enemy.shield || 0) * durabilityMultiplier));
  const attackDamageMin = Number.isFinite(Number(enemy.attackDamageMin))
    ? Math.max(1, Math.round(Number(enemy.attackDamageMin) * damageMultiplier))
    : undefined;
  const attackDamageMax = Number.isFinite(Number(enemy.attackDamageMax))
    ? Math.max(1, Math.round(Number(enemy.attackDamageMax) * damageMultiplier))
    : undefined;
  return {
    ...enemy,
    ionisEnemy:true,
    ionisElite:elite,
    ionisWave:Number(wave || 1),
    type:elite ? `Elite ionique - ${enemy.type}` : enemy.type,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    attackDamage:Math.max(1, Math.round(Number(enemy.attackDamage || 1) * damageMultiplier)),
    attackDamageMin,
    attackDamageMax,
    radius:elite ? Math.round(Number(enemy.radius || 30) * 1.12) : enemy.radius,
    width:elite ? Math.round(Number(enemy.width || 80) * 1.12) : enemy.width,
    height:elite ? Math.round(Number(enemy.height || 80) * 1.12) : enemy.height,
    worldMapId:`portal-${IONIS_PORTAL_ID}`,
    reward:{...(enemy.reward || {credits:0, xp:0, premium:0})},
    noReward:false
  };
}

export function buildIonisPortalWave(wave, now = Date.now()){
  const normalizedWave = Math.max(1, Math.min(IONIS_TOTAL_WAVES, Math.floor(Number(wave || 1))));
  const kinds = getIonisWaveKinds(normalizedWave);
  const count = getIonisWaveEnemyCount(normalizedWave);
  return Array.from({length:count}, (_, index)=>{
    const x = SPAWN_COLUMNS[index % SPAWN_COLUMNS.length];
    const row = Math.floor(index / SPAWN_COLUMNS.length);
    return createIonisEnemy(
      kinds[(normalizedWave + index) % kinds.length],
      normalizedWave,
      index + 1,
      x,
      -1_050 - row * 180 - (index % 2) * 80,
      now
    );
  });
}

export function createIonisObjective(){
  return {
    kind:"ionis",
    stage:"waves",
    wave:0,
    waveTotal:IONIS_TOTAL_WAVES,
    waveState:"wave_countdown",
    waveBatchEnd:IONIS_WAVES_PER_GROUP,
    nextWaveAt:0,
    eliteWave:false,
    eliteWaveNumber:IONIS_ELITE_WAVE,
    completedAt:0
  };
}

export function isIonisPortalInstance(instance){
  return Boolean(
    instance?.type === "portal"
    && String(instance?.portal?.id || "") === IONIS_PORTAL_ID
  );
}

export function publicIonisObjective(instance, currentTime = Date.now()){
  if(!isIonisPortalInstance(instance) || instance?.objective?.kind !== "ionis") return null;
  const objective = instance.objective;
  return {
    at:Number(currentTime || 0),
    kind:"ionis",
    stage:String(objective.stage || "waves"),
    wave:Number(instance.wave || objective.wave || 0),
    waveTotal:IONIS_TOTAL_WAVES,
    waveState:String(instance.waveState || objective.waveState || ""),
    waveBatchEnd:Number(instance.waveBatchEnd || objective.waveBatchEnd || 0),
    nextWaveAt:Number(instance.nextWaveAt || objective.nextWaveAt || 0),
    nextWaveDelayMs:Math.max(
      0,
      Number(instance.nextWaveAt || objective.nextWaveAt || 0) - Number(currentTime || 0)
    ),
    eliteWave:Number(instance.wave || objective.wave || 0) === IONIS_ELITE_WAVE,
    eliteWaveNumber:IONIS_ELITE_WAVE,
    completedAt:Number(objective.completedAt || 0)
  };
}

export function createIonisWaveRuntime({
  emitInstance,
  emitPortalComplete,
  buildWave = buildIonisPortalWave,
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

  function isCurrent(group, instance){
    return group?.instance === instance
      && isIonisPortalInstance(instance)
      && !instance.completed;
  }

  function syncObjective(instance){
    if(!instance.objective || instance.objective.kind !== "ionis"){
      instance.objective = createIonisObjective();
    }
    instance.objective.wave = Number(instance.wave || 0);
    instance.objective.waveState = String(instance.waveState || "");
    instance.objective.waveBatchEnd = Number(instance.waveBatchEnd || 0);
    instance.objective.nextWaveAt = Number(instance.nextWaveAt || 0);
    instance.objective.eliteWave = Number(instance.wave || 0) === IONIS_ELITE_WAVE;
  }

  function spawnWave(group, wave, {emit = true} = {}){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const normalizedWave = Math.max(1, Math.min(IONIS_TOTAL_WAVES, Math.floor(Number(wave || 1))));
    instance.enemies = (instance.enemies || []).filter(enemy=>Number(enemy.hp || 0) > 0);
    instance.enemies.push(...buildWave(normalizedWave, now()));
    instance.wave = normalizedWave;
    instance.ionisLastSpawnedWave = normalizedWave;
    syncObjective(instance);
    if(emit) emitInstance?.(group);
    return true;
  }

  function scheduleGroupRemainder(group, groupStart){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return;
    const groupEnd = Math.min(IONIS_TOTAL_WAVES, groupStart + IONIS_WAVES_PER_GROUP - 1);
    instance.ionisGroupStart = groupStart;
    instance.ionisGroupEnd = groupEnd;
    instance.waveBatchEnd = groupEnd;
    instance.ionisScheduledWaves = [];
    const scheduledAt = Number(now());
    for(let wave = groupStart + 1; wave <= groupEnd; wave += 1){
      const timerSet = getTimerSet(instance);
      const dueAt = scheduledAt + (wave - groupStart) * IONIS_WAVE_INTERVAL_MS;
      instance.ionisScheduledWaves.push({wave, dueAt});
      let timer = null;
      timer = setTimeoutFn(()=>{
        timerSet.delete(timer);
        if(timerSet.size === 0) timersByInstance.delete(String(instance.id || ""));
        if(!isCurrent(group, instance)) return;
        instance.ionisScheduledWaves = (instance.ionisScheduledWaves || [])
          .filter(entry=>Number(entry.wave) !== wave);
        instance.nextWaveAt = Number(instance.ionisScheduledWaves[0]?.dueAt || 0);
        instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : "clear_batch";
        spawnWave(group, wave);
      }, (wave - groupStart) * IONIS_WAVE_INTERVAL_MS);
      timer?.unref?.();
      timerSet.add(timer);
    }
    instance.nextWaveAt = Number(instance.ionisScheduledWaves[0]?.dueAt || 0);
    instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : "clear_batch";
    syncObjective(instance);
  }

  function beginGroup(group, groupStart, {emit = true} = {}){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const normalizedStart = Math.max(1, Math.min(IONIS_TOTAL_WAVES, Math.floor(Number(groupStart || 1))));
    instance.ionisGroupStart = normalizedStart;
    instance.ionisGroupEnd = Math.min(
      IONIS_TOTAL_WAVES,
      normalizedStart + IONIS_WAVES_PER_GROUP - 1
    );
    instance.waveBatchEnd = instance.ionisGroupEnd;
    instance.ionisLastSpawnedWave = normalizedStart - 1;
    instance.ionisScheduledWaves = [];
    instance.nextWaveAt = 0;
    instance.waveState = "wave_countdown";
    spawnWave(group, normalizedStart, {emit: false});
    scheduleGroupRemainder(group, normalizedStart);
    if(emit) emitInstance?.(group);
    return true;
  }

  function start(group, {emit = false} = {}){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    cancel(instance);
    instance.enemies = [];
    instance.wave = 0;
    instance.objective = createIonisObjective();
    return beginGroup(group, 1, {emit});
  }

  function handleEnemyDeath(group){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    if((instance.enemies || []).some(enemy=>Number(enemy.hp || 0) > 0)){
      if(Number(instance.ionisLastSpawnedWave || 0) >= Number(instance.ionisGroupEnd || 0)){
        instance.waveState = "clear_batch";
        syncObjective(instance);
      }
      return true;
    }
    if(Number(instance.ionisLastSpawnedWave || 0) < Number(instance.ionisGroupEnd || 0)){
      instance.waveState = "wave_countdown";
      syncObjective(instance);
      return true;
    }
    if(Number(instance.ionisGroupEnd || 0) >= IONIS_TOTAL_WAVES){
      instance.nextWaveAt = 0;
      instance.waveState = "completed";
      instance.objective.stage = "complete";
      instance.objective.completedAt = Number(now());
      syncObjective(instance);
      cancel(instance);
      emitPortalComplete?.(group);
      return true;
    }
    beginGroup(group, Number(instance.ionisGroupEnd || 0) + 1);
    return true;
  }

  return {
    cancel,
    handleEnemyDeath,
    spawnWave,
    start
  };
}
