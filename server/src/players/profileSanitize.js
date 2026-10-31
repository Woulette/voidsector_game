import { getProgressionLevelCap, normalizeProgressionPlayer } from "./progression.js";
import { sanitizeAzuronProgress } from "../../../src/shared/azuronProgress.js";
import { normalizePortalAttempts } from "../../../src/shared/portalAttempts.js";
import { getInventoryEntryQuantity, isStackableInventoryItem } from "../economy/inventoryStacks.js";
import { cleanupDuplicateEquippedInventoryUids, sanitizeEquipmentUpgrades } from "../economy/equipment.js";
import { ensureDroneSkinLoadout, getOwnedDroneSkinSlotCount } from "../economy/droneSkins.js";
import { normalizeFirmId } from "../../../src/data/firms.js";
import { normalizeBetaPackPurchases, normalizeBetaRewardState, normalizePremiumRewardState, normalizeStarterPackPurchases } from "../../../src/data/premium.js";
import { sanitizeActivityLog } from "./activityLog.js";
import { sanitizeCombatBoosts } from "../economy/combatBoosts.js";
import { sanitizePilotName } from "./profileIdentity.js";
import { sanitizeTutorialState } from "../../../src/shared/tutorial.js";
import { calculateMonsterRankPointsForKills, calculateRankScore } from "../../../src/data/ranks.js";
import { sanitizePlayerBoosterState } from "../../../src/shared/firmBoosters.js";
import { ships } from "../../../src/data/ships.js";
import { sanitizeCraftingJob } from "../economy/craftingJobs.js";
import { getShipProgressionLockReason } from "../../../src/shared/progressionUnlocks.js";
import { sanitizeProfileTitleState } from "./profileTitles.js";
import { migrateQuestCatalog, questCatalogRevision } from "../quests/questCatalogMigration.js";

const EMPTY_ACTION_SLOTS = Array(9).fill(null);
const STARTER_ACTION_SLOTS = ["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"];
const CLIENT_TIMESTAMP_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const SHIP_ID_ALIASES = Object.freeze({
  astra_3d_test:"astralis"
});
const VALID_SHIP_IDS = new Set(ships.map(ship=>ship.id));

function sanitizeTimestamp(value, fallback = 0){
  const numeric = Number(value);
  if(!Number.isFinite(numeric)) return Math.max(0, Math.floor(Number(fallback || 0)));
  return Math.max(
    0,
    Math.min(
      Number.MAX_SAFE_INTEGER,
      Date.now() + CLIENT_TIMESTAMP_FUTURE_TOLERANCE_MS,
      Math.floor(numeric)
    )
  );
}

function normalizeShipId(id){
  const clean = String(id || "");
  return SHIP_ID_ALIASES[clean] || clean;
}

function sanitizeShipIdList(value){
  return [...new Set((Array.isArray(value) ? value : [])
    .map(normalizeShipId)
    .filter(shipId=>VALID_SHIP_IDS.has(shipId)))];
}

function sanitizeShipKeyedObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = {};
  for(const [rawShipId, entry] of Object.entries(value)){
    const shipId = normalizeShipId(rawShipId);
    if(!VALID_SHIP_IDS.has(shipId)) continue;
    normalized[shipId] = sanitizeObject(entry);
  }
  return normalized;
}

export function sanitizeObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

export function sanitizeWorldSession(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return null;
  const shipId = normalizeShipId(value.shipId || "unknown");
  if(!VALID_SHIP_IDS.has(shipId)) return null;
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
    firmHullMultiplier:Math.max(1, Math.min(6, Number(value.firmHullMultiplier || 1) || 1)),
    firmShieldMultiplier:Math.max(1, Math.min(6, Number(value.firmShieldMultiplier || 1) || 1)),
    shipId,
    shipImg:String(value.shipImg || ""),
    updatedAt:Math.max(0, Number(value.updatedAt || Date.now()))
  };
}

