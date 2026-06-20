import { questCatalog } from "../data/catalog.js";
import { normalizeFirmId } from "../data/firms.js";
import { isPremiumActive } from "../data/premium.js";
import { getQuest, removeInventoryItems, store } from "./store.js";

export const MAX_ACTIVE_QUESTS = 5;

export function questMatchesPlayerFirm(quest){
  if(!quest?.firmId) return true;
  return normalizeFirmId(quest.firmId) === normalizeFirmId(store.state?.player?.firmId || "astra");
}

export function getInitialQuestFailProgress(quest, now = Date.now()){
  const result = {};
  if(quest?.failConditions?.hpLossLimit) result.hpLost = 0;
  if(quest?.failConditions?.timeLimit){
    result.timeElapsed = 0;
    result.timeStartedAt = now;
  }
  if(quest?.failConditions?.deathResets) result.deathSafe = true;
  return result;
}

export function getActiveQuest(){
  const quest = getQuest(store.state.activeQuestId);
  return quest && questMatchesPlayerFirm(quest) ? quest : null;
}

export function getActiveQuests(){
  const ids = Array.isArray(store.state?.activeQuestIds) ? store.state.activeQuestIds : [];
  return ids.map(id=>getQuest(id)).filter(quest=>quest && questMatchesPlayerFirm(quest));
}

export function getQuestProgress(id){
  const quest = getQuest(id);
  const stored = store.state?.questProgress?.[id];
  if(!quest) return Math.max(0, Number(stored || 0));
  if(typeof stored !== "object" || stored === null){
    const objectives = getQuestObjectives(quest);
    if(objectives.length === 1) return getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(objectives[0], 0));
    return Math.max(0, Number(stored || 0));
  }
  return getQuestObjectives(quest).reduce((sum, objective, index)=>sum + getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(objective, index)), 0);
}

export function getQuestObjectives(quest){
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective];
  return objectives.filter(Boolean);
}

export function getQuestObjectiveKey(objective = {}, index = 0){
  return objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
}

export function getQuestObjectiveProgress(id, objectiveKey){
  const quest = getQuest(id);
  if(quest && !store.state?.activeQuestIds?.includes(id) && !store.state?.completedQuestClaims?.[id]) return 0;
  const objectiveEntry = quest ? getQuestObjectives(quest).map((objective, index)=>({objective, index})).find(entry=>getQuestObjectiveKey(entry.objective, entry.index) === objectiveKey) : null;
  if(objectiveEntry?.objective?.type === "owned_combat_drone"){
    return Math.min(Math.max(0, Number(objectiveEntry.objective.count || 0)), Math.max(0, Number(store.state?.ownedDroneCount || 0)));
  }
    if(objectiveEntry?.objective?.type === "equipped_ship"){
    const requiredShip = objectiveEntry.objective.shipId;
    return requiredShip && store.state?.activeShip === requiredShip ? Math.max(0, Number(objectiveEntry.objective.count || 1)) : 0;
    }
    if(objectiveEntry?.objective?.type === "equipped_ship_lasers"){
      const target = Math.max(0, Number(objectiveEntry.objective.count || 0));
      const lasers = store.state?.shipLoadouts?.[store.state?.activeShip]?.lasers;
      const equipped = Array.isArray(lasers) ? lasers.filter(Boolean).length : 0;
      return Math.min(target, equipped);
    }
    if(objectiveEntry?.objective?.type === "deliver_item"){
      const stored = store.state?.questProgress?.[id];
      return typeof stored === "object" && stored !== null
        ? Math.max(0, Number(stored[objectiveKey] || 0))
        : Math.max(0, Number(stored || 0));
    }
  if(objectiveEntry?.objective?.type === "refinery_module_upgrade_start"){
    const objective = objectiveEntry.objective;
    const targetLevel = Math.max(0, Number(objective.targetLevel || 0));
    const currentLevel = Math.max(0, Number(store.state?.refineryModules?.[objective.module] || 0));
    if(targetLevel > 0 && currentLevel >= targetLevel) return Math.max(0, Number(objective.count || 1));
  }
  if(objectiveEntry?.objective?.type === "refinery_material_upgrade_start"){
    const objective = objectiveEntry.objective;
    const targetLevel = Math.max(0, Number(objective.targetLevel || 0));
    const currentLevel = Math.max(0, Number(store.state?.refineryLevels?.[objective.material] || 0));
    if(targetLevel > 0 && currentLevel >= targetLevel) return Math.max(0, Number(objective.count || 1));
  }
  const stored = store.state?.questProgress?.[id];
  if(typeof stored === "object" && stored !== null) return Math.max(0, Number(stored[objectiveKey] || 0));
  return Math.max(0, Number(stored || 0));
}

