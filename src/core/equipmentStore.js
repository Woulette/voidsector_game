import { consumeMaterial, consumeShipCargoMaterial, getMaterialCount, getShipCargo } from "./cargoStore.js";
import { getAmmo, getDroneCatalog, getDroneFormation, getItem, getShip, store } from "./store.js";
export function getInventoryItem(uid){ return store.state?.inventoryItems?.find(entry=>entry.uid === uid) || null; }
export function getItemFromInventoryUid(uid){ return getItem(getInventoryItem(uid)?.itemId); }
function getItemFromInventoryUidIn(uid, inventoryItems = store.state?.inventoryItems || []){
  return getItem(inventoryItems.find(entry=>entry.uid === uid)?.itemId);
}

export function isDroneCompatibleEquipment(item){
  if(item?.category === "canon") return true;
  if(item?.category !== "generateur") return false;
  return Number(item.stats?.bouclier || 0) > 0 || Number(item.stats?.regen || 0) > 0;
}

export function isDronePermanentUpgradeItem(item){
  return item?.slotType === "droneUpgrade" || item?.category === "drone_upgrade";
}

export function getDronePermanentUpgrade(index){
  const upgrades = store.state?.dronePermanentUpgrades;
  return upgrades && typeof upgrades === "object" ? upgrades[index] || null : null;
}

export function getDroneDamageMultiplier(index){
  const upgradeId = getDronePermanentUpgrade(index);
  const item = upgradeId ? getItem(upgradeId) : null;
  return Math.max(1, Number(item?.effect?.droneDamageMultiplier || 1));
}

export function getEquipmentUpgradeLevel(itemId){
  return Math.max(0, Number(store.state?.equipmentUpgrades?.[itemId] || 0));
}

export function getEquipmentUpgradeCost(itemLike){
  const item = typeof itemLike === "string" ? (getItem(itemLike) || getAmmo(itemLike)) : itemLike;
  const level = getEquipmentUpgradeLevel(item.id);
  if(item.category === "canon") return {materialId:"conducteur_renforce", amount:1 + level};
  if(item.category === "generateur") return {materialId:"blindage_composite", amount:1 + level};
  if(item.category === "munition" && item.weaponClass === "rocket") return {materialId:"catalyseur_quantique", amount:1 + level};
  return null;
}

function getUpgradeMaterialCount(materialId, options = {}){
  if(options.materialSource === "shipCargo"){
    return Math.max(0, Number(getShipCargo(options.shipId)[materialId] || 0));
  }
  return getMaterialCount(materialId);
}

function consumeUpgradeMaterial(materialId, amount, options = {}){
  if(options.materialSource === "shipCargo"){
    return consumeShipCargoMaterial(materialId, amount, options.shipId);
  }
  return consumeMaterial(materialId, amount);
}

export function upgradeEquipment(itemId, options = {}){
  const item = getItem(itemId) || getAmmo(itemId);
  if(!item || !(["canon","generateur"].includes(item.category) || (item.category === "munition" && item.weaponClass === "rocket"))) return {ok:false, reason:"Equipement non ameliorable."};
  if(Math.max(0, Number(store.state?.completedPortals?.emerald || 0)) <= 0) return {ok:false, reason:"Portail Emeraude termine requis pour ameliorer l'equipement."};
  const current = getEquipmentUpgradeLevel(itemId);
  if(current >= 10) return {ok:false, reason:"Niveau maximum atteint."};
  const cost = getEquipmentUpgradeCost(item);
  if(!cost || getUpgradeMaterialCount(cost.materialId, options) < cost.amount) return {ok:false, reason:"Materiaux raffines insuffisants."};
  if(!store.state.equipmentUpgrades) store.state.equipmentUpgrades = {};
  consumeUpgradeMaterial(cost.materialId, cost.amount, options);
  store.state.equipmentUpgrades[itemId] = current + 1;
  return {ok:true, level:current + 1, cost};
}

export function getSkillDefinition(id){
  return skills.find(skill=>skill.id === id) || null;
}

export function getSkillLevel(id){
  return Math.max(0, Number(store.state?.skillLevels?.[id] || 0));
}

export function getSkillUpgradeData(id){
  const skill = getSkillDefinition(id);
  if(!skill) return null;
  const level = getSkillLevel(id);
  return skill.levels?.[level] || null;
}

