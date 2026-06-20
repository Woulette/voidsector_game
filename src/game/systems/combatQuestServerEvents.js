import { ammoTypes, equipment, portals, rawMaterialCatalog } from "../../data/catalog.js";
import { getAllQuests as defaultGetAllQuests } from "../../core/store.js";
import { fmt } from "../../core/utils.js";

export function compactQuestRewardLabels(reward = {}, {
  equipmentList = equipment,
  ammoList = ammoTypes,
  portalList = portals,
  materialList = rawMaterialCatalog,
  format = fmt
} = {}){
  const labels = [];
  const byId = (items, id)=>items.find(item=>String(item.id) === String(id));
  for(const itemId of reward.items || []){
    const item = byId(equipmentList, itemId);
    labels.push(`+1 ${item?.short || item?.name || itemId}`);
  }
  for(const [itemId, amount] of Object.entries(reward.itemCounts || {})){
    const item = byId(equipmentList, itemId);
    labels.push(`+${format(amount)} ${item?.short || item?.name || itemId}`);
  }
  for(const [ammoId, amount] of Object.entries(reward.ammo || {})){
    const ammo = byId(ammoList, ammoId);
    labels.push(`+${format(amount)} ${ammo?.short || ammo?.name || ammoId}`);
  }
  for(const [portalId, amount] of Object.entries(reward.portalPieces || {})){
    const portal = byId(portalList, portalId);
    labels.push(`+${format(amount)} piece ${portal?.name || portalId}`);
  }
  const materialRewards = {...(reward.materials || {}), ...(reward.shipCargoMaterialsForced || {})};
  for(const [materialId, amount] of Object.entries(materialRewards)){
    const material = byId(materialList, materialId);
    labels.push(`+${format(amount)} ${material?.short || material?.name || materialId}`);
  }
  return labels;
}

export function createQuestServerEventProcessor({
  multiplayer,
  rewards,
  showToast,
  getAllQuests = defaultGetAllQuests
}){
  const processedQuestClaimIds = new Set();

  function applyQuestProgressEvents(){
    if(!multiplayer.questProgressEvents?.length) return;
    const quests = getAllQuests();
    for(const event of multiplayer.questProgressEvents){
      const updates = Array.isArray(event.updates) ? event.updates : [];
      for(const update of updates){
        const questId = update?.questId || update?.id;
        const quest = quests.find(entry=>entry.id === questId);
        if(update.completed) showToast(`Objectif serveur termine : ${quest?.title || "quete"}.`);
      }
    }
    multiplayer.questProgressEvents = [];
  }

  function applyQuestClaimEvents(){
    if(!multiplayer.questEvents?.length) return;
    for(const event of multiplayer.questEvents){
      if(event?.type !== "claimed") continue;
      const reward = event.reward || {};
      const claimId = `${event.id || "quest"}:${event.at || 0}:${event.receivedAt || 0}`;
      if(processedQuestClaimIds.has(claimId)) continue;
      processedQuestClaimIds.add(claimId);
      rewards.showLootNotice?.({
        questTitle:event.title ? `Quete : ${event.title}` : "Quete terminee",
        credits:Math.max(0, Math.round(Number(reward.credits || 0))),
        xp:Math.max(0, Math.round(Number(reward.xp || 0))),
        premium:Math.max(0, Math.round(Number(reward.premium || 0))),
        items:compactQuestRewardLabels(reward),
        duration:15
      });
    }
  }

  function applyQuestFailureEvents(){
    if(!multiplayer.questFailureEvents?.length) return;
    for(const event of multiplayer.questFailureEvents){
      for(const failed of event.failed || []){
        const quest = getAllQuests().find(entry=>entry.id === (failed?.questId || failed?.id));
        const reason = failed?.failType === "timeElapsed" ? "temps depasse" : "limite de vie depassee";
        showToast(`${failed.title || quest?.title || "Quete"} : ${reason}, quete annulee.`);
      }
    }
    multiplayer.questFailureEvents = [];
  }

  return {
    applyQuestProgressEvents,
    applyQuestClaimEvents,
    applyQuestFailureEvents
  };
}
