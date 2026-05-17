import { ammoTypes, defaultState, droneCatalog, droneFormations, equipment, portals, questCatalog, rawMaterialCatalog, refineryRecipes, ships, skills } from "../data/catalog.js";
import { clone, fmt } from "./utils.js";
import { normalizeSlotKeybinds } from "./keybinds.js";
import { getSkillBonus } from "./skillStore.js";
export { getSkillBonus, getSkillDefinition, getSkillLevel, getSkillUpgradeData, upgradeSkill } from "./skillStore.js";
import {
  addAmmo,
  addInventoryItem,
  cleanDroneLoadout,
  cleanLoadout,
  consumeAmmo,
  ensureShipLoadout,
  findEquippedSlot,
  getAmmoCount,
  getDroneLoadout,
  getDronePurchasePrice,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getInventoryByCategory,
  getInventoryCount,
  getInventoryItem,
  getItemFromInventoryUid,
  getLoadout,
  getWeaponAverageDamage,
  makeEmptyLoadout,
  setActionSlot,
  unequipInventoryItem,
  upgradeEquipment
} from "./equipmentStore.js";
export {
  addAmmo,
  addInventoryItem,
  cleanDroneLoadout,
  cleanLoadout,
  consumeAmmo,
  ensureShipLoadout,
  findEquippedSlot,
  getAmmoCount,
  getDroneLoadout,
  getDronePurchasePrice,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getInventoryByCategory,
  getInventoryCount,
  getInventoryItem,
  getItemFromInventoryUid,
  getLoadout,
  getWeaponAverageDamage,
  makeEmptyLoadout,
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
  getQuestProgress,
  recordQuestKill
} from "./questStore.js";
export { acceptQuest, canClaimQuest, claimQuest, getActiveQuest, getActiveQuests, getQuestProgress, recordQuestKill } from "./questStore.js";
import { getRankScore } from "./rankStore.js";
export {
  RANK_TABLE,
  RANK_POINT_RULES,
  LOCAL_LEADERBOARD_PREVIEW,
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
  selectedInventoryUid:null,
  selectedShopProduct:null,
  selectedShopAmmoMultiplier:1,
  selectedRefineryUpgrade:null,
  selectedRefineryTab:"forge",
  selectedRefineryShipmentMaterial:null,
  selectedRefineryShipmentAmount:30
};

const MAX_ACTIVE_QUESTS = 5;
const MIN_PLAYER_CREDITS = 1000000000;
const MIN_PLAYER_PREMIUM = 1000000;
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

export function normalizeState(saved){
  const base = clone(defaultState);
  const merged = {...base, ...(saved || {})};
  merged.player = {...base.player, ...(saved?.player || {})};
  merged.player.totalXp = Math.max(0, Number(merged.player.totalXp || 0));
  merged.player.totalKills = Math.max(0, Number(merged.player.totalKills || 0));
  enforcePlayerCurrencyMinimums(merged.player);
  merged.ownedShips = Array.isArray(saved?.ownedShips) ? saved.ownedShips.filter(id=>ships.some(s=>s.id===id)) : base.ownedShips;
  merged.ownedItems = Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)) : base.ownedItems;
  merged.inventoryItems = Array.isArray(saved?.inventoryItems)
    ? saved.inventoryItems.filter(entry=>entry?.uid && equipment.some(i=>i.id===entry.itemId))
    : (Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)).map((itemId,index)=>({uid:`inv_${itemId}_${index+1}`, itemId})) : clone(base.inventoryItems));
  if(!merged.inventoryItems.some(entry=>entry.itemId === "laser_mk1")) merged.inventoryItems.unshift({uid:"inv_laser_mk1_1", itemId:"laser_mk1"});
  merged.inventoryItems = dedupeInventoryUids(merged.inventoryItems);
  merged.nextInventoryUid = Math.max(
    Number(saved?.nextInventoryUid || base.nextInventoryUid || 1),
    getNextInventoryUid(merged.inventoryItems)
  );
  merged.unlockedSkills = Array.isArray(saved?.unlockedSkills) ? saved.unlockedSkills.filter(id=>skills.some(s=>s.id===id)) : base.unlockedSkills;
  merged.ownedDroneFormations = Array.isArray(saved?.ownedDroneFormations) ? saved.ownedDroneFormations.filter(id=>droneFormations.some(formation=>formation.id === id)) : clone(base.ownedDroneFormations || []);
  if(!merged.ownedDroneFormations.includes("base")) merged.ownedDroneFormations.unshift("base");
  merged.activeDroneFormation = merged.ownedDroneFormations.includes(saved?.activeDroneFormation) ? saved.activeDroneFormation : (merged.ownedDroneFormations.includes(base.activeDroneFormation) ? base.activeDroneFormation : null);
  merged.skillLevels = {...(base.skillLevels || {})};
  if(saved?.skillLevels && typeof saved.skillLevels === "object"){
    for(const skill of skills){
      merged.skillLevels[skill.id] = Math.max(0, Math.min(Number(skill.maxLevel || skill.levels.length || 0), Number(saved.skillLevels[skill.id] || 0)));
    }
  }
  // Migration légère de l'ancien système (liste de compétences débloquées) vers les nouvelles branches.
  if((!saved?.skillLevels || typeof saved.skillLevels !== "object") && Array.isArray(saved?.unlockedSkills) && saved.unlockedSkills.length){
    const legacyCount = saved.unlockedSkills.length;
    if(legacyCount >= 1) merged.skillLevels.damage = Math.min(1, skills.find(s=>s.id === "damage").maxLevel || 1);
    if(legacyCount >= 2) merged.skillLevels.shield = Math.min(1, skills.find(s=>s.id === "shield").maxLevel || 1);
    if(legacyCount >= 3) merged.skillLevels.utility = Math.min(1, skills.find(s=>s.id === "utility").maxLevel || 1);
  }
  merged.ammoInventory = {...base.ammoInventory};
  if(saved?.ammoInventory && typeof saved.ammoInventory === "object"){
    for(const ammo of ammoTypes) merged.ammoInventory[ammo.id] = Math.max(0, Number(saved.ammoInventory[ammo.id] ?? base.ammoInventory?.[ammo.id] ?? 0));
  }
  merged.actionSlots = Array.from({length:9}, (_,i)=>{
    const value = Array.isArray(saved?.actionSlots) ? saved.actionSlots[i] : base.actionSlots[i];
    return value && (ammoTypes.some(a=>a.id === value) || equipment.some(item=>item.id === value && (item.category === "extra" || item.slotType === "missileLauncher"))) ? value : null;
  });
  merged.slotKeybinds = normalizeSlotKeybinds(saved?.slotKeybinds || base.slotKeybinds);
  merged.portalPieces = {...(base.portalPieces || {})};
  if(saved?.portalPieces && typeof saved.portalPieces === "object") for(const key of Object.keys(base.portalPieces || {})) merged.portalPieces[key] = Math.max(0, Number(saved.portalPieces[key] || 0));
  merged.unlockedPortals = Array.isArray(saved?.unlockedPortals) ? saved.unlockedPortals.filter(id=>portals.some(p=>p.id === id)) : clone(base.unlockedPortals || []);
  merged.completedPortals = saved?.completedPortals && typeof saved.completedPortals === "object" ? {...saved.completedPortals} : {...(base.completedPortals || {})};
  merged.killStats = saved?.killStats && typeof saved.killStats === "object" ? {...saved.killStats} : {};
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
    if(!item || !["canon","generateur"].includes(item.category)) return null;
    let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
    if(!entry) entry = addInventoryItem(value);
    used.add(entry.uid);
    return entry.uid;
  });
}

