import { rawMaterialCatalog } from "../data/catalog.js";
import { getMaterialStorageCap } from "./refineryStore.js";
import { getRawMaterial, getShipCombatStats, store } from "./store.js";
export function getMaterialCount(id){
  return Math.max(0, Number(store.state?.cargoHold?.[id] || 0));
}

export function addMaterial(id, amount=1){
  if(!getRawMaterial(id)) return 0;
  if(!store.state.cargoHold) store.state.cargoHold = {};
  const current = getMaterialCount(id);
  const cap = getMaterialStorageCap(id);
  store.state.cargoHold[id] = Math.min(cap, current + Math.max(0, Number(amount || 0)));
  return store.state.cargoHold[id];
}

export function consumeMaterial(id, amount=1){
  const need = Math.max(0, Number(amount || 0));
  if(getMaterialCount(id) < need) return false;
  store.state.cargoHold[id] -= need;
  return true;
}

export function consumeShipCargoMaterial(id, amount=1, shipId = store.state.activeShip){
  if(!getRawMaterial(id)) return false;
  const need = Math.max(0, Number(amount || 0));
  const cargo = getShipCargo(shipId);
  if(Math.max(0, Number(cargo[id] || 0)) < need) return false;
  cargo[id] -= need;
  return true;
}

export function getCargoUsed(){
  return rawMaterialCatalog.reduce((sum, item)=>sum + getMaterialCount(item.id), 0);
}

function makeEmptyMaterialCargo(){
  return rawMaterialCatalog.reduce((cargo, material)=>{
    cargo[material.id] = 0;
    return cargo;
  }, {});
}

export function getShipCargo(shipId = store.state.activeShip){
  if(!store.state.shipCargo || typeof store.state.shipCargo !== "object") store.state.shipCargo = {};
  if(!store.state.shipCargo[shipId] || typeof store.state.shipCargo[shipId] !== "object"){
    store.state.shipCargo[shipId] = makeEmptyMaterialCargo();
  }
  for(const material of rawMaterialCatalog){
    store.state.shipCargo[shipId][material.id] = Math.max(0, Number(store.state.shipCargo[shipId][material.id] || 0));
  }
  return store.state.shipCargo[shipId];
}

export function getShipCargoUsed(shipId = store.state.activeShip){
  const cargo = getShipCargo(shipId);
  return rawMaterialCatalog.reduce((sum, material)=>sum + Math.max(0, Number(cargo[material.id] || 0)), 0);
}

export function getShipCargoCapacity(shipId = store.state.activeShip){
  return Math.max(0, Math.round(Number(getShipCombatStats(shipId).cargo || 0)));
}

export function addShipCargoMaterial(id, amount=1, shipId = store.state.activeShip){
  if(!getRawMaterial(id)) return {added:0, remaining:Math.max(0, Number(amount || 0)), used:getShipCargoUsed(shipId), capacity:getShipCargoCapacity(shipId)};
  const requested = Math.max(0, Math.ceil(Number(amount || 0)));
  const capacity = getShipCargoCapacity(shipId);
  const used = getShipCargoUsed(shipId);
  const free = Math.max(0, capacity - used);
  const added = Math.min(requested, free);
  if(added > 0){
    const cargo = getShipCargo(shipId);
    cargo[id] = Math.max(0, Number(cargo[id] || 0)) + added;
  }
  return {added, remaining:requested - added, used:getShipCargoUsed(shipId), capacity};
}

