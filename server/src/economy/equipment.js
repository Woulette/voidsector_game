import {ammoTypes, equipment, droneCatalog} from "../../../src/data/equipment.js";
import { rawMaterialCatalog } from "../../../src/data/progression.js";
import {ships} from "../../../src/data/ships.js";
import { findMatchingExtraGroupIndex, getExtraEquipGroup } from "../../../src/shared/equipmentRules.js";

export function getServerItem(id){
  return equipment.find(item=>item.id === id) || null;
}

export function getServerAmmo(id){
  return ammoTypes.find(item=>item.id === id) || null;
}

export function getServerShip(id){
  return ships.find(ship=>ship.id === id) || null;
}

export function getServerDroneCatalog(){
  return droneCatalog[0] || {maxOwned:0};
}

export function isDroneCompatibleEquipment(item){
  if(item?.category === "canon") return true;
  if(item?.category !== "generateur") return false;
  return Number(item.stats?.bouclier || 0) > 0 || Number(item.stats?.regen || 0) > 0;
}

export function isDronePermanentUpgradeItem(item){
  return item?.slotType === "droneUpgrade" || item?.category === "drone_upgrade";
}

export function makeEmptyLoadout(shipId){
  const ship = getServerShip(shipId);
  if(!ship) return null;
  return {
    lasers:Array(ship.stats.maxLasers).fill(null),
    missileLauncher:null,
    rocketLauncher:null,
    generators:Array(ship.stats.maxGenerators).fill(null),
    extras:Array(ship.stats.maxExtras || 3).fill(null)
  };
}

export function getInventoryEntry(profile, uid){
  return Array.isArray(profile?.inventoryItems)
    ? profile.inventoryItems.find(entry=>entry.uid === uid) || null
    : null;
}

export function getItemFromInventoryUid(profile, uid){
  const entry = getInventoryEntry(profile, uid);
  return entry ? getServerItem(entry.itemId) : null;
}

export function ensureProfileLoadout(profile, shipId){
  if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
  if(!profile.shipLoadouts[shipId]) profile.shipLoadouts[shipId] = makeEmptyLoadout(shipId);
  return profile.shipLoadouts[shipId] || null;
}

export function ensureDroneLoadout(profile){
  const maxOwned = Math.max(0, Math.min(Number(getServerDroneCatalog().maxOwned || 0), Number(profile.ownedDroneCount || 0)));
  profile.droneLoadout = Array.isArray(profile.droneLoadout) ? profile.droneLoadout : [];
  while(profile.droneLoadout.length < maxOwned) profile.droneLoadout.push(null);
  if(profile.droneLoadout.length > maxOwned) profile.droneLoadout.length = maxOwned;
  return profile.droneLoadout;
}

export function cleanupDuplicateEquippedInventoryUids(profile){
  if(!profile || typeof profile !== "object") return false;
  const inventoryUids = new Set((profile.inventoryItems || [])
    .map(entry=>String(entry?.uid || ""))
    .filter(Boolean));
  const used = new Set();
  let changed = false;

  const keepOnce = value=>{
    if(!value) return null;
    const uid = String(value);
    if(!inventoryUids.has(uid) || used.has(uid)){
      changed = true;
      return null;
    }
    used.add(uid);
    return uid;
  };

  const shipLoadouts = profile.shipLoadouts && typeof profile.shipLoadouts === "object" ? profile.shipLoadouts : {};
  const shipIds = Object.keys(shipLoadouts).sort((a, b)=>{
    if(a === "orion") return -1;
    if(b === "orion") return 1;
    return 0;
  });
  for(const shipId of shipIds){
    const loadout = shipLoadouts[shipId];
    if(!loadout || typeof loadout !== "object") continue;
    for(const part of ["lasers", "generators"]){
      if(!Array.isArray(loadout[part])) continue;
      const next = loadout[part].map(keepOnce);
      if(next.some((uid, index)=>uid !== loadout[part][index])) changed = true;
      loadout[part] = next;
    }
    if(Array.isArray(loadout.extras)){
      const usedExtraGroups = new Set();
      const next = loadout.extras.map(value=>{
        const uid = keepOnce(value);
        if(!uid) return null;
        const group = getExtraEquipGroup(getItemFromInventoryUid(profile, uid));
        if(group && usedExtraGroups.has(group)){
          changed = true;
          return null;
        }
        if(group) usedExtraGroups.add(group);
        return uid;
      });
      if(next.some((uid, index)=>uid !== loadout.extras[index])) changed = true;
      loadout.extras = next;
    }
    for(const part of ["missileLauncher", "rocketLauncher"]){
      const next = keepOnce(loadout[part]);
      if(next !== (loadout[part] || null)) changed = true;
      loadout[part] = next;
    }
  }

  if(Array.isArray(profile.droneLoadout)){
    const next = profile.droneLoadout.map(keepOnce);
    if(next.some((uid, index)=>uid !== profile.droneLoadout[index])) changed = true;
    profile.droneLoadout = next;
  }
  return changed;
}

