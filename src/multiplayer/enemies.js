import { countCombatProfiler, maxCombatProfilerMetric } from "../game/systems/combatFrameProfiler.js?v=action-slots-save-1-fps-burst-1";

export function getServerEnemyList(multiplayerState){
  return [...(multiplayerState?.serverEnemies?.values?.() || [])];
}

export function hasServerControlledEnemies(multiplayerState){
  return getServerEnemyList(multiplayerState).length > 0;
}

export function isServerControlledEnemy(enemy){
  return Boolean(enemy?.serverControlled);
}

export function getServerEnemyId(enemy){
  return enemy?.serverId || enemy?.id || null;
}

function lerp(a, b, t){
  return a + (b - a) * t;
}

function lerpAngle(a, b, t){
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

const SERVER_ENEMY_INTERPOLATION_DELAY_MS = 220;
const SERVER_ENEMY_MAX_EXTRAPOLATION_SECONDS = 0.05;
const SERVER_ENEMY_SNAP_DISTANCE = 900;
const SERVER_ENEMY_MAX_VISUAL_CORRECTION_PER_SECOND = 720;
const SERVER_ENEMY_POSITION_SMOOTH_FACTOR = .18;
const SERVER_ENEMY_CROWDED_POSITION_SMOOTH_FACTOR = .12;
const SERVER_ENEMY_CROWDED_COUNT = 24;
const SERVER_ENEMY_DEFAULT_VISUAL_DT_SECONDS = 1 / 60;
const SERVER_ENEMY_MIN_VISUAL_DT_SECONDS = 1 / 240;
const SERVER_ENEMY_MAX_VISUAL_DT_SECONDS = 1 / 30;

function getNowMs(){
  const perf = globalThis.performance;
  if(perf && typeof perf.now === "function") return perf.now();
  return Date.now();
}

function getVisualCorrectionLimit(existing, nowMs){
  const lastVisualAt = Number(existing?.lastServerVisualAt);
  const rawDtSeconds = Number.isFinite(lastVisualAt)
    ? (nowMs - lastVisualAt) / 1000
    : SERVER_ENEMY_DEFAULT_VISUAL_DT_SECONDS;
  const dtSeconds = Math.min(
    SERVER_ENEMY_MAX_VISUAL_DT_SECONDS,
    Math.max(SERVER_ENEMY_MIN_VISUAL_DT_SECONDS, rawDtSeconds)
  );
  return SERVER_ENEMY_MAX_VISUAL_CORRECTION_PER_SECOND * dtSeconds;
}

function sampleBufferedState(samples, delayMs = SERVER_ENEMY_INTERPOLATION_DELAY_MS){
  if(!Array.isArray(samples) || samples.length <= 0) return null;
  const ordered = samples;
  if(!ordered.length) return null;
  const targetTime = getNowMs() - delayMs;
  if(targetTime <= ordered[0].at) return ordered[0];
  for(let i = 0; i < ordered.length - 1; i++){
    const from = ordered[i];
    const to = ordered[i + 1];
    if(targetTime < from.at || targetTime > to.at) continue;
    const span = Math.max(1, to.at - from.at);
    const t = Math.max(0, Math.min(1, (targetTime - from.at) / span));
    return {
      x:lerp(Number(from.x || 0), Number(to.x || 0), t),
      y:lerp(Number(from.y || 0), Number(to.y || 0), t),
      angle:lerpAngle(Number(from.angle || 0), Number(to.angle || 0), t),
      vx:lerp(Number(from.vx || 0), Number(to.vx || 0), t),
      vy:lerp(Number(from.vy || 0), Number(to.vy || 0), t),
      moving:Boolean(to.moving || Math.hypot(Number(to.vx || 0), Number(to.vy || 0)) > 4)
    };
  }
  const latest = ordered[ordered.length - 1];
  const extrapolateSeconds = Math.max(0, Math.min(SERVER_ENEMY_MAX_EXTRAPOLATION_SECONDS, (targetTime - latest.at) / 1000));
  return {
    ...latest,
    x:Number(latest.x || 0) + Number(latest.vx || 0) * extrapolateSeconds,
    y:Number(latest.y || 0) + Number(latest.vy || 0) * extrapolateSeconds
  };
}

function getPositionSmoothFactor(syncCount = 0){
  return Number(syncCount || 0) >= SERVER_ENEMY_CROWDED_COUNT
    ? SERVER_ENEMY_CROWDED_POSITION_SMOOTH_FACTOR
    : SERVER_ENEMY_POSITION_SMOOTH_FACTOR;
}

function smoothVectorPosition(previousX, previousY, targetX, targetY, factor, maxCorrection = Number.POSITIVE_INFINITY){
  const desiredStepX = (targetX - previousX) * factor;
  const desiredStepY = (targetY - previousY) * factor;
  const desiredLength = Math.hypot(desiredStepX, desiredStepY);
  if(!Number.isFinite(desiredLength) || desiredLength <= 0) return {x:previousX, y:previousY};
  if(desiredLength <= maxCorrection) return {
    x:previousX + desiredStepX,
    y:previousY + desiredStepY
  };
  const scale = maxCorrection / desiredLength;
  return {
    x:previousX + desiredStepX * scale,
    y:previousY + desiredStepY * scale
  };
}

function normalizeServerEnemy(serverEnemy, existing = null, nowMs = getNowMs(), syncCount = 0){
  const id = serverEnemy.id;
  const buffered = sampleBufferedState(serverEnemy.samples);
  const serverX = Number(buffered?.x ?? serverEnemy.x ?? 0);
  const serverY = Number(buffered?.y ?? serverEnemy.y ?? 0);
  const serverAngle = Number(buffered?.angle ?? serverEnemy.angle ?? 0);
  const previousX = Number(existing?.x ?? serverX);
  const previousY = Number(existing?.y ?? serverY);
  const previousAngle = Number(existing?.angle ?? serverAngle);
  const distance = Math.hypot(serverX - previousX, serverY - previousY);
  const smooth = existing && distance < SERVER_ENEMY_SNAP_DISTANCE;
  const target = existing || {};
  if(target.__serverSnapshot !== serverEnemy) Object.assign(target, serverEnemy);
  target.__serverSnapshot = serverEnemy;
  target.id = id;
  target.serverId = id;
  target.serverControlled = true;
  target.hp = Number(serverEnemy.hp || 0);
  target.maxHp = Number(serverEnemy.maxHp || serverEnemy.hp || 1);
  target.shield = Number(serverEnemy.shield || 0);
  target.maxShield = Number(serverEnemy.maxShield || 0);
  const maxVisualCorrection = smooth ? getVisualCorrectionLimit(existing, nowMs) : Number.POSITIVE_INFINITY;
  const smoothFactor = getPositionSmoothFactor(syncCount);
  const nextPosition = smooth
    ? smoothVectorPosition(previousX, previousY, serverX, serverY, smoothFactor, maxVisualCorrection)
    : {x:serverX, y:serverY};
  const nextX = nextPosition.x;
  const nextY = nextPosition.y;
  const visualStep = Math.hypot(nextX - previousX, nextY - previousY);
  if(existing){
    countCombatProfiler(smooth ? "sync.enemy.smoothed" : "sync.enemy.snap", 1);
    maxCombatProfilerMetric("sync.enemy.maxCorrectionPx", distance);
    maxCombatProfilerMetric("sync.enemy.maxVisualStepPx", visualStep);
  }
  target.x = nextX;
  target.y = nextY;
  target.lastServerVisualAt = nowMs;
  target.serverX = serverX;
  target.serverY = serverY;
  target.angle = smooth ? lerpAngle(previousAngle, serverAngle, .30) : serverAngle;
  target.vx = Number(buffered?.vx ?? serverEnemy.vx ?? 0);
  target.vy = Number(buffered?.vy ?? serverEnemy.vy ?? 0);
  target.aggro = Boolean(serverEnemy.aggro);
  target.idle = Boolean(serverEnemy.idle);
  target.hitT = Number.POSITIVE_INFINITY;
  target.attackCooldown = Number.POSITIVE_INFINITY;
  target.moving = Boolean(buffered?.moving || serverEnemy.moving || Math.hypot(Number(serverEnemy.vx || 0), Number(serverEnemy.vy || 0)) > 4);
  target.attackT = Math.max(0, Number(serverEnemy.attackT || 0));
  target.recentHitTimer = Math.max(Number(existing?.recentHitTimer || 0), Number(serverEnemy.recentHitTimer || 0));
  return target;
}

export function syncServerControlledEnemies({enemies, multiplayerState, selectedEnemy, onSelectionLost, now = getNowMs()}){
  if(!Array.isArray(enemies)) return {enemies:[], selectedEnemy:null};

  const serverEnemyMap = multiplayerState?.serverEnemies instanceof Map
    ? multiplayerState.serverEnemies
    : new Map(getServerEnemyList(multiplayerState).map(enemy=>[enemy.id, enemy]));
  const hasServerEnemies = serverEnemyMap.size > 0;

  const existingById = new Map();
  const nextEnemies = [];
  for(const enemy of enemies){
    if(isServerControlledEnemy(enemy)){
      const id = getServerEnemyId(enemy);
      if(serverEnemyMap.has(id)) existingById.set(id, enemy);
    }else if(!hasServerEnemies) nextEnemies.push(enemy);
  }

  for(const serverEnemy of serverEnemyMap.values()){
    if(!serverEnemy?.id) continue;
    const existing = existingById.get(serverEnemy.id);
    const normalized = normalizeServerEnemy(serverEnemy, existing, now, serverEnemyMap.size);
    nextEnemies.push(existing || normalized);
  }

  const stableEnemies = nextEnemies.length === enemies.length
    && nextEnemies.every((enemy, index)=>enemy === enemies[index])
    ? enemies
    : nextEnemies;

  let nextSelectedEnemy = selectedEnemy;
  if(selectedEnemy){
    if(selectedEnemy.isPlayerTarget) return {enemies:stableEnemies, selectedEnemy};
    const selectedId = getServerEnemyId(selectedEnemy);
    const live = stableEnemies.find(enemy=>getServerEnemyId(enemy) === selectedId && enemy.hp > 0) || null;
    if(live) nextSelectedEnemy = live;
    else{
      nextSelectedEnemy = null;
      onSelectionLost?.();
    }
  }

  return {enemies:stableEnemies, selectedEnemy:nextSelectedEnemy};
}

export function getSoloEnemies(enemies){
  return Array.isArray(enemies) ? enemies.filter(enemy=>!isServerControlledEnemy(enemy)) : [];
}
