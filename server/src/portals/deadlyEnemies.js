import { getEnemyDamageRange } from "../../../src/shared/enemyDamage.js";

export const DEADLY_ENEMY_LEVEL = 10;
export const DEADLY_BOSS_SUMMON_INTERVAL_MS = 60_000;
export const DEADLY_BOSS_SUMMON_BATCH_SIZE = 5;
export const DEADLY_BOSS_MAX_LIVE_SUMMONS = 20;

export const DEADLY_MINION_KINDS = Object.freeze([
  "deadly_eclaireur",
  "deadly_intercepteur",
  "deadly_gardien",
  "deadly_traqueur",
  "deadly_ravageur"
]);

export const DEADLY_ROUTE_WAVES = Object.freeze({
  1:Object.freeze({deadly_eclaireur:8}),
  2:Object.freeze({deadly_intercepteur:8, deadly_eclaireur:2}),
  3:Object.freeze({deadly_traqueur:6, deadly_gardien:2}),
  4:Object.freeze({deadly_ravageur:2, deadly_gardien:6})
});

export const DEADLY_BEACON_WAVES = Object.freeze({
  1:Object.freeze({deadly_eclaireur:6, deadly_intercepteur:4}),
  2:Object.freeze({deadly_eclaireur:8, deadly_traqueur:2}),
  3:Object.freeze({deadly_gardien:4, deadly_traqueur:6}),
  4:Object.freeze({deadly_ravageur:6, deadly_gardien:4})
});

export const DEADLY_FINAL_GATE_WAVE = Object.freeze({
  deadly_ravageur:6,
  deadly_traqueur:2,
  deadly_gardien:4
});

export const DEADLY_ENEMY_TYPES = Object.freeze({
  deadly_eclaireur:Object.freeze({
    kind:"deadly_eclaireur",
    type:"Éclaireur",
    img:"assets/enemies/deadly/deadly_01_emerald.webp",
    hp:10000,
    shield:10000,
    attackDamage:200,
    ...getEnemyDamageRange(200),
    speed:350,
    attackRange:260,
    width:55,
    height:71,
    radius:28,
    projectileSpeed:720,
    color:"rgba(163,230,53,.95)",
    particle:"rgba(190,242,100,.76)",
    reward:Object.freeze({credits:20000,premium:16,xp:9000}),
  }),
  deadly_intercepteur:Object.freeze({
    kind:"deadly_intercepteur",
    type:"Intercepteur",
    img:"assets/enemies/deadly/deadly_02_amber.webp",
    hp:15000,
    shield:15000,
    attackDamage:300,
    ...getEnemyDamageRange(300),
    speed:330,
    attackRange:270,
    width:58,
    height:76,
    radius:30,
    projectileSpeed:740,
    color:"rgba(249,115,22,.95)",
    particle:"rgba(253,186,116,.76)",
    reward:Object.freeze({credits:28000,premium:20,xp:12000}),
  }),
  deadly_gardien:Object.freeze({
    kind:"deadly_gardien",
    type:"Gardien",
    img:"assets/enemies/deadly/deadly_03_cyan.webp",
    hp:60000,
    shield:60000,
    attackDamage:500,
    ...getEnemyDamageRange(500),
    speed:290,
    attackRange:270,
    width:79,
    height:116,
    radius:46,
    projectileSpeed:680,
    color:"rgba(34,211,238,.95)",
    particle:"rgba(103,232,249,.78)",
    reward:Object.freeze({credits:150000,premium:75,xp:56000}),
  }),
  deadly_traqueur:Object.freeze({
    kind:"deadly_traqueur",
    type:"Traqueur",
    img:"assets/enemies/deadly/deadly_04_magenta.webp",
    hp:50000,
    shield:50000,
    attackDamage:400,
    ...getEnemyDamageRange(400),
    speed:340,
    attackRange:270,
    width:69,
    height:108,
    radius:42,
    projectileSpeed:720,
    color:"rgba(236,72,153,.95)",
    particle:"rgba(249,168,212,.78)",
    reward:Object.freeze({credits:120000,premium:65,xp:48000}),
  }),
  deadly_ravageur:Object.freeze({
    kind:"deadly_ravageur",
    type:"Ravageur",
    img:"assets/enemies/deadly/deadly_05_blue.webp",
    hp:55000,
    shield:55000,
    attackDamage:600,
    ...getEnemyDamageRange(600),
    speed:380,
    attackRange:280,
    width:108,
    height:116,
    radius:50,
    projectileSpeed:760,
    color:"rgba(59,130,246,.96)",
    particle:"rgba(147,197,253,.8)",
    reward:Object.freeze({credits:180000,premium:90,xp:72000}),
  }),
  deadly_amiral_k137:Object.freeze({
    kind:"deadly_amiral_k137",
    type:"Amiral K-137",
    img:"assets/enemies/deadly/deadly_06_boss.webp",
    hp:1000000,
    shield:1000000,
    attackDamage:4000,
    ...getEnemyDamageRange(4000),
    speed:330,
    attackRange:300,
    width:181,
    height:182,
    radius:90,
    projectileSpeed:820,
    color:"rgba(37,99,235,.98)",
    particle:"rgba(96,165,250,.84)",
    reward:Object.freeze({credits:4000000,premium:5000,xp:1000000}),
  })
});

export function pickDeadlyMinionKind(random = Math.random){
  const roll = Math.max(0, Math.min(.999999, Number(random()) || 0));
  return DEADLY_MINION_KINDS[Math.floor(roll * DEADLY_MINION_KINDS.length)];
}

export function createDeadlyEnemy(kind, {
  id = "",
  x = 0,
  y = 0,
  angle = Math.PI,
  summonedByBoss = false,
  now = Date.now()
} = {}){
  const base = DEADLY_ENEMY_TYPES[kind] || DEADLY_ENEMY_TYPES.deadly_eclaireur;
  const attackDamage = base.attackDamage;
  const {attackDamageMin, attackDamageMax} = getEnemyDamageRange(attackDamage);
  const hp = Math.max(1, Math.round(Number(base.hp || 1)));
  const shield = Math.max(0, Math.round(Number(base.shield || 0)));
  const boss = base.kind === "deadly_amiral_k137";
  return {
    id:id || `DEADLY-${base.kind}-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    serverControlled:true,
    kind:base.kind,
    type:base.type,
    img:base.img,
    level:DEADLY_ENEMY_LEVEL,
    x:Number(x || 0),
    y:Number(y || 0),
    homeX:Number(x || 0),
    homeY:Number(y || 0),
    angle:Number(angle || 0),
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    radius:Number(base.radius || 36),
    width:Number(base.width || 96),
    height:Number(base.height || 96),
    speed:Number(base.speed || 160),
    attackRange:Number(base.attackRange || 350),
    attackDamage,
    attackDamageMin,
    attackDamageMax,
    useExactDamageRange:true,
    attackCooldown:1_000,
    staggerFirstAttack:true,
    projectileSpeed:Number(base.projectileSpeed || 680),
    particle:base.particle || base.color,
    reward:{...base.reward},
    color:base.color,
    shieldAbsorbRatio:.8,
    nextAttackAt:0,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0,
    damageThreat:{},
    threatRecalcAt:0,
    wanderT:0,
    wanderX:Number(x || 0),
    wanderY:Number(y || 0),
    rewardGranted:false,
    ...(boss ? {
      rickyBoss:true,
      rickyBossNextSummonAt:now + DEADLY_BOSS_SUMMON_INTERVAL_MS
    } : {}),
    ...(summonedByBoss ? {rickyBossSummon:true} : {})
  };
}
