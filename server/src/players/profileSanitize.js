import { normalizeProgressionPlayer } from "./progression.js";
import { getInventoryEntryQuantity, isStackableInventoryItem } from "../economy/inventoryStacks.js";
import { cleanupDuplicateEquippedInventoryUids } from "../economy/equipment.js";
import { normalizeFirmId } from "../../../src/data/firms.js";
import { normalizePremiumRewardState, normalizeStarterPackPurchases } from "../../../src/data/premium.js";
import { sanitizeActivityLog } from "./activityLog.js";
import { sanitizeCombatBoosts } from "../economy/combatBoosts.js";
import { sanitizePilotName } from "./profileIdentity.js";

const EMPTY_ACTION_SLOTS = Array(9).fill(null);
const STARTER_ACTION_SLOTS = ["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"];

export function sanitizeObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

export function sanitizeWorldSession(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return null;
  const mapId = String(value.mapId ?? "0");
  const x = Number(value.x);
  const y = Number(value.y);
  if(!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    mapId,
    x,
    y,
    angle:Number(value.angle || 0),
    hp:Math.max(0, Number(value.hp || 0)),
    maxHp:Math.max(0, Number(value.maxHp || value.hp || 0)),
    shield:Math.max(0, Number(value.shield || 0)),
    maxShield:Math.max(0, Number(value.maxShield || value.shield || 0)),
    shipId:String(value.shipId || "unknown"),
    shipImg:String(value.shipImg || ""),
    updatedAt:Math.max(0, Number(value.updatedAt || Date.now()))
  };
}

function sanitizeShipWorldSessions(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .map(([shipId, session])=>[String(shipId), sanitizeWorldSession(session)])
    .filter(([, session])=>Boolean(session)));
}

export function sanitizeActionSlots(value, fallback = STARTER_ACTION_SLOTS){
  if(!Array.isArray(value)){
    return [...fallback];
  }
  return Array.from({length:9}, (_,index)=>{
    const itemId = value[index];
    return typeof itemId === "string" && itemId.length > 0 ? itemId : null;
  });
}

function sanitizeActionSlotsByShip(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([shipId, slots])=>[
    String(shipId),
    sanitizeActionSlots(slots, EMPTY_ACTION_SLOTS)
  ]));
}

function sanitizeSocial(value){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const list = field=>[...new Set((Array.isArray(source[field]) ? source[field] : [])
    .map(entry=>String(entry || "").trim())
    .filter(Boolean))]
    .slice(0, 250);
  return {
    friends:list("friends"),
    incoming:list("incoming"),
    outgoing:list("outgoing"),
    enemies:list("enemies"),
    ignored:list("ignored")
  };
}

function sanitizeFirmBoxes(value){
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(["common", "rare", "veryRare", "elite", "mythic"].map(rarity=>[
    rarity,
    Math.max(0, Math.floor(Number(source[rarity] || 0)))
  ]));
}

function sanitizeFirmRewardHistory(value){
  return (Array.isArray(value) ? value : []).slice(-60).map(entry=>({
    id:String(entry?.id || ""),
    source:String(entry?.source || "firm"),
    label:String(entry?.label || "Recompense de firme"),
    rarity:entry?.rarity ? String(entry.rarity) : undefined,
    reward:sanitizeObject(entry?.reward),
    createdAt:Math.max(0, Number(entry?.createdAt || Date.now()))
  }));
}