export function findEquippedSlot(profile, uid){
  for(const [shipId, rawLoadout] of Object.entries(profile.shipLoadouts || {})){
    const loadout = rawLoadout || {};
    const laserIndex = Array.isArray(loadout.lasers) ? loadout.lasers.indexOf(uid) : -1;
    if(laserIndex >= 0) return {location:"ship", shipId, type:"laser", index:laserIndex};
    const generatorIndex = Array.isArray(loadout.generators) ? loadout.generators.indexOf(uid) : -1;
    if(generatorIndex >= 0) return {location:"ship", shipId, type:"generator", index:generatorIndex};
    if(loadout.missileLauncher === uid) return {location:"ship", shipId, type:"missileLauncher", index:0};
    if(loadout.rocketLauncher === uid) return {location:"ship", shipId, type:"rocketLauncher", index:0};
    const extraIndex = Array.isArray(loadout.extras) ? loadout.extras.indexOf(uid) : -1;
    if(extraIndex >= 0) return {location:"ship", shipId, type:"extra", index:extraIndex};
  }
  const drones = ensureDroneLoadout(profile);
  const droneIndex = drones.indexOf(uid);
  if(droneIndex >= 0) return {location:"drone", type:"drone", index:droneIndex};
  return null;
}

export function unequipInventoryUid(profile, uid){
  const equipped = findEquippedSlot(profile, uid);
  if(!equipped) return false;
  if(equipped.location === "drone"){
    ensureDroneLoadout(profile)[equipped.index] = null;
    return true;
  }
  const loadout = ensureProfileLoadout(profile, equipped.shipId);
  if(!loadout) return false;
  if(equipped.type === "laser") loadout.lasers[equipped.index] = null;
  else if(equipped.type === "generator") loadout.generators[equipped.index] = null;
  else if(equipped.type === "missileLauncher") loadout.missileLauncher = null;
  else if(equipped.type === "rocketLauncher") loadout.rocketLauncher = null;
  else if(equipped.type === "extra") loadout.extras[equipped.index] = null;
  return true;
}

export function equipInventoryUid(profile, {type, index = 0, inventoryUid, shipId} = {}){
  const uid = String(inventoryUid || "");
  const item = getItemFromInventoryUid(profile, uid);
  if(!item) return {ok:false, reason:"Objet introuvable dans l'inventaire."};
  const targetIndex = Math.max(0, Math.floor(Number(index || 0)));

  if(type === "drone"){
    const drones = ensureDroneLoadout(profile);
    if(targetIndex >= drones.length) return {ok:false, reason:"Aucun drone a cet emplacement."};
    if(!isDroneCompatibleEquipment(item)) return {ok:false, reason:"Cet equipement n'est pas compatible avec les drones."};
    if(drones[targetIndex] && drones[targetIndex] !== uid) unequipInventoryUid(profile, drones[targetIndex]);
    unequipInventoryUid(profile, uid);
    drones[targetIndex] = uid;
    return {ok:true, item, target:{location:"drone", type, index:targetIndex}};
  }

  const ship = getServerShip(shipId);
  if(!ship) return {ok:false, reason:"Vaisseau inconnu."};
  if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.includes(ship.id)) return {ok:false, reason:"Vaisseau non possede."};
  const loadout = ensureProfileLoadout(profile, ship.id);
  if(!loadout) return {ok:false, reason:"Loadout introuvable."};
  let equippedTargetIndex = targetIndex;

  if(type === "laser"){
    if(item.category !== "canon") return {ok:false, reason:"Ce n'est pas un canon."};
    if(targetIndex >= ship.stats.maxLasers) return {ok:false, reason:"Slot laser invalide."};
    if(loadout.lasers[targetIndex] && loadout.lasers[targetIndex] !== uid) unequipInventoryUid(profile, loadout.lasers[targetIndex]);
    unequipInventoryUid(profile, uid);
    loadout.lasers[targetIndex] = uid;
  }else if(type === "generator"){
    if(item.category !== "generateur") return {ok:false, reason:"Ce n'est pas un generateur."};
    if(targetIndex >= ship.stats.maxGenerators) return {ok:false, reason:"Slot generateur invalide."};
    if(loadout.generators[targetIndex] && loadout.generators[targetIndex] !== uid) unequipInventoryUid(profile, loadout.generators[targetIndex]);
    unequipInventoryUid(profile, uid);
    loadout.generators[targetIndex] = uid;
  }else if(type === "missileLauncher"){
    if(item.slotType !== "missileLauncher") return {ok:false, reason:"Ce n'est pas un lance missile."};
    if(loadout.missileLauncher && loadout.missileLauncher !== uid) unequipInventoryUid(profile, loadout.missileLauncher);
    unequipInventoryUid(profile, uid);
    loadout.missileLauncher = uid;
  }else if(type === "rocketLauncher"){
    if(item.slotType !== "rocketLauncher") return {ok:false, reason:"Ce n'est pas un lance roquette."};
    if(loadout.rocketLauncher && loadout.rocketLauncher !== uid) unequipInventoryUid(profile, loadout.rocketLauncher);
    unequipInventoryUid(profile, uid);
    loadout.rocketLauncher = uid;
  }else if(type === "extra"){
    if(item.category !== "extra") return {ok:false, reason:"Ce n'est pas un extra."};
    if(targetIndex >= (ship.stats.maxExtras || 3)) return {ok:false, reason:"Slot extra invalide."};
    const matchingIndex = findMatchingExtraGroupIndex(
      loadout.extras,
      item,
      equippedUid=>getItemFromInventoryUid(profile, equippedUid),
      uid
    );
    equippedTargetIndex = matchingIndex >= 0 ? matchingIndex : targetIndex;
    if(loadout.extras[equippedTargetIndex] && loadout.extras[equippedTargetIndex] !== uid){
      unequipInventoryUid(profile, loadout.extras[equippedTargetIndex]);
    }
    unequipInventoryUid(profile, uid);
    loadout.extras[equippedTargetIndex] = uid;
  }else{
    return {ok:false, reason:"Type d'equipement invalide."};
  }

  return {ok:true, item, target:{location:"ship", shipId:ship.id, type, index:equippedTargetIndex}};
}

