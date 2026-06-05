import { ammoTypes, portals, rawMaterialCatalog } from "./data/catalog.js";
import {
  addAmmo,
  addInventoryItem,
  addPortalPiece,
  applyDronePermanentUpgrade,
  canAfford,
  ensureShipLoadout,
  findEquippedSlot,
  getDroneCatalog,
  getDroneFormation,
  getDroneLoadout,
  getDronePurchasePrice,
  getInventoryItem,
  getItem,
  getItemFromInventoryUid,
  getLoadout,
  getMaterialStorageCap,
  getPortal,
  getPortalPieces,
  getXpNextForLevel,
  getShipPurchaseLockReason,
  getShip,
  isDroneCompatibleEquipment,
  isDronePermanentUpgradeItem,
  performPrestige,
  isPortalUnlocked,
  loadState,
  saveState,
  setStateStorageScope,
  setGraphicsQuality,
  spend,
  rushRefineryUpgrade,
  rushRefineryShipment,
  recordQuestRefineryMaterialUpgradeStart,
  recordQuestRefineryModuleUpgradeStart,
  recordQuestSpaceCasterUse,
  startRefineryJob,
  startRefineryMaterialUpgrade,
  startRefineryModuleUpgrade,
  startRefineryShipment,
  store,
  claimRefineryJob,
  tickRefineryProduction,
  toggleRefineryProduction,
  unequipInventoryItem,
  upgradeSkill,
  unlockPortal,
  XP_CURVE_VERSION
} from "./core/store.js";
import { createCombatGame } from "./game/combat.js?v=quest-claim-ui-1";
import { applyServerDroneUpgrade, buyServerAmmo, buyServerDrone, buyServerDroneFormation, buyServerItem, buyServerShip, claimServerRefineryJob, equipServerActiveShip, equipServerInventoryItem, multiplayer, progressServerQuest, runServerSpaceCaster, rushServerRefineryShipment, rushServerRefineryUpgrade, startServerPortal, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, syncMultiplayerProfile, toggleServerRefineryProduction, unequipServerInventoryItem, unequipServerSlot } from "./multiplayer/client.js";
import { initMultiplayer } from "./multiplayer/client.js";
import { renderAll, renderProfile, renderRefinery, renderShop, renderTop, setView } from "./ui/render.js";
import { showToast } from "./ui/toast.js";
import { DEFAULT_SLOT_KEYBINDS, eventToCode, keyCodeToLabel, normalizeSlotKeybinds } from "./core/keybinds.js";

const Game = createCombatGame({renderAll, showToast});
let inventoryClickTimer = null;
let pendingKeybindSlot = null;
let pendingServerResume = null;
const urlParams = new URLSearchParams(window.location.search);
const appMode = urlParams.get("mode") === "game" ? "game" : "launcher";
const PROFILE_SCOPE_STORAGE_KEY = "voidsector-active-profile-scope";
let activeProfileScope = localStorage.getItem(PROFILE_SCOPE_STORAGE_KEY) || "guest";

function accountProfileScope(account){
  return account?.id ? `account:${account.id}` : "guest";
}

function switchLocalProfileScope(scope){
  const nextScope = String(scope || "guest");
  if(nextScope === activeProfileScope && store.state) return false;
  if(store.state) saveState();
  activeProfileScope = nextScope;
  localStorage.setItem(PROFILE_SCOPE_STORAGE_KEY, activeProfileScope);
  setStateStorageScope(activeProfileScope);
  loadState();
  store.hangarDetailOpen = false;
  store.hangarTab = "vaisseau";
  store.currentView = "hangar";
  if(appMode === "game" && Game.running) Game.refreshActiveLoadout?.();
  renderAll();
  return true;
}

function getInventoryScrollSnapshot(){
  const grid = document.querySelector(".rpg-inventory-grid");
  return {
    gridTop: grid ? grid.scrollTop : null,
    windowX: window.scrollX,
    windowY: window.scrollY
  };
}

function restoreInventoryScroll(snapshot){
  requestAnimationFrame(()=>{
    const grid = document.querySelector(".rpg-inventory-grid");
    if(grid && snapshot.gridTop !== null){
      const maxTop = Math.max(0, grid.scrollHeight - grid.clientHeight);
      grid.scrollTop = Math.min(snapshot.gridTop, maxTop);
    }
    window.scrollTo(snapshot.windowX, snapshot.windowY);
  });
}

function renderAllPreserveInventoryScroll(){
  const snapshot = getInventoryScrollSnapshot();
  renderAll();
  restoreInventoryScroll(snapshot);
}

function saveAndSyncProfile(){
  store.state.mmoProfileUpdatedAt = Date.now();
  saveState();
  syncMultiplayerProfile(store.state);
}

function applyServerProfile(profile){
  if(!profile || typeof profile !== "object") return;
  const incomingVersion = Number(profile.updatedAt || 0);
  const clone = value=>JSON.parse(JSON.stringify(value || {}));
  const localSelectedShip = store.state.selectedShip;
  const incomingOwnedShips = Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : null;
  const keepLocalSelectedShip = store.currentView === "hangar"
    && store.hangarTab === "vaisseau"
    && store.hangarDetailOpen
    && typeof localSelectedShip === "string"
    && (incomingOwnedShips ? incomingOwnedShips.includes(localSelectedShip) : store.state.ownedShips.includes(localSelectedShip));
  if(profile.player) store.state.player = {...store.state.player, ...clone(profile.player)};
  if(typeof profile.activeShip === "string") store.state.activeShip = profile.activeShip;
  if(typeof profile.selectedShip === "string") store.state.selectedShip = profile.selectedShip;
  if(Array.isArray(profile.ownedShips)){
    store.state.ownedShips = [...new Set(profile.ownedShips.map(String))];
    for(const shipId of store.state.ownedShips) ensureShipLoadout(shipId);
  }
  if(Array.isArray(profile.inventoryItems)) store.state.inventoryItems = clone(profile.inventoryItems);
  if(Number.isFinite(Number(profile.nextInventoryUid))) store.state.nextInventoryUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid)));
  if(profile.ammoInventory && typeof profile.ammoInventory === "object") store.state.ammoInventory = clone(profile.ammoInventory);
  if(profile.shipLoadouts && typeof profile.shipLoadouts === "object") store.state.shipLoadouts = clone(profile.shipLoadouts);
  if(Number.isFinite(Number(profile.ownedDroneCount))) store.state.ownedDroneCount = Math.max(0, Math.floor(Number(profile.ownedDroneCount)));
  if(Array.isArray(profile.droneLoadout)) store.state.droneLoadout = clone(profile.droneLoadout);
  if(profile.dronePermanentUpgrades && typeof profile.dronePermanentUpgrades === "object") store.state.dronePermanentUpgrades = clone(profile.dronePermanentUpgrades);
  if(profile.equipmentUpgrades && typeof profile.equipmentUpgrades === "object") store.state.equipmentUpgrades = clone(profile.equipmentUpgrades);
  if(Array.isArray(profile.ownedDroneFormations)) store.state.ownedDroneFormations = [...new Set(profile.ownedDroneFormations.map(String))];
  if(Object.hasOwn(profile, "activeDroneFormation")){
    store.state.activeDroneFormation = typeof profile.activeDroneFormation === "string" ? profile.activeDroneFormation : "base";
  }
  store.state.player.xpNext = getXpNextForLevel(store.state.player.level);
  store.state.player.xp = Math.min(Math.max(0, Number(store.state.player.xp || 0)), store.state.player.xpNext);
  store.state.xpCurveVersion = XP_CURVE_VERSION;
  for(const key of [
    "cargoHold",
    "shipCargo",
    "skillRanks",
    "skillLevels",
    "completedPortals",
    "portalPieces",
    "refineryLevels",
    "refineryModules",
    "refineryUpgradeJobs",
    "refineryProductionDisabled",
    "questProgress",
    "questFailProgress",
    "completedQuestClaims"
  ]){
    if(profile[key] && typeof profile[key] === "object") store.state[key] = clone(profile[key]);
  }
  if(Array.isArray(profile.activeQuestIds)) store.state.activeQuestIds = profile.activeQuestIds.map(String).slice(0, 5);
  if(Object.hasOwn(profile, "activeQuestId")){
    store.state.activeQuestId = typeof profile.activeQuestId === "string" ? profile.activeQuestId : (store.state.activeQuestIds?.[0] || null);
  }
  store.state.refineryShipmentJob = profile.refineryShipmentJob ? clone(profile.refineryShipmentJob) : null;
  store.state.refineryJob = profile.refineryJob ? clone(profile.refineryJob) : null;
  if(Number.isFinite(Number(profile.refineryLastTick))) store.state.refineryLastTick = Number(profile.refineryLastTick);
  if(keepLocalSelectedShip) store.state.selectedShip = localSelectedShip;
  store.state.mmoProfileUpdatedAt = incomingVersion || Date.now();
  saveState();
  if(appMode === "game" && Game.running) Game.refreshActiveLoadout?.();
  renderAll();
  showToast("Profil MMO synchronise.");
}

