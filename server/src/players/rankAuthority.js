import { calculateRankScore, getRankAssetPath, getRankById } from "../../../src/data/ranks.js";
import { applyCompetitiveRanks } from "./leaderboard.js";

function rowFor(key, profile){
  const player = profile?.player || {};
  const portals = Object.values(profile?.completedPortals || {}).reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
  return {key:String(key), name:String(player.name || "Pilote"),
    points:calculateRankScore(player, portals), level:Number(player.level || 1), kills:Number(player.totalKills || 0)};
}

function sameScore(a, b){
  return a && b && a.points === b.points && a.level === b.level && a.kills === b.kills && a.name === b.name;
}

export function createRankAuthority({profileManager, io = null, players = new Map(), now = Date.now, cacheMs = 1000}){
  let generatedAt = -Infinity;
  let assigned = new Map();
  let sourceRows = new Map();

  function refresh(){
    const previous = assigned;
    const rows = (profileManager.listProfileEntries?.() || []).map(({key, profile})=>rowFor(key, profile));
    generatedAt = now();
    sourceRows = new Map(rows.map(row=>[row.key, row]));
    assigned = new Map(applyCompetitiveRanks(rows).map(row=>[row.key, {
      source:"server", key:row.key, rankId:row.rankId, points:row.points,
      position:row.position, quota:row.rankQuota, competitive:row.competitiveRank, generatedAt
    }]));
    for(const player of players.values()){
      const key = profileManager.profileKeyForPlayer?.(player) || (player?.accountId ? `account:${player.accountId}` : "");
      const next = assigned.get(key);
      const old = previous.get(key);
      if(next && player.connected !== false && (next.rankId !== old?.rankId || next.position !== old?.position)){
        io?.to?.(player.id)?.emit?.("rank:updated", {...next});
      }
    }
  }

  function forKey(key, profile){
    if(!key) return null;
    const current = profile ? rowFor(key, profile) : null;
    if(now() - generatedAt >= cacheMs || !assigned.has(key) || (current && !sameScore(current, sourceRows.get(key)))) refresh();
    const rank = assigned.get(String(key));
    return rank ? {...rank} : null;
  }

  function forPlayer(player, profile){
    return forKey(profileManager.profileKeyForPlayer?.(player) || (player?.accountId ? `account:${player.accountId}` : ""), profile);
  }

  function decorateState(state, assignment){
    if(!state || !assignment) return state;
    const rank = getRankById(assignment.rankId);
    return {...state, rankId:rank.id, rankName:rank.name, rankAssetPath:getRankAssetPath(rank)};
  }

  return {forKey, forPlayer, decorateState};
}
