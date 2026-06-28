import { questCatalog } from "../../../src/data/progression.js";
import { normalizeFirmId } from "../../../src/data/firms.js";
import { isPremiumActive } from "../../../src/data/premium.js";

export const MAX_ACTIVE_QUESTS = 5;

export function deepClone(value){
  return JSON.parse(JSON.stringify(value ?? null));
}

export function getQuest(id){
  return questCatalog.find(quest=>quest.id === id) || null;
}

const QUEST_IDS_BY_SOURCE_AND_FIRM = new Map();
for(const quest of questCatalog){
  const sourceId = String(quest.sourceQuestId || quest.id || "");
  if(!sourceId) continue;
  if(!QUEST_IDS_BY_SOURCE_AND_FIRM.has(sourceId)) QUEST_IDS_BY_SOURCE_AND_FIRM.set(sourceId, new Map());
  QUEST_IDS_BY_SOURCE_AND_FIRM.get(sourceId).set(normalizeFirmId(quest.firmId || "astra"), quest.id);
}

export function questMatchesProfileFirm(profile, quest){
  if(!quest?.firmId) return true;
  return normalizeFirmId(quest.firmId) === normalizeFirmId(profile?.player?.firmId || "astra");
}

export function getProfileFirmQuestId(profile, questId){
  const id = String(questId || "");
  const quest = getQuest(id);
  if(!quest) return id;
  const profileFirmId = normalizeFirmId(profile?.player?.firmId || "astra");
  if(normalizeFirmId(quest.firmId || "astra") === profileFirmId) return id;
  const sourceId = String(quest.sourceQuestId || quest.id || "");
  return QUEST_IDS_BY_SOURCE_AND_FIRM.get(sourceId)?.get(profileFirmId) || id;
}

function isPlainObject(value){
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeQuestStateValue(existing, incoming){
  if(existing === undefined) return deepClone(incoming);
  if(isPlainObject(existing) && isPlainObject(incoming)){
    const merged = deepClone(existing);
    for(const [key, value] of Object.entries(incoming)){
      merged[key] = mergeQuestStateValue(merged[key], value);
    }
    return merged;
  }
  if(typeof existing === "boolean" || typeof incoming === "boolean") return Boolean(existing || incoming);
  const existingNumber = Number(existing || 0);
  const incomingNumber = Number(incoming || 0);
  if(Number.isFinite(existingNumber) && Number.isFinite(incomingNumber)){
    return Math.max(existingNumber, incomingNumber);
  }
  return existing ?? deepClone(incoming);
}

function migrateQuestStateToProfileFirm(profile){
  if(!profile || typeof profile !== "object") return;
  const remapId = id=>getProfileFirmQuestId(profile, id);
  profile.activeQuestIds = [...new Set((Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds : [])
    .map(remapId)
    .filter(Boolean))];
  if(profile.activeQuestId) profile.activeQuestId = remapId(profile.activeQuestId);
  for(const field of ["questProgress", "questFailProgress", "completedQuestClaims"]){
    const source = profile[field];
    if(!isPlainObject(source)) continue;
    for(const [id, value] of Object.entries({...source})){
      const targetId = remapId(id);
      if(!targetId || targetId === id) continue;
      source[targetId] = mergeQuestStateValue(source[targetId], value);
      delete source[id];
    }
  }
}

export function getQuestObjectives(quest){
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective];
  return objectives.filter(Boolean);
}

export function getQuestObjectiveKey(objective = {}, index = 0){
  return objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
}