function equipSelectedShip(){
  const ship = getShip(store.state.selectedShip);
  if(store.state.activeShip === ship.id) return showToast(`${ship.name} est deja le vaisseau equipe.`);
  if(multiplayer.connected){
    if(equipServerActiveShip(ship.id)){
      showToast("Changement de vaisseau envoye au serveur.");
      return;
    }
  }
  if(store.state.activeShip === ship.id){
    store.state.activeShip = null;
    showToast(`${ship.name} déséquipé.`);
    saveAndSyncProfile();
    renderAll();
    return;
  }
  ensureShipLoadout(ship.id);
  store.state.activeShip = ship.id;
  showToast(`${ship.name} équipé.`);
  saveAndSyncProfile();
  renderAll();
}

function buyShip(id){
  const ship = getShip(id);
  if(store.state.ownedShips.includes(id)) return;
  const lockReason = getShipPurchaseLockReason(ship);
  if(lockReason) return showToast(lockReason);
  if(multiplayer.connected && buyServerShip(id)){
    showToast("Achat envoye au serveur.");
    return;
  }
  if(!canAfford(ship.priceType, ship.price)) return showToast("Fonds insuffisants.");
  spend(ship.priceType, ship.price);
  store.state.ownedShips.push(id);
  ensureShipLoadout(id);
  showToast(`${ship.name} acheté. Il est disponible dans ton hangar.`);
  renderAll();
}

function buyItem(id){
  const item = getItem(id);
  if(!item) return;
  if(multiplayer.connected && buyServerItem(id)){
    showToast("Achat envoye au serveur.");
    return;
  }
  if(!canAfford(item.priceType, item.price)) return showToast("Fonds insuffisants.");
  spend(item.priceType, item.price);
  addInventoryItem(id);
  showToast(`${item.name} acheté. Un exemplaire a été ajouté à l'inventaire.`);
  renderAll();
}

function buyAmmo(id, multiplier = 1){
  const ammo = ammoTypes.find(a=>a.id === id);
  if(!ammo) return;
  const count = [1, 10, 100, 1000].includes(Number(multiplier)) ? Number(multiplier) : 1;
  if(multiplayer.connected && buyServerAmmo(id, count)){
    showToast("Achat envoye au serveur.");
    return;
  }
  const price = ammo.price * count;
  const amount = ammo.amount * count;
  if(!canAfford(ammo.priceType, price)) return showToast("Fonds insuffisants.");
  spend(ammo.priceType, price);
  addAmmo(ammo.id, amount);
  showToast(`${ammo.name} achetée : +${amount.toLocaleString("fr-FR")} munitions.`);
  renderAll();
}

function buyCombatDrone(){
  const drone = getDroneCatalog();
  const count = store.state.ownedDroneCount || 0;
  if(count >= drone.maxOwned) return showToast("Nombre maximum de drones atteint.");
  if(multiplayer.connected && buyServerDrone({id:drone.id, ownedCount:count})){
    showToast("Achat envoye au serveur.");
    return;
  }
  const price = getDronePurchasePrice(count);
  if(!canAfford(drone.priceType, price)) return showToast("Fonds insuffisants.");
  spend(drone.priceType, price);
  store.state.ownedDroneCount = count + 1;
  const loadout = getDroneLoadout();
  while(loadout.length < store.state.ownedDroneCount) loadout.push(null);
  store.hangarTab = "drone";
  showToast(`Drone ${store.state.ownedDroneCount} acheté pour ${price.toLocaleString("fr-FR")} crédits.`);
  renderAll();
}

function buyDroneFormation(id){
  const formation = getDroneFormation(id);
  if(!formation) return;
  if(!Array.isArray(store.state.ownedDroneFormations)) store.state.ownedDroneFormations = [];
  const owned = store.state.ownedDroneFormations.includes(id);
  if(multiplayer.connected && buyServerDroneFormation({id, owned})){
    showToast(owned ? "Activation envoyee au serveur." : "Achat envoye au serveur.");
    return;
  }
  if(!owned){
    if(!canAfford(formation.priceType, formation.price)) return showToast("Fonds insuffisants.");
    spend(formation.priceType, formation.price);
    store.state.ownedDroneFormations.push(id);
    showToast(`${formation.name} achetée.`);
  }else{
    showToast(`${formation.name} activée.`);
  }
  store.state.activeDroneFormation = id;
  renderAll();
}

function applyServerAmmoPurchases(){
  if(!multiplayer.shopAmmoEvents?.length) return;
  const events = multiplayer.shopAmmoEvents.splice(0);
  for(const event of events){
    const amount = Math.max(0, Math.round(Number(event.amount || 0)));
    if(!event.id || amount <= 0) continue;
    showToast(`${event.name || "Munitions"} achetee cote serveur : +${amount.toLocaleString("fr-FR")}.`);
  }
}

function applyServerItemPurchases(){
  if(!multiplayer.shopItemEvents?.length) return;
  const events = multiplayer.shopItemEvents.splice(0);
  for(const event of events){
    if(!event.id) continue;
    const item = getItem(event.id);
    if(!item) continue;
    showToast(`${item.name} achete cote serveur. Un exemplaire a ete ajoute a l'inventaire.`);
  }
}