export function sanitizePreparedPortal(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return null;
  const portalId = String(value.portalId || value.portal?.id || "").trim();
  const mapId = String(value.mapId ?? "").trim();
  const x = Number(value.x);
  const y = Number(value.y);
  if(!portalId || !mapId || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const portalName = String(value.portal?.name || value.displayLabel || value.label || "Portail").slice(0, 120);
  return {
    id:String(value.id || `prepared-${portalId}`).slice(0, 160),
    portalId,
    portal:{
      id:portalId,
      name:portalName,
      totalWaves:Math.max(0, Math.floor(Number(value.portal?.totalWaves || 0)))
    },
    mapId,
    mapName:String(value.mapName || mapId).slice(0, 120),
    x:Math.max(-100_000, Math.min(100_000, x)),
    y:Math.max(-100_000, Math.min(100_000, y)),
    r:Math.max(20, Math.min(500, Number(value.r || 115))),
    safeRadius:Math.max(20, Math.min(1500, Number(value.safeRadius || 280))),
    activationRadius:Math.max(20, Math.min(2000, Number(value.activationRadius || 430))),
    label:String(value.label || portalName).slice(0, 120).toUpperCase(),
    displayLabel:String(value.displayLabel || portalName).slice(0, 120).toUpperCase(),
    dungeonPortal:true,
    prepared:true,
    preparedAt:sanitizeTimestamp(value.preparedAt, Date.now())
  };
}

function sanitizeShipWorldSessions(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .map(([shipId, session])=>[normalizeShipId(shipId), sanitizeWorldSession({...session, shipId})])
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
  return Object.fromEntries(Object.entries(value)
    .map(([shipId, slots])=>[normalizeShipId(shipId), slots])
    .filter(([shipId])=>VALID_SHIP_IDS.has(shipId))
    .map(([shipId, slots])=>[
      shipId,
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

function rebuildMonsterRankStats(profile){
  const killStats = profile.killStats || {};
  const rankKillStats = profile.rankKillStats || {};
  const kinds = new Set([...Object.keys(killStats), ...Object.keys(rankKillStats)]);
  const rebuilt = {};
  let total = 0;
  for(const kind of kinds){
    const entry = rankKillStats[kind];
    const kills = Math.max(
      0,
      Math.floor(Number(killStats[kind] || 0)),
      Math.floor(Number(entry?.kills || 0))
    );
    const points = calculateMonsterRankPointsForKills(kind, kills);
    killStats[kind] = kills;
    rebuilt[kind] = {kills, points};
    total += points;
  }
  profile.killStats = killStats;
  profile.rankKillStats = rebuilt;
  profile.player.monsterRankPoints = total;
  const portalClears = Object.values(profile.completedPortals || {})
    .reduce((sum, count)=>sum + Math.max(0, Number(count || 0)), 0);
  profile.player.rankScore = calculateRankScore(profile.player, portalClears);
}

export function sanitizeProfile(profile = {}){
  const inventoryItems = [];
  const prestigeCount = Math.min(1, Math.max(0, Math.floor(Number(profile.prestigeCount || 0))));
  const ownedDroneCount = getOwnedDroneSkinSlotCount(profile);
  const sanitizedPlayer = sanitizeObject(profile.player);
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
    updatedAt:sanitizeTimestamp(profile.updatedAt, Date.now()),
    player:normalizeProgressionPlayer(sanitizedPlayer, getProgressionLevelCap(prestigeCount)),
    premiumRewardState:normalizePremiumRewardState(profile.premiumRewardState),
    betaRewardState:normalizeBetaRewardState(profile.betaRewardState),
    betaPackPurchases:normalizeBetaPackPurchases(profile.betaPackPurchases),
    betaLaunchEntitlements:Array.isArray(profile.betaLaunchEntitlements) ? [...new Set(profile.betaLaunchEntitlements.map(String).filter(Boolean))] : [],
    betaLaunchPremiumDays:Math.max(0, Math.floor(Number(profile.betaLaunchPremiumDays || 0))),
    betaShipChoices:sanitizeObject(profile.betaShipChoices),
    starterPackPurchases:normalizeStarterPackPurchases(profile.starterPackPurchases),
    activeShip:typeof profile.activeShip === "string" && VALID_SHIP_IDS.has(normalizeShipId(profile.activeShip)) ? normalizeShipId(profile.activeShip) : null,
    selectedShip:typeof profile.selectedShip === "string" && VALID_SHIP_IDS.has(normalizeShipId(profile.selectedShip)) ? normalizeShipId(profile.selectedShip) : null,
    ownedShips:Array.isArray(profile.ownedShips) ? sanitizeShipIdList(profile.ownedShips) : undefined,
    inventoryItems,
    nextInventoryUid:Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1))),
    ammoInventory:sanitizeObject(profile.ammoInventory),
    actionSlots:sanitizeActionSlots(profile.actionSlots),
    actionSlotsByShip:sanitizeActionSlotsByShip(profile.actionSlotsByShip),
    actionSlotsUpdatedAt:sanitizeTimestamp(profile.actionSlotsUpdatedAt, 0),
    lastLaserAmmoId:typeof profile.lastLaserAmmoId === "string" ? profile.lastLaserAmmoId : null,
    shipLoadouts:sanitizeShipKeyedObject(profile.shipLoadouts),
    ownedDroneCount,
    droneLoadout:Array.isArray(profile.droneLoadout) ? profile.droneLoadout.map(value=>value === null ? null : String(value)) : undefined,
    droneSkinLoadout:Array.isArray(profile.droneSkinLoadout) ? [...profile.droneSkinLoadout] : undefined,
    droneSkinLoadoutVersion:profile.droneSkinLoadoutVersion,
    dronePermanentUpgrades:{},
    equipmentUpgrades:sanitizeEquipmentUpgrades(profile.equipmentUpgrades),
    ownedDroneFormations:Array.isArray(profile.ownedDroneFormations) ? profile.ownedDroneFormations.map(String) : undefined,
    activeDroneFormation:typeof profile.activeDroneFormation === "string" ? profile.activeDroneFormation : null,
    cargoHold:sanitizeObject(profile.cargoHold),
    shipCargo:sanitizeShipKeyedObject(profile.shipCargo),
    combatBoosts:sanitizeCombatBoosts(profile.combatBoosts),
    shipAbilityStates:sanitizeShipKeyedObject(profile.shipAbilityStates),
    eliteLaserStates:sanitizeObject(profile.eliteLaserStates),
    boosters:sanitizePlayerBoosterState(profile.boosters),
    skillRanks:sanitizeObject(profile.skillRanks),
    skillLevels:sanitizeObject(profile.skillLevels),
    unlockedPortals:Array.isArray(profile.unlockedPortals) ? profile.unlockedPortals.map(String) : [],
    completedPortals:sanitizeObject(profile.completedPortals),
    portalPieces:sanitizeObject(profile.portalPieces),
    preparedPortal:sanitizePreparedPortal(profile.preparedPortal),
    azuronProgress:sanitizeAzuronProgress(profile.azuronProgress),
    prestigeCount,
    refineryLevels:sanitizeObject(profile.refineryLevels),
    refineryModules:sanitizeObject(profile.refineryModules),
    refineryUpgradeJobs:sanitizeObject(profile.refineryUpgradeJobs),
    refineryShipmentJob:profile.refineryShipmentJob && typeof profile.refineryShipmentJob === "object" ? sanitizeObject(profile.refineryShipmentJob) : null,
    refineryJob:profile.refineryJob && typeof profile.refineryJob === "object" ? sanitizeObject(profile.refineryJob) : null,
    craftingJob:sanitizeCraftingJob(profile.craftingJob),
    refineryProductionDisabled:sanitizeObject(profile.refineryProductionDisabled),
    refineryProductionRemainders:sanitizeObject(profile.refineryProductionRemainders),
    refineryLastTick:Math.max(0, Number(profile.refineryLastTick || Date.now())),
    activeQuestIds:Array.isArray(profile.activeQuestIds) ? profile.activeQuestIds.map(String).slice(0, 5) : [],
    activeQuestId:typeof profile.activeQuestId === "string" ? profile.activeQuestId : null,
    questProgress:sanitizeObject(profile.questProgress),
    questFailProgress:sanitizeObject(profile.questFailProgress),
    completedQuestClaims:sanitizeObject(profile.completedQuestClaims),
    questCatalogRevision:questCatalogRevision(profile.questCatalogRevision),
    tutorial:sanitizeTutorialState(profile.tutorial, {missingStatus:"abandoned"}),
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
  sanitizeProfileTitleState(sanitized);
  if(!Array.isArray(sanitized.ownedShips) || sanitized.ownedShips.length === 0) sanitized.ownedShips = ["orion"];
  if(!sanitized.ownedShips.includes("orion")) sanitized.ownedShips.unshift("orion");
  const availableOwnedShipIds = sanitized.ownedShips.filter(shipId=>{
    const ship = ships.find(candidate=>candidate.id === shipId);
    return ship && !getShipProgressionLockReason(sanitized, ship);
  });
  const fallbackShipId = availableOwnedShipIds.includes("orion")
    ? "orion"
    : availableOwnedShipIds[0] || "orion";
  const activeShipDefinition = ships.find(ship=>ship.id === sanitized.activeShip);
  if(
    !activeShipDefinition
    || !sanitized.ownedShips.includes(activeShipDefinition.id)
    || getShipProgressionLockReason(sanitized, activeShipDefinition)
  ){
    sanitized.activeShip = fallbackShipId;
  }
  const selectedShipDefinition = ships.find(ship=>ship.id === sanitized.selectedShip);
  if(
    !selectedShipDefinition
    || !sanitized.ownedShips.includes(selectedShipDefinition.id)
    || getShipProgressionLockReason(sanitized, selectedShipDefinition)
  ){
    sanitized.selectedShip = sanitized.activeShip;
  }
  Object.assign(sanitized,normalizePortalAttempts({...sanitized,portalAttempt:profile.portalAttempt,portalAttemptsVersion:profile.portalAttemptsVersion}));
  rebuildMonsterRankStats(sanitized);
  ensureDroneSkinLoadout(sanitized, {legacyUpgrades:profile.dronePermanentUpgrades});
  cleanupDuplicateEquippedInventoryUids(sanitized);
  migrateQuestCatalog(sanitized);
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
    "droneSkinLoadout",
    "droneSkinLoadoutVersion",
    "dronePermanentUpgrades",
    "skillRanks",
    "skillLevels",
    "unlockedPortals",
    "completedPortals",
    "portalPieces",
    "preparedPortal",
    "prestigeCount",
    "firmatons",
    "firmBoxes",
    "firmRewardHistory",
    "activityLog",
    "combatBoosts",
    "eliteLaserStates",
    "shipAbilityStates",
    "boosters",
    "premiumRewardState",
    "betaRewardState",
    "betaPackPurchases",
    "betaLaunchEntitlements",
    "betaLaunchPremiumDays",
    "betaShipChoices",
    "starterPackPurchases",
    "refineryProductionRemainders",
    "craftingJob",
    "starterRepairGranted",
    "tutorial",
    "questCatalogRevision",
    "azuronProgress",
    "portalAttemptsVersion",
    "portalAttempt"
  ]);
  for(const field of [
    "ownedShips", "activeShip", "selectedShip", "inventoryItems", "nextInventoryUid", "portalAttemptsVersion", "portalAttempt",
    "ammoInventory", "shipLoadouts", "ownedDroneCount", "droneLoadout",
    "dronePermanentUpgrades", "droneSkinLoadout", "droneSkinLoadoutVersion", "equipmentUpgrades", "ownedDroneFormations",
    "activeDroneFormation", "activeQuestIds", "activeQuestId", "questProgress",
    "questFailProgress", "completedQuestClaims", "questCatalogRevision", "worldSession", "shipWorldSessions", "cargoHold",
    "shipCargo", "combatBoosts", "shipAbilityStates", "eliteLaserStates", "boosters", "skillRanks", "skillLevels", "unlockedPortals", "completedPortals",
    "portalPieces", "preparedPortal", "azuronProgress", "prestigeCount", "premiumRewardState", "betaRewardState", "betaPackPurchases", "betaLaunchEntitlements", "betaLaunchPremiumDays", "betaShipChoices", "refineryLevels", "refineryModules",
    "refineryUpgradeJobs", "refineryShipmentJob", "refineryJob",
    "craftingJob",
    "refineryProductionDisabled", "refineryProductionRemainders", "refineryLastTick", "killStats", "rankKillStats",
    "activityLog", "social", "firmatons", "firmBoxes", "firmRewardHistory", "starterPackPurchases", "starterRepairGranted", "tutorial"
  ]){
    if(alwaysProtected.has(field) || hasProtectedOwnershipValue(existing, field)){
      incoming[field] = cloneProtectedValue(existing[field]);
    }
  }
  return incoming;
}
