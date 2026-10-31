import { getInstanceGroups } from "./portalSessions.js";
import { createWorldEnemy, seededRandom } from "../world/spawn.js";
import { WORLD_ENEMY_TYPES } from "../world/definitions.js";

export const KHARON_PORTAL_ID = "red";
export const KHARON_PORTAL_LEVEL = 20;
export const KHARON_TOTAL_WAVES = 30;
export const KHARON_WAVE_INTERVAL_MS = 10_000;
export const KHARON_BOSS_DAMAGE_MIN = 3_500;
export const KHARON_BOSS_DAMAGE_MAX = 5_000;
export const KHARON_BOSS_RANGE = 450;
export const KHARON_BOSS_SPEED = 330;
export const KHARON_BOMB_MIN_DELAY_MS = 30_000;
export const KHARON_BOMB_MAX_DELAY_MS = 60_000;
export const KHARON_BOMB_CHARGE_MS = 3_000;
export const KHARON_BOMB_RADIUS = 500;
export const KHARON_BOMB_DAMAGE = 30_000;
export const KHARON_POISON_RADIUS = 300;
export const KHARON_POISON_PULSE_COUNT = 5;
export const KHARON_POISON_PULSE_INTERVAL_MS = 2_500;
export const KHARON_POISON_PULSE_DURATION_MS = 1_000;
export const KHARON_POISON_DAMAGE = 10_000;
export const KHARON_POISON_DURATION_MS = 10_000;
export const KHARON_POISON_TICK_MS = 1_000;
export const KHARON_SPECTRAL_CHARGE_MS = 3_000;

export const KHARON_PORTAL_MAP = Object.freeze({
  width:5_200,
  height:3_600,
  spawn:Object.freeze({x:0, y:1_250})
});

export const KHARON_WAVE_SEGMENTS = Object.freeze([
  Object.freeze({start:1, end:5, kind:"waves"}),
  Object.freeze({start:6, end:9, kind:"waves"}),
  Object.freeze({start:10, end:10, kind:"boss"}),
  Object.freeze({start:11, end:15, kind:"waves"}),
  Object.freeze({start:16, end:19, kind:"waves"}),
  Object.freeze({start:20, end:20, kind:"boss"}),
  Object.freeze({start:21, end:25, kind:"waves"}),
  Object.freeze({start:26, end:29, kind:"waves"}),
  Object.freeze({start:30, end:30, kind:"boss"})
]);

const SPAWN_COLUMNS = Object.freeze([-1_550, -1_000, -500, 0, 500, 1_000, 1_550]);

const BOSS_DEFINITIONS = Object.freeze({
  10:Object.freeze({
    shipId:"vesperion",
    name:"Vesperion de Kharon",
    img:"assets/ships/combat/Vesperion.png",
    hp:700_000,
    shield:500_000,
    width:222,
    height:222,
    abilityId:"absorbing_fire",
    rewardSourceKind:"cuirasse_nebulaire"
  }),
  20:Object.freeze({
    shipId:"nyxaris",
    name:"Nyxaris de Kharon",
    img:"assets/ships/combat/Nyxaris.png",
    hp:700_000,
    shield:500_000,
    width:192,
    height:216,
    abilityId:"poison_bomb",
    rewardSourceKind:"cuirasse_ambre"
  }),
  30:Object.freeze({
    shipId:"asterion",
    name:"Asterion de Kharon",
    img:"assets/ships/combat/Asterion.png",
    hp:1_000_000,
    shield:1_000_000,
    width:183,
    height:198,
    abilityId:"spectral_double_shot",
    rewardSourceKind:"cristanite"
  })
});

const BOSS_ABILITY_TIMINGS = Object.freeze({
  absorbing_fire:Object.freeze({durationMs:20_000, cooldownMs:180_000}),
  poison_bomb:Object.freeze({durationMs:10_000, cooldownMs:180_000}),
  spectral_double_shot:Object.freeze({durationMs:30_000, cooldownMs:180_000})
});

function clampRandom(random = Math.random){
  const value = Number(random());
  if(!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(.999999, value));
}

function randomBetween(min, max, random = Math.random){
  const low = Math.min(Number(min || 0), Number(max || 0));
  const high = Math.max(Number(min || 0), Number(max || 0));
  return low + clampRandom(random) * (high - low);
}

function getSegmentIndexForWave(wave){
  const normalized = Math.max(1, Math.min(KHARON_TOTAL_WAVES, Math.floor(Number(wave || 1))));
  return KHARON_WAVE_SEGMENTS.findIndex(segment=>normalized >= segment.start && normalized <= segment.end);
}

