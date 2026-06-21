import { calculateMonsterRankPointsForKills, calculateRankScore } from "../../../src/data/ranks.js";

function completedPortalCount(completedPortals = {}){
  return Object.values(completedPortals || {}).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
}

export function updateRankScore(profile){
  if(!profile?.player) return 0;
  recalculateMonsterRankPoints(profile);
  profile.player.rankScore = calculateRankScore(profile.player, completedPortalCount(profile.completedPortals));
  return profile.player.rankScore;
}

export function recalculateMonsterRankPoints(profile){
  if(!profile?.player) profile.player = {};
  if(!profile.killStats || typeof profile.killStats !== "object" || Array.isArray(profile.killStats)) profile.killStats = {};
  if(!profile.rankKillStats || typeof profile.rankKillStats !== "object" || Array.isArray(profile.rankKillStats)) profile.rankKillStats = {};
  const kinds = new Set([...Object.keys(profile.killStats), ...Object.keys(profile.rankKillStats)]);
  let total = 0;
  for(const kind of kinds){
    const current = profile.rankKillStats[kind];
    const kills = Math.max(
      0,
      Math.floor(Number(profile.killStats[kind] || 0)),
      Math.floor(Number(current?.kills || 0))
    );
    const points = calculateMonsterRankPointsForKills(kind, kills);
    profile.killStats[kind] = kills;
    profile.rankKillStats[kind] = {kills, points};
    total += points;
  }
  profile.player.monsterRankPoints = total;
  return total;
}

export function applyServerReputationFromXp(profile, xp, ratio = 0.1){
  if(!profile?.player) profile.player = {};
  const gain = Math.max(0, Math.round(Number(xp || 0) * Math.max(0, Number(ratio || 0))));
  if(gain <= 0) return 0;
  profile.player.reputation = Math.max(0, Number(profile.player.reputation || 0)) + gain;
  updateRankScore(profile);
  return gain;
}

export function registerServerMonsterKill(profile, {kind = "server_enemy"} = {}){
  if(!profile?.player) profile.player = {};
  const cleanKind = String(kind || "server_enemy");
  const previousPoints = recalculateMonsterRankPoints(profile);
  profile.player.totalKills = Math.max(0, Number(profile.player.totalKills || 0)) + 1;
  profile.killStats[cleanKind] = Math.max(0, Number(profile.killStats[cleanKind] || 0)) + 1;
  const current = profile.rankKillStats[cleanKind] || {};
  profile.rankKillStats[cleanKind] = {
    kills:Math.max(0, Number(current.kills || 0)) + 1,
    points:Math.max(0, Number(current.points || 0))
  };
  updateRankScore(profile);
  return Math.max(0, profile.player.monsterRankPoints - previousPoints);
}
