export function upsertRemotePlayer(multiplayer, player){
  if(!player?.id || player.id === multiplayer.playerId) return;
  const existing = multiplayer.remotePlayers.get(player.id) || {};
  const state = player.state || existing.state || null;
  const stateSamples = Array.isArray(existing.stateSamples) ? existing.stateSamples.slice(-7) : [];
  if(state) stateSamples.push({...state, receivedAt:performance.now()});
  if(stateSamples.length > 8) stateSamples.splice(0, stateSamples.length - 8);
  multiplayer.remotePlayers.set(player.id, {...existing, ...player, state, stateSamples});
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

function upsertServerEnemy(next, enemy, existing, now){
  const samples = Array.isArray(existing?.samples) ? existing.samples.slice(-5) : [];
  samples.push({
    x:Number(enemy.x || 0),
    y:Number(enemy.y || 0),
    angle:Number(enemy.angle || 0),
    vx:Number(enemy.vx || 0),
    vy:Number(enemy.vy || 0),
    moving:Boolean(enemy.moving),
    at:now
  });
  next.set(enemy.id, {...existing, ...enemy, receivedAt:now, samples});
}

export function replaceServerEnemies(multiplayer, payload, scope){
  const next = new Map();
  const now = performance.now();
  const isDelta = Boolean(payload?.delta);
  const scopeKey = getServerEnemyScopeKey(payload, scope);
  const definitions = getServerEnemyDefinitions(multiplayer);
  if(!isDelta){
    if(scopeKey !== multiplayer.serverEnemyScopeKey) definitions.clear();
    for(const enemy of Array.isArray(payload?.enemies) ? payload.enemies : []){
      if(!enemy?.id) continue;
      const existing = multiplayer.serverEnemies.get(enemy.id);
      storeServerEnemyDefinition(definitions, enemy);
      upsertServerEnemy(next, enemy, existing, now);
    }
    multiplayer.serverEnemyScope = scope;
    multiplayer.serverEnemyScopeKey = scopeKey;
    multiplayer.serverEnemies = next;
    return;
  }

  if(multiplayer.serverEnemyScopeKey && multiplayer.serverEnemyScopeKey !== scopeKey) return;
  for(const enemy of Array.isArray(payload?.enemies) ? payload.enemies : []){
    if(!enemy?.id) continue;
    const existing = multiplayer.serverEnemies.get(enemy.id);
    const definition = definitions.get(enemy.id) || existing;
    if(!definition) continue;
    upsertServerEnemy(next, {...definition, ...existing, ...enemy}, existing, now);
  }
  multiplayer.serverEnemyScope = scope;
  multiplayer.serverEnemyScopeKey = scopeKey;
  multiplayer.serverEnemies = next;
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
