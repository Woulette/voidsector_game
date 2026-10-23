import { getInstanceGroups } from "./portalSessions.js";
import { createWorldEnemy, seededRandom } from "../world/spawn.js";
import {
  ECLANITE_BOSS_ASSETS,
  ECLANITE_CORE_ASSET,
  ECLANITE_CORE_DAMAGE_MULTIPLIER,
  ECLANITE_CORE_MAX_HP,
  ECLANITE_PORTAL_ID,
  ECLANITE_PORTAL_LEVEL,
  ECLANITE_PORTAL_MAP,
  ECLANITE_ZONE_COUNT,
  ECLANITE_ZONE_DURATION_MS
} from "../../../src/data/eclanitePortal.js";

export {
  ECLANITE_CORE_DAMAGE_MULTIPLIER,
  ECLANITE_CORE_MAX_HP,
  ECLANITE_PORTAL_ID,
  ECLANITE_PORTAL_LEVEL,
  ECLANITE_PORTAL_MAP,
  ECLANITE_ZONE_COUNT,
  ECLANITE_ZONE_DURATION_MS
};

export const ECLANITE_BOSS_DAMAGE_MIN = 8_000;
export const ECLANITE_BOSS_DAMAGE_MAX = 12_000;
export const ECLANITE_BOSS_RANGE = 450;
export const ECLANITE_BOSS_SPEED = 300;

const ZERO_REWARD = Object.freeze({credits:0, xp:0, premium:0});
const GUARDIAN_COUNTS = Object.freeze([8, 9, 10]);
const GUARDIAN_KINDS = Object.freeze([
  Object.freeze(["eclanite", "cristanite"]),
  Object.freeze(["cristanite", "astranite"]),
  Object.freeze(["astranite", "cristanite", "eclanite"])
]);
const BOSS_CONFIGS = Object.freeze([
  Object.freeze({color:"green", count:20, kind:"eclanite", name:"Gardien verdoyant d’Éclanite"}),
  Object.freeze({color:"red", count:20, kind:"cristanite", name:"Gardien écarlate d’Éclanite"}),
  Object.freeze({color:"blue", count:30, kind:"astranite", name:"Gardien azur d’Éclanite"})
]);

function zoneConfig(zone){
  const index = Math.max(0, Math.min(ECLANITE_ZONE_COUNT - 1, Math.floor(Number(zone || 1)) - 1));
  return ECLANITE_PORTAL_MAP.zones[index];
}

function portalEnemyMap(kind){
  return {
    id:`portal-${ECLANITE_PORTAL_ID}`,
    width:ECLANITE_PORTAL_MAP.width,
    height:ECLANITE_PORTAL_MAP.height,
    enemyTypes:[[kind, 1]],
    level:[ECLANITE_PORTAL_LEVEL, ECLANITE_PORTAL_LEVEL]
  };
}

function prepareEclaniteEnemy(enemy, {rewardEligible = true} = {}){
  const reward = enemy?.reward || ZERO_REWARD;
  const hasCombatReward = rewardEligible && (Number(reward.credits || 0) > 0
    || Number(reward.xp || 0) > 0
    || Number(reward.premium || 0) > 0);
  enemy.reward = hasCombatReward ? {...reward} : {...ZERO_REWARD};
  enemy.noReward = !hasCombatReward;
  enemy.temporarySpawn = true;
  enemy.serverControlled = true;
  enemy.worldMapId = `portal-${ECLANITE_PORTAL_ID}`;
  return enemy;
}

export function createEclaniteGuardian(zone, index, now = Date.now()){
  const config = zoneConfig(zone);
  const kinds = GUARDIAN_KINDS[Math.max(0, Math.min(GUARDIAN_KINDS.length - 1, zone - 1))];
  const kind = kinds[index % kinds.length];
  const count = GUARDIAN_COUNTS[Math.max(0, Math.min(GUARDIAN_COUNTS.length - 1, zone - 1))];
  const angle = Math.PI * 2 * index / Math.max(1, count) + zone * .21;
  const radius = 470 + (index % 3) * 85;
  const x = Number(config.x) + Math.cos(angle) * radius;
  const y = Number(config.y) + Math.sin(angle) * radius;
  const seed = Math.max(1, zone * 10_000 + index * 131 + Math.floor(Number(now || 1)));
  const enemy = createWorldEnemy(
    portalEnemyMap(kind),
    seed,
    seededRandom(seed),
    kind,
    {
      id:`EC-G${zone}-${index + 1}-${Number(now || 0).toString(36)}`,
      level:ECLANITE_PORTAL_LEVEL,
      x,
      y,
      temporarySpawn:true
    }
  );
  return prepareEclaniteEnemy({
    ...enemy,
    eclaniteEnemy:true,
    eclaniteGuardian:true,
    eclaniteZone:zone,
    homeX:x,
    homeY:y,
    guardLeashRadius:820,
    followBeforeAttacked:true,
    targetMemoryMs:4_000,
    attackRange:Math.min(420, Number(enemy.attackRange || 330))
  });
}

