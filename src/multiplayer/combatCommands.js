import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

const ACTIVE_PLAYER_STATE_INTERVAL_MS = 50;
const IDLE_PLAYER_STATE_CHECK_INTERVAL_MS = 100;
const IDLE_PLAYER_STATE_HEARTBEAT_MS = 1000;
const RELIABLE_DISCONTINUITY_DISTANCE_PX = 240;
const COMBAT_FIRE_ACK_TIMEOUT_MS = 2500;

const PLAYER_STATE_NUMERIC_THRESHOLDS = Object.freeze({
  x:1,
  y:1,
  angle:.015,
  hp:.01,
  maxHp:.01,
  shield:.01,
  maxShield:.01,
  vx:.5,
  vy:.5,
  enginePower:.02,
  engineAngle:.015,
  level:0,
  speed:.5,
  radius:.1
});

function angularDistance(left, right){
  const turn = Math.PI * 2;
  const delta = Math.abs(Number(left || 0) - Number(right || 0)) % turn;
  return Math.min(delta, turn - delta);
}

function numericValueChanged(key, previous, next){
  const threshold = PLAYER_STATE_NUMERIC_THRESHOLDS[key] ?? 0;
  if(key === "angle" || key === "engineAngle") return angularDistance(previous, next) > threshold;
  return Math.abs(Number(previous || 0) - Number(next || 0)) > threshold;
}

function arrayChanged(previous, next){
  if(!Array.isArray(previous) || !Array.isArray(next)) return previous !== next;
  return previous.length !== next.length || previous.some((value, index)=>value !== next[index]);
}

function moveTargetChanged(previous, next){
  if(!previous || !next) return previous !== next;
  return Math.abs(Number(previous.x || 0) - Number(next.x || 0)) > 1
    || Math.abs(Number(previous.y || 0) - Number(next.y || 0)) > 1;
}

export function hasSignificantPlayerStateChange(previous, next){
  if(!previous || !next) return true;
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for(const key of keys){
    if(Object.hasOwn(PLAYER_STATE_NUMERIC_THRESHOLDS, key)){
      if(numericValueChanged(key, previous[key], next[key])) return true;
      continue;
    }
    if(key === "moveTarget"){
      if(moveTargetChanged(previous[key], next[key])) return true;
      continue;
    }
    if(Array.isArray(previous[key]) || Array.isArray(next[key])){
      if(arrayChanged(previous[key], next[key])) return true;
      continue;
    }
    if(previous[key] !== next[key]) return true;
  }
  return false;
}

function clonePlayerSnapshot(payload){
  const clone = {...payload};
  if(payload.moveTarget) clone.moveTarget = {...payload.moveTarget};
  if(Array.isArray(payload.droneUpgrades)) clone.droneUpgrades = [...payload.droneUpgrades];
  return clone;
}

function playerSnapshotMoving(snapshot){
  return Boolean(snapshot?.moveTarget)
    || Math.hypot(Number(snapshot?.vx || 0), Number(snapshot?.vy || 0)) > .5
    || Number(snapshot?.enginePower || 0) > .02;
}

function playerSnapshotDiscontinuous(previous, next){
  if(!previous || !next) return true;
  if(String(previous.mapId ?? "") !== String(next.mapId ?? "")) return true;
  return Math.hypot(
    Number(next.x || 0) - Number(previous.x || 0),
    Number(next.y || 0) - Number(previous.y || 0)
  ) > RELIABLE_DISCONTINUITY_DISTANCE_PX;
}

