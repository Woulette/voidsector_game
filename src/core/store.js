import { ammoTypes, defaultState, droneCatalog, droneFormations, equipment, portals, questCatalog, rawMaterialCatalog, refineryRecipes, ships, skills } from "../data/catalog.js";
import { clone, fmt } from "./utils.js";
import { normalizeSlotKeybinds } from "./keybinds.js";
import { getSkillBonus } from "./skillStore.js";
export { canAffordSkillCost, getNodeMaxRank, getSkillBonus, getSkillDefinition, getSkillLevel, getSkillNodeLockReason, getSkillNodePortalRequirement, getSkillProgress, getSkillRanks, getSkillUpgradeData, hasCompletedSkillNodePortal, isSkillNodeUnlocked, skillCostLabel, upgradeSkill } from "./skillStore.js";
import {
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
import {
  acceptQuest,
  canClaimQuest,
  claimQuest,
  getActiveQuest,
  getActiveQuests,
  getQuestObjectiveProgress,
  getQuestProgress,
  recordQuestCoordinateVisit,
  recordQuestDeath,
  recordQuestHpLoss,
  recordQuestKill,
  recordQuestMapVisit,
  recordQuestNpcTalk,
  recordQuestRefineryMaterialUpgradeStart,
  recordQuestRefineryModuleUpgradeStart,
  recordQuestSpaceCasterUse,
  recordQuestTimeElapsed
} from "./questStore.js";
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
import {
  addMaterial,
  consumeShipCargoMaterial,
  consumeMaterial,
  getCargoUsed,
  getMaterialCount,
  getShipCargo,
  getShipCargoCapacity,
  getShipCargoUsed
} from "./cargoStore.js";
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
import {
  REFINERY_MODULES,
  canShipRefineryMaterial,
  getDefaultRefineryLevel,
  getMaterialStorageCap
} from "./refineryStore.js";
import { getCombatTimedBoostPercent } from "./combatBoostStore.js";
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

const MAX_ACTIVE_QUESTS = 5;
const MIN_PLAYER_CREDITS = 0;
const MIN_PLAYER_PREMIUM = 0;
const RANK_KILL_POINTS_VERSION = 2;
const DEFAULT_STATE_STORAGE_KEY = "voidsector-prototype-state";
let stateStorageKey = DEFAULT_STATE_STORAGE_KEY;
export const XP_CURVE_VERSION = 4;
const XP_FIXED_NEXT_BY_LEVEL = {
  1:3000,
  2:12000,
  3:35000,
  4:51000,
  5:80000,
  6:113000,
  7:169000,
  8:220000,
  9:314000,
  10:580000,
  11:984000,
  12:1432000,
  13:1899000
};
const XP_FIXED_LAST_LEVEL = 13;
const XP_TARGET_LEVEL = 49;
const XP_TARGET_NEXT = 2000000000;
const XP_GROWTH_AFTER_FIXED = Math.pow(XP_TARGET_NEXT / XP_FIXED_NEXT_BY_LEVEL[XP_FIXED_LAST_LEVEL], 1 / (XP_TARGET_LEVEL - XP_FIXED_LAST_LEVEL));
export const GRAPHICS_QUALITY_PRESETS = [
  {id:"high", name:"Haute", multiplier:1, desc:"Décor complet"},
  {id:"medium", name:"Moyenne", multiplier:.5, desc:"50% étoiles, sans nuages proches"},
  {id:"low", name:"Basse", multiplier:.2, desc:"Planete et 20% étoiles"}
];
export function normalizeGraphicsQuality(value){
  return GRAPHICS_QUALITY_PRESETS.some(preset=>preset.id === value) ? value : "high";
}
export function getGraphicsQuality(){
  return normalizeGraphicsQuality(store.state?.graphicsQuality);
}
export function setGraphicsQuality(value){
  store.state.graphicsQuality = normalizeGraphicsQuality(value);
  return store.state.graphicsQuality;
}
export function getSpentSkillPoints(state = store.state){
  return skills.reduce((total, skill)=>{
    const ranks = Array.isArray(state?.skillRanks?.[skill.id]) ? state.skillRanks[skill.id] : [];
    return total + skill.levels.reduce((sum, node, nodeIndex)=>{
      const nodeRanks = Array.isArray(node.ranks) ? node.ranks : [node];
      const rank = Math.max(0, Math.min(nodeRanks.length, Number(ranks[nodeIndex] || 0)));
      return sum + nodeRanks.slice(0, rank).reduce((rankSum, step)=>rankSum + Number(step.skillPoints || 0), 0);
    }, 0);
  }, 0);
}
export function syncSkillPoints(state = store.state){
  const earned = Math.max(0, Math.floor(Number(state?.player?.level || 0)));
  const spent = getSpentSkillPoints(state);
  state.player.skillPoints = Math.max(0, earned - spent);
  return state.player.skillPoints;
}
export function getXpNextForLevel(level = 1){
  const targetLevel = Math.max(1, Math.floor(Number(level || 1)));
  if(XP_FIXED_NEXT_BY_LEVEL[targetLevel]) return XP_FIXED_NEXT_BY_LEVEL[targetLevel];
  return Math.round(XP_FIXED_NEXT_BY_LEVEL[XP_FIXED_LAST_LEVEL] * Math.pow(XP_GROWTH_AFTER_FIXED, targetLevel - XP_FIXED_LAST_LEVEL));
}
export function getShip(id){ return ships.find(s=>s.id===id) || ships[0]; }
export function getItem(id){ return equipment.find(i=>i.id===id); }
export function getAmmo(id){ return ammoTypes.find(a=>a.id===id) || null; }
export function getDroneCatalog(id="combat_drone"){ return droneCatalog.find(d=>d.id===id) || droneCatalog[0]; }
export function getDroneFormation(id){ return droneFormations.find(formation=>formation.id === id) || null; }
export function getActiveDroneFormation(){
  const formation = getDroneFormation(store.state.activeDroneFormation);
  return formation && store.state.ownedDroneFormations?.includes(formation.id) ? formation : null;
}
export function getDroneFormationBonus(){ return getActiveDroneFormation()?.effect || {}; }
export function isWeapon(id){ return getItem(id)?.category === "canon"; }
export function isGenerator(id){ return getItem(id)?.category === "generateur"; }
export function priceLabel(type, price){ return type === "premium" ? `${fmt(price)} NOVA` : `${fmt(price)} CR`; }
export function canAfford(type, price){ return type === "premium" ? store.state.player.premium >= price : store.state.player.credits >= price; }
export function enforcePlayerCurrencyMinimums(player = store.state?.player){
  if(!player) return;
  player.credits = Math.max(MIN_PLAYER_CREDITS, Number(player.credits || 0));
  player.premium = Math.max(MIN_PLAYER_PREMIUM, Number(player.premium || 0));
}
export function spend(type, price){
  if(type === "premium") store.state.player.premium -= price;
  else store.state.player.credits -= price;
  enforcePlayerCurrencyMinimums();
}
export function getPortal(id){ return portals.find(p=>p.id===id) || null; }
export function getCompletedPortalCountForId(id){
  return Math.max(0, Number(store.state?.completedPortals?.[id] || 0));
}
export function hasCompletedPortal(id){
  return getCompletedPortalCountForId(id) > 0;
}
export function isEquipmentUpgradeUnlocked(){
  return hasCompletedPortal("emerald");
}
export function isRecipeSystemUnlocked(){
  return hasCompletedPortal("void");
}
export function isPrestigeUnlocked(){
  return hasCompletedPortal("ancient");
}
export function getPlayerLevelCap(){
  return isPrestigeUnlocked() ? 100 : 50;
}
export function getShipRequiredCompletedPortal(ship){
  if(!ship) return null;
  return ship.requiresCompletedPortal || ship.requiresPortalCompletion || (ship.skillShip ? "violet" : null);
}
export function getShipPurchaseLockReason(ship){
  const portalId = getShipRequiredCompletedPortal(ship);
  if(!portalId || getCompletedPortalCountForId(portalId) > 0) return "";
  const portalName = getPortal(portalId)?.name || portalId;
  return `Pré requis : ${portalName} terminé`;
}
export function isShipPurchaseUnlocked(ship){
  return !getShipPurchaseLockReason(ship);
}
export function getQuest(id){ return questCatalog.find(q=>q.id === id) || null; }
export function getAllQuests(){ return questCatalog.slice(); }
export function getRawMaterial(id){ return rawMaterialCatalog.find(item=>item.id === id) || null; }
export function getAllRawMaterials(){ return rawMaterialCatalog.slice(); }
export function getRefineryRecipe(id){ return refineryRecipes.find(recipe=>recipe.id === id) || null; }
export function getRefineryRecipes(){ return refineryRecipes.slice(); }
export function getPortalPieces(id){ return Math.max(0, Number(store.state.portalPieces?.[id] || 0)); }
export function addPortalPiece(id, amount=1){
  if(!store.state.portalPieces) store.state.portalPieces = {};
  store.state.portalPieces[id] = getPortalPieces(id) + Math.max(0, Number(amount || 0));
  return store.state.portalPieces[id];
}
export function recordWeaponUse(type, amount=1){
  const keys = {
    laser:"laserShotsFired",
    rocket:"rocketShotsFired",
    missile:"missileShotsFired"
  };
  const key = keys[type];
  if(!key) return 0;
  store.state.player[key] = Math.max(0, Number(store.state.player[key] || 0)) + Math.max(0, Math.floor(Number(amount || 0)));
  return store.state.player[key];
}
export function isPortalUnlocked(id){ return Array.isArray(store.state.unlockedPortals) && store.state.unlockedPortals.includes(id); }
export function unlockPortal(id){
  if(!store.state.unlockedPortals) store.state.unlockedPortals = [];
  if(!store.state.unlockedPortals.includes(id)) store.state.unlockedPortals.push(id);
}
export function markPortalCompleted(id){
  if(!store.state.completedPortals || typeof store.state.completedPortals !== "object") store.state.completedPortals = {};
  store.state.completedPortals[id] = (store.state.completedPortals[id] || 0) + 1;
}
export function getCompletedPortalCount(){
  const completed = store.state.completedPortals || {};
  return Object.values(completed).reduce((sum, value)=>sum + Math.max(0, Number(value || 0)), 0);
}

export function hasMaxedFirstLoopSkills(state = store.state){
  return skills.every(skill=>{
    const ranks = Array.isArray(state?.skillRanks?.[skill.id]) ? state.skillRanks[skill.id] : [];
    return skill.levels.every((node, index)=>{
      const maxRank = Array.isArray(node.ranks) ? node.ranks.length : 1;
      return Math.max(0, Number(ranks[index] || 0)) >= maxRank;
    });
  });
}

export function getPrestigeStatus(){
  const levelOk = Number(store.state?.player?.level || 1) >= 50;
  const portalOk = isPrestigeUnlocked();
  const skillsOk = hasMaxedFirstLoopSkills();
  return {
    ok:levelOk && portalOk && skillsOk,
    levelOk,
    portalOk,
    skillsOk,
    reason:!portalOk ? "Portail Ancestral termine requis." : !levelOk ? "Niveau 50 requis." : !skillsOk ? "Toutes les competences de premiere boucle doivent etre au maximum." : ""
  };
}

export function performPrestige(){
  const status = getPrestigeStatus();
  if(!status.ok) return {ok:false, reason:status.reason};
  store.state.prestigeCount = Math.max(0, Number(store.state.prestigeCount || 0)) + 1;
  store.state.player.level = 1;
  store.state.player.xp = 0;
  store.state.player.xpNext = getXpNextForLevel(1);
  store.state.xpCurveVersion = XP_CURVE_VERSION;
  syncSkillPoints();
  return {ok:true, prestige:store.state.prestigeCount};
}

export function normalizeState(saved){
  const base = clone(defaultState);
  const merged = {...base, ...(saved || {})};
  merged.player = {...base.player, ...(saved?.player || {})};
  if(saved && Number(saved.economyVersion || 0) < base.economyVersion){
    merged.player.credits = 0;
    merged.player.premium = 0;
  }
  merged.economyVersion = base.economyVersion;
  if(Number(saved?.xpCurveVersion || 0) < XP_CURVE_VERSION){
    merged.player.xpNext = getXpNextForLevel(merged.player.level);
    merged.player.xp = Math.min(Math.max(0, Number(merged.player.xp || 0)), merged.player.xpNext);
  }else{
    merged.player.xpNext = Math.max(1, Number(merged.player.xpNext || getXpNextForLevel(merged.player.level)));
    merged.player.xp = Math.max(0, Number(merged.player.xp || 0));
  }
  merged.xpCurveVersion = XP_CURVE_VERSION;
  merged.player.totalXp = Math.max(0, Number(merged.player.totalXp || 0));
  merged.player.reputation = Math.max(0, Number(merged.player.reputation || 0));
  merged.player.totalKills = Math.max(0, Number(merged.player.totalKills || 0));
  merged.rankKillPointsVersion = RANK_KILL_POINTS_VERSION;
  merged.player.monsterRankPoints = Number(saved?.rankKillPointsVersion || 0) >= RANK_KILL_POINTS_VERSION
    ? Math.max(0, Number(saved?.player?.monsterRankPoints || 0))
    : Math.max(0, Number(merged.player.totalKills || 0) / 10);
  merged.player.totalPlayerKills = Math.max(0, Number(merged.player.totalPlayerKills || 0));
  merged.player.totalPlaySeconds = Math.max(0, Number(merged.player.totalPlaySeconds || 0));
  merged.player.laserShotsFired = Math.max(0, Number(merged.player.laserShotsFired || 0));
  merged.player.rocketShotsFired = Math.max(0, Number(merged.player.rocketShotsFired || 0));
  merged.player.missileShotsFired = Math.max(0, Number(merged.player.missileShotsFired || 0));
  merged.player.activeTitleId = typeof merged.player.activeTitleId === "string" ? merged.player.activeTitleId : null;
  merged.player.titleVisible = merged.player.titleVisible !== false;
  enforcePlayerCurrencyMinimums(merged.player);
  merged.ownedShips = Array.isArray(saved?.ownedShips) ? saved.ownedShips.filter(id=>ships.some(s=>s.id===id)) : base.ownedShips;
  merged.ownedItems = Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)) : base.ownedItems;
  merged.inventoryItems = Array.isArray(saved?.inventoryItems)
    ? saved.inventoryItems.filter(entry=>entry?.uid && equipment.some(i=>i.id===entry.itemId))
    : (Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)).map((itemId,index)=>({uid:`inv_${itemId}_${index+1}`, itemId})) : clone(base.inventoryItems));
  if(!merged.inventoryItems.some(entry=>entry.itemId === "laser_mk1")) merged.inventoryItems.unshift({uid:"inv_laser_mk1_1", itemId:"laser_mk1"});
  if(!merged.inventoryItems.some(entry=>entry.itemId === "extra_repair_starter")) merged.inventoryItems.push({uid:"inv_repair_starter_2", itemId:"extra_repair_starter"});
  merged.inventoryItems = dedupeInventoryUids(merged.inventoryItems);
  merged.nextInventoryUid = Math.max(
    Number(saved?.nextInventoryUid || base.nextInventoryUid || 1),
    getNextInventoryUid(merged.inventoryItems)
  );
  merged.unlockedSkills = Array.isArray(saved?.unlockedSkills) ? saved.unlockedSkills.filter(id=>skills.some(s=>s.id===id)) : base.unlockedSkills;
  merged.ownedDroneFormations = Array.isArray(saved?.ownedDroneFormations) ? saved.ownedDroneFormations.filter(id=>droneFormations.some(formation=>formation.id === id)) : clone(base.ownedDroneFormations || []);
  if(!merged.ownedDroneFormations.includes("base")) merged.ownedDroneFormations.unshift("base");
  merged.activeDroneFormation = merged.ownedDroneFormations.includes(saved?.activeDroneFormation) ? saved.activeDroneFormation : (merged.ownedDroneFormations.includes(base.activeDroneFormation) ? base.activeDroneFormation : null);
  merged.skillLevels = {};
  merged.skillRanks = {};
  if(saved?.skillLevels && typeof saved.skillLevels === "object"){
    for(const skill of skills){
      const legacyLevel = Math.max(0, Math.min(Number(skill.maxLevel || skill.levels.length || 0), Number(saved.skillLevels[skill.id] || 0)));
      const savedRanks = Array.isArray(saved?.skillRanks?.[skill.id]) ? saved.skillRanks[skill.id] : null;
      merged.skillRanks[skill.id] = skill.levels.map((node, index)=>{
        const maxRank = Array.isArray(node.ranks) ? node.ranks.length : 1;
        if(savedRanks) return Math.max(0, Math.min(maxRank, Number(savedRanks[index] || 0)));
        return index < legacyLevel ? maxRank : 0;
      });
      merged.skillLevels[skill.id] = merged.skillRanks[skill.id].reduce((sum, rank, index)=>{
        const node = skill.levels[index];
        const maxRank = Array.isArray(node.ranks) ? node.ranks.length : 1;
        return sum + (rank >= maxRank ? 1 : 0);
      }, 0);
    }
  }
  for(const skill of skills){
    if(merged.skillRanks[skill.id]) continue;
    const savedRanks = Array.isArray(saved?.skillRanks?.[skill.id]) ? saved.skillRanks[skill.id] : null;
    merged.skillRanks[skill.id] = skill.levels.map((node, index)=>{
      const maxRank = Array.isArray(node.ranks) ? node.ranks.length : 1;
      return savedRanks ? Math.max(0, Math.min(maxRank, Number(savedRanks[index] || 0))) : 0;
    });
    merged.skillLevels[skill.id] = merged.skillRanks[skill.id].reduce((sum, rank, index)=>{
      const node = skill.levels[index];
      const maxRank = Array.isArray(node.ranks) ? node.ranks.length : 1;
      return sum + (rank >= maxRank ? 1 : 0);
    }, 0);
  }
  // Migration légère de l'ancien système (liste de compétences débloquées) vers les nouvelles branches.
  if((!saved?.skillLevels || typeof saved.skillLevels !== "object") && Array.isArray(saved?.unlockedSkills) && saved.unlockedSkills.length){
    const legacyCount = saved.unlockedSkills.length;
    ["damage","shield","utility"].forEach((id, index)=>{
      if(legacyCount < index + 1) return;
      const skill = skills.find(s=>s.id === id);
      if(!skill) return;
      const firstNode = skill.levels[0];
      merged.skillRanks[id][0] = Array.isArray(firstNode.ranks) ? firstNode.ranks.length : 1;
      merged.skillLevels[id] = 1;
    });
  }
  syncSkillPoints(merged);
  merged.ammoInventory = {...base.ammoInventory};
  if(saved?.ammoInventory && typeof saved.ammoInventory === "object"){
    for(const ammo of ammoTypes) merged.ammoInventory[ammo.id] = Math.max(0, Number(saved.ammoInventory[ammo.id] ?? base.ammoInventory?.[ammo.id] ?? 0));
  }
  merged.actionSlots = Array.from({length:9}, (_,i)=>{
    const value = Array.isArray(saved?.actionSlots) ? saved.actionSlots[i] : base.actionSlots[i];
    return value && (ammoTypes.some(a=>a.id === value) || equipment.some(item=>item.id === value && (item.category === "extra" || item.slotType === "missileLauncher"))) ? value : null;
  });
  {
    const lastLaserAmmo = ammoTypes.find(ammo=>ammo.id === saved?.lastLaserAmmoId && ammo.weaponClass === "laser")
      || ammoTypes.find(ammo=>ammo.id === base.lastLaserAmmoId && ammo.weaponClass === "laser");
    merged.lastLaserAmmoId = lastLaserAmmo?.id || null;
  }
  merged.slotKeybinds = normalizeSlotKeybinds(saved?.slotKeybinds || base.slotKeybinds);
  merged.graphicsQuality = normalizeGraphicsQuality(saved?.graphicsQuality || base.graphicsQuality);
  merged.portalPieces = {...(base.portalPieces || {})};
  if(saved?.portalPieces && typeof saved.portalPieces === "object") for(const key of Object.keys(base.portalPieces || {})) merged.portalPieces[key] = Math.max(0, Number(saved.portalPieces[key] || 0));
  merged.portalRuns = {};
  if(saved?.portalRuns && typeof saved.portalRuns === "object"){
    for(const portal of portals){
      const run = saved.portalRuns[portal.id];
      if(!run || typeof run !== "object") continue;
      const lives = Math.max(0, Math.min(3, Math.round(Number(run.lives || 0))));
      if(lives > 0) merged.portalRuns[portal.id] = {lives, status:run.status === "dead" ? "dead" : "active"};
    }
  }
  merged.unlockedPortals = Array.isArray(saved?.unlockedPortals) ? saved.unlockedPortals.filter(id=>portals.some(p=>p.id === id)) : clone(base.unlockedPortals || []);
  merged.completedPortals = saved?.completedPortals && typeof saved.completedPortals === "object" ? {...saved.completedPortals} : {...(base.completedPortals || {})};
  merged.dronePermanentUpgrades = saved?.dronePermanentUpgrades && typeof saved.dronePermanentUpgrades === "object" ? {...saved.dronePermanentUpgrades} : {...(base.dronePermanentUpgrades || {})};
  merged.prestigeCount = Math.max(0, Number(saved?.prestigeCount || base.prestigeCount || 0));
  merged.killStats = saved?.killStats && typeof saved.killStats === "object" ? {...saved.killStats} : {};
  merged.rankKillStats = {};
  if(saved?.rankKillStats && typeof saved.rankKillStats === "object"){
    for(const [kind, entry] of Object.entries(saved.rankKillStats)){
      merged.rankKillStats[kind] = {
        kills:Math.max(0, Number(entry?.kills || 0)),
        points:Math.max(0, Number(entry?.points || 0)),
        lastEnemyLevel:Math.max(1, Number(entry?.lastEnemyLevel || 1)),
        lastPlayerLevel:Math.max(1, Number(entry?.lastPlayerLevel || 1))
      };
    }
  }
  for(const [kind, kills] of Object.entries(merged.killStats)){
    if(merged.rankKillStats[kind]) continue;
    const count = Math.max(0, Number(kills || 0));
    merged.rankKillStats[kind] = {kills:count, points:count / 10, lastEnemyLevel:1, lastPlayerLevel:1};
  }
  merged.cargoHold = {...(base.cargoHold || {})};
  if(saved?.cargoHold && typeof saved.cargoHold === "object"){
    for(const mat of rawMaterialCatalog) merged.cargoHold[mat.id] = Math.max(0, Number(saved.cargoHold[mat.id] || 0));
    if(!Object.keys(saved.cargoHold).some(id=>rawMaterialCatalog.some(mat=>mat.id === id))){
      merged.cargoHold.cuivre_orbital = Math.max(0, Number(saved.cargoHold.ferraille || 0));
      merged.cargoHold.zinc_spatial = Math.max(0, Number(saved.cargoHold.cristal || 0));
      merged.cargoHold.titane_fissure = Math.max(0, Number(saved.cargoHold.plasma || 0));
      merged.cargoHold.conducteur_renforce = Math.max(0, Number(saved.cargoHold.alliage || 0));
      merged.cargoHold.blindage_composite = Math.max(0, Number(saved.cargoHold.noyau || 0));
    }
    if(saved.cargoHold.carbone_dense && !merged.cargoHold.silice_conductrice){
      merged.cargoHold.silice_conductrice = Math.max(0, Number(saved.cargoHold.carbone_dense || 0));
    }
  }
  merged.shipCargo = {};
  if(saved?.shipCargo && typeof saved.shipCargo === "object"){
    for(const ship of ships){
      const savedCargo = saved.shipCargo[ship.id];
      merged.shipCargo[ship.id] = {};
      for(const material of rawMaterialCatalog){
        merged.shipCargo[ship.id][material.id] = Math.max(0, Number(savedCargo?.[material.id] || 0));
      }
    }
  }
  merged.refineryLevels = {};
  for(const mat of rawMaterialCatalog){
    const max = Number(mat.maxLevel || 20);
    const fallback = getDefaultRefineryLevel(mat.id);
    merged.refineryLevels[mat.id] = Math.max(0, Math.min(max, Number(saved?.refineryLevels?.[mat.id] ?? base.refineryLevels?.[mat.id] ?? fallback)));
  }
  merged.refineryProductionDisabled = {};
  for(const mat of rawMaterialCatalog){
    merged.refineryProductionDisabled[mat.id] = Boolean(saved?.refineryProductionDisabled?.[mat.id]);
  }
  merged.refineryModules = {...(base.refineryModules || {})};
  for(const id of Object.keys(REFINERY_MODULES)){
    const def = REFINERY_MODULES[id];
    merged.refineryModules[id] = Math.max(1, Math.min(def.maxLevel, Number(saved?.refineryModules?.[id] ?? base.refineryModules?.[id] ?? 1)));
  }
  merged.refineryUpgradeJobs = {};
  if(saved?.refineryUpgradeJobs && typeof saved.refineryUpgradeJobs === "object"){
    for(const [key, job] of Object.entries(saved.refineryUpgradeJobs)){
      if(!job || typeof job !== "object") continue;
      const type = job.type === "module" ? "module" : job.type === "material" ? "material" : null;
      if(!type) continue;
      if(type === "material" && !getRawMaterial(job.id)) continue;
      if(type === "module" && !REFINERY_MODULES[job.id]) continue;
      const startedAt = Number(job.startedAt || Date.now());
      const endsAt = Number(job.endsAt || startedAt);
      if(endsAt <= 0) continue;
      merged.refineryUpgradeJobs[key] = {
        type,
        id:job.id,
        name:String(job.name || job.id),
        fromLevel:Math.max(0, Number(job.fromLevel || 0)),
        toLevel:Math.max(1, Number(job.toLevel || 1)),
        startedAt,
        endsAt,
        duration:Math.max(1, Number(job.duration || endsAt - startedAt || 1))
      };
    }
  }
  merged.refineryLastTick = Math.max(0, Number(saved?.refineryLastTick || Date.now()));
  merged.refineryShipmentJob = null;
  if(saved?.refineryShipmentJob && typeof saved.refineryShipmentJob === "object"){
    const job = saved.refineryShipmentJob;
    const material = getRawMaterial(job.materialId);
    const ship = getShip(job.shipId);
    if(material && canShipRefineryMaterial(material.id) && ship){
      const startedAt = Number(job.startedAt || Date.now());
      const endsAt = Number(job.endsAt || startedAt);
      merged.refineryShipmentJob = {
        materialId:material.id,
        materialName:String(job.materialName || material.name),
        shipId:ship.id,
        shipName:String(job.shipName || ship.name),
        amount:Math.max(1, Math.ceil(Number(job.amount || 1))),
        credits:Math.max(0, Math.ceil(Number(job.credits || 0))),
        startedAt,
        endsAt,
        duration:Math.max(1, Number(job.duration || endsAt - startedAt || 1))
      };
    }
  }
  merged.refineryJob = saved?.refineryJob && typeof saved.refineryJob === "object" ? {...saved.refineryJob} : base.refineryJob;
  merged.combatBoosts = {};
  for(const target of ["laser", "rocket", "generator", "drone"]){
    merged.combatBoosts[target] = {};
    const source = saved?.combatBoosts?.[target];
    if(!source || typeof source !== "object") continue;
    for(const [materialId, entry] of Object.entries(source)){
      if(!getRawMaterial(materialId) || !entry || typeof entry !== "object") continue;
      merged.combatBoosts[target][materialId] = {
        materialId,
        percent:Math.max(0, Number(entry.percent || 0)),
        charges:Math.max(0, Number(entry.charges || 0)),
        seconds:Math.max(0, Number(entry.seconds || 0))
      };
    }
  }
  merged.equipmentUpgrades = saved?.equipmentUpgrades && typeof saved.equipmentUpgrades === "object" ? {...saved.equipmentUpgrades} : {...(base.equipmentUpgrades || {})};
  const savedActiveQuestIds = Array.isArray(saved?.activeQuestIds) ? saved.activeQuestIds : [];
  const legacyActiveQuestId = getQuest(saved?.activeQuestId)?.id || null;
  merged.activeQuestIds = [...new Set([...savedActiveQuestIds, legacyActiveQuestId].filter(id=>getQuest(id) && !saved?.completedQuestClaims?.[id]))].slice(0, MAX_ACTIVE_QUESTS);
  merged.activeQuestId = merged.activeQuestIds.includes(legacyActiveQuestId) ? legacyActiveQuestId : (merged.activeQuestIds[0] || base.activeQuestId);
  merged.questProgress = saved?.questProgress && typeof saved.questProgress === "object" ? {...saved.questProgress} : {...(base.questProgress || {})};
  merged.questFailProgress = saved?.questFailProgress && typeof saved.questFailProgress === "object" ? {...saved.questFailProgress} : {...(base.questFailProgress || {})};
  merged.completedQuestClaims = saved?.completedQuestClaims && typeof saved.completedQuestClaims === "object" ? {...saved.completedQuestClaims} : {...(base.completedQuestClaims || {})};
  merged.uiLayout = {...(base.uiLayout || {})};
  if(saved?.uiLayout && typeof saved.uiLayout === "object"){
    merged.uiLayout = {...merged.uiLayout, ...saved.uiLayout};
  }
  merged.ownedDroneCount = Math.max(0, Math.min(getDroneCatalog().maxOwned || 8, Number(saved?.ownedDroneCount ?? base.ownedDroneCount ?? 0)));
  merged.droneLoadout = cleanDroneLoadout(saved?.droneLoadout || base.droneLoadout || [], merged.inventoryItems);
  while(merged.droneLoadout.length < merged.ownedDroneCount) merged.droneLoadout.push(null);
  const starterShipId = "orion";
  const accidentalVeloxStarterOnly = Array.isArray(saved?.ownedShips)
    && saved.ownedShips.length === 1
    && saved.ownedShips[0] === "velox"
    && (!saved.activeShip || saved.activeShip === "velox")
    && (!saved.shipCargo?.velox || Object.values(saved.shipCargo.velox).every(value=>Number(value || 0) <= 0));
  if(accidentalVeloxStarterOnly){
    merged.ownedShips = [starterShipId];
    merged.activeShip = starterShipId;
    merged.selectedShip = starterShipId;
  }
  if(!merged.ownedShips.includes(starterShipId)) merged.ownedShips.unshift(starterShipId);
  if(!merged.ownedShips.includes("test_runner")) merged.ownedShips.push("test_runner");
  if(!merged.ownedItems.includes("laser_mk1")) merged.ownedItems.unshift("laser_mk1");
  if(merged.activeShip !== null && (!ships.some(s=>s.id===merged.activeShip) || !merged.ownedShips.includes(merged.activeShip))) merged.activeShip = starterShipId;
  if(!ships.some(s=>s.id===merged.selectedShip) || !merged.ownedShips.includes(merged.selectedShip)) merged.selectedShip = merged.activeShip;
  if(!merged.selectedShip) merged.selectedShip = starterShipId;
  merged.shipLoadouts = saved?.shipLoadouts && typeof saved.shipLoadouts === "object" ? saved.shipLoadouts : clone(base.shipLoadouts);
  if(accidentalVeloxStarterOnly){
    merged.shipLoadouts[starterShipId] = merged.shipLoadouts.velox || merged.shipLoadouts[starterShipId] || clone(base.shipLoadouts[starterShipId]);
    delete merged.shipLoadouts.velox;
  }
  if(Object.keys(merged.shipLoadouts).length === 0 && Array.isArray(saved?.slots)){
    merged.shipLoadouts[merged.activeShip] = {
      lasers: saved.slots.filter(id=>id && equipment.find(i=>i.id===id)?.category === "canon"),
      generators: [],
      extras: []
    };
  }
  store.state = merged;
  migrateLoadoutItemIds();
  ensureStarterRepairDrone();
  for(const shipId of merged.ownedShips) ensureShipLoadout(shipId);
  getDroneLoadout();
  merged.player.rankScore = getRankScore();
  return merged;
}

