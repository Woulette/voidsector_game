import { createEnemyDeathExplosion } from "../render/enemyDeathExplosion.js";

const emitted = new WeakSet();
const MAX_ACTIVE_DEATH_EXPLOSIONS = 8;

export function spawnEnemyDeathExplosion(effects, enemy, position = enemy){
  if(!Array.isArray(effects) || !enemy || typeof enemy !== "object" || emitted.has(enemy) || enemy.isPlayerTarget) return null;
  const effect = createEnemyDeathExplosion(position);
  if(!effect) return null;
  emitted.add(enemy);
  const deaths = effects.filter(entry=>entry.kind === "enemyDeathExplosion");
  if(deaths.length >= MAX_ACTIVE_DEATH_EXPLOSIONS){
    const oldest = effects.indexOf(deaths[0]);
    if(oldest >= 0) effects.splice(oldest,1);
  }
  effects.push(effect);
  return effect;
}

export function createCombatEnemyDeathSystem({getState}){
  let scope = null, map = null, snapshotAt = null, previous = new Map();
  function observeServerSnapshot(multiplayer){
    const state = getState(), key = multiplayer?.serverEnemyScopeKey;
    const current = multiplayer?.serverEnemies, at = multiplayer?.serverEnemySnapshotAt;
    if(!key || !(current instanceof Map) || multiplayer.connected === false){
      scope = null; previous.clear(); snapshotAt = null; return;
    }
    const currentMap = String(state.currentMap?.id ?? state.currentMap?.name ?? "");
    const sameScope = key === scope && currentMap === map;
    if(sameScope && at != null && at === snapshotAt) return;
    const visuals = new Map((state.enemies || []).map(enemy=>[String(enemy.serverId || enemy.id),enemy]));
    // World/instance snapshots enumerate all living enemies in this scope.
    // Compare only consecutive snapshots of the same map and instance, so a
    // transfer, reconnect or initial spawn cannot look like mass destruction.
    if(sameScope){
      for(const [id, entry] of previous){
        const next = current.get(entry.id);
        if(entry.hp > 0 && (!next || Number(next.hp) <= 0)){
          const visual = visuals.get(id) || entry.enemy;
          spawnEnemyDeathExplosion(state.impactEffects,visual,{x:visual.x,y:visual.y});
        }
      }
    }
    previous = new Map([...current.values()].filter(enemy=>enemy?.id).map(enemy=>{
      const visual = visuals.get(String(enemy.id));
      return [String(enemy.id),{id:enemy.id,hp:Number(enemy.hp),enemy:visual || {...enemy}}];
    }));
    scope = key; map = currentMap; snapshotAt = at;
  }
  return {observeServerSnapshot};
}