export function upgradeSkill(id){
  const skill = getSkillDefinition(id);
  if(!skill) return {ok:false, reason:"Compétence introuvable."};
  const level = getSkillLevel(id);
  if(level >= Number(skill.maxLevel || skill.levels.length || 0)) return {ok:false, reason:"Niveau maximum atteint."};
  const next = getSkillUpgradeData(id);
  if(!next) return {ok:false, reason:"Palier introuvable."};
  if(Number(store.state.player.skillPoints || 0) < Number(next.skillPoints || 0)) return {ok:false, reason:"Pas assez de points de compétence."};
  if(!canAfford(next.priceType, next.price)) return {ok:false, reason: next.priceType === "premium" ? "Pas assez de NOVA." : "Pas assez de crédits."};
  store.state.player.skillPoints -= Number(next.skillPoints || 0);
  spend(next.priceType, next.price);
  if(!store.state.skillLevels || typeof store.state.skillLevels !== "object") store.state.skillLevels = {};
  store.state.skillLevels[id] = level + 1;
  return {ok:true, level:level + 1, step:next, skill};
}

export function isUnlockedForPlayer(entity){ return true; }
export function getWeaponAverageDamage(item){
  if(!item.weapon) return 0;
  const upgradeBonus = getEquipmentUpgradeLevel(item.id) * 10;
  const min = Number(item.weapon.minDamage ?? item.weapon.damage ?? 0);
  const max = Number(item.weapon.maxDamage ?? item.weapon.damage ?? min);
  return (min + max) / 2 + upgradeBonus;
}

export function getAmmoCount(id){
  return Math.max(0, Number(store.state.ammoInventory?.[id] || 0));
}

export function addAmmo(id, amount){
  if(!getAmmo(id)) return 0;
  if(!store.state.ammoInventory) store.state.ammoInventory = {};
  store.state.ammoInventory[id] = getAmmoCount(id) + Math.max(0, Number(amount || 0));
  return store.state.ammoInventory[id];
}

export function consumeAmmo(id, amount){
  const need = Math.max(0, Number(amount || 0));
  if(getAmmoCount(id) < need) return false;
  store.state.ammoInventory[id] -= need;
  return true;
}

function isValidActionSlotItem(id){
  if(getAmmo(id)) return true;
  const item = getItem(id);
  return item?.category === "extra" || Boolean(getDroneFormation(id));
}

export function setActionSlot(index, itemId){
  if(!store.state.actionSlots) store.state.actionSlots = Array(9).fill(null);
  if(index < 0 || index >= 9) return false;
  store.state.actionSlots[index] = itemId && isValidActionSlotItem(itemId) ? itemId : null;
  return true;
}

export function makeEmptyLoadout(shipId){
  const ship = getShip(shipId);
  return {lasers:Array(ship.stats.maxLasers).fill(null), missileLauncher:null, rocketLauncher:null, generators:Array(ship.stats.maxGenerators).fill(null), extras:Array(ship.stats.maxExtras || 3).fill(null)};
}

export function cleanLoadout(shipId, raw){
  const ship = getShip(shipId);
  const lasers = Array.from({length:ship.stats.maxLasers}, (_,i)=>{
    const uid = raw?.lasers?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "canon" ? uid : null;
  });
  const generators = Array.from({length:ship.stats.maxGenerators}, (_,i)=>{
    const uid = raw?.generators?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "generateur" ? uid : null;
  });
  const missileLauncher = raw?.missileLauncher && getItemFromInventoryUid(raw.missileLauncher)?.slotType === "missileLauncher" ? raw.missileLauncher : null;
  const rocketLauncher = raw?.rocketLauncher && getItemFromInventoryUid(raw.rocketLauncher)?.slotType === "rocketLauncher" ? raw.rocketLauncher : null;
  const extras = Array.from({length:ship.stats.maxExtras || 3}, (_,i)=>{
    const uid = raw?.extras?.[i] ?? null;
    return uid && getItemFromInventoryUid(uid)?.category === "extra" ? uid : null;
  });
  return {lasers, missileLauncher, rocketLauncher, generators, extras};
}

export function cleanDroneLoadout(raw, inventoryItems = store.state?.inventoryItems || []){
  const max = getDroneCatalog().maxOwned || 8;
  const source = Array.isArray(raw) ? raw : [];
  return Array.from({length:Math.min(max, source.length)}, (_,i)=>{
    const uid = source[i] ?? null;
    const item = uid ? getItemFromInventoryUidIn(uid, inventoryItems) : null;
    return uid && isDroneCompatibleEquipment(item) ? uid : null;
  });
}

export function addInventoryItem(itemId){
  const item = getItem(itemId) || getAmmo(itemId);
  if(!item) return null;
  const uid = `inv_${itemId}_${store.state.nextInventoryUid || 1}`;
  store.state.nextInventoryUid = (store.state.nextInventoryUid || 1) + 1;
  const entry = {uid, itemId};
  store.state.inventoryItems.push(entry);
  return entry;
}

export function getInventoryCount(itemId){
  return store.state.inventoryItems.filter(entry=>entry.itemId === itemId).length;
}

