import {
  MAX_ACTIVE_QUESTS,
  canClaimQuest,
  getInitialQuestFailProgress,
  getQuest,
  getQuestObjectives,
  normalizeQuestFields
} from "./questState.js";

function resetQuestRun(profile, quest){
  if(!profile?.questProgress || typeof profile.questProgress !== "object") profile.questProgress = {};
  profile.questProgress[quest.id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  if(!profile.questFailProgress || typeof profile.questFailProgress !== "object") profile.questFailProgress = {};
  profile.questFailProgress[quest.id] = getInitialQuestFailProgress(quest);
}

function removeActiveQuest(profile, questId){
  if(!profile || !questId) return;
  if(Array.isArray(profile.activeQuestIds)){
    profile.activeQuestIds = profile.activeQuestIds.filter(id=>id !== questId).slice(0, MAX_ACTIVE_QUESTS);
  }
  if(profile.activeQuestId === questId) profile.activeQuestId = profile.activeQuestIds?.[0] || null;
}

export function recordServerQuestHpLoss(profile, amount){
  const hpLoss = Math.max(0, Number(amount || 0));
  if(hpLoss <= 0) return {ok:true, updates:[], failed:[]};
  normalizeQuestFields(profile);
  const updates = [];
  const failed = [];
  const activeIds = profile.activeQuestIds
    .filter(id=>getQuest(id) && !profile.completedQuestClaims?.[id])
    .slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    const limit = Math.max(0, Number(quest?.failConditions?.hpLossLimit || 0));
    if(!quest || !limit) continue;
    if(!profile.questFailProgress || typeof profile.questFailProgress !== "object") profile.questFailProgress = {};
    const state = profile.questFailProgress[id] || getInitialQuestFailProgress(quest);
    const next = Math.max(0, Number(state.hpLost || 0)) + hpLoss;
    profile.questFailProgress[id] = {...state, hpLost:next};
    updates.push({
      id:quest.id,
      questId:quest.id,
      failType:"hpLost",
      hpLost:Math.min(limit, next),
      hpLossLimit:limit,
      failed:next >= limit
    });
    if(next >= limit){
      resetQuestRun(profile, quest);
      removeActiveQuest(profile, quest.id);
      failed.push({id:quest.id, questId:quest.id, title:quest.title});
    }
  }
  return {ok:true, updates, failed};
}

export function recordServerQuestDeath(profile){
  normalizeQuestFields(profile);
  const failed = [];
  const activeIds = profile.activeQuestIds
    .filter(id=>getQuest(id) && !profile.completedQuestClaims?.[id])
    .slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    if(!quest?.failConditions?.deathResets) continue;
    resetQuestRun(profile, quest);
    removeActiveQuest(profile, quest.id);
    failed.push({id:quest.id, questId:quest.id, title:quest.title, failType:"death"});
  }
  return {ok:true, changed:failed.length > 0, failed};
}

export function checkServerQuestTimers(profile, now = Date.now()){
  normalizeQuestFields(profile);
  const failed = [];
  let changed = false;
  const activeIds = profile.activeQuestIds
    .filter(id=>getQuest(id) && !profile.completedQuestClaims?.[id])
    .slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    const limit = Math.max(0, Number(quest?.failConditions?.timeLimit || 0));
    if(!quest || !limit) continue;
    if(canClaimQuest(profile, quest)) continue;
    if(!profile.questFailProgress || typeof profile.questFailProgress !== "object") profile.questFailProgress = {};
    const state = profile.questFailProgress[id] || getInitialQuestFailProgress(quest, now);
    if(Number(state.timePausedAt || 0) > 0) continue;
    let startedAt = Math.max(0, Number(state.timeStartedAt || 0));
    if(!startedAt){
      startedAt = now - Math.max(0, Number(state.timeElapsed || 0)) * 1000;
      profile.questFailProgress[id] = {...state, timeStartedAt:startedAt};
      changed = true;
    }
    if(now - startedAt < limit * 1000) continue;
    resetQuestRun(profile, quest);
    removeActiveQuest(profile, quest.id);
    failed.push({id:quest.id, questId:quest.id, title:quest.title, failType:"timeElapsed"});
    changed = true;
  }
  return {ok:true, changed, failed};
}

export function pauseServerQuestTimers(profile, now = Date.now()){
  normalizeQuestFields(profile);
  let changed = false;
  for(const id of profile.activeQuestIds){
    const quest = getQuest(id);
    if(!quest?.failConditions?.timeLimit) continue;
    const state = profile.questFailProgress[id] || getInitialQuestFailProgress(quest, now);
    if(Number(state.timePausedAt || 0) > 0) continue;
    profile.questFailProgress[id] = {...state, timePausedAt:now};
    changed = true;
  }
  return changed;
}

export function resumeServerQuestTimers(profile, now = Date.now()){
  normalizeQuestFields(profile);
  let changed = false;
  for(const id of profile.activeQuestIds){
    const quest = getQuest(id);
    if(!quest?.failConditions?.timeLimit) continue;
    const state = profile.questFailProgress[id] || getInitialQuestFailProgress(quest, now);
    const pausedAt = Math.max(0, Number(state.timePausedAt || 0));
    if(!pausedAt) continue;
    const startedAt = Math.max(0, Number(state.timeStartedAt || pausedAt));
    profile.questFailProgress[id] = {
      ...state,
      timeStartedAt:startedAt + Math.max(0, now - pausedAt),
      timePausedAt:0
    };
    changed = true;
  }
  return changed;
}
