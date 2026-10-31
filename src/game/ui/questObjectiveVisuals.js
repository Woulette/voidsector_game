import { droneCatalog, equipment, portals, rawMaterialCatalog, ships } from "../../data/catalog.js?v=20260726-kharon1";
import { isRickyNpc, RICKY_SAUCER_ASSET } from "../../data/rickyVisuals.js?v=20261024-ricky-visuals1";

export function getQuestMaterialImage(id, materials = []){
  return (rawMaterialCatalog.find(entry=>entry.id === id) || materials.find(entry=>entry.id === id))?.img || "assets/materials/cargo_box.svg";
}

// Resolve the same catalogue assets used by the shop, hangar, refinery and portal page.
export function getQuestObjectiveImage(objective = {}){
  switch(objective.type){
    case "equipped_ship_lasers": return equipment.find(entry=>entry.id === "laser_mk1")?.img || null;
    case "refinery_material_upgrade_start": return getQuestMaterialImage(objective.material);
    case "owned_ship":
    case "equipped_ship": return (ships.find(entry=>entry.id === objective.shipId) || ships.find(entry=>entry.id === "velox"))?.img || null;
    case "owned_combat_drone": return droneCatalog[0]?.img || null;
    case "portal_complete":
    case "space_caster_use": {
      const id = objective.portalId || objective.portal || "blue";
      return portals.find(entry=>entry.id === id)?.img || "assets/portals/sector-travel/gate-rim-v1.png";
    }
    case "quest_item_drop": return objective.itemImg || "assets/quest_items/contaminated_sample.png";
    case "deliver_item": return objective.itemImg || equipment.find(entry=>entry.id === objective.itemId)?.img || "assets/quest_items/teleportation_fluid.png";
    case "talk_npc": return isRickyNpc(objective) ? RICKY_SAUCER_ASSET : objective.npcImg || "assets/ships/npc/npc_saucer.png";
    default: return null;
  }
}

export function getQuestCategoryImage(category, quest = {}){
  const types = {laser:["equipped_ship_lasers"], collect:["quest_item_drop"], portal:["portal_complete","space_caster_use"]}[category];
  if(!types) return null;
  const objectives = (Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective]).filter(Boolean);
  const objective = objectives.find(entry=>types.includes(entry.type));
  if(objective) return getQuestObjectiveImage(objective);
  if(category === "laser") return getQuestObjectiveImage({type:"equipped_ship_lasers"});
  if(category === "portal") return getQuestObjectiveImage({type:"space_caster_use"});
  return getQuestMaterialImage("silice_conductrice");
}
