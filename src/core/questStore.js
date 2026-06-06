import { getQuest, store } from "./store.js";
import { MAX_ACTIVE_QUESTS, acceptQuest, canClaimQuest, canProgressQuest, getActiveQuest, getActiveQuests, getInitialQuestFailProgress, getQuestObjectiveKey, getQuestObjectiveProgress, getQuestObjectives, getQuestProgress, getQuestTargetTotal, isQuestUnlocked, objectiveRequirementsMet, progressQuestObjective } from "./questProgressStore.js";
export { acceptQuest, canClaimQuest, getActiveQuest, getActiveQuests, getQuestObjectiveKey, getQuestObjectiveProgress, getQuestObjectives, getQuestProgress, getQuestTargetTotal, isQuestUnlocked } from "./questProgressStore.js";
export { recordQuestDeath, recordQuestHpLoss, recordQuestTimeElapsed, removeActiveQuest, resetQuestRun } from "./questFailureStore.js";
export { claimQuest } from "./questRewardStore.js";
import { objectiveMatchesCoordinateVisit, objectiveMatchesKill, objectiveMatchesMapVisit, objectiveMatchesNpcTalk, objectiveMatchesQuestItemDrop, objectiveMatchesRefineryMaterialUpgradeStart, objectiveMatchesRefineryModuleUpgradeStart, objectiveMatchesSpaceCasterUse } from "./questObjectiveMatchers.js";

export function recordQuestKill(kind, zoneName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  let completed = false;
  const trackedQuest = getQuest(store.state.activeQuestId);
  const trackedMatch = findMatchingObjective(trackedQuest, objective=>objectiveMatchesKill(objective, kind, zoneName));
  if(trackedQuest && activeIds.includes(trackedQuest.id) && canProgressQuest(trackedQuest) && trackedMatch){
    completed = progressQuestObjective(trackedQuest, trackedMatch.objective, trackedMatch.index) || completed;
  }else{
    const fallback = activeIds
      .map(id=>getQuest(id))
      .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesKill(objective, kind, zoneName))}))
      .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
    if(fallback) completed = progressQuestObjective(fallback.quest, fallback.match.objective, fallback.match.index) || completed;
  }
  return completed;
}

export function rollQuestItemDropFromKill(kind, zoneName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return null;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    if(!quest || !canProgressQuest(quest)) continue;
    const match = findMatchingObjective(quest, objective=>objectiveMatchesQuestItemDrop(objective, kind, zoneName));
    if(!match) continue;
    const chance = Math.max(0, Math.min(1, Number(match.objective.dropChance || 1)));
    if(Math.random() > chance) continue;
    return {
      questId:quest.id,
      objectiveId:match.objective.id || null,
      itemId:match.objective.itemId,
      itemName:match.objective.itemName || match.objective.label || "Objet de quete",
      itemImg:match.objective.itemImg || "assets/quest_items/contaminated_sample.png"
    };
  }
  return null;
}

export function recordQuestItemPickup(itemId){
  if(!itemId || !Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objective.type === "quest_item_drop" && objective.itemId === itemId)}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  progressQuestObjective(matching.quest, matching.match.objective, matching.match.index);
  return true;
}

function findMatchingObjective(quest, predicate){
  if(!quest) return null;
  return getQuestObjectives(quest).map((objective, index)=>({objective, index})).find(entry=>{
    const target = Math.max(0, Number(entry.objective.count || 0));
    const key = getQuestObjectiveKey(entry.objective, entry.index);
    return objectiveRequirementsMet(quest, entry.objective) && getQuestObjectiveProgress(quest.id, key) < target && predicate(entry.objective);
  }) || null;
}

export function recordQuestRefineryModuleUpgradeStart(moduleId, targetLevel){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesRefineryModuleUpgradeStart(objective, moduleId, targetLevel))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  return matching ? progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) : false;
}

export function recordQuestRefineryMaterialUpgradeStart(materialId, targetLevel){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesRefineryMaterialUpgradeStart(objective, materialId, targetLevel))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  return matching ? progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) : false;
}

export function recordQuestMapVisit(mapName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesMapVisit(objective, mapName))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  return matching ? progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) : false;
}

export function recordQuestSpaceCasterUse(amount = 1){
  const increment = Math.max(1, Math.floor(Number(amount || 1)));
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesSpaceCasterUse(objective))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  let completed = false;
  for(let i = 0; i < increment; i++) completed = progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) || completed;
  return completed;
}

export function recordQuestCoordinateVisit(point, mapName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesCoordinateVisit(objective, point, mapName))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  progressQuestObjective(matching.quest, matching.match.objective, matching.match.index);
  return true;
}

export function recordQuestNpcTalk(npcId, mapName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const trackedQuest = getQuest(store.state.activeQuestId);
  const trackedMatch = findMatchingObjective(trackedQuest, objective=>objectiveMatchesNpcTalk(objective, npcId, mapName));
  if(trackedQuest && activeIds.includes(trackedQuest.id) && canProgressQuest(trackedQuest) && trackedMatch){
    progressQuestObjective(trackedQuest, trackedMatch.objective, trackedMatch.index);
    return true;
  }
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesNpcTalk(objective, npcId, mapName))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  progressQuestObjective(matching.quest, matching.match.objective, matching.match.index);
  return true;
}