export function applyDronePermanentUpgrade(index, inventoryUid){
  const target = Math.max(0, Number(index || 0));
  if(target >= getDroneLoadout().length) return {ok:false, reason:"Aucun drone a cet emplacement."};
  const entryIndex = store.state.inventoryItems.findIndex(entry=>entry.uid === inventoryUid);
  const entry = entryIndex >= 0 ? store.state.inventoryItems[entryIndex] : null;
  const item = entry ? getItem(entry.itemId) : null;
  if(!isDronePermanentUpgradeItem(item)) return {ok:false, reason:"Cet objet n'est pas une amelioration de drone."};
  if(getDronePermanentUpgrade(target)) return {ok:false, reason:`Drone ${target + 1} deja ameliore.`};
  if(!store.state.dronePermanentUpgrades || typeof store.state.dronePermanentUpgrades !== "object") store.state.dronePermanentUpgrades = {};
  store.state.dronePermanentUpgrades[target] = item.id;
  store.state.inventoryItems.splice(entryIndex, 1);
  if(store.selectedInventoryUid === inventoryUid) store.selectedInventoryUid = null;
  return {ok:true, item, index:target};
}

export function getDronePurchasePrice(index = store.state.ownedDroneCount){
  const drone = getDroneCatalog();
  return drone.basePrice * Math.pow(2, Math.max(0, Number(index || 0)));
}

export function getDroneLoadout(){
  const owned = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(store.state.ownedDroneCount || 0)));
  store.state.droneLoadout = Array.isArray(store.state.droneLoadout) ? store.state.droneLoadout : [];
  while(store.state.droneLoadout.length < owned) store.state.droneLoadout.push(null);
  if(store.state.droneLoadout.length > owned) store.state.droneLoadout.length = owned;
  return store.state.droneLoadout;
}

export function findEquippedSlot(uid){
  for(const shipId of Object.keys(store.state.shipLoadouts || {})){
    const loadout = getLoadout(shipId);
    const laserIndex = loadout?.lasers?.indexOf(uid) ?? -1;
    if(laserIndex >= 0) return {location:"ship", shipId, type:"laser", index:laserIndex};
    const generatorIndex = loadout?.generators?.indexOf(uid) ?? -1;
    if(generatorIndex >= 0) return {location:"ship", shipId, type:"generator", index:generatorIndex};
    if(loadout?.missileLauncher === uid) return {location:"ship", shipId, type:"missileLauncher", index:0};
    if(loadout?.rocketLauncher === uid) return {location:"ship", shipId, type:"rocketLauncher", index:0};
    const extraIndex = loadout?.extras?.indexOf(uid) ?? -1;
    if(extraIndex >= 0) return {location:"ship", shipId, type:"extra", index:extraIndex};
  }
  const drones = getDroneLoadout();
  const droneIndex = drones.indexOf(uid);
  if(droneIndex >= 0){
    const item = getItemFromInventoryUid(uid);
    return {location:"drone", type:item?.category === "canon" ? "laser" : "generator", index:droneIndex};
  }
  return null;
}

export function unequipInventoryItem(uid){
  const equipped = findEquippedSlot(uid);
  if(!equipped) return false;
  if(equipped.location === "drone"){
    getDroneLoadout()[equipped.index] = null;
    return true;
  }
  const loadout = getLoadout(equipped.shipId);
  if(equipped.type === "laser") loadout.lasers[equipped.index] = null;
  else if(equipped.type === "generator") loadout.generators[equipped.index] = null;
  else if(equipped.type === "missileLauncher") loadout.missileLauncher = null;
  else if(equipped.type === "rocketLauncher") loadout.rocketLauncher = null;
  else if(equipped.type === "extra") loadout.extras[equipped.index] = null;
  return true;
}

export function getInventoryByCategory(category){
  return store.state.inventoryItems
    .map(entry=>({...entry, item:getItem(entry.itemId), equipped:findEquippedSlot(entry.uid)}))
    .filter(entry=>entry.item?.category === category);
}

export function getLoadout(shipId = store.state.activeShip){
  if(!store.state.shipLoadouts) store.state.shipLoadouts = {};
  store.state.shipLoadouts[shipId] = cleanLoadout(shipId, store.state.shipLoadouts[shipId] || makeEmptyLoadout(shipId));
  return store.state.shipLoadouts[shipId];
}

export function ensureShipLoadout(shipId){
  if(!store.state.shipLoadouts) store.state.shipLoadouts = {};
  if(!store.state.shipLoadouts[shipId]) store.state.shipLoadouts[shipId] = makeEmptyLoadout(shipId);
  store.state.shipLoadouts[shipId] = cleanLoadout(shipId, store.state.shipLoadouts[shipId]);
  return store.state.shipLoadouts[shipId];
}