export function loadState(){
  try{
    const raw = localStorage.getItem("voidsector-prototype-state");
    return normalizeState(raw ? JSON.parse(raw) : null);
  }catch(e){
    return normalizeState(null);
  }
}

export function saveState(){
  if(globalThis.__voidsectorResetInProgress) return;
  if(store.state.player) store.state.player.rankScore = getRankScore();
  enforcePlayerCurrencyMinimums();
  localStorage.setItem("voidsector-prototype-state", JSON.stringify(store.state));
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
    rocketCooldownMultiplier:1,
    rocketDamageBonus:0,
    repairBot:false,
    repairBotAuto:false,
    repairBotHealRate:0.02,
    repairBotDelay:Math.max(6, 15 - Math.max(0, Number(skill.repairBotDelayReduction || 0)))
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
  }
  bonus.rocketCooldownMultiplier = Math.max(0.25, bonus.rocketCooldownMultiplier);
  return bonus;
}

export function getRealSpeedFromStat(vitesse){
  return Math.round(120 + Number(vitesse || 0) * 2.15);
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
  return getDroneLoadout().map(getItemFromInventoryUid).filter(item=>item?.category === "canon");
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
  const vitesse = (ship.stats.vitesse + (skill.vitesse || 0) + generatorSpeed) * Number(formationBonus.speedMultiplier || 1);
  const bouclier = (shieldFromGenerators > 0 ? shieldFromGenerators + (skill.shieldBonus || 0) : 0) * Number(formationBonus.shieldMultiplier || 1);
  const extraBonus = getExtraBonus(shipId);
  extraBonus.rocketDamageMultiplier = Number(formationBonus.rocketDamageMultiplier || 1);
  extraBonus.missileDamageMultiplier = Number(formationBonus.missileDamageMultiplier || 1);
  return {
    vie: ship.stats.vie + (skill.vie || 0),
    vitesse,
    vitesseReelle:getRealSpeedFromStat(vitesse),
    cargo: ship.stats.cargo + (skill.cargo || 0),
    maxLasers: ship.stats.maxLasers,
    maxGenerators: ship.stats.maxGenerators,
    maxExtras:ship.stats.maxExtras || 3,
    droneCount: getDroneLoadout().length,
    bouclier,
    regen: (regen + (skill.regen || 0)) * Number(formationBonus.regenMultiplier || 1),
    weaponDamage: skill.weaponDamage || 0,
    weaponDamagePercent: (skill.weaponDamagePercent || 0) + (Number(formationBonus.laserDamageMultiplier || 1) - 1),
    shieldAbsorbRatio: Math.max(0, Math.min(0.9, 0.5 + Number(skill.shieldAbsorbBonus || 0))),
    extraBonus
  };
}

export function addXP(amount){
  const gain = Math.max(0, Number(amount || 0));
  store.state.player.xp += gain;
  store.state.player.totalXp = Math.max(0, Number(store.state.player.totalXp || 0)) + gain;
  let leveled = false;
  while(store.state.player.xp >= store.state.player.xpNext){
    store.state.player.xp -= store.state.player.xpNext;
    store.state.player.level += 1;
    store.state.player.skillPoints += 1;
    store.state.player.xpNext = Math.round(store.state.player.xpNext * 1.35 + 50);
    leveled = true;
  }
  store.state.player.rankScore = getRankScore();
  return leveled;
}
