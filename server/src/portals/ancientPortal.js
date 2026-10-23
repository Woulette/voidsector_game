import { getInstanceGroups, getPlayerInstanceGroup } from "./portalSessions.js";
import { applyDamageToEnemy, enemyDurability } from "../combat/enemyHits.js";
import { markEnemyAttackedByPlayer } from "../world/aggro.js";
import {
  ANCIENT_PORTAL_ID,
  ANCIENT_PORTAL_LEVEL,
  ANCIENT_PORTAL_MAP
} from "../../../src/data/ancientPortal.js";

export {
  ANCIENT_PORTAL_ID,
  ANCIENT_PORTAL_LEVEL,
  ANCIENT_PORTAL_MAP
};

export const PRECURSOR_INITIAL_ESCAPE_MS = 5 * 60_000;
export const PRECURSOR_RESCUE_BONUS_MS = 5 * 60_000;
export const PRECURSOR_CAPTIVE_COUNT = 2;
export const PRECURSOR_CAGE_MAX_HP = 750_000;
export const PRECURSOR_ROOM_GUARDS = 4;
export const PRECURSOR_GUARD_MAX_HP = 1_200_000;
export const PRECURSOR_GUARD_MAX_SHIELD = 800_000;
export const PRECURSOR_GUARD_DAMAGE_MIN = 15_000;
export const PRECURSOR_GUARD_DAMAGE_MAX = 25_000;
export const PRECURSOR_KEEPER_MAX_HP = 5_000_000;
export const PRECURSOR_KEEPER_MAX_SHIELD = 3_000_000;
export const PRECURSOR_KEEPER_DAMAGE_MIN = 20_000;
export const PRECURSOR_KEEPER_DAMAGE_MAX = 30_000;
export const PRECURSOR_ANGEL_MAX_HP = 1_000_000;
export const PRECURSOR_ANGEL_MAX_SHIELD = 1_000_000;
export const PRECURSOR_DEMON_KING_MAX_HP = 30_000_000;
export const PRECURSOR_DEMON_KING_MAX_SHIELD = 15_000_000;
export const PRECURSOR_DEMON_KING_DAMAGE_MIN = 30_000;
export const PRECURSOR_DEMON_KING_DAMAGE_MAX = 50_000;
export const PRECURSOR_DEMON_KING_RANGE = 500;
export const PRECURSOR_DEMON_KING_SPEED = 260;
export const PRECURSOR_BOMB_DAMAGE = 100_000;
export const PRECURSOR_BOMB_RADIUS = 100;
export const PRECURSOR_BOMB_COOLDOWN_MS = 20_000;
export const PRECURSOR_BOMB_WARNING_MS = 3_000;
export const PRECURSOR_SUMMON_COOLDOWN_MS = 30_000;
export const PRECURSOR_PARADISE_ALLY_COUNT = 8;
export const PRECURSOR_EPILOGUE_MS = 8_000;

const ZERO_REWARD = Object.freeze({credits:0, xp:0, premium:0});
const EFFECT_RETENTION_MS = 1_800;
const ROOM_DISCOVERY_PADDING = 180;
const ANGEL_FOLLOW_SPEED = 430;
const ANGEL_ATTACK_RANGE = 560;
const ANGEL_ATTACK_COOLDOWN_MS = 1_200;
const ANGEL_DAMAGE_MIN = 40_000;
const ANGEL_DAMAGE_MAX = 60_000;
const ANGEL_HEAL_COOLDOWN_MS = 5_000;
const ANGEL_HEAL_AMOUNT = 75_000;
const ANGEL_BUFF_COOLDOWN_MS = 12_000;
const ANGEL_BUFF_DURATION_MS = 10_000;
const ANGEL_DAMAGE_MULTIPLIER = 1.15;
const DEMON_GUARD_LEASH_RADIUS = 820;
const DEMON_MINION_COUNT = 4;
const DEMON_MINION_MAX_ALIVE = 12;
const DEMON_MINION_TTL_MS = 120_000;
const DEMON_MINION_MAX_HP = 2_000_000;
const DEMON_MINION_MAX_SHIELD = 1_000_000;

const ANGEL_ASSET = "assets/ships/Astralis.png";
const DEMON_ASSET = "assets/ships/combat/Asterion.png";
const DEMON_KING_ASSET = "assets/ships/Imperial.png";
const CAGE_ASSET = "assets/spawn/spawn_dock.png";

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function rollBetween(min, max, random = Math.random){
  const low = Math.min(Number(min || 0), Number(max || 0));
  const high = Math.max(Number(min || 0), Number(max || 0));
  return Math.round(low + clamp(finite(random(), 1), 0, 1) * (high - low));
}

function living(entries){
  return (Array.isArray(entries) ? entries : []).filter(entry=>
    entry?.alive !== false && Number(entry?.hp || 0) > 0
  );
}

function mapPoint(value, fallback = {x:0, y:0}){
  return {
    x:finite(value?.x, fallback.x),
    y:finite(value?.y, fallback.y)
  };
}

function roomRadius(room){
  return Math.max(300, finite(room?.radius, finite(room?.r, 620)));
}

function preparePrecursorEnemy(enemy){
  enemy.reward = {...ZERO_REWARD};
  enemy.noReward = true;
  enemy.temporarySpawn = true;
  enemy.serverControlled = true;
  enemy.worldMapId = `portal-${ANCIENT_PORTAL_ID}`;
  enemy.precursorEnemy = true;
  enemy.damageThreat = enemy.damageThreat && typeof enemy.damageThreat === "object"
    ? enemy.damageThreat
    : {};
  enemy.vx = finite(enemy.vx);
  enemy.vy = finite(enemy.vy);
  enemy.moving = Boolean(enemy.moving);
  enemy.recentHitTimer = finite(enemy.recentHitTimer);
  return enemy;
}

function baseCombatEnemy({
  id,
  kind,
  type,
  role,
  x,
  y,
  hp,
  shield,
  damageMin,
  damageMax,
  speed = 330,
  range = 450,
  radius = 70,
  width = 160,
  height = 160,
  color = "rgba(248,113,113,.98)",
  img = DEMON_ASSET
}){
  return preparePrecursorEnemy({
    id,
    kind,
    type,
    img,
    renderMode:"precursor_enemy",
    level:ANCIENT_PORTAL_LEVEL,
    x,
    y,
    homeX:x,
    homeY:y,
    angle:Math.PI,
    hp,
    maxHp:hp,
    shield,
    maxShield:shield,
    shieldAbsorbRatio:.8,
    radius,
    width,
    height,
    speed,
    attackRange:range,
    attackDamage:Math.round((damageMin + damageMax) / 2),
    attackDamageMin:damageMin,
    attackDamageMax:damageMax,
    useExactDamageRange:true,
    attackCooldown:1_000,
    staggerFirstAttack:true,
    projectileSpeed:760,
    attackStyle:"precursor_demon",
    color,
    particle:color,
    followBeforeAttacked:true,
    requiresPlayerAttack:false,
    targetMemoryMs:5_000,
    precursorRole:role,
    nextAttackAt:0,
    threatRecalcAt:0
  });
}

