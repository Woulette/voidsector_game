import { createWorldEnemy, seededRandom } from "../world/spawn.js";
import { VESPER_PORTAL_ID } from "./portalDefinitions.js";

export const VESPER_PORTAL_LEVEL = 15;
export const VESPER_CAGE_COUNT = 4;
export const VESPER_ALLY_HP = 20_000;
export const VESPER_ALLY_SHIELD = 20_000;
export const VESPER_ALLY_DAMAGE_MIN = 1_000;
export const VESPER_ALLY_DAMAGE_MAX = 1_500;
export const VESPER_BOSS_HP = 500_000;
export const VESPER_BOSS_SHIELD = 250_000;
export const VESPER_BOSS_DAMAGE_MIN = 2_000;
export const VESPER_BOSS_DAMAGE_MAX = 3_000;
export const VESPER_BOSS_RANGE = 500;
export const VESPER_BOSS_SPEED = 330;

export const VESPER_PORTAL_MAP = Object.freeze({
  width:6_400,
  height:4_600,
  spawn:Object.freeze({x:0, y:0}),
  boss:Object.freeze({x:0, y:0}),
  cageApproachRadius:950,
  guardLeashRadius:1_150,
  cages:Object.freeze([
    Object.freeze({id:"north_west", number:1, x:-2_450, y:-1_650}),
    Object.freeze({id:"north_east", number:2, x:2_450, y:-1_650}),
    Object.freeze({id:"south_west", number:3, x:-2_450, y:1_650}),
    Object.freeze({id:"south_east", number:4, x:2_450, y:1_650})
  ])
});

const COMBAT_DRONE_IMG = "assets/drones/drone_test_sprite.webp";
const ZERO_REWARD = Object.freeze({credits:0, xp:0, premium:0});
const TURRET_OFFSETS = Object.freeze([
  Object.freeze({x:-210, y:0}),
  Object.freeze({x:210, y:0})
]);
const APPROACH_DEFENDER_OFFSETS = Object.freeze([
  Object.freeze({x:-300, y:-230, kind:"cuirasse_nebulaire"}),
  Object.freeze({x:300, y:-230, kind:"chasseur_spectral"}),
  Object.freeze({x:0, y:300, kind:"raider_astral"})
]);
const CAGE_DESTRUCTION_DEFENDER_OFFSETS = Object.freeze([
  Object.freeze({x:-260, y:250, kind:"cuirasse_nebulaire"}),
  Object.freeze({x:260, y:250, kind:"chasseur_spectral"})
]);

function vesperMapForEnemy(kind){
  return {
    id:`portal-${VESPER_PORTAL_ID}`,
    width:VESPER_PORTAL_MAP.width,
    height:VESPER_PORTAL_MAP.height,
    enemyTypes:[[kind, 1]],
    level:[VESPER_PORTAL_LEVEL, VESPER_PORTAL_LEVEL]
  };
}

function createVesperEnemy(kind, {
  id,
  x,
  y,
  now = Date.now(),
  seed = 1,
  overrides = {}
} = {}){
  const enemy = createWorldEnemy(
    vesperMapForEnemy(kind),
    Math.max(1, Number(seed || 1)),
    seededRandom(Math.max(1, Number(now || 1) + Math.max(1, Number(seed || 1)) * 97)),
    kind,
    {
      id,
      level:VESPER_PORTAL_LEVEL,
      x,
      y,
      temporarySpawn:true
    }
  );
  return {
    ...enemy,
    reward:{...(enemy.reward || ZERO_REWARD)},
    noReward:false,
    worldMapId:`portal-${VESPER_PORTAL_ID}`,
    ...overrides
  };
}

