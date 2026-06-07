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

const SERVER_ENEMY_INTERPOLATION_DELAY_MS = 170;
const SERVER_ENEMY_MAX_EXTRAPOLATION_SECONDS = 0.08;
const SERVER_ENEMY_SNAP_DISTANCE = 900;
const SERVER_ENEMY_MAX_VISUAL_CORRECTION = 55;

function sampleBufferedState(samples, delayMs = SERVER_ENEMY_INTERPOLATION_DELAY_MS){
  if(!Array.isArray(samples) || samples.length <= 0) return null;
  const ordered = samples.filter(sample=>Number.isFinite(sample?.at)).sort((a, b)=>a.at - b.at);
  if(!ordered.length) return null;
  const targetTime = (performance.now?.() || Date.now()) - delayMs;
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

function smoothPosition(previous, target, factor = .28){
  const delta = target - previous;
  if(Math.abs(delta) <= SERVER_ENEMY_MAX_VISUAL_CORRECTION) return lerp(previous, target, factor);
  return previous + Math.sign(delta) * SERVER_ENEMY_MAX_VISUAL_CORRECTION;
}

function normalizeServerEnemy(serverEnemy, existing = null){
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
  return {
    ...serverEnemy,
    id,
    serverId:id,
    serverControlled:true,
    hp:Number(serverEnemy.hp || 0),
    maxHp:Number(serverEnemy.maxHp || serverEnemy.hp || 1),
    shield:Number(serverEnemy.shield || 0),
    maxShield:Number(serverEnemy.maxShield || 0),
    x:smooth ? smoothPosition(previousX, serverX) : serverX,
    y:smooth ? smoothPosition(previousY, serverY) : serverY,
    serverX,
    serverY,
    angle:smooth ? lerpAngle(previousAngle, serverAngle, .30) : serverAngle,
    vx:Number(buffered?.vx ?? serverEnemy.vx ?? 0),
    vy:Number(buffered?.vy ?? serverEnemy.vy ?? 0),
    aggro:Boolean(serverEnemy.aggro),
    idle:Boolean(serverEnemy.idle),
    hitT:Number.POSITIVE_INFINITY,
    attackCooldown:Number.POSITIVE_INFINITY,
    moving:Boolean(buffered?.moving || serverEnemy.moving || Math.hypot(Number(serverEnemy.vx || 0), Number(serverEnemy.vy || 0)) > 4),
    attackT:Math.max(0, Number(serverEnemy.attackT || 0)),
    recentHitTimer:Math.max(Number(existing?.recentHitTimer || 0), Number(serverEnemy.recentHitTimer || 0))
  };
}

export function syncServerControlledEnemies({enemies, multiplayerState, selectedEnemy, onSelectionLost}){
  if(!Array.isArray(enemies)) return {enemies:[], selectedEnemy:null};

  const serverEnemies = getServerEnemyList(multiplayerState);
  const serverIds = new Set(serverEnemies.map(enemy=>enemy.id).filter(Boolean));
  const hasServerEnemies = serverEnemies.length > 0;

  const nextEnemies = enemies.filter(enemy=>{
    if(isServerControlledEnemy(enemy)) return serverIds.has(getServerEnemyId(enemy));
    return !hasServerEnemies;
  });

  for(const serverEnemy of serverEnemies){
    if(!serverEnemy?.id) continue;
    const existing = nextEnemies.find(enemy=>isServerControlledEnemy(enemy) && getServerEnemyId(enemy) === serverEnemy.id);
    const normalized = normalizeServerEnemy(serverEnemy, existing);
    if(existing) Object.assign(existing, normalized);
    else nextEnemies.push(normalized);
  }

  let nextSelectedEnemy = selectedEnemy;
  if(selectedEnemy){
    if(selectedEnemy.isPlayerTarget) return {enemies:nextEnemies, selectedEnemy};
    const selectedId = getServerEnemyId(selectedEnemy);
    const live = nextEnemies.find(enemy=>getServerEnemyId(enemy) === selectedId && enemy.hp > 0) || null;
    if(live) nextSelectedEnemy = live;
    else{
      nextSelectedEnemy = null;
      onSelectionLost?.();
    }
  }

  return {enemies:nextEnemies, selectedEnemy:nextSelectedEnemy};
}

export function getSoloEnemies(enemies){
  return Array.isArray(enemies) ? enemies.filter(enemy=>!isServerControlledEnemy(enemy)) : [];
}