function getRegularEnemyKinds(wave){
  if(wave <= 5) return ["raider_astral", "chasseur_spectral", "cuirasse_nebulaire"];
  if(wave <= 15) return ["chasseur_spectral", "cuirasse_nebulaire", "pondeuse_astrale"];
  if(wave <= 25) return ["cuirasse_nebulaire", "pondeuse_astrale", "cuirasse_ambre"];
  return ["pondeuse_astrale", "cuirasse_ambre", "cristanite"];
}

function getRegularEnemyCount(wave){
  return Math.min(8, 3 + Math.floor((Math.max(1, Number(wave || 1)) - 1) / 5));
}

function kharonMapForEnemy(kind){
  return {
    id:`portal-${KHARON_PORTAL_ID}`,
    width:KHARON_PORTAL_MAP.width,
    height:KHARON_PORTAL_MAP.height,
    enemyTypes:[[kind, 1]],
    level:[KHARON_PORTAL_LEVEL, KHARON_PORTAL_LEVEL]
  };
}

export function createKharonRegularEnemy(kind, wave, index, x, y, now = Date.now()){
  const seed = Math.max(1, Number(wave || 1) * 1_000 + Number(index || 1) * 97);
  const enemy = createWorldEnemy(
    kharonMapForEnemy(kind),
    seed,
    seededRandom(Math.max(1, Number(now || 1) + seed)),
    kind,
    {
      id:`KH-${wave}-${index}-${Number(now || 0).toString(36)}`,
      level:KHARON_PORTAL_LEVEL,
      x,
      y,
      temporarySpawn:true
    }
  );
  return {
    ...enemy,
    kharonEnemy:true,
    kharonWave:Number(wave || 1),
    worldMapId:`portal-${KHARON_PORTAL_ID}`,
    reward:{...(enemy.reward || {credits:0, xp:0, premium:0})},
    noReward:false
  };
}

export function createKharonBoss(wave, now = Date.now()){
  const definition = BOSS_DEFINITIONS[Number(wave)];
  if(!definition) return null;
  const abilityTiming = BOSS_ABILITY_TIMINGS[definition.abilityId] || {durationMs:0, cooldownMs:0};
  const rewardSource = WORLD_ENEMY_TYPES[definition.rewardSourceKind] || WORLD_ENEMY_TYPES.cuirasse_nebulaire;
  const baseReward = rewardSource.reward(KHARON_PORTAL_LEVEL);
  return {
    id:`KH-BOSS-${wave}-${Number(now || 0).toString(36)}`,
    serverControlled:true,
    kharonEnemy:true,
    kharonBoss:true,
    kharonBossShipId:definition.shipId,
    kharonWave:Number(wave),
    renderMode:"kharon_ship_boss",
    kind:`kharon_boss_${definition.shipId}`,
    type:definition.name,
    img:definition.img,
    level:KHARON_PORTAL_LEVEL,
    x:0,
    y:-1_050,
    homeX:0,
    homeY:-1_050,
    angle:Math.PI,
    hp:definition.hp,
    maxHp:definition.hp,
    shield:definition.shield,
    maxShield:definition.shield,
    radius:86,
    width:definition.width,
    height:definition.height,
    speed:KHARON_BOSS_SPEED,
    attackRange:KHARON_BOSS_RANGE,
    attackDamage:Math.round((KHARON_BOSS_DAMAGE_MIN + KHARON_BOSS_DAMAGE_MAX) / 2),
    attackDamageMin:KHARON_BOSS_DAMAGE_MIN,
    attackDamageMax:KHARON_BOSS_DAMAGE_MAX,
    useExactDamageRange:true,
    attackCooldown:1_250,
    staggerFirstAttack:true,
    projectileSpeed:720,
    attackStyle:`kharon_${definition.shipId}`,
    particle:"rgba(248,113,113,.92)",
    color:"rgba(239,68,68,.98)",
    onHitEffect:null,
    reward:{
      credits:Math.round(Number(baseReward.credits || 0) * 2),
      xp:Math.round(Number(baseReward.xp || 0) * 2),
      premium:Math.round(Number(baseReward.premium || 0) * 2)
    },
    noReward:false,
    shieldAbsorbRatio:.8,
    recentHitTimer:0,
    vx:0,
    vy:0,
    moving:false,
    damageThreat:{},
    threatRecalcAt:0,
    nextAttackAt:0,
    kharonAbility:{
      abilityId:definition.abilityId,
      durationMs:abilityTiming.durationMs,
      cooldownMs:abilityTiming.cooldownMs,
      active:false,
      activeUntil:0,
      cooldownUntil:0,
      activationCount:0
    },
    kharonBombNextAt:0,
    kharonBombCount:0
  };
}

