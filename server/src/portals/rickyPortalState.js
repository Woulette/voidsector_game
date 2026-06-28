import {
  RICKY_PORTAL_LEVERS,
  RICKY_PORTAL_MAP,
  RICKY_PORTAL_TRIGGER_ZONES
} from "../../../src/data/rickyPortal.js";
import { createDeadlyEnemy } from "./deadlyEnemies.js";

export const RICKY_PORTAL_ID = "ricky";
export const RICKY_PORTAL_KEY_ITEM_ID = "portal_anchor_key";
export const RICKY_PORTAL_KEY_ITEM_NAME = "Clé du portail Deadly";
export const RICKY_PORTAL_KEY_REQUIRED_MESSAGE = `0/1 ${RICKY_PORTAL_KEY_ITEM_NAME}`;
export const RICKY_MAX_GROUP_MEMBERS = 4;

export const RICKY_ALLY_ID = "ricky_companion";
const RICKY_ALLY_IMG = "assets/ships/npc/npc_saucer.png";
const RICKY_SHIELD_REGEN_PER_SECOND = 150;
const RICKY_LASER_DAMAGE_MIN = 3000;
const RICKY_LASER_DAMAGE_MAX = 5000;
const RICKY_ROCKET_DAMAGE_MIN = 1500;
const RICKY_ROCKET_DAMAGE_MAX = 3000;

export const RICKY_HEAL_COOLDOWN_MS = 60000;
export const RICKY_HEAL_BEACON_DURATION_MS = 18000;
export const RICKY_HEAL_BEACON_INTERVAL_MS = 2000;
export const RICKY_HEAL_BEACON_RADIUS = 250;
export const RICKY_HEAL_BEACON_AMOUNT = 3000;
export const RICKY_LEVER_MOVE_TOLERANCE = 20;

const RICKY_PORTAL_QUEST_BASE_ID = "quest_lv10_maintenance_impossible";
const RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM = {
  astra:"",
  cyan:"_cyan",
  jaune:"_jaune",
  verte:"_verte"
};

export const RICKY_PORTAL_DEFINITION = {
  id:RICKY_PORTAL_ID,
  name:"Portail de Ricky",
  requirement:{level:10},
  accessItem:{itemId:RICKY_PORTAL_KEY_ITEM_ID, amount:1, name:RICKY_PORTAL_KEY_ITEM_NAME}
};

export function getRickyPortalQuestId(profile){
  const firmId = String(profile?.player?.firmId || "astra").toLowerCase();
  if(!Object.hasOwn(RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM, firmId)) return null;
  return `${RICKY_PORTAL_QUEST_BASE_ID}${RICKY_PORTAL_QUEST_SUFFIX_BY_FIRM[firmId]}`;
}

export function createRickyObjective(){
  return {
    stage:"route_1",
    breachOpen:false,
    cinematicPlayed:false,
    bossSpawned:false,
    cageSpawned:false,
    finalWaveSpawned:false,
    finalWaveCleared:false,
    completedAt:0,
    exitAt:0,
    routeWaves:RICKY_PORTAL_TRIGGER_ZONES.map(zone=>({
      ...zone,
      triggered:false,
      cleared:false,
      triggeredAt:0,
      clearedAt:0
    })),
    levers:RICKY_PORTAL_LEVERS.map(lever=>({
      ...lever,
      approached:false,
      unlocked:false,
      active:false,
      activatedAt:0,
      activationWaveSpawned:false,
      activationWaveCleared:false,
      activation:null
    }))
  };
}

export function createRickyBoss(now = Date.now()){
  return createDeadlyEnemy("deadly_amiral_k137", {
    id:`RICKY-BOSS-${now.toString(36)}`,
    x:RICKY_PORTAL_MAP.boss.x,
    y:RICKY_PORTAL_MAP.boss.y,
    now
  });
}

export function createDeadlyCage(now = Date.now()){
  return {
    id:`RICKY-CAGE-${now.toString(36)}`,
    serverControlled:true,
    static:true,
    renderMode:"deadly_cage",
    rickyCage:true,
    noReward:true,
    kind:"deadly_cage",
    type:"Cage de Deadly",
    img:"",
    level:10,
    x:RICKY_PORTAL_MAP.cage.x,
    y:RICKY_PORTAL_MAP.cage.y,
    homeX:RICKY_PORTAL_MAP.cage.x,
    homeY:RICKY_PORTAL_MAP.cage.y,
    angle:0,
    hp:RICKY_PORTAL_MAP.cage.hp,
    maxHp:RICKY_PORTAL_MAP.cage.hp,
    shield:0,
    maxShield:0,
    radius:RICKY_PORTAL_MAP.cage.radius,
    width:300,
    height:300,
    speed:0,
    attackRange:0,
    attackDamage:0,
    attackCooldown:999,
    projectileSpeed:0,
    particle:"rgba(250,204,21,.85)",
    reward:{credits:0, xp:0, premium:0},
    color:"rgba(250,204,21,.95)",
    shieldAbsorbRatio:0,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0
  };
}

export function createRickyAlly(spawn = {x:0, y:0}, now = Date.now()){
  return {
    id:RICKY_ALLY_ID,
    name:"Ricky",
    img:RICKY_ALLY_IMG,
    x:Number(spawn.x || 0) - 170,
    y:Number(spawn.y || 0) + 90,
    vx:0,
    vy:0,
    angle:0,
    hp:100000,
    maxHp:100000,
    shield:80000,
    maxShield:80000,
    shieldRegenPerSecond:RICKY_SHIELD_REGEN_PER_SECOND,
    radius:44,
    width:86,
    height:86,
    speed:500,
    followDistance:260,
    maxLeaderDistance:950,
    attackRange:600,
    laserDamageMin:RICKY_LASER_DAMAGE_MIN,
    laserDamageMax:RICKY_LASER_DAMAGE_MAX,
    rocketDamageMin:RICKY_ROCKET_DAMAGE_MIN,
    rocketDamageMax:RICKY_ROCKET_DAMAGE_MAX,
    laserCooldownMs:1400,
    rocketCooldownMs:4600,
    nextLaserAt:now + 900,
    nextRocketAt:now + 2200,
    healCooldownMs:RICKY_HEAL_COOLDOWN_MS,
    healCooldownUntil:0,
    alive:true
  };
}

export function isRickyPortalInstance(instance){
  return instance?.type === "portal" && instance.portal?.id === RICKY_PORTAL_ID;
}