export function getQuestTargetTotal(quest){
  return getQuestObjectives(quest).reduce((sum, objective)=>sum + Math.max(0, Number(objective.count || 0)), 0);
}

export function canClaimQuest(id){
  const quest = getQuest(id);
  if(!quest) return false;
  if(store.state.completedQuestClaims?.[id]) return false;
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.includes(id)) return false;
  return getQuestObjectives(quest).every((objective, index)=>{
    const target = Math.max(0, Number(objective.count || 0));
    return getQuestObjectiveProgress(id, getQuestObjectiveKey(objective, index)) >= target;
  });
}

export function isQuestUnlocked(quest){
  if(!quest?.unlock) return true;
  if(quest.unlock.type === "complete_level_quests"){
    const level = Number(quest.unlock.level || quest.requiredLevel || 1);
    const completed = store.state.completedQuestClaims || {};
    return questCatalog
      .filter(entry=>entry.id !== quest.id && questMatchesPlayerFirm(entry) && !entry.rare && Number(entry.requiredLevel || 1) === level && (entry.category || "normal") === (quest.category || "normal"))
      .every(entry=>completed[entry.id]);
  }
  if(quest.unlock.type === "complete_quest"){
    return Boolean(store.state.completedQuestClaims?.[quest.unlock.questId]);
  }
  return true;
}

export function acceptQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  if(!questMatchesPlayerFirm(quest)) return {ok:false, reason:"Quete reservee a une autre firme."};
  const requiredLevel = Number(quest.requiredLevel || 1);
  if(Number(store.state.player?.level || 1) < requiredLevel) return {ok:false, reason:`Niveau ${requiredLevel} requis.`};
  if((quest.category || "normal") === "weekly" && !isPremiumActive(store.state?.player)){
    return {ok:false, reason:"Premium requis pour les quetes hebdomadaires."};
  }
  if(!isQuestUnlocked(quest)) return {ok:false, reason:"Quete rare verrouillee."};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quete deja terminee."};
  if(!Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = [];
  store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>{
    const entry = getQuest(questId);
    return entry && questMatchesPlayerFirm(entry) && !store.state.completedQuestClaims?.[questId];
  }).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestIds.includes(id)) return {ok:false, reason:"Quete deja en cours."};
  if(store.state.activeQuestIds.length >= MAX_ACTIVE_QUESTS) return {ok:false, reason:`Maximum ${MAX_ACTIVE_QUESTS} quetes en cours.`};
  store.state.activeQuestIds.push(id);
  if(!store.state.activeQuestId) store.state.activeQuestId = id;
  if(!store.state.questProgress) store.state.questProgress = {};
  if(!store.state.questProgress[id]) store.state.questProgress[id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  const failProgress = getInitialQuestFailProgress(quest);
  if(Object.keys(failProgress).length) store.state.questFailProgress[id] = failProgress;
  return {ok:true, quest};
}

export function objectiveRequirementsMet(quest, objective){
  const requiredIds = [
    ...(Array.isArray(objective?.requiresObjectives) ? objective.requiresObjectives : []),
    ...(objective?.requiresObjective ? [objective.requiresObjective] : [])
  ];
  if(!requiredIds.length) return true;
  const objectives = getQuestObjectives(quest);
  return requiredIds.every(requiredId=>{
    const index = objectives.findIndex(entry=>entry?.id === requiredId);
    if(index < 0) return false;
    const requiredObjective = objectives[index];
    const target = Math.max(0, Number(requiredObjective.count || 0));
    return getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(requiredObjective, index)) >= target;
  });
}

export function canProgressQuest(quest){
  if(!quest || store.state.completedQuestClaims?.[quest.id]) return false;
  return getQuestObjectives(quest).some((objective, index)=>{
    const target = Math.max(0, Number(objective.count || 0));
    return objectiveRequirementsMet(quest, objective) && getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(objective, index)) < target;
  });
}

export function progressQuestObjective(quest, objective, index){
  if(!store.state.questProgress) store.state.questProgress = {};
  const objectives = getQuestObjectives(quest);
  const target = Math.max(0, Number(objective.count || 0));
  const key = getQuestObjectiveKey(objective, index);
  if(objective.type === "deliver_item" && objective.consumeItems){
    if(!removeInventoryItems(objective.itemId, target)) return false;
  }
  const increment = objective.type === "deliver_item" ? target : 1;
  const next = Math.min(target, getQuestObjectiveProgress(quest.id, key) + increment);
  if(objectives.length > 1){
    if(typeof store.state.questProgress[quest.id] !== "object" || store.state.questProgress[quest.id] === null) store.state.questProgress[quest.id] = {};
    store.state.questProgress[quest.id][key] = next;
  }else{
    store.state.questProgress[quest.id] = next;
  }
  return canClaimQuest(quest.id);
}
