import { FIRMS, getFirmDefinition, normalizeFirmId } from "../../../src/data/firms.js";
import {
  FIRM_COLLECTIVE_MIN_CONTRIBUTION,
  FIRM_RANK_BONUSES,
  FIRM_REWARD_MS,
  FIRM_SEASON_MS,
  getFirmCollectiveReward,
  getFirmIndividualReward
} from "./firmRules.js";

export function sortFirmRanking(points = {}){
  return FIRMS
    .map(firm=>({firm, points:Math.max(0, Math.floor(Number(points?.[firm.id] || 0)))}))
    .sort((a, b)=>b.points - a.points || a.firm.label.localeCompare(b.firm.label, "fr"));
}

export function sortIndividualRanking(contributions = {}){
  return Object.values(contributions || {})
    .filter(entry=>entry && Number(entry.points || 0) > 0)
    .map(entry=>({
      key:String(entry.key || ""),
      name:String(entry.name || "Pilote"),
      firmId:normalizeFirmId(entry.firmId || "astra"),
      points:Math.max(0, Math.floor(Number(entry.points || 0)))
    }))
    .sort((a, b)=>b.points - a.points || a.name.localeCompare(b.name, "fr"))
    .map((entry, index)=>({...entry, rank:index + 1}));
}

export function addFirmContribution(state, contributor, points = 1){
  const value = Math.max(0, Math.floor(Number(points || 0)));
  const firmId = normalizeFirmId(contributor?.firmId || contributor || "astra");
  if(!value) return null;
  state.points[firmId] = Math.max(0, Math.floor(Number(state.points?.[firmId] || 0))) + value;
  const key = String(contributor?.key || "");
  if(!key) return null;
  const current = state.contributions[key] || {};
  state.contributions[key] = {
    key,
    name:String(contributor?.name || current.name || "Pilote").trim().slice(0, 24) || "Pilote",
    firmId,
    points:Math.max(0, Math.floor(Number(current.points || 0))) + value
  };
  return state.contributions[key];
}

export function queueFirmPendingReward(state, playerKey, entry){
  const key = String(playerKey || "");
  if(!key || !entry?.reward) return null;
  if(!Array.isArray(state.pendingRewards[key])) state.pendingRewards[key] = [];
  const queued = {
    id:String(entry.id || `firm-reward-${Date.now()}`),
    source:String(entry.source || "firm"),
    label:String(entry.label || "Récompense de firme"),
    reward:JSON.parse(JSON.stringify(entry.reward || {})),
    createdAt:Math.max(0, Number(entry.createdAt || Date.now()))
  };
  state.pendingRewards[key].push(queued);
  if(state.pendingRewards[key].length > 100) state.pendingRewards[key].splice(0, state.pendingRewards[key].length - 100);
  return queued;
}

export function closeFirmSeason(state, currentTime = Date.now()){
  const firmRanking = sortFirmRanking(state.points);
  const individualRanking = sortIndividualRanking(state.contributions);
  const rewards = {};
  firmRanking.forEach((entry, index)=>{
    const rank = index + 1;
    rewards[entry.firm.id] = {
      rank,
      multiplier:FIRM_RANK_BONUSES[index] || 0,
      endsAt:currentTime + FIRM_REWARD_MS
    };
  });
  for(const player of individualRanking){
    const individual = getFirmIndividualReward(player.rank, individualRanking.length);
    queueFirmPendingReward(state, player.key, {
      id:`season-individual-${state.seasonStartedAt}-${player.key}`,
      source:"season-individual",
      label:`Saison individuelle - ${individual.label}`,
      reward:individual.reward,
      createdAt:currentTime
    });
    const firmRank = firmRanking.findIndex(entry=>entry.firm.id === player.firmId) + 1;
    if(player.points >= FIRM_COLLECTIVE_MIN_CONTRIBUTION && firmRank > 0){
      queueFirmPendingReward(state, player.key, {
        id:`season-collective-${state.seasonStartedAt}-${player.key}`,
        source:"season-collective",
        label:`Récompense collective - ${getFirmDefinition(player.firmId).label} Top ${firmRank}`,
        reward:getFirmCollectiveReward(firmRank),
        createdAt:currentTime
      });
    }
  }
  state.lastClosedSeason = {
    startedAt:state.seasonStartedAt,
    closedAt:currentTime,
    firmRanking:firmRanking.map((entry, index)=>({
      firmId:entry.firm.id,
      rank:index + 1,
      points:entry.points
    })),
    individualRanking:individualRanking.slice(0, 100).map(entry=>({
      key:entry.key,
      name:entry.name,
      firmId:entry.firmId,
      rank:entry.rank,
      points:entry.points,
      rewardLabel:getFirmIndividualReward(entry.rank, individualRanking.length).label,
      collectiveEligible:entry.points >= FIRM_COLLECTIVE_MIN_CONTRIBUTION
    }))
  };
  state.rewards = rewards;
  state.seasonStartedAt = currentTime;
  state.seasonEndsAt = currentTime + FIRM_SEASON_MS;
  state.points = Object.fromEntries(FIRMS.map(firm=>[firm.id, 0]));
  state.contributions = {};
  state.dailyQuests = {};
  state.seasonalQuests = {};
  state.seasonObjectives = {};
  return state.lastClosedSeason;
}

export function buildFirmPublicRanking(state, currentTime = Date.now()){
  const rewardRanks = state.rewards || {};
  return sortFirmRanking(state.points).map((entry, index)=>{
    const reward = rewardRanks[entry.firm.id] || {};
    return {
      id:entry.firm.id,
      label:getFirmDefinition(entry.firm.id).label,
      color:entry.firm.color,
      homeMapName:entry.firm.homeMapName,
      rank:index + 1,
      points:entry.points,
      rewardRank:reward.rank || null,
      rewardMultiplier:Number(reward.multiplier || 0),
      rewardEndsAt:Number(reward.endsAt || 0),
      collectiveReward:getFirmCollectiveReward(index + 1)
    };
  });
}

export function buildIndividualPublicRanking(state){
  const ranking = sortIndividualRanking(state.contributions);
  return ranking.slice(0, 100).map(entry=>{
    const reward = getFirmIndividualReward(entry.rank, ranking.length);
    return {
      key:entry.key,
      name:entry.name,
      firmId:entry.firmId,
      rank:entry.rank,
      points:entry.points,
      rewardLabel:reward.label,
      reward:reward.reward,
      collectiveEligible:entry.points >= FIRM_COLLECTIVE_MIN_CONTRIBUTION
    };
  });
}
