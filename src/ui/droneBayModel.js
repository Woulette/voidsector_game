import { MAX_STANDARD_DRONES, MAX_TOTAL_DRONES } from "../shared/droneLimits.js";
import { getRarityLabel, getRarityOrder, rarityClass } from "../shared/rarities.js";

export const DRONE_BAY_FILTERS = Object.freeze([
  {id:"all", label:"Tous"},
  {id:"lasers", label:"Lasers"},
  {id:"shields", label:"Boucliers"},
  {id:"overdrive", label:"Overdrive"}
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
    {label:"Installation", value:"Définitive"}
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

export function groupDroneInventory(entries, {getLocationLabel = ()=>"Disponible", compatible = item=>!!droneEquipmentKind(item)} = {}){
  const groups = new Map();
  const seen = new Set();
  for(const entry of entries || []){
    if(!entry?.uid || seen.has(entry.uid) || !entry.item?.id || !compatible(entry.item) || !droneEquipmentKind(entry.item)) continue;
    seen.add(entry.uid);
    const item = entry.item;
    if(!groups.has(item.id)) groups.set(item.id, {
      id:item.id, item, kind:droneEquipmentKind(item), rarity:getRarityLabel(item), rarityClass:rarityClass(item),
      stats:droneEquipmentStats(item), copies:[]
    });
    groups.get(item.id).copies.push({...entry, locationLabel:getLocationLabel(entry.equipped)});
  }
  return [...groups.values()].map(group=>({
    ...group, total:group.copies.length, available:group.copies.filter(entry=>!entry.equipped).length,
    equipped:group.copies.filter(entry=>!!entry.equipped).length
  })).sort((a, b)=>DRONE_BAY_FILTERS.findIndex(filter=>filter.id === a.kind) - DRONE_BAY_FILTERS.findIndex(filter=>filter.id === b.kind)
    || getRarityOrder(a.item) - getRarityOrder(b.item) || a.item.name.localeCompare(b.item.name, "fr"));
}

export function droneBayEquipAction(entry, selectedDrone, portalComplete){
  if(!entry) return {allowed:false, reason:"Sélectionnez un équipement dans l’inventaire."};
  if(!selectedDrone?.owned) return {allowed:false, reason:"Achetez un drone pour y installer cet équipement."};
  const kind = droneEquipmentKind(entry.item);
  if(!kind) return {allowed:false, reason:"Équipement incompatible avec les drones."};
  if(kind === "overdrive"){
    if(!portalComplete) return {allowed:false, reason:"Terminez La Faille de Vesper pour installer ce noyau."};
    if(selectedDrone.upgrade) return {allowed:false, reason:"Ce drone possède déjà un Noyau Overdrive."};
    if(entry.item.id !== "drone_overdrive_chip") return {allowed:false, reason:"Noyau incompatible avec ce drone."};
    return {allowed:true, label:`Installer sur Drone ${String(selectedDrone.index + 1).padStart(2, "0")}`, permanent:true};
  }
  if(entry.uid === selectedDrone.uid) return {allowed:false, reason:"Déjà équipé sur ce drone.", label:"Déjà équipé"};
  return {
    allowed:true, replacing:!!selectedDrone.uid,
    label:`${entry.equipped ? "Déplacer" : "Équiper"} sur Drone ${String(selectedDrone.index + 1).padStart(2, "0")}`
  };
}

// Read-only projection. Actual ownership, prices and permanent upgrades come from the existing game getters.
export function createDroneBayModel({drone, drones = [], inventoryEntries = [], selectedDroneIndex = 0,
  filter = "all", expandedGroups = [], selectedUid = null, selectedUids = [], portalComplete = false,
  getPermanentUpgrade = ()=>null, getItem = ()=>null, getLocationLabel, compatible, nextPrice = null,
  canPurchase = false}){
  const maxStandard = Math.min(MAX_STANDARD_DRONES, Math.floor(number(drone?.maxStandardOwned)) || MAX_STANDARD_DRONES);
  const maxTotal = Math.min(MAX_TOTAL_DRONES, Math.floor(number(drone?.maxOwned)) || MAX_TOTAL_DRONES);
  const owned = Math.min(maxTotal, drones.length);
  const selectedIndex = resolveDroneBaySelection(owned, selectedDroneIndex);
  const multi = new Set(selectedUids);
  const slots = Array.from({length:maxTotal}, (_, index)=>{
    const uid = index < owned ? drones[index] || null : null;
    const item = uid ? inventoryEntries.find(entry=>entry.uid === uid)?.item || null : null;
    const upgradeId = index < owned ? getPermanentUpgrade(index) : null;
    return {index, number:String(index + 1).padStart(2, "0"), owned:index < owned, reserved:index >= maxStandard,
      selected:selectedIndex === index, uid, item, multiSelected:!!uid && multi.has(uid),
      itemSelected:!!uid && selectedUid === uid,
      upgrade:upgradeId ? getItem(upgradeId) : null};
  });
  const groups = groupDroneInventory(inventoryEntries, {getLocationLabel, compatible});
  const selectedEntry = groups.flatMap(group=>group.copies).find(entry=>entry.uid === selectedUid) || null;
  const selectedDrone = slots.find(slot=>slot.selected) || null;
  const activeFilter = DRONE_BAY_FILTERS.some(entry=>entry.id === filter) ? filter : "all";
  const expanded = new Set(expandedGroups);
  return {
    drone, owned, maxStandard, maxTotal, standardOwned:Math.min(owned, maxStandard), legacyOwned:Math.max(0, owned - maxStandard),
    selectedDroneIndex:selectedIndex, selectedDrone, standardSlots:slots.slice(0, maxStandard), specialSlots:slots.slice(maxStandard),
    nextPrice:owned < maxStandard && Number(nextPrice) > 0 ? number(nextPrice) : null,
    canPurchase:owned < maxStandard && Number(nextPrice) > 0 && !!canPurchase,
    portalComplete:!!portalComplete, filter:activeFilter, selectedUid:selectedEntry?.uid || null, selectedUids:multi,
    totalItems:groups.reduce((sum, group)=>sum + group.total, 0), availableItems:groups.reduce((sum, group)=>sum + group.available, 0),
    groups:groups.filter(group=>activeFilter === "all" || group.kind === activeFilter).map(group=>({
      ...group, expanded:expanded.has(group.id), selected:group.id === selectedEntry?.item.id,
      selectedEntry:group.id === selectedEntry?.item.id ? selectedEntry : null
    })),
    selectedEntry, action:droneBayEquipAction(selectedEntry, selectedDrone, portalComplete)
  };
}
