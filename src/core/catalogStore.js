import { ammoTypes, droneCatalog, droneFormations, equipment, portals, questCatalog, rawMaterialCatalog, refineryMaterialCatalog, refineryRecipes, ships } from "../data/catalog.js";
import { store } from "./store.js";

export function getShip(id){ return ships.find(ship=>ship.id === id) || ships[0]; }
export function getItem(id){ return equipment.find(item=>item.id === id); }
export function getAmmo(id){ return ammoTypes.find(ammo=>ammo.id === id) || null; }
export function getDroneCatalog(id = "combat_drone"){ return droneCatalog.find(drone=>drone.id === id) || droneCatalog[0]; }
export function getDroneFormation(id){ return droneFormations.find(formation=>formation.id === id) || null; }
export function getActiveDroneFormation(){
  const formation = getDroneFormation(store.state.activeDroneFormation);
  return formation && store.state.ownedDroneFormations?.includes(formation.id) ? formation : null;
}
export function getDroneFormationBonus(){ return getActiveDroneFormation()?.effect || {}; }
export function isWeapon(id){ return getItem(id)?.category === "canon"; }
export function isGenerator(id){ return getItem(id)?.category === "generateur"; }
export function getPortal(id){ return portals.find(portal=>portal.id === id) || null; }
export function getQuest(id){ return questCatalog.find(quest=>quest.id === id) || null; }
export function getAllQuests(){ return questCatalog.slice(); }
export function getRawMaterial(id){ return rawMaterialCatalog.find(item=>item.id === id) || null; }
export function getAllRawMaterials(){ return rawMaterialCatalog.slice(); }
export function getRefineryMaterial(id){ return refineryMaterialCatalog.find(item=>item.id === id) || null; }
export function getAllRefineryMaterials(){ return refineryMaterialCatalog.slice(); }
export function getRefineryRecipe(id){ return refineryRecipes.find(recipe=>recipe.id === id) || null; }
export function getRefineryRecipes(){ return refineryRecipes.slice(); }
