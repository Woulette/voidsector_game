import { addInventoryItemAmount, getInventoryItemCount } from "../economy/inventoryStacks.js";
import { appendProfileActivity } from "../players/activityLog.js";
import { RICKY_PORTAL_ID, RICKY_PORTAL_KEY_ITEM_ID, getRickyPortalQuestId } from "../portals/rickyPortalState.js";
import { getProfileFirmQuestId, getQuest, getQuestObjectiveProgress, getQuestObjectives } from "./questState.js";

export function canRecoverRickyQuestKey(profile, action = {}){
  if(action.type !== "talk_npc") return false;
  const questId = getProfileFirmQuestId(profile, "quest_lv10_sauvons_deadly");
  const quest = getQuest(questId);
  if(!quest || !profile?.activeQuestIds?.includes(questId) || profile.completedQuestClaims?.[questId]) return false;
  if(!profile.completedQuestClaims?.[getRickyPortalQuestId(profile)]) return false;
  // A clear is permanent, even if the rescue quest is later abandoned and accepted again.
  if(Number(profile.completedPortals?.[RICKY_PORTAL_ID] || 0) > 0) return false;
  const objectives = getQuestObjectives(quest);
  const portalIndex = objectives.findIndex(objective=>objective.type === "portal_complete" && objective.portalId === RICKY_PORTAL_ID);
  if(portalIndex < 0 || getQuestObjectiveProgress(profile, questId, objectives[portalIndex], portalIndex) > 0) return false;
  const contact = objectives.find(objective=>objective.type === "talk_npc");
  if(!contact || action.npcId !== contact.npcId || action.zoneName !== contact.zone) return false;
  return getInventoryItemCount(profile, RICKY_PORTAL_KEY_ITEM_ID) === 0;
}

export function recoverRickyQuestKey(profile, action = {}){
  if(!canRecoverRickyQuestKey(profile, action)) return {ok:false, reason:"Aucune clé de secours disponible auprès de Ricky."};
  const questId = getProfileFirmQuestId(profile, "quest_lv10_sauvons_deadly");
  addInventoryItemAmount(profile, RICKY_PORTAL_KEY_ITEM_ID, 1);
  appendProfileActivity(profile, {
    type:"quest", label:"Clé de secours de Ricky",
    detail:"Une clé du portail Deadly rendue avant la première réussite.",
    data:{questId, itemId:RICKY_PORTAL_KEY_ITEM_ID, amount:1}
  });
  return {ok:true, questId, itemId:RICKY_PORTAL_KEY_ITEM_ID, amount:1};
}