function applyServerShipPurchases(){
  if(!multiplayer.shopShipEvents?.length) return;
  const events = multiplayer.shopShipEvents.splice(0);
  for(const event of events){
    const ship = getShip(event.id);
    if(!ship) continue;
    showToast(`${ship.name} achete cote serveur. Il est disponible dans ton hangar.`);
  }
}

function applyServerDronePurchases(){
  if(!multiplayer.shopDroneEvents?.length) return;
  const events = multiplayer.shopDroneEvents.splice(0);
  for(const event of events){
    const nextCount = Math.max(0, Math.round(Number(event.nextCount || 0)));
    if(nextCount <= 0) continue;
    store.hangarTab = "drone";
    showToast(`Drone ${nextCount} achete cote serveur.`);
  }
  renderAll();
}

function applyServerDroneFormationPurchases(){
  if(!multiplayer.shopDroneFormationEvents?.length) return;
  const events = multiplayer.shopDroneFormationEvents.splice(0);
  for(const event of events){
    const formation = getDroneFormation(event.id);
    if(!formation) continue;
    showToast(`${formation.name} ${event.owned ? "activee" : "achetee"} cote serveur.`);
  }
}

function applyServerRefineryEvents(){
  if(!multiplayer.refineryEvents?.length) return;
  const events = multiplayer.refineryEvents.splice(0);
  for(const event of events){
    if(event.action === "upgrade-start"){
      showToast(`${event.name || "Amelioration"} niveau ${event.level} lance cote serveur.`);
    }else if(event.action === "upgrade-rush"){
      showToast(`${event.name || "Amelioration"} niveau ${event.level} termine cote serveur pour ${event.cost} NOVA.`);
    }else if(event.action === "production-toggle"){
      showToast(`Production ${event.enabled ? "activee" : "coupee"} cote serveur.`);
    }else if(event.action === "job-start"){
      showToast(`Raffinage lance cote serveur : ${event.recipe?.name || "recette"}.`);
    }else if(event.action === "job-claim"){
      showToast(`Raffinage recupere cote serveur : ${event.recipe?.name || "recette"}.`);
    }else if(event.action === "shipment-start"){
      showToast(`${event.amount || 0} ${event.material?.name || "materiau"} envoyes vers ${event.ship?.name || "vaisseau"} cote serveur.`);
    }else if(event.action === "shipment-rush"){
      showToast(`Expedition terminee cote serveur : +${event.amount || 0} ${event.materialName || "materiau"} pour ${event.cost || 0} NOVA.`);
    }else if(event.action === "ship-cargo-refine"){
      showToast(`Fusion serveur : +${event.outputAmount || 0} ${event.output?.name || event.recipe?.outputId || "materiau"}.`);
    }
  }
  renderAll();
}

function applyServerSpaceCasterEvents(){
  if(!multiplayer.spaceCasterEvents?.length) return;
  const events = multiplayer.spaceCasterEvents.splice(0);
  for(const event of events){
    store.state.portalCasterResults = Array.isArray(event.rewards)
      ? event.rewards.map(reward=>({label:reward.label, amount:reward.amount, img:reward.img}))
      : [];
    showToast(`Space Caster serveur : ${event.count || 1} lancement(s).`);
  }
  renderAll();
}

const SPACE_CASTER_REWARDS = [
  {kind:"piece", label:"Piece de portail", amount:1, weight:4},
  {kind:"ammo", id:"ammo_x2", label:"Munitions x2", amount:250, weight:23},
  {kind:"ammo", id:"ammo_x3", label:"Munitions x3", amount:100, weight:12},
  {kind:"ammo", id:"ammo_x4", label:"Munitions x4", amount:35, weight:5},
  {kind:"ammo", id:"rocket_r1", label:"Roquettes R-1", amount:12, weight:27},
  {kind:"ammo", id:"rocket_r2", label:"Roquettes R-2", amount:6, weight:14},
  {kind:"ammo", id:"rocket_r3", label:"Roquettes R-3", amount:2, weight:6},
  {kind:"ammo", id:"missile_m1", label:"Missiles MS-1", amount:5, weight:5},
  {kind:"ammo", id:"missile_m2", label:"Missiles MS-2", amount:2, weight:4}
];

function getSpaceCasterCost(){
  return 100;
}

function canDropPortalPiece(portal){
  const completed = Math.max(0, Number(store.state.completedPortals?.[portal.id] || 0));
  return completed > 0 || getPortalPieces(portal.id) < portal.piecesRequired;
}

function getSpaceCasterRewards(portal){
  return SPACE_CASTER_REWARDS.filter(reward=>reward.kind !== "piece" || canDropPortalPiece(portal));
}

function pickSpaceCasterReward(portal){
  const rewards = getSpaceCasterRewards(portal);
  const total = rewards.reduce((sum, reward)=>sum + reward.weight, 0);
  let roll = Math.random() * total;
  for(const reward of rewards){
    roll -= reward.weight;
    if(roll <= 0) return reward;
  }
  return rewards[0];
}

function runSpaceCaster(id, count = 1){
  const portal = getPortal(id);
  if(!portal) return;
  const rollCount = [1, 10, 100].includes(Number(count)) ? Number(count) : 1;
  if(multiplayer.connected && runServerSpaceCaster({portalId:portal.id, count:rollCount})){
    showToast("Space Caster envoye au serveur.");
    return;
  }
  const cost = getSpaceCasterCost() * rollCount;
  if(!canAfford("premium", cost)) return showToast("Pas assez de NOVA pour lancer le Space Caster.");
  spend("premium", cost);
  store.state.selectedPortalCasterId = portal.id;
  const summary = new Map();
  for(let i = 0; i < rollCount; i++){
    const reward = pickSpaceCasterReward(portal);
    const label = reward.kind === "piece" ? `Piece ${portal.name}` : reward.label;
    const img = reward.kind === "piece" ? (portal.pieceImg || portal.img) : ammoTypes.find(ammo=>ammo.id === reward.id)?.img;
    if(reward.kind === "piece") addPortalPiece(portal.id, reward.amount);
    else addAmmo(reward.id, reward.amount);
    const current = summary.get(label) || {label, amount:0, img};
    current.amount += reward.amount;
    if(!current.img && img) current.img = img;
    summary.set(label, current);
  }
  const questCompleted = multiplayer.connected
    ? progressServerQuest({type:"space_caster_use", amount:rollCount}) && false
    : recordQuestSpaceCasterUse(rollCount);
  store.state.portalCasterResults = Array.from(summary.values());
  saveState();
  showToast(`Space Caster : ${rollCount} lancement(s).`);
  if(questCompleted) showToast("Quete terminee : retourne au relais pour reclamer la recompense.");
  renderAll();
}

