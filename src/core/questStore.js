import * as cargoStore from "./cargoStore.js";
import { questCatalog, skills } from "../data/catalog.js";
import { addAmmo, addInventoryItem, addPortalPiece, addXP, getInventoryCount, getQuest, removeInventoryItems, store } from "./store.js";

const MAX_ACTIVE_QUESTS = 5;

function getInitialQuestFailProgress(quest){
  const result = {};
  if(quest?.failConditions?.hpLossLimit) result.hpLost = 0;
  if(quest?.failConditions?.timeLimit) result.timeElapsed = 0;
  if(quest?.failConditions?.deathResets) result.deathSafe = true;
  return result;
}

export function getActiveQuest(){
  return getQuest(store.state.activeQuestId) || null;
}

export function getActiveQuests(){
  const ids = Array.isArray(store.state?.activeQuestIds) ? store.state.activeQuestIds : [];
  return ids.map(id=>getQuest(id)).filter(Boolean);
}

export function getQuestProgress(id){
  const quest = getQuest(id);
  const stored = store.state?.questProgress?.[id];
  if(!quest) return Math.max(0, Number(stored || 0));
  if(typeof stored !== "object" || stored === null){
    const objectives = getQuestObjectives(quest);
    if(objectives.length === 1) return getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(objectives[0], 0));
    return Math.max(0, Number(stored || 0));
  }
  return getQuestObjectives(quest).reduce((sum, objective, index)=>sum + getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(objective, index)), 0);
}

export function getQuestObjectives(quest){
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective];
  return objectives.filter(Boolean);
}

export function getQuestObjectiveKey(objective = {}, index = 0){
  return objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
}

export function getQuestObjectiveProgress(id, objectiveKey){
  const quest = getQuest(id);
  const objectiveEntry = quest ? getQuestObjectives(quest).map((objective, index)=>({objective, index})).find(entry=>getQuestObjectiveKey(entry.objective, entry.index) === objectiveKey) : null;
  if(objectiveEntry?.objective?.type === "owned_combat_drone"){
    return Math.min(Math.max(0, Number(objectiveEntry.objective.count || 0)), Math.max(0, Number(store.state?.ownedDroneCount || 0)));
  }
  if(objectiveEntry?.objective?.type === "equipped_ship"){
    const requiredShip = objectiveEntry.objective.shipId;
    return requiredShip && store.state?.activeShip === requiredShip ? Math.max(0, Number(objectiveEntry.objective.count || 1)) : 0;
  }
  const stored = store.state?.questProgress?.[id];
  if(typeof stored === "object" && stored !== null) return Math.max(0, Number(stored[objectiveKey] || 0));
  return Math.max(0, Number(stored || 0));
}

export function getQuestTargetTotal(quest){
  return getQuestObjectives(quest).reduce((sum, objective)=>sum + Math.max(0, Number(objective.count || 0)), 0);
}

export function canClaimQuest(id){
  const quest = getQuest(id);
  if(!quest) return false;
  if(store.state.completedQuestClaims?.[id]) return false;
  return getQuestObjectives(quest).every((objective, index)=>{
    const target = Math.max(0, Number(objective.count || 0));
    return getQuestObjectiveProgress(id, getQuestObjectiveKey(objective, index)) >= target;
  });
}

export function isQuestUnlocked(quest){
  if(!quest?.unlock) return true;
  if(quest.unlock.type === "complete_level_quests"){
    const level = Number(quest.unlock.level || quest.requiredLevel || 1);
    const completed = store.state.completedQuestClaims || {};
    return questCatalog
      .filter(entry=>entry.id !== quest.id && !entry.rare && Number(entry.requiredLevel || 1) === level && (entry.category || "normal") === (quest.category || "normal"))
      .every(entry=>completed[entry.id]);
  }
  return true;
}

