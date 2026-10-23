import { consumeMaterial, consumeShipCargoMaterial, getMaterialCount, getShipCargo } from "./cargoStore.js?v=20260726-kharon1";
import { getAmmo, getDroneCatalog, getDroneFormation, getItem, getShip, store } from "./store.js?v=20260726-kharon1";
import { getExtraEquipGroup } from "../shared/equipmentRules.js";
import { hasCompletedProgressionPortal, PROGRESSION_UNLOCKS } from "../shared/progressionUnlocks.js?v=20260726-kharon1";

const DRONE_VESPER_UPGRADE_ID = "drone_overdrive_chip";
const DRONE_VESPER_UNLOCK_PORTAL_ID = "violet";

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

export function hasDronePermanentUpgradeAccess(){
  return Math.max(0, Number(store.state?.completedPortals?.[DRONE_VESPER_UNLOCK_PORTAL_ID] || 0)) > 0;
}

export function isSupportedDronePermanentUpgradeItem(item, drone = getDroneCatalog()){
  const compatibleDroneIds = Array.isArray(item?.effect?.compatibleDroneIds)
    ? item.effect.compatibleDroneIds.map(String)
    : [];
  return isDronePermanentUpgradeItem(item)
    && item?.id === DRONE_VESPER_UPGRADE_ID
    && drone?.id === "combat_drone"
    && Number(drone?.slots || 0) === 1
    && Number(item?.effect?.requiredDroneSlots || 0) === 1
    && compatibleDroneIds.includes(drone.id);
}

export function getDronePermanentUpgrade(index){
  if(!hasDronePermanentUpgradeAccess()) return null;
  const uid = getDroneSkinUid(index);
  const item = uid ? getItemFromInventoryUid(uid) : null;
  return isSupportedDronePermanentUpgradeItem(item) ? item.id : null;
}

export function cleanDroneSkinLoadout(raw, ownedCount, inventoryItems = store.state?.inventoryItems || []){
  const owned = Math.max(0, Math.min(getDroneCatalog().maxOwned || 10, Math.floor(Number(ownedCount) || 0)));
  const source = Array.isArray(raw) ? raw : [];
  const used = new Set();
  return Array.from({length:owned}, (_, index)=>{
    const uid = typeof source[index] === "string" ? source[index] : null;
    const item = uid ? getItemFromInventoryUidIn(uid, inventoryItems) : null;
    if(!uid || used.has(uid) || !isSupportedDronePermanentUpgradeItem(item)) return null;
    used.add(uid);
    return uid;
  });
}

// The legacy item-ID map remains a derived compatibility view, never the skin authority.
export function normalizeDroneSkinState(state, {migrateLegacy = false} = {}){
  if(!state || typeof state !== "object") return [];
  const hadLoadout = Array.isArray(state.droneSkinLoadout);
  const skins = cleanDroneSkinLoadout(state.droneSkinLoadout, state.ownedDroneCount, state.inventoryItems || []);
  if(migrateLegacy && !hadLoadout && Number(state.droneSkinLoadoutVersion || 0) < 1){
    const inventory = Array.isArray(state.inventoryItems) ? state.inventoryItems : (state.inventoryItems = []);
    const existing = new Set(inventory.map(entry=>entry.uid));
    let next = Math.max(1, Math.floor(Number(state.nextInventoryUid) || 1));
    for(let index = 0; index < skins.length; index += 1){
      const item = getItem(state.dronePermanentUpgrades?.[index]);
      if(!isSupportedDronePermanentUpgradeItem(item)) continue;
      let uid;
      do{ uid = `inv_${item.id}_${next++}`; }while(existing.has(uid));
      inventory.push({uid, itemId:item.id});
      existing.add(uid);
      skins[index] = uid;
    }
    state.nextInventoryUid = next;
  }
  state.droneSkinLoadout = skins;
  state.droneSkinLoadoutVersion = 1;
  state.dronePermanentUpgrades = Object.fromEntries(skins.flatMap((uid, index)=>{
    const item = uid ? getItemFromInventoryUidIn(uid, state.inventoryItems || []) : null;
    return item ? [[index, item.id]] : [];
  }));
  return skins;
}

export function getDroneSkinLoadout(){
  return normalizeDroneSkinState(store.state);
}

export function getDroneSkinUid(index){
  const requested = Number(index);
  if(!Number.isInteger(requested) || requested < 0) return null;
  return getDroneSkinLoadout()[requested] || null;
}

export function getDroneDamageMultiplier(index){
  const upgradeId = getDronePermanentUpgrade(index);
  const item = upgradeId ? getItem(upgradeId) : null;
  return Math.max(1, Number(item?.effect?.droneLaserDamageMultiplier ?? item?.effect?.droneDamageMultiplier ?? 1));
}

export function getDroneGeneratorStatMultiplier(index, statKey){
  if(String(statKey || "") !== "bouclier") return 1;
  const upgradeId = getDronePermanentUpgrade(index);
  const item = upgradeId ? getItem(upgradeId) : null;
  return Math.max(1, Number(item?.effect?.droneGeneratorShieldMultiplier || 1));
}

export function getEquipmentUpgradeLevel(itemId){
  if(!hasCompletedProgressionPortal(store.state, PROGRESSION_UNLOCKS.equipmentUpgrades.portalId)) return 0;
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
  if(!hasCompletedProgressionPortal(store.state, PROGRESSION_UNLOCKS.equipmentUpgrades.portalId)){
    return {ok:false, reason:`Terminez ${PROGRESSION_UNLOCKS.equipmentUpgrades.portalName} pour améliorer l'équipement.`};
  }
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
  return item?.category === "extra" || ["missileLauncher", "rocketLauncher"].includes(item?.slotType) || Boolean(getDroneFormation(id));
}