export function createCombatCommands({multiplayer}){
  let nextPlayerStateCheckAt = Number.NEGATIVE_INFINITY;
  let lastPlayerStateCheckActive = null;
  let lastPlayerStateSentAt = Number.NEGATIVE_INFINITY;
  let lastPlayerStateSourceAt = Number.NEGATIVE_INFINITY;
  let lastPlayerState = null;
  let playerStateSequence = 0;
  let playerStateSessionKey = "";
  let queuedPlayerSnapshot = null;
  let playerSnapshotFlushScheduled = false;

  function resetPlayerStateTracking(){
    nextPlayerStateCheckAt = Number.NEGATIVE_INFINITY;
    lastPlayerStateCheckActive = null;
    lastPlayerStateSentAt = Number.NEGATIVE_INFINITY;
    lastPlayerStateSourceAt = Number.NEGATIVE_INFINITY;
    lastPlayerState = null;
    playerStateSequence = 0;
    playerStateSessionKey = "";
    queuedPlayerSnapshot = null;
    playerSnapshotFlushScheduled = false;
    multiplayer.lastPlayerMapChange = null;
  }

  function flushPlayerSnapshot(payloadOrFactory, options = {}){
    if(!isAuthenticatedGameplaySession(multiplayer)){
      resetPlayerStateTracking();
      return false;
    }
    const sessionKey = `${multiplayer.auth.account.id}:${multiplayer.socket.id || ""}`;
    if(sessionKey !== playerStateSessionKey){
      resetPlayerStateTracking();
      playerStateSessionKey = sessionKey;
    }
    const now = performance.now();
    const active = options.active === true;
    const force = options.force === true;
    const checkInterval = active
      ? ACTIVE_PLAYER_STATE_INTERVAL_MS
      : IDLE_PLAYER_STATE_CHECK_INTERVAL_MS;
    if(lastPlayerStateCheckActive !== null && lastPlayerStateCheckActive !== active){
      nextPlayerStateCheckAt = Math.min(nextPlayerStateCheckAt, now);
    }
    lastPlayerStateCheckActive = active;
    if(!force && now + .5 < nextPlayerStateCheckAt) return false;
    if(!Number.isFinite(nextPlayerStateCheckAt)) nextPlayerStateCheckAt = now;
    while(nextPlayerStateCheckAt <= now + .5){
      nextPlayerStateCheckAt += checkInterval;
    }
    const payload = typeof payloadOrFactory === "function"
      ? payloadOrFactory()
      : payloadOrFactory;
    if(!payload || typeof payload !== "object") return false;
    const heartbeatDue = now - lastPlayerStateSentAt >= IDLE_PLAYER_STATE_HEARTBEAT_MS;
    if(!force && !heartbeatDue && !hasSignificantPlayerStateChange(lastPlayerState, payload)) return false;
    const previousMapId = lastPlayerState?.mapId;
    const reliable = force || options.reliable === true
      || !lastPlayerState
      || heartbeatDue
      || playerSnapshotMoving(lastPlayerState) !== playerSnapshotMoving(payload)
      || playerSnapshotDiscontinuous(lastPlayerState, payload);
    lastPlayerState = clonePlayerSnapshot(payload);
    lastPlayerStateSentAt = now;
    multiplayer.lastSent = now;
    playerStateSequence += 1;
    if(!Number.isSafeInteger(playerStateSequence)){
      resetPlayerStateTracking();
      return false;
    }
    lastPlayerStateSourceAt = Math.max(now, lastPlayerStateSourceAt + .001);
    const outgoing = {
      ...payload,
      sourceSeq:playerStateSequence,
      sourceAt:lastPlayerStateSourceAt
    };
    if(previousMapId != null && String(previousMapId) !== String(payload.mapId ?? "")){
      multiplayer.lastPlayerMapChange = {
        socketId:multiplayer.socket.id,
        sourceSeq:outgoing.sourceSeq,
        fromMapId:String(previousMapId),
        toMapId:String(payload.mapId ?? "")
      };
    }
    const volatileEmitter = multiplayer.socket.volatile;
    const emitter = !reliable && typeof volatileEmitter?.emit === "function"
      ? volatileEmitter
      : multiplayer.socket;
    emitter.emit("player:state", outgoing);
    return true;
  }

  function sendPlayerSnapshot(payloadOrFactory, options = {}){
    if(options.force === true){
      queuedPlayerSnapshot = null;
      return flushPlayerSnapshot(payloadOrFactory, options);
    }
    if(options.coalesce !== true) return flushPlayerSnapshot(payloadOrFactory, options);
    queuedPlayerSnapshot = {payloadOrFactory, options:{...options, coalesce:false}};
    if(playerSnapshotFlushScheduled) return true;
    playerSnapshotFlushScheduled = true;
    const flush = ()=>{
      playerSnapshotFlushScheduled = false;
      const queued = queuedPlayerSnapshot;
      queuedPlayerSnapshot = null;
      if(queued) flushPlayerSnapshot(queued.payloadOrFactory, queued.options);
    };
    if(typeof globalThis.queueMicrotask === "function") globalThis.queueMicrotask(flush);
    else Promise.resolve().then(flush);
    return true;
  }

  function sendPlayerActivity(kind = "input"){
    if(!isAuthenticatedGameplaySession(multiplayer)) return false;
    const now = performance.now();
    const lastSent = Number(multiplayer.lastActivitySent || 0);
    if(lastSent > 0 && now - lastSent < 10000) return false;
    multiplayer.lastActivitySent = now;
    multiplayer.socket.emit("player:activity", {
      kind:String(kind || "input").slice(0, 40)
    });
    return true;
  }

  function emitCombatFire(eventName, payload, acknowledge){
    let settled = false;
    const finish = result=>{
      if(settled) return;
      settled = true;
      clearTimeout(timeout);
      acknowledge?.(result);
    };
    const timeout = setTimeout(()=>finish({
      accepted:false,
      outcome:"rejected",
      reasonCode:"timeout",
      reason:"Le serveur n'a pas confirme le tir."
    }), COMBAT_FIRE_ACK_TIMEOUT_MS);
    timeout?.unref?.();
    multiplayer.socket.emit(eventName, payload, response=>finish(
      response && typeof response === "object"
        ? response
        : {
            accepted:false,
            outcome:"rejected",
            reasonCode:"invalid-ack",
            reason:"Confirmation de tir invalide."
          }
    ));
    return true;
  }

  function rejectLocalCombatFire(acknowledge, reasonCode, reason){
    acknowledge?.({accepted:false, outcome:"rejected", reasonCode, reason});
    return false;
  }

  function sendServerEnemyHit(enemyId, context = {}, acknowledge){
    if(!isAuthenticatedGameplaySession(multiplayer)){
      return rejectLocalCombatFire(acknowledge, "session-unavailable", "Session de jeu indisponible.");
    }
    if(!enemyId){
      return rejectLocalCombatFire(acknowledge, "target-missing", "Cible serveur introuvable.");
    }
    return emitCombatFire("combat:fire", {
      enemyId,
      weaponClass:context.weaponClass || "laser",
      ammoId:context.ammoId || "ammo_x1",
      count:context.count || 1,
      shotId:String(context.shotId || "").slice(0, 120),
      travelTimeMs:Math.max(0, Math.min(2000, Number(context.travelTimeMs || 0))),
      starts:(Array.isArray(context.starts) ? context.starts : []).slice(0, 12),
      fromX:Number(context.fromX || 0),
      fromY:Number(context.fromY || 0),
      toX:Number(context.toX ?? context.clientAimX ?? 0),
      toY:Number(context.toY ?? context.clientAimY ?? 0),
      blueLaser:context.blueLaser === true,
      clientAimX:Number(context.clientAimX || 0),
      clientAimY:Number(context.clientAimY || 0),
      targetRadius:Number(context.targetRadius || 0)
    }, acknowledge);
  }

  function sendServerPlayerHit(targetPlayerId, context = {}, acknowledge){
    if(!isAuthenticatedGameplaySession(multiplayer)){
      return rejectLocalCombatFire(acknowledge, "session-unavailable", "Session de jeu indisponible.");
    }
    if(!targetPlayerId){
      return rejectLocalCombatFire(acknowledge, "target-missing", "Cible joueur introuvable.");
    }
    return emitCombatFire("combat:fire-player", {
      targetPlayerId,
      weaponClass:context.weaponClass || "laser",
      ammoId:context.ammoId || "ammo_x1",
      count:context.count || 1,
      shotId:String(context.shotId || "").slice(0, 120),
      travelTimeMs:Math.max(0, Math.min(2000, Number(context.travelTimeMs || 0))),
      starts:(Array.isArray(context.starts) ? context.starts : []).slice(0, 12),
      fromX:Number(context.fromX || 0),
      fromY:Number(context.fromY || 0),
      toX:Number(context.toX ?? context.clientAimX ?? 0),
      toY:Number(context.toY ?? context.clientAimY ?? 0),
      blueLaser:context.blueLaser === true,
      clientAimX:Number(context.clientAimX || 0),
      clientAimY:Number(context.clientAimY || 0),
      targetRadius:Number(context.targetRadius || 0)
    }, acknowledge);
  }

  function sendPlayerLaserEffect(payload){
    if(!isAuthenticatedGameplaySession(multiplayer)) return;
    multiplayer.socket.emit("player:laser", payload);
  }

  return {sendPlayerSnapshot, sendPlayerActivity, sendServerEnemyHit, sendServerPlayerHit, sendPlayerLaserEffect};
}
