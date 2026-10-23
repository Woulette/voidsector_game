import { getInstanceGroups } from "./portalSessions.js";
import { getTrustedMovementSpeed } from "../players/playerStateValidation.js";
import { WORLD_ENEMY_TYPES } from "../world/definitions.js";
import {
  PRISMATIC_BOSS_MAX_HP,
  PRISMATIC_BOSS_MAX_SHIELD,
  PRISMATIC_GUARDIAN_ASSET,
  PRISMATIC_PLANET_MAX_HP,
  PRISMATIC_PORTAL_ID,
  PRISMATIC_PORTAL_LEVEL,
  PRISMATIC_PORTAL_MAP
} from "../../../src/data/prismaticPortal.js";

export {
  PRISMATIC_BOSS_MAX_HP,
  PRISMATIC_BOSS_MAX_SHIELD,
  PRISMATIC_GUARDIAN_ASSET,
  PRISMATIC_PLANET_MAX_HP,
  PRISMATIC_PORTAL_ID,
  PRISMATIC_PORTAL_LEVEL,
  PRISMATIC_PORTAL_MAP
};

export const PRISMATIC_GUARDIANS_PER_PLANET = 3;
export const PRISMATIC_GUARDIAN_MAX_HP = 400_000;
export const PRISMATIC_GUARDIAN_MAX_SHIELD = 400_000;
export const PRISMATIC_GUARDIAN_DAMAGE_MIN = 3_000;
export const PRISMATIC_GUARDIAN_DAMAGE_MAX = 5_000;
export const PRISMATIC_GUARDIAN_RANGE = 400;
export const PRISMATIC_GUARDIAN_SPEED = 400;
export const PRISMATIC_BOSS_DAMAGE_MIN = 5_000;
export const PRISMATIC_BOSS_DAMAGE_MAX = 10_000;
export const PRISMATIC_BOSS_RANGE = 450;
export const PRISMATIC_BOSS_SPEED = 300;
export const PRISMATIC_BURN_COOLDOWN_MS = 60_000;
export const PRISMATIC_BURN_DAMAGE = 3_000;
export const PRISMATIC_BURN_TICKS = 10;
export const PRISMATIC_BURN_TICK_MS = 1_000;
export const PRISMATIC_HEAL_COOLDOWN_MS = 30_000;
export const PRISMATIC_HEAL_AMOUNT = 5_000;
export const PRISMATIC_HEAL_TICKS = 10;
export const PRISMATIC_HEAL_TICK_MS = 1_000;
export const PRISMATIC_SLOW_COOLDOWN_MS = 60_000;
export const PRISMATIC_SLOW_PERCENT = 50;
export const PRISMATIC_SLOW_DURATION_MS = 5_000;

const ZERO_REWARD = Object.freeze({credits:0, xp:0, premium:0});
const EFFECT_RETENTION_MS = 1_300;
const GUARDIAN_ORBIT_RADIUS = 290;
const GUARDIAN_LEASH_RADIUS = 920;
const PLANET_COLORS = Object.freeze({
  fire:"rgba(249,115,22,.98)",
  water:"rgba(56,189,248,.98)",
  red:"rgba(244,63,94,.98)"
});

const BOSS_DEFINITIONS = Object.freeze([
  Object.freeze({
    color:"red",
    label:"Ardent prismatique",
    ability:"burn",
    x:-650,
    y:-500,
    tint:"rgba(248,80,80,.98)"
  }),
  Object.freeze({
    color:"green",
    label:"Régent prismatique",
    ability:"heal",
    x:650,
    y:-500,
    tint:"rgba(52,211,153,.98)"
  }),
  Object.freeze({
    color:"blue",
    label:"Cryarque prismatique",
    ability:"slow",
    x:0,
    y:-820,
    tint:"rgba(56,189,248,.98)"
  })
]);

function living(entries){
  return (Array.isArray(entries) ? entries : []).filter(entry=>Number(entry?.hp || 0) > 0);
}

function preparePrismaticEnemy(enemy){
  const reward = enemy?.reward || ZERO_REWARD;
  const hasCombatReward = Number(reward.credits || 0) > 0
    || Number(reward.xp || 0) > 0
    || Number(reward.premium || 0) > 0;
  enemy.reward = hasCombatReward ? {...reward} : {...ZERO_REWARD};
  enemy.noReward = !hasCombatReward;
  enemy.temporarySpawn = true;
  enemy.serverControlled = true;
  enemy.worldMapId = `portal-${PRISMATIC_PORTAL_ID}`;
  return enemy;
}

function findPlanetEnemy(instance, planetId){
  return (instance?.enemies || []).find(enemy=>
    enemy.prismaticPlanet
    && String(enemy.prismaticPlanetId || "") === String(planetId || "")
  ) || null;
}