export function unequipSlot(profile, {type, index = 0, shipId} = {}){
  const targetIndex = Math.max(0, Math.floor(Number(index || 0)));
  if(type === "drone"){
    const drones = ensureDroneLoadout(profile);
    if(targetIndex >= drones.length) return {ok:false, reason:"Aucun drone a cet emplacement."};
    drones[targetIndex] = null;
    return {ok:true};
  }
  const ship = getServerShip(shipId);
  if(!ship) return {ok:false, reason:"Vaisseau inconnu."};
  const loadout = ensureProfileLoadout(profile, ship.id);
  if(!loadout) return {ok:false, reason:"Loadout introuvable."};
  if(type === "laser" && targetIndex < loadout.lasers.length) loadout.lasers[targetIndex] = null;
  else if(type === "generator" && targetIndex < loadout.generators.length) loadout.generators[targetIndex] = null;
  else if(type === "missileLauncher") loadout.missileLauncher = null;
  else if(type === "rocketLauncher") loadout.rocketLauncher = null;
  else if(type === "extra" && targetIndex < loadout.extras.length) loadout.extras[targetIndex] = null;
  else return {ok:false, reason:"Slot invalide."};
  return {ok:true};
}

export function unequipShipLoadout(profile, {shipId} = {}){
  const ship = getServerShip(shipId);
  if(!ship) return {ok:false, reason:"Vaisseau inconnu."};
  if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.includes(ship.id)){
    return {ok:false, reason:"Vaisseau non possede."};
  }
  const loadout = ensureProfileLoadout(profile, ship.id);
  if(!loadout) return {ok:false, reason:"Loadout introuvable."};
  const equippedCount = [
    ...(Array.isArray(loadout.lasers) ? loadout.lasers : []),
    loadout.missileLauncher,
    loadout.rocketLauncher,
    ...(Array.isArray(loadout.generators) ? loadout.generators : []),
    ...(Array.isArray(loadout.extras) ? loadout.extras : [])
  ].filter(Boolean).length;

  loadout.lasers = Array(ship.stats.maxLasers).fill(null);
  loadout.missileLauncher = null;
  loadout.rocketLauncher = null;
  loadout.generators = Array(ship.stats.maxGenerators).fill(null);
  loadout.extras = Array(ship.stats.maxExtras || 3).fill(null);
  return {ok:true, shipId:ship.id, count:equippedCount};
}

export function applyDronePermanentUpgrade(profile, {index = 0, inventoryUid} = {}){
  const uid = String(inventoryUid || "");
  const targetIndex = Math.max(0, Math.floor(Number(index || 0)));
  const drones = ensureDroneLoadout(profile);
  if(targetIndex >= drones.length) return {ok:false, reason:"Aucun drone a cet emplacement."};
  const entryIndex = Array.isArray(profile.inventoryItems) ? profile.inventoryItems.findIndex(entry=>entry.uid === uid) : -1;
  const entry = entryIndex >= 0 ? profile.inventoryItems[entryIndex] : null;
  const item = entry ? getServerItem(entry.itemId) : null;
  if(!isDronePermanentUpgradeItem(item)) return {ok:false, reason:"Cet objet n'est pas une amelioration de drone."};
  if(!profile.dronePermanentUpgrades || typeof profile.dronePermanentUpgrades !== "object") profile.dronePermanentUpgrades = {};
  if(profile.dronePermanentUpgrades[targetIndex]) return {ok:false, reason:`Drone ${targetIndex + 1} deja ameliore.`};
  profile.dronePermanentUpgrades[targetIndex] = item.id;
  profile.inventoryItems.splice(entryIndex, 1);
  return {ok:true, item, target:{location:"drone", type:"upgrade", index:targetIndex}};
}

