import { RANK_TABLE } from "../data/ranks.js";

let assignment = null;
let accountKey = "";

export function clearServerRankAssignment(){ assignment = null; accountKey = ""; }

export function setServerRankAssignment(value, key = accountKey){
  const incomingKey = String(key || value?.key || "");
  if(accountKey && incomingKey !== accountKey) assignment = null;
  accountKey = incomingKey;
  if(value?.source !== "server" || value.key !== accountKey || !RANK_TABLE.some(rank=>rank.id === value.rankId)) return;
  if(assignment && Number(value.generatedAt || 0) < Number(assignment.generatedAt || 0)) return;
  assignment = {...value};
}

export function setServerRankSnapshot(snapshot, accountId){
  const key = accountId ? `account:${accountId}` : accountKey;
  if(accountKey && key !== accountKey) assignment = null;
  accountKey = key;
  if(snapshot?.source !== "server" || !key) return;
  const row = Array.isArray(snapshot.rows) ? snapshot.rows.find(entry=>String(entry.key || entry.id || "") === key) : null;
  if(!row) return;
  setServerRankAssignment({source:"server", key, rankId:row.rankId, points:row.points,
    position:row.position, quota:row.rankQuota, competitive:row.competitiveRank,
    generatedAt:snapshot.generatedAt}, key);
}

export function getServerRankAssignment(key = accountKey){
  return assignment && assignment.key === key ? {...assignment} : null;
}