export function createEclaniteCore(zone, now = Date.now()){
  const config = zoneConfig(zone);
  return prepareEclaniteEnemy({
    id:`EC-CORE-${zone}-${Number(now || 0).toString(36)}`,
    kind:"eclanite_core",
    type:`Noyau d’Éclanite ${zone}`,
    img:ECLANITE_CORE_ASSET,
    level:ECLANITE_PORTAL_LEVEL,
    x:Number(config.x),
    y:Number(config.y),
    homeX:Number(config.x),
    homeY:Number(config.y),
    angle:0,
    hp:ECLANITE_CORE_MAX_HP,
    maxHp:ECLANITE_CORE_MAX_HP,
    shield:0,
    maxShield:0,
    radius:104,
    width:230,
    height:230,
    speed:0,
    attackRange:0,
    attackDamage:0,
    attackCooldown:60_000,
    projectileSpeed:0,
    color:"rgba(74,222,128,.95)",
    particle:"rgba(134,239,172,.82)",
    shieldAbsorbRatio:0,
    static:true,
    anchored:true,
    damageImmune:true,
    damageImmuneReason:"Éliminez tous les gardiens avant d’attaquer le noyau.",
    eclaniteEnemy:true,
    eclaniteCore:true,
    eclaniteCoreExposed:false,
    eclaniteZone:zone,
    incomingDamageMultiplier:ECLANITE_CORE_DAMAGE_MULTIPLIER,
    incomingDamageMultiplierKind:"eclanite_exposed_core",
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0,
    damageThreat:{},
    nextAttackAt:0
  }, {rewardEligible:false});
}

export function createEclaniteBoss(zone, hp = ECLANITE_CORE_MAX_HP, now = Date.now()){
  const config = zoneConfig(zone);
  const bossConfig = BOSS_CONFIGS[Math.max(0, Math.min(BOSS_CONFIGS.length - 1, zone - 1))];
  const seed = Math.max(1, zone * 100_000 + Math.floor(Number(now || 1)));
  const base = createWorldEnemy(
    portalEnemyMap(bossConfig.kind),
    seed,
    seededRandom(seed),
    bossConfig.kind,
    {
      id:`EC-BOSS-${zone}-${Number(now || 0).toString(36)}`,
      level:ECLANITE_PORTAL_LEVEL,
      x:Number(config.x),
      y:Number(config.y),
      temporarySpawn:true
    }
  );
  const currentHp = Math.max(1, Math.min(ECLANITE_CORE_MAX_HP, Number(hp || ECLANITE_CORE_MAX_HP)));
  return prepareEclaniteEnemy({
    ...base,
    type:bossConfig.name,
    img:ECLANITE_BOSS_ASSETS[bossConfig.color] || base.img,
    x:Number(config.x),
    y:Number(config.y),
    homeX:Number(config.x),
    homeY:Number(config.y),
    hp:currentHp,
    maxHp:ECLANITE_CORE_MAX_HP,
    shield:0,
    maxShield:0,
    radius:110,
    width:260,
    height:260,
    speed:ECLANITE_BOSS_SPEED,
    attackRange:ECLANITE_BOSS_RANGE,
    attackDamage:Math.round((ECLANITE_BOSS_DAMAGE_MIN + ECLANITE_BOSS_DAMAGE_MAX) / 2),
    attackDamageMin:ECLANITE_BOSS_DAMAGE_MIN,
    attackDamageMax:ECLANITE_BOSS_DAMAGE_MAX,
    useExactDamageRange:true,
    attackCooldown:1_000,
    staggerFirstAttack:true,
    projectileSpeed:760,
    attackStyle:`eclanite_${bossConfig.color}`,
    color:config.color,
    particle:config.color,
    shieldAbsorbRatio:0,
    guardLeashRadius:980,
    followBeforeAttacked:true,
    targetMemoryMs:5_000,
    eclaniteEnemy:true,
    eclaniteBoss:true,
    eclaniteZone:zone,
    eclaniteLaser:{color:bossConfig.color, count:bossConfig.count},
    npcEliteLaserState:{lastShotAt:0, charge:0, phase:"charge"}
  }, {rewardEligible:false});
}