export function createVesperCage(cageDefinition, now = Date.now()){
  const maxHp = 80_000;
  return {
    id:`VESPER-CAGE-${cageDefinition.number}-${now.toString(36)}`,
    serverControlled:true,
    static:true,
    vesperCage:true,
    vesperCageNumber:cageDefinition.number,
    renderMode:"vesper_cage",
    kind:"vesper_cage",
    type:`Cage de Vesper ${cageDefinition.number}`,
    img:"",
    level:VESPER_PORTAL_LEVEL,
    x:cageDefinition.x,
    y:cageDefinition.y,
    homeX:cageDefinition.x,
    homeY:cageDefinition.y,
    angle:0,
    hp:maxHp,
    maxHp,
    shield:0,
    maxShield:0,
    radius:92,
    width:190,
    height:190,
    speed:0,
    attackRange:0,
    attackDamage:0,
    attackCooldown:999_999,
    projectileSpeed:0,
    color:"rgba(239,68,68,.96)",
    particle:"rgba(248,113,113,.78)",
    shieldAbsorbRatio:0,
    reward:{...ZERO_REWARD},
    noReward:true,
    damageImmune:true,
    damageImmuneReason:"Detruis d'abord les tourelles de cette cage.",
    recentHitTimer:0,
    vx:0,
    vy:0,
    moving:false
  };
}

export function createVesperTurret(cageDefinition, turretIndex, now = Date.now()){
  const offset = TURRET_OFFSETS[turretIndex] || TURRET_OFFSETS[0];
  return createVesperEnemy("cuirasse_nebulaire", {
    id:`VESPER-TURRET-${cageDefinition.number}-${turretIndex + 1}-${now.toString(36)}`,
    x:cageDefinition.x + offset.x,
    y:cageDefinition.y + offset.y,
    now,
    seed:cageDefinition.number * 10 + turretIndex,
    overrides:{
      kind:"vesper_turret",
      type:"Tourelle de confinement",
      img:"",
      renderMode:"vesper_turret",
      vesperTurret:true,
      vesperCageNumber:cageDefinition.number,
      anchored:true,
      speed:0,
      hp:60_000,
      maxHp:60_000,
      shield:30_000,
      maxShield:30_000,
      radius:48,
      width:100,
      height:100,
      attackRange:620,
      attackDamage:950,
      attackDamageMin:800,
      attackDamageMax:1_100,
      useExactDamageRange:true,
      attackCooldown:1_500,
      projectileSpeed:720,
      requiresPlayerAttack:false,
      followBeforeAttacked:true,
      targetMemoryMs:1_500,
      color:"rgba(220,38,38,.98)",
      particle:"rgba(248,113,113,.86)"
    }
  });
}

function createVesperGuard(cageDefinition, offset, phase, index, now){
  const phaseCode = phase === "reinforcement" ? "R" : "A";
  return createVesperEnemy(offset.kind, {
    id:`VESPER-GUARD-${cageDefinition.number}-${phaseCode}${index + 1}-${now.toString(36)}`,
    x:cageDefinition.x + offset.x,
    y:cageDefinition.y + offset.y,
    now,
    seed:cageDefinition.number * 100 + index + (phase === "reinforcement" ? 50 : 0),
    overrides:{
      renderMode:"vesper_guard",
      vesperGuard:true,
      vesperGuardPhase:phase,
      vesperCageNumber:cageDefinition.number,
      guardLeashRadius:VESPER_PORTAL_MAP.guardLeashRadius,
      guardHoldRadius:45,
      requiresPlayerAttack:true,
      followBeforeAttacked:false,
      targetMemoryMs:900,
      color:"rgba(239,68,68,.96)",
      particle:"rgba(248,113,113,.78)"
    }
  });
}

export function createVesperDefenders(cageDefinition, phase = "approach", now = Date.now()){
  const offsets = phase === "reinforcement"
    ? CAGE_DESTRUCTION_DEFENDER_OFFSETS
    : APPROACH_DEFENDER_OFFSETS;
  return offsets.map((offset, index)=>createVesperGuard(cageDefinition, offset, phase, index, now));
}

