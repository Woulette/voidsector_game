import { ammoTypes, equipment, portals, rawMaterialCatalog } from "../../data/catalog.js";
import { getAllQuests as defaultGetAllQuests, saveState as defaultSaveState, store as defaultStore } from "../../core/store.js";
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
  updateHud,
  getAllQuests = defaultGetAllQuests,
  store = defaultStore,
  saveState = defaultSaveState
}){
  const processedQuestClaimIds = new Set();

  function applyQuestProgressEvents(){
    if(!multiplayer.questProgressEvents?.length) return;
    const quests = getAllQuests();
    let changed = false;
    for(const event of multiplayer.questProgressEvents){
      const updates = Array.isArray(event.updates) ? event.updates : [];
      for(const update of updates){
        const quest = quests.find(entry=>entry.id === update?.id);
        if(!quest) continue;
        if(!store.state.questProgress || typeof store.state.questProgress !== "object") store.state.questProgress = {};
        const objectiveKey = update.objectiveKey ? String(update.objectiveKey) : "";
        const hasMultipleObjectives = Array.isArray(quest.objectives) && quest.objectives.length > 1;
        const stored = store.state.questProgress[quest.id];
        const previous = objectiveKey && hasMultipleObjectives
          ? Math.max(0, Number((stored && typeof stored === "object" ? stored[objectiveKey] : 0) || 0))
          : Math.max(0, Number((stored && typeof stored === "object" ? 0 : stored) || 0));
        const target = Number(update.target || quest.objective?.count || 0);
        const next = Number.isFinite(Number(update.progress))
          ? Math.max(previous, Math.min(target, Number(update.progress || 0)))
          : Math.min(target, previous + Math.max(0, Number(update.delta || 0)));
        if(next <= previous) continue;
        if(objectiveKey && hasMultipleObjectives){
          if(!store.state.questProgress[quest.id] || typeof store.state.questProgress[quest.id] !== "object") store.state.questProgress[quest.id] = {};
          store.state.questProgress[quest.id][objectiveKey] = next;
        }else{
          store.state.questProgress[quest.id] = next;
        }
        changed = true;
        if(update.completed) showToast(`Objectif serveur termine : ${quest.title}.`);
      }
    }
    multiplayer.questProgressEvents = [];
    if(changed){
      saveState();
      updateHud();
    }
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
    let changed = false;
    if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
    if(!store.state.questProgress || typeof store.state.questProgress !== "object") store.state.questProgress = {};
    for(const event of multiplayer.questFailureEvents){
      for(const update of event.updates || []){
        const questId = update?.questId || update?.id;
        if(!questId || update.failType !== "hpLost") continue;
        const current = store.state.questFailProgress[questId] && typeof store.state.questFailProgress[questId] === "object"
          ? store.state.questFailProgress[questId]
          : {};
        store.state.questFailProgress[questId] = {
          ...current,
          hpLost:Math.max(0, Number(update.hpLost || 0))
        };
        changed = true;
      }
      for(const failed of event.failed || []){
        const quest = getAllQuests().find(entry=>entry.id === (failed?.questId || failed?.id));
        const questId = failed?.questId || failed?.id;
        if(!questId) continue;
        store.state.questProgress[questId] = Array.isArray(quest?.objectives) && quest.objectives.length > 1 ? {} : 0;
        store.state.questFailProgress[questId] = {};
        if(Array.isArray(store.state.activeQuestIds)){
          store.state.activeQuestIds = store.state.activeQuestIds.filter(id=>id !== questId);
        }
        if(store.state.activeQuestId === questId) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
        const reason = failed?.failType === "timeElapsed" ? "temps depasse" : "limite de vie depassee";
        showToast(`${failed.title || quest?.title || "Quete"} : ${reason}, quete annulee.`);
        changed = true;
      }
    }
    multiplayer.questFailureEvents = [];
    if(changed){
      saveState();
      updateHud();
    }
  }

  return {
    applyQuestProgressEvents,
    applyQuestClaimEvents,
    applyQuestFailureEvents
  };
}
