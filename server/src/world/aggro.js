import { WORLD_ENEMY_SAFE_ZONE_RETALIATION_MS } from "./constants.js";

export const ENEMY_THREAT_RECALC_MS = 10000;

function cleanPlayerId(playerOrId){
  return String(typeof playerOrId === "object" ? playerOrId?.id : playerOrId || "");
}

function getThreatEntries(enemy){
  if(!enemy?.damageThreat || typeof enemy.damageThreat !== "object" || Array.isArray(enemy.damageThreat)){
    enemy.damageThreat = {};
  }
  return enemy.damageThreat;
}

export function pickEnemyThreatTarget(enemy, allowedPlayerIds = null){
  const allowed = allowedPlayerIds ? new Set([...allowedPlayerIds].map(String)) : null;
  return Object.entries(getThreatEntries(enemy))
    .filter(([playerId])=>!allowed || allowed.has(playerId))
    .sort((a, b)=>Number(b[1] || 0) - Number(a[1] || 0))[0]?.[0] || null;
}

export function markEnemyAttackedByPlayer(enemy, playerOrId, damage = 0, now = Date.now()){
  if(!enemy) return;
  const playerId = cleanPlayerId(playerOrId);
  if(!playerId) return;
  const threat = getThreatEntries(enemy);
  threat[playerId] = Number(threat[playerId] || 0) + Math.max(0, Number(damage || 0));
  enemy.attackedPlayerId = playerId;
  enemy.attackedPlayerLastAt = now;
  if(!enemy.lockedPlayerId){
    enemy.lockedPlayerId = playerId;
    enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
  }else if(now >= Number(enemy.threatRecalcAt || 0)){
    enemy.lockedPlayerId = pickEnemyThreatTarget(enemy) || enemy.lockedPlayerId;
    enemy.threatRecalcAt = now + ENEMY_THREAT_RECALC_MS;
  }
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
