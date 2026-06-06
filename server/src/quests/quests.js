import { objectiveMatchesAction, objectiveMatchesKill } from "./questMatchers.js";
import {
  MAX_ACTIVE_QUESTS,
  getQuest,
  getQuestObjectiveProgress,
  getQuestObjectives,
  normalizeQuestFields,
  objectiveRequirementsMet,
  progressQuestObjective
} from "./questState.js";

export { acceptServerQuest } from "./questState.js";
export { claimServerQuest } from "./questRewards.js";

export function progressServerQuestKill(profile, {kind, zoneName} = {}){
  normalizeQuestFields(profile);
  const activeIds = profile.activeQuestIds.filter(id=>getQuest(id) && !profile.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const updates = [];
  for(const id of activeIds){
    const quest = getQuest(id);
    const match = getQuestObjectives(quest)
      .map((objective, index)=>({objective, index}))
      .find(entry=>{
        const target = Math.max(0, Number(entry.objective.count || 0));
        return objectiveMatchesKill(entry.objective, kind, zoneName)
          && objectiveRequirementsMet(profile, quest, entry.objective)
          && getQuestObjectiveProgress(profile, quest.id, entry.objective, entry.index) < target;
      });
    if(match) updates.push(progressQuestObjective(profile, quest, match.objective, match.index));
  }
  return {ok:true, updates};
}

export function progressServerQuestAction(profile, action = {}){
  normalizeQuestFields(profile);
  const activeIds = profile.activeQuestIds.filter(id=>getQuest(id) && !profile.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const updates = [];
  const increment = Math.max(1, Math.min(100, Math.floor(Number(action.amount || 1))));
  for(let step = 0; step < increment; step += 1){
    let progressedThisStep = false;
    for(const id of activeIds){
      const quest = getQuest(id);
      const match = getQuestObjectives(quest)
        .map((objective, index)=>({objective, index}))
        .find(entry=>{
          const target = Math.max(0, Number(entry.objective.count || 0));
          return objectiveMatchesAction(profile, entry.objective, action)
            && objectiveRequirementsMet(profile, quest, entry.objective)
            && getQuestObjectiveProgress(profile, quest.id, entry.objective, entry.index) < target;
        });
      if(match){
        updates.push(progressQuestObjective(profile, quest, match.objective, match.index));
        progressedThisStep = true;
        break;
      }
    }
    if(!progressedThisStep) break;
  }
  return {ok:true, updates};
}
