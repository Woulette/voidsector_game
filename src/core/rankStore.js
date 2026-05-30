import {
  RANK_TABLE,
  RANK_POINT_RULES,
  LOCAL_LEADERBOARD_PREVIEW,
  buildLeaderboardRows,
  buildRankBreakdown,
  calculateMonsterKillRankPoints,
  calculateRankScore,
  getNextRankForScore,
  getRankAssetPath,
  getRankById,
  getRankForScore as findRankForScore,
  getRankProgressForScore
} from "../data/ranks.js";
import { getCompletedPortalCount, store } from "./store.js";

export { RANK_TABLE, RANK_POINT_RULES, LOCAL_LEADERBOARD_PREVIEW, calculateMonsterKillRankPoints, getRankAssetPath, getRankById };
export function getRankForScore(score){
  return findRankForScore(score);
}

export function getRankScore(){
  return calculateRankScore(store.state.player || {}, getCompletedPortalCount());
}

export function getRankBreakdown(){
  return buildRankBreakdown(store.state.player || {}, getCompletedPortalCount());
}

export function getCurrentRank(){
  return getRankForScore(getRankScore());
}

export function getNextRank(){
  return getNextRankForScore(getRankScore());
}

export function getRankProgress(){
  return getRankProgressForScore(getRankScore());
}

export function getLeaderboardRows(){
  return buildLeaderboardRows(store.state.player || {}, getCompletedPortalCount())
    .sort((a,b)=>b.points - a.points || b.level - a.level || a.pilot.localeCompare(b.pilot))
    .map((row,index)=>({...row, position:index+1}));
}

export function registerKill(kind, enemyLevel=null, playerLevel=null){
  const player = store.state.player;
  const key = kind || "unknown";
  const rankPoints = calculateMonsterKillRankPoints(playerLevel ?? player.level, enemyLevel ?? player.level);
  player.totalKills = Math.max(0, Number(player.totalKills || 0)) + 1;
  player.monsterRankPoints = Math.max(0, Number(player.monsterRankPoints || 0)) + rankPoints;
  if(!store.state.killStats || typeof store.state.killStats !== "object") store.state.killStats = {};
  store.state.killStats[key] = Math.max(0, Number(store.state.killStats[key] || 0)) + 1;
  if(!store.state.rankKillStats || typeof store.state.rankKillStats !== "object") store.state.rankKillStats = {};
  const current = store.state.rankKillStats[key] || {};
  store.state.rankKillStats[key] = {
    kills:Math.max(0, Number(current.kills || 0)) + 1,
    points:Math.max(0, Number(current.points || 0)) + rankPoints,
    lastEnemyLevel:Math.max(1, Number(enemyLevel || 1)),
    lastPlayerLevel:Math.max(1, Number(playerLevel ?? player.level ?? 1))
  };
  player.rankScore = getRankScore();
  return rankPoints;
}

