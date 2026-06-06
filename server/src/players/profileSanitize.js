import { normalizeProgressionPlayer } from "./progression.js";

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

export function sanitizeActionSlots(value){
  if(!Array.isArray(value)){
    return ["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"];
  }
  return Array.from({length:9}, (_,index)=>{
    const itemId = value[index];
    return typeof itemId === "string" && itemId.length > 0 ? itemId : null;
  });
}

export function sanitizeProfile(profile = {}){
  return {
    updatedAt:Math.max(0, Number(profile.updatedAt || Date.now())),
    player:normalizeProgressionPlayer(sanitizeObject(profile.player)),
    activeShip:typeof profile.activeShip === "string" ? profile.activeShip : null,
    selectedShip:typeof profile.selectedShip === "string" ? profile.selectedShip : null,
    ownedShips:Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : undefined,
    inventoryItems:Array.isArray(profile.inventoryItems)
      ? profile.inventoryItems.filter(entry=>entry?.uid && entry?.itemId).map(entry=>({uid:String(entry.uid), itemId:String(entry.itemId)}))
      : undefined,
    nextInventoryUid:Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1))),
    ammoInventory:sanitizeObject(profile.ammoInventory),
    actionSlots:sanitizeActionSlots(profile.actionSlots),
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
    refineryLastTick:Math.max(0, Number(profile.refineryLastTick || Date.now())),
    activeQuestIds:Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds.map(String).slice(0, 5) : [],
    activeQuestId:typeof profile.activeQuestId === "string" ? profile.activeQuestId : null,
    questProgress:sanitizeObject(profile.questProgress),
    questFailProgress:sanitizeObject(profile.questFailProgress),
    completedQuestClaims:sanitizeObject(profile.completedQuestClaims),
    killStats:sanitizeObject(profile.killStats),
    rankKillStats:sanitizeObject(profile.rankKillStats),
    worldSession:sanitizeWorldSession(profile.worldSession)
  };
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
    "prestigeCount"
  ]);
  for(const field of [
    "ownedShips", "activeShip", "selectedShip", "inventoryItems", "nextInventoryUid",
    "ammoInventory", "shipLoadouts", "ownedDroneCount", "droneLoadout",
    "dronePermanentUpgrades", "equipmentUpgrades", "ownedDroneFormations",
    "activeDroneFormation", "activeQuestIds", "activeQuestId", "questProgress",
    "questFailProgress", "completedQuestClaims", "worldSession", "cargoHold",
    "shipCargo", "skillRanks", "skillLevels", "unlockedPortals", "completedPortals",
    "portalPieces", "prestigeCount", "refineryLevels", "refineryModules",
    "refineryUpgradeJobs", "refineryShipmentJob", "refineryJob",
    "refineryProductionDisabled", "refineryLastTick", "killStats", "rankKillStats"
  ]){
    if(alwaysProtected.has(field) || hasProtectedOwnershipValue(existing, field)){
      incoming[field] = cloneProtectedValue(existing[field]);
    }
  }
  return incoming;
}