export function getQuestObjectiveProgress(profile, questId, objective, index){
  if(objective?.type === "owned_combat_drone"){
    return Math.min(Math.max(0, Number(objective.count || 0)), Math.max(0, Number(profile.ownedDroneCount || 0)));
  }
  if(objective?.type === "owned_ship"){
    const requiredShip = String(objective.shipId || "");
    const ownedShips = Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : [];
    return requiredShip && ownedShips.includes(requiredShip) ? Math.max(0, Number(objective.count || 1)) : 0;
  }
  if(objective?.type === "equipped_ship"){
    const requiredShip = objective.shipId;
    return requiredShip && profile.activeShip === requiredShip ? Math.max(0, Number(objective.count || 1)) : 0;
  }
  if(objective?.type === "equipped_ship_lasers"){
    const target = Math.max(0, Number(objective.count || 0));
    const lasers = profile.shipLoadouts?.[profile.activeShip]?.lasers;
    const equipped = Array.isArray(lasers) ? lasers.filter(Boolean).length : 0;
    return Math.min(target, equipped);
  }
  if(objective?.type === "refinery_module_upgrade_start"){
    const targetLevel = Math.max(0, Number(objective.targetLevel || 0));
    const currentLevel = Math.max(0, Number(profile.refineryModules?.[objective.module] || 0));
    if(targetLevel > 0 && currentLevel >= targetLevel) return Math.max(0, Number(objective.count || 1));
    const jobs = profile.refineryUpgradeJobs && typeof profile.refineryUpgradeJobs === "object" ? Object.values(profile.refineryUpgradeJobs) : [];
    const hasMatchingJob = jobs.some(job=>
      job?.type === "module"
      && String(job.id || "") === String(objective.module || "")
      && Math.max(0, Number(job.toLevel || 0)) >= targetLevel
    );
    if(targetLevel > 0 && hasMatchingJob) return Math.max(0, Number(objective.count || 1));
  }
  if(objective?.type === "refinery_material_upgrade_start"){
    const targetLevel = Math.max(0, Number(objective.targetLevel || 0));
    const currentLevel = Math.max(0, Number(profile.refineryLevels?.[objective.material] || 0));
    if(targetLevel > 0 && currentLevel >= targetLevel) return Math.max(0, Number(objective.count || 1));
    const jobs = profile.refineryUpgradeJobs && typeof profile.refineryUpgradeJobs === "object" ? Object.values(profile.refineryUpgradeJobs) : [];
    const hasMatchingJob = jobs.some(job=>
      job?.type === "material"
      && String(job.id || "") === String(objective.material || "")
      && Math.max(0, Number(job.toLevel || 0)) >= targetLevel
    );
    if(targetLevel > 0 && hasMatchingJob) return Math.max(0, Number(objective.count || 1));
  }
  const stored = profile.questProgress?.[questId];
  if(typeof stored === "object" && stored !== null) return Math.max(0, Number(stored[getQuestObjectiveKey(objective, index)] || 0));
  return Math.max(0, Number(stored || 0));
}

export function getQuestProgress(profile, quest){
  const stored = profile.questProgress?.[quest.id];
  if(typeof stored !== "object" || stored === null){
    const objectives = getQuestObjectives(quest);
    if(objectives.length === 1) return getQuestObjectiveProgress(profile, quest.id, objectives[0], 0);
    return Math.max(0, Number(stored || 0));
  }
  return getQuestObjectives(quest).reduce((sum, objective, index)=>sum + getQuestObjectiveProgress(profile, quest.id, objective, index), 0);
}

export function canClaimQuest(profile, quest){
  if(!quest || profile.completedQuestClaims?.[quest.id]) return false;
  return getQuestObjectives(quest).every((objective, index)=>{
    const target = Math.max(0, Number(objective.count || 0));
    return getQuestObjectiveProgress(profile, quest.id, objective, index) >= target;
  });
}

export function isQuestUnlocked(profile, quest){
  if(!quest?.unlock) return true;
  if(quest.unlock.type === "complete_level_quests"){
    const level = Number(quest.unlock.level || quest.requiredLevel || 1);
    const completed = profile.completedQuestClaims || {};
    return questCatalog
      .filter(entry=>entry.id !== quest.id && questMatchesProfileFirm(profile, entry) && !entry.rare && Number(entry.requiredLevel || 1) === level && (entry.category || "normal") === (quest.category || "normal"))
      .every(entry=>completed[entry.id]);
  }
  if(quest.unlock.type === "complete_quest"){
    return Boolean(profile.completedQuestClaims?.[quest.unlock.questId]);
  }
  return true;
}

