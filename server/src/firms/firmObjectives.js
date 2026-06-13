import { normalizeFirmId } from "../../../src/data/firms.js";
import { FIRM_PERSONAL_SEASON_OBJECTIVES, firmTargetMatches } from "./firmRules.js";
import { addFirmContribution, queueFirmPendingReward } from "./firmSeason.js";

function ensureSeasonObjectiveState(state){
  if(!state.seasonObjectives || typeof state.seasonObjectives !== "object" || Array.isArray(state.seasonObjectives)) state.seasonObjectives = {};
  return state.seasonObjectives;
}

function ensurePlayerObjectiveState(state, playerKey){
  const objectives = ensureSeasonObjectiveState(state);
  const key = String(playerKey || "");
  if(!key) return null;
  if(!objectives[key] || typeof objectives[key] !== "object" || Array.isArray(objectives[key])) objectives[key] = {};
  return objectives[key];
}

function objectiveMatches(definition, type, target){
  if(definition.type !== type) return false;
  return firmTargetMatches(definition.target, target);
}

function cleanObjectiveProgress(entry = {}){
  return {
    progress:Math.max(0, Math.floor(Number(entry.progress || 0))),
    completedAt:Math.max(0, Number(entry.completedAt || 0)),
    rewardQueuedAt:Math.max(0, Number(entry.rewardQueuedAt || 0))
  };
}

export function recordFirmSeasonObjectiveProgress(state, {contributor, type, target, amount = 1, now = Date.now()} = {}){
  const key = String(contributor?.key || "");
  if(!key) return [];
  const value = Math.max(0, Math.floor(Number(amount || 0)));
  if(!value) return [];
  const firmId = normalizeFirmId(contributor?.firmId || "astra");
  const playerObjectives = ensurePlayerObjectiveState(state, key);
  const updates = [];
  for(const definition of FIRM_PERSONAL_SEASON_OBJECTIVES){
    if(!objectiveMatches(definition, type, target)) continue;
    const current = cleanObjectiveProgress(playerObjectives[definition.id]);
    if(current.completedAt){
      playerObjectives[definition.id] = current;
      continue;
    }
    current.progress = Math.min(Number(definition.goal || 1), current.progress + value);
    if(current.progress >= Number(definition.goal || 1)){
      current.completedAt = now;
      current.rewardQueuedAt = now;
      addFirmContribution(state, {
        key,
        name:contributor?.name || "Pilote",
        firmId
      }, definition.firmPoints);
      queueFirmPendingReward(state, key, {
        id:`season-objective-${state.seasonStartedAt}-${definition.id}-${key}`,
        source:"season-objective",
        label:`Objectif saisonnier - ${definition.label}`,
        reward:definition.reward,
        createdAt:now
      });
    }
    playerObjectives[definition.id] = current;
    updates.push({
      objectiveId:definition.id,
      progress:current.progress,
      goal:Number(definition.goal || 1),
      completedAt:current.completedAt
    });
  }
  return updates;
}

export function buildFirmSeasonObjectiveSnapshot(state, playerKey, playerFirmId){
  const key = String(playerKey || "");
  const firmId = normalizeFirmId(playerFirmId || "astra");
  const playerObjectives = key ? ensurePlayerObjectiveState(state, key) || {} : {};
  return FIRM_PERSONAL_SEASON_OBJECTIVES.map(definition=>{
    const progress = cleanObjectiveProgress(playerObjectives[definition.id]);
    return {
      id:definition.id,
      kind:"personal-season",
      label:definition.label,
      description:definition.description,
      type:definition.type,
      target:definition.target,
      targetLabel:definition.targetLabel,
      goal:Number(definition.goal || 1),
      progress:Math.min(Number(definition.goal || 1), progress.progress),
      completedAt:progress.completedAt,
      rewardQueuedAt:progress.rewardQueuedAt,
      firmId,
      firmPoints:Math.max(0, Math.floor(Number(definition.firmPoints || 0))),
      reward:JSON.parse(JSON.stringify(definition.reward || {}))
    };
  });
}
