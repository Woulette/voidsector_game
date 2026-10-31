import { RANK_TABLE, getRankById } from "../data/ranks.js";

export function getAssignedRankProgress(score, rankId){
  const current = getRankById(rankId);
  const index = RANK_TABLE.findIndex(rank=>rank.id === current.id);
  const next = RANK_TABLE[index + 1] || null;
  if(!next) return {score, current, next:null, progress:100, remaining:0, placementRequired:false};
  const remaining = Math.max(0, next.score - score);
  const span = Math.max(1, next.score - current.score);
  return {score, current, next, progress:Math.max(0, Math.min(100, (score - current.score) / span * 100)),
    remaining, placementRequired:index + 1 >= RANK_TABLE.findIndex(rank=>rank.id === "general_brigade")};
}
