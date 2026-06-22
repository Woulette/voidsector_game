import { normalizeFirmId } from "../../../src/data/firms.js";
import { FIRM_PERSONAL_SEASON_OBJECTIVES, firmTargetMatches } from "./firmRules.js";
import { addFirmContribution } from "./firmSeason.js";

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
    rewardQueuedAt:Math.max(0, Number(entry.rewardQueuedAt || 0)),
    claimedAt:Math.max(0, Number(entry.claimedAt || 0))
  };
}

function objectiveRewardId(state, objectiveId, playerKey){
  return `season-objective-${state.seasonStartedAt}-${objectiveId}-${playerKey}`;
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
      addFirmContribution(state, {
        key,
        name:contributor?.name || "Pilote",
        firmId
      }, definition.firmPoints);
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

export function claimFirmSeasonObjectiveReward(state, {
  objectiveId,
  contributor,
  claimedRewardIds = [],
  now = Date.now()
} = {}){
  const key = String(contributor?.key || "");
  const definition = FIRM_PERSONAL_SEASON_OBJECTIVES.find(entry=>entry.id === String(objectiveId || ""));
  const playerObjectives = key ? ensurePlayerObjectiveState(state, key) : null;
  const current = cleanObjectiveProgress(playerObjectives?.[definition?.id]);
  if(!definition || !playerObjectives) return {ok:false, reason:"Objectif saisonnier introuvable."};
  if(!current.completedAt) return {ok:false, reason:"Cet objectif saisonnier n'est pas terminé."};
  const rewardId = objectiveRewardId(state, definition.id, key);
  if(current.claimedAt || new Set(claimedRewardIds.map(String)).has(rewardId)){
    current.claimedAt = current.claimedAt || current.rewardQueuedAt || now;
    playerObjectives[definition.id] = current;
    return {ok:false, reason:"Récompense saisonnière déjà récupérée."};
  }
  current.claimedAt = now;
  playerObjectives[definition.id] = current;
  if(Array.isArray(state.pendingRewards?.[key])){
    state.pendingRewards[key] = state.pendingRewards[key].filter(entry=>String(entry?.id || "") !== rewardId);
    if(!state.pendingRewards[key].length) delete state.pendingRewards[key];
  }
  return {
    ok:true,
    questId:definition.id,
    objectiveId:definition.id,
    label:`Objectif saisonnier - ${definition.label}`,
    rewardId,
    reward:JSON.parse(JSON.stringify(definition.reward || {})),
    claimedAt:now
  };
}

export function buildFirmSeasonObjectiveSnapshot(state, playerKey, playerFirmId, claimedRewardIds = []){
  const key = String(playerKey || "");
  const firmId = normalizeFirmId(playerFirmId || "astra");
  const playerObjectives = key ? ensurePlayerObjectiveState(state, key) || {} : {};
  const claimedIds = new Set(claimedRewardIds.map(String));
  return FIRM_PERSONAL_SEASON_OBJECTIVES.map(definition=>{
    const progress = cleanObjectiveProgress(playerObjectives[definition.id]);
    const legacyClaimed = claimedIds.has(objectiveRewardId(state, definition.id, key));
    const claimedAt = progress.claimedAt || (legacyClaimed ? progress.rewardQueuedAt || progress.completedAt : 0);
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
      claimedAt,
      claimable:Boolean(key && progress.completedAt && !claimedAt),
      claimed:Boolean(claimedAt),
      firmId,
      firmPoints:Math.max(0, Math.floor(Number(definition.firmPoints || 0))),
      reward:JSON.parse(JSON.stringify(definition.reward || {}))
    };
  });
}
