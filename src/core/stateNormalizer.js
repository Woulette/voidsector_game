import { ammoTypes, defaultState, droneFormations, equipment, portals, rawMaterialCatalog, ships, skills } from "../data/catalog.js";
import { normalizeFirmId } from "../data/firms.js";
import { normalizeAbilityKeybinds, normalizeSlotKeybinds } from "./keybinds.js?v=ship-abilities-1";
import { getDroneCatalog, getItem, getQuest, getRawMaterial, getShip } from "./catalogStore.js";
import { enforcePlayerCurrencyMinimums } from "./currencyStore.js";
import { cleanDroneLoadout, ensureShipLoadout, getDroneLoadout, getInventoryItem, getItemFromInventoryUid } from "./equipmentStore.js";
import { normalizeGraphicsQuality } from "./graphicsStore.js";
import { isPremiumActive, normalizePremiumRewardState, normalizeStarterPackPurchases } from "../data/premium.js";
import { calculateMonsterRankPointsForKills } from "../data/ranks.js";
import { getRankScore } from "./rankStore.js";
import { getCraftRecipe } from "../data/craftingRecipes.js";
import { canShipRefineryMaterial, getDefaultRefineryLevel, REFINERY_MODULES } from "./refineryStore.js";
import { store } from "./store.js";
import { clone } from "./utils.js";
import { getXpNextForLevel, syncSkillPoints, XP_CURVE_VERSION } from "./xpStore.js";
import { sanitizePlayerBoosterState } from "../shared/firmBoosters.js";
import { normalizeGameSettings } from "./settingsSchema.js";
import { sanitizeTutorialState } from "../shared/tutorial.js";

const MAX_ACTIVE_QUESTS = 5;
const RANK_KILL_POINTS_VERSION = 3;
const SHIP_ID_ALIASES = Object.freeze({
  astra_3d_test:"astralis"
});

function normalizeCraftingJob(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return null;
  const recipe = getCraftRecipe(value.recipeId);
  if(!recipe) return null;
  const startedAt = Math.max(0, Number(value.startedAt || Date.now()));
  const durationMs = Math.max(1, Number(value.durationMs || recipe.durationMs || 60_000));
  const endsAt = Math.max(startedAt, Number(value.endsAt || value.finishAt || startedAt + durationMs));
  return {recipeId:recipe.id, startedAt, endsAt, durationMs};
}

function normalizeShipId(id){
  const clean = String(id || "");
  return SHIP_ID_ALIASES[clean] || clean;
}

function isKnownShipId(id){
  const shipId = normalizeShipId(id);
  return ships.some(ship=>ship.id === shipId);
}

function normalizeShipKeyedObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  const normalized = {};
  for(const [rawShipId, entry] of Object.entries(value)){
    const shipId = normalizeShipId(rawShipId);
    if(!isKnownShipId(shipId)) continue;
    normalized[shipId] = entry;
  }
  return normalized;
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
  merged.player.monsterRankPoints = 0;
  merged.player.totalPlayerKills = Math.max(0, Number(merged.player.totalPlayerKills || 0));
  merged.player.name = String(merged.player.name || "NOVA-37").trim().replace(/\s+/g, " ").slice(0, 24) || "NOVA-37";
  merged.player.firmId = normalizeFirmId(merged.player.firmId || merged.player.firm || merged.player.company || merged.player.faction || "astra");
  merged.player.firmSelected = Boolean(merged.player.firmSelected);
  merged.player.totalPlaySeconds = Math.max(0, Number(merged.player.totalPlaySeconds || 0));
  merged.player.laserShotsFired = Math.max(0, Number(merged.player.laserShotsFired || 0));
  merged.player.rocketShotsFired = Math.max(0, Number(merged.player.rocketShotsFired || 0));
  merged.player.missileShotsFired = Math.max(0, Number(merged.player.missileShotsFired || 0));
  merged.player.activeTitleId = typeof merged.player.activeTitleId === "string" ? merged.player.activeTitleId : null;
  merged.player.titleVisible = merged.player.titleVisible !== false;
  merged.player.premiumUntil = Math.max(0, Number(merged.player.premiumUntil || 0));
  merged.player.premiumActive = isPremiumActive(merged.player);
  merged.boosters = sanitizePlayerBoosterState(saved?.boosters || base.boosters);
  merged.premiumRewardState = normalizePremiumRewardState(saved?.premiumRewardState || base.premiumRewardState);
  merged.starterPackPurchases = normalizeStarterPackPurchases(saved?.starterPackPurchases || base.starterPackPurchases);
  enforcePlayerCurrencyMinimums(merged.player);
  merged.ownedShips = Array.isArray(saved?.ownedShips)
    ? [...new Set(saved.ownedShips.map(normalizeShipId).filter(isKnownShipId))]
    : base.ownedShips;
  merged.activeShip = normalizeShipId(merged.activeShip);
  merged.selectedShip = normalizeShipId(merged.selectedShip);
  merged.ownedItems = Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)) : base.ownedItems;
  merged.inventoryItems = Array.isArray(saved?.inventoryItems)
    ? saved.inventoryItems.filter(entry=>entry?.uid && equipment.some(i=>i.id===entry.itemId))
    : (Array.isArray(saved?.ownedItems) ? saved.ownedItems.filter(id=>equipment.some(i=>i.id===id)).map((itemId,index)=>({uid:`inv_${itemId}_${index+1}`, itemId})) : clone(base.inventoryItems));
  if(!merged.inventoryItems.some(entry=>entry.itemId === "laser_mk1")) merged.inventoryItems.unshift({uid:"inv_laser_mk1_1", itemId:"laser_mk1"});
  const hasAnyRepairBot = merged.inventoryItems.some(entry=>{
    const item = equipment.find(candidate=>candidate.id === entry.itemId);
    return Boolean(item?.effect?.repairBot);
  });
  const hasSavedStarterRepairFlag = saved && Object.hasOwn(saved, "starterRepairGranted");
  merged.starterRepairGranted = hasSavedStarterRepairFlag ? Boolean(saved.starterRepairGranted) : hasAnyRepairBot;
  if(!merged.starterRepairGranted && !hasAnyRepairBot){
    merged.inventoryItems.push({uid:"inv_repair_starter_2", itemId:"extra_repair_starter"});
    merged.starterRepairGranted = true;
  }else if(hasAnyRepairBot && !merged.starterRepairGranted){
    merged.starterRepairGranted = true;
  }
  merged.inventoryItems = dedupeInventoryUids(merged.inventoryItems);
  const stackedQuestItems = new Map();
  merged.inventoryItems = merged.inventoryItems.filter(entry=>{
    const item = equipment.find(candidate=>candidate.id === entry.itemId);
    if(item?.category !== "quest_item") return true;
    const existing = stackedQuestItems.get(entry.itemId);
    if(existing){
      existing.quantity = Math.max(1, Number(existing.quantity || 1)) + Math.max(1, Number(entry.quantity || 1));
      return false;
    }
    entry.quantity = Math.max(1, Number(entry.quantity || 1));
    stackedQuestItems.set(entry.itemId, entry);
    return true;
  });
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
    return value && (ammoTypes.some(a=>a.id === value) || equipment.some(item=>item.id === value && (item.category === "extra" || ["missileLauncher", "rocketLauncher"].includes(item.slotType)))) ? value : null;
  });
  merged.actionSlotsByShip = {};
  {
    const lastLaserAmmo = ammoTypes.find(ammo=>ammo.id === saved?.lastLaserAmmoId && ammo.weaponClass === "laser")
      || ammoTypes.find(ammo=>ammo.id === base.lastLaserAmmoId && ammo.weaponClass === "laser");
    merged.lastLaserAmmoId = lastLaserAmmo?.id || null;
  }
  merged.slotKeybinds = normalizeSlotKeybinds(saved?.slotKeybinds || base.slotKeybinds);
  merged.abilityKeybinds = normalizeAbilityKeybinds(saved?.abilityKeybinds || base.abilityKeybinds, merged.slotKeybinds);
  merged.graphicsQuality = normalizeGraphicsQuality(saved?.graphicsQuality || base.graphicsQuality);
  merged.settings = normalizeGameSettings(saved?.settings, {legacyGraphicsQuality:merged.graphicsQuality});
  merged.graphicsQuality = merged.settings.graphics.basePreset;
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
        points:0
      };
    }
  }
  for(const [kind, kills] of Object.entries(merged.killStats)){
    if(merged.rankKillStats[kind]) continue;
    const count = Math.max(0, Number(kills || 0));
    merged.rankKillStats[kind] = {kills:count, points:0};
  }
  merged.player.monsterRankPoints = Object.entries(merged.rankKillStats).reduce((total, [kind, entry])=>{
    const kills = Math.max(0, Math.floor(Number(entry?.kills || 0)), Math.floor(Number(merged.killStats[kind] || 0)));
    const points = calculateMonsterRankPointsForKills(kind, kills);
    merged.killStats[kind] = kills;
    merged.rankKillStats[kind] = {kills, points};
    return total + points;
  }, 0);
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
    const savedShipCargo = normalizeShipKeyedObject(saved.shipCargo);
    for(const ship of ships){
      const savedCargo = savedShipCargo[ship.id];
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
    const ship = getShip(normalizeShipId(job.shipId));
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
  merged.craftingJob = normalizeCraftingJob(saved?.craftingJob || base.craftingJob);
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
        seconds:Math.max(0, Number(entry.seconds || 0)),
        expiresAt:Math.max(0, Number(entry.expiresAt || 0))
      };
    }
  }
  merged.equipmentUpgrades = saved?.equipmentUpgrades && typeof saved.equipmentUpgrades === "object" ? {...saved.equipmentUpgrades} : {...(base.equipmentUpgrades || {})};
  const savedActiveQuestIds = Array.isArray(saved?.activeQuestIds) ? saved.activeQuestIds : [];
  const legacyActiveQuestId = getQuest(saved?.activeQuestId)?.id || null;
  const matchesCurrentFirm = id=>{
    const quest = getQuest(id);
    return quest && (!quest.firmId || normalizeFirmId(quest.firmId) === normalizeFirmId(merged.player.firmId || "astra"));
  };
  merged.activeQuestIds = [...new Set([...savedActiveQuestIds, legacyActiveQuestId].filter(id=>matchesCurrentFirm(id) && !saved?.completedQuestClaims?.[id]))].slice(0, MAX_ACTIVE_QUESTS);
  merged.activeQuestId = merged.activeQuestIds.includes(legacyActiveQuestId) ? legacyActiveQuestId : (merged.activeQuestIds[0] || base.activeQuestId);
  merged.questProgress = saved?.questProgress && typeof saved.questProgress === "object" ? {...saved.questProgress} : {...(base.questProgress || {})};
  merged.questFailProgress = saved?.questFailProgress && typeof saved.questFailProgress === "object" ? {...saved.questFailProgress} : {...(base.questFailProgress || {})};
  merged.completedQuestClaims = saved?.completedQuestClaims && typeof saved.completedQuestClaims === "object" ? {...saved.completedQuestClaims} : {...(base.completedQuestClaims || {})};
  merged.tutorial = sanitizeTutorialState(saved?.tutorial || base.tutorial, {missingStatus:"abandoned"});
  merged.uiLayout = {...(base.uiLayout || {})};
  if(saved?.uiLayout && typeof saved.uiLayout === "object"){
    merged.uiLayout = {...merged.uiLayout, ...saved.uiLayout};
  }
  if(!saved?.settings?.interface || !Object.hasOwn(saved.settings.interface, "perfVisible")){
    merged.settings.interface.perfVisible = merged.uiLayout.perfVisible !== false;
  }
  if(!saved?.settings?.interface || !Object.hasOwn(saved.settings.interface, "chatVisible")){
    merged.settings.interface.chatVisible = merged.uiLayout.combatChatPanel?.open !== false;
  }
  merged.uiLayout.perfVisible = merged.settings.interface.perfVisible;
  merged.firmatons = Math.max(0, Math.floor(Number(saved?.firmatons ?? base.firmatons ?? 0)));
  const savedFirmBoxes = saved?.firmBoxes && typeof saved.firmBoxes === "object" ? saved.firmBoxes : {};
  merged.firmBoxes = Object.fromEntries(["common", "rare", "veryRare", "elite", "mythic"].map(rarity=>[
    rarity,
    Math.max(0, Math.floor(Number(savedFirmBoxes[rarity] ?? base.firmBoxes?.[rarity] ?? 0)))
  ]));
  merged.firmRewardHistory = Array.isArray(saved?.firmRewardHistory) ? saved.firmRewardHistory.slice(-60) : [];
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
  if(!merged.ownedItems.includes("laser_mk1")) merged.ownedItems.unshift("laser_mk1");
  if(merged.activeShip !== null && (!ships.some(s=>s.id===merged.activeShip) || !merged.ownedShips.includes(merged.activeShip))) merged.activeShip = starterShipId;
  if(!ships.some(s=>s.id===merged.selectedShip) || !merged.ownedShips.includes(merged.selectedShip)) merged.selectedShip = merged.activeShip;
  if(!merged.selectedShip) merged.selectedShip = starterShipId;
  const sanitizeSlots = value=>Array.from({length:9}, (_,index)=>{
    const id = Array.isArray(value) ? value[index] : null;
    return id && (ammoTypes.some(ammo=>ammo.id === id) || equipment.some(item=>item.id === id && (item.category === "extra" || ["missileLauncher", "rocketLauncher"].includes(item.slotType))) || droneFormations.some(formation=>formation.id === id)) ? id : null;
  });
  const hasSavedActionSlotsByShip = saved?.actionSlotsByShip && typeof saved.actionSlotsByShip === "object";
  if(hasSavedActionSlotsByShip){
    const savedActionSlotsByShip = normalizeShipKeyedObject(saved.actionSlotsByShip);
    for(const shipId of merged.ownedShips){
      if(Array.isArray(savedActionSlotsByShip[shipId])) merged.actionSlotsByShip[shipId] = sanitizeSlots(savedActionSlotsByShip[shipId]);
    }
  }
  if(!merged.actionSlotsByShip[merged.activeShip]){
    merged.actionSlotsByShip[merged.activeShip] = hasSavedActionSlotsByShip ? sanitizeSlots([]) : sanitizeSlots(merged.actionSlots);
  }
  merged.actionSlots = [...merged.actionSlotsByShip[merged.activeShip]];
  merged.actionSlotsUpdatedAt = Math.max(0, Number(saved?.actionSlotsUpdatedAt || saved?.mmoProfileUpdatedAt || 0));
  merged.mmoProfileUpdatedAt = Math.max(0, Number(saved?.mmoProfileUpdatedAt || 0));
  merged.shipLoadouts = saved?.shipLoadouts && typeof saved.shipLoadouts === "object" ? normalizeShipKeyedObject(saved.shipLoadouts) : clone(base.shipLoadouts);
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
  if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
  if(!Array.isArray(store.state.actionSlotsByShip.orion)){
    store.state.actionSlotsByShip.orion = ["ammo_x1", null, null, null, null, null, null, null, starterUid ? "extra_repair_starter" : null];
  }
  if(store.state.activeShip === "orion") store.state.actionSlots = [...store.state.actionSlotsByShip.orion];
}

function migrateLoadoutItemIds(){
  const used = new Set();
  const shipIds = Object.keys(store.state.shipLoadouts || {}).sort((a, b)=>{
    if(a === "orion") return -1;
    if(b === "orion") return 1;
    return 0;
  });
  for(const shipId of shipIds){
    const raw = store.state.shipLoadouts[shipId] || {};
    for(const part of ["lasers", "generators", "extras"]){
      raw[part] = (raw[part] || []).map(value=>{
        if(!value) return null;
        if(getInventoryItem(value) && !used.has(value)){ used.add(value); return value; }
        const item = getItem(value);
        if(!item) return null;
        let entry = store.state.inventoryItems.find(candidate=>candidate.itemId === value && !used.has(candidate.uid));
        if(!entry && value === "extra_repair_starter") return null;
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
      if(!entry && value === "extra_repair_starter"){ raw[part] = null; continue; }
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
