import {
  RANK_TABLE,
  RANK_POINT_RULES,
  LOCAL_LEADERBOARD_PREVIEW,
  buildLeaderboardRows,
  buildRankBreakdown,
  calculateMonsterKillRankPoints,
  calculateMonsterRankPointsForKills,
  calculateRankScore,
  getMonsterRankPointRule,
  getNextRankForScore,
  getRankAssetPath,
  getRankById,
  getRankForScore as findRankForScore,
  getRankProgressForScore
} from "../data/ranks.js";
import { getCompletedPortalCount, store } from "./store.js";

export { RANK_TABLE, RANK_POINT_RULES, LOCAL_LEADERBOARD_PREVIEW, calculateMonsterKillRankPoints, calculateMonsterRankPointsForKills, getMonsterRankPointRule, getRankAssetPath, getRankById };
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

function recalculateLocalMonsterRankPoints(){
  const player = store.state.player;
  if(!store.state.killStats || typeof store.state.killStats !== "object") store.state.killStats = {};
  if(!store.state.rankKillStats || typeof store.state.rankKillStats !== "object") store.state.rankKillStats = {};
  const kinds = new Set([...Object.keys(store.state.killStats), ...Object.keys(store.state.rankKillStats)]);
  let total = 0;
  for(const kind of kinds){
    const current = store.state.rankKillStats[kind];
    const kills = Math.max(
      0,
      Math.floor(Number(store.state.killStats[kind] || 0)),
      Math.floor(Number(current?.kills || 0))
    );
    const points = calculateMonsterRankPointsForKills(kind, kills);
    store.state.killStats[kind] = kills;
    store.state.rankKillStats[kind] = {kills, points};
    total += points;
  }
  player.monsterRankPoints = total;
  return total;
}

export function registerKill(kind){
  const player = store.state.player;
  const key = kind || "unknown";
  const previousPoints = recalculateLocalMonsterRankPoints();
  player.totalKills = Math.max(0, Number(player.totalKills || 0)) + 1;
  store.state.killStats[key] = Math.max(0, Number(store.state.killStats[key] || 0)) + 1;
  const current = store.state.rankKillStats[key] || {};
  store.state.rankKillStats[key] = {
    kills:Math.max(0, Number(current.kills || 0)) + 1,
    points:Math.max(0, Number(current.points || 0))
  };
  recalculateLocalMonsterRankPoints();
  player.rankScore = getRankScore();
  return Math.max(0, player.monsterRankPoints - previousPoints);
}

