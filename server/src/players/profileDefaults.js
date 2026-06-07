import { sanitizeProfile } from "./profileSanitize.js";
import { cleanupDuplicateEquippedInventoryUids } from "../economy/equipment.js";

const REPAIR_EXTRA_ITEM_IDS = new Set(["extra_repair_starter", "extra_repair_yellow", "extra_repair_bot"]);

export function createDefaultProfile(){
  return sanitizeProfile({
    updatedAt:Date.now(),
    player:{name:"NOVA-37", firmId:"astra", firmSelected:false, level:1, skillPoints:1},
    ownedShips:["orion", "test_runner"],
    inventoryItems:[{uid:"inv_laser_mk1_1", itemId:"laser_mk1"}, {uid:"inv_repair_starter_2", itemId:"extra_repair_starter"}],
    nextInventoryUid:3,
    ammoInventory:{ammo_x1:2500, missile_m1:30, missile_m2:30},
    actionSlots:["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"],
    actionSlotsByShip:{orion:["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"]},
    lastLaserAmmoId:"ammo_x1",
    shipLoadouts:{orion:{lasers:["inv_laser_mk1_1"], generators:[], extras:["inv_repair_starter_2", null, null]}},
    ownedDroneCount:0,
    droneLoadout:[],
    dronePermanentUpgrades:{},
    equipmentUpgrades:{},
    ownedDroneFormations:["base"],
    activeDroneFormation:"base",
    shipCargo:{},
    skillRanks:{},
    skillLevels:{},
    unlockedPortals:[],
    completedPortals:{},
    portalPieces:{blue:0, violet:0, red:0, emerald:0, void:0, ancient:0},
    prestigeCount:0,
    activeQuestIds:[],
    activeQuestId:null,
    questProgress:{},
    questFailProgress:{},
    completedQuestClaims:{},
    shipWorldSessions:{},
    starterRepairGranted:true
  });
}

function makeStarterRepairUid(profile){
  const used = new Set((profile.inventoryItems || []).map(entry=>String(entry?.uid || "")).filter(Boolean));
  let index = Math.max(2, Number(profile.nextInventoryUid || 1));
  let uid = "inv_repair_starter_2";
  while(used.has(uid)) uid = `inv_repair_starter_${index++}`;
  return uid;
}

function getNextProfileInventoryUid(items){
  const maxSuffix = (items || []).reduce((max, entry)=>{
    const match = String(entry?.uid || "").match(/_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return Math.max((items || []).length + 1, maxSuffix + 1);
}

export function ensureStarterRepairDrone(profile){
  if(!profile || typeof profile !== "object") return false;
  let changed = cleanupDuplicateEquippedInventoryUids(profile);
  if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
  const hasAnyRepairBot = profile.inventoryItems.some(entry=>REPAIR_EXTRA_ITEM_IDS.has(entry?.itemId));
  let starterGrantedNow = false;

  if(hasAnyRepairBot && profile.starterRepairGranted !== true){
    profile.starterRepairGranted = true;
    changed = true;
  }
  if(profile.starterRepairGranted !== true && !hasAnyRepairBot){
    const uid = makeStarterRepairUid(profile);
    profile.inventoryItems.push({uid, itemId:"extra_repair_starter"});
    profile.nextInventoryUid = Math.max(getNextProfileInventoryUid(profile.inventoryItems), Number(profile.nextInventoryUid || 1));
    profile.starterRepairGranted = true;
    starterGrantedNow = true;
    changed = true;
  }

  const hasStarterRepair = profile.inventoryItems.some(entry=>entry?.itemId === "extra_repair_starter");
  if(!Array.isArray(profile.actionSlots)) profile.actionSlots = Array(9).fill(null);
  if(!profile.actionSlots.some(Boolean)){
    profile.actionSlots[0] = "ammo_x1";
    if(hasStarterRepair) profile.actionSlots[8] = "extra_repair_starter";
    profile.lastLaserAmmoId = "ammo_x1";
    changed = true;
  }
  if(!profile.actionSlotsByShip || typeof profile.actionSlotsByShip !== "object") profile.actionSlotsByShip = {};
  if(!Array.isArray(profile.actionSlotsByShip.orion)) profile.actionSlotsByShip.orion = [...profile.actionSlots];
  const starterUid = profile.inventoryItems.find(entry=>entry?.itemId === "extra_repair_starter")?.uid;
  if(!starterUid || !starterGrantedNow) return cleanupDuplicateEquippedInventoryUids(profile) || changed;
  if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
  const loadout = profile.shipLoadouts.orion || {lasers:["inv_laser_mk1_1"], missileLauncher:null, rocketLauncher:null, generators:[], extras:[null, null, null]};
  const extras = Array.isArray(loadout.extras) ? loadout.extras : [null, null, null];
  const hasRepairExtra = extras.some(uid=>{
    const itemId = profile.inventoryItems.find(entry=>entry?.uid === uid)?.itemId;
    return REPAIR_EXTRA_ITEM_IDS.has(itemId);
  });
  if(!hasRepairExtra && extras.length > 0){
    extras[0] = starterUid;
    loadout.extras = extras;
    profile.shipLoadouts.orion = loadout;
    changed = true;
  }
  return cleanupDuplicateEquippedInventoryUids(profile) || changed;
}