function findBossEnemy(instance, color){
  return (instance?.enemies || []).find(enemy=>
    enemy.prismaticBoss
    && String(enemy.prismaticColor || "") === String(color || "")
  ) || null;
}

function guardianCount(instance, planetId){
  return living(instance?.enemies).filter(enemy=>
    enemy.prismaticGuardian
    && String(enemy.prismaticPlanetId || "") === String(planetId || "")
  ).length;
}

export function createPrismaticPlanet(definition){
  const planet = definition || PRISMATIC_PORTAL_MAP.planets[0];
  const color = PLANET_COLORS[planet.element] || PLANET_COLORS.red;
  return preparePrismaticEnemy({
    id:`PR-PLANET-${planet.id}`,
    kind:`prismatic_planet_${planet.element}`,
    type:planet.label,
    img:String(planet.asset || ""),
    renderMode:"prismatic_planet",
    level:PRISMATIC_PORTAL_LEVEL,
    x:Number(planet.x || 0),
    y:Number(planet.y || 0),
    homeX:Number(planet.x || 0),
    homeY:Number(planet.y || 0),
    angle:0,
    hp:PRISMATIC_PLANET_MAX_HP,
    maxHp:PRISMATIC_PLANET_MAX_HP,
    shield:0,
    maxShield:0,
    shieldAbsorbRatio:0,
    radius:150,
    width:330,
    height:330,
    speed:0,
    attackRange:0,
    attackDamage:0,
    attackCooldown:60_000,
    projectileSpeed:0,
    color,
    particle:color,
    static:true,
    anchored:true,
    damageImmune:true,
    damageImmuneReason:"Éliminez les trois gardiens ancestraux de cette planète.",
    prismaticEnemy:true,
    prismaticPlanet:true,
    prismaticPlanetId:planet.id,
    prismaticElement:planet.element,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0,
    damageThreat:{},
    nextAttackAt:Infinity
  });
}

export function createPrismaticGuardian(definition, index){
  const planet = definition || PRISMATIC_PORTAL_MAP.planets[0];
  const safeIndex = Math.max(0, Math.min(PRISMATIC_GUARDIANS_PER_PLANET - 1, Math.floor(Number(index || 0))));
  const angle = Math.PI * 2 * safeIndex / PRISMATIC_GUARDIANS_PER_PLANET - Math.PI / 2;
  const x = Number(planet.x || 0) + Math.cos(angle) * GUARDIAN_ORBIT_RADIUS;
  const y = Number(planet.y || 0) + Math.sin(angle) * GUARDIAN_ORBIT_RADIUS;
  const color = PLANET_COLORS[planet.element] || PLANET_COLORS.red;
  const reward = WORLD_ENEMY_TYPES.cristanite.reward(PRISMATIC_PORTAL_LEVEL);
  return preparePrismaticEnemy({
    id:`PR-GUARD-${planet.id}-${safeIndex + 1}`,
    kind:`prismatic_guardian_${planet.element}`,
    type:`Gardien ancestral — ${planet.label}`,
    img:PRISMATIC_GUARDIAN_ASSET,
    renderMode:"prismatic_guardian",
    level:PRISMATIC_PORTAL_LEVEL,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:angle + Math.PI / 2,
    hp:PRISMATIC_GUARDIAN_MAX_HP,
    maxHp:PRISMATIC_GUARDIAN_MAX_HP,
    shield:PRISMATIC_GUARDIAN_MAX_SHIELD,
    maxShield:PRISMATIC_GUARDIAN_MAX_SHIELD,
    shieldAbsorbRatio:.8,
    radius:64,
    width:142,
    height:142,
    speed:PRISMATIC_GUARDIAN_SPEED,
    attackRange:PRISMATIC_GUARDIAN_RANGE,
    attackDamage:Math.round((PRISMATIC_GUARDIAN_DAMAGE_MIN + PRISMATIC_GUARDIAN_DAMAGE_MAX) / 2),
    attackDamageMin:PRISMATIC_GUARDIAN_DAMAGE_MIN,
    attackDamageMax:PRISMATIC_GUARDIAN_DAMAGE_MAX,
    useExactDamageRange:true,
    attackCooldown:1_000,
    staggerFirstAttack:true,
    projectileSpeed:720,
    attackStyle:"prismatic_guardian",
    color,
    particle:color,
    followBeforeAttacked:true,
    requiresPlayerAttack:false,
    targetMemoryMs:2_000,
    guardLeashRadius:GUARDIAN_LEASH_RADIUS,
    prismaticEnemy:true,
    prismaticGuardian:true,
    prismaticPlanetId:planet.id,
    prismaticElement:planet.element,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0,
    damageThreat:{},
    threatRecalcAt:0,
    nextAttackAt:0,
    reward:{...reward}
  });
}

