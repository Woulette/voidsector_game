import { addMaterial } from "./cargoStore.js";
import { skills } from "../data/catalog.js";
import { addXP, getQuest, store } from "./store.js";

const MAX_ACTIVE_QUESTS = 5;
export function getActiveQuest(){
  return getQuest(store.state.activeQuestId) || null;
}

export function getActiveQuests(){
  const ids = Array.isArray(store.state?.activeQuestIds) ? store.state.activeQuestIds : [];
  return ids.map(id=>getQuest(id)).filter(Boolean);
}

export function getQuestProgress(id){
  return Math.max(0, Number(store.state?.questProgress?.[id] || 0));
}

export function canClaimQuest(id){
  const quest = getQuest(id);
  if(!quest) return false;
  if(store.state.completedQuestClaims?.[id]) return false;
  return getQuestProgress(id) >= Math.max(0, Number(quest.objective.count || 0));
}

export function acceptQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  const requiredLevel = Number(quest.requiredLevel || 1);
  if(Number(store.state.player?.level || 1) < requiredLevel) return {ok:false, reason:`Niveau ${requiredLevel} requis.`};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quete deja terminee."};
  if(!Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = [];
  store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>getQuest(questId) && !store.state.completedQuestClaims?.[questId]).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestIds.includes(id)) return {ok:false, reason:"Quete deja en cours."};
  if(store.state.activeQuestIds.length >= MAX_ACTIVE_QUESTS) return {ok:false, reason:`Maximum ${MAX_ACTIVE_QUESTS} quetes en cours.`};
  store.state.activeQuestIds.push(id);
  store.state.activeQuestId = id;
  if(!store.state.questProgress) store.state.questProgress = {};
  if(!store.state.questProgress[id]) store.state.questProgress[id] = 0;
  return {ok:true, quest};
}

function questMatchesKill(quest, kind, zoneName){
  if(!quest || quest.objective.type !== "kill") return false;
  if(quest.objective.target && quest.objective.target !== kind) return false;
  if(quest.objective.zone && quest.objective.zone !== zoneName) return false;
  return true;
}

function canProgressQuest(quest){
  if(!quest || store.state.completedQuestClaims?.[quest.id]) return false;
  return getQuestProgress(quest.id) < Math.max(0, Number(quest.objective.count || 0));
}

function progressQuestKill(quest){
  if(!store.state.questProgress) store.state.questProgress = {};
  const target = Math.max(0, Number(quest.objective.count || 0));
  const next = Math.min(target, getQuestProgress(quest.id) + 1);
  store.state.questProgress[quest.id] = next;
  return next >= target;
}

function getQuestRewardMultipliers(){
  const result = {credits:1, premium:1};
  const skillRanks = store.state?.skillRanks || {};
  for(const skill of skills){
    const ranks = Array.isArray(skillRanks[skill.id]) ? skillRanks[skill.id] : [];
    for(let i = 0; i < skill.levels.length; i++){
      const node = skill.levels[i];
      const nodeRanks = Array.isArray(node?.ranks) ? node.ranks : [];
      const rank = Math.max(0, Math.min(nodeRanks.length, Number(ranks[i] || 0)));
      if(rank <= 0) continue;
      const stats = nodeRanks[rank - 1]?.stats || {};
      result.credits *= Number(stats.lootMultiplier || 1);
      result.premium *= Number(stats.novaMultiplier || 1);
    }
  }
  return result;
}

export function recordQuestKill(kind, zoneName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const trackedQuest = getQuest(store.state.activeQuestId);
  if(trackedQuest && activeIds.includes(trackedQuest.id) && canProgressQuest(trackedQuest) && questMatchesKill(trackedQuest, kind, zoneName)){
    return progressQuestKill(trackedQuest);
  }
  const fallbackQuest = activeIds
    .map(id=>getQuest(id))
    .find(quest=>canProgressQuest(quest) && questMatchesKill(quest, kind, zoneName));
  return fallbackQuest ? progressQuestKill(fallbackQuest) : false;
}

export function claimQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quete deja terminee."};
  if(!canClaimQuest(id)) return {ok:false, reason:"Objectif non rempli."};
  const multipliers = getQuestRewardMultipliers();
  store.state.player.credits += Math.round(Number(quest.rewards.credits || 0) * multipliers.credits);
  store.state.player.premium += Math.round(Number(quest.rewards.premium || 0) * multipliers.premium);
  addXP(Number(quest.rewards.xp || 0));
  for(const [materialId, amount] of Object.entries(quest.rewards.materials || {})) addMaterial(materialId, amount);
  if(!store.state.completedQuestClaims || typeof store.state.completedQuestClaims !== "object") store.state.completedQuestClaims = {};
  store.state.completedQuestClaims[id] = true;
  if(Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>questId !== id).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestId === id) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
  return {ok:true, quest};
}

