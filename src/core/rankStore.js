import {
  RANK_TABLE,
  RANK_POINT_RULES,
  LOCAL_LEADERBOARD_PREVIEW,
  buildLeaderboardRows,
  buildRankBreakdown,
  calculateRankScore,
  getNextRankForScore,
  getRankAssetPath,
  getRankById,
  getRankForScore as findRankForScore,
  getRankProgressForScore
} from "../data/ranks.js";
import { getCompletedPortalCount, store } from "./store.js";

export { RANK_TABLE, RANK_POINT_RULES, LOCAL_LEADERBOARD_PREVIEW, getRankAssetPath, getRankById };
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

export function registerKill(kind){
  const player = store.state.player;
  player.totalKills = Math.max(0, Number(player.totalKills || 0)) + 1;
  if(!store.state.killStats || typeof store.state.killStats !== "object") store.state.killStats = {};
  store.state.killStats[kind || "unknown"] = Math.max(0, Number(store.state.killStats[kind || "unknown"] || 0)) + 1;
  player.rankScore = getRankScore();
}