export function createPrismaticBoss(definition, startedAt = Date.now()){
  const boss = definition || BOSS_DEFINITIONS[0];
  const cooldown = boss.ability === "heal"
    ? PRISMATIC_HEAL_COOLDOWN_MS
    : boss.ability === "slow"
      ? PRISMATIC_SLOW_COOLDOWN_MS
      : PRISMATIC_BURN_COOLDOWN_MS;
  const baseReward = WORLD_ENEMY_TYPES.astranite.reward(PRISMATIC_PORTAL_LEVEL);
  const reward = {
    credits:Number(baseReward.credits || 0) * 2,
    xp:Number(baseReward.xp || 0) * 2,
    premium:Number(baseReward.premium || 0) * 2
  };
  return preparePrismaticEnemy({
    id:`PR-BOSS-${boss.color}`,
    kind:`prismatic_boss_${boss.color}`,
    type:boss.label,
    img:PRISMATIC_GUARDIAN_ASSET,
    renderMode:"prismatic_boss",
    level:PRISMATIC_PORTAL_LEVEL,
    x:Number(boss.x || 0),
    y:Number(boss.y || 0),
    homeX:Number(boss.x || 0),
    homeY:Number(boss.y || 0),
    angle:Math.PI,
    hp:PRISMATIC_BOSS_MAX_HP,
    maxHp:PRISMATIC_BOSS_MAX_HP,
    shield:PRISMATIC_BOSS_MAX_SHIELD,
    maxShield:PRISMATIC_BOSS_MAX_SHIELD,
    shieldAbsorbRatio:.8,
    radius:112,
    width:252,
    height:252,
    speed:PRISMATIC_BOSS_SPEED,
    attackRange:PRISMATIC_BOSS_RANGE,
    attackDamage:Math.round((PRISMATIC_BOSS_DAMAGE_MIN + PRISMATIC_BOSS_DAMAGE_MAX) / 2),
    attackDamageMin:PRISMATIC_BOSS_DAMAGE_MIN,
    attackDamageMax:PRISMATIC_BOSS_DAMAGE_MAX,
    useExactDamageRange:true,
    attackCooldown:1_000,
    staggerFirstAttack:true,
    projectileSpeed:780,
    attackStyle:`prismatic_${boss.color}`,
    color:boss.tint,
    particle:boss.tint,
    followBeforeAttacked:true,
    requiresPlayerAttack:false,
    targetMemoryMs:8_000,
    prismaticEnemy:true,
    prismaticBoss:true,
    prismaticColor:boss.color,
    prismaticAbility:boss.ability,
    prismaticNextAbilityAt:Number(startedAt || Date.now()) + cooldown,
    prismaticAbilityCount:0,
    vx:0,
    vy:0,
    moving:false,
    recentHitTimer:0,
    damageThreat:{},
    threatRecalcAt:0,
    nextAttackAt:0,
    reward:{...reward}
  });
}

export function createPrismaticObjective(){
  return {
    kind:"prismatic",
    stage:"planets",
    planets:PRISMATIC_PORTAL_MAP.planets.map(planet=>({
      id:planet.id,
      element:planet.element,
      label:planet.label,
      x:planet.x,
      y:planet.y,
      hp:PRISMATIC_PLANET_MAX_HP,
      maxHp:PRISMATIC_PLANET_MAX_HP,
      destroyed:false,
      guardiansRemaining:PRISMATIC_GUARDIANS_PER_PLANET
    })),
    rift:{
      active:false,
      x:PRISMATIC_PORTAL_MAP.rift.x,
      y:PRISMATIC_PORTAL_MAP.rift.y,
      radius:PRISMATIC_PORTAL_MAP.rift.radius,
      entered:false
    },
    bosses:[],
    effects:[],
    activeBurns:[],
    activeHeals:[],
    activeSlows:[],
    effectSequence:0,
    completedAt:0
  };
}

export function isPrismaticPortalInstance(instance){
  return Boolean(
    instance?.type === "portal"
    && String(instance?.portal?.id || "") === PRISMATIC_PORTAL_ID
  );
}

function syncPrismaticObjective(instance){
  const objective = instance?.objective;
  if(!isPrismaticPortalInstance(instance) || objective?.kind !== "prismatic") return;
  for(const state of objective.planets || []){
    const planet = findPlanetEnemy(instance, state.id);
    if(planet){
      state.hp = Math.max(0, Number(planet.hp || 0));
      state.maxHp = Math.max(1, Number(planet.maxHp || PRISMATIC_PLANET_MAX_HP));
      state.destroyed = state.hp <= 0;
    }
    state.guardiansRemaining = guardianCount(instance, state.id);
  }
  for(const state of objective.bosses || []){
    const boss = findBossEnemy(instance, state.color);
    if(!boss) continue;
    state.id = String(boss.id || state.id || "");
    state.hp = Math.max(0, Number(boss.hp || 0));
    state.maxHp = Math.max(1, Number(boss.maxHp || PRISMATIC_BOSS_MAX_HP));
    state.shield = Math.max(0, Number(boss.shield || 0));
    state.maxShield = Math.max(0, Number(boss.maxShield || PRISMATIC_BOSS_MAX_SHIELD));
    state.alive = state.hp > 0;
  }
}

