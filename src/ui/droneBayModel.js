import { MAX_STANDARD_DRONES, MAX_TOTAL_DRONES } from "../shared/droneLimits.js";
import { getRarityLabel, getRarityOrder, rarityClass } from "../shared/rarities.js";

export const DRONE_BAY_FILTERS = Object.freeze([
  {id:"all", label:"Tous"},
  {id:"lasers", label:"Lasers"},
  {id:"shields", label:"Boucliers"},
  {id:"overdrive", label:"Skins"}
]);

const number = value=>Math.max(0, Number(value) || 0);

export function droneEquipmentKind(item){
  if(item?.category === "canon") return "lasers";
  if(item?.category === "generateur" && (number(item.stats?.bouclier) > 0 || number(item.stats?.regen) > 0)) return "shields";
  if(item?.slotType === "droneUpgrade" || item?.category === "drone_upgrade") return "overdrive";
  return null;
}

export function resolveDroneBaySelection(ownedCount, requestedIndex){
  const owned = Math.min(MAX_TOTAL_DRONES, Math.floor(number(ownedCount)));
  if(!owned) return null;
  const index = Number(requestedIndex);
  return Number.isInteger(index) && index >= 0 && index < owned ? index : 0;
}

export function droneEquipmentStats(item){
  if(!item) return [];
  if(droneEquipmentKind(item) === "overdrive") return [
    {label:"Laser ou bouclier", value:"+50 %"},
    {label:"Emplacement", value:"Skin du drone"}
  ];
  if(item.category === "canon" && item.weapon){
    const min = number(item.weapon.minDamage ?? item.weapon.damage);
    const max = number(item.weapon.maxDamage ?? item.weapon.damage ?? min);
    return [
      {label:"Dégâts", value:`${min}–${max}`},
      {label:"Portée", value:String(number(item.weapon.range))},
      {label:"Cadence", value:`${number(item.weapon.cooldown).toLocaleString("fr-FR", {minimumFractionDigits:2, maximumFractionDigits:2})} s`}
    ];
  }
  const stats = [];
  if(number(item.stats?.bouclier)) stats.push({label:"Bouclier", value:number(item.stats.bouclier).toLocaleString("fr-FR")});
  if(number(item.stats?.regen)) stats.push({label:"Régénération", value:`${number(item.stats.regen).toLocaleString("fr-FR")} / s`});
  if(item.stats?.absorption) stats.push({label:"Absorption", value:String(item.stats.absorption)});
  return stats;
}

export function getCompatibleDroneInventory(entries, {getLocationLabel = ()=>"Disponible", compatible = item=>!!droneEquipmentKind(item)} = {}){
  const inventory = [];
  const seen = new Set();
  for(const entry of entries || []){
    if(!entry?.uid || seen.has(entry.uid) || !entry.item?.id || !compatible(entry.item) || !droneEquipmentKind(entry.item)) continue;
    seen.add(entry.uid);
    const item = entry.item;
    inventory.push({...entry, kind:droneEquipmentKind(item), rarity:getRarityLabel(item), rarityClass:rarityClass(item),
      locationLabel:getLocationLabel(entry.equipped)});
  }
  return inventory.sort((a, b)=>DRONE_BAY_FILTERS.findIndex(filter=>filter.id === a.kind) - DRONE_BAY_FILTERS.findIndex(filter=>filter.id === b.kind)
    || getRarityOrder(a.item) - getRarityOrder(b.item) || a.item.name.localeCompare(b.item.name, "fr"));
}