export function getInitialQuestFailProgress(quest, now = Date.now()){
  const result = {};
  if(quest?.failConditions?.hpLossLimit) result.hpLost = 0;
  if(quest?.failConditions?.timeLimit){
    result.timeElapsed = 0;
    result.timeStartedAt = now;
  }
  if(quest?.failConditions?.deathResets) result.deathSafe = true;
  return result;
}

export function normalizeQuestFields(profile){
  if(!Array.isArray(profile.activeQuestIds)) profile.activeQuestIds = [];
  if(!profile.questProgress || typeof profile.questProgress !== "object" || Array.isArray(profile.questProgress)) profile.questProgress = {};
  if(!profile.questFailProgress || typeof profile.questFailProgress !== "object" || Array.isArray(profile.questFailProgress)) profile.questFailProgress = {};
  if(!profile.completedQuestClaims || typeof profile.completedQuestClaims !== "object" || Array.isArray(profile.completedQuestClaims)) profile.completedQuestClaims = {};
  migrateQuestStateToProfileFirm(profile);
  profile.activeQuestIds = profile.activeQuestIds
    .map(String)
    .filter(id=>{
      const quest = getQuest(id);
      return quest && questMatchesProfileFirm(profile, quest) && !profile.completedQuestClaims[id];
    })
    .slice(0, MAX_ACTIVE_QUESTS);
  if(!profile.activeQuestIds.includes(profile.activeQuestId)) profile.activeQuestId = profile.activeQuestIds[0] || null;
}

export function acceptServerQuest(profile, id){
  const quest = getQuest(String(id || ""));
  if(!quest) return {ok:false, reason:"Quete introuvable."};
  normalizeQuestFields(profile);
  if(!questMatchesProfileFirm(profile, quest)) return {ok:false, reason:"Quete reservee a une autre firme."};
  const requiredLevel = Number(quest.requiredLevel || 1);
  if(Number(profile.player?.level || 1) < requiredLevel) return {ok:false, reason:`Niveau ${requiredLevel} requis.`};
  if((quest.category || "normal") === "weekly" && !isPremiumActive(profile.player)){
    return {ok:false, reason:"Premium requis pour les quetes hebdomadaires."};
  }
  if(!isQuestUnlocked(profile, quest)) return {ok:false, reason:"Quete rare verrouillee."};
  if(profile.completedQuestClaims?.[quest.id]) return {ok:false, reason:"Quete deja terminee."};
  if(profile.activeQuestIds.includes(quest.id)) return {ok:false, reason:"Quete deja en cours."};
  if(profile.activeQuestIds.length >= MAX_ACTIVE_QUESTS) return {ok:false, reason:`Maximum ${MAX_ACTIVE_QUESTS} quetes en cours.`};
  profile.activeQuestIds.push(quest.id);
  if(!profile.activeQuestId) profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = getQuestObjectives(quest).length > 1 ? {} : 0;
  const failProgress = getInitialQuestFailProgress(quest);
  if(Object.keys(failProgress).length) profile.questFailProgress[quest.id] = failProgress;
  return {ok:true, quest:deepClone(quest)};
}

export function trackServerQuest(profile, id){
  normalizeQuestFields(profile);
  const questId = String(id || "");
  if(!profile.activeQuestIds.includes(questId)) return {ok:false, reason:"Quete non active."};
  profile.activeQuestId = questId;
  return {ok:true, quest:deepClone(getQuest(questId))};
}

export function objectiveRequirementsMet(profile, quest, objective){
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

export function progressQuestObjective(profile, quest, objective, index, increment = 1){
  const objectives = getQuestObjectives(quest);
  const target = Math.max(0, Number(objective.count || 0));
  const key = getQuestObjectiveKey(objective, index);
  const previous = getQuestObjectiveProgress(profile, quest.id, objective, index);
  const next = Math.min(target, previous + Math.max(1, Number(increment || 1)));
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
