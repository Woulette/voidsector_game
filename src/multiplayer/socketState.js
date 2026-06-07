export function upsertRemotePlayer(multiplayer, player){
  if(!player?.id || player.id === multiplayer.playerId) return;
  const existing = multiplayer.remotePlayers.get(player.id) || {};
  const state = player.state || existing.state || null;
  const stateSamples = Array.isArray(existing.stateSamples) ? existing.stateSamples.slice(-7) : [];
  if(state) stateSamples.push({...state, receivedAt:performance.now()});
  if(stateSamples.length > 8) stateSamples.splice(0, stateSamples.length - 8);
  multiplayer.remotePlayers.set(player.id, {...existing, ...player, state, stateSamples});
}

export function replaceServerEnemies(multiplayer, payload, scope){
  const next = new Map();
  const now = performance.now();
  for(const enemy of Array.isArray(payload?.enemies) ? payload.enemies : []){
    if(!enemy?.id) continue;
    const existing = multiplayer.serverEnemies.get(enemy.id);
    const samples = Array.isArray(existing?.samples) ? existing.samples.slice(-12) : [];
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
  multiplayer.serverEnemyScope = scope;
  multiplayer.serverEnemies = next;
}

export function addRemoteEffect(multiplayer, effect){
  if(!effect || effect.sourceId === multiplayer.playerId) return;
  multiplayer.remoteEffects.push({
    ...effect,
    createdAt:performance.now(),
    life:Number(effect.life || 0.18),
    maxLife:Number(effect.life || 0.18)
  });
  if(multiplayer.remoteEffects.length > 80) multiplayer.remoteEffects.splice(0, multiplayer.remoteEffects.length - 80);
}