function applyDevProgressionBoost(){
  if(!store.state) return;
  store.state.player.level = Math.max(Number(store.state.player.level || 0), 999);
  store.state.player.xp = Math.max(Number(store.state.player.xp || 0), 0);
  store.state.player.xpNext = Math.max(Number(store.state.player.xpNext || 0), 1);
  store.state.player.credits = Math.max(Number(store.state.player.credits || 0), 1000000000);
  store.state.player.premium = Math.max(Number(store.state.player.premium || 0), 1000000);
  store.state.player.skillPoints = Math.max(Number(store.state.player.skillPoints || 0), 999);

  if(!store.state.refineryLevels || typeof store.state.refineryLevels !== "object") store.state.refineryLevels = {};
  for(const material of rawMaterialCatalog){
    store.state.refineryLevels[material.id] = Number(material.maxLevel || 20);
  }
  store.state.refineryModules = {storage:20, transport:20};
  store.state.refineryUpgradeJobs = {};
  store.state.refineryShipmentJob = null;
  store.state.refineryProductionDisabled = {};
  store.state.refineryLastTick = Date.now();
  store.state.unlockedPortals = portals.map(portal=>portal.id);
  store.state.completedPortals = portals.reduce((completed, portal)=>{
    completed[portal.id] = Math.max(1, Number(store.state.completedPortals?.[portal.id] || 0));
    return completed;
  }, {});

  if(!store.state.cargoHold || typeof store.state.cargoHold !== "object") store.state.cargoHold = {};
  for(const material of rawMaterialCatalog){
    store.state.cargoHold[material.id] = getMaterialStorageCap(material.id);
  }
  saveState();
  renderAll();
  showToast("Mode test : raffinerie max, stocks pleins, points disponibles.");
}

window.voidsectorDev = {
  maxTest:applyDevProgressionBoost
};

function canMoveInventoryItemToTarget(inventoryUid, target){
  const equipped = findEquippedSlot(inventoryUid);
  if(!equipped) return true;
  if(target.location === "ship" && equipped.location === "ship" && equipped.shipId === target.shipId) return true;
  if(target.location === "drone" && equipped.location === "drone" && equipped.index === target.index) return true;
  unequipInventoryItem(inventoryUid);
  return true;
}

function equipPart(type, index, inventoryUid){
  const item = getItemFromInventoryUid(inventoryUid);
  if(!item) return;
  if(multiplayer.connected){
    if(type === "drone" && isDronePermanentUpgradeItem(item)){
      if(applyServerDroneUpgrade({index, inventoryUid})){
        showToast("Amelioration drone envoyee au serveur.");
        return;
      }
    }
    const ship = getShip(store.state.selectedShip);
    if(equipServerInventoryItem({type, index, inventoryUid, shipId:ship?.id})){
      showToast("Equipement envoye au serveur.");
      return;
    }
  }
  if(type === "laser" || type === "generator" || type === "missileLauncher" || type === "rocketLauncher" || type === "extra"){
    const ship = getShip(store.state.selectedShip);
    const loadout = getLoadout(ship.id);
    if(type === "laser"){
      if(item.category !== "canon") return showToast("Ce n'est pas un canon.");
      if(index >= ship.stats.maxLasers) return;
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      loadout.lasers = loadout.lasers.map(uid => uid === inventoryUid ? null : uid);
      loadout.lasers[index] = inventoryUid;
    }else if(type === "generator"){
      if(item.category !== "generateur") return showToast("Ce n'est pas un générateur.");
      if(index >= ship.stats.maxGenerators) return;
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      loadout.generators = loadout.generators.map(uid => uid === inventoryUid ? null : uid);
      loadout.generators[index] = inventoryUid;
    }else if(type === "missileLauncher"){
      if(item.slotType !== "missileLauncher") return showToast("Ce n'est pas un lance missile.");
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      if(loadout.missileLauncher && loadout.missileLauncher !== inventoryUid) unequipInventoryItem(loadout.missileLauncher);
      loadout.missileLauncher = inventoryUid;
    }else if(type === "rocketLauncher"){
      if(item.slotType !== "rocketLauncher") return showToast("Ce n'est pas un lance roquette.");
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      if(loadout.rocketLauncher && loadout.rocketLauncher !== inventoryUid) unequipInventoryItem(loadout.rocketLauncher);
      loadout.rocketLauncher = inventoryUid;
    }else{
      if(item.category !== "extra") return showToast("Ce n'est pas un extra.");
      if(index >= (ship.stats.maxExtras || 3)) return;
      if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
      loadout.extras = loadout.extras.map(uid => uid === inventoryUid ? null : uid);
      loadout.extras[index] = inventoryUid;
    }
    store.state.shipLoadouts[ship.id] = loadout;
    showToast(`${item.name} équipé sur ${ship.name}.`);
    renderAllPreserveInventoryScroll();
    return;
  }

  if(type === "drone"){
    const drones = getDroneLoadout();
    if(index >= drones.length) return showToast("Aucun drone à cet emplacement.");
    if(isDronePermanentUpgradeItem(item)){
      const result = applyDronePermanentUpgrade(index, inventoryUid);
      if(!result.ok) return showToast(result.reason);
      saveState();
      showToast(`Drone ${index+1} passe en overdrive rouge : lasers du drone +50%.`);
      renderAllPreserveInventoryScroll();
      return;
    }
    if(!isDroneCompatibleEquipment(item)) return showToast("Un drone accepte uniquement un laser ou un générateur de bouclier.");
    if(drones[index] && drones[index] !== inventoryUid) unequipInventoryItem(drones[index]);
    if(!canMoveInventoryItemToTarget(inventoryUid, {location:"drone", index})) return;
    for(let i=0;i<drones.length;i++) if(drones[i] === inventoryUid) drones[i] = null;
    drones[index] = inventoryUid;
    saveState();
    showToast(`${item.name} équipé sur Drone ${index+1}.`);
    renderAllPreserveInventoryScroll();
  }
}

function autoEquipInventoryItem(inventoryUid){
  store.selectedInventoryUid = inventoryUid;
  const item = getItemFromInventoryUid(inventoryUid);
  if(!item) return;

  if(store.hangarTab === "drone"){
    const drones = getDroneLoadout();
    if(!drones.length) return showToast("Achète d'abord un drone.");
    if(isDronePermanentUpgradeItem(item)){
      const index = drones.findIndex((_, i)=>!store.state.dronePermanentUpgrades?.[i]);
      if(index < 0) return showToast("Tous les drones sont deja ameliores.");
      equipPart("drone", index, inventoryUid);
      return;
    }
    if(!isDroneCompatibleEquipment(item)) return showToast("Cet équipement n'est pas compatible avec les drones.");
    const currentIndex = drones.indexOf(inventoryUid);
    let index = currentIndex >= 0 ? currentIndex : drones.findIndex(uid=>!uid);
    if(index < 0) index = 0;
    equipPart("drone", index, inventoryUid);
    return;
  }

  const ship = getShip(store.state.selectedShip);
  if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
  const loadout = getLoadout(ship.id);
  const type = item.category === "canon" ? "laser" : item.category === "generateur" ? "generator" : item.slotType === "missileLauncher" ? "missileLauncher" : item.slotType === "rocketLauncher" ? "rocketLauncher" : item.category === "extra" ? "extra" : null;
  if(!type) return showToast("Cet équipement n'est pas montable sur un vaisseau pour le moment.");
  if(type === "missileLauncher" || type === "rocketLauncher"){
    equipPart(type, 0, inventoryUid);
    return;
  }
  const slots = type === "laser" ? loadout.lasers : type === "generator" ? loadout.generators : loadout.extras;
  const currentIndex = slots.indexOf(inventoryUid);
  let index = currentIndex >= 0 ? currentIndex : slots.findIndex(uid=>!uid);
  if(index < 0) index = 0;
  equipPart(type, index, inventoryUid);
}

