import { questCatalog, skills } from "../../../src/data/progression.js";
import { applyProgressionReward } from "../players/progression.js";

const MAX_ACTIVE_QUESTS = 5;

function deepClone(value){
  return JSON.parse(JSON.stringify(value ?? null));
}

function getQuest(id){
  return questCatalog.find(quest=>quest.id === id) || null;
}

function getQuestObjectives(quest){
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective];
  return objectives.filter(Boolean);
}

function getQuestObjectiveKey(objective = {}, index = 0){
  return objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
}

function getQuestObjectiveProgress(profile, questId, objective, index){
  if(objective?.type === "owned_combat_drone"){
    return Math.min(Math.max(0, Number(objective.count || 0)), Math.max(0, Number(profile.ownedDroneCount || 0)));
  }
  if(objective?.type === "equipped_ship"){
    const requiredShip = objective.shipId;
    return requiredShip && profile.activeShip === requiredShip ? Math.max(0, Number(objective.count || 1)) : 0;
  }
  if(objective?.type === "refinery_module_upgrade_start"){
    const targetLevel = Math.max(0, Number(objective.targetLevel || 0));
    const currentLevel = Math.max(0, Number(profile.refineryModules?.[objective.module] || 0));
    if(targetLevel > 0 && currentLevel >= targetLevel) return Math.max(0, Number(objective.count || 1));
  }
  if(objective?.type === "refinery_material_upgrade_start"){
    const targetLevel = Math.max(0, Number(objective.targetLevel || 0));
    const currentLevel = Math.max(0, Number(profile.refineryLevels?.[objective.material] || 0));
    if(targetLevel > 0 && currentLevel >= targetLevel) return Math.max(0, Number(objective.count || 1));
  }
  const stored = profile.questProgress?.[questId];
  if(typeof stored === "object" && stored !== null) return Math.max(0, Number(stored[getQuestObjectiveKey(objective, index)] || 0));
  return Math.max(0, Number(stored || 0));
}

function getQuestProgress(profile, quest){
  const stored = profile.questProgress?.[quest.id];
  if(typeof stored !== "object" || stored === null){
    const objectives = getQuestObjectives(quest);
    if(objectives.length === 1) return getQuestObjectiveProgress(profile, quest.id, objectives[0], 0);
    return Math.max(0, Number(stored || 0));
  }
  return getQuestObjectives(quest).reduce((sum, objective, index)=>sum + getQuestObjectiveProgress(profile, quest.id, objective, index), 0);
}

function canClaimQuest(profile, quest){
  if(!quest || profile.completedQuestClaims?.[quest.id]) return false;
  return getQuestObjectives(quest).every((objective, index)=>{
    const target = Math.max(0, Number(objective.count || 0));
    return getQuestObjectiveProgress(profile, quest.id, objective, index) >= target;
  });
}

function isQuestUnlocked(profile, quest){
  if(!quest?.unlock) return true;
  if(quest.unlock.type === "complete_level_quests"){
    const level = Number(quest.unlock.level || quest.requiredLevel || 1);
    const completed = profile.completedQuestClaims || {};
    return questCatalog
      .filter(entry=>entry.id !== quest.id && !entry.rare && Number(entry.requiredLevel || 1) === level && (entry.category || "normal") === (quest.category || "normal"))
      .every(entry=>completed[entry.id]);
  }
  return true;
}

function getInitialQuestFailProgress(quest){
  const result = {};
  if(quest?.failConditions?.hpLossLimit) result.hpLost = 0;
  if(quest?.failConditions?.timeLimit) result.timeElapsed = 0;
  if(quest?.failConditions?.deathResets) result.deathSafe = true;
  return result;
}

function normalizeQuestFields(profile){
  if(!Array.isArray(profile.activeQuestIds)) profile.activeQuestIds = [];
  if(!profile.questProgress || typeof profile.questProgress !== "object" || Array.isArray(profile.questProgress)) profile.questProgress = {};
  if(!profile.questFailProgress || typeof profile.questFailProgress !== "object" || Array.isArray(profile.questFailProgress)) profile.questFailProgress = {};
  if(!profile.completedQuestClaims || typeof profile.completedQuestClaims !== "object" || Array.isArray(profile.completedQuestClaims)) profile.completedQuestClaims = {};
  profile.activeQuestIds = profile.activeQuestIds
    .map(String)
    .filter(id=>getQuest(id) && !profile.completedQuestClaims[id])
    .slice(0, MAX_ACTIVE_QUESTS);
  if(!profile.activeQuestIds.includes(profile.activeQuestId)) profile.activeQuestId = profile.activeQuestIds[0] || null;
}

