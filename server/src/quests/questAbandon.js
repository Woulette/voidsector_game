import { getTutorialQuestIds } from "../../../src/shared/tutorial.js";
import { deepClone, getQuest, getQuestObjectives, normalizeQuestFields, questMatchesProfileFirm } from "./questState.js";

export function abandonServerQuest(profile, id, {mapId = ""} = {}){
  const quest = getQuest(String(id || ""));
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  if(!questMatchesProfileFirm(profile, quest)) return {ok:false, reason:"Quete reservee a une autre firme."};
  if(profile.completedQuestClaims?.[quest.id]) return {ok:false, reason:"Quete deja terminee."};
  if(!profile.activeQuestIds?.includes(quest.id)) return {ok:false, reason:"Quete non active."};
  if(["active", "paused"].includes(profile.tutorial?.status)
    && getTutorialQuestIds(profile.player?.firmId).includes(quest.id)){
    return {ok:false, code:"TUTORIAL_QUEST_PROTECTED", reason:"Cette mission est necessaire au tutoriel. Termine-la ou abandonne explicitement le tutoriel avant de l'abandonner."};
  }
  const currentMaps = [String(mapId), String(profile.worldSession?.mapId || "")];
  if(getQuestObjectives(quest).some(objective=>objective.type === "portal_complete"
    && objective.portalId && currentMaps.includes(`portal-${objective.portalId}`))){
    return {ok:false, code:"QUEST_PORTAL_ACTIVE", reason:"Quitte ce portail avant d'abandonner sa quete."};
  }
  normalizeQuestFields(profile);
  profile.activeQuestIds = profile.activeQuestIds.filter(questId=>questId !== quest.id);
  if(profile.activeQuestId === quest.id) profile.activeQuestId = profile.activeQuestIds[0] || null;
  delete profile.questProgress[quest.id];
  delete profile.questFailProgress[quest.id];
  // Permanent inventory and completed claims survive abandonment. Temporary
  // quest items are objective counters, which have just been removed.
  return {ok:true, quest:deepClone(quest)};
}