function unequipPart(type, index){
  if(multiplayer.connected){
    const ship = getShip(store.state.selectedShip);
    if(unequipServerSlot({type, index, shipId:ship?.id})){
      showToast("Retrait envoye au serveur.");
      return;
    }
  }
  if(type === "drone"){
    const drones = getDroneLoadout();
    if(index >= 0 && index < drones.length) drones[index] = null;
    showToast(`Drone ${index+1} vidé.`);
    renderAllPreserveInventoryScroll();
    return;
  }
  const ship = getShip(store.state.selectedShip);
  const loadout = getLoadout(ship.id);
  if(type === "laser") loadout.lasers[index] = null;
  else if(type === "generator") loadout.generators[index] = null;
  else if(type === "missileLauncher") loadout.missileLauncher = null;
  else if(type === "rocketLauncher") loadout.rocketLauncher = null;
  else if(type === "extra") loadout.extras[index] = null;
  store.state.shipLoadouts[ship.id] = loadout;
  showToast(`Slot ${index+1} vidé sur ${ship.name}.`);
  renderAllPreserveInventoryScroll();
}


function unlockPortalWithPieces(id){
  const portal = getPortal(id);
  if(!portal) return;
  if(store.state.player.level < portal.requirement.level) return showToast(`Niveau ${portal.requirement.level} requis pour dÃ©verrouiller ${portal.name}.`);
  if(isPortalUnlocked(id)) return showToast(`${portal.name} est déjà déverrouillé.`);
  if(getPortalPieces(id) < portal.piecesRequired) return showToast(`Il faut ${portal.piecesRequired} pièces.`);
  store.state.portalPieces[id] = Math.max(0, getPortalPieces(id) - portal.piecesRequired);
  unlockPortal(id);
  showToast(`${portal.name} déverrouillé avec des pièces.`);
  renderAll();
}

function unlockPortalWithNova(id){
  const portal = getPortal(id);
  if(portal && store.state.player.level < portal.requirement.level) return showToast(`Niveau ${portal.requirement.level} requis pour deverrouiller ${portal.name}.`);
  if(!portal) return;
  if(store.state.player.level < portal.requirement.level) return showToast(`Niveau ${portal.requirement.level} requis pour dÃƒÂ©verrouiller ${portal.name}.`);
  if(isPortalUnlocked(id)) return showToast(`${portal.name} est déjà déverrouillé.`);
  if(!canAfford("premium", portal.novaCost)) return showToast("Pas assez de NOVA.");
  spend("premium", portal.novaCost);
  unlockPortal(id);
  showToast(`${portal.name} déverrouillé avec ${portal.novaCost.toLocaleString("fr-FR")} NOVA.`);
  renderAll();
}

function unlockSkill(id){
  const result = upgradeSkill(id);
  if(!result?.ok) return showToast(result?.reason || "Impossible d'améliorer cette compétence.");
  showToast(`${result.skill.name} niveau ${result.level} atteint.`);
  saveAndSyncProfile();
  renderAll();
}