export function acceptQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  const requiredLevel = Number(quest.requiredLevel || 1);
  if(Number(store.state.player?.level || 1) < requiredLevel) return {ok:false, reason:`Niveau ${requiredLevel} requis.`};
  if(!isQuestUnlocked(quest)) return {ok:false, reason:"Quete rare verrouillee."};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quete deja terminee."};
  if(!Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = [];
  store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>getQuest(questId) && !store.state.completedQuestClaims?.[questId]).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestIds.includes(id)) return {ok:false, reason:"Quete deja en cours."};
  if(store.state.activeQuestIds.length >= MAX_ACTIVE_QUESTS) return {ok:false, reason:`Maximum ${MAX_ACTIVE_QUESTS} quetes en cours.`};
  store.state.activeQuestIds.push(id);
  store.state.activeQuestId = id;
  if(!store.state.questProgress) store.state.questProgress = {};
  if(!store.state.questProgress[id]) store.state.questProgress[id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  const failProgress = getInitialQuestFailProgress(quest);
  if(Object.keys(failProgress).length) store.state.questFailProgress[id] = failProgress;
  return {ok:true, quest};
}

function objectiveMatchesKill(objective, kind, zoneName){
  if(!objective || objective.type !== "kill") return false;
  if(objective.target && objective.target !== kind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

function objectiveRequirementsMet(quest, objective){
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
    return getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(requiredObjective, index)) >= target;
  });
}

function canProgressQuest(quest){
  if(!quest || store.state.completedQuestClaims?.[quest.id]) return false;
  return getQuestObjectives(quest).some((objective, index)=>{
    const target = Math.max(0, Number(objective.count || 0));
    return objectiveRequirementsMet(quest, objective) && getQuestObjectiveProgress(quest.id, getQuestObjectiveKey(objective, index)) < target;
  });
}

function progressQuestObjective(quest, objective, index){
  if(!store.state.questProgress) store.state.questProgress = {};
  const objectives = getQuestObjectives(quest);
  const target = Math.max(0, Number(objective.count || 0));
  const key = getQuestObjectiveKey(objective, index);
  if(objective.type === "deliver_item" && objective.consumeItems){
    if(!removeInventoryItems(objective.itemId, target)) return false;
  }
  const increment = objective.type === "deliver_item" ? target : 1;
  const next = Math.min(target, getQuestObjectiveProgress(quest.id, key) + increment);
  if(objectives.length > 1){
    if(typeof store.state.questProgress[quest.id] !== "object" || store.state.questProgress[quest.id] === null) store.state.questProgress[quest.id] = {};
    store.state.questProgress[quest.id][key] = next;
  }else{
    store.state.questProgress[quest.id] = next;
  }
  return canClaimQuest(quest.id);
}

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

export function recordQuestKill(kind, zoneName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  let completed = false;
  const trackedQuest = getQuest(store.state.activeQuestId);
  const trackedMatch = findMatchingObjective(trackedQuest, objective=>objectiveMatchesKill(objective, kind, zoneName));
  if(trackedQuest && activeIds.includes(trackedQuest.id) && canProgressQuest(trackedQuest) && trackedMatch){
    completed = progressQuestObjective(trackedQuest, trackedMatch.objective, trackedMatch.index) || completed;
  }else{
    const fallback = activeIds
      .map(id=>getQuest(id))
      .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesKill(objective, kind, zoneName))}))
      .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
    if(fallback) completed = progressQuestObjective(fallback.quest, fallback.match.objective, fallback.match.index) || completed;
  }
  return completed;
}

function objectiveMatchesRefineryModuleUpgradeStart(objective = {}, moduleId, targetLevel){
  if(objective.type !== "refinery_module_upgrade_start") return false;
  if(objective.module && objective.module !== moduleId) return false;
  if(Number(objective.targetLevel || 0) && Number(targetLevel || 0) !== Number(objective.targetLevel || 0)) return false;
  return true;
}

function objectiveMatchesRefineryMaterialUpgradeStart(objective = {}, materialId, targetLevel){
  if(objective.type !== "refinery_material_upgrade_start") return false;
  if(objective.material && objective.material !== materialId) return false;
  if(Number(objective.targetLevel || 0) && Number(targetLevel || 0) !== Number(objective.targetLevel || 0)) return false;
  return true;
}