export function publicPrismaticObjective(instance){
  if(!isPrismaticPortalInstance(instance) || instance?.objective?.kind !== "prismatic") return null;
  syncPrismaticObjective(instance);
  const objective = instance.objective;
  return {
    kind:"prismatic",
    stage:["planets", "rift", "bosses", "complete"].includes(objective.stage)
      ? objective.stage
      : "planets",
    planets:(objective.planets || []).map(planet=>({
      id:String(planet.id || ""),
      element:String(planet.element || ""),
      label:String(planet.label || ""),
      x:Number(planet.x || 0),
      y:Number(planet.y || 0),
      hp:Math.max(0, Number(planet.hp || 0)),
      maxHp:Math.max(1, Number(planet.maxHp || PRISMATIC_PLANET_MAX_HP)),
      destroyed:Boolean(planet.destroyed),
      guardiansRemaining:Math.max(0, Number(planet.guardiansRemaining || 0))
    })),
    rift:{
      active:Boolean(objective.rift?.active),
      x:Number(objective.rift?.x || 0),
      y:Number(objective.rift?.y || 0),
      radius:Math.max(0, Number(objective.rift?.radius || PRISMATIC_PORTAL_MAP.rift.radius)),
      entered:Boolean(objective.rift?.entered)
    },
    bosses:(objective.bosses || []).map(boss=>({
      id:String(boss.id || ""),
      color:String(boss.color || ""),
      hp:Math.max(0, Number(boss.hp || 0)),
      maxHp:Math.max(1, Number(boss.maxHp || PRISMATIC_BOSS_MAX_HP)),
      shield:Math.max(0, Number(boss.shield || 0)),
      maxShield:Math.max(0, Number(boss.maxShield || PRISMATIC_BOSS_MAX_SHIELD)),
      alive:Boolean(boss.alive)
    })),
    effects:(objective.effects || []).map(effect=>{
      const {retainUntil, ...publicState} = effect;
      return {
        ...publicState,
        id:String(effect.id || ""),
        type:String(effect.type || ""),
        x:Number(effect.x || 0),
        y:Number(effect.y || 0),
        at:Number(effect.at || 0),
        amount:Math.max(0, Number(effect.amount || 0)),
        durationMs:Math.max(0, Number(effect.durationMs || 0))
      };
    }),
    completedAt:Math.max(0, Number(objective.completedAt || 0))
  };
}

function addEffect(objective, type, payload, at){
  objective.effectSequence = Math.max(0, Number(objective.effectSequence || 0)) + 1;
  const effect = {
    id:`PR-FX-${objective.effectSequence}-${Number(at || 0).toString(36)}`,
    type,
    x:Number(payload?.x || 0),
    y:Number(payload?.y || 0),
    targetId:String(payload?.targetId || ""),
    targetBossId:String(payload?.targetBossId || ""),
    sourceId:String(payload?.sourceId || ""),
    amount:Math.max(0, Number(payload?.amount || 0)),
    durationMs:Math.max(0, Number(payload?.durationMs || 0)),
    at:Number(at || 0),
    ...(payload?.color ? {color:String(payload.color)} : {}),
    ...(Number.isFinite(Number(payload?.tick)) ? {tick:Number(payload.tick)} : {}),
    ...(Number.isFinite(Number(payload?.tickTotal)) ? {tickTotal:Number(payload.tickTotal)} : {})
  };
  effect.retainUntil = effect.at + Math.max(EFFECT_RETENTION_MS, effect.durationMs + EFFECT_RETENTION_MS);
  objective.effects.push(effect);
  return effect;
}

function pruneEffects(objective, at){
  objective.effects = (objective.effects || []).filter(effect=>
    Number(at || 0) <= Number(effect.retainUntil || effect.at + EFFECT_RETENTION_MS)
  );
}

function publicEffect(effect){
  if(!effect) return null;
  const {retainUntil, ...result} = effect;
  return result;
}