document.addEventListener("click", (e)=>{
  const shipCard = e.target.closest("[data-ship-id]");
  if(shipCard){
    store.hangarTab = "vaisseau";
    store.state.selectedShip = shipCard.dataset.shipId;
    store.hangarDetailOpen = true;
    saveState();
    renderAll();
    return;
  }

  const hangarTab = e.target.closest("[data-hangar-tab]");
  if(hangarTab){
    store.hangarTab = hangarTab.dataset.hangarTab === "extra" ? "vaisseau" : hangarTab.dataset.hangarTab;
    if(store.hangarTab === "vaisseau" && store.state.selectedShip) store.hangarDetailOpen = true;
    saveState();
    renderAll();
    return;
  }

  const changeKeyBtn = e.target.closest("[data-change-slot-key]");
  if(changeKeyBtn){
    pendingKeybindSlot = Number(changeKeyBtn.dataset.changeSlotKey);
    showToast(`Appuie sur la nouvelle touche pour le slot ${pendingKeybindSlot + 1}.`);
    return;
  }

  const resetKeyBtn = e.target.closest("[data-reset-keybinds]");
  if(resetKeyBtn){
    store.state.slotKeybinds = [...DEFAULT_SLOT_KEYBINDS];
    pendingKeybindSlot = null;
    saveState();
    showToast("Touches des slots réinitialisées.");
    renderAll();
    return;
  }

  const profileTab = e.target.closest("[data-profile-tab]");
  if(profileTab){
    store.profileTab = profileTab.dataset.profileTab || "overview";
    renderAll();
    return;
  }

  const profileTitleBtn = e.target.closest("[data-profile-title]");
  if(profileTitleBtn){
    store.state.player.activeTitleId = profileTitleBtn.dataset.profileTitle || null;
    saveState();
    renderAll();
    return;
  }

  const profileTitleVisibilityBtn = e.target.closest("[data-profile-title-visibility]");
  if(profileTitleVisibilityBtn){
    store.state.player.titleVisible = store.state.player.titleVisible === false;
    saveState();
    renderAll();
    return;
  }

  const prestigeBtn = e.target.closest("[data-prestige]");
  if(prestigeBtn){
    const result = performPrestige();
    if(!result.ok) return showToast(result.reason);
    saveState();
    showToast(`Prestige ${result.prestige} actif : retour niveau 1, cap niveau 100 conserve.`);
    renderAll();
    return;
  }

  const graphicsQualityBtn = e.target.closest("[data-set-graphics-quality]");
  if(graphicsQualityBtn){
    const quality = setGraphicsQuality(graphicsQualityBtn.dataset.setGraphicsQuality);
    saveState();
    showToast(`Qualite graphique : ${quality}.`);
    renderAll();
    document.querySelectorAll("[data-set-graphics-quality]").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.setGraphicsQuality === quality);
    });
    return;
  }

  const resetSaveBtn = e.target.closest("[data-reset-save]");
  if(resetSaveBtn){
    const ok = window.confirm("Remettre VoidSector a zero  Toute la progression locale sera supprimee.");
    if(!ok) return;
    window.__voidsectorResetInProgress = true;
    sessionStorage.setItem("voidsector-reset-requested", "1");
    localStorage.removeItem("voidsector-prototype-state");
    window.location.reload();
    return;
  }

  const itemBtn = e.target.closest("[data-buy-item]");
  if(itemBtn){ buyItem(itemBtn.dataset.buyItem); return; }

  const ammoBtn = e.target.closest("[data-buy-ammo]");
  if(ammoBtn){ buyAmmo(ammoBtn.dataset.buyAmmo, ammoBtn.dataset.buyAmmoMultiplier); return; }

  const shopAmmoMultiplier = e.target.closest("[data-shop-ammo-multiplier]");
  if(shopAmmoMultiplier){
    store.selectedShopAmmoMultiplier = Number(shopAmmoMultiplier.dataset.shopAmmoMultiplier) || 1;
    renderShop();
    return;
  }

  const shipBuy = e.target.closest("[data-buy-shop-ship]");
  if(shipBuy){ buyShip(shipBuy.dataset.buyShopShip); return; }

  const droneBuy = e.target.closest("[data-buy-combat-drone]");
  if(droneBuy){ buyCombatDrone(); return; }

  const droneFormationBuy = e.target.closest("[data-buy-drone-formation]");
  if(droneFormationBuy){ buyDroneFormation(droneFormationBuy.dataset.buyDroneFormation); return; }

  const skillCard = e.target.closest("[data-unlock-skill]");
  if(skillCard){ unlockSkill(skillCard.dataset.unlockSkill); return; }

  const startRefineryBtn = e.target.closest("#refineryPanel [data-start-refinery]");
  if(startRefineryBtn){
    if(multiplayer.connected && startServerRefineryJob(startRefineryBtn.dataset.startRefinery)){
      showToast("Raffinage envoye au serveur.");
      return;
    }
    const result = startRefineryJob(startRefineryBtn.dataset.startRefinery);
    showToast(result.ok ? `${result.recipe.name} lancé.` : result.reason);
    saveState();
    renderRefinery();
    return;
  }

  const claimRefineryBtn = e.target.closest("#refineryPanel [data-claim-refinery]");
  if(claimRefineryBtn){
    if(multiplayer.connected && claimServerRefineryJob()){
      showToast("Recuperation envoyee au serveur.");
      return;
    }
    const result = claimRefineryJob();
    showToast(result.ok ? "Raffinage récupéré." : result.reason);
    saveState();
    renderRefinery();
    return;
  }

  const refineryTabBtn = e.target.closest(".refinery-panel [data-refinery-tab]");
  if(refineryTabBtn){
    store.selectedRefineryTab = ["forge", "shipment", "stats"].includes(refineryTabBtn.dataset.refineryTab) ? refineryTabBtn.dataset.refineryTab : "forge";
    store.selectedRefineryUpgrade = null;
    renderRefinery();
    return;
  }

  const shipmentPickBtn = e.target.closest("#refineryPanel [data-refinery-shipment-pick]");
  if(shipmentPickBtn){
    store.selectedRefineryShipmentMaterial = shipmentPickBtn.dataset.refineryShipmentPick;
    renderRefinery();
    return;
  }

  const toggleRefineryProductionBtn = e.target.closest("#refineryPanel [data-toggle-refinery-production]");
  if(toggleRefineryProductionBtn){
    if(multiplayer.connected && toggleServerRefineryProduction(toggleRefineryProductionBtn.dataset.toggleRefineryProduction)){
      showToast("Changement de production envoye au serveur.");
      return;
    }
    const enabled = toggleRefineryProduction(toggleRefineryProductionBtn.dataset.toggleRefineryProduction);
    showToast(`Production ${enabled ? "activee" : "coupee"}.`);
    saveState();
    renderAll();
    return;
  }

  const upgradeRefineryBtn = e.target.closest("#refineryPanel [data-upgrade-refinery]");
  if(upgradeRefineryBtn){
    store.selectedRefineryUpgrade = {type:"material", id:upgradeRefineryBtn.dataset.upgradeRefinery};
    renderRefinery();
    return;
  }

  const upgradeRefineryModuleBtn = e.target.closest("#refineryPanel [data-upgrade-refinery-module]");
  if(upgradeRefineryModuleBtn){
    store.selectedRefineryUpgrade = {type:"module", id:upgradeRefineryModuleBtn.dataset.upgradeRefineryModule};
    renderRefinery();
    return;
  }

  const closeRefineryUpgradeBtn = e.target.closest("#refineryPanel [data-close-refinery-upgrade]");
  if(closeRefineryUpgradeBtn){
    store.selectedRefineryUpgrade = null;
    renderRefinery();
    return;
  }

  const confirmMaterialUpgradeBtn = e.target.closest("#refineryPanel [data-confirm-refinery-upgrade]");
  if(confirmMaterialUpgradeBtn){
    if(multiplayer.connected && startServerRefineryUpgrade({type:"material", id:confirmMaterialUpgradeBtn.dataset.confirmRefineryUpgrade})){
      showToast("Amelioration envoyee au serveur.");
      store.selectedRefineryUpgrade = null;
      return;
    }
    const result = startRefineryMaterialUpgrade(confirmMaterialUpgradeBtn.dataset.confirmRefineryUpgrade);
    if(result.ok){
      if(multiplayer.connected){
        progressServerQuest({
          type:"refinery_material_upgrade_start",
          materialId:confirmMaterialUpgradeBtn.dataset.confirmRefineryUpgrade,
          targetLevel:result.level
        });
      }else{
        recordQuestRefineryMaterialUpgradeStart(confirmMaterialUpgradeBtn.dataset.confirmRefineryUpgrade, result.level);
      }
    }
    showToast(result.ok ? `${result.material.name} niveau ${result.level} en construction.` : result.reason);
    store.selectedRefineryUpgrade = result.ok ? null : store.selectedRefineryUpgrade;
    saveState();
    renderAll();
    return;
  }

  const confirmModuleUpgradeBtn = e.target.closest("#refineryPanel [data-confirm-refinery-module-upgrade]");
  if(confirmModuleUpgradeBtn){
    if(multiplayer.connected && startServerRefineryUpgrade({type:"module", id:confirmModuleUpgradeBtn.dataset.confirmRefineryModuleUpgrade})){
      showToast("Amelioration envoyee au serveur.");
      store.selectedRefineryUpgrade = null;
      return;
    }
    const result = startRefineryModuleUpgrade(confirmModuleUpgradeBtn.dataset.confirmRefineryModuleUpgrade);
    if(result.ok){
      if(multiplayer.connected){
        progressServerQuest({
          type:"refinery_module_upgrade_start",
          moduleId:confirmModuleUpgradeBtn.dataset.confirmRefineryModuleUpgrade,
          targetLevel:result.level
        });
      }else{
        recordQuestRefineryModuleUpgradeStart(confirmModuleUpgradeBtn.dataset.confirmRefineryModuleUpgrade, result.level);
      }
    }
    showToast(result.ok ? `${result.module} niveau ${result.level} en construction.` : result.reason);
    store.selectedRefineryUpgrade = result.ok ? null : store.selectedRefineryUpgrade;
    saveState();
    renderAll();
    return;
  }

  const rushRefineryUpgradeBtn = e.target.closest("#refineryPanel [data-rush-refinery-upgrade]");
  if(rushRefineryUpgradeBtn){
    if(multiplayer.connected && rushServerRefineryUpgrade({
      type:rushRefineryUpgradeBtn.dataset.rushRefineryType,
      id:rushRefineryUpgradeBtn.dataset.rushRefineryUpgrade
    })){
      showToast("Acceleration envoyee au serveur.");
      return;
    }
    const result = rushRefineryUpgrade(
      rushRefineryUpgradeBtn.dataset.rushRefineryType,
      rushRefineryUpgradeBtn.dataset.rushRefineryUpgrade
    );
    showToast(result.ok ? `${result.name} niveau ${result.level} termine pour ${result.cost} NOVA.` : result.reason);
    store.selectedRefineryUpgrade = result.ok ? null : store.selectedRefineryUpgrade;
    saveState();
    renderAll();
    return;
  }

  const startRefineryShipmentBtn = e.target.closest("#refineryPanel [data-start-refinery-shipment]");
  if(startRefineryShipmentBtn){
    if(multiplayer.connected && startServerRefineryShipment({
      materialId:store.selectedRefineryShipmentMaterial,
      amount:store.selectedRefineryShipmentAmount,
      shipId:store.state.activeShip
    })){
      showToast("Expedition envoyee au serveur.");
      return;
    }
    const result = startRefineryShipment(store.selectedRefineryShipmentMaterial, store.selectedRefineryShipmentAmount);
    showToast(result.ok ? `${result.amount} ${result.material.name} envoyes vers ${result.ship.name}.` : result.reason);
    saveState();
    renderAll();
    return;
  }

  const rushRefineryShipmentBtn = e.target.closest("#refineryPanel [data-rush-refinery-shipment]");
  if(rushRefineryShipmentBtn){
    if(multiplayer.connected && rushServerRefineryShipment()){
      showToast("Acceleration expedition envoyee au serveur.");
      return;
    }
    const result = rushRefineryShipment();
    showToast(result.ok ? `Expedition terminee pour ${result.cost} NOVA.` : result.reason);
    saveState();
    renderAll();
    return;
  }

  const nav = e.target.closest("[data-view]");
  if(nav){ setView(nav.dataset.view); return; }

  const portalUnlockPieces = e.target.closest("[data-unlock-portal-pieces]");
  if(portalUnlockPieces){ unlockPortalWithPieces(portalUnlockPieces.dataset.unlockPortalPieces); return; }

  const spaceCasterCount = e.target.closest("[data-space-caster-count]");
  if(spaceCasterCount){
    store.state.selectedPortalCasterId = spaceCasterCount.dataset.spaceCasterPortal;
    store.state.portalCasterPendingCount = [1, 10, 100].includes(Number(spaceCasterCount.dataset.spaceCasterCount)) ? Number(spaceCasterCount.dataset.spaceCasterCount) : 1;
    saveState();
    renderAll();
    return;
  }

  const spaceCasterPay = e.target.closest("[data-space-caster-pay]");
  if(spaceCasterPay){ runSpaceCaster(spaceCasterPay.dataset.spaceCasterPay, store.state.portalCasterPendingCount); return; }

  const portalCasterSelect = e.target.closest("[data-portal-caster-select]");
  if(portalCasterSelect && !e.target.closest("[data-start-portal]")){
    if(store.state.selectedPortalCasterId !== portalCasterSelect.dataset.portalCasterSelect) store.state.portalCasterResults = [];
    store.state.selectedPortalCasterId = portalCasterSelect.dataset.portalCasterSelect;
    store.state.portalCasterPendingCount = 1;
    saveState();
    renderAll();
    return;
  }

  const portalBtn = e.target.closest("[data-start-portal]");
  if(portalBtn){
    if(!store.state.activeShip) return showToast("Équipe un vaisseau avant d'entrer dans un portail.");
    if(multiplayer.connected && multiplayer.group){
      startServerPortal(portalBtn.dataset.startPortal);
      Game.start("open");
      return;
    }
    Game.start(`portal:${portalBtn.dataset.startPortal}`);
    return;
  }

  const shopFilterBtn = e.target.closest("[data-filter-shop]");
  if(shopFilterBtn){
    store.shopFilter = shopFilterBtn.dataset.filterShop;
    store.selectedShopProduct = null;
    store.selectedShopAmmoMultiplier = 1;
    renderShop();
    return;
  }

  const shopSelect = e.target.closest("[data-select-shop]");
  if(shopSelect){
    store.selectedShopProduct = shopSelect.dataset.selectShop;
    store.selectedShopAmmoMultiplier = 1;
    renderShop();
    return;
  }

  const inventoryCard = e.target.closest("[data-inventory-uid]");
  if(inventoryCard){
    const uid = inventoryCard.dataset.inventoryUid;
    store.selectedInventoryUid = uid;
    clearTimeout(inventoryClickTimer);
    if(e.detail > 1) return;
    inventoryClickTimer = setTimeout(()=>{
      renderAllPreserveInventoryScroll();
    }, 180);
    return;
  }

  const inventoryEquipBtn = e.target.closest("[data-inventory-equip]");
  if(inventoryEquipBtn){
    autoEquipInventoryItem(inventoryEquipBtn.dataset.inventoryEquip);
    return;
  }

  const inventoryUnequipBtn = e.target.closest("[data-inventory-unequip]");
  if(inventoryUnequipBtn){
    const uid = inventoryUnequipBtn.dataset.inventoryUnequip;
    if(multiplayer.connected && unequipServerInventoryItem(uid)){
      showToast("Retrait envoye au serveur.");
      return;
    }
    if(!unequipInventoryItem(uid)) return showToast("Objet déjà retiré.");
    showToast("Équipement retiré.");
    renderAllPreserveInventoryScroll();
    return;
  }

  const equip = e.target.closest("[data-equip-part]");
  if(equip){ equipPart(equip.dataset.equipPart, Number(equip.dataset.equipIndex), equip.dataset.equipItem); return; }

  const unequip = e.target.closest("[data-unequip-part]");
  if(unequip){ unequipPart(unequip.dataset.unequipPart, Number(unequip.dataset.unequipIndex)); return; }

});