function objectiveMatchesMapVisit(objective = {}, mapName){
  if(objective.type !== "visit_map") return false;
  if(objective.map && objective.map !== mapName) return false;
  return true;
}

function objectiveMatchesSpaceCasterUse(objective = {}){
  return objective.type === "space_caster_use";
}

function objectiveMatchesCoordinateVisit(objective = {}, point = {}, mapName){
  if(objective.type !== "visit_coordinates") return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(mapName)) return false;
  if(objective.zone && objective.zone !== mapName) return false;
  const scale = Math.max(1, Number(objective.scale || 10));
  const targetX = Number(objective.x || 0) * scale;
  const targetY = Number(objective.y || 0) * scale;
  const tolerance = Math.max(0, Number(objective.tolerance || 3)) * scale;
  return Math.hypot(Number(point.x || 0) - targetX, Number(point.y || 0) - targetY) <= tolerance;
}

function objectiveMatchesQuestItemDrop(objective = {}, kind, zoneName){
  if(objective.type !== "quest_item_drop") return false;
  if(objective.target && objective.target !== kind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

function objectiveMatchesNpcTalk(objective = {}, npcId, mapName){
  if(objective.type !== "talk_npc" && objective.type !== "deliver_item") return false;
  if(objective.npcId && objective.npcId !== npcId) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(mapName)) return false;
  if(objective.zone && objective.zone !== mapName) return false;
  if(objective.type === "deliver_item" && getInventoryCount(objective.itemId) < Math.max(0, Number(objective.count || 0))) return false;
  return true;
}

export function rollQuestItemDropFromKill(kind, zoneName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return null;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    if(!quest || !canProgressQuest(quest)) continue;
    const match = findMatchingObjective(quest, objective=>objectiveMatchesQuestItemDrop(objective, kind, zoneName));
    if(!match) continue;
    const chance = Math.max(0, Math.min(1, Number(match.objective.dropChance || 1)));
    if(Math.random() > chance) continue;
    return {
      questId:quest.id,
      objectiveId:match.objective.id || null,
      itemId:match.objective.itemId,
      itemName:match.objective.itemName || match.objective.label || "Objet de quete",
      itemImg:match.objective.itemImg || "assets/quest_items/contaminated_sample.png"
    };
  }
  return null;
}

export function recordQuestItemPickup(itemId){
  if(!itemId || !Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objective.type === "quest_item_drop" && objective.itemId === itemId)}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  progressQuestObjective(matching.quest, matching.match.objective, matching.match.index);
  return true;
}

function findMatchingObjective(quest, predicate){
  if(!quest) return null;
  return getQuestObjectives(quest).map((objective, index)=>({objective, index})).find(entry=>{
    const target = Math.max(0, Number(entry.objective.count || 0));
    const key = getQuestObjectiveKey(entry.objective, entry.index);
    return objectiveRequirementsMet(quest, entry.objective) && getQuestObjectiveProgress(quest.id, key) < target && predicate(entry.objective);
  }) || null;
}

export function recordQuestRefineryModuleUpgradeStart(moduleId, targetLevel){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesRefineryModuleUpgradeStart(objective, moduleId, targetLevel))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  return matching ? progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) : false;
}

export function recordQuestRefineryMaterialUpgradeStart(materialId, targetLevel){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesRefineryMaterialUpgradeStart(objective, materialId, targetLevel))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  return matching ? progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) : false;
}

export function recordQuestMapVisit(mapName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesMapVisit(objective, mapName))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  return matching ? progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) : false;
}

export function recordQuestSpaceCasterUse(amount = 1){
  const increment = Math.max(1, Math.floor(Number(amount || 1)));
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesSpaceCasterUse(objective))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  let completed = false;
  for(let i = 0; i < increment; i++) completed = progressQuestObjective(matching.quest, matching.match.objective, matching.match.index) || completed;
  return completed;
}