export function createPrismaticPortalRuntime({
  io,
  groups,
  players = new Map(),
  presence,
  profileManager,
  emitProfileSync,
  emitInstance,
  emitPortalComplete,
  now = ()=>Date.now()
} = {}){
  function isCurrent(group, instance = group?.instance){
    return Boolean(
      group?.instance === instance
      && isPrismaticPortalInstance(instance)
      && !instance.completed
    );
  }

  function emitEffect(group, effect){
    if(!effect) return;
    const instance = group?.instance;
    const memberIds = Array.isArray(instance?.joinedMemberIds)
      ? instance.joinedMemberIds
      : (group?.members || []);
    for(const playerId of memberIds){
      if(instance?.abandonedMemberIds?.includes(playerId)) continue;
      io?.to?.(playerId)?.emit?.("portal:prismatic-effect", publicEffect(effect));
    }
  }

  function pushEffect(group, type, payload, at){
    const effect = addEffect(group.instance.objective, type, payload, at);
    emitEffect(group, effect);
    return effect;
  }

  function portalPlayers(group, {
    aliveOnly = true,
    includeDisconnected = false,
    at = now()
  } = {}){
    const instance = group?.instance;
    if(!isPrismaticPortalInstance(instance)) return [];
    const joinedIds = Array.isArray(instance.joinedMemberIds)
      ? instance.joinedMemberIds
      : (group.members || []);
    const abandoned = new Set((instance.abandonedMemberIds || []).map(String));
    return joinedIds
      .map(playerId=>players?.get?.(String(playerId)))
      .filter(Boolean)
      .filter(player=>includeDisconnected || player.connected !== false)
      .filter(player=>!abandoned.has(String(player.id || "")))
      .filter(player=>String(player.state?.mapId || player.mapId || "") === `portal-${PRISMATIC_PORTAL_ID}`)
      .filter(player=>!aliveOnly || (!player.deathState && Number(player.state?.hp || 0) > 0))
      .filter(player=>!aliveOnly
        || typeof presence?.isActiveForWorld !== "function"
        || presence.isActiveForWorld(player, Number(at)));
  }

  function start(group){
    const instance = group?.instance;
    if(!isPrismaticPortalInstance(instance) || instance.completed) return false;
    instance.objective = createPrismaticObjective();
    instance.wave = 0;
    instance.waveState = "planets";
    instance.nextWaveAt = 0;
    instance.enemies = [];
    for(const planet of PRISMATIC_PORTAL_MAP.planets){
      instance.enemies.push(createPrismaticPlanet(planet));
      for(let index = 0; index < PRISMATIC_GUARDIANS_PER_PLANET; index += 1){
        instance.enemies.push(createPrismaticGuardian(planet, index));
      }
    }
    syncPrismaticObjective(instance);
    emitInstance?.(group);
    return true;
  }

  function exposePlanet(group, planetId, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || guardianCount(instance, planetId) > 0) return false;
    const planet = findPlanetEnemy(instance, planetId);
    if(!planet || Number(planet.hp || 0) <= 0 || !planet.damageImmune) return false;
    planet.damageImmune = false;
    planet.damageImmuneReason = "";
    pushEffect(group, "prismatic_planet_exposed", {
      sourceId:planet.id,
      x:planet.x,
      y:planet.y,
      durationMs:1_200
    }, at);
    syncPrismaticObjective(instance);
    emitInstance?.(group);
    return true;
  }

  function openRift(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || instance.objective?.stage !== "planets") return false;
    syncPrismaticObjective(instance);
    if((instance.objective.planets || []).some(planet=>!planet.destroyed)) return false;
    instance.objective.stage = "rift";
    instance.objective.rift.active = true;
    instance.objective.rift.entered = false;
    instance.waveState = "rift";
    instance.nextWaveAt = 0;
    pushEffect(group, "prismatic_rift_open", {
      x:instance.objective.rift.x,
      y:instance.objective.rift.y,
      durationMs:2_400
    }, at);
    emitInstance?.(group);
    return true;
  }

  function enterRift(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)
      || instance.objective?.stage !== "rift"
      || !instance.objective?.rift?.active){
      return false;
    }
    instance.objective.stage = "bosses";
    instance.objective.rift.active = false;
    instance.objective.rift.entered = true;
    instance.wave = 1;
    instance.waveState = "bosses";
    instance.enemies = BOSS_DEFINITIONS.map(definition=>createPrismaticBoss(definition, at));
    instance.objective.bosses = instance.enemies.map(boss=>({
      id:boss.id,
      color:boss.prismaticColor,
      hp:boss.hp,
      maxHp:boss.maxHp,
      shield:boss.shield,
      maxShield:boss.maxShield,
      alive:true
    }));
    syncPrismaticObjective(instance);
    emitInstance?.(group);
    return true;
  }

  function applyDirectHullDamage(group, player, amount, boss, at){
    if(!player?.state || Number(player.state.hp || 0) <= 0) return 0;
    presence?.markDamage?.(player, at);
    presence?.markCombat?.(player, "brûlure prismatique");
    const hpBefore = Math.max(0, Number(player.state.hp || 0));
    player.state.hp = Math.max(0, hpBefore - Math.max(0, Number(amount || 0)));
    player.state.updatedAt = Number(at || now());
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
        at
      });
    }
    if(questResult?.changed) emitProfileSync?.(player, questResult.profile);
    profileManager?.saveWorldSession?.({
      player,
      state:player.state,
      force:Number(player.state.hp || 0) <= 0
    });
    io?.to?.(player.id)?.emit?.("player:damage", {
      enemyId:String(boss?.id || ""),
      sourceEnemyIds:[String(boss?.id || "")],
      attackCount:1,
      mapId:`portal-${PRISMATIC_PORTAL_ID}`,
      amount:Math.max(0, Number(amount || 0)),
      hp:Number(player.state.hp || 0),
      maxHp:Number(player.state.maxHp || 0),
      shield:Number(player.state.shield || 0),
      maxShield:Number(player.state.maxShield || 0),
      fromX:Number(boss?.x || 0),
      fromY:Number(boss?.y || 0),
      toX:Number(player.state.x || 0),
      toY:Number(player.state.y || 0),
      damageType:"prismatic_burn",
      bypassShield:true,
      at
    });
    return hpLost;
  }

  function choosePlayerTarget(group, boss, at){
    const candidates = portalPlayers(group, {at});
    const locked = candidates.find(player=>String(player.id || "") === String(boss.lockedPlayerId || ""));
    if(locked) return locked;
    return candidates
      .map(player=>({
        player,
        distance:Math.hypot(
          Number(player.state?.x || 0) - Number(boss.x || 0),
          Number(player.state?.y || 0) - Number(boss.y || 0)
        )
      }))
      .sort((left, right)=>left.distance - right.distance)[0]?.player || null;
  }

  function startBurn(group, boss, target, at){
    const objective = group.instance.objective;
    boss.prismaticAbilityCount = Math.max(0, Number(boss.prismaticAbilityCount || 0)) + 1;
    boss.prismaticNextAbilityAt = Number(at) + PRISMATIC_BURN_COOLDOWN_MS;
    objective.activeBurns.push({
      id:`PR-BURN-${boss.prismaticAbilityCount}`,
      sourceId:boss.id,
      targetId:target.id,
      nextTickAt:Number(at) + PRISMATIC_BURN_TICK_MS,
      ticksApplied:0,
      ticksTotal:PRISMATIC_BURN_TICKS
    });
    const effect = pushEffect(group, "prismatic_burn_start", {
      sourceId:boss.id,
      targetId:target.id,
      x:Number(target.state?.x || 0),
      y:Number(target.state?.y || 0),
      durationMs:PRISMATIC_BURN_TICKS * PRISMATIC_BURN_TICK_MS,
      amount:PRISMATIC_BURN_DAMAGE
    }, at);
    emitInstance?.(group);
    return effect;
  }

  function updateBurns(group, at){
    const objective = group.instance.objective;
    const byId = new Map(portalPlayers(group, {
      aliveOnly:false,
      includeDisconnected:true,
      at
    }).map(player=>[String(player.id), player]));
    for(const burn of objective.activeBurns || []){
      const target = byId.get(String(burn.targetId || ""));
      while(target
        && Number(target.state?.hp || 0) > 0
        && burn.ticksApplied < burn.ticksTotal
        && Number(at) >= Number(burn.nextTickAt || 0)){
        const tickAt = Number(burn.nextTickAt);
        const boss = (group.instance.enemies || []).find(enemy=>String(enemy.id || "") === String(burn.sourceId || ""));
        applyDirectHullDamage(group, target, PRISMATIC_BURN_DAMAGE, boss, tickAt);
        burn.ticksApplied += 1;
        burn.nextTickAt = tickAt + PRISMATIC_BURN_TICK_MS;
        pushEffect(group, "prismatic_burn_tick", {
          sourceId:burn.sourceId,
          targetId:target.id,
          x:Number(target.state?.x || 0),
          y:Number(target.state?.y || 0),
          amount:PRISMATIC_BURN_DAMAGE,
          durationMs:600,
          tick:burn.ticksApplied,
          tickTotal:burn.ticksTotal
        }, tickAt);
      }
    }
    objective.activeBurns = (objective.activeBurns || []).filter(burn=>{
      const target = byId.get(String(burn.targetId || ""));
      return target && Number(target.state?.hp || 0) > 0 && burn.ticksApplied < burn.ticksTotal;
    });
  }

  function startHeal(group, boss, at){
    const allies = living(group.instance.enemies)
      .filter(enemy=>enemy.prismaticBoss && enemy.id !== boss.id)
      .sort((left, right)=>Number(left.hp || 0) - Number(right.hp || 0));
    const target = allies[0];
    if(!target) return false;
    boss.prismaticAbilityCount = Math.max(0, Number(boss.prismaticAbilityCount || 0)) + 1;
    boss.prismaticNextAbilityAt = Number(at) + PRISMATIC_HEAL_COOLDOWN_MS;
    group.instance.objective.activeHeals.push({
      id:`PR-HEAL-${boss.prismaticAbilityCount}`,
      sourceId:boss.id,
      targetBossId:target.id,
      nextTickAt:Number(at) + PRISMATIC_HEAL_TICK_MS,
      ticksApplied:0,
      ticksTotal:PRISMATIC_HEAL_TICKS
    });
    return true;
  }

  function updateHeals(group, at){
    const objective = group.instance.objective;
    for(const heal of objective.activeHeals || []){
      const target = (group.instance.enemies || []).find(enemy=>
        String(enemy.id || "") === String(heal.targetBossId || "")
        && enemy.prismaticBoss
      );
      while(target
        && Number(target.hp || 0) > 0
        && heal.ticksApplied < heal.ticksTotal
        && Number(at) >= Number(heal.nextTickAt || 0)){
        const tickAt = Number(heal.nextTickAt);
        const before = Math.max(0, Number(target.hp || 0));
        target.hp = Math.min(Number(target.maxHp || PRISMATIC_BOSS_MAX_HP), before + PRISMATIC_HEAL_AMOUNT);
        const applied = Math.max(0, Number(target.hp || 0) - before);
        heal.ticksApplied += 1;
        heal.nextTickAt = tickAt + PRISMATIC_HEAL_TICK_MS;
        pushEffect(group, "prismatic_heal_tick", {
          sourceId:heal.sourceId,
          targetBossId:target.id,
          x:Number(target.x || 0),
          y:Number(target.y || 0),
          amount:applied,
          durationMs:700,
          tick:heal.ticksApplied,
          tickTotal:heal.ticksTotal
        }, tickAt);
      }
    }
    objective.activeHeals = (objective.activeHeals || []).filter(heal=>{
      const target = (group.instance.enemies || []).find(enemy=>
        String(enemy.id || "") === String(heal.targetBossId || "")
      );
      return target && Number(target.hp || 0) > 0 && heal.ticksApplied < heal.ticksTotal;
    });
  }

  function startSlow(group, boss, target, at){
    const profile = profileManager?.getProfileForPlayer?.(target);
    const trustedSpeed = profile
      ? getTrustedMovementSpeed(profile)
      : Math.max(1, Number(target.state?.speed || target.state?.maxSpeed || 300));
    const amount = Math.max(1, Math.round(trustedSpeed * PRISMATIC_SLOW_PERCENT / 100));
    if(!target.statusEffects || typeof target.statusEffects !== "object") target.statusEffects = {};
    const current = target.statusEffects.slow;
    const expiresAt = Number(at) + PRISMATIC_SLOW_DURATION_MS;
    target.statusEffects.slow = {
      type:"slow",
      amount:Math.max(amount, Number(current?.amount || 0)),
      percent:PRISMATIC_SLOW_PERCENT,
      durationMs:Math.max(PRISMATIC_SLOW_DURATION_MS, Number(current?.durationMs || 0)),
      sourceId:boss.id,
      originX:Number(boss.x || 0),
      originY:Number(boss.y || 0),
      radius:0,
      appliedAt:Number(at),
      expiresAt:Math.max(expiresAt, Number(current?.expiresAt || 0))
    };
    boss.prismaticAbilityCount = Math.max(0, Number(boss.prismaticAbilityCount || 0)) + 1;
    boss.prismaticNextAbilityAt = Number(at) + PRISMATIC_SLOW_COOLDOWN_MS;
    group.instance.objective.activeSlows.push({
      id:`PR-SLOW-${boss.prismaticAbilityCount}`,
      sourceId:boss.id,
      targetId:target.id,
      amount,
      expiresAt
    });
    io?.to?.(target.id)?.emit?.("player:status-effect", {
      type:"slow",
      active:true,
      amount,
      percent:PRISMATIC_SLOW_PERCENT,
      duration:PRISMATIC_SLOW_DURATION_MS / 1_000,
      remaining:PRISMATIC_SLOW_DURATION_MS / 1_000,
      sourceId:boss.id,
      at
    });
    const effect = pushEffect(group, "prismatic_slow_start", {
      sourceId:boss.id,
      targetId:target.id,
      x:Number(target.state?.x || 0),
      y:Number(target.state?.y || 0),
      amount:PRISMATIC_SLOW_PERCENT,
      durationMs:PRISMATIC_SLOW_DURATION_MS
    }, at);
    emitInstance?.(group);
    return effect;
  }

  function updateSlows(group, at){
    const objective = group.instance.objective;
    const byId = new Map(portalPlayers(group, {
      aliveOnly:false,
      includeDisconnected:true,
      at
    }).map(player=>[String(player.id), player]));
    for(const slow of objective.activeSlows || []){
      if(Number(at) < Number(slow.expiresAt || 0)) continue;
      const target = byId.get(String(slow.targetId || ""));
      if(target?.statusEffects?.slow
        && String(target.statusEffects.slow.sourceId || "") === String(slow.sourceId || "")){
        delete target.statusEffects.slow;
      }
      if(target){
        io?.to?.(target.id)?.emit?.("player:status-effect", {
          type:"slow",
          active:false,
          amount:Number(slow.amount || 0),
          percent:PRISMATIC_SLOW_PERCENT,
          duration:PRISMATIC_SLOW_DURATION_MS / 1_000,
          remaining:0,
          sourceId:slow.sourceId,
          at
        });
      }
      pushEffect(group, "prismatic_slow_end", {
        sourceId:slow.sourceId,
        targetId:slow.targetId,
        x:Number(target?.state?.x || 0),
        y:Number(target?.state?.y || 0),
        amount:PRISMATIC_SLOW_PERCENT,
        durationMs:600
      }, at);
    }
    objective.activeSlows = (objective.activeSlows || []).filter(slow=>
      Number(at) < Number(slow.expiresAt || 0)
    );
  }

  function updateBossAbilities(group, at){
    updateBurns(group, at);
    updateHeals(group, at);
    updateSlows(group, at);
    for(const boss of living(group.instance.enemies).filter(enemy=>enemy.prismaticBoss)){
      if(Number(at) < Number(boss.prismaticNextAbilityAt || Infinity)) continue;
      if(boss.prismaticAbility === "heal"){
        startHeal(group, boss, at);
        continue;
      }
      const target = choosePlayerTarget(group, boss, at);
      if(!target) continue;
      if(boss.prismaticAbility === "burn") startBurn(group, boss, target, at);
      if(boss.prismaticAbility === "slow") startSlow(group, boss, target, at);
    }
  }

  function complete(group, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || instance.objective?.stage === "complete") return false;
    instance.objective.stage = "complete";
    instance.objective.completedAt = Number(at);
    instance.objective.rift.active = false;
    instance.objective.activeBurns = [];
    instance.objective.activeHeals = [];
    instance.waveState = "completed";
    instance.nextWaveAt = 0;
    syncPrismaticObjective(instance);
    emitPortalComplete?.(group);
    return true;
  }

  function handleEnemyDeath(group, enemy, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || Number(enemy?.hp || 0) > 0) return false;
    if(enemy.prismaticGuardian){
      exposePlanet(group, enemy.prismaticPlanetId, at);
      return true;
    }
    if(enemy.prismaticPlanet){
      syncPrismaticObjective(instance);
      openRift(group, at);
      return true;
    }
    if(enemy.prismaticBoss){
      syncPrismaticObjective(instance);
      if(living(instance.enemies).some(entry=>entry.prismaticBoss)) return true;
      complete(group, at);
      return true;
    }
    return false;
  }

  function updateGroup(group, _dt = .05, at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    pruneEffects(instance.objective, at);
    if(instance.objective.stage === "rift"){
      const rift = instance.objective.rift;
      const entrant = portalPlayers(group, {at}).find(player=>
        Math.hypot(
          Number(player.state?.x || 0) - Number(rift.x || 0),
          Number(player.state?.y || 0) - Number(rift.y || 0)
        ) <= Number(rift.radius || PRISMATIC_PORTAL_MAP.rift.radius)
      );
      if(entrant) return enterRift(group, at);
    }
    if(instance.objective.stage === "bosses"){
      updateBossAbilities(group, at);
      syncPrismaticObjective(instance);
    }
    return false;
  }

  function updatePrismaticEncounters(dt, at = now()){
    for(const group of getInstanceGroups(groups)){
      if(isCurrent(group)) updateGroup(group, dt, at);
    }
  }

  function cancel(instance){
    if(!isPrismaticPortalInstance(instance)) return false;
    const objective = instance.objective;
    if(objective?.kind === "prismatic"){
      for(const slow of objective.activeSlows || []){
        const player = players?.get?.(String(slow.targetId || ""));
        if(!player?.statusEffects?.slow
          || String(player.statusEffects.slow.sourceId || "") !== String(slow.sourceId || "")){
          continue;
        }
        delete player.statusEffects.slow;
        io?.to?.(player.id)?.emit?.("player:status-effect", {
          type:"slow",
          active:false,
          amount:Number(slow.amount || 0),
          percent:PRISMATIC_SLOW_PERCENT,
          duration:PRISMATIC_SLOW_DURATION_MS / 1_000,
          remaining:0,
          sourceId:slow.sourceId,
          at:Number(now())
        });
      }
      objective.activeBurns = [];
      objective.activeHeals = [];
      objective.activeSlows = [];
    }
    return true;
  }

  return {
    cancel,
    complete,
    enterRift,
    exposePlanet,
    handleEnemyDeath,
    openRift,
    start,
    updateGroup,
    updatePrismaticEncounters
  };
}