document.addEventListener("dblclick", (e)=>{
  const equippedSlot = e.target.closest("[data-slot-uid][data-drop-part]");
  if(equippedSlot){
    clearTimeout(inventoryClickTimer);
    e.preventDefault();
    e.stopPropagation();
    unequipPart(equippedSlot.dataset.dropPart, Number(equippedSlot.dataset.dropIndex));
    return;
  }

  const inventoryCard = e.target.closest("[data-inventory-uid]");
  if(!inventoryCard) return;
  clearTimeout(inventoryClickTimer);
  store.selectedInventoryUid = inventoryCard.dataset.inventoryUid;
  autoEquipInventoryItem(inventoryCard.dataset.inventoryUid);
  store.selectedInventoryUid = null;
});

document.addEventListener("input", e=>{
  const amountInput = e.target.closest("#refineryPanel [data-refinery-shipment-amount]");
  if(!amountInput) return;
  store.selectedRefineryShipmentAmount = Math.max(1, Math.ceil(Number(amountInput.value || 1)));
});

document.addEventListener("change", e=>{
  const materialSelect = e.target.closest("#refineryPanel [data-refinery-shipment-material]");
  if(materialSelect){
    store.selectedRefineryShipmentMaterial = materialSelect.value;
    renderRefinery();
    return;
  }
  const amountInput = e.target.closest("#refineryPanel [data-refinery-shipment-amount]");
  if(amountInput){
    store.selectedRefineryShipmentAmount = Math.max(1, Math.ceil(Number(amountInput.value || 1)));
    renderRefinery();
  }
});

