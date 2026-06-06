import { WORLD_ENEMY_SAFE_ZONE_RETALIATION_MS } from "./constants.js";

function cleanPlayerId(playerOrId){
  return String(typeof playerOrId === "object" ? playerOrId?.id : playerOrId || "");
}

export function markEnemyAttackedByPlayer(enemy, playerOrId, now = Date.now()){
  if(!enemy) return;
  const playerId = cleanPlayerId(playerOrId);
  if(!playerId) return;
  enemy.attackedPlayerId = playerId;
  enemy.attackedPlayerLastAt = now;
  enemy.lockedPlayerId = playerId;
  enemy.lockedPlayerLastSeenAt = now;
  enemy.aiDecision = null;
  enemy.nextAiDecisionAt = 0;
}

export function isEnemyRetaliatingAgainstPlayer(enemy, playerOrId, now = Date.now()){
  if(!enemy) return false;
  const playerId = cleanPlayerId(playerOrId);
  if(!playerId || enemy.attackedPlayerId !== playerId) return false;
  return now - Number(enemy.attackedPlayerLastAt || 0) <= WORLD_ENEMY_SAFE_ZONE_RETALIATION_MS;
}

export function canEnemyTargetPlayerInSafeZone({enemy, player, map, now = Date.now(), isPlayerSafeOnMap}){
  if(!player?.state) return false;
  const isSafe = Boolean(isPlayerSafeOnMap?.(player, map));
  if(!isSafe) return true;
  return isEnemyRetaliatingAgainstPlayer(enemy, player, now);
}