export function createVesperAlliedDrone(cageDefinition, slotIndex, now = Date.now()){
  const angle = slotIndex / VESPER_CAGE_COUNT * Math.PI * 2;
  return {
    id:`VESPER-ALLY-${cageDefinition.number}-${now.toString(36)}`,
    name:`Drone libere ${cageDefinition.number}`,
    img:COMBAT_DRONE_IMG,
    renderMode:"vesper_ally_drone",
    color:"rgba(239,68,68,.98)",
    vesperAlly:true,
    cageNumber:cageDefinition.number,
    slotIndex,
    x:cageDefinition.x,
    y:cageDefinition.y,
    vx:0,
    vy:0,
    angle,
    hp:VESPER_ALLY_HP,
    maxHp:VESPER_ALLY_HP,
    shield:VESPER_ALLY_SHIELD,
    maxShield:VESPER_ALLY_SHIELD,
    shieldAbsorbRatio:.8,
    radius:38,
    width:76,
    height:76,
    speed:430,
    followDistance:260,
    maxLeaderDistance:950,
    attackRange:500,
    damageMin:VESPER_ALLY_DAMAGE_MIN,
    damageMax:VESPER_ALLY_DAMAGE_MAX,
    attackCooldownMs:1_250,
    nextAttackAt:now + 500 + slotIndex * 180,
    alive:true
  };
}

export function createVesperBoss(now = Date.now()){
  return createVesperEnemy("boss_cuirasse_nebulaire", {
    id:`VESPER-BOSS-${now.toString(36)}`,
    x:VESPER_PORTAL_MAP.boss.x,
    y:VESPER_PORTAL_MAP.boss.y,
    now,
    seed:9_999,
    overrides:{
      kind:"vesper_giant_drone",
      type:"Drone geant de Vesper",
      img:COMBAT_DRONE_IMG,
      renderMode:"vesper_boss",
      vesperBoss:true,
      hp:VESPER_BOSS_HP,
      maxHp:VESPER_BOSS_HP,
      shield:VESPER_BOSS_SHIELD,
      maxShield:VESPER_BOSS_SHIELD,
      radius:118,
      width:270,
      height:270,
      speed:VESPER_BOSS_SPEED,
      attackRange:VESPER_BOSS_RANGE,
      attackDamage:2_500,
      attackDamageMin:VESPER_BOSS_DAMAGE_MIN,
      attackDamageMax:VESPER_BOSS_DAMAGE_MAX,
      useExactDamageRange:true,
      attackCooldown:1_300,
      projectileSpeed:760,
      requiresPlayerAttack:false,
      followBeforeAttacked:true,
      targetMemoryMs:3_000,
      color:"rgba(220,38,38,.99)",
      particle:"rgba(248,113,113,.9)"
    }
  });
}

export function createVesperBossOrbiters(boss, now = Date.now(), count = 6){
  return Array.from({length:Math.max(1, Number(count || 6))}, (_, index)=>{
    const angle = index / Math.max(1, count) * Math.PI * 2;
    const orbitRadius = 225 + (index % 2) * 45;
    return {
      id:`VESPER-BOSS-ORBITER-${index + 1}-${now.toString(36)}`,
      img:COMBAT_DRONE_IMG,
      color:"rgba(239,68,68,.98)",
      renderMode:"vesper_boss_orbiter",
      orbitRadius,
      angularSpeed:(index % 2 ? -.62 : .72),
      baseAngle:angle,
      angle,
      x:Number(boss?.x || 0) + Math.cos(angle) * orbitRadius,
      y:Number(boss?.y || 0) + Math.sin(angle) * orbitRadius,
      size:52
    };
  });
}