document.addEventListener("dragstart", (e)=>{
  const inventoryCard = e.target.closest("[data-inventory-uid]");
  const equippedSlot = e.target.closest("[data-slot-uid][data-drop-part]");
  const uid = inventoryCard?.dataset.inventoryUid || equippedSlot?.dataset.slotUid;
  if(!uid) return;
  e.dataTransfer.setData("text/plain", uid);
  e.dataTransfer.effectAllowed = "move";
});

document.addEventListener("dragover", (e)=>{
  if(e.target.closest("[data-drop-part]")) e.preventDefault();
});

document.addEventListener("drop", (e)=>{
  const slot = e.target.closest("[data-drop-part]");
  if(!slot) return;
  e.preventDefault();
  const uid = e.dataTransfer.getData("text/plain");
  equipPart(slot.dataset.dropPart, Number(slot.dataset.dropIndex), uid);
  store.selectedInventoryUid = null;
});

document.getElementById("selectedShipAction").addEventListener("click", equipSelectedShip);
document.getElementById("backToShipsBtn").addEventListener("click", ()=>{
  store.hangarDetailOpen = false;
  store.hangarTab = "vaisseau";
  renderAll();
});
document.getElementById("startGameBtn").addEventListener("click", ()=>{
  if(!store.state.activeShip) return showToast("Équipe un vaisseau avant de lancer la mission.");
  const playUrl = new URL(window.location.href);
  playUrl.searchParams.set("mode", "game");
  const gameWindow = window.open(playUrl.toString(), "voidsector-game");
  if(!gameWindow){
    showToast("Ouverture bloquee : autorise les popups ou utilise cet onglet.");
    Game.start();
    return;
  }
  gameWindow.focus?.();
  showToast("Session de jeu ouverte dans un nouvel onglet.");
});
document.getElementById("returnDashboardBtn").addEventListener("click", ()=>Game.requestLogout());
document.addEventListener("keydown", e=>{
  if(pendingKeybindSlot !== null){
    e.preventDefault();
    const code = eventToCode(e);
    if(code === "Escape"){
      pendingKeybindSlot = null;
      showToast("Modification de touche annulée.");
      return;
    }
    const next = normalizeSlotKeybinds(store.state.slotKeybinds);
    const duplicate = next.findIndex((value, index)=>value === code && index !== pendingKeybindSlot);
    if(duplicate >= 0){
      showToast(`La touche ${keyCodeToLabel(code)} est déjà utilisée par le slot ${duplicate + 1}.`);
      return;
    }
    next[pendingKeybindSlot] = code;
    store.state.slotKeybinds = normalizeSlotKeybinds(next);
    showToast(`Slot ${pendingKeybindSlot + 1} assigné à ${keyCodeToLabel(code)}.`);
    pendingKeybindSlot = null;
    saveState();
    renderAll();
    return;
  }
});

window.addEventListener("beforeunload", ()=>{
  try{ saveAndSyncProfile(); }catch(e){}
});

window.addEventListener("voidsector:profile-sync", event=>{
  applyServerProfile(event.detail?.profile);
});

window.addEventListener("voidsector:player-resume", event=>{
  if(appMode !== "game") return;
  pendingServerResume = event.detail?.session || null;
  if(Game.running && pendingServerResume && Game.resumeWorldSession(pendingServerResume)){
    pendingServerResume = null;
  }
});

window.addEventListener("voidsector:multiplayer-change", event=>{
  const reason = String(event.detail?.reason || "");
  if(reason === "shop:ammo-bought"){
    applyServerAmmoPurchases();
    return;
  }
  if(reason === "shop:item-bought"){
    applyServerItemPurchases();
    return;
  }
  if(reason === "shop:ship-bought"){
    applyServerShipPurchases();
    return;
  }
  if(reason === "ship:active-equipped"){
    const event = multiplayer.shipEvents?.shift();
    if(event?.shipId){
      store.state.activeShip = event.shipId;
      store.state.selectedShip = event.shipId;
      ensureShipLoadout(event.shipId);
      saveState();
      showToast(`Vaisseau equipe au spawn ${event.homeMap || "de firme"}.`);
      renderAll();
    }
    return;
  }
  if(reason === "shop:drone-bought"){
    applyServerDronePurchases();
    return;
  }
  if(reason === "shop:drone-formation-bought"){
    applyServerDroneFormationPurchases();
    return;
  }
  if(reason === "equipment:updated"){
    const event = multiplayer.equipmentEvents?.shift();
    if(event?.action === "drone-upgrade") showToast("Amelioration drone validee par le serveur.");
    else if(event?.action === "equipment-upgrade") showToast(`Amelioration equipement validee par le serveur : niveau ${event.level || "?"}.`);
    else showToast("Equipement valide par le serveur.");
    return;
  }
  if(reason === "refinery:updated"){
    applyServerRefineryEvents();
    return;
  }
  if(reason === "space-caster:result"){
    applyServerSpaceCasterEvents();
    return;
  }
  if(reason === "auth:success"){
    const account = event.detail?.payload?.account || multiplayer.auth.account;
    switchLocalProfileScope(accountProfileScope(account));
  }else if(reason === "auth:logout"){
    switchLocalProfileScope("guest");
  }
  if(!reason.startsWith("auth:") || store.currentView !== "hangar") return;
  renderTop();
  if(store.hangarTab === "profile") renderProfile();
});

setStateStorageScope(activeProfileScope);
if(sessionStorage.getItem("voidsector-reset-requested") === "1"){
  sessionStorage.removeItem("voidsector-reset-requested");
  localStorage.removeItem("voidsector-prototype-state");
  localStorage.removeItem("voidsector-prototype-state:" + activeProfileScope);
}
loadState();
initMultiplayer({
  showToast,
  getDefaultName:()=>store.state?.player?.name || "NOVA-37",
  clientMode:appMode
});
setView("hangar");
renderAll();
if(appMode === "game"){
  if(store.state.activeShip){
    Game.start();
    if(pendingServerResume && Game.resumeWorldSession(pendingServerResume)) pendingServerResume = null;
  }
  else showToast("Aucun vaisseau equipe. Retourne au launcher pour preparer ton depart.");
}
setInterval(()=>{
  const changed = tickRefineryProduction();
  const hasRefineryUpgrade = store.state?.refineryUpgradeJobs && Object.keys(store.state.refineryUpgradeJobs).length > 0;
  const hasRefineryShipment = !!store.state?.refineryShipmentJob;
  if(changed) saveAndSyncProfile();
  if(store.currentView === "refinery" && (changed || hasRefineryUpgrade || hasRefineryShipment)) renderRefinery();
}, 1000);
setInterval(()=>{
  syncMultiplayerProfile(store.state);
}, 5000);
showToast("Hangar vaisseaux / drones chargé.");