export function createPrecursorCage(room){
  const point = mapPoint(room);
  return preparePrecursorEnemy({
    id:`ANCIENT-CAGE-${room.id}`,
    kind:"precursor_infernal_cage",
    type:"Prison infernale",
    img:CAGE_ASSET,
    renderMode:"precursor_cage",
    level:ANCIENT_PORTAL_LEVEL,
    x:point.x,
    y:point.y,
    homeX:point.x,
    homeY:point.y,
    angle:0,
    hp:PRECURSOR_CAGE_MAX_HP,
    maxHp:PRECURSOR_CAGE_MAX_HP,
    shield:0,
    maxShield:0,
    shieldAbsorbRatio:0,
    radius:92,
    width:210,
    height:210,
    speed:0,
    attackRange:0,
    attackDamage:0,
    attackCooldown:60_000,
    projectileSpeed:0,
    color:"rgba(251,146,60,.98)",
    particle:"rgba(239,68,68,.88)",
    static:true,
    anchored:true,
    precursorRole:"infernal_cage",
    precursorRoomId:String(room.id || ""),
    nextAttackAt:Infinity
  });
}

export function createPrecursorGuard(room, index){
  const count = PRECURSOR_ROOM_GUARDS;
  const angle = Math.PI * 2 * Math.max(0, Number(index || 0)) / count;
  const center = mapPoint(room);
  const orbit = Math.max(190, roomRadius(room) * .46);
  const x = center.x + Math.cos(angle) * orbit;
  const y = center.y + Math.sin(angle) * orbit;
  const enemy = baseCombatEnemy({
    id:`ANCIENT-GUARD-${room.id}-${Number(index || 0) + 1}`,
    kind:"precursor_demon_guard",
    type:"Geôlier démoniaque",
    role:"demon_guard",
    x,
    y,
    hp:PRECURSOR_GUARD_MAX_HP,
    shield:PRECURSOR_GUARD_MAX_SHIELD,
    damageMin:PRECURSOR_GUARD_DAMAGE_MIN,
    damageMax:PRECURSOR_GUARD_DAMAGE_MAX,
    speed:360,
    range:460,
    radius:68,
    color:"rgba(239,68,68,.98)"
  });
  enemy.precursorRoomId = String(room.id || "");
  enemy.guardLeashRadius = DEMON_GUARD_LEASH_RADIUS;
  return enemy;
}

export function createPrecursorTalismanKeeper(room, at = Date.now()){
  const center = mapPoint(room);
  const enemy = baseCombatEnemy({
    id:`ANCIENT-KEEPER-${room.id}-${Number(at || 0).toString(36)}`,
    kind:"precursor_talisman_keeper",
    type:"Gardien immaculé du talisman",
    role:"talisman_keeper",
    x:center.x,
    y:center.y - 90,
    hp:PRECURSOR_KEEPER_MAX_HP,
    shield:PRECURSOR_KEEPER_MAX_SHIELD,
    damageMin:PRECURSOR_KEEPER_DAMAGE_MIN,
    damageMax:PRECURSOR_KEEPER_DAMAGE_MAX,
    speed:325,
    range:480,
    radius:105,
    width:235,
    height:235,
    color:"rgba(255,255,255,.99)",
    img:"assets/ships/Helion Titan.png"
  });
  enemy.precursorRoomId = String(room.id || "");
  enemy.precursorWhite = true;
  enemy.precursorTalismanIcon = true;
  enemy.guardLeashRadius = Math.max(DEMON_GUARD_LEASH_RADIUS, roomRadius(room) + 260);
  return enemy;
}

export function createPrecursorDemonKing(at = Date.now()){
  const arena = mapPoint(
    ANCIENT_PORTAL_MAP.demonKing,
    ANCIENT_PORTAL_MAP.paradiseArena || ANCIENT_PORTAL_MAP.paradiseSpawn
  );
  const enemy = baseCombatEnemy({
    id:`ANCIENT-KING-${Number(at || 0).toString(36)}`,
    kind:"precursor_demon_king",
    type:"Roi des Démons",
    role:"demon_king",
    x:arena.x,
    y:arena.y,
    hp:PRECURSOR_DEMON_KING_MAX_HP,
    shield:PRECURSOR_DEMON_KING_MAX_SHIELD,
    damageMin:PRECURSOR_DEMON_KING_DAMAGE_MIN,
    damageMax:PRECURSOR_DEMON_KING_DAMAGE_MAX,
    speed:PRECURSOR_DEMON_KING_SPEED,
    range:PRECURSOR_DEMON_KING_RANGE,
    radius:165,
    width:360,
    height:360,
    color:"rgba(127,29,29,.99)",
    img:DEMON_KING_ASSET
  });
  enemy.attackCooldown = 1_000;
  enemy.targetMemoryMs = 12_000;
  enemy.precursorNextBombAt = Number(at || Date.now()) + PRECURSOR_BOMB_COOLDOWN_MS;
  enemy.precursorNextSummonAt = Number(at || Date.now()) + PRECURSOR_SUMMON_COOLDOWN_MS;
  enemy.precursorBoss = true;
  return enemy;
}

export function createPrecursorDemonMinion(index, boss, at = Date.now()){
  const angle = Math.PI * 2 * Math.max(0, Number(index || 0)) / DEMON_MINION_COUNT;
  const enemy = baseCombatEnemy({
    id:`ANCIENT-MINION-${Number(at || 0).toString(36)}-${Number(index || 0) + 1}`,
    kind:"precursor_demon_minion",
    type:"Légionnaire infernal",
    role:"demon_minion",
    x:finite(boss?.x) + Math.cos(angle) * 300,
    y:finite(boss?.y) + Math.sin(angle) * 300,
    hp:DEMON_MINION_MAX_HP,
    shield:DEMON_MINION_MAX_SHIELD,
    damageMin:15_000,
    damageMax:25_000,
    speed:370,
    range:440,
    radius:74,
    color:"rgba(190,24,93,.98)"
  });
  enemy.precursorExpiresAt = Number(at || Date.now()) + DEMON_MINION_TTL_MS;
  return enemy;
}

function shuffledRoomRoles(rooms, random){
  const ids = rooms.map(room=>String(room.id || ""));
  for(let index = ids.length - 1; index > 0; index -= 1){
    const target = Math.floor(clamp(finite(random(), 1), 0, .999999) * (index + 1));
    [ids[index], ids[target]] = [ids[target], ids[index]];
  }
  return new Map(ids.map((id, index)=>[
    id,
    index < PRECURSOR_CAPTIVE_COUNT ? "angel" : index === PRECURSOR_CAPTIVE_COUNT ? "talisman" : "empty"
  ]));
}

