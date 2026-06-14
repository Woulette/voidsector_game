import {
  MAX_ACTIVE_QUESTS,
  getQuest,
  getQuestObjectiveProgress,
  getQuestObjectives,
  normalizeQuestFields,
  objectiveRequirementsMet
} from "./questState.js";

function objectiveMatchesQuestItemDrop(objective = {}, enemyKind, zoneName){
  if(objective.type !== "quest_item_drop") return false;
  if(objective.target && objective.target !== enemyKind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

export function findServerQuestItemDrop(profile, {enemyKind, zoneName} = {}){
  if(!profile || !enemyKind) return null;
  normalizeQuestFields(profile);
  const activeIds = profile.activeQuestIds.filter(id=>getQuest(id) && !profile.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    if(!quest) continue;
    const objectives = getQuestObjectives(quest);
    const match = objectives
      .map((objective, index)=>({objective, index}))
      .find(entry=>{
        const target = Math.max(0, Number(entry.objective.count || 0));
        return objectiveMatchesQuestItemDrop(entry.objective, enemyKind, zoneName)
          && objectiveRequirementsMet(profile, quest, entry.objective)
          && getQuestObjectiveProgress(profile, quest.id, entry.objective, entry.index) < target;
      });
    if(!match) continue;
    return {
      questId:quest.id,
      objectiveId:match.objective.id || null,
      itemId:match.objective.itemId,
      itemName:match.objective.itemName || match.objective.label || "Objet de quete",
      itemImg:match.objective.itemImg || "assets/quest_items/contaminated_sample.png",
      dropChance:Math.max(0, Math.min(1, Number(match.objective.dropChance || 1)))
    };
  }
  return null;
}

export function rollServerQuestItemDrop(profile, {enemyKind, zoneName, random = Math.random} = {}){
  const drop = findServerQuestItemDrop(profile, {enemyKind, zoneName});
  if(!drop || random() > drop.dropChance) return null;
  return drop;
}