export function buildKharonPortalWave(wave, now = Date.now()){
  const normalizedWave = Math.max(1, Math.min(KHARON_TOTAL_WAVES, Math.floor(Number(wave || 1))));
  if(BOSS_DEFINITIONS[normalizedWave]){
    return [createKharonBoss(normalizedWave, now)];
  }
  const kinds = getRegularEnemyKinds(normalizedWave);
  const count = getRegularEnemyCount(normalizedWave);
  return Array.from({length:count}, (_, index)=>{
    const column = SPAWN_COLUMNS[index % SPAWN_COLUMNS.length];
    const row = Math.floor(index / SPAWN_COLUMNS.length);
    return createKharonRegularEnemy(
      kinds[(normalizedWave + index) % kinds.length],
      normalizedWave,
      index + 1,
      column,
      -1_050 - row * 190 - (index % 2) * 80,
      now
    );
  });
}

export function createKharonObjective(){
  return {
    kind:"kharon",
    stage:"waves",
    wave:0,
    waveTotal:KHARON_TOTAL_WAVES,
    waveState:"wave_countdown",
    waveBatchEnd:5,
    nextWaveAt:0,
    hazards:[],
    bossId:null,
    bossShipId:"",
    bossAbility:null,
    bossEffects:[],
    completedAt:0
  };
}

export function isKharonPortalInstance(instance){
  return Boolean(
    instance?.type === "portal"
    && String(instance?.portal?.id || "") === KHARON_PORTAL_ID
    && instance?.portal?.encounterKind !== "azuron"
  );
}

export function publicKharonObjective(instance, currentTime = Date.now()){
  if(!isKharonPortalInstance(instance) || instance?.objective?.kind !== "kharon") return null;
  const objective = instance.objective;
  return {
    at:Number(currentTime || 0),
    kind:"kharon",
    stage:String(objective.stage || "waves"),
    wave:Number(instance.wave || objective.wave || 0),
    waveTotal:KHARON_TOTAL_WAVES,
    waveState:String(instance.waveState || objective.waveState || ""),
    waveBatchEnd:Number(instance.waveBatchEnd || objective.waveBatchEnd || 0),
    nextWaveAt:Number(instance.nextWaveAt || objective.nextWaveAt || 0),
    nextWaveDelayMs:Math.max(0, Number(instance.nextWaveAt || objective.nextWaveAt || 0) - Number(currentTime || 0)),
    bossId:objective.bossId || null,
    bossShipId:String(objective.bossShipId || ""),
    bossAbility:objective.bossAbility ? {...objective.bossAbility} : null,
    bossEffects:(Array.isArray(objective.bossEffects) ? objective.bossEffects : []).map(effect=>({
      id:String(effect.id || ""),
      kind:String(effect.kind || ""),
      bossId:String(effect.bossId || ""),
      x:Number(effect.x || 0),
      y:Number(effect.y || 0),
      radius:Math.max(0, Number(effect.radius || 0)),
      startedAt:Number(effect.startedAt || 0),
      durationMs:Math.max(0, Number(effect.durationMs || 0)),
      at:Number(effect.at || effect.startedAt || 0)
    })),
    hazards:(Array.isArray(objective.hazards) ? objective.hazards : []).map(hazard=>({
      id:String(hazard.id || ""),
      kind:"boss_teleport_bomb",
      phase:String(hazard.phase || "charging"),
      x:Number(hazard.x || 0),
      y:Number(hazard.y || 0),
      radius:Math.max(0, Number(hazard.radius || 0)),
      maxRadius:KHARON_BOMB_RADIUS,
      startedAt:Number(hazard.startedAt || 0),
      detonateAt:Number(hazard.detonateAt || 0),
      durationMs:KHARON_BOMB_CHARGE_MS,
      explodedAt:Number(hazard.explodedAt || 0),
      bossId:String(hazard.bossId || ""),
      fromX:Number(hazard.fromX || 0),
      fromY:Number(hazard.fromY || 0),
      toX:Number(hazard.toX || hazard.x || 0),
      toY:Number(hazard.toY || hazard.y || 0)
    })),
    completedAt:Number(objective.completedAt || 0)
  };
}

