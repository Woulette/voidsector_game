export function objectiveMatchesKill(objective, kind, zoneName){
  if(!objective || objective.type !== "kill") return false;
  if(objective.target && objective.target !== kind) return false;
  if(Array.isArray(objective.zones) && objective.zones.length && !objective.zones.includes(zoneName)) return false;
  if(objective.zone && objective.zone !== zoneName) return false;
  return true;
}

export function objectiveMatchesAction(profile, objective = {}, action = {}){
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
      if(objective.itemId && objective.itemId !== action.itemId) return false;
      const count = Math.max(0, Number(objective.count || 0));
      const owned = getInventoryItemCount(profile, objective.itemId);
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
import { getInventoryItemCount } from "../economy/inventoryStacks.js";
