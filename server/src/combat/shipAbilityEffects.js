import { getShipAbilityDefinition } from "../../../src/shared/shipAbilities.js";
import { getFirmHitOwner, markFirmHitOwner } from "../firms/firmHitOwnership.js";
import { markEnemyAttackedByPlayer } from "../world/aggro.js";

const POISON_BOMB_EFFECT_TYPE = "enemy_poison_bomb";

function finite(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getInstanceMapId(instance){
  if(instance?.type === "portal") return `portal-${instance.portal?.id || "blue"}`;
  return "coop-test";
}

function getPoisonRecordKey({scope, mapId, groupId, enemyId} = {}){
  return [String(scope || "world"), String(groupId || mapId || ""), String(enemyId || "")].join(":");
}

export function refreshEnemyPoisonEffect(enemy, {
  attackerId = "",
  abilityId = "poison_bomb",
  damagePerTick = 10_000,
  tickIntervalMs = 1_000,
  durationMs = 10_000,
  now = Date.now()
} = {}){
  if(!enemy || Number(enemy.hp || 0) <= 0) return null;
  const previous = enemy.shipPoison && typeof enemy.shipPoison === "object" ? enemy.shipPoison : null;
  const nextTickAt = previous?.nextTickAt >= now
    ? Number(previous.nextTickAt)
    : now + Math.max(1, Number(tickIntervalMs || 1_000));
  enemy.shipPoison = {
    type:"poison",
    sourceId:String(abilityId || "poison_bomb"),
    attackerId:String(attackerId || ""),
    damagePerTick:Math.max(0, Math.round(Number(damagePerTick || 0))),
    tickIntervalMs:Math.max(1, Math.round(Number(tickIntervalMs || 1_000))),
    nextTickAt,
    expiresAt:now + Math.max(1, Math.round(Number(durationMs || 10_000))),
    refreshedAt:now
  };
  return enemy.shipPoison;
}

export function createShipAbilityEffectManager({
  io,
  players,
  groups,
  profileManager,
  emitWorldEnemies,
  emitWorldReward,
  emitInstance,
  getWorldMapState,
  removeWorldEnemy,
  respawnWorldEnemy,
  spawnWorldEnemyChildren,
  updateLootOwner,
  emitPrivateQuestItemDrop,
  emitPrivatePortalPieceDrop,
  emitPrivatePortalAnchorKeyDrop,
  emitPrivateResourceDrops,
  applyEnemyDeathEffect,
  progressServerQuestsForKill,
  handlePortalEnemyDeath
} = {}){
  const activePulses = new Map();
  const poisonRecords = new Map();

  function resolvePlayerScope(player){
    if(!player?.state) return null;
    const mapId = String(player.state.mapId || player.mapId || "");
    const group = player.groupId ? groups?.get(player.groupId) : null;
    const instance = group?.instance || null;
    if(instance && !instance.completed && getInstanceMapId(instance) === mapId){
      return {
        scope:"instance",
        group,
        instance,
        mapId,
        room:player.mapRoom || `instance:${instance.id}`,
        enemies:Array.isArray(instance.enemies) ? instance.enemies : []
      };
    }
    const worldState = getWorldMapState?.(mapId);
    if(!worldState) return null;
    return {
      scope:"world",
      mapId:String(worldState.id || mapId),
      room:player.mapRoom || `map:${String(worldState.id || mapId)}`,
      enemies:Array.isArray(worldState.enemies) ? worldState.enemies : []
    };
  }

  function resolvePoisonRecord(record){
    if(!record) return null;
    if(record.scope === "instance"){
      const group = groups?.get(record.groupId);
      const instance = group?.instance || null;
      if(!instance || instance.completed) return null;
      const enemy = instance.enemies?.find(entry=>String(entry.id) === String(record.enemyId));
      return enemy ? {enemy, group, instance, mapId:getInstanceMapId(instance), room:`instance:${instance.id}`} : null;
    }
    const worldState = getWorldMapState?.(record.mapId);
    const enemy = worldState?.enemies?.find(entry=>String(entry.id) === String(record.enemyId));
    return enemy ? {enemy, mapId:String(worldState.id || record.mapId), room:`map:${String(worldState.id || record.mapId)}`} : null;
  }

  function emitPoisonPulse({player, scope, definition, pulseIndex, now}){
    const durationMs = Math.max(250, Number(definition.pulseDurationMs || 1_000));
    io?.to?.(scope.room)?.emit("ship:ability-effect", {
      kind:"poison_bomb_pulse",
      abilityId:definition.id,
      sourceId:player.id,
      mapId:scope.mapId,
      x:finite(player.state.x),
      y:finite(player.state.y),
      radius:Math.max(1, Number(definition.radius || 300)),
      pulseIndex,
      pulseCount:Math.max(1, Number(definition.pulseCount || 3)),
      durationMs,
      followSource:true,
      at:now
    });
  }

  function emitPoisonDamage({enemy, mapId, room, attackerId, amount, now}){
    io?.to?.(room)?.emit("combat:hit", {
      enemyId:enemy.id,
      attackerId,
      weaponClass:"ability",
      ammoId:"poison_bomb",
      hit:true,
      damage:Math.max(0, Math.round(Number(amount || 0))),
      damageType:"poison",
      sourceId:"poison_bomb",
      mapId:String(mapId || ""),
      x:finite(enemy.x),
      y:finite(enemy.y),
      radius:Number(enemy.radius || 0),
      at:now
    });
  }

  function handleWorldEnemyDeath({enemy, player, mapId}){
    if(!enemy || !player || Number(enemy.hp || 0) > 0) return;
    const attackerId = player.id;
    emitWorldReward?.({
      enemy,
      mapId,
      attackerId,
      firmAttackerId:getFirmHitOwner(enemy, players)?.id || attackerId
    });
    emitPrivateQuestItemDrop?.({enemy, mapId, ownerId:enemy.lootOwnerId || attackerId});
    emitPrivatePortalPieceDrop?.({enemy, mapId, ownerId:enemy.lootOwnerId || attackerId});
    emitPrivatePortalAnchorKeyDrop?.({enemy, mapId, ownerId:enemy.lootOwnerId || attackerId});
    emitPrivateResourceDrops?.({enemy, mapId, ownerId:enemy.lootOwnerId || attackerId});
    progressServerQuestsForKill?.({enemy, mapId, attackerId});
    applyEnemyDeathEffect?.(mapId, enemy, Date.now());
    spawnWorldEnemyChildren?.(mapId, enemy);
    if(!enemy.respawning){
      enemy.respawning = true;
      const timeout = enemy.temporarySpawn
        ? setTimeout(()=>removeWorldEnemy?.(mapId, enemy.id), 100)
        : setTimeout(()=>respawnWorldEnemy?.(mapId, enemy.id), 8000);
      timeout.unref?.();
    }
    emitWorldEnemies?.(mapId);
  }

  function handlePoisonDeath({record, enemy}){
    if(!enemy || Number(enemy.hp || 0) > 0) return;
    const player = players?.get(record.attackerId);
    if(!player) return;
    if(record.scope === "instance"){
      const group = groups?.get(record.groupId);
      if(group?.instance){
        handlePortalEnemyDeath?.(group, enemy, record.attackerId);
        emitInstance?.(group);
      }
      return;
    }
    handleWorldEnemyDeath({enemy, player, mapId:record.mapId});
  }

  function applyPoisonToEnemy({enemy, player, scope, definition, now}){
    const radius = Math.max(1, Number(definition.radius || 300));
    const distance = Math.hypot(finite(enemy.x) - finite(player.state.x), finite(enemy.y) - finite(player.state.y));
    if(distance > radius || Number(enemy.hp || 0) <= 0) return false;
    markEnemyAttackedByPlayer(enemy, player.id, 0, now);
    markFirmHitOwner(enemy, player);
    updateLootOwner?.(enemy, player.id);
    refreshEnemyPoisonEffect(enemy, {
      attackerId:player.id,
      abilityId:definition.id,
      damagePerTick:Number(definition.poisonDamagePerSecond || 10_000),
      tickIntervalMs:Number(definition.poisonTickMs || 1_000),
      durationMs:Number(definition.poisonDurationMs || 10_000),
      now
    });
    const key = getPoisonRecordKey({
      scope:scope.scope,
      mapId:scope.mapId,
      groupId:scope.group?.id,
      enemyId:enemy.id
    });
    poisonRecords.set(key, {
      scope:scope.scope,
      mapId:scope.mapId,
      groupId:scope.group?.id || "",
      enemyId:enemy.id,
      attackerId:player.id
    });
    return true;
  }

  function resolveActivePulse(entry){
    const player = players?.get(entry.playerId);
    if(!player?.state || Number(player.state.hp || 0) <= 0) return null;
    const currentMapId = String(player.state.mapId || player.mapId || "");
    if(entry.mapId && currentMapId !== String(entry.mapId)) return null;
    const definition = getShipAbilityDefinition(entry.shipId, entry.abilityId);
    if(definition?.effectType !== POISON_BOMB_EFFECT_TYPE) return null;
    const scope = resolvePlayerScope(player);
    if(!scope) return null;
    return {player, definition, scope};
  }

  function applyPoisonPulseArea(entry, now, resolved = null){
    const active = resolved || resolveActivePulse(entry);
    if(!active) return false;
    const {player, definition, scope} = active;
    for(const enemy of scope.enemies){
      applyPoisonToEnemy({enemy, player, scope, definition, now});
    }
    return true;
  }

  function startPoisonPulse(entry, now){
    const active = resolveActivePulse(entry);
    if(!active) return false;
    const {player, definition, scope} = active;
    const pulseIndex = entry.pulsesDone + 1;
    emitPoisonPulse({player, scope, definition, pulseIndex, now});
    entry.activePulseUntil = now + Math.max(250, Number(definition.pulseDurationMs || 1_000));
    applyPoisonPulseArea(entry, now, active);
    entry.pulsesDone += 1;
    return true;
  }

  function startShipAbilityEffect({player, status, now = Date.now()} = {}){
    if(!player?.state || !status?.abilityId) return false;
    const definition = getShipAbilityDefinition(status.shipId || player.state.shipId, status.abilityId);
    if(definition?.effectType !== POISON_BOMB_EFFECT_TYPE) return false;
    const id = `${player.id}:${definition.id}:${now}`;
    const pulseIntervalMs = Math.max(1, Number(definition.pulseIntervalMs || 3_000));
    const entry = {
      id,
      playerId:player.id,
      shipId:definition.shipId || status.shipId || player.state.shipId,
      abilityId:definition.id,
      mapId:String(player.state.mapId || player.mapId || ""),
      nextPulseAt:now + pulseIntervalMs,
      pulsesDone:0,
      pulseCount:Math.max(1, Number(definition.pulseCount || 3)),
      pulseIntervalMs
    };
    if(!startPoisonPulse(entry, now)) return false;
    if(entry.pulsesDone < entry.pulseCount) activePulses.set(id, entry);
    return true;
  }

  function tickPoisonRecord(key, record, now){
    const resolved = resolvePoisonRecord(record);
    if(!resolved){
      poisonRecords.delete(key);
      return;
    }
    const {enemy, mapId, room} = resolved;
    const poison = enemy.shipPoison;
    if(!poison || poison.sourceId !== "poison_bomb" || Number(enemy.hp || 0) <= 0 || now > Number(poison.expiresAt || 0)){
      delete enemy.shipPoison;
      poisonRecords.delete(key);
      return;
    }
    while(now >= Number(poison.nextTickAt || 0)
      && poison.nextTickAt <= poison.expiresAt
      && Number(enemy.hp || 0) > 0){
      const player = players?.get(record.attackerId);
      const damage = Math.max(0, Math.round(Number(poison.damagePerTick || 0)));
      const before = Math.max(0, Number(enemy.hp || 0));
      const dealt = Math.min(before, damage);
      enemy.hp = Math.max(0, before - dealt);
      enemy.recentHitTimer = Math.max(Number(enemy.recentHitTimer || 0), 4);
      if(player){
        markEnemyAttackedByPlayer(enemy, player.id, dealt, now);
        markFirmHitOwner(enemy, player);
      }
      if(dealt > 0) emitPoisonDamage({enemy, mapId, room, attackerId:record.attackerId, amount:dealt, now});
      poison.nextTickAt += Math.max(1, Number(poison.tickIntervalMs || 1_000));
      if(enemy.hp <= 0){
        handlePoisonDeath({record, enemy});
        delete enemy.shipPoison;
        poisonRecords.delete(key);
        break;
      }
    }
  }

  function updateShipAbilityEffects(now = Date.now()){
    for(const [id, entry] of activePulses){
      let cancelled = false;
      if(Number(entry.activePulseUntil || 0) >= now){
        if(!applyPoisonPulseArea(entry, now)){
          activePulses.delete(id);
          cancelled = true;
        }
      }
      if(cancelled) continue;
      while(entry.pulsesDone < entry.pulseCount && now >= entry.nextPulseAt){
        if(!startPoisonPulse(entry, now)){
          activePulses.delete(id);
          cancelled = true;
          break;
        }
        entry.nextPulseAt += entry.pulseIntervalMs;
      }
      if(!cancelled && entry.pulsesDone >= entry.pulseCount && now > Number(entry.activePulseUntil || 0)){
        activePulses.delete(id);
      }
    }
    for(const [key, record] of [...poisonRecords.entries()]){
      tickPoisonRecord(key, record, now);
    }
  }

  return {
    startShipAbilityEffect,
    updateShipAbilityEffects,
    activePulses,
    poisonRecords
  };
}
