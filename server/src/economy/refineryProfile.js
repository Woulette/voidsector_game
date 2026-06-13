import { refineryMaterialCatalog, ships } from "../../../src/data/catalog.js";
import { REFINERY_MODULES } from "./refineryRules.js";

export function getRawMaterial(id){
  return refineryMaterialCatalog.find(material=>material.id === id) || null;
}

export function getMaterialCount(profile, id){
  return Math.max(0, Number(profile.cargoHold?.[id] || 0));
}

export function setMaterialCount(profile, id, amount){
  if(!getRawMaterial(id)) return false;
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  profile.cargoHold[id] = Math.max(0, Math.round(Number(amount || 0)));
  return true;
}

export function addMaterial(profile, id, amount){
  if(!getRawMaterial(id)) return false;
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  profile.cargoHold[id] = getMaterialCount(profile, id) + Math.max(0, Math.round(Number(amount || 0)));
  return true;
}

export function consumeMaterial(profile, id, amount){
  const need = Math.max(0, Math.round(Number(amount || 0)));
  if(getMaterialCount(profile, id) < need) return false;
  profile.cargoHold[id] = getMaterialCount(profile, id) - need;
  return true;
}

export function getShip(shipId){
  return ships.find(ship=>ship.id === shipId) || null;
}

export function getShipCargo(profile, shipId = profile.activeShip){
  const ship = getShip(shipId);
  if(!ship) return null;
  if(!profile.shipCargo || typeof profile.shipCargo !== "object") profile.shipCargo = {};
  if(!profile.shipCargo[ship.id] || typeof profile.shipCargo[ship.id] !== "object") profile.shipCargo[ship.id] = {};
  for(const material of refineryMaterialCatalog){
    profile.shipCargo[ship.id][material.id] = Math.max(0, Number(profile.shipCargo[ship.id][material.id] || 0));
  }
  return profile.shipCargo[ship.id];
}

export function getShipCargoUsed(profile, shipId = profile.activeShip){
  const cargo = getShipCargo(profile, shipId);
  if(!cargo) return 0;
  return refineryMaterialCatalog.reduce((sum, material)=>sum + Math.max(0, Number(cargo[material.id] || 0)), 0);
}

export function getShipCargoCapacity(shipId){
  return Math.max(0, Math.round(Number(getShip(shipId)?.stats?.cargo || 0)));
}

export function addShipCargoMaterial(profile, id, amount, shipId = profile.activeShip){
  if(!getRawMaterial(id)) return {added:0, remaining:Math.max(0, Number(amount || 0))};
  const cargo = getShipCargo(profile, shipId);
  if(!cargo) return {added:0, remaining:Math.max(0, Number(amount || 0))};
  const requested = Math.max(0, Math.ceil(Number(amount || 0)));
  const free = Math.max(0, getShipCargoCapacity(shipId) - getShipCargoUsed(profile, shipId));
  const added = Math.min(requested, free);
  if(added > 0) cargo[id] = Math.max(0, Number(cargo[id] || 0)) + added;
  return {added, remaining:requested - added};
}

export function consumeShipCargoMaterial(profile, id, amount, shipId = profile.activeShip){
  const cargo = getShipCargo(profile, shipId);
  if(!cargo || !getRawMaterial(id)) return false;
  const need = Math.max(0, Number(amount || 0));
  if(Math.max(0, Number(cargo[id] || 0)) < need) return false;
  cargo[id] -= need;
  return true;
}

export function getDefaultRefineryLevel(id){
  const material = getRawMaterial(id);
  return material?.kind === "raw" ? 1 : 0;
}

export function getRefineryMaterialLevel(profile, id){
  const material = getRawMaterial(id);
  const max = Number(material?.maxLevel || 20);
  return Math.max(0, Math.min(max, Number(profile.refineryLevels?.[id] ?? getDefaultRefineryLevel(id))));
}

export function getRefineryModuleLevel(profile, id){
  const def = REFINERY_MODULES[id];
  if(!def) return 0;
  return Math.max(1, Math.min(def.maxLevel, Number(profile.refineryModules?.[id] || 1)));
}

export function isRefineryProductionEnabled(profile, id){
  return Boolean(getRawMaterial(id)) && !profile.refineryProductionDisabled?.[id];
}

export function toggleServerRefineryProduction(profile, id){
  if(!getRawMaterial(String(id || ""))) return {ok:false, reason:"Materiau introuvable."};
  if(!profile.refineryProductionDisabled || typeof profile.refineryProductionDisabled !== "object") profile.refineryProductionDisabled = {};
  profile.refineryProductionDisabled[id] = !profile.refineryProductionDisabled[id];
  return {ok:true, id, enabled:!profile.refineryProductionDisabled[id]};
}
