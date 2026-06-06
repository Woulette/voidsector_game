import { getQuest, store } from "./store.js";
import { MAX_ACTIVE_QUESTS, canClaimQuest, getInitialQuestFailProgress, getQuestObjectives } from "./questProgressStore.js";

export function resetQuestRun(quest){
  if(!quest) return;
  if(!store.state.questProgress) store.state.questProgress = {};
  store.state.questProgress[quest.id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  store.state.questFailProgress[quest.id] = getInitialQuestFailProgress(quest);
}

export function removeActiveQuest(id){
  if(Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>questId !== id).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestId === id) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
}

export function recordQuestHpLoss(amount){
  const hpLoss = Math.max(0, Number(amount || 0));
  if(hpLoss <= 0 || !Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return [];
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  const failed = [];
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    const limit = Math.max(0, Number(quest?.failConditions?.hpLossLimit || 0));
    if(!quest || !limit) continue;
    const state = store.state.questFailProgress[id] || {hpLost:0};
    const next = Math.max(0, Number(state.hpLost || 0)) + hpLoss;
    store.state.questFailProgress[id] = {...state, hpLost:next};
    if(next > limit){
      resetQuestRun(quest);
      failed.push(quest);
    }
  }
  return failed;
}

export function recordQuestTimeElapsed(seconds){
  const elapsed = Math.max(0, Number(seconds || 0));
  if(elapsed <= 0 || !Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return [];
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  const failed = [];
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    const limit = Math.max(0, Number(quest?.failConditions?.timeLimit || 0));
    if(!quest || !limit) continue;
    if(canClaimQuest(id)) continue;
    const state = store.state.questFailProgress[id] || getInitialQuestFailProgress(quest);
    const next = Math.max(0, Number(state.timeElapsed || 0)) + elapsed;
    store.state.questFailProgress[id] = {...state, timeElapsed:next};
    if(next >= limit){
      resetQuestRun(quest);
      removeActiveQuest(id);
      failed.push(quest);
    }
  }
  return failed;
}

export function recordQuestDeath(){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return [];
  const failed = [];
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    if(!quest?.failConditions?.deathResets) continue;
    resetQuestRun(quest);
    failed.push(quest);
  }
  return failed;
}