export function sanitizeProfile(profile = {}){
  const inventoryItems = [];
  for(const entry of Array.isArray(profile.inventoryItems) ? profile.inventoryItems : []){
    if(!entry?.uid || !entry?.itemId) continue;
    const itemId = String(entry.itemId);
    if(isStackableInventoryItem(itemId)){
      const existing = inventoryItems.find(item=>item.itemId === itemId);
      if(existing) existing.quantity += getInventoryEntryQuantity(entry);
      else inventoryItems.push({uid:String(entry.uid), itemId, quantity:getInventoryEntryQuantity(entry)});
    }else inventoryItems.push({uid:String(entry.uid), itemId});
  }
  const sanitized = {
    updatedAt:Math.max(0, Number(profile.updatedAt || Date.now())),
    player:normalizeProgressionPlayer(sanitizeObject(profile.player)),
    premiumRewardState:normalizePremiumRewardState(profile.premiumRewardState),
    starterPackPurchases:normalizeStarterPackPurchases(profile.starterPackPurchases),
    activeShip:typeof profile.activeShip === "string" ? profile.activeShip : null,
    selectedShip:typeof profile.selectedShip === "string" ? profile.selectedShip : null,
    ownedShips:Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : undefined,
    inventoryItems,
    nextInventoryUid:Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1))),
    ammoInventory:sanitizeObject(profile.ammoInventory),
    actionSlots:sanitizeActionSlots(profile.actionSlots),
    actionSlotsByShip:sanitizeActionSlotsByShip(profile.actionSlotsByShip),
    lastLaserAmmoId:typeof profile.lastLaserAmmoId === "string" ? profile.lastLaserAmmoId : null,
    shipLoadouts:sanitizeObject(profile.shipLoadouts),
    ownedDroneCount:Math.max(0, Math.floor(Number(profile.ownedDroneCount || 0))),
    droneLoadout:Array.isArray(profile.droneLoadout) ? profile.droneLoadout.map(value=>value === null ? null : String(value)) : undefined,
    dronePermanentUpgrades:sanitizeObject(profile.dronePermanentUpgrades),
    equipmentUpgrades:sanitizeObject(profile.equipmentUpgrades),
    ownedDroneFormations:Array.isArray(profile.ownedDroneFormations) ? profile.ownedDroneFormations.map(String) : undefined,
    activeDroneFormation:typeof profile.activeDroneFormation === "string" ? profile.activeDroneFormation : null,
    cargoHold:sanitizeObject(profile.cargoHold),
    shipCargo:sanitizeObject(profile.shipCargo),
    combatBoosts:sanitizeCombatBoosts(profile.combatBoosts),
    skillRanks:sanitizeObject(profile.skillRanks),
    skillLevels:sanitizeObject(profile.skillLevels),
    unlockedPortals:Array.isArray(profile.unlockedPortals) ? profile.unlockedPortals.map(String) : [],
    completedPortals:sanitizeObject(profile.completedPortals),
    portalPieces:sanitizeObject(profile.portalPieces),
    prestigeCount:Math.max(0, Math.floor(Number(profile.prestigeCount || 0))),
    refineryLevels:sanitizeObject(profile.refineryLevels),
    refineryModules:sanitizeObject(profile.refineryModules),
    refineryUpgradeJobs:sanitizeObject(profile.refineryUpgradeJobs),
    refineryShipmentJob:profile.refineryShipmentJob && typeof profile.refineryShipmentJob === "object" ? sanitizeObject(profile.refineryShipmentJob) : null,
    refineryJob:profile.refineryJob && typeof profile.refineryJob === "object" ? sanitizeObject(profile.refineryJob) : null,
    refineryProductionDisabled:sanitizeObject(profile.refineryProductionDisabled),
    refineryProductionRemainders:sanitizeObject(profile.refineryProductionRemainders),
    refineryLastTick:Math.max(0, Number(profile.refineryLastTick || Date.now())),
    activeQuestIds:Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds.map(String).slice(0, 5) : [],
    activeQuestId:typeof profile.activeQuestId === "string" ? profile.activeQuestId : null,
    questProgress:sanitizeObject(profile.questProgress),
    questFailProgress:sanitizeObject(profile.questFailProgress),
    completedQuestClaims:sanitizeObject(profile.completedQuestClaims),
    killStats:sanitizeObject(profile.killStats),
    rankKillStats:sanitizeObject(profile.rankKillStats),
    activityLog:sanitizeActivityLog(profile.activityLog),
    worldSession:sanitizeWorldSession(profile.worldSession),
    shipWorldSessions:sanitizeShipWorldSessions(profile.shipWorldSessions),
    social:sanitizeSocial(profile.social),
    firmatons:Math.max(0, Math.floor(Number(profile.firmatons || 0))),
    firmBoxes:sanitizeFirmBoxes(profile.firmBoxes),
    firmRewardHistory:sanitizeFirmRewardHistory(profile.firmRewardHistory),
    starterRepairGranted:Boolean(profile.starterRepairGranted)
  };
  sanitized.player.name = sanitizePilotName(sanitized.player.name, "NOVA-37");
  sanitized.player.firmId = normalizeFirmId(sanitized.player.firmId || sanitized.player.firm || sanitized.player.company || sanitized.player.faction || "astra");
  sanitized.player.firmSelected = Boolean(sanitized.player.firmSelected);
  cleanupDuplicateEquippedInventoryUids(sanitized);
  return sanitized;
}

function hasProtectedOwnershipValue(profile, field){
  if(!profile || !Object.hasOwn(profile, field) || profile[field] === undefined) return false;
  const value = profile[field];
  if(field === "nextInventoryUid"){
    return Number(value || 0) > 1 || (Array.isArray(profile.inventoryItems) && profile.inventoryItems.length > 0);
  }
  if(field === "ownedDroneCount") return Number(value || 0) > 0;
  if(Array.isArray(value)) return value.length > 0;
  if(value && typeof value === "object") return Object.keys(value).length > 0;
  return typeof value === "string" && value.length > 0;
}

function cloneProtectedValue(value){
  return JSON.parse(JSON.stringify(value ?? null));
}

export function preserveProtectedOwnership(incoming, existing){
  if(!existing) return incoming;
  const alwaysProtected = new Set([
    "skillRanks",
    "skillLevels",
    "unlockedPortals",
    "completedPortals",
    "portalPieces",
    "prestigeCount",
    "firmatons",
    "firmBoxes",
    "firmRewardHistory",
    "activityLog",
    "combatBoosts",
    "premiumRewardState",
    "starterPackPurchases",
    "refineryProductionRemainders",
    "starterRepairGranted"
  ]);
  for(const field of [
    "ownedShips", "activeShip", "selectedShip", "inventoryItems", "nextInventoryUid",
    "ammoInventory", "shipLoadouts", "ownedDroneCount", "droneLoadout",
    "dronePermanentUpgrades", "equipmentUpgrades", "ownedDroneFormations",
    "activeDroneFormation", "activeQuestIds", "activeQuestId", "questProgress",
    "questFailProgress", "completedQuestClaims", "worldSession", "shipWorldSessions", "cargoHold",
    "shipCargo", "combatBoosts", "skillRanks", "skillLevels", "unlockedPortals", "completedPortals",
    "portalPieces", "prestigeCount", "premiumRewardState", "refineryLevels", "refineryModules",
    "refineryUpgradeJobs", "refineryShipmentJob", "refineryJob",
    "refineryProductionDisabled", "refineryProductionRemainders", "refineryLastTick", "killStats", "rankKillStats",
    "activityLog", "social", "firmatons", "firmBoxes", "firmRewardHistory", "starterPackPurchases", "starterRepairGranted"
  ]){
    if(alwaysProtected.has(field) || hasProtectedOwnershipValue(existing, field)){
      incoming[field] = cloneProtectedValue(existing[field]);
    }
  }
  return incoming;
}
