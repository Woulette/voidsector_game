import { droneCatalog, equipment } from "../../../src/data/equipment.js";
import { MAX_TOTAL_DRONES } from "../../../src/shared/droneLimits.js";

export const DRONE_SKIN_LOADOUT_VERSION = 1;
export const OVERDRIVE_SKIN_ID = "drone_overdrive_chip";

export function getOwnedDroneSkinSlotCount(profile){
  const owned = Number(profile?.ownedDroneCount || 0);
  return Number.isFinite(owned) ? Math.min(MAX_TOTAL_DRONES, Math.max(0, Math.floor(owned))) : 0;
}

export function isSupportedDroneSkinItem(item, drone = droneCatalog.find(entry=>entry.id === "combat_drone")){
  return item?.id === OVERDRIVE_SKIN_ID
    && (item.slotType === "droneUpgrade" || item.category === "drone_upgrade")
    && drone?.id === "combat_drone" && Number(drone.slots) === 1
    && Number(item.effect?.requiredDroneSlots) === 1
    && Array.isArray(item.effect?.compatibleDroneIds)
    && item.effect.compatibleDroneIds.includes(drone.id);
}

function skinItemByUid(profile, uid){
  if(!uid) return null;
  const entry = profile.inventoryItems?.find(copy=>copy.uid === uid);
  const item = entry ? equipment.find(candidate=>candidate.id === entry.itemId) : null;
  return isSupportedDroneSkinItem(item) ? item : null;
}

// Compatibility for old clients only. The inventory UID loadout is the authority.
export function syncDroneSkinCompatibility(profile){
  const mirror = {};
  const slots = Array.isArray(profile.droneSkinLoadout) ? profile.droneSkinLoadout : [];
  for(let index = 0; index < Math.min(slots.length, getOwnedDroneSkinSlotCount(profile)); index++){
    const item = skinItemByUid(profile, slots[index]);
    if(item) mirror[index] = item.id;
  }
  profile.dronePermanentUpgrades = mirror;
  return mirror;
}

export function getEquippedDroneSkinItem(profile, index){
  const target = Number(index);
  if(!Number.isInteger(target) || target < 0 || target >= getOwnedDroneSkinSlotCount(profile)) return null;
  const uid = Array.isArray(profile?.droneSkinLoadout) ? profile.droneSkinLoadout[target] : null;
  return skinItemByUid(profile, uid);
}

// Only trusted server profiles are migrated. Existing stock is a separate asset from
// the legacy consumed installation, so each old slot receives its own new UID.
export function ensureDroneSkinLoadout(profile, {legacyUpgrades = profile.dronePermanentUpgrades} = {}){
  const owned = getOwnedDroneSkinSlotCount(profile);
  const hadLoadout = Array.isArray(profile.droneSkinLoadout);
  const mayMigrate = !hadLoadout && !(Number(profile.droneSkinLoadoutVersion) >= DRONE_SKIN_LOADOUT_VERSION);
  const slots = Array.from({length:owned}, (_, index)=>hadLoadout && profile.droneSkinLoadout[index] ? String(profile.droneSkinLoadout[index]) : null);
  if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
  if(mayMigrate){
    const used = new Set(profile.inventoryItems.map(entry=>String(entry?.uid || "")));
    const legacy = legacyUpgrades && typeof legacyUpgrades === "object" && !Array.isArray(legacyUpgrades) ? legacyUpgrades : {};
    let granted = 0;
    for(let index = 0; index < owned; index++){
      if(!Object.hasOwn(legacy, index)) continue;
      const item = equipment.find(entry=>entry.id === legacy[index]);
      if(!isSupportedDroneSkinItem(item)) continue;
      const prefix = `inv_migrated_drone_skin_${index + 1}`;
      let uid = prefix, suffix = 1;
      while(used.has(uid)) uid = `${prefix}_${suffix++}`;
      used.add(uid);
      profile.inventoryItems.push({uid, itemId:item.id});
      slots[index] = uid;
      granted++;
    }
    if(granted){
      const next = Number(profile.nextInventoryUid);
      profile.nextInventoryUid = Number.isSafeInteger(next) && next > 0 && next <= Number.MAX_SAFE_INTEGER - granted
        ? next + granted : profile.inventoryItems.length + 1;
    }
  }
  const used = new Set();
  profile.droneSkinLoadout = slots.map(uid=>{
    if(!uid || used.has(uid) || !skinItemByUid(profile, uid)) return null;
    used.add(uid);
    return uid;
  });
  profile.droneSkinLoadoutVersion = DRONE_SKIN_LOADOUT_VERSION;
  syncDroneSkinCompatibility(profile);
  return profile.droneSkinLoadout;
}