export function createVesperPortalState(now = Date.now()){
  const cages = VESPER_PORTAL_MAP.cages.map(cageDefinition=>{
    const cage = createVesperCage(cageDefinition, now);
    const turrets = TURRET_OFFSETS.map((_, index)=>createVesperTurret(cageDefinition, index, now));
    return {
      id:cage.id,
      key:cageDefinition.id,
      number:cageDefinition.number,
      x:cageDefinition.x,
      y:cageDefinition.y,
      radius:cage.radius,
      hp:cage.hp,
      maxHp:cage.maxHp,
      destroyed:false,
      destroyedAt:0,
      defendersSpawned:false,
      reinforcementsSpawned:false,
      turretIds:turrets.map(turret=>turret.id),
      turretsRemaining:turrets.length,
      allyId:null,
      cage,
      turrets
    };
  });
  return {
    spawn:{...VESPER_PORTAL_MAP.spawn},
    enemies:cages.flatMap(cage=>[cage.cage, ...cage.turrets]),
    allies:[],
    objective:{
      kind:"vesper",
      stage:"cages",
      cagesDestroyed:0,
      cagesTotal:VESPER_CAGE_COUNT,
      bossSpawned:false,
      bossId:null,
      bossOrbiters:[],
      cages:cages.map(({cage, turrets, ...state})=>state)
    }
  };
}

export function isVesperPortalInstance(instance){
  return instance?.type === "portal" && instance.portal?.id === VESPER_PORTAL_ID && instance.portal?.encounterKind !== "azuron";
}

export function publicVesperAllies(instance){
  if(!isVesperPortalInstance(instance)) return [];
  return (Array.isArray(instance.allies) ? instance.allies : [])
    .filter(ally=>ally?.alive !== false && Number(ally?.hp || 0) > 0)
    .map(ally=>({
      id:ally.id,
      name:ally.name,
      img:ally.img,
      renderMode:ally.renderMode,
      color:ally.color,
      x:Number(ally.x || 0),
      y:Number(ally.y || 0),
      vx:Number(ally.vx || 0),
      vy:Number(ally.vy || 0),
      angle:Number(ally.angle || 0),
      hp:Math.max(0, Number(ally.hp || 0)),
      maxHp:Math.max(0, Number(ally.maxHp || 0)),
      shield:Math.max(0, Number(ally.shield || 0)),
      maxShield:Math.max(0, Number(ally.maxShield || 0)),
      radius:Number(ally.radius || 38),
      width:Number(ally.width || 76),
      height:Number(ally.height || 76),
      attackRange:Number(ally.attackRange || 500),
      alive:true
    }));
}

export function publicVesperObjective(instance){
  if(!isVesperPortalInstance(instance) || instance.objective?.kind !== "vesper") return null;
  const objective = instance.objective;
  return {
    kind:"vesper",
    stage:String(objective.stage || "cages"),
    cagesDestroyed:Math.max(0, Number(objective.cagesDestroyed || 0)),
    cagesTotal:VESPER_CAGE_COUNT,
    bossSpawned:Boolean(objective.bossSpawned),
    bossId:objective.bossId || null,
    cages:(objective.cages || []).map(cage=>({
      id:cage.id,
      key:cage.key,
      number:Number(cage.number || 0),
      x:Number(cage.x || 0),
      y:Number(cage.y || 0),
      radius:Number(cage.radius || 92),
      hp:Math.max(0, Number(cage.hp || 0)),
      maxHp:Math.max(0, Number(cage.maxHp || 0)),
      destroyed:Boolean(cage.destroyed),
      defendersSpawned:Boolean(cage.defendersSpawned),
      reinforcementsSpawned:Boolean(cage.reinforcementsSpawned),
      turretsRemaining:Math.max(0, Number(cage.turretsRemaining || 0)),
      turretIds:[...(cage.turretIds || [])],
      allyId:cage.allyId || null
    })),
    bossOrbiters:(objective.bossOrbiters || []).map(orbiter=>({
      id:orbiter.id,
      img:orbiter.img,
      renderMode:orbiter.renderMode,
      color:orbiter.color,
      x:Number(orbiter.x || 0),
      y:Number(orbiter.y || 0),
      angle:Number(orbiter.angle || 0),
      orbitRadius:Number(orbiter.orbitRadius || 0),
      size:Number(orbiter.size || 52)
    }))
  };
}