export function createKharonPortalRuntime({
  io,
  players,
  groups,
  profileManager,
  presence,
  emitProfileSync,
  emitInstance,
  emitPortalComplete,
  buildWave = buildKharonPortalWave,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = ()=>Date.now(),
  random = Math.random
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
      && isKharonPortalInstance(instance)
      && !instance.completed;
  }

  function syncObjective(instance){
    if(!instance.objective || instance.objective.kind !== "kharon"){
      instance.objective = createKharonObjective();
    }
    instance.objective.wave = Number(instance.wave || 0);
    instance.objective.waveState = String(instance.waveState || "");
    instance.objective.waveBatchEnd = Number(instance.waveBatchEnd || 0);
    instance.objective.nextWaveAt = Number(instance.nextWaveAt || 0);
  }

  function spawnWave(group, wave, {emit = true} = {}){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const normalizedWave = Math.max(1, Math.min(KHARON_TOTAL_WAVES, Math.floor(Number(wave || 1))));
    instance.enemies = (instance.enemies || []).filter(enemy=>Number(enemy.hp || 0) > 0);
    const enemies = buildWave(normalizedWave, now());
    instance.enemies.push(...enemies);
    instance.wave = normalizedWave;
    instance.kharonLastSpawnedWave = normalizedWave;
    const boss = enemies.find(enemy=>enemy.kharonBoss);
    if(boss){
      instance.objective.stage = "boss";
      instance.objective.bossId = boss.id;
      instance.objective.bossShipId = boss.kharonBossShipId;
      instance.objective.bossAbility = {...boss.kharonAbility};
      instance.objective.bossEffects = [];
      boss.kharonBombNextAt = Number(now()) + randomBetween(
        KHARON_BOMB_MIN_DELAY_MS,
        KHARON_BOMB_MAX_DELAY_MS,
        random
      );
    }else{
      instance.objective.stage = "waves";
      instance.objective.bossId = null;
      instance.objective.bossShipId = "";
      instance.objective.bossAbility = null;
      instance.objective.bossEffects = [];
    }
    syncObjective(instance);
    if(emit) emitInstance?.(group);
    return true;
  }

  function scheduleSegmentRemainder(group, segment){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || !segment) return;
    instance.kharonSegmentStart = segment.start;
    instance.kharonSegmentEnd = segment.end;
    instance.waveBatchEnd = segment.end;
    instance.kharonScheduledWaves = [];
    const scheduledAt = Number(now());
    for(let wave = segment.start + 1; wave <= segment.end; wave += 1){
      const timerSet = getTimerSet(instance);
      const dueAt = scheduledAt + (wave - segment.start) * KHARON_WAVE_INTERVAL_MS;
      instance.kharonScheduledWaves.push({wave, dueAt});
      let timer = null;
      timer = setTimeoutFn(()=>{
        timerSet.delete(timer);
        if(timerSet.size === 0) timersByInstance.delete(String(instance.id || ""));
        if(!isCurrent(group, instance)) return;
        instance.kharonScheduledWaves = (instance.kharonScheduledWaves || [])
          .filter(entry=>Number(entry.wave) !== wave);
        instance.nextWaveAt = Number(instance.kharonScheduledWaves[0]?.dueAt || 0);
        instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : "clear_batch";
        spawnWave(group, wave);
      }, (wave - segment.start) * KHARON_WAVE_INTERVAL_MS);
      timer?.unref?.();
      timerSet.add(timer);
    }
    instance.nextWaveAt = Number(instance.kharonScheduledWaves[0]?.dueAt || 0);
    instance.waveState = instance.nextWaveAt > 0 ? "wave_countdown" : (segment.kind === "boss" ? "boss" : "clear_batch");
    syncObjective(instance);
  }

  function beginSegment(group, segmentIndex, {emit = true} = {}){
    const instance = group?.instance;
    const segment = KHARON_WAVE_SEGMENTS[segmentIndex];
    if(!isCurrent(group, instance) || !segment) return false;
    instance.kharonSegmentIndex = segmentIndex;
    instance.kharonSegmentStart = segment.start;
    instance.kharonSegmentEnd = segment.end;
    instance.waveBatchEnd = segment.end;
    instance.kharonLastSpawnedWave = segment.start - 1;
    instance.kharonScheduledWaves = [];
    instance.nextWaveAt = 0;
    instance.waveState = segment.kind === "boss" ? "boss" : "wave_countdown";
    spawnWave(group, segment.start, {emit});
    scheduleSegmentRemainder(group, segment);
    return true;
  }

  function start(group, {emit = false} = {}){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    cancel(instance);
    instance.enemies = [];
    instance.wave = 0;
    instance.objective = createKharonObjective();
    return beginSegment(group, 0, {emit});
  }

  function handleEnemyDeath(group){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    if((instance.enemies || []).some(enemy=>Number(enemy.hp || 0) > 0)){
      if(Number(instance.kharonLastSpawnedWave || 0) >= Number(instance.kharonSegmentEnd || 0)){
        instance.waveState = instance.objective?.stage === "boss" ? "boss" : "clear_batch";
        syncObjective(instance);
      }
      return true;
    }
    if(Number(instance.kharonLastSpawnedWave || 0) < Number(instance.kharonSegmentEnd || 0)){
      instance.waveState = "wave_countdown";
      syncObjective(instance);
      return true;
    }
    const currentSegmentIndex = Math.max(
      0,
      Number.isInteger(instance.kharonSegmentIndex)
        ? instance.kharonSegmentIndex
        : getSegmentIndexForWave(instance.wave)
    );
    if(currentSegmentIndex >= KHARON_WAVE_SEGMENTS.length - 1){
      instance.nextWaveAt = 0;
      instance.waveState = "completed";
      instance.objective.stage = "complete";
      instance.objective.completedAt = Number(now());
      instance.objective.hazards = [];
      instance.objective.bossEffects = [];
      for(const player of joinedPlayers(group, {aliveOnly:false})){
        player.kharonBossPoison = null;
      }
      syncObjective(instance);
      cancel(instance);
      emitPortalComplete?.(group);
      return true;
    }
    beginSegment(group, currentSegmentIndex + 1);
    return true;
  }

  function joinedPlayers(group, {aliveOnly = true} = {}){
    const instance = group?.instance;
    if(!isKharonPortalInstance(instance)) return [];
    const joinedIds = Array.isArray(instance.joinedMemberIds)
      ? instance.joinedMemberIds
      : (group.members || []);
    const abandoned = new Set((instance.abandonedMemberIds || []).map(String));
    const mapId = `portal-${KHARON_PORTAL_ID}`;
    return joinedIds
      .map(playerId=>players?.get?.(String(playerId)))
      .filter(Boolean)
      .filter(player=>player.connected !== false)
      .filter(player=>!abandoned.has(String(player.id || "")))
      .filter(player=>String(player.state?.mapId || player.mapId || "") === mapId)
      .filter(player=>!aliveOnly || typeof presence?.isActiveForWorld !== "function" || presence.isActiveForWorld(player, Number(now())))
      .filter(player=>!aliveOnly || (!player.deathState && Number(player.state?.hp || 0) > 0));
  }

  function emitToJoined(group, eventName, payload){
    const instance = group?.instance;
    const joinedIds = Array.isArray(instance?.joinedMemberIds)
      ? instance.joinedMemberIds
      : (group?.members || []);
    for(const playerId of joinedIds){
      if(instance?.abandonedMemberIds?.includes(playerId)) continue;
      io?.to?.(playerId)?.emit?.(eventName, payload);
    }
  }

  function addBossEffect(group, effect){
    const instance = group.instance;
    if(!Array.isArray(instance.objective.bossEffects)) instance.objective.bossEffects = [];
    instance.objective.bossEffects.push(effect);
    emitToJoined(group, "portal:kharon-effect", {...effect, at:Number(effect.at || effect.startedAt || now())});
    return effect;
  }

  function scheduleBossAbility(group, boss, currentTime){
    const state = boss?.kharonAbility;
    if(!state || state.active || currentTime < Number(state.cooldownUntil || 0)) return false;
    state.active = true;
    state.activatedAt = currentTime;
    state.activeUntil = currentTime + Math.max(0, Number(state.durationMs || 0));
    state.cooldownUntil = currentTime + Math.max(0, Number(state.cooldownMs || 0));
    state.activationCount = Math.max(0, Number(state.activationCount || 0)) + 1;
    if(state.abilityId === "poison_bomb"){
      state.nextPulseIndex = 0;
      state.nextPulseAt = currentTime;
      boss.kharonPoisonWaves = [];
    }
    if(state.abilityId === "spectral_double_shot"){
      state.chargeStartedAt = currentTime;
      state.chargeReadyAt = currentTime + KHARON_SPECTRAL_CHARGE_MS;
    }
    group.instance.objective.bossAbility = {...state};
    const effectKind = state.abilityId === "absorbing_fire"
      ? "boss_absorption"
      : state.abilityId === "spectral_double_shot"
        ? "boss_spectral_charge"
        : "";
    if(effectKind){
      addBossEffect(group, {
        id:`KH-EFFECT-${state.activationCount}-${currentTime.toString(36)}`,
        kind:effectKind,
        bossId:boss.id,
        x:Number(boss.x || 0),
        y:Number(boss.y || 0),
        radius:effectKind === "boss_absorption" ? Number(boss.radius || 86) * 1.8 : Number(boss.radius || 86) * 1.35,
        startedAt:currentTime,
        durationMs:effectKind === "boss_spectral_charge" ? KHARON_SPECTRAL_CHARGE_MS : Number(state.durationMs || 0),
        at:currentTime
      });
    }
    emitToJoined(group, "portal:kharon-ability", {
      kind:"boss_ability",
      bossId:boss.id,
      shipId:boss.kharonBossShipId,
      ability:{...state},
      at:currentTime
    });
    return true;
  }

  function emitPoisonWave(group, boss, state, pulseIndex, currentTime){
    const effect = {
      id:`KH-POISON-${state.activationCount}-${pulseIndex + 1}-${currentTime.toString(36)}`,
      kind:"boss_poison_wave",
      bossId:boss.id,
      x:Number(boss.x || 0),
      y:Number(boss.y || 0),
      radius:KHARON_POISON_RADIUS,
      startedAt:currentTime,
      durationMs:KHARON_POISON_PULSE_DURATION_MS,
      at:currentTime,
      pulseIndex:pulseIndex + 1,
      pulseCount:KHARON_POISON_PULSE_COUNT,
      followSource:true
    };
    if(!Array.isArray(boss.kharonPoisonWaves)) boss.kharonPoisonWaves = [];
    boss.kharonPoisonWaves.push({
      ...effect,
      expiresAt:currentTime + KHARON_POISON_PULSE_DURATION_MS
    });
    addBossEffect(group, effect);
  }

  function applyDirectHullDamage(group, player, amount, {
    enemyId,
    damageType,
    x,
    y,
    currentTime
  }){
    if(!player?.state || Number(player.state.hp || 0) <= 0) return 0;
    presence?.markDamage?.(player, currentTime);
    presence?.markCombat?.(player, damageType === "portal_bomb" ? "bombe de portail" : "poison de portail");
    const hpBefore = Math.max(0, Number(player.state.hp || 0));
    player.state.hp = Math.max(0, hpBefore - Math.max(0, Number(amount || 0)));
    player.state.updatedAt = currentTime;
    player.state.repairBotActive = false;
    player.serverRepairBotTick = 0;
    const hpLost = Math.max(0, hpBefore - Number(player.state.hp || 0));
    const questResult = profileManager?.applyQuestAction?.({
      player,
      action:{kind:"hp-loss", amount:hpLost}
    });
    if(questResult?.failed?.length){
      io?.to?.(player.id)?.emit?.("quest:fail-progress", {
        updates:questResult.updates || [],
        failed:questResult.failed,
        at:currentTime
      });
    }
    if(questResult?.changed) emitProfileSync?.(player, questResult.profile);
    profileManager?.saveWorldSession?.({
      player,
      state:player.state,
      force:Number(player.state.hp || 0) <= 0
    });
    io?.to?.(player.id)?.emit?.("player:damage", {
      enemyId,
      sourceEnemyIds:[enemyId],
      attackCount:1,
      mapId:`portal-${KHARON_PORTAL_ID}`,
      amount:Math.max(0, Number(amount || 0)),
      hp:Number(player.state.hp || 0),
      maxHp:Number(player.state.maxHp || 0),
      shield:Number(player.state.shield || 0),
      maxShield:Number(player.state.maxShield || 0),
      fromX:Number(x || 0),
      fromY:Number(y || 0),
      toX:Number(player.state.x || 0),
      toY:Number(player.state.y || 0),
      damageType,
      bypassShield:true,
      at:currentTime
    });
    return hpLost;
  }

  function updatePoisonWaves(group, boss, currentTime){
    const state = boss.kharonAbility;
    if(state?.abilityId === "poison_bomb" && state.active){
      while(Number(state.nextPulseIndex || 0) < KHARON_POISON_PULSE_COUNT
        && currentTime >= Number(state.nextPulseAt || 0)){
        const pulseIndex = Number(state.nextPulseIndex || 0);
        emitPoisonWave(group, boss, state, pulseIndex, Number(state.nextPulseAt || currentTime));
        state.nextPulseIndex = pulseIndex + 1;
        state.nextPulseAt = Number(state.activatedAt || currentTime)
          + state.nextPulseIndex * KHARON_POISON_PULSE_INTERVAL_MS;
      }
    }
    const activeWaves = (boss.kharonPoisonWaves || []).filter(wave=>currentTime <= Number(wave.expiresAt || 0));
    boss.kharonPoisonWaves = activeWaves;
    for(const wave of activeWaves){
      wave.x = Number(boss.x || 0);
      wave.y = Number(boss.y || 0);
      const publicEffect = (group.instance.objective.bossEffects || []).find(effect=>effect.id === wave.id);
      if(publicEffect){
        publicEffect.x = wave.x;
        publicEffect.y = wave.y;
      }
      for(const player of joinedPlayers(group)){
        const distance = Math.hypot(
          Number(player.state?.x || 0) - wave.x,
          Number(player.state?.y || 0) - wave.y
        );
        if(distance > KHARON_POISON_RADIUS) continue;
        const poison = player.kharonBossPoison;
        if(!poison || String(poison.sourceBossId || "") !== String(boss.id || "")){
          player.kharonBossPoison = {
            instanceId:group.instance.id,
            sourceBossId:boss.id,
            sourceX:wave.x,
            sourceY:wave.y,
            expiresAt:currentTime + KHARON_POISON_DURATION_MS,
            nextTickAt:currentTime + KHARON_POISON_TICK_MS
          };
        }else{
          poison.sourceX = wave.x;
          poison.sourceY = wave.y;
          poison.expiresAt = currentTime + KHARON_POISON_DURATION_MS;
        }
      }
    }
  }

  function updatePlayerPoisonTicks(group, currentTime){
    for(const player of joinedPlayers(group, {aliveOnly:false})){
      const poison = player.kharonBossPoison;
      if(!poison) continue;
      if(String(poison.instanceId || "") !== String(group.instance.id || "")){
        player.kharonBossPoison = null;
        continue;
      }
      if(Number(player.state?.hp || 0) <= 0 || currentTime > Number(poison.expiresAt || 0)){
        player.kharonBossPoison = null;
        continue;
      }
      while(Number(player.state?.hp || 0) > 0
        && currentTime >= Number(poison.nextTickAt || 0)
        && Number(poison.nextTickAt || 0) <= Number(poison.expiresAt || 0)){
        const tickAt = Number(poison.nextTickAt || currentTime);
        poison.nextTickAt = tickAt + KHARON_POISON_TICK_MS;
        applyDirectHullDamage(group, player, KHARON_POISON_DAMAGE, {
          enemyId:poison.sourceBossId,
          damageType:"poison",
          x:poison.sourceX,
          y:poison.sourceY,
          currentTime:tickAt
        });
      }
    }
  }

  function handleSpectralEffects(group, boss, currentTime){
    const impact = boss.kharonSpectralImpact;
    if(!impact || impact.emitted) return;
    impact.emitted = true;
    addBossEffect(group, {
      id:`KH-SPECTRAL-IMPACT-${currentTime.toString(36)}`,
      kind:"boss_spectral_impact",
      bossId:boss.id,
      x:Number(impact.x || boss.x || 0),
      y:Number(impact.y || boss.y || 0),
      radius:150,
      startedAt:Number(impact.at || currentTime),
      durationMs:650,
      at:Number(impact.at || currentTime)
    });
    const state = boss.kharonAbility;
    addBossEffect(group, {
      id:`KH-SPECTRAL-CHARGE-${currentTime.toString(36)}`,
      kind:"boss_spectral_charge",
      bossId:boss.id,
      x:Number(boss.x || 0),
      y:Number(boss.y || 0),
      radius:Number(boss.radius || 86) * 1.35,
      startedAt:Number(state?.chargeStartedAt || currentTime),
      durationMs:KHARON_SPECTRAL_CHARGE_MS,
      at:Number(state?.chargeStartedAt || currentTime)
    });
  }

  function updateBossAbility(group, boss, currentTime){
    const state = boss?.kharonAbility;
    if(!state) return;
    scheduleBossAbility(group, boss, currentTime);
    updatePoisonWaves(group, boss, currentTime);
    if(state.active && currentTime >= Number(state.activeUntil || 0)){
      state.active = false;
      group.instance.objective.bossAbility = {...state};
    }
    handleSpectralEffects(group, boss, currentTime);
    for(const effect of group.instance.objective.bossEffects || []){
      if(effect.bossId !== boss.id) continue;
      if(effect.kind !== "boss_absorption" && effect.kind !== "boss_spectral_charge") continue;
      effect.x = Number(boss.x || 0);
      effect.y = Number(boss.y || 0);
    }
    group.instance.objective.bossAbility = {...state};
  }

  function chooseDistantBombTarget(group, boss){
    const candidates = joinedPlayers(group).map(player=>({
      player,
      distance:Math.hypot(
        Number(player.state?.x || 0) - Number(boss.x || 0),
        Number(player.state?.y || 0) - Number(boss.y || 0)
      )
    })).filter(entry=>entry.distance > KHARON_BOSS_RANGE);
    return candidates.sort((left, right)=>right.distance - left.distance)[0]?.player || null;
  }

  function startBossBomb(group, boss, target, currentTime){
    const instance = group.instance;
    const fromX = Number(boss.x || 0);
    const fromY = Number(boss.y || 0);
    boss.x = Number(target.state?.x || 0);
    boss.y = Number(target.state?.y || 0);
    boss.homeX = boss.x;
    boss.homeY = boss.y;
    boss.vx = 0;
    boss.vy = 0;
    boss.moving = false;
    boss.lockedPlayerId = target.id;
    boss.lockedPlayerLastSeenAt = currentTime;
    boss.aiDecision = null;
    boss.nextAiDecisionAt = 0;
    boss.kharonBombCount = Math.max(0, Number(boss.kharonBombCount || 0)) + 1;
    const hazard = {
      id:`KH-BOMB-${boss.kharonBombCount}-${currentTime.toString(36)}`,
      kind:"boss_teleport_bomb",
      phase:"charging",
      x:boss.x,
      y:boss.y,
      radius:0,
      maxRadius:KHARON_BOMB_RADIUS,
      startedAt:currentTime,
      detonateAt:currentTime + KHARON_BOMB_CHARGE_MS,
      durationMs:KHARON_BOMB_CHARGE_MS,
      explodedAt:0,
      bossId:boss.id,
      fromX,
      fromY,
      toX:boss.x,
      toY:boss.y,
      damageApplied:false
    };
    if(!Array.isArray(instance.objective.hazards)) instance.objective.hazards = [];
    instance.objective.hazards.push(hazard);
    boss.kharonBombNextAt = currentTime + randomBetween(
      KHARON_BOMB_MIN_DELAY_MS,
      KHARON_BOMB_MAX_DELAY_MS,
      random
    );
    emitToJoined(group, "portal:kharon-effect", {...hazard, at:currentTime});
    emitInstance?.(group);
    return hazard;
  }

  function applyBombDamage(group, hazard, currentTime){
    if(hazard.damageApplied) return;
    hazard.damageApplied = true;
    for(const player of joinedPlayers(group)){
      const distance = Math.hypot(
        Number(player.state?.x || 0) - Number(hazard.x || 0),
        Number(player.state?.y || 0) - Number(hazard.y || 0)
      );
      if(distance > KHARON_BOMB_RADIUS) continue;
      applyDirectHullDamage(group, player, KHARON_BOMB_DAMAGE, {
        enemyId:hazard.bossId,
        damageType:"portal_bomb",
        x:hazard.x,
        y:hazard.y,
        currentTime
      });
    }
  }

  function updateHazards(group, currentTime){
    const hazards = group.instance.objective.hazards || [];
    for(const hazard of hazards){
      if(hazard.phase === "charging"){
        const progress = Math.max(0, Math.min(
          1,
          (currentTime - Number(hazard.startedAt || 0)) / KHARON_BOMB_CHARGE_MS
        ));
        hazard.radius = KHARON_BOMB_RADIUS * progress;
        if(currentTime >= Number(hazard.detonateAt || 0)){
          hazard.phase = "exploded";
          hazard.radius = KHARON_BOMB_RADIUS;
          hazard.explodedAt = currentTime;
          applyBombDamage(group, hazard, currentTime);
          emitToJoined(group, "portal:kharon-effect", {...hazard, at:currentTime});
        }
      }
    }
    group.instance.objective.hazards = hazards.filter(hazard=>
      hazard.phase !== "exploded" || currentTime - Number(hazard.explodedAt || 0) <= 900
    );
    group.instance.objective.bossEffects = (group.instance.objective.bossEffects || []).filter(effect=>
      currentTime - Number(effect.startedAt || 0) <= Number(effect.durationMs || 0) + 900
    );
  }

  function updateKharonGroup(group, _dt, currentTime = Date.now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || instance.objective?.kind !== "kharon") return;
    updateHazards(group, currentTime);
    updatePlayerPoisonTicks(group, currentTime);
    const boss = (instance.enemies || []).find(enemy=>enemy.kharonBoss && Number(enemy.hp || 0) > 0);
    if(!boss) return;
    updateBossAbility(group, boss, currentTime);
    if(Number(boss.kharonBombNextAt || 0) <= 0){
      boss.kharonBombNextAt = currentTime + randomBetween(
        KHARON_BOMB_MIN_DELAY_MS,
        KHARON_BOMB_MAX_DELAY_MS,
        random
      );
      return;
    }
    const hasChargingBomb = (instance.objective.hazards || [])
      .some(hazard=>hazard.phase === "charging" && hazard.bossId === boss.id);
    if(!hasChargingBomb && currentTime >= Number(boss.kharonBombNextAt || 0)){
      const target = chooseDistantBombTarget(group, boss);
      if(target) startBossBomb(group, boss, target, currentTime);
    }
  }

  function updateKharonEncounters(dt, currentTime = Date.now()){
    for(const group of getInstanceGroups(groups)) updateKharonGroup(group, dt, currentTime);
  }

  return {
    cancel,
    handleEnemyDeath,
    spawnWave,
    start,
    updateKharonEncounters,
    updateKharonGroup
  };
}