export function createEclaniteObjective(now = Date.now()){
  return {
    kind:"eclanite",
    zone:1,
    phase:"guardians",
    deadlineAt:Number(now || Date.now()) + ECLANITE_ZONE_DURATION_MS,
    coreId:"",
    bossId:"",
    breaches:{oneOpen:false, twoOpen:false},
    completedAt:0,
    transitionToken:0
  };
}

function isEclaniteInstance(instance){
  return Boolean(
    instance?.type === "portal"
    && String(instance.portal?.id || "") === ECLANITE_PORTAL_ID
  );
}

function aliveEnemies(instance, predicate = ()=>true){
  return (Array.isArray(instance?.enemies) ? instance.enemies : [])
    .filter(enemy=>Number(enemy?.hp || 0) > 0 && predicate(enemy));
}

function findCore(instance){
  return (instance?.enemies || []).find(enemy=>
    enemy.eclaniteCore
    && String(enemy.id || "") === String(instance?.objective?.coreId || "")
    && Number(enemy.hp || 0) > 0
  ) || null;
}

function findBoss(instance){
  return (instance?.enemies || []).find(enemy=>
    enemy.eclaniteBoss
    && String(enemy.id || "") === String(instance?.objective?.bossId || "")
    && Number(enemy.hp || 0) > 0
  ) || null;
}

function publicVital(enemy, extras = {}){
  if(!enemy) return null;
  return {
    id:String(enemy.id || ""),
    hp:Math.max(0, Number(enemy.hp || 0)),
    maxHp:Math.max(1, Number(enemy.maxHp || 1)),
    ...extras
  };
}

export function publicEclaniteObjective(instance, at = Date.now()){
  if(!isEclaniteInstance(instance) || instance?.objective?.kind !== "eclanite") return null;
  const objective = instance.objective;
  const core = findCore(instance);
  const boss = findBoss(instance);
  const guardiansRemaining = aliveEnemies(instance, enemy=>
    enemy.eclaniteGuardian
    && Number(enemy.eclaniteZone || 0) === Number(objective.zone || 1)
  ).length;
  return {
    kind:"eclanite",
    zone:Math.max(1, Math.min(ECLANITE_ZONE_COUNT, Number(objective.zone || 1))),
    phase:String(objective.phase || "guardians"),
    deadlineAt:Math.max(0, Number(objective.deadlineAt || 0)),
    remainingMs:objective.phase === "complete"
      ? 0
      : Math.max(0, Number(objective.deadlineAt || 0) - Number(at || Date.now())),
    guardiansRemaining,
    core:publicVital(core, {exposed:Boolean(core?.eclaniteCoreExposed)}),
    boss:publicVital(boss, {color:String(boss?.eclaniteLaser?.color || "")}),
    breaches:{
      oneOpen:Boolean(objective.breaches?.oneOpen),
      twoOpen:Boolean(objective.breaches?.twoOpen)
    },
    completedAt:Math.max(0, Number(objective.completedAt || 0)),
    at:Number(at || Date.now())
  };
}

export function getEclaniteEnemyDamageMultiplier(enemy){
  if(!enemy?.eclaniteCore
    || !enemy.eclaniteCoreExposed
    || enemy.damageImmune){
    return 1;
  }
  return ECLANITE_CORE_DAMAGE_MULTIPLIER;
}

export function scaleEclaniteEnemyDamage(enemy, amount){
  return Math.max(0, Number(amount || 0)) * getEclaniteEnemyDamageMultiplier(enemy);
}

