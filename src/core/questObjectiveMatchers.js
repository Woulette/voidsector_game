import { getInventoryCount } from "./store.js";

export function objectiveMatchesKill(objective, kind, zoneName){
  if(!objective || objective.type !== "kill") return false;
  if(objective.target && objective.target !== kind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

export function objectiveMatchesRefineryModuleUpgradeStart(objective = {}, moduleId, targetLevel){
  if(objective.type !== "refinery_module_upgrade_start") return false;
  if(objective.module && objective.module !== moduleId) return false;
  if(Number(objective.targetLevel || 0) && Number(targetLevel || 0) < Number(objective.targetLevel || 0)) return false;
  return true;
}

export function objectiveMatchesRefineryMaterialUpgradeStart(objective = {}, materialId, targetLevel){
  if(objective.type !== "refinery_material_upgrade_start") return false;
  if(objective.material && objective.material !== materialId) return false;
  if(Number(objective.targetLevel || 0) && Number(targetLevel || 0) < Number(objective.targetLevel || 0)) return false;
  return true;
}

export function objectiveMatchesMapVisit(objective = {}, mapName){
  if(objective.type !== "visit_map") return false;
  if(objective.map && objective.map !== mapName) return false;
  return true;
}

export function objectiveMatchesSpaceCasterUse(objective = {}){
  return objective.type === "space_caster_use";
}

export function objectiveMatchesPortalComplete(objective = {}, portalId){
  if(objective.type !== "portal_complete") return false;
  if(objective.portalId && objective.portalId !== portalId) return false;
  return true;
}

export function objectiveMatchesMissionControl(objective = {}, stationId, mapName){
  if(objective.type !== "mission_control") return false;
  if(objective.stationId && objective.stationId !== stationId) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(mapName)) return false;
  if(objective.zone && objective.zone !== mapName) return false;
  return true;
}

export function objectiveMatchesCoordinateVisit(objective = {}, point = {}, mapName){
  if(objective.type !== "visit_coordinates") return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(mapName)) return false;
  if(objective.zone && objective.zone !== mapName) return false;
  const scale = Math.max(1, Number(objective.scale || 10));
  const targetX = Number(objective.x || 0) * scale;
  const targetY = Number(objective.y || 0) * scale;
  const tolerance = Math.max(0, Number(objective.tolerance || 3)) * scale;
  return Math.hypot(Number(point.x || 0) - targetX, Number(point.y || 0) - targetY) <= tolerance;
}

export function objectiveMatchesQuestItemDrop(objective = {}, kind, zoneName){
  if(objective.type !== "quest_item_drop") return false;
  if(objective.target && objective.target !== kind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

export function objectiveMatchesNpcTalk(objective = {}, npcId, mapName){
  if(objective.type !== "talk_npc" && objective.type !== "deliver_item") return false;
  if(objective.npcId && objective.npcId !== npcId) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(mapName)) return false;
  if(objective.zone && objective.zone !== mapName) return false;
  if(objective.type === "deliver_item" && getInventoryCount(objective.itemId) < Math.max(0, Number(objective.count || 0))) return false;
  return true;
}
