import { ammoTypes, portals, questCatalog, rawMaterialCatalog } from "./data/catalog.js";
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
import { applyServerDroneUpgrade, buyServerAmmo, buyServerDrone, buyServerDroneFormation, buyServerItem, buyServerShip, claimServerRefineryJob, equipServerActiveShip, equipServerInventoryItem, multiplayer, performServerPrestige, progressServerQuest, runServerSpaceCaster, rushServerRefineryShipment, rushServerRefineryUpgrade, sellServerInventoryItem, startServerPortal, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, syncMultiplayerProfile, toggleServerRefineryProduction, unequipServerInventoryItem, unequipServerShip, unequipServerSlot, unlockServerPortal, upgradeServerSkill } from "./multiplayer/client.js";
import { initMultiplayer } from "./multiplayer/client.js";
import { renderAll, renderProfile, renderRefinery, renderShop, renderTop, setView } from "./ui/render.js";
import { showToast } from "./ui/toast.js";
import { DEFAULT_SLOT_KEYBINDS, eventToCode, keyCodeToLabel, normalizeSlotKeybinds } from "./core/keybinds.js";
import { createProfileController } from "./app/profileController.js";
import { createServerEventController } from "./app/serverEventController.js";
import { createShopActions } from "./app/shopActions.js";
import { createEquipmentActions } from "./app/equipmentActions.js";
import { createRefineryActions } from "./app/refineryActions.js";
import { createProgressionActions } from "./app/progressionActions.js";
import { createInventorySaleController } from "./app/inventorySaleController.js";
import { createUnequipAllController } from "./app/unequipAllController.js";

const Game = createCombatGame({renderAll, showToast});
let inventoryClickTimer = null;
let pendingKeybindSlot = null;
let pendingServerResume = null;
const urlParams = new URLSearchParams(window.location.search);
const appMode = urlParams.get("mode") === "game" ? "game" : "launcher";
const PROFILE_SCOPE_STORAGE_KEY = "voidsector-active-profile-scope";

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

const profileController = createProfileController({
  store,
  game:Game,
  appMode,
  profileScopeStorageKey:PROFILE_SCOPE_STORAGE_KEY,
  getXpNextForLevel,
  xpCurveVersion:XP_CURVE_VERSION,
  ensureShipLoadout,
  setStateStorageScope,
  loadState,
  saveState,
  syncMultiplayerProfile,
  renderAll,
  showToast
});
const saveAndSyncProfile = profileController.saveAndSync;
const applyServerProfile = profileController.applyServerProfile;
const switchLocalProfileScope = profileController.switchLocalProfileScope;
const accountProfileScope = profileController.accountProfileScope;

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

const {
  buyShip,
  buyItem,
  buyAmmo,
  buyCombatDrone,
  buyDroneFormation
} = createShopActions({
  multiplayer,
  store,
  ammoTypes,
  getShip,
  getItem,
  getDroneCatalog,
  getDroneFormation,
  getDroneLoadout,
  getDronePurchasePrice,
  getShipPurchaseLockReason,
  ensureShipLoadout,
  canAfford,
  spend,
  addInventoryItem,
  addAmmo,
  buyServerShip,
  buyServerItem,
  buyServerAmmo,
  buyServerDrone,
  buyServerDroneFormation,
  renderAll,
  showToast
});

const inventorySaleController = createInventorySaleController({
  multiplayer,
  getInventoryItem,
  getItem,
  findEquippedSlot,
  sellServerInventoryItem,
  showToast
});

const progressionActions = createProgressionActions({
  multiplayer, store, ammoTypes, getPortal, getPortalPieces, isPortalUnlocked, canAfford, spend, addPortalPiece, addAmmo, unlockPortal, upgradeSkill,
  runServerSpaceCaster, progressServerQuest, recordQuestSpaceCasterUse, unlockServerPortal, upgradeServerSkill, saveAndSyncProfile, saveState, renderAll, showToast
});
const {runSpaceCaster, unlockPortalWithPieces, unlockSkill} = progressionActions;

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

const {equipPart, autoEquipInventoryItem, unequipPart, unequipSelectedShipLoadout} = createEquipmentActions({
  multiplayer,
  store,
  getItemFromInventoryUid,
  getShip,
  getLoadout,
  getDroneLoadout,
  findEquippedSlot,
  unequipInventoryItem,
  isDronePermanentUpgradeItem,
  isDroneCompatibleEquipment,
  applyDronePermanentUpgrade,
  applyServerDroneUpgrade,
  equipServerInventoryItem,
  unequipServerSlot,
  unequipServerShip,
  saveState,
  renderAllPreserveInventoryScroll,
  showToast
});

const unequipAllController = createUnequipAllController({
  store,
  getShip,
  getLoadout,
  unequipSelectedShipLoadout,
  showToast
});

const refineryActions = createRefineryActions({
  multiplayer,
  store,
  startServerRefineryJob,
  claimServerRefineryJob,
  toggleServerRefineryProduction,
  startServerRefineryUpgrade,
  progressServerQuest,
  rushServerRefineryUpgrade,
  startServerRefineryShipment,
  rushServerRefineryShipment,
  startRefineryJob,
  claimRefineryJob,
  toggleRefineryProduction,
  startRefineryMaterialUpgrade,
  startRefineryModuleUpgrade,
  recordQuestRefineryMaterialUpgradeStart,
  recordQuestRefineryModuleUpgradeStart,
  rushRefineryUpgrade,
  startRefineryShipment,
  rushRefineryShipment,
  saveState,
  renderAll,
  renderRefinery,
  showToast
});

document.addEventListener("click", (e)=>{
  if(inventorySaleController.handleClick(e)) return;
  if(unequipAllController.handleClick(e)) return;

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
    if(multiplayer.connected && performServerPrestige()){
      showToast("Prestige envoye au serveur.");
      return;
    }
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

  if(refineryActions.handleClick(e)) return;

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

const serverEvents = createServerEventController({
  multiplayer,
  store,
  questCatalog,
  getItem,
  getShip,
  getDroneFormation,
  ensureShipLoadout,
  saveState,
  renderAll,
  renderTop,
  renderProfile,
  showToast,
  accountProfileScope,
  switchLocalProfileScope
});
window.addEventListener("voidsector:multiplayer-change", serverEvents.handleChange);

profileController.initializeScope();
if(sessionStorage.getItem("voidsector-reset-requested") === "1"){
  sessionStorage.removeItem("voidsector-reset-requested");
  localStorage.removeItem("voidsector-prototype-state");
  localStorage.removeItem("voidsector-prototype-state:" + profileController.activeProfileScope);
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
