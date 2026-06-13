import { FIRMS, normalizeFirmId } from "../../../src/data/firms.js";
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
    label:String(entry.label || "Recompense de firme"),
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

export function buildInitialFirmState(now = Date.now()){
  return {
    version:3,
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
    version:3,
    seasonStartedAt:Number.isFinite(Number(source.seasonStartedAt)) ? Number(source.seasonStartedAt) : base.seasonStartedAt,
    seasonEndsAt:Number.isFinite(Number(source.seasonEndsAt)) ? Number(source.seasonEndsAt) : base.seasonEndsAt,
    points:sanitizeFirmPoints(source.points),
    contributions:sanitizeFirmContributions(source.contributions),
    rewards:source.rewards && typeof source.rewards === "object" && !Array.isArray(source.rewards) ? source.rewards : {},
    pendingRewards:sanitizeFirmPendingRewards(source.pendingRewards),
    dailyQuests:source.dailyQuests && typeof source.dailyQuests === "object" && !Array.isArray(source.dailyQuests) ? source.dailyQuests : {},
    seasonalQuests:source.seasonalQuests && typeof source.seasonalQuests === "object" && !Array.isArray(source.seasonalQuests) ? source.seasonalQuests : {},
    seasonObjectives:source.seasonObjectives && typeof source.seasonObjectives === "object" && !Array.isArray(source.seasonObjectives) ? source.seasonObjectives : {},
    pvpDaily:source.pvpDaily && typeof source.pvpDaily === "object" && !Array.isArray(source.pvpDaily) ? source.pvpDaily : base.pvpDaily,
    lastClosedSeason:source.lastClosedSeason || null
  };
}