export function createPrecursorObjective(startedAt = Date.now(), random = Math.random){
  const rooms = Array.isArray(ANCIENT_PORTAL_MAP.rooms) ? ANCIENT_PORTAL_MAP.rooms : [];
  const roles = shuffledRoomRoles(rooms, random);
  const beacon = mapPoint(ANCIENT_PORTAL_MAP.beacon);
  const rift = mapPoint(ANCIENT_PORTAL_MAP.rift, beacon);
  const god = mapPoint(ANCIENT_PORTAL_MAP.god, ANCIENT_PORTAL_MAP.paradiseSpawn);
  return {
    kind:"precursors",
    phase:"hell",
    stage:"rescue",
    startedAt:Number(startedAt || Date.now()),
    deadlineAt:Number(startedAt || Date.now()) + PRECURSOR_INITIAL_ESCAPE_MS,
    rescuedCount:0,
    totalAngels:PRECURSOR_CAPTIVE_COUNT,
    rooms:rooms.map(room=>({
      id:String(room.id || ""),
      label:String(room.label || room.id || "Salle secrète"),
      x:finite(room.x),
      y:finite(room.y),
      radius:roomRadius(room),
      discovered:false,
      discoveredAt:0,
      role:roles.get(String(room.id || "")) || "empty",
      cageId:`ANCIENT-CAGE-${room.id}`,
      cageDestroyed:false,
      angelFreed:false,
      keeperSpawned:false,
      keeperId:""
    })),
    beacon:{
      x:beacon.x,
      y:beacon.y,
      radius:Math.max(120, finite(ANCIENT_PORTAL_MAP.beacon?.radius, 180)),
      active:false
    },
    rift:{
      x:rift.x,
      y:rift.y,
      radius:Math.max(120, finite(ANCIENT_PORTAL_MAP.rift?.radius, 200)),
      open:false,
      entered:false
    },
    talisman:{acquired:false, acquiredAt:0},
    allies:[],
    bombs:[],
    bombSequence:0,
    effects:[],
    effectSequence:0,
    god:{
      visible:false,
      x:god.x,
      y:god.y,
      radius:Math.max(120, finite(ANCIENT_PORTAL_MAP.god?.radius, 210))
    },
    epilogueEndsAt:0,
    completedAt:0,
    failedAt:0,
    failureReason:""
  };
}

export function isPrecursorPortalInstance(instance){
  return Boolean(
    instance?.type === "portal"
    && String(instance?.portal?.id || "") === ANCIENT_PORTAL_ID
  );
}

function publicVital(value){
  if(!value) return null;
  return {
    id:String(value.id || ""),
    x:finite(value.x),
    y:finite(value.y),
    hp:Math.max(0, finite(value.hp)),
    maxHp:Math.max(1, finite(value.maxHp, 1)),
    shield:Math.max(0, finite(value.shield)),
    maxShield:Math.max(0, finite(value.maxShield)),
    alive:value.alive !== false && finite(value.hp) > 0
  };
}

export function publicPrecursorObjective(instance, currentTime = Date.now()){
  if(!isPrecursorPortalInstance(instance) || instance?.objective?.kind !== "precursors") return null;
  const objective = instance.objective;
  const deadlineAt = objective.phase === "hell" ? Math.max(0, finite(objective.deadlineAt)) : 0;
  return {
    kind:"precursors",
    phase:["hell", "paradise", "epilogue", "failed"].includes(objective.phase)
      ? objective.phase
      : "hell",
    stage:String(objective.stage || "rescue"),
    deadlineAt,
    remainingMs:deadlineAt > 0 ? Math.max(0, deadlineAt - Number(currentTime || Date.now())) : 0,
    rescuedCount:Math.max(0, Math.min(PRECURSOR_CAPTIVE_COUNT, Number(objective.rescuedCount || 0))),
    totalAngels:PRECURSOR_CAPTIVE_COUNT,
    rooms:(objective.rooms || []).map(room=>({
      id:String(room.id || ""),
      label:String(room.label || ""),
      x:finite(room.x),
      y:finite(room.y),
      radius:Math.max(0, finite(room.radius)),
      discovered:Boolean(room.discovered),
      role:room.discovered
        ? room.role === "talisman" && Number(objective.rescuedCount || 0) < PRECURSOR_CAPTIVE_COUNT
          ? "empty"
          : String(room.role || "empty")
        : "unknown",
      cageDestroyed:Boolean(room.cageDestroyed),
      angelFreed:Boolean(room.angelFreed)
    })),
    beacon:{
      x:finite(objective.beacon?.x),
      y:finite(objective.beacon?.y),
      radius:Math.max(0, finite(objective.beacon?.radius)),
      active:Boolean(objective.beacon?.active)
    },
    rift:{
      x:finite(objective.rift?.x),
      y:finite(objective.rift?.y),
      radius:Math.max(0, finite(objective.rift?.radius)),
      open:Boolean(objective.rift?.open),
      entered:Boolean(objective.rift?.entered)
    },
    talisman:{acquired:Boolean(objective.talisman?.acquired)},
    allies:living(objective.allies).map(ally=>({
      ...publicVital(ally),
      name:String(ally.name || "Vaisseau angélique"),
      img:String(ally.img || ANGEL_ASSET),
      angle:finite(ally.angle),
      rescued:Boolean(ally.rescued),
      reinforcement:Boolean(ally.reinforcement)
    })),
    bombs:(objective.bombs || []).map(bomb=>({
      id:String(bomb.id || ""),
      x:finite(bomb.x),
      y:finite(bomb.y),
      radius:Math.max(0, finite(bomb.radius, PRECURSOR_BOMB_RADIUS)),
      detonateAt:Math.max(0, finite(bomb.detonateAt))
    })),
    effects:(objective.effects || []).map(publicEffect),
    boss:publicVital((instance.enemies || []).find(enemy=>
      enemy.precursorRole === "demon_king" && Number(enemy.hp || 0) > 0
    )),
    god:{
      visible:Boolean(objective.god?.visible),
      x:finite(objective.god?.x),
      y:finite(objective.god?.y),
      radius:Math.max(0, finite(objective.god?.radius, ANCIENT_PORTAL_MAP.god?.radius))
    },
    completedAt:Math.max(0, finite(objective.completedAt)),
    failedAt:Math.max(0, finite(objective.failedAt)),
    failureReason:String(objective.failureReason || ""),
    at:Number(currentTime || Date.now())
  };
}

function addEffect(objective, type, payload = {}, at = Date.now()){
  objective.effectSequence = Math.max(0, Number(objective.effectSequence || 0)) + 1;
  const effect = {
    id:`ANCIENT-FX-${objective.effectSequence}-${Number(at || 0).toString(36)}`,
    type:String(type || ""),
    x:finite(payload.x),
    y:finite(payload.y),
    at:Number(at || Date.now()),
    ...payload,
    retainUntil:Number(at || Date.now()) + Math.max(EFFECT_RETENTION_MS, finite(payload.durationMs) + 600)
  };
  objective.effects.push(effect);
  return effect;
}

function publicEffect(effect){
  if(!effect) return null;
  const {retainUntil, ...result} = effect;
  return result;
}

function pruneEffects(objective, at){
  objective.effects = (objective.effects || []).filter(effect=>
    Number(at || 0) <= Number(effect.retainUntil || effect.at + EFFECT_RETENTION_MS)
  );
}

