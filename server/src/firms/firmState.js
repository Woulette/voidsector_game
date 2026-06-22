import { FIRMS, normalizeFirmId } from "../../../src/data/firms.js";
import { getFirmBoostersForRank, sanitizeFirmBoosters } from "../../../src/shared/firmBoosters.js";
import { FIRM_SEASON_MS } from "./firmRules.js";

export function emptyFirmPoints(){
  return Object.fromEntries(FIRMS.map(firm=>[firm.id, 0]));
}

export function sanitizeFirmPoints(points = {}){
  const next = emptyFirmPoints();
  for(const firm of FIRMS) next[firm.id] = Math.max(0, Math.floor(Number(points?.[firm.id] || 0)));
  return next;
}

function sanitizeContribution(entry = {}, key = ""){
  return {
    key:String(entry.key || key),
    name:String(entry.name || "Pilote").trim().slice(0, 24) || "Pilote",
    firmId:normalizeFirmId(entry.firmId || "astra"),
    points:Math.max(0, Math.floor(Number(entry.points || 0)))
  };
}

export function sanitizeFirmContributions(contributions = {}){
  if(!contributions || typeof contributions !== "object" || Array.isArray(contributions)) return {};
  return Object.fromEntries(Object.entries(contributions)
    .map(([key, entry])=>[String(key), sanitizeContribution(entry, key)])
    .filter(([key])=>Boolean(key)));
}

function sanitizePendingReward(entry = {}){
  return {
    id:String(entry.id || `firm-reward-${Date.now()}`),
    source:String(entry.source || "firm"),
    label:String(entry.label || "Récompense de firme"),
    reward:entry.reward && typeof entry.reward === "object" && !Array.isArray(entry.reward)
      ? JSON.parse(JSON.stringify(entry.reward))
      : {},
    createdAt:Math.max(0, Number(entry.createdAt || Date.now()))
  };
}

export function sanitizeFirmPendingRewards(value = {}){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entries])=>[
    String(key),
    (Array.isArray(entries) ? entries : []).map(sanitizePendingReward).slice(-100)
  ]));
}

function sanitizeSeasonEligiblePlayers(value = {}){
  if(Array.isArray(value)) return Object.fromEntries(value.map(key=>[String(key || ""), true]).filter(([key])=>Boolean(key)));
  if(!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value)
    .map(([key, eligible])=>[String(key || ""), eligible === true])
    .filter(([key, eligible])=>Boolean(key) && eligible));
}

function legacySeasonEligiblePlayers(lastClosedSeason, firmId){
  return Object.fromEntries((Array.isArray(lastClosedSeason?.individualRanking) ? lastClosedSeason.individualRanking : [])
    .filter(entry=>normalizeFirmId(entry?.firmId || "astra") === normalizeFirmId(firmId) && entry?.key)
    .map(entry=>[String(entry.key), true]));
}

function sanitizeFirmSeasonRewards(value = {}, lastClosedSeason = null){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([firmId, reward])=>{
    const rank = Math.max(1, Math.min(4, Math.floor(Number(reward?.rank || 4))));
    const storedBoosters = sanitizeFirmBoosters(reward?.boosters);
    const eligiblePlayers = Object.hasOwn(reward || {}, "eligiblePlayers")
      ? sanitizeSeasonEligiblePlayers(reward?.eligiblePlayers)
      : legacySeasonEligiblePlayers(lastClosedSeason, firmId);
    return [normalizeFirmId(firmId), {
      rank,
      boosters:Object.keys(storedBoosters).length ? storedBoosters : getFirmBoostersForRank(rank),
      endsAt:Math.max(0, Number(reward?.endsAt || 0)),
      eligiblePlayers
    }];
  }));
}

export function buildInitialFirmState(now = Date.now()){
  return {
    version:5,
    seasonStartedAt:now,
    seasonEndsAt:now + FIRM_SEASON_MS,
    points:emptyFirmPoints(),
    contributions:{},
    rewards:{},
    pendingRewards:{},
    dailyQuests:{},
    seasonalQuests:{},
    seasonObjectives:{},
    pvpDaily:{dayKey:"", kills:{}},
    lastClosedSeason:null
  };
}

export function sanitizeFirmState(value = {}, now = Date.now()){
  const base = buildInitialFirmState(now);
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...base,
    ...source,
    version:5,
    seasonStartedAt:Number.isFinite(Number(source.seasonStartedAt)) ? Number(source.seasonStartedAt) : base.seasonStartedAt,
    seasonEndsAt:Number.isFinite(Number(source.seasonEndsAt)) ? Number(source.seasonEndsAt) : base.seasonEndsAt,
    points:sanitizeFirmPoints(source.points),
    contributions:sanitizeFirmContributions(source.contributions),
    rewards:sanitizeFirmSeasonRewards(source.rewards, source.lastClosedSeason),
    pendingRewards:sanitizeFirmPendingRewards(source.pendingRewards),
    dailyQuests:source.dailyQuests && typeof source.dailyQuests === "object" && !Array.isArray(source.dailyQuests) ? source.dailyQuests : {},
    seasonalQuests:source.seasonalQuests && typeof source.seasonalQuests === "object" && !Array.isArray(source.seasonalQuests) ? source.seasonalQuests : {},
    seasonObjectives:source.seasonObjectives && typeof source.seasonObjectives === "object" && !Array.isArray(source.seasonObjectives) ? source.seasonObjectives : {},
    pvpDaily:source.pvpDaily && typeof source.pvpDaily === "object" && !Array.isArray(source.pvpDaily) ? source.pvpDaily : base.pvpDaily,
    lastClosedSeason:source.lastClosedSeason || null
  };
}
