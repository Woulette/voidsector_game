import { findMatchingExtraGroupIndex } from "../shared/equipmentRules.js";

export function normalizeEquipmentSelection(value){
  return [...new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))];
}

export function toggleEquipmentSelection(value, inventoryUid){
  const uid = String(inventoryUid || "");
  const selected = normalizeEquipmentSelection(value);
  if(!uid) return selected;
  const index = selected.indexOf(uid);
  if(index >= 0) selected.splice(index, 1);
  else selected.push(uid);
  return selected;
}

export function createEquipmentDoubleClickTracker({maxDelayMs = 500} = {}){
  let lastClick = null;

  return {
    register(targetKey, now = Date.now()){
      const key = String(targetKey || "");
      const at = Number(now);
      const elapsed = at - Number(lastClick?.at);
      const repeated = Boolean(
        key
        && lastClick?.key === key
        && elapsed >= 0
        && elapsed <= maxDelayMs
      );
      lastClick = repeated || !key ? null : {key, at};
      return repeated;
    },
    reset(){
      lastClick = null;
    }
  };
}

export function selectionRectangle(startX, startY, endX, endY){
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  return {
    left,
    top,
    right:Math.max(startX, endX),
    bottom:Math.max(startY, endY),
    width:Math.abs(endX - startX),
    height:Math.abs(endY - startY)
  };
}

export function rectanglesIntersect(a, b){
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function shipEquipmentType(item){
  if(item?.category === "canon") return "laser";
  if(item?.category === "generateur") return "generator";
  if(item?.slotType === "missileLauncher") return "missileLauncher";
  if(item?.slotType === "rocketLauncher") return "rocketLauncher";
  if(item?.category === "extra") return "extra";
  return null;
}

export function planShipEquipmentBatch({
  inventoryUids,
  getItem,
  findEquipped,
  shipId,
  loadout
}){
  const working = {
    lasers:[...(loadout?.lasers || [])],
    generators:[...(loadout?.generators || [])],
    extras:[...(loadout?.extras || [])],
    missileLauncher:loadout?.missileLauncher || null,
    rocketLauncher:loadout?.rocketLauncher || null
  };
  const actions = [];
  for(const inventoryUid of normalizeEquipmentSelection(inventoryUids)){
    if(findEquipped?.(inventoryUid)) continue;
    const item = getItem?.(inventoryUid);
    const type = shipEquipmentType(item);
    if(!type) continue;
    if(type === "missileLauncher" || type === "rocketLauncher"){
      if(working[type]) continue;
      working[type] = inventoryUid;
      actions.push({kind:"equip", type, index:0, inventoryUid, shipId});
      continue;
    }
    const slots = type === "laser" ? working.lasers : type === "generator" ? working.generators : working.extras;
    const matchingExtraIndex = type === "extra"
      ? findMatchingExtraGroupIndex(slots, item, getItem, inventoryUid)
      : -1;
    const index = matchingExtraIndex >= 0 ? matchingExtraIndex : slots.findIndex(uid=>!uid);
    if(index < 0) continue;
    slots[index] = inventoryUid;
    actions.push({kind:"equip", type, index, inventoryUid, shipId});
  }
  return actions;
}

export function planDroneEquipmentBatch({
  inventoryUids,
  getItem,
  findEquipped,
  drones,
  dronePermanentUpgrades,
  isDroneCompatibleEquipment,
  isDronePermanentUpgradeItem
}){
  const workingDrones = [...(drones || [])];
  const workingUpgrades = {...(dronePermanentUpgrades || {})};
  const actions = [];
  for(const inventoryUid of normalizeEquipmentSelection(inventoryUids)){
    if(findEquipped?.(inventoryUid)) continue;
    const item = getItem?.(inventoryUid);
    if(isDronePermanentUpgradeItem?.(item)){
      const index = workingDrones.findIndex((_, droneIndex)=>!workingUpgrades[droneIndex]);
      if(index < 0) continue;
      workingUpgrades[index] = item.id || inventoryUid;
      actions.push({kind:"drone-upgrade", index, inventoryUid});
      continue;
    }
    if(!isDroneCompatibleEquipment?.(item)) continue;
    const index = workingDrones.findIndex(uid=>!uid);
    if(index < 0) continue;
    workingDrones[index] = inventoryUid;
    actions.push({kind:"equip", type:"drone", index, inventoryUid, shipId:""});
  }
  return actions;
}

export function planUnequipEquipmentBatch(inventoryUids, findEquipped){
  return normalizeEquipmentSelection(inventoryUids)
    .filter(inventoryUid=>Boolean(findEquipped?.(inventoryUid)))
    .map(inventoryUid=>({kind:"unequip-inventory", inventoryUid}));
}

export function isEquipmentSelectionClearTarget(target){
  if(!target?.closest) return false;
  if(!target.closest(".equipped-compact-panel, .rpg-inventory-panel, .drone-bay-grid")) return false;
  return !target.closest(`
    [data-inventory-uid],
    [data-inventory-resource-id],
    [data-slot-uid],
    [data-drop-part],
    button,
    a,
    input,
    select,
    textarea,
    label,
    [role="button"]
  `);
}