function moveEntity(entity, target, speed, dt, stopRange = 0){
  const dx = finite(target?.x) - finite(entity.x);
  const dy = finite(target?.y) - finite(entity.y);
  const distance = Math.hypot(dx, dy);
  if(distance <= Math.max(0, stopRange)){
    entity.vx = 0;
    entity.vy = 0;
    entity.moving = false;
    return false;
  }
  const step = Math.min(Math.max(0, distance - stopRange), Math.max(0, speed) * Math.max(0, dt));
  const nx = dx / Math.max(1, distance);
  const ny = dy / Math.max(1, distance);
  entity.x = clamp(finite(entity.x) + nx * step, -ANCIENT_PORTAL_MAP.width / 2 + 60, ANCIENT_PORTAL_MAP.width / 2 - 60);
  entity.y = clamp(finite(entity.y) + ny * step, -ANCIENT_PORTAL_MAP.height / 2 + 60, ANCIENT_PORTAL_MAP.height / 2 - 60);
  entity.vx = nx * speed;
  entity.vy = ny * speed;
  entity.angle = Math.atan2(ny, nx) + Math.PI / 2;
  entity.moving = step > 0;
  return step > 0;
}

function createAngel(index, point, {rescued = false, reinforcement = false, at = Date.now()} = {}){
  const maxHp = PRECURSOR_ANGEL_MAX_HP;
  const maxShield = PRECURSOR_ANGEL_MAX_SHIELD;
  return {
    id:`ANCIENT-ANGEL-${Number(index || 0) + 1}`,
    name:reinforcement ? `Séraphin allié ${Number(index || 0) + 1}` : `Ange libéré ${Number(index || 0) + 1}`,
    img:ANGEL_ASSET,
    x:finite(point?.x),
    y:finite(point?.y),
    vx:0,
    vy:0,
    angle:0,
    hp:maxHp,
    maxHp,
    shield:maxShield,
    maxShield,
    shieldAbsorbRatio:.8,
    radius:58,
    width:130,
    height:130,
    speed:ANGEL_FOLLOW_SPEED,
    alive:true,
    rescued,
    reinforcement,
    nextAttackAt:Number(at || Date.now()),
    nextHealAt:Number(at || Date.now()) + ANGEL_HEAL_COOLDOWN_MS,
    nextBuffAt:Number(at || Date.now()) + ANGEL_BUFF_COOLDOWN_MS
  };
}

function applyDirectAngelDamage(angel, amount){
  if(!angel || angel.alive === false || Number(angel.hp || 0) <= 0) return 0;
  let incoming = Math.max(0, Number(amount || 0));
  const before = Number(angel.hp || 0) + Number(angel.shield || 0);
  if(Number(angel.shield || 0) > 0){
    const shieldPart = incoming * .8;
    const absorbed = Math.min(Number(angel.shield || 0), shieldPart);
    angel.shield = Math.max(0, Number(angel.shield || 0) - absorbed);
    incoming -= absorbed;
  }
  if(incoming > 0) angel.hp = Math.max(0, Number(angel.hp || 0) - incoming);
  angel.alive = Number(angel.hp || 0) > 0;
  return Math.max(0, before - Number(angel.hp || 0) - Number(angel.shield || 0));
}