function dedupeInventoryUids(items){
  const used = new Set();
  let next = 1;
  return items.map(entry=>{
    let uid = typeof entry.uid === "string" && entry.uid ? entry.uid : "";
    if(!uid || used.has(uid)){
      do{
        uid = `inv_${entry.itemId}_${next++}`;
      }while(used.has(uid));
    }
    used.add(uid);
    return {...entry, uid};
  });
}

function getNextInventoryUid(items){
  const maxSuffix = items.reduce((max, entry)=>{
    const match = String(entry.uid || "").match(/_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return Math.max(items.length + 1, maxSuffix + 1);
}

function ensureStarterRepairDrone(){
  const starterUid = store.state.inventoryItems?.find(entry=>entry.itemId === "extra_repair_starter")?.uid;
  if(!starterUid) return;
  if(!store.state.shipLoadouts || typeof store.state.shipLoadouts !== "object") store.state.shipLoadouts = {};
  const loadout = store.state.shipLoadouts.orion || makeEmptyLoadout("orion");
  const extras = Array.isArray(loadout.extras) ? loadout.extras : [];
  const hasRepairExtra = extras.some(uid=>{
    const item = getItemFromInventoryUid(uid);
    return item?.effect?.repairBot;
  });
  if(!hasRepairExtra && extras.length > 0) extras[0] = starterUid;
  loadout.extras = extras;
  store.state.shipLoadouts.orion = loadout;
  if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
  if(!store.state.actionSlots[0]) store.state.actionSlots[0] = "ammo_x1";
  if(!store.state.actionSlots[8]) store.state.actionSlots[8] = "extra_repair_starter";
}

function migrateLoadoutItemIds(){
  const used = new Set();
  for(const shipId of Object.keys(store.state.shipLoadouts || {})){
    const raw = store.state.shipLoadouts[shipId] || {};
    for(const part of ["lasers", "generators", "extras"]){
      raw[part] = (raw[part] || []).map(value=>{
        if(!value) return null;
        if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
        const item = getItem(value);
        if(!item) return null;
        let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
        if(!entry) entry = addInventoryItem(value);
        used.add(entry.uid);
        return entry.uid;
      });
    }
    for(const part of ["missileLauncher", "rocketLauncher"]){
      const value = raw[part];
      if(!value){ raw[part] = null; continue; }
      if(getInventoryItem(value) && !used.has(value)){ used.add(value); continue; }
      const item = getItem(value);
      if(!item){ raw[part] = null; continue; }
      let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
      if(!entry) entry = addInventoryItem(value);
      used.add(entry.uid);
      raw[part] = entry.uid;
    }
  }
  store.state.droneLoadout = (store.state.droneLoadout || []).map(value=>{
    if(!value) return null;
    if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
    const item = getItem(value);
    if(!isDroneCompatibleEquipment(item)) return null;
    let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
    if(!entry) entry = addInventoryItem(value);
    used.add(entry.uid);
    return entry.uid;
  });
}

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

export function getEquippedGenerators(shipId = store.state.activeShip){
  return getLoadout(shipId).generators.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedExtras(shipId = store.state.activeShip){
  return getLoadout(shipId).extras.map(getItemFromInventoryUid).filter(Boolean);
}

export function getExtraBonus(shipId = store.state.activeShip){
  const skill = getSkillBonus();
  const bonus = {
    autoRocket:false,
    autoMissile:false,
    rocketCooldownMultiplier:Number(skill.rocketCooldownMultiplier || 1),
    rocketDamageBonus:0,
    repairBot:false,
    repairBotAuto:false,
    repairBotHealRate:0,
    repairBotDelay:Math.max(6, 15 - Math.max(0, Number(skill.repairBotDelayReduction || 0))),
    repairBotImg:"assets/equipment/drone_repair_starter.png"
  };
  for(const item of getEquippedExtras(shipId)){
    const effect = item.effect || {};
    if(effect.autoRocket) bonus.autoRocket = true;
    if(effect.autoMissile) bonus.autoMissile = true;
    if(effect.rocketCooldownMultiplier) bonus.rocketCooldownMultiplier *= effect.rocketCooldownMultiplier;
    if(effect.rocketDamageBonus) bonus.rocketDamageBonus += effect.rocketDamageBonus;
    if(effect.repairBot) bonus.repairBot = true;
    if(effect.repairBotAuto) bonus.repairBotAuto = true;
    if(effect.repairBotHealRate) bonus.repairBotHealRate = Math.max(bonus.repairBotHealRate, effect.repairBotHealRate);
    if(effect.repairBotDelay) bonus.repairBotDelay = Math.max(1, Math.min(bonus.repairBotDelay, effect.repairBotDelay));
    if(effect.repairBotImg && Number(effect.repairBotHealRate || 0) >= Number(bonus.repairBotHealRate || 0)) bonus.repairBotImg = effect.repairBotImg;
  }
  bonus.rocketCooldownMultiplier = Math.max(0.25, bonus.rocketCooldownMultiplier);
  bonus.repairBotHealRate *= Number(skill.repairBotHealMultiplier || 1);
  return bonus;
}

export function getRealSpeedFromStat(vitesse){
  return Math.round(Number(vitesse || 0));
}

export function getEquippedLasers(shipId = store.state.activeShip){
  return getLoadout(shipId).lasers.map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedLauncher(type, shipId = store.state.activeShip){
  const loadout = getLoadout(shipId);
  const uid = type === "rocket" ? loadout.rocketLauncher : type === "missile" ? loadout.missileLauncher : null;
  return uid ? getItemFromInventoryUid(uid) : null;
}

export function getEquippedDroneItems(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(Boolean);
}

export function getEquippedDroneLasers(){
  return getDroneLoadout()
    .map((uid, index)=>{
      const item = getItemFromInventoryUid(uid);
      return item?.category === "canon" ? {...item, droneIndex:index, droneDamageMultiplier:getDroneDamageMultiplier(index)} : null;
    })
    .filter(Boolean);
}

export function getEquippedDroneGenerators(){
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "generateur");
}

export function getShipCombatStats(shipId = store.state.activeShip){
  const ship = getShip(shipId);
  const skill = getSkillBonus();
  const formationBonus = getDroneFormationBonus();
  const generatorBoost = getCombatTimedBoostPercent("generator");
  const droneBoost = getCombatTimedBoostPercent("drone");
  const shipGenerators = getEquippedGenerators(shipId);
  const droneGenerators = getEquippedDroneGenerators();
  const statFromGenerator = (item, key, upgradeValue)=>{
    const base = Number(item.stats?.[key] || 0);
    return base + (base ? getEquipmentUpgradeLevel(item.id) * upgradeValue : 0);
  };
  const boostedGeneratorValue = (items, key, upgradeValue, extraBoost = 0)=>{
    return items.reduce((sum, item)=>sum + statFromGenerator(item, key, upgradeValue) * (1 + generatorBoost + extraBoost), 0);
  };
  const shieldFromGenerators = boostedGeneratorValue(shipGenerators, "bouclier", 30)
    + boostedGeneratorValue(droneGenerators, "bouclier", 30, droneBoost);
  const regen = boostedGeneratorValue(shipGenerators, "regen", 1)
    + boostedGeneratorValue(droneGenerators, "regen", 1, droneBoost);
  const generatorSpeed = boostedGeneratorValue(shipGenerators, "vitesse", 2)
    + boostedGeneratorValue(droneGenerators, "vitesse", 2, droneBoost);
  const vitesse = (ship.stats.vitesse + (skill.vitesse || 0) + generatorSpeed)
    * Number(formationBonus.speedMultiplier || 1)
    * Number(skill.speedMultiplier || 1);
  const bouclier = (shieldFromGenerators > 0 ? shieldFromGenerators + (skill.shieldBonus || 0) : 0)
    * Number(formationBonus.shieldMultiplier || 1)
    * Number(skill.shieldMultiplier || 1);
  const extraBonus = getExtraBonus(shipId);
  extraBonus.rocketDamageMultiplier = Number(formationBonus.rocketDamageMultiplier || 1) * Number(skill.rocketDamageMultiplier || 1);
  extraBonus.missileDamageMultiplier = Number(formationBonus.missileDamageMultiplier || 1) * Number(skill.missileDamageMultiplier || 1);
  return {
    vie: (ship.stats.vie + (skill.vie || 0)) * Number(skill.hullMultiplier || 1),
    vitesse,
    vitesseReelle:getRealSpeedFromStat(vitesse),
    cargo: (ship.stats.cargo + (skill.cargo || 0)) * Number(skill.cargoMultiplier || 1),
    maxLasers: ship.stats.maxLasers,
    maxGenerators: ship.stats.maxGenerators,
    maxExtras:ship.stats.maxExtras || 3,
    droneCount: getDroneLoadout().length,
    bouclier,
    regen: (regen + (skill.regen || 0)) * Number(formationBonus.regenMultiplier || 1) * Number(skill.regenMultiplier || 1),
    weaponDamage: skill.weaponDamage || 0,
    weaponDamageMultiplier: Number(skill.weaponDamageMultiplier || 1) * Number(formationBonus.laserDamageMultiplier || 1),
    weaponDamagePercent: Number(skill.weaponDamageMultiplier || 1) * Number(formationBonus.laserDamageMultiplier || 1) - 1,
    shieldAbsorbRatio: Math.max(0, Math.min(0.9, 0.5 + Number(skill.shieldAbsorbBonus || 0))),
    evasionChance: Math.max(0, Math.min(0.75, Number(skill.evasionChance || 0))),
    damageToHpChance: Math.max(0, Math.min(0.5, Number(skill.damageToHpChance || 0))),
    blueLaserBeams: Number(skill.blueLaserBeams || 0) > 0,
    extraBonus
  };
}

export function addXP(amount){
  const gain = Math.max(0, Number(amount || 0));
  store.state.player.xp += gain;
  store.state.player.totalXp = Math.max(0, Number(store.state.player.totalXp || 0)) + gain;
  let leveled = false;
  const levelCap = getPlayerLevelCap();
  while(store.state.player.level < levelCap && store.state.player.xp >= store.state.player.xpNext){
    store.state.player.xp -= store.state.player.xpNext;
    store.state.player.level += 1;
    store.state.player.xpNext = getXpNextForLevel(store.state.player.level);
    leveled = true;
  }
  if(store.state.player.level >= levelCap) store.state.player.xp = Math.min(store.state.player.xp, store.state.player.xpNext);
  syncSkillPoints();
  store.state.player.rankScore = getRankScore();
  return leveled;
}

export function addReputation(amount){
  const gain = Math.max(0, Math.round(Number(amount || 0)));
  if(gain <= 0) return 0;
  store.state.player.reputation = Math.max(0, Number(store.state.player.reputation || 0)) + gain;
  store.state.player.rankScore = getRankScore();
  return gain;
}

export function addReputationFromXp(xp, ratio = 0.1){
  return addReputation(Math.max(0, Number(xp || 0)) * Math.max(0, Number(ratio || 0)));
}