export function acceptServerQuest(profile, id){
  const quest = getQuest(String(id || ""));
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  normalizeQuestFields(profile);
  const requiredLevel = Number(quest.requiredLevel || 1);
  if(Number(profile.player?.level || 1) < requiredLevel) return {ok:false, reason:`Niveau ${requiredLevel} requis.`};
  if(!isQuestUnlocked(profile, quest)) return {ok:false, reason:"Quete rare verrouillee."};
  if(profile.completedQuestClaims?.[quest.id]) return {ok:false, reason:"Quete deja terminee."};
  if(profile.activeQuestIds.includes(quest.id)) return {ok:false, reason:"Quete deja en cours."};
  if(profile.activeQuestIds.length >= MAX_ACTIVE_QUESTS) return {ok:false, reason:`Maximum ${MAX_ACTIVE_QUESTS} quetes en cours.`};
  profile.activeQuestIds.push(quest.id);
  profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  const failProgress = getInitialQuestFailProgress(quest);
  if(Object.keys(failProgress).length) profile.questFailProgress[quest.id] = failProgress;
  return {ok:true, quest:deepClone(quest)};
}

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

function objectiveMatchesKill(objective, kind, zoneName){
  if(!objective || objective.type !== "kill") return false;
  if(objective.target && objective.target !== kind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

function objectiveMatchesAction(profile, objective = {}, action = {}){
  if(!objective || objective.type !== action.type) return false;
  if(action.type === "visit_map") return !objective.map || objective.map === action.mapName;
  if(action.type === "refinery_module_upgrade_start"){
    if(objective.module && objective.module !== action.moduleId) return false;
    if(Number(objective.targetLevel || 0) && Number(action.targetLevel || 0) < Number(objective.targetLevel || 0)) return false;
    return true;
  }
  if(action.type === "refinery_material_upgrade_start"){
    if(objective.material && objective.material !== action.materialId) return false;
    if(Number(objective.targetLevel || 0) && Number(action.targetLevel || 0) < Number(objective.targetLevel || 0)) return false;
    return true;
  }
  if(action.type === "space_caster_use") return true;
  if(action.type === "quest_item_drop") return objective.itemId && objective.itemId === action.itemId;
  if(action.type === "talk_npc" || action.type === "deliver_item"){
    if(objective.npcId && objective.npcId !== action.npcId) return false;
    if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(action.zoneName)) return false;
    if(objective.zone && objective.zone !== action.zoneName) return false;
    if(action.type === "deliver_item"){
      const count = Math.max(0, Number(objective.count || 0));
      const owned = Array.isArray(profile.inventoryItems)
        ? profile.inventoryItems.filter(item=>item?.itemId === objective.itemId).length
        : 0;
      return owned >= count;
    }
    return true;
  }
  if(action.type === "visit_coordinates"){
    if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(action.zoneName)) return false;
    if(objective.zone && objective.zone !== action.zoneName) return false;
    const scale = Math.max(1, Number(objective.scale || 10));
    const targetX = Number(objective.x || 0) * scale;
    const targetY = Number(objective.y || 0) * scale;
    const tolerance = Math.max(0, Number(objective.tolerance || 3)) * scale;
    return Math.hypot(Number(action.x || 0) - targetX, Number(action.y || 0) - targetY) <= tolerance;
  }
  return false;
}

function objectiveRequirementsMet(profile, quest, objective){
  const requiredIds = [
    ...(Array.isArray(objective?.requiresObjectives) ? objective.requiresObjectives : []),
    ...(objective?.requiresObjective ? [objective.requiresObjective] : [])
  ];
  if(!requiredIds.length) return true;
  const objectives = getQuestObjectives(quest);
  return requiredIds.every(requiredId=>{
    const index = objectives.findIndex(entry=>entry?.id === requiredId);
    if(index < 0) return false;
    const requiredObjective = objectives[index];
    const target = Math.max(0, Number(requiredObjective.count || 0));
    return getQuestObjectiveProgress(profile, quest.id, requiredObjective, index) >= target;
  });
}

function progressQuestObjective(profile, quest, objective, index){
  const objectives = getQuestObjectives(quest);
  const target = Math.max(0, Number(objective.count || 0));
  const key = getQuestObjectiveKey(objective, index);
  const previous = getQuestObjectiveProgress(profile, quest.id, objective, index);
  const next = Math.min(target, previous + 1);
  if(objectives.length > 1){
    if(typeof profile.questProgress[quest.id] !== "object" || profile.questProgress[quest.id] === null) profile.questProgress[quest.id] = {};
    profile.questProgress[quest.id][key] = next;
  }else{
    profile.questProgress[quest.id] = next;
  }
  const progress = getQuestProgress(profile, quest);
  return {
    id:quest.id,
    questId:quest.id,
    objectiveKey:key,
    progress,
    delta:Math.max(0, next - previous),
    objectiveProgress:next,
    target,
    completed:canClaimQuest(profile, quest)
  };
}

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