export function createPrecursorPortalRuntime({
  io,
  groups = new Map(),
  players = new Map(),
  presence,
  profileManager,
  emitInstance,
  emitPortalComplete,
  failPortal,
  cancelPendingAttacksForRoom,
  random = Math.random,
  now = ()=>Date.now()
} = {}){
  function isCurrent(group, instance = group?.instance){
    return Boolean(
      group?.instance === instance
      && isPrecursorPortalInstance(instance)
      && !instance.completed
      && !instance.precursorFailed
    );
  }

  function joinedIds(instance){
    return Array.isArray(instance?.joinedMemberIds)
      ? instance.joinedMemberIds
      : [];
  }

  function portalPlayers(group, {aliveOnly = true, at = now()} = {}){
    const instance = group?.instance;
    const abandoned = new Set((instance?.abandonedMemberIds || []).map(String));
    return joinedIds(instance)
      .map(id=>players.get(String(id)))
      .filter(Boolean)
      .filter(player=>!abandoned.has(String(player.id || "")))
      .filter(player=>player.connected !== false)
      .filter(player=>String(player.state?.mapId || player.mapId || "") === `portal-${ANCIENT_PORTAL_ID}`)
      .filter(player=>!aliveOnly || (!player.deathState && Number(player.state?.hp || 0) > 0))
      .filter(player=>!aliveOnly
        || typeof presence?.isActiveForWorld !== "function"
        || presence.isActiveForWorld(player, Number(at)));
  }

  function emitEffect(group, type, payload = {}, at = now()){
    const instance = group?.instance;
    if(!isPrecursorPortalInstance(instance)) return null;
    const effect = addEffect(instance.objective, type, payload, at);
    for(const playerId of joinedIds(instance)){
      if(instance.abandonedMemberIds?.includes(playerId)) continue;
      io?.to?.(playerId)?.emit?.("portal:precursor-effect", publicEffect(effect));
    }
    return effect;
  }

  function start(group){
    const instance = group?.instance;
    if(!isPrecursorPortalInstance(instance) || instance.completed) return false;
    const startedAt = now();
    for(const playerId of joinedIds(instance)){
      const player = players.get(String(playerId));
      if(!player) continue;
      player.precursorActiveInstanceId = instance.id;
      if(player.precursorBlessing?.sourceInstanceId !== instance.id) delete player.precursorBlessing;
    }
    instance.objective = createPrecursorObjective(startedAt, random);
    instance.wave = 0;
    instance.waveState = "escape";
    instance.nextWaveAt = 0;
    instance.enemies = [];
    for(const room of ANCIENT_PORTAL_MAP.rooms || []){
      instance.enemies.push(createPrecursorCage(room));
      for(let index = 0; index < PRECURSOR_ROOM_GUARDS; index += 1){
        instance.enemies.push(createPrecursorGuard(room, index));
      }
    }
    emitInstance?.(group);
    return true;
  }

  function spawnTalismanKeeper(group, roomState, at){
    const instance = group?.instance;
    if(!isCurrent(group, instance)
      || roomState?.role !== "talisman"
      || roomState.keeperSpawned
      || Number(instance.objective?.rescuedCount || 0) < PRECURSOR_CAPTIVE_COUNT){
      return false;
    }
    const room = (ANCIENT_PORTAL_MAP.rooms || []).find(entry=>String(entry.id || "") === String(roomState.id || ""));
    if(!room) return false;
    const keeper = createPrecursorTalismanKeeper(room, at);
    instance.enemies.push(keeper);
    roomState.keeperSpawned = true;
    roomState.keeperId = keeper.id;
    emitEffect(group, "talisman_keeper_revealed", {
      x:keeper.x,
      y:keeper.y,
      sourceId:keeper.id,
      roomId:roomState.id
    }, at);
    emitInstance?.(group);
    return true;
  }

  function discoverRooms(group, at){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || instance.objective?.phase !== "hell") return false;
    const currentPlayers = portalPlayers(group, {at});
    let changed = false;
    for(const room of instance.objective.rooms || []){
      if(room.discovered) continue;
      const discovered = currentPlayers.some(player=>
        Math.hypot(
          finite(player.state?.x) - finite(room.x),
          finite(player.state?.y) - finite(room.y)
        ) <= Math.max(200, finite(room.radius)) + ROOM_DISCOVERY_PADDING
      );
      if(!discovered) continue;
      room.discovered = true;
      room.discoveredAt = at;
      changed = true;
      emitEffect(group, "room_discovered", {
        x:room.x,
        y:room.y,
        roomId:room.id,
        role:room.role === "talisman" && Number(instance.objective.rescuedCount || 0) < PRECURSOR_CAPTIVE_COUNT
          ? "empty"
          : room.role
      }, at);
      spawnTalismanKeeper(group, room, at);
    }
    if(changed) emitInstance?.(group);
    return changed;
  }

  function freeAngel(group, room, cage, at){
    const instance = group?.instance;
    const objective = instance.objective;
    if(room.angelFreed
      || room.role !== "angel"
      || objective.phase !== "hell"
      || Number(objective.deadlineAt || 0) <= Number(at || 0)){
      return false;
    }
    room.angelFreed = true;
    objective.rescuedCount = Math.min(PRECURSOR_CAPTIVE_COUNT, Number(objective.rescuedCount || 0) + 1);
    objective.deadlineAt = Math.min(
      Number(objective.startedAt || at) + PRECURSOR_INITIAL_ESCAPE_MS + PRECURSOR_CAPTIVE_COUNT * PRECURSOR_RESCUE_BONUS_MS,
      Number(objective.deadlineAt || at) + PRECURSOR_RESCUE_BONUS_MS
    );
    const angel = createAngel(objective.allies.length, {
      x:finite(cage?.x, room.x),
      y:finite(cage?.y, room.y) + 130
    }, {rescued:true, at});
    objective.allies.push(angel);
    emitEffect(group, "angel_freed", {
      x:angel.x,
      y:angel.y,
      sourceId:angel.id,
      roomId:room.id,
      rescuedCount:objective.rescuedCount
    }, at);
    emitEffect(group, "timer_added", {
      x:angel.x,
      y:angel.y,
      amountMs:PRECURSOR_RESCUE_BONUS_MS,
      deadlineAt:objective.deadlineAt
    }, at);
    if(objective.rescuedCount >= PRECURSOR_CAPTIVE_COUNT){
      objective.stage = "find_talisman";
      for(const candidate of objective.rooms || []){
        if(candidate.discovered) spawnTalismanKeeper(group, candidate, at);
      }
    }
    emitInstance?.(group);
    return true;
  }

  function acquireTalisman(group, keeper, at){
    const instance = group?.instance;
    const objective = instance.objective;
    if(objective.talisman?.acquired) return false;
    objective.talisman.acquired = true;
    objective.talisman.acquiredAt = at;
    objective.beacon.active = true;
    objective.stage = "open_rift";
    emitEffect(group, "talisman_acquired", {
      x:finite(keeper?.x),
      y:finite(keeper?.y),
      sourceId:String(keeper?.id || "")
    }, at);
    emitInstance?.(group);
    return true;
  }

  function handleEnemyDeath(group, enemy, _killerId = "", at = now()){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || Number(enemy?.hp || 0) > 0) return false;
    const role = String(enemy?.precursorRole || "");
    if(role === "infernal_cage"){
      const room = (instance.objective.rooms || []).find(entry=>
        String(entry.id || "") === String(enemy.precursorRoomId || "")
      );
      if(!room || room.cageDestroyed) return true;
      room.cageDestroyed = true;
      if(room.role === "angel") freeAngel(group, room, enemy, at);
      else emitEffect(group, "empty_cage_opened", {
        x:finite(enemy.x),
        y:finite(enemy.y),
        roomId:room.id
      }, at);
      emitInstance?.(group);
      return true;
    }
    if(role === "talisman_keeper"){
      acquireTalisman(group, enemy, at);
      return true;
    }
    if(role === "demon_king"){
      const objective = instance.objective;
      objective.phase = "epilogue";
      objective.stage = "god";
      objective.deadlineAt = 0;
      objective.god.visible = true;
      objective.epilogueEndsAt = at + PRECURSOR_EPILOGUE_MS;
      objective.bombs = [];
      instance.waveState = "epilogue";
      instance.enemies = [];
      emitEffect(group, "demon_king_dead", {
        x:finite(enemy.x),
        y:finite(enemy.y),
        durationMs:2_400
      }, at);
      emitEffect(group, "phase_changed", {
        phase:"epilogue",
        x:objective.god.x,
        y:objective.god.y
      }, at);
      emitInstance?.(group);
      return true;
    }
    return true;
  }

  function playerForInteraction(socket){
    const player = players.get(String(socket?.id || ""));
    if(!player
      || player.deathState
      || Number(player.state?.hp || 0) <= 0
      || (typeof presence?.isActiveForWorld === "function" && !presence.isActiveForWorld(player, now()))){
      return null;
    }
    const group = getPlayerInstanceGroup(player, groups);
    if(!isCurrent(group) || !joinedIds(group.instance).includes(player.id)) return null;
    if(group.instance.abandonedMemberIds?.includes(player.id)) return null;
    if(String(player.state?.mapId || player.mapId || "") !== `portal-${ANCIENT_PORTAL_ID}`) return null;
    return {player, group};
  }

  function near(player, point, radius){
    return Boolean(player?.state)
      && Math.hypot(finite(player.state.x) - finite(point?.x), finite(player.state.y) - finite(point?.y))
        <= Math.max(80, finite(radius, 180));
  }

  function emitInteractionResult(socket, payload){
    socket?.emit?.("portal:precursor-interact", {
      ...payload,
      at:now()
    });
    return payload;
  }

  function openParadiseRift(socket, group, player, at){
    const objective = group.instance.objective;
    if(objective.phase !== "hell"
      || objective.stage !== "open_rift"
      || Number(objective.rescuedCount || 0) < PRECURSOR_CAPTIVE_COUNT
      || !objective.talisman?.acquired
      || !objective.beacon?.active){
      return emitInteractionResult(socket, {
        ok:false,
        action:"beacon",
        reason:"Le talisman ne peut pas encore activer cette balise."
      });
    }
    if(!near(player, objective.beacon, objective.beacon.radius)){
      return emitInteractionResult(socket, {
        ok:false,
        action:"beacon",
        reason:"Approche-toi de la balise centrale."
      });
    }
    objective.beacon.active = false;
    objective.rift.open = true;
    objective.stage = "enter_rift";
    emitEffect(group, "rift_open", {
      x:objective.rift.x,
      y:objective.rift.y,
      radius:objective.rift.radius,
      durationMs:2_400
    }, at);
    emitInstance?.(group);
    return emitInteractionResult(socket, {ok:true, action:"beacon"});
  }

  function transferPlayerToParadise(player, index, at, instanceId){
    const spawn = mapPoint(ANCIENT_PORTAL_MAP.paradiseSpawn);
    const angle = Math.PI * 2 * Math.max(0, Number(index || 0)) / Math.max(1, PRECURSOR_CAPTIVE_COUNT);
    Object.assign(player.state, {
      x:spawn.x + Math.cos(angle) * 130,
      y:spawn.y + Math.sin(angle) * 130,
      vx:0,
      vy:0,
      moving:false,
      enginePower:0,
      moveTarget:null,
      attackTargetId:"",
      attackAmmoId:"",
      attackWeaponClass:"",
      updatedAt:at
    });
    player.precursorActiveInstanceId = String(instanceId || "");
    profileManager?.saveWorldSession?.({player, state:player.state, force:true});
    io?.to?.(player.id)?.emit?.("player:state-correction", {
      ...player.state,
      source:"precursor-paradise-transfer",
      at
    });
  }

  function enterParadise(socket, group, player, at){
    const instance = group.instance;
    const objective = instance.objective;
    if(objective.phase !== "hell"
      || objective.stage !== "enter_rift"
      || Number(objective.rescuedCount || 0) < PRECURSOR_CAPTIVE_COUNT
      || !objective.talisman?.acquired
      || !objective.rift?.open){
      return emitInteractionResult(socket, {
        ok:false,
        action:"rift",
        reason:"La faille vers le paradis n'est pas ouverte."
      });
    }
    if(!near(player, objective.rift, objective.rift.radius)){
      return emitInteractionResult(socket, {
        ok:false,
        action:"rift",
        reason:"Entre dans la faille centrale."
      });
    }
    objective.phase = "paradise";
    objective.stage = "demon_king";
    objective.deadlineAt = 0;
    objective.rift.open = false;
    objective.rift.entered = true;
    objective.bombs = [];
    cancelPendingAttacksForRoom?.(`instance:${instance.id}`);
    for(const enemy of instance.enemies || []){
      enemy.cancelPendingAttacks = true;
      enemy.hp = 0;
      enemy.shield = 0;
    }
    instance.wave = 1;
    instance.waveState = "demon_king";
    instance.enemies = [createPrecursorDemonKing(at)];
    portalPlayers(group, {aliveOnly:false, at})
      .forEach((member, index)=>transferPlayerToParadise(member, index, at, instance.id));
    const paradise = mapPoint(ANCIENT_PORTAL_MAP.paradiseSpawn);
    for(const ally of objective.allies){
      ally.alive = true;
      ally.hp = ally.maxHp;
      ally.shield = ally.maxShield;
      ally.x = paradise.x;
      ally.y = paradise.y + 160;
    }
    while(objective.allies.length < PRECURSOR_PARADISE_ALLY_COUNT){
      const index = objective.allies.length;
      const angle = Math.PI * 2 * index / PRECURSOR_PARADISE_ALLY_COUNT;
      objective.allies.push(createAngel(index, {
        x:paradise.x + Math.cos(angle) * 360,
        y:paradise.y + Math.sin(angle) * 360
      }, {reinforcement:true, at}));
    }
    emitEffect(group, "phase_changed", {
      phase:"paradise",
      x:paradise.x,
      y:paradise.y,
      durationMs:2_400
    }, at);
    emitInstance?.(group);
    return emitInteractionResult(socket, {ok:true, action:"rift"});
  }

  function completeAtGod(socket, group, player, at){
    const objective = group.instance.objective;
    if(objective.phase !== "epilogue" || !objective.god?.visible){
      return emitInteractionResult(socket, {
        ok:false,
        action:"god",
        reason:"Le Dieu des vaisseaux ne s'est pas encore manifesté."
      });
    }
    if(!near(player, objective.god, objective.god.radius)){
      return emitInteractionResult(socket, {
        ok:false,
        action:"god",
        reason:"Approche-toi du Dieu des vaisseaux."
      });
    }
    objective.completedAt = at;
    objective.stage = "complete";
    emitPortalComplete?.(group);
    return emitInteractionResult(socket, {ok:true, action:"god"});
  }

  function interact(socket, action){
    const context = playerForInteraction(socket);
    if(!context){
      return emitInteractionResult(socket, {
        ok:false,
        action:String(action || ""),
        reason:"Interaction de portail impossible."
      });
    }
    const at = now();
    if(context.group.instance.objective?.phase === "hell"
      && Number(context.group.instance.objective?.deadlineAt || 0) > 0
      && at >= Number(context.group.instance.objective.deadlineAt)){
      expireEscape(context.group, at);
      return emitInteractionResult(socket, {
        ok:false,
        action:String(action || ""),
        reason:"Le temps est écoulé : le passage infernal s'est refermé."
      });
    }
    if(action === "beacon") return openParadiseRift(socket, context.group, context.player, at);
    if(action === "rift") return enterParadise(socket, context.group, context.player, at);
    if(action === "god") return completeAtGod(socket, context.group, context.player, at);
    return emitInteractionResult(socket, {
      ok:false,
      action:String(action || ""),
      reason:"Interaction inconnue."
    });
  }

  function followPlayer(group, ally, index, dt, at){
    const targets = portalPlayers(group, {at});
    if(!targets.length) return false;
    const player = targets[index % targets.length];
    const spacing = 125;
    const row = Math.floor(index / 2) + 1;
    const side = index % 2 === 0 ? -1 : 1;
    const angle = finite(player.state?.angle);
    const target = {
      x:finite(player.state?.x) - Math.cos(angle - Math.PI / 2) * row * spacing + Math.cos(angle) * side * 95,
      y:finite(player.state?.y) - Math.sin(angle - Math.PI / 2) * row * spacing + Math.sin(angle) * side * 95
    };
    return moveEntity(ally, target, ANGEL_FOLLOW_SPEED, dt, 40);
  }

  function attackFromAngel(group, ally, at){
    if(at < Number(ally.nextAttackAt || 0)) return false;
    const instance = group.instance;
    const addHunter = Number(String(ally.id || "").match(/(\d+)$/)?.[1] || 0) % 2 === 0;
    const targets = living(instance.enemies).filter(enemy=>
      !enemy.static && enemy.precursorRole !== "infernal_cage"
    );
    const target = targets.sort((left, right)=>{
      const priority = enemy=>{
        if(addHunter && enemy.precursorRole === "demon_minion") return 0;
        if(enemy.precursorRole === "demon_king") return addHunter ? 1 : 0;
        if(enemy.precursorRole === "demon_minion") return 1;
        return 2;
      };
      const delta = priority(left) - priority(right);
      if(delta) return delta;
      return Math.hypot(finite(left.x) - finite(ally.x), finite(left.y) - finite(ally.y))
        - Math.hypot(finite(right.x) - finite(ally.x), finite(right.y) - finite(ally.y));
    })[0];
    if(!target) return false;
    const distance = Math.hypot(finite(target.x) - finite(ally.x), finite(target.y) - finite(ally.y));
    if(distance > ANGEL_ATTACK_RANGE){
      moveEntity(ally, target, ANGEL_FOLLOW_SPEED, .05, ANGEL_ATTACK_RANGE * .72);
      return false;
    }
    const damage = rollBetween(ANGEL_DAMAGE_MIN, ANGEL_DAMAGE_MAX, random);
    const before = enemyDurability(target);
    applyDamageToEnemy(target, damage);
    const dealt = Math.max(0, before - enemyDurability(target));
    markEnemyAttackedByPlayer(target, ally.id, dealt, at);
    ally.nextAttackAt = at + ANGEL_ATTACK_COOLDOWN_MS;
    emitEffect(group, "angel_attack", {
      x:target.x,
      y:target.y,
      sourceId:ally.id,
      targetId:target.id,
      amount:dealt
    }, at);
    if(Number(target.hp || 0) <= 0) handleEnemyDeath(group, target, ally.id, at);
    return true;
  }

  function healFromAngels(group, at){
    const objective = group.instance.objective;
    const healer = living(objective.allies).find(ally=>at >= Number(ally.nextHealAt || 0));
    if(!healer) return false;
    const playerTargets = portalPlayers(group, {at}).map(player=>({
      id:player.id,
      state:player.state,
      player
    }));
    const allyTargets = living(objective.allies).map(ally=>({id:ally.id, state:ally, ally}));
    const target = [...playerTargets, ...allyTargets].sort((left, right)=>{
      const ratio = entry=>{
        const state = entry.state;
        const current = Number(state.hp || 0) + Number(state.shield || 0);
        const maximum = Math.max(1, Number(state.maxHp || 0) + Number(state.maxShield || 0));
        return current / maximum;
      };
      return ratio(left) - ratio(right);
    })[0];
    if(!target) return false;
    const state = target.state;
    let remaining = ANGEL_HEAL_AMOUNT;
    const hpBefore = Number(state.hp || 0);
    state.hp = Math.min(Number(state.maxHp || hpBefore), hpBefore + remaining);
    remaining -= Math.max(0, Number(state.hp || 0) - hpBefore);
    const shieldBefore = Number(state.shield || 0);
    state.shield = Math.min(Number(state.maxShield || shieldBefore), shieldBefore + remaining);
    const healed = Math.max(0, Number(state.hp || 0) - hpBefore)
      + Math.max(0, Number(state.shield || 0) - shieldBefore);
    healer.nextHealAt = at + ANGEL_HEAL_COOLDOWN_MS;
    if(healed <= 0) return false;
    if(target.player){
      target.player.state.updatedAt = at;
      profileManager?.saveWorldSession?.({player:target.player, state:target.player.state});
      io?.to?.(target.player.id)?.emit?.("player:state-correction", {
        ...target.player.state,
        source:"precursor-angel-heal",
        at
      });
    }
    emitEffect(group, "angel_heal", {
      x:finite(state.x),
      y:finite(state.y),
      sourceId:healer.id,
      targetId:target.id,
      amount:healed
    }, at);
    return true;
  }

  function buffFromAngels(group, at){
    const objective = group.instance.objective;
    const source = living(objective.allies).find(ally=>at >= Number(ally.nextBuffAt || 0));
    if(!source) return false;
    const targets = portalPlayers(group, {at});
    if(!targets.length) return false;
    for(const player of targets){
      player.precursorActiveInstanceId = group.instance.id;
      player.precursorBlessing = {
        damageMultiplier:ANGEL_DAMAGE_MULTIPLIER,
        expiresAt:at + ANGEL_BUFF_DURATION_MS,
        sourceInstanceId:group.instance.id
      };
      emitEffect(group, "angel_buff", {
        x:finite(player.state?.x),
        y:finite(player.state?.y),
        sourceId:source.id,
        targetId:player.id,
        multiplier:ANGEL_DAMAGE_MULTIPLIER,
        durationMs:ANGEL_BUFF_DURATION_MS
      }, at);
    }
    source.nextBuffAt = at + ANGEL_BUFF_COOLDOWN_MS;
    return true;
  }

  function updateAngels(group, dt, at){
    const objective = group.instance.objective;
    const current = living(objective.allies);
    let changed = false;
    for(let index = 0; index < current.length; index += 1){
      const ally = current[index];
      if(objective.phase === "hell") changed = followPlayer(group, ally, index, dt, at) || changed;
      else if(objective.phase === "paradise"){
        const boss = living(group.instance.enemies).find(enemy=>enemy.precursorRole === "demon_king");
        if(boss) moveEntity(ally, boss, ANGEL_FOLLOW_SPEED, dt, ANGEL_ATTACK_RANGE * .72);
        changed = attackFromAngel(group, ally, at) || changed;
      }
    }
    if(objective.phase === "paradise"){
      changed = healFromAngels(group, at) || changed;
      changed = buffFromAngels(group, at) || changed;
    }
    return changed;
  }

  function bossTargets(group, at){
    const playerTargets = portalPlayers(group, {at}).map(player=>({
      id:player.id,
      x:finite(player.state?.x),
      y:finite(player.state?.y),
      player
    }));
    const angelTargets = living(group.instance.objective.allies).map(angel=>({
      id:angel.id,
      x:finite(angel.x),
      y:finite(angel.y),
      angel
    }));
    return [...playerTargets, ...angelTargets];
  }

  function spawnBomb(group, boss, at){
    const targets = bossTargets(group, at);
    if(!targets.length) return false;
    const locked = targets.find(target=>String(target.id) === String(boss.lockedPlayerId || ""));
    const target = locked || targets[Math.floor(clamp(finite(random(), 1), 0, .999999) * targets.length)];
    const objective = group.instance.objective;
    objective.bombSequence = Number(objective.bombSequence || 0) + 1;
    const bomb = {
      id:`ANCIENT-BOMB-${objective.bombSequence}`,
      x:target.x,
      y:target.y,
      radius:PRECURSOR_BOMB_RADIUS,
      damage:PRECURSOR_BOMB_DAMAGE,
      createdAt:at,
      detonateAt:at + PRECURSOR_BOMB_WARNING_MS
    };
    objective.bombs.push(bomb);
    boss.precursorNextBombAt = at + PRECURSOR_BOMB_COOLDOWN_MS;
    emitEffect(group, "bomb_warning", {
      x:bomb.x,
      y:bomb.y,
      radius:bomb.radius,
      detonateAt:bomb.detonateAt,
      durationMs:PRECURSOR_BOMB_WARNING_MS
    }, at);
    return true;
  }

  function damagePlayerFromBomb(group, player, bomb, at){
    if(!player?.state || Number(player.state.hp || 0) <= 0) return 0;
    presence?.markDamage?.(player, at);
    presence?.markCombat?.(player, "bombe du Roi des Démons");
    const before = Number(player.state.hp || 0) + Number(player.state.shield || 0);
    if(typeof presence?.applyDamageToPlayerState === "function"){
      presence.applyDamageToPlayerState(player, PRECURSOR_BOMB_DAMAGE, at);
    }else{
      player.state.hp = Math.max(0, Number(player.state.hp || 0) - PRECURSOR_BOMB_DAMAGE);
    }
    const after = Number(player.state.hp || 0) + Number(player.state.shield || 0);
    player.state.updatedAt = at;
    profileManager?.saveWorldSession?.({
      player,
      state:player.state,
      force:Number(player.state.hp || 0) <= 0
    });
    io?.to?.(player.id)?.emit?.("player:damage", {
      enemyId:"precursor_demon_king_bomb",
      mapId:`portal-${ANCIENT_PORTAL_ID}`,
      amount:PRECURSOR_BOMB_DAMAGE,
      hp:Number(player.state.hp || 0),
      maxHp:Number(player.state.maxHp || 0),
      shield:Number(player.state.shield || 0),
      maxShield:Number(player.state.maxShield || 0),
      x:bomb.x,
      y:bomb.y,
      at
    });
    return Math.max(0, before - after);
  }

  function detonateBomb(group, bomb, at){
    const objective = group.instance.objective;
    const hitIds = [];
    for(const player of portalPlayers(group, {at})){
      if(Math.hypot(finite(player.state?.x) - bomb.x, finite(player.state?.y) - bomb.y) > bomb.radius) continue;
      if(damagePlayerFromBomb(group, player, bomb, at) > 0) hitIds.push(player.id);
    }
    for(const angel of living(objective.allies)){
      if(Math.hypot(finite(angel.x) - bomb.x, finite(angel.y) - bomb.y) > bomb.radius) continue;
      if(applyDirectAngelDamage(angel, PRECURSOR_BOMB_DAMAGE) > 0) hitIds.push(angel.id);
    }
    emitEffect(group, "bomb_explosion", {
      x:bomb.x,
      y:bomb.y,
      radius:bomb.radius,
      amount:PRECURSOR_BOMB_DAMAGE,
      targetIds:hitIds,
      durationMs:900
    }, at);
  }

  function updateBombs(group, at){
    const objective = group.instance.objective;
    let changed = false;
    for(const bomb of [...objective.bombs]){
      if(at < Number(bomb.detonateAt || 0)) continue;
      detonateBomb(group, bomb, at);
      objective.bombs = objective.bombs.filter(candidate=>candidate !== bomb);
      changed = true;
    }
    return changed;
  }

  function summonMinions(group, boss, at){
    const livingMinions = living(group.instance.enemies).filter(enemy=>
      enemy.precursorRole === "demon_minion"
    ).length;
    const spawnCount = Math.min(DEMON_MINION_COUNT, Math.max(0, DEMON_MINION_MAX_ALIVE - livingMinions));
    for(let index = 0; index < spawnCount; index += 1){
      group.instance.enemies.push(createPrecursorDemonMinion(index, boss, at));
    }
    boss.precursorNextSummonAt = at + PRECURSOR_SUMMON_COOLDOWN_MS;
    if(spawnCount > 0){
      emitEffect(group, "demon_summon", {
        x:finite(boss.x),
        y:finite(boss.y),
        sourceId:boss.id,
        count:spawnCount,
        durationMs:1_200
      }, at);
    }
    return spawnCount > 0;
  }

  function updateDemonKing(group, at){
    for(const enemy of living(group.instance.enemies)){
      if(enemy.precursorRole !== "demon_minion"
        || at < Number(enemy.precursorExpiresAt || Infinity)){
        continue;
      }
      enemy.noReward = true;
      enemy.cancelPendingAttacks = true;
      enemy.hp = 0;
      enemy.shield = 0;
      enemy.lockedPlayerId = null;
    }
    const boss = living(group.instance.enemies).find(enemy=>enemy.precursorRole === "demon_king");
    if(!boss) return false;
    let changed = false;
    if(at >= Number(boss.precursorNextBombAt || 0)) changed = spawnBomb(group, boss, at) || changed;
    if(at >= Number(boss.precursorNextSummonAt || 0)) changed = summonMinions(group, boss, at) || changed;
    return changed;
  }

  function updateGroup(group, dt, at){
    const instance = group?.instance;
    if(!isCurrent(group, instance)) return false;
    const objective = instance.objective;
    pruneEffects(objective, at);
    if(objective.phase === "hell" && Number(objective.deadlineAt || 0) > 0 && at >= Number(objective.deadlineAt)){
      expireEscape(group, at);
      return true;
    }
    let changed = false;
    if(objective.phase === "hell"){
      changed = discoverRooms(group, at) || changed;
      changed = updateAngels(group, dt, at) || changed;
    }else if(objective.phase === "paradise"){
      changed = updateAngels(group, dt, at) || changed;
      changed = updateDemonKing(group, at) || changed;
      changed = updateBombs(group, at) || changed;
    }
    if(changed) emitInstance?.(group);
    return changed;
  }

  function expireEscape(group, at){
    const instance = group?.instance;
    if(!isCurrent(group, instance) || instance.objective?.phase !== "hell") return false;
    const objective = instance.objective;
    objective.phase = "failed";
    objective.stage = "failed";
    objective.failedAt = at;
    objective.failureReason = "Le passage infernal s'est refermé avant votre fuite.";
    instance.precursorFailed = true;
    emitEffect(group, "timer_expired", {
      x:finite(ANCIENT_PORTAL_MAP.spawn?.x),
      y:finite(ANCIENT_PORTAL_MAP.spawn?.y)
    }, at);
    failPortal?.(group, {
      code:"PRECURSOR_TIMER_EXPIRED",
      reason:objective.failureReason,
      at
    });
    return true;
  }

  function updatePrecursorEncounters(dt, at = now()){
    for(const group of getInstanceGroups(groups)) updateGroup(group, dt, at);
  }

  function getPrecursorNpcTargets(instance, mapId){
    if(!isPrecursorPortalInstance(instance)
      || instance.objective?.kind !== "precursors"
      || instance.objective?.phase !== "paradise"){
      return [];
    }
    return living(instance.objective.allies).map(ally=>({
      id:ally.id,
      npcTarget:true,
      connected:true,
      clientMode:"game",
      mapId,
      state:ally
    }));
  }

  function cancel(instance){
    if(!isPrecursorPortalInstance(instance)) return false;
    cancelPendingAttacksForRoom?.(`instance:${instance.id}`);
    for(const enemy of instance.enemies || []) enemy.cancelPendingAttacks = true;
    instance.objective.bombs = [];
    for(const playerId of joinedIds(instance)){
      const player = players.get(String(playerId));
      if(player?.precursorBlessing?.sourceInstanceId === instance.id) delete player.precursorBlessing;
      if(player?.precursorActiveInstanceId === instance.id) delete player.precursorActiveInstanceId;
    }
    return true;
  }

  return {
    cancel,
    getPrecursorNpcTargets,
    handleEnemyDeath,
    interact,
    start,
    updateGroup,
    updatePrecursorEncounters
  };
}
