import { normalizeState } from "./stateNormalizer.js";
export { getActiveDroneFormation, getAllRawMaterials, getAllQuests, getAmmo, getDroneCatalog, getDroneFormation, getDroneFormationBonus, getItem, getPortal, getQuest, getRawMaterial, getRefineryRecipe, getRefineryRecipes, getShip, isGenerator, isWeapon } from "./catalogStore.js";
import { enforcePlayerCurrencyMinimums } from "./currencyStore.js";
export { canAfford, enforcePlayerCurrencyMinimums, priceLabel, spend } from "./currencyStore.js";
export { getSpentSkillPoints, getXpNextForLevel, syncSkillPoints, XP_CURVE_VERSION } from "./xpStore.js";
export { addPortalPiece, getCompletedPortalCount, getCompletedPortalCountForId, getPlayerLevelCap, getPortalPieces, getPrestigeStatus, getShipPurchaseLockReason, getShipRequiredCompletedPortal, hasCompletedPortal, hasMaxedFirstLoopSkills, isEquipmentUpgradeUnlocked, isPortalUnlocked, isRecipeSystemUnlocked, isPrestigeUnlocked, isShipPurchaseUnlocked, markPortalCompleted, performPrestige, unlockPortal } from "./portalProgressStore.js";
export { canAffordSkillCost, getNodeMaxRank, getSkillBonus, getSkillDefinition, getSkillLevel, getSkillNodeLockReason, getSkillNodePortalRequirement, getSkillProgress, getSkillRanks, getSkillUpgradeData, hasCompletedSkillNodePortal, isSkillNodeUnlocked, skillCostLabel, upgradeSkill } from "./skillStore.js";
export {
  addAmmo,
  addInventoryItem,
  applyDronePermanentUpgrade,
  cleanDroneLoadout,
  cleanLoadout,
  consumeAmmo,
  ensureShipLoadout,
  findEquippedSlot,
  getAmmoCount,
  getDroneLoadout,
  getDronePurchasePrice,
  getDroneDamageMultiplier,
  getDronePermanentUpgrade,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getInventoryByCategory,
  getInventoryCount,
  getInventoryItem,
  getItemFromInventoryUid,
  isDroneCompatibleEquipment,
  isDronePermanentUpgradeItem,
  getLoadout,
  getWeaponAverageDamage,
  makeEmptyLoadout,
  removeInventoryItems,
  setActionSlot,
  unequipInventoryItem,
  upgradeEquipment
} from "./equipmentStore.js";
export { acceptQuest, canClaimQuest, claimQuest, getActiveQuest, getActiveQuests, getQuestObjectiveProgress, getQuestProgress, recordQuestCoordinateVisit, recordQuestDeath, recordQuestHpLoss, recordQuestItemPickup, recordQuestKill, recordQuestMapVisit, recordQuestNpcTalk, recordQuestRefineryMaterialUpgradeStart, recordQuestRefineryModuleUpgradeStart, recordQuestSpaceCasterUse, recordQuestTimeElapsed, rollQuestItemDropFromKill } from "./questStore.js";
import { getRankScore } from "./rankStore.js";
export {
  RANK_TABLE,
  RANK_POINT_RULES,
  LOCAL_LEADERBOARD_PREVIEW,
  calculateMonsterKillRankPoints,
  getCurrentRank,
  getLeaderboardRows,
  getNextRank,
  getRankAssetPath,
  getRankBreakdown,
  getRankById,
  getRankForScore,
  getRankProgress,
  getRankScore,
  registerKill
} from "./rankStore.js";
export {
  addMaterial,
  addShipCargoMaterial,
  addShipCargoMaterialForced,
  consumeShipCargoMaterial,
  consumeMaterial,
  getCargoUsed,
  getMaterialCount,
  getShipCargo,
  getShipCargoCapacity,
  getShipCargoUsed
} from "./cargoStore.js";
export { GRAPHICS_QUALITY_PRESETS, getGraphicsQuality, normalizeGraphicsQuality, setGraphicsQuality } from "./graphicsStore.js";
export { normalizeState } from "./stateNormalizer.js";
export { addReputation, addReputationFromXp, addXP, getEquippedDroneGenerators, getEquippedDroneItems, getEquippedDroneLasers, getEquippedExtras, getEquippedGenerators, getEquippedLasers, getEquippedLauncher, getExtraBonus, getRealSpeedFromStat, getShipCombatStats, recordWeaponUse } from "./combatStatsStore.js";
export {
  COMBAT_BOOST_DEFS,
  depositCombatBoostMaterial,
  getCombatBoostMaterialInfo,
  getCombatBoostSummary,
  getCombatBoostTargetMaterialInfo,
  getCombatBoostTooltip,
  getCombatTimedBoostPercent,
  consumeCombatBoostCharges,
  normalizeCombatBoostTarget,
  tickCombatBoosts
} from "./combatBoostStore.js";
export { claimRefineryJob, getRefineryJob, isRefineryComplete, startRefineryJob } from "./refineryJobStore.js";
export {
  canShipRefineryMaterial,
  completeRefineryShipment,
  completeRefineryUpgradeJobs,
  formatDuration,
  getDefaultRefineryLevel,
  getMaterialStorageCap,
  getMaterialStorageCapAt,
  getRefineryMaterialLevel,
  getRefineryModuleLevel,
  getRefineryModuleUpgradeData,
  getRefineryProductionRate,
  getRefineryProductionRateAt,
  getRefineryRushCost,
  getRefineryShipmentData,
  getRefineryShipmentJob,
  getRefineryShipmentProgress,
  getRefineryShipmentRushCost,
  getRefineryTransportCapacity,
  getRefineryTransportCapacityAt,
  getRefineryUpgradeData,
  getRefineryUpgradeJob,
  getRefineryUpgradeProgress,
  getShipRefineryRecipeData,
  getShippableRefineryMaterials,
  isRefineryProductionEnabled,
  refineShipCargoRecipe,
  rushRefineryShipment,
  rushRefineryUpgrade,
  startRefineryMaterialUpgrade,
  startRefineryModuleUpgrade,
  startRefineryShipment,
  tickRefineryProduction,
  toggleRefineryProduction,
  upgradeRefineryMaterial,
  upgradeRefineryModule
} from "./refineryStore.js";