function getUpgradeableItem(id){
  return getServerItem(id) || getServerAmmo(id);
}

function getEquipmentUpgradeLevel(profile, itemId){
  return Math.max(0, Number(profile?.equipmentUpgrades?.[itemId] || 0));
}

function getEquipmentUpgradeCost(profile, item){
  const level = getEquipmentUpgradeLevel(profile, item.id);
  if(item.category === "canon") return {materialId:"conducteur_renforce", amount:1 + level};
  if(item.category === "generateur") return {materialId:"blindage_composite", amount:1 + level};
  if(item.category === "munition" && item.weaponClass === "rocket") return {materialId:"catalyseur_quantique", amount:1 + level};
  return null;
}

function getCargoMaterial(profile, materialId){
  return Math.max(0, Number(profile.cargoHold?.[materialId] || 0));
}

function getShipCargo(profile, shipId = profile.activeShip){
  const ship = getServerShip(shipId);
  if(!ship) return null;
  if(!profile.shipCargo || typeof profile.shipCargo !== "object") profile.shipCargo = {};
  if(!profile.shipCargo[ship.id] || typeof profile.shipCargo[ship.id] !== "object") profile.shipCargo[ship.id] = {};
  for(const material of rawMaterialCatalog){
    profile.shipCargo[ship.id][material.id] = Math.max(0, Number(profile.shipCargo[ship.id][material.id] || 0));
  }
  return profile.shipCargo[ship.id];
}

function getShipCargoMaterial(profile, materialId, shipId = profile.activeShip){
  const cargo = getShipCargo(profile, shipId);
  return cargo ? Math.max(0, Number(cargo[materialId] || 0)) : 0;
}

function consumeCargoMaterial(profile, materialId, amount){
  const need = Math.max(0, Number(amount || 0));
  if(getCargoMaterial(profile, materialId) < need) return false;
  if(!profile.cargoHold || typeof profile.cargoHold !== "object") profile.cargoHold = {};
  profile.cargoHold[materialId] = getCargoMaterial(profile, materialId) - need;
  return true;
}

function consumeShipCargoMaterial(profile, materialId, amount, shipId = profile.activeShip){
  const cargo = getShipCargo(profile, shipId);
  const need = Math.max(0, Number(amount || 0));
  if(!cargo || getShipCargoMaterial(profile, materialId, shipId) < need) return false;
  cargo[materialId] = getShipCargoMaterial(profile, materialId, shipId) - need;
  return true;
}

export function applyEquipmentUpgrade(profile, {itemId, materialSource = "cargoHold", shipId} = {}){
  const item = getUpgradeableItem(String(itemId || ""));
  if(!item || !(["canon", "generateur"].includes(item.category) || (item.category === "munition" && item.weaponClass === "rocket"))){
    return {ok:false, reason:"Equipement non ameliorable."};
  }
  if(Math.max(0, Number(profile.completedPortals?.emerald || 0)) <= 0){
    return {ok:false, reason:"Portail Emeraude termine requis pour ameliorer l'equipement."};
  }
  const current = getEquipmentUpgradeLevel(profile, item.id);
  if(current >= 10) return {ok:false, reason:"Niveau maximum atteint."};
  const cost = getEquipmentUpgradeCost(profile, item);
  if(!cost) return {ok:false, reason:"Cout introuvable."};
  const source = materialSource === "shipCargo" ? "shipCargo" : "cargoHold";
  const available = source === "shipCargo"
    ? getShipCargoMaterial(profile, cost.materialId, shipId || profile.activeShip)
    : getCargoMaterial(profile, cost.materialId);
  if(available < cost.amount) return {ok:false, reason:"Materiaux raffines insuffisants."};
  const consumed = source === "shipCargo"
    ? consumeShipCargoMaterial(profile, cost.materialId, cost.amount, shipId || profile.activeShip)
    : consumeCargoMaterial(profile, cost.materialId, cost.amount);
  if(!consumed) return {ok:false, reason:"Materiaux raffines insuffisants."};
  if(!profile.equipmentUpgrades || typeof profile.equipmentUpgrades !== "object") profile.equipmentUpgrades = {};
  profile.equipmentUpgrades[item.id] = current + 1;
  return {ok:true, item, level:current + 1, cost, materialSource:source};
}
