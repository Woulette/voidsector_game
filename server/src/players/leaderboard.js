import { normalizeFirmId } from "../../../src/data/firms.js";
import { calculateRankScore, getRankAssetPath, getRankById, getRankForScore, RANK_TABLE } from "../../../src/data/ranks.js";
import { buildPublicPlayerProfile } from "./publicProfile.js";

export const COMPETITIVE_RANK_RULES = [
  {id:"marechal", label:"Marechal", percentage:null, min:1, cap:1},
  {id:"general_armee", label:"General d'armee", percentage:0.004, min:1, cap:4},
  {id:"general_corps_armee", label:"General de corps d'armee", percentage:0.008, min:1, cap:8},
  {id:"general_division", label:"General de division", percentage:0.01, min:1, cap:12},
  {id:"general_brigade", label:"General de brigade", percentage:0.015, min:1, cap:20}
];

const FIRST_COMPETITIVE_RANK_INDEX = RANK_TABLE.findIndex(rank=>rank.id === "general_brigade");
const HIGHEST_THRESHOLD_ONLY_RANK = RANK_TABLE[Math.max(0, FIRST_COMPETITIVE_RANK_INDEX - 1)] || RANK_TABLE[0];

function completedPortalCount(completedPortals = {}){
  return Object.values(completedPortals || {}).reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
}

function cleanName(value){
  return String(value || "Pilote").trim().replace(/\s+/g, " ").slice(0, 24) || "Pilote";
}

function thresholdRankForUnassigned(score){
  const rank = getRankForScore(score);
  const index = RANK_TABLE.findIndex(entry=>entry.id === rank.id);
  if(index >= FIRST_COMPETITIVE_RANK_INDEX) return HIGHEST_THRESHOLD_ONLY_RANK;
  return rank;
}

export function getCompetitiveRankQuotas(playerCount = 0){
  const count = Math.max(0, Math.floor(Number(playerCount || 0)));
  return Object.fromEntries(COMPETITIVE_RANK_RULES.map(rule=>{
    if(count <= 0) return [rule.id, 0];
    const percentQuota = rule.percentage === null ? rule.min : Math.floor(count * rule.percentage);
    return [rule.id, Math.min(rule.cap, Math.max(rule.min, percentQuota))];
  }));
}

export function applyCompetitiveRanks(rows = []){
  const sorted = [...rows].sort((a, b)=>
    b.points - a.points
    || b.level - a.level
    || b.kills - a.kills
    || a.name.localeCompare(b.name)
    || a.key.localeCompare(b.key)
  );
  const quotas = getCompetitiveRankQuotas(sorted.length);
  const assignedRanks = new Map();

  for(const rule of COMPETITIVE_RANK_RULES){
    const quota = Math.max(0, Number(quotas[rule.id] || 0));
    if(!quota) continue;
    const rank = getRankById(rule.id);
    let assigned = 0;
    for(const row of sorted){
      if(assignedRanks.has(row.key)) continue;
      if(Number(row.points || 0) < Number(rank.score || 0)) break;
      assignedRanks.set(row.key, {
        ...rank,
        competitive:true,
        quota,
        rule:rule.id
      });
      assigned += 1;
      if(assigned >= quota) break;
    }
  }

  return sorted.map((row, index)=>{
    const rank = assignedRanks.get(row.key) || thresholdRankForUnassigned(row.points);
    return {
      ...row,
      position:index + 1,
      rankId:rank.id,
      grade:rank.name,
      competitiveRank:Boolean(rank.competitive),
      rankQuota:rank.quota || null
    };
  });
}

function buildRowFromEntry({key, profile}){
  if(!key || !profile || typeof profile !== "object") return null;
  const player = profile.player || {};
  const portalClears = completedPortalCount(profile.completedPortals);
  const points = Math.max(0, Math.floor(Number(calculateRankScore(player, portalClears) || 0)));
  return {
    key:String(key),
    id:String(key),
    name:cleanName(player.name || key),
    pilot:cleanName(player.name || key),
    firmId:normalizeFirmId(player.firmId || "astra"),
    level:Math.max(1, Math.floor(Number(player.level || 1))),
    kills:Math.max(0, Math.floor(Number(player.totalKills || 0))),
    playerKills:Math.max(0, Math.floor(Number(player.totalPlayerKills || 0))),
    portals:portalClears,
    points,
    profile
  };
}

export function buildGlobalLeaderboardSnapshot({profileEntries = [], currentKey = ""} = {}){
  const baseRows = (Array.isArray(profileEntries) ? profileEntries : [])
    .map(buildRowFromEntry)
    .filter(Boolean);
  const rows = applyCompetitiveRanks(baseRows).map(row=>{
    const ranking = {
      key:row.key,
      name:row.name,
      firmId:row.firmId,
      rank:row.position,
      displayRank:row.position,
      points:row.points
    };
    const rank = getRankById(row.rankId);
    const publicProfile = buildPublicPlayerProfile({key:row.key, profile:row.profile, ranking});
    if(publicProfile){
      publicProfile.sourceLabel = "Profil MMO";
      publicProfile.rank = {
        id:rank.id,
        name:rank.name,
        score:row.points,
        asset:getRankAssetPath(rank)
      };
      publicProfile.ranking = {
        rank:row.position,
        displayRank:row.position,
        contribution:row.points
      };
    }
    const {profile, ...publicRow} = row;
    return {
      ...publicRow,
      publicProfile,
      isPlayer:Boolean(currentKey && row.key === currentKey)
    };
  });

  return {
    generatedAt:Date.now(),
    source:"server",
    playerCount:rows.length,
    rules:{
      competitiveRanks:true,
      quotas:getCompetitiveRankQuotas(rows.length)
    },
    rows
  };
}

export function buildGlobalLeaderboardSnapshotFromManager(profileManager, options = {}){
  return buildGlobalLeaderboardSnapshot({
    profileEntries:profileManager?.listProfileEntries?.() || [],
    currentKey:options.currentKey || ""
  });
}