export const store = {
  state:null,
  shopFilter:"vaisseau",
  currentView:"hangar",
  hangarDetailOpen:false,
  hangarTab:"vaisseau",
  profileTab:"overview",
  selectedInventoryUid:null,
  selectedShopProduct:null,
  selectedShopAmmoMultiplier:1,
  selectedRefineryUpgrade:null,
  selectedRefineryTab:"forge",
  selectedRefineryShipmentMaterial:null,
  selectedRefineryShipmentAmount:30
};

const DEFAULT_STATE_STORAGE_KEY = "voidsector-prototype-state";
let stateStorageKey = DEFAULT_STATE_STORAGE_KEY;

export function loadState(){
  try{
    const raw = localStorage.getItem(stateStorageKey);
    return normalizeState(raw ? JSON.parse(raw) : null);
  }catch(e){
    return normalizeState(null);
  }
}

export function saveState(){
  if(globalThis.__voidsectorResetInProgress) return;
  if(store.state.player) store.state.player.rankScore = getRankScore();
  enforcePlayerCurrencyMinimums();
  localStorage.setItem(stateStorageKey, JSON.stringify(store.state));
}

export function getStateStorageKey(){
  return stateStorageKey;
}

export function setStateStorageScope(scope = "guest"){
  const clean = String(scope || "guest").trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "_") || "guest";
  stateStorageKey = clean === "guest" ? DEFAULT_STATE_STORAGE_KEY : `${DEFAULT_STATE_STORAGE_KEY}:${clean}`;
  return stateStorageKey;
}