function sanitizeActionSlotArray(value){
  return Array.from({length:9}, (_,index)=>{
    const id = Array.isArray(value) ? value[index] : null;
    return id && isValidActionSlotItem(id) ? id : null;
  });
}

export function getActionSlotsForShip(shipId = store.state.activeShip){
  const cleanShipId = String(shipId || store.state.activeShip || "orion");
  if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
  if(!Array.isArray(store.state.actionSlotsByShip[cleanShipId])){
    store.state.actionSlotsByShip[cleanShipId] = sanitizeActionSlotArray([]);
  }
  return store.state.actionSlotsByShip[cleanShipId];
}

export function persistActiveShipActionSlots(){
  const shipId = String(store.state.activeShip || "orion");
  getActionSlotsForShip(shipId);
  store.state.actionSlotsByShip[shipId] = sanitizeActionSlotArray(store.state.actionSlots);
}

export function syncActiveShipActionSlots(shipId = store.state.activeShip){
  store.state.actionSlots = [...getActionSlotsForShip(shipId)];
  return store.state.actionSlots;
}

export function setActionSlot(index, itemId){
  syncActiveShipActionSlots();
  if(index < 0 || index >= 9) return false;
  store.state.actionSlots[index] = itemId && isValidActionSlotItem(itemId) ? itemId : null;
  persistActiveShipActionSlots();
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
  const usedExtraGroups = new Set();
  const extras = Array.from({length:ship.stats.maxExtras || 3}, (_,i)=>{
    const uid = raw?.extras?.[i] ?? null;
    const item = uid ? getItemFromInventoryUid(uid) : null;
    if(item?.category !== "extra") return null;
    const group = getExtraEquipGroup(item);
    if(group && usedExtraGroups.has(group)) return null;
    if(group) usedExtraGroups.add(group);
    return uid;
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
  if(item.category === "quest_item"){
    const existing = store.state.inventoryItems.find(entry=>entry.itemId === itemId);
    if(existing){
      existing.quantity = Math.max(1, Number(existing.quantity || 1)) + 1;
      return existing;
    }
  }
  const uid = `inv_${itemId}_${store.state.nextInventoryUid || 1}`;
  store.state.nextInventoryUid = (store.state.nextInventoryUid || 1) + 1;
  const entry = {uid, itemId, ...(item.category === "quest_item" ? {quantity:1} : {})};
  store.state.inventoryItems.push(entry);
  return entry;
}

export function getInventoryCount(itemId){
  return store.state.inventoryItems.reduce((total, entry)=>
    entry.itemId === itemId ? total + Math.max(1, Number(entry.quantity || 1)) : total, 0);
}

export function removeInventoryItems(itemId, amount){
  const need = Math.max(0, Number(amount || 0));
  if(need <= 0) return true;
  if(getInventoryCount(itemId) < need) return false;
  let removed = 0;
  store.state.inventoryItems = store.state.inventoryItems.filter(entry=>{
    if(entry.itemId !== itemId || removed >= need) return true;
    const quantity = Math.max(1, Number(entry.quantity || 1));
    const consumed = Math.min(quantity, need - removed);
    removed += consumed;
    if(consumed >= quantity) return false;
    entry.quantity = quantity - consumed;
    return true;
  });
  return removed === need;
}

export function applyDronePermanentUpgrade(index, inventoryUid){
  const requestedIndex = Number(index);
  if(!Number.isInteger(requestedIndex) || requestedIndex < 0) return {ok:false, reason:"Emplacement de drone invalide."};
  const target = requestedIndex;
  if(target >= getDroneLoadout().length) return {ok:false, reason:"Aucun drone a cet emplacement."};
  const entry = getInventoryItem(inventoryUid);
  const item = entry ? getItem(entry.itemId) : null;
  if(!isSupportedDronePermanentUpgradeItem(item)) return {ok:false, reason:"Cet objet n'est pas compatible avec ce drone de combat."};
  if(!hasDronePermanentUpgradeAccess()) return {ok:false, reason:"Terminez d'abord La Faille de Vesper."};
  unequipInventoryItem(inventoryUid);
  getDroneSkinLoadout()[target] = inventoryUid;
  normalizeDroneSkinState(store.state);
  return {ok:true, item, index:target, inventoryUid};
}

export function getDronePurchasePrice(index = store.state.ownedDroneCount){
  const drone = getDroneCatalog();
  const count = Math.max(0, Number(index || 0));
  return count >= drone.maxStandardOwned ? null : drone.basePrice * Math.pow(2, count);
}

export function getDroneLoadout(){
  const owned = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(store.state.ownedDroneCount || 0)));
  store.state.droneLoadout = Array.isArray(store.state.droneLoadout) ? store.state.droneLoadout : [];
  while(store.state.droneLoadout.length < owned) store.state.droneLoadout.push(null);
  if(store.state.droneLoadout.length > owned) store.state.droneLoadout.length = owned;
  return store.state.droneLoadout;
}

export function findEquippedSlot(uid){
  if(typeof uid !== "string" || !uid) return null;
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
  const skinIndex = getDroneSkinLoadout().indexOf(uid);
  if(uid && skinIndex >= 0) return {location:"drone", type:"droneSkin", index:skinIndex};
  return null;
}

export function unequipInventoryItem(uid){
  const equipped = findEquippedSlot(uid);
  if(!equipped) return false;
  if(equipped.location === "drone"){
    if(equipped.type === "droneSkin"){
      getDroneSkinLoadout()[equipped.index] = null;
      normalizeDroneSkinState(store.state);
    }else getDroneLoadout()[equipped.index] = null;
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
