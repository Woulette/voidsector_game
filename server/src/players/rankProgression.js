import { calculateMonsterKillRankPoints, calculateRankScore } from "../../../src/data/ranks.js";

function completedPortalCount(completedPortals = {}){
  return Object.values(completedPortals || {}).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
}

export function updateRankScore(profile){
  if(!profile?.player) return 0;
  profile.player.rankScore = calculateRankScore(profile.player, completedPortalCount(profile.completedPortals));
  return profile.player.rankScore;
}

export function applyServerReputationFromXp(profile, xp, ratio = 0.1){
  if(!profile?.player) profile.player = {};
  const gain = Math.max(0, Math.round(Number(xp || 0) * Math.max(0, Number(ratio || 0))));
  if(gain <= 0) return 0;
  profile.player.reputation = Math.max(0, Number(profile.player.reputation || 0)) + gain;
  updateRankScore(profile);
  return gain;
}

export function registerServerMonsterKill(profile, {kind = "server_enemy", enemyLevel = 1, playerLevel = null} = {}){
  if(!profile?.player) profile.player = {};
  const cleanKind = String(kind || "server_enemy");
  const cleanPlayerLevel = Math.max(1, Number(playerLevel ?? profile.player.level ?? 1));
  const cleanEnemyLevel = Math.max(1, Number(enemyLevel || 1));
  const rankPoints = calculateMonsterKillRankPoints(cleanPlayerLevel, cleanEnemyLevel);
  profile.player.totalKills = Math.max(0, Number(profile.player.totalKills || 0)) + 1;
  profile.player.monsterRankPoints = Math.max(0, Number(profile.player.monsterRankPoints || 0)) + rankPoints;
  if(!profile.killStats || typeof profile.killStats !== "object" || Array.isArray(profile.killStats)) profile.killStats = {};
  profile.killStats[cleanKind] = Math.max(0, Number(profile.killStats[cleanKind] || 0)) + 1;
  if(!profile.rankKillStats || typeof profile.rankKillStats !== "object" || Array.isArray(profile.rankKillStats)) profile.rankKillStats = {};
  const current = profile.rankKillStats[cleanKind] || {};
  profile.rankKillStats[cleanKind] = {
    kills:Math.max(0, Number(current.kills || 0)) + 1,
    points:Math.max(0, Number(current.points || 0)) + rankPoints,
    lastEnemyLevel:cleanEnemyLevel,
    lastPlayerLevel:cleanPlayerLevel
  };
  updateRankScore(profile);
  return rankPoints;
}