export function recordQuestCoordinateVisit(point, mapName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesCoordinateVisit(objective, point, mapName))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  progressQuestObjective(matching.quest, matching.match.objective, matching.match.index);
  return true;
}

export function recordQuestNpcTalk(npcId, mapName){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return false;
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  const trackedQuest = getQuest(store.state.activeQuestId);
  const trackedMatch = findMatchingObjective(trackedQuest, objective=>objectiveMatchesNpcTalk(objective, npcId, mapName));
  if(trackedQuest && activeIds.includes(trackedQuest.id) && canProgressQuest(trackedQuest) && trackedMatch){
    progressQuestObjective(trackedQuest, trackedMatch.objective, trackedMatch.index);
    return true;
  }
  const matching = activeIds
    .map(id=>getQuest(id))
    .map(quest=>({quest, match:findMatchingObjective(quest, objective=>objectiveMatchesNpcTalk(objective, npcId, mapName))}))
    .find(entry=>entry.quest && canProgressQuest(entry.quest) && entry.match);
  if(!matching) return false;
  progressQuestObjective(matching.quest, matching.match.objective, matching.match.index);
  return true;
}

function resetQuestRun(quest){
  if(!quest) return;
  if(!store.state.questProgress) store.state.questProgress = {};
  store.state.questProgress[quest.id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  store.state.questFailProgress[quest.id] = getInitialQuestFailProgress(quest);
}

function removeActiveQuest(id){
  if(Array.isArray(store.state.activeQuestIds)) store.state.activeQuestIds = store.state.activeQuestIds.filter(questId=>questId !== id).slice(0, MAX_ACTIVE_QUESTS);
  if(store.state.activeQuestId === id) store.state.activeQuestId = store.state.activeQuestIds?.[0] || null;
}

export function recordQuestHpLoss(amount){
  const hpLoss = Math.max(0, Number(amount || 0));
  if(hpLoss <= 0 || !Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return [];
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  const failed = [];
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    const limit = Math.max(0, Number(quest?.failConditions?.hpLossLimit || 0));
    if(!quest || !limit) continue;
    const state = store.state.questFailProgress[id] || {hpLost:0};
    const next = Math.max(0, Number(state.hpLost || 0)) + hpLoss;
    store.state.questFailProgress[id] = {...state, hpLost:next};
    if(next > limit){
      resetQuestRun(quest);
      failed.push(quest);
    }
  }
  return failed;
}

export function recordQuestTimeElapsed(seconds){
  const elapsed = Math.max(0, Number(seconds || 0));
  if(elapsed <= 0 || !Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return [];
  if(!store.state.questFailProgress || typeof store.state.questFailProgress !== "object") store.state.questFailProgress = {};
  const failed = [];
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    const limit = Math.max(0, Number(quest?.failConditions?.timeLimit || 0));
    if(!quest || !limit) continue;
    if(canClaimQuest(id)) continue;
    const state = store.state.questFailProgress[id] || getInitialQuestFailProgress(quest);
    const next = Math.max(0, Number(state.timeElapsed || 0)) + elapsed;
    store.state.questFailProgress[id] = {...state, timeElapsed:next};
    if(next >= limit){
      resetQuestRun(quest);
      removeActiveQuest(id);
      failed.push(quest);
    }
  }
  return failed;
}

export function recordQuestDeath(){
  if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.length) return [];
  const failed = [];
  const activeIds = store.state.activeQuestIds.filter(id=>getQuest(id) && !store.state.completedQuestClaims?.[id]).slice(0, MAX_ACTIVE_QUESTS);
  for(const id of activeIds){
    const quest = getQuest(id);
    if(!quest?.failConditions?.deathResets) continue;
    resetQuestRun(quest);
    failed.push(quest);
  }
  return failed;
}

export function claimQuest(id){
  const quest = getQuest(id);
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  if(store.state.completedQuestClaims?.[id]) return {ok:false, reason:"Quete deja terminee."};
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

