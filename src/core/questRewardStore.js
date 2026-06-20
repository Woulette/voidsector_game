import * as cargoStore from "./cargoStore.js";
import { skills } from "../data/catalog.js";
import { isPremiumActive } from "../data/premium.js";
import { addAmmo, addInventoryItem, addPortalPiece, addXP, getQuest, store } from "./store.js";
import { MAX_ACTIVE_QUESTS, canClaimQuest } from "./questProgressStore.js";

function getQuestRewardMultipliers(){
  const result = {credits:1, premium:1};
  const skillRanks = store.state?.skillRanks || {};
  for(const skill of skills){
    const ranks = Array.isArray(skillRanks[skill.id]) ? skillRanks[skill.id] : [];
    for(let i = 0; i < skill.levels.length; i++){
      const node = skill.levels[i];
      const nodeRanks = Array.isArray(node?.ranks) ? node.ranks : [];
      const rank = Math.max(0, Math.min(nodeRanks.length, Number(ranks[i] || 0)));
      if(rank <= 0) continue;
      const stats = nodeRanks[rank - 1]?.stats || {};
      result.credits *= Number(stats.lootMultiplier || 1);
      result.premium *= Number(stats.novaMultiplier || 1);
    }
  }
  return result;
}

export function claimQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quete deja terminee."};
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.includes(id)) return {ok:false, reason:"Quete non active."};
  if((quest.category || "normal") === "weekly" && !isPremiumActive(store.state?.player)) return {ok:false, reason:"Premium requis pour les quetes hebdomadaires."};
  if(!canClaimQuest(id)) return {ok:false, reason:"Objectif non rempli."};
  const multipliers = getQuestRewardMultipliers();
  store.state.player.credits += Math.round(Number(quest.rewards.credits || 0) * multipliers.credits);
  store.state.player.premium += Math.round(Number(quest.rewards.premium || 0) * multipliers.premium);
  addXP(Number(quest.rewards.xp || 0));
  for(const [materialId, amount] of Object.entries(quest.rewards.materials || {})) cargoStore.addMaterial(materialId, amount);
  for(const [materialId, amount] of Object.entries(quest.rewards.shipCargoMaterialsForced || {})){
    const addForced = cargoStore.addShipCargoMaterialForced || cargoStore.addShipCargoMaterial || cargoStore.addMaterial;
    addForced(materialId, amount);
  }
  for(const [portalId, amount] of Object.entries(quest.rewards.portalPieces || {})) addPortalPiece(portalId, amount);
  for(const [ammoId, amount] of Object.entries(quest.rewards.ammo || {})) addAmmo(ammoId, amount);
  for(const [itemId, amount] of Object.entries(quest.rewards.itemCounts || {})){
    for(let i = 0; i < Math.max(0, Number(amount || 0)); i++) addInventoryItem(itemId);
  }
  for(const itemId of quest.rewards.items || []) addInventoryItem(itemId);
  if(!store.state.completedQuestClaims || typeof store.state.completedQuestClaims !== "object") store.state.completedQuestClaims = {};
  store.state.completedQuestClaims[id] = true;
  if(store.state.questFailProgress && typeof store.state.questFailProgress === "object") delete store.state.questFailProgress[id];
  if(Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>questId !== id).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestId === id) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
  return {ok:true, quest};
}