export function droneBayEquipAction(entry, selectedDrone, portalComplete){
  if(!entry) return {allowed:false, reason:"Sélectionnez un équipement dans l’inventaire."};
  if(!selectedDrone?.owned) return {allowed:false, reason:"Achetez un drone pour y installer cet équipement."};
  const kind = droneEquipmentKind(entry.item);
  if(!kind) return {allowed:false, reason:"Équipement incompatible avec les drones."};
  if(kind === "overdrive"){
    if(!portalComplete) return {allowed:false, reason:"Terminez La Faille de Vesper pour équiper ce skin."};
    if(entry.item.id !== "drone_overdrive_chip") return {allowed:false, reason:"Skin incompatible avec ce drone."};
    if(entry.uid === selectedDrone.skinUid) return {allowed:false, reason:"Ce skin est déjà équipé sur ce drone.", label:"Déjà équipé", targetType:"droneSkin"};
    return {allowed:true, targetType:"droneSkin", replacing:!!selectedDrone.skinUid,
      label:`${entry.equipped ? "Déplacer" : "Équiper"} sur Drone ${String(selectedDrone.index + 1).padStart(2, "0")}`};
  }
  if(entry.uid === selectedDrone.uid) return {allowed:false, reason:"Déjà équipé sur ce drone.", label:"Déjà équipé"};
  return {
    allowed:true, targetType:"drone", replacing:!!selectedDrone.uid,
    label:`${entry.equipped ? "Déplacer" : "Équiper"} sur Drone ${String(selectedDrone.index + 1).padStart(2, "0")}`
  };
}

// Read-only projection. Module and skin ownership come from two independent UID loadouts.
export function createDroneBayModel({drone, drones = [], droneSkins = [], inventoryEntries = [], selectedDroneIndex = 0,
  filter = "all", selectedUid = null, selectedUids = [], portalComplete = false,
  getLocationLabel, compatible, nextPrice = null,
  canPurchase = false}){
  const maxStandard = Math.min(MAX_STANDARD_DRONES, Math.floor(number(drone?.maxStandardOwned)) || MAX_STANDARD_DRONES);
  const maxTotal = Math.min(MAX_TOTAL_DRONES, Math.floor(number(drone?.maxOwned)) || MAX_TOTAL_DRONES);
  const owned = Math.min(maxTotal, drones.length);
  const selectedIndex = resolveDroneBaySelection(owned, selectedDroneIndex);
  const multi = new Set(selectedUids);
  const slots = Array.from({length:maxTotal}, (_, index)=>{
    const uid = index < owned ? drones[index] || null : null;
    const item = uid ? inventoryEntries.find(entry=>entry.uid === uid)?.item || null : null;
    const requestedSkinUid = index < owned ? droneSkins[index] || null : null;
    const skinEntry = requestedSkinUid ? inventoryEntries.find(entry=>entry.uid === requestedSkinUid && droneEquipmentKind(entry.item) === "overdrive") : null;
    const skinUid = skinEntry?.uid || null;
    return {index, number:String(index + 1).padStart(2, "0"), owned:index < owned, reserved:index >= maxStandard,
      selected:selectedIndex === index, uid, item, multiSelected:!!uid && multi.has(uid),
      itemSelected:!!uid && selectedUid === uid, skinUid, skin:skinEntry?.item || null,
      skinMultiSelected:!!skinUid && multi.has(skinUid), skinSelected:!!skinUid && selectedUid === skinUid,
      skinActive:!!skinUid && !!portalComplete};
  });
  const compatibleEntries = getCompatibleDroneInventory(inventoryEntries, {getLocationLabel, compatible});
  const availableEntries = compatibleEntries.filter(entry=>!entry.equipped);
  const selectedEntry = compatibleEntries.find(entry=>entry.uid === selectedUid) || null;
  const selectedDrone = slots.find(slot=>slot.selected) || null;
  const activeFilter = DRONE_BAY_FILTERS.some(entry=>entry.id === filter) ? filter : "all";
  return {
    drone, owned, maxStandard, maxTotal, standardOwned:Math.min(owned, maxStandard), legacyOwned:Math.max(0, owned - maxStandard),
    selectedDroneIndex:selectedIndex, selectedDrone, standardSlots:slots.slice(0, maxStandard), specialSlots:slots.slice(maxStandard),
    nextPrice:owned < maxStandard && Number(nextPrice) > 0 ? number(nextPrice) : null,
    canPurchase:owned < maxStandard && Number(nextPrice) > 0 && !!canPurchase,
    portalComplete:!!portalComplete, filter:activeFilter, selectedUid:selectedEntry?.uid || null, selectedUids:multi,
    inventoryEntries:compatibleEntries, availableEntries,
    visibleInventoryEntries:availableEntries.filter(entry=>activeFilter === "all" || entry.kind === activeFilter),
    totalItems:availableEntries.length, availableItems:availableEntries.length,
    selectedEntry, action:droneBayEquipAction(selectedEntry, selectedDrone, portalComplete)
  };
}