export function createEclanitePortalRuntime({
  groups,
  emitInstance,
  emitPortalComplete,
  now = ()=>Date.now()
} = {}){
  function isCurrent(group, instance = group?.instance){
    return Boolean(isEclaniteInstance(instance) && group?.instance === instance && !instance.completed);
  }

  function activateZone(group, zone, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const normalizedZone = Math.max(1, Math.min(ECLANITE_ZONE_COUNT, Math.floor(Number(zone || 1))));
    const objective = instance.objective?.kind === "eclanite"
      ? instance.objective
      : createEclaniteObjective(at);
    objective.zone = normalizedZone;
    objective.phase = "guardians";
    objective.deadlineAt = Number(at) + ECLANITE_ZONE_DURATION_MS;
    objective.coreId = "";
    objective.bossId = "";
    objective.transitionToken = Number(objective.transitionToken || 0) + 1;
    instance.objective = objective;
    instance.wave = normalizedZone;
    instance.waveState = "zone_active";
    instance.nextWaveAt = objective.deadlineAt;
    const guardians = Array.from(
      {length:GUARDIAN_COUNTS[normalizedZone - 1]},
      (_, index)=>createEclaniteGuardian(normalizedZone, index, at)
    );
    const core = createEclaniteCore(normalizedZone, at);
    objective.coreId = core.id;
    instance.enemies = [...guardians, core];
    emitInstance?.(group);
    return true;
  }

  function start(group, {emit = true} = {}){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    instance.objective = createEclaniteObjective(now());
    const started = activateZone(group, 1, now());
    if(started && !emit){
      // activateZone emits a full snapshot so immunity/definitions cannot be
      // lost in a delta. The option remains for API symmetry only.
    }
    return started;
  }

  function exposeCore(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || instance.objective?.phase !== "guardians") return false;
    if(aliveEnemies(instance, enemy=>enemy.eclaniteGuardian).length > 0) return false;
    const core = findCore(instance);
    if(!core) return false;
    core.damageImmune = false;
    core.damageImmuneReason = "";
    core.eclaniteCoreExposed = true;
    instance.objective.phase = "core";
    instance.waveState = "core_exposed";
    emitInstance?.(group);
    return true;
  }

  function spawnBossFromCore(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const objective = instance.objective;
    if(objective?.phase !== "guardians" && objective?.phase !== "core") return false;
    const core = findCore(instance);
    const remainingHp = objective.phase === "core" && core
      ? Math.max(1, Number(core.hp || 1))
      : ECLANITE_CORE_MAX_HP;
    const boss = createEclaniteBoss(Number(objective.zone || 1), remainingHp, at);
    instance.enemies = [boss];
    objective.phase = "boss";
    objective.bossId = boss.id;
    objective.coreId = "";
    objective.transitionToken = Number(objective.transitionToken || 0) + 1;
    instance.waveState = "boss";
    instance.nextWaveAt = 0;
    emitInstance?.(group);
    return true;
  }

  function advance(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const objective = instance.objective;
    const zone = Math.max(1, Math.min(ECLANITE_ZONE_COUNT, Number(objective?.zone || 1)));
    if(zone >= ECLANITE_ZONE_COUNT){
      objective.phase = "complete";
      objective.completedAt = Number(at);
      objective.deadlineAt = 0;
      objective.coreId = "";
      objective.bossId = "";
      objective.breaches.oneOpen = true;
      objective.breaches.twoOpen = true;
      instance.enemies = [];
      instance.waveState = "completed";
      instance.nextWaveAt = 0;
      emitInstance?.(group);
      emitPortalComplete?.(group);
      return true;
    }
    if(zone === 1) objective.breaches.oneOpen = true;
    if(zone === 2) objective.breaches.twoOpen = true;
    return activateZone(group, zone + 1, at);
  }

  function handleEnemyDeath(group, enemy, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || Number(enemy?.hp || 0) > 0) return false;
    if(enemy.eclaniteGuardian){
      exposeCore(group, at);
      return true;
    }
    if(enemy.eclaniteCore
      && instance.objective?.phase === "core"
      && String(instance.objective?.coreId || "") === String(enemy.id || "")){
      advance(group, at);
      return true;
    }
    if(enemy.eclaniteBoss
      && instance.objective?.phase === "boss"
      && String(instance.objective?.bossId || "") === String(enemy.id || "")){
      advance(group, at);
      return true;
    }
    return true;
  }

  function updateGroup(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const phase = String(instance.objective?.phase || "");
    if((phase === "guardians" || phase === "core")
      && Number(at) >= Number(instance.objective?.deadlineAt || Infinity)){
      return spawnBossFromCore(group, at);
    }
    return false;
  }

  function updateEclaniteEncounters(_dt, at = now()){
    if(!groups?.values) return;
    for(const group of getInstanceGroups(groups)) updateGroup(group, at);
  }

  return {
    advance,
    exposeCore,
    handleEnemyDeath,
    spawnBossFromCore,
    start,
    updateEclaniteEncounters,
    updateGroup
  };
}
