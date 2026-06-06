import { skills } from "../../../src/data/progression.js";
import { applyProgressionReward } from "../players/progression.js";
import { canClaimQuest, deepClone, getQuest, normalizeQuestFields, MAX_ACTIVE_QUESTS } from "./questState.js";

function getQuestRewardMultipliers(profile){
  const result = {credits:1, premium:1};
  const skillRanks = profile.skillRanks || {};
  for(const skill of skills){
    const ranks = Array.isArray(skillRanks[skill.id]) ? skillRanks[skill.id] : [];
    for(let i = 0; i < skill.levels.length; i += 1){
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

function addMaterials(profile, materials = {}){
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  for(const [materialId, amount] of Object.entries(materials || {})){
    profile.cargoHold[materialId] = Math.max(0, Number(profile.cargoHold[materialId] || 0)) + Math.max(0, Math.round(Number(amount || 0)));
  }
}

function addQuestRewards(profile, quest){
  const rewards = quest.rewards || {};
  const multipliers = getQuestRewardMultipliers(profile);
  profile.player = applyProgressionReward(profile.player || {}, {
    credits:Math.round(Number(rewards.credits || 0) * multipliers.credits),
    premium:Math.round(Number(rewards.premium || 0) * multipliers.premium),
    xp:Number(rewards.xp || 0)
  });
  addMaterials(profile, rewards.materials || {});
  addMaterials(profile, rewards.shipCargoMaterialsForced || {});
  if(!profile.portalPieces || typeof profile.portalPieces !== "object") profile.portalPieces = {};
  for(const [portalId, amount] of Object.entries(rewards.portalPieces || {})){
    profile.portalPieces[portalId] = Math.max(0, Number(profile.portalPieces[portalId] || 0)) + Math.max(0, Math.round(Number(amount || 0)));
  }
  if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
  for(const [ammoId, amount] of Object.entries(rewards.ammo || {})){
    profile.ammoInventory[ammoId] = Math.max(0, Number(profile.ammoInventory[ammoId] || 0)) + Math.max(0, Math.round(Number(amount || 0)));
  }
  if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
  let nextUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1)));
  for(const [itemId, amount] of Object.entries(rewards.itemCounts || {})){
    const count = Math.max(0, Math.min(100, Math.round(Number(amount || 0))));
    for(let i = 0; i < count; i += 1){
      profile.inventoryItems.push({uid:`inv_${itemId}_${nextUid}`, itemId});
      nextUid += 1;
    }
  }
  for(const itemId of Array.isArray(rewards.items) ? rewards.items : []){
    profile.inventoryItems.push({uid:`inv_${itemId}_${nextUid}`, itemId});
    nextUid += 1;
  }
  profile.nextInventoryUid = nextUid;
}

export function claimServerQuest(profile, id){
  const quest = getQuest(String(id || ""));
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  normalizeQuestFields(profile);
  if(profile.completedQuestClaims?.[quest.id]) return {ok:false, reason:"Quete deja terminee."};
  if(!profile.activeQuestIds.includes(quest.id)) return {ok:false, reason:"Quete non active."};
  if(!canClaimQuest(profile, quest)) return {ok:false, reason:"Objectif non rempli."};
  addQuestRewards(profile, quest);
  profile.completedQuestClaims[quest.id] = true;
  delete profile.questFailProgress[quest.id];
  profile.activeQuestIds = profile.activeQuestIds.filter(questId=>questId !== quest.id).slice(0, MAX_ACTIVE_QUESTS);
  if(profile.activeQuestId === quest.id) profile.activeQuestId = profile.activeQuestIds[0] || null;
  return {ok:true, quest:deepClone(quest)};
}
