const MAX_REMOTE_PLAYER_SAMPLES = 12;
const REMOTE_DISCONTINUITY_MIN_PX = 240;

function finiteRemote(value, fallback = 0){
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function remoteSequence(state){
  const value = Number(state?.streamSeq ?? state?.sourceSeq);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function remoteSourceSequence(state){
  const value = Number(state?.sourceSeq);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function hasRemoteStreamSequence(state){
  const value = Number(state?.streamSeq);
  return Number.isSafeInteger(value) && value > 0;
}

function remoteSourceAt(state, receivedAt){
  if(Number.isFinite(Number(state?.sourceAt))) return Number(state.sourceAt);
  if(Number.isFinite(Number(state?.updatedAt))) return Number(state.updatedAt);
  return receivedAt;
}

function ensureRemoteDiagnostics(remote){
  if(remote.networkDiagnostics) return remote.networkDiagnostics;
  remote.networkDiagnostics = {
    lastSequence:0,
    lastSourceSequence:0,
    observedIntervalMs:0,
    jitterMs:0,
    droppedSequences:0,
    droppedSourceSequences:0,
    droppedBroadcastSequences:0,
    staleSamples:0,
    lateBursts:0,
    bufferUnderruns:0,
    extrapolations:0,
    discontinuityResets:0,
    adaptiveDelayMs:0
  };
  return remote.networkDiagnostics;
}

function isRemoteDiscontinuity(previous, next, sourceDelta){
  if(!previous || next?.motionDiscontinuity === true) return true;
  if(String(previous.mapId ?? "") !== String(next.mapId ?? "")) return true;
  const distance = Math.hypot(
    finiteRemote(next.x) - finiteRemote(previous.x),
    finiteRemote(next.y) - finiteRemote(previous.y)
  );
  const speed = Math.max(
    1,
    finiteRemote(next.speed, finiteRemote(previous.speed, 300)),
    Math.hypot(finiteRemote(previous.vx), finiteRemote(previous.vy)),
    Math.hypot(finiteRemote(next.vx), finiteRemote(next.vy))
  );
  const expected = Math.max(
    REMOTE_DISCONTINUITY_MIN_PX,
    speed * Math.min(2, Math.max(0, sourceDelta) / 1000) * 3 + 96
  );
  return distance > expected;
}

export function upsertRemotePlayer(multiplayer, player, {
  now = globalThis.performance?.now?.() ?? Date.now(),
  epochNow = Date.now()
} = {}){
  if(!player?.id || player.id === multiplayer.playerId) return null;
  const existing = multiplayer.remotePlayers.get(player.id) || {id:player.id, stateSamples:[]};
  let stateSamples = Array.isArray(existing.stateSamples) ? existing.stateSamples : [];
  const diagnostics = ensureRemoteDiagnostics(existing);
  const state = player.state || existing.state || null;
  if(!state){
    Object.assign(existing, player, {state, stateSamples, lastReceivedAt:epochNow});
    multiplayer.remotePlayers.set(player.id, existing);
    return existing;
  }

  const latest = stateSamples[stateSamples.length - 1] || null;
  const sequence = remoteSequence(state);
  const sourceSequence = remoteSourceSequence(state);
  const receivedAt = finiteRemote(now);
  const sourceAt = remoteSourceAt(state, receivedAt);
  const latestSequence = remoteSequence(latest);
  const latestSourceAt = latest
    ? remoteSourceAt(latest, finiteRemote(latest.receivedAt))
    : Number.NEGATIVE_INFINITY;
  const stateVersion = finiteRemote(state.updatedAt);
  const latestVersion = finiteRemote(latest?.sourceUpdatedAt);
  const beginsSequencedStream = Boolean(latest && hasRemoteStreamSequence(state) && !hasRemoteStreamSequence(latest));
  const staleSequence = Boolean(latest && !beginsSequencedStream && sequence && latestSequence && sequence <= latestSequence);
  if(latest && !staleSequence && sequence > latestSequence && sourceAt === latestSourceAt
    && state.x === latest.x && state.y === latest.y && state.mapId === latest.mapId){
    // Reliable combat updates may change HP without capturing a new movement.
    // Refresh metadata without adding a fake stationary segment or changing the clock.
    Object.assign(latest, state, {sourceAt:latestSourceAt, receivedAt:latest.receivedAt});
    diagnostics.lastSequence = sequence;
    Object.assign(existing, player, {state, stateSamples, lastReceivedAt:epochNow});
    multiplayer.remotePlayers.set(player.id, existing);
    return existing;
  }
  const staleSource = Boolean(latest && !beginsSequencedStream && sourceAt <= latestSourceAt && (sequence || stateVersion <= latestVersion));
  if(staleSequence || staleSource){
    diagnostics.staleSamples += 1;
    Object.assign(existing, player, {state:existing.state || state, stateSamples, lastReceivedAt:epochNow});
    multiplayer.remotePlayers.set(player.id, existing);
    return existing;
  }

  const sourceDelta = latest ? sourceAt - latestSourceAt : 0;
  const arrivalDelta = latest ? receivedAt - finiteRemote(latest.receivedAt) : 0;
  if(latest && sourceDelta > 0 && arrivalDelta >= 0){
    const previousInterval = diagnostics.observedIntervalMs;
    diagnostics.observedIntervalMs = previousInterval > 0
      ? previousInterval * .8 + sourceDelta * .2
      : sourceDelta;
    const jitterSample = Math.abs(arrivalDelta - sourceDelta);
    diagnostics.jitterMs = diagnostics.jitterMs > 0
      ? diagnostics.jitterMs * .8 + jitterSample * .2
      : jitterSample;
    if(arrivalDelta > diagnostics.observedIntervalMs + Math.max(30, diagnostics.jitterMs * 2)){
      diagnostics.lateBursts += 1;
    }
  }
  const sourceGap = sourceSequence
    && diagnostics.lastSourceSequence
    && sourceSequence > diagnostics.lastSourceSequence + 1
    ? sourceSequence - diagnostics.lastSourceSequence - 1
    : 0;
  const broadcastGap = sequence && latestSequence && sequence > latestSequence + 1
    ? sequence - latestSequence - 1
    : 0;
  diagnostics.droppedSourceSequences += sourceGap;
  diagnostics.droppedBroadcastSequences += broadcastGap;
  diagnostics.droppedSequences += Math.max(sourceGap, broadcastGap);

  const discontinuity = latest && (beginsSequencedStream || isRemoteDiscontinuity(latest, state, sourceDelta));
  if(discontinuity){
    stateSamples = [];
    existing.renderState = null;
    existing.sampledState = null;
    existing.interpolationState = null;
    diagnostics.discontinuityResets += 1;
  }
  const sample = {
    ...state,
    streamSeq:sequence || state.streamSeq,
    sourceAt,
    sourceUpdatedAt:stateVersion,
    receivedAt
  };
  stateSamples.push(sample);
  if(stateSamples.length > MAX_REMOTE_PLAYER_SAMPLES){
    stateSamples.splice(0, stateSamples.length - MAX_REMOTE_PLAYER_SAMPLES);
  }
  diagnostics.lastSequence = sequence || diagnostics.lastSequence;
  if(sourceSequence > diagnostics.lastSourceSequence){
    diagnostics.lastSourceSequence = sourceSequence;
  }
  Object.assign(existing, player, {state, stateSamples, lastReceivedAt:epochNow});
  multiplayer.remotePlayers.set(player.id, existing);
  return existing;
}

function getServerEnemyScopeKey(payload, scope){
  const id = scope === "coop"
    ? payload?.instanceId || ""
    : payload?.mapId || "";
  return `${scope || "world"}:${id}`;
}

function getServerEnemyDefinitions(multiplayer){
  if(!(multiplayer.serverEnemyDefinitions instanceof Map)){
    multiplayer.serverEnemyDefinitions = new Map();
  }
  return multiplayer.serverEnemyDefinitions;
}

function storeServerEnemyDefinition(definitions, enemy){
  if(!enemy?.id) return;
  const {samples, receivedAt, __serverSnapshot, ...definition} = enemy;
  definitions.set(enemy.id, definition);
}

function upsertServerEnemy(target, enemy, existing, now, sourceAt = now){
  const previousSnapshotRevision = Math.max(0, Number(existing?.serverSnapshotRevision || 0));
  const discontinuity = Boolean(existing && Math.hypot(Number(enemy.x || 0) - Number(existing.x || 0), Number(enemy.y || 0) - Number(existing.y || 0)) > 900);
  const samples = !discontinuity && Array.isArray(existing?.samples) ? existing.samples.slice(-5) : [];
  if(samples.at(-1)?.sourceAt === sourceAt) samples.pop();
  samples.push({
    x:Number(enemy.x || 0),
    y:Number(enemy.y || 0),
    angle:Number(enemy.angle || 0),
    vx:Number(enemy.vx || 0),
    vy:Number(enemy.vy || 0),
    moving:Boolean(enemy.moving),
    at:now,
    sourceAt,
    receivedAt:now
  });
  const nextEnemy = existing && typeof existing === "object" ? existing : {};
  Object.assign(nextEnemy, enemy);
  nextEnemy.serverSnapshotRevision = previousSnapshotRevision + 1;
  nextEnemy.serverMotionDiscontinuity = discontinuity;
  nextEnemy.receivedAt = now;
  nextEnemy.samples = samples;
  target.set(enemy.id, nextEnemy);
}

function removeServerEnemiesMissingFromDelta(serverEnemies, seenIds){
  for(const id of serverEnemies.keys()){
    if(!seenIds.has(id)) serverEnemies.delete(id);
  }
}

export function replaceServerEnemies(multiplayer, payload, scope){
  const now = performance.now();
  const sourceAt = Number.isFinite(payload?.at) ? payload.at : now;
  const isDelta = Boolean(payload?.delta);
  const scopeKey = getServerEnemyScopeKey(payload, scope);
  if(scopeKey === multiplayer.serverEnemyScopeKey && Number.isFinite(payload?.at)
    && payload.at < multiplayer.serverEnemySnapshotAt) return;
  if(!isDelta || !multiplayer.serverEnemyScopeKey || scopeKey === multiplayer.serverEnemyScopeKey){
    multiplayer.serverEnemySnapshotAt = Number.isFinite(payload?.at) ? payload.at : null;
  }
  const definitions = getServerEnemyDefinitions(multiplayer);
  if(!isDelta){
    const next = new Map();
    const sameScope = scopeKey === multiplayer.serverEnemyScopeKey;
    if(!sameScope) definitions.clear();
    for(const enemy of Array.isArray(payload?.enemies) ? payload.enemies : []){
      if(!enemy?.id) continue;
      const existing = sameScope ? multiplayer.serverEnemies.get(enemy.id) : null;
      storeServerEnemyDefinition(definitions, enemy);
      upsertServerEnemy(next, enemy, existing, now, sourceAt);
    }
    multiplayer.serverEnemyScope = scope;
    multiplayer.serverEnemyScopeKey = scopeKey;
    multiplayer.serverEnemies = next;
    return;
  }

  if(multiplayer.serverEnemyScopeKey && multiplayer.serverEnemyScopeKey !== scopeKey) return;
  if(!(multiplayer.serverEnemies instanceof Map)) multiplayer.serverEnemies = new Map();
  const seenIds = new Set();
  for(const enemy of Array.isArray(payload?.enemies) ? payload.enemies : []){
    if(!enemy?.id) continue;
    const existing = multiplayer.serverEnemies.get(enemy.id);
    const definition = definitions.get(enemy.id) || existing;
    if(!definition) continue;
    seenIds.add(enemy.id);
    upsertServerEnemy(multiplayer.serverEnemies, {...definition, ...existing, ...enemy}, existing, now, sourceAt);
  }
  removeServerEnemiesMissingFromDelta(multiplayer.serverEnemies, seenIds);
  multiplayer.serverEnemyScope = scope;
  multiplayer.serverEnemyScopeKey = scopeKey;
}

export function addRemoteEffect(multiplayer, effect){
  if(!effect || effect.sourceId === multiplayer.playerId) return;
  multiplayer.remoteEffects.push({
    ...effect,
    createdAt:Date.now(),
    life:Number(effect.life || 0.18),
    maxLife:Number(effect.life || 0.18)
  });
  if(multiplayer.remoteEffects.length > 80) multiplayer.remoteEffects.splice(0, multiplayer.remoteEffects.length - 80);
}
