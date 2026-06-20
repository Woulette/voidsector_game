import { ammoTypes, portals, rawMaterialCatalog } from "./data/catalog.js";
import {
  ensureShipLoadout,
  findEquippedSlot,
  getDroneCatalog,
  getDroneFormation,
  getDroneLoadout,
  getInventoryItem,
  getItem,
  getItemFromInventoryUid,
  getLoadout,
  getMaterialStorageCap,
  getPortal,
  getXpNextForLevel,
  getShipPurchaseLockReason,
  getShip,
  isDroneCompatibleEquipment,
  isDronePermanentUpgradeItem,
  isPortalUnlocked,
  loadState,
  saveState,
  setStateStorageScope,
  setGraphicsQuality,
  store,
  XP_CURVE_VERSION
} from "./core/store.js";
import { createCombatGame } from "./game/combat.js?v=quest-claim-ui-1";
import { applyServerDroneUpgrade, buyFirmShopItem, buyServerAmmo, buyServerDrone, buyServerDroneFormation, buyServerItem, buyServerPremiumPack, buyServerShip, claimFirmQuest, claimFirmRewards, claimServerPremiumReward, claimServerRefineryJob, equipServerActiveShip, equipServerInventoryItem, multiplayer, openFirmBox, performServerPrestige, progressServerQuest, requestFirmSync, requestLeaderboardSync, resetServerFirmDebug, runServerSpaceCaster, rushServerRefineryShipment, rushServerRefineryUpgrade, sellServerInventoryItem, setServerProfileTitle, setupServerProfile, startServerPortal, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, syncMultiplayerProfile, toggleServerRefineryProduction, unequipServerInventoryItem, unequipServerShip, unequipServerSlot, unlockServerPortal, upgradeServerSkill } from "./multiplayer/client.js";
import { connectMultiplayer, disconnectMultiplayer, getLatestAuthToken, initMultiplayer, loginAccount, reconnectWithStoredAuthSession, registerAccount, sendPlayerActivity, setAuthRememberEnabled } from "./multiplayer/client.js";
import { renderAll, renderFirm, renderLeaderboard, renderProfile, renderRefinery, renderShop, renderTop, setView } from "./ui/render.js";
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
import { createAuthGateController, isMmoAuthenticated } from "./app/authGate.js";
import { createGameConnectionRecoveryController } from "./app/gameConnectionRecovery.js";
import { requireMmoConnection, sendMmoCommand } from "./app/mmoGate.js";
import { handleAdminPanelChange, handleAdminPanelClick, handleAdminPanelInput, handleAdminPanelServerChange } from "./ui/adminPanel.js";

const Game = createCombatGame({renderAll, showToast});
let inventoryClickTimer = null;
let pendingKeybindSlot = null;
let pendingServerResume = null;
let gameStartConnectRequested = false;
let lastGameAuthNoticeAt = 0;
const urlParams = new URLSearchParams(window.location.search);
const appMode = urlParams.get("mode") === "game" ? "game" : "launcher";
const PROFILE_SCOPE_STORAGE_KEY = "voidsector-active-profile-scope";
const SCROLL_PRESERVE_SELECTORS = [
  ".rpg-inventory-grid",
  ".equipment-pool-grid",
  ".shop-grid-panel",
  ".leaderboard-table-wrap",
  ".leaderboard-full-table-wrap",
  ".leaderboard-full-window",
  ".rank-details-window",
  ".pilot-profile-window",
  ".firm-player-ranking-list",
  ".firm-main-ranking-list",
  ".firm-shop-stage-list",
  ".firm-quest-wide-list",
  ".portal-caster-results",
  ".combat-panel-grid",
  "#combatPanelContent",
  ".combat-firm-content",
  ".quest-strip-list",
  ".quest-detail-wrap",
  ".quest-info-grid",
  ".group-floating-content",
  ".sky-stats-table-wrap",
  ".refinery-stock-list",
  ".refinery-recipe-grid",
  ".refinery-stock-grid",
  ".admin-player-list",
  ".admin-detail-scroll",
  ".admin-inventory-grid",
  ".admin-inventory-selected"
];

function reportGameInputActivity(event){
  if(appMode !== "game" || !Game.running) return;
  sendPlayerActivity(event?.type || "input");
}

window.addEventListener("pointerdown", reportGameInputActivity, {passive:true});
window.addEventListener("keydown", reportGameInputActivity, {passive:true});
window.addEventListener("wheel", reportGameInputActivity, {passive:true});

function getScrollSnapshot(){
  return {
    windowX:window.scrollX,
    windowY:window.scrollY,
    entries:SCROLL_PRESERVE_SELECTORS.flatMap(selector=>
      Array.from(document.querySelectorAll(selector)).map((element, index)=>({
        selector,
        index,
        top:element.scrollTop,
        left:element.scrollLeft
      }))
    )
  };
}

function restoreScrollSnapshot(snapshot){
  const restore = ()=>{
    for(const entry of snapshot.entries || []){
      const element = document.querySelectorAll(entry.selector)[entry.index];
      if(!element) continue;
      const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
      const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      element.scrollTop = Math.min(entry.top, maxTop);
      element.scrollLeft = Math.min(entry.left, maxLeft);
    }
    window.scrollTo(snapshot.windowX, snapshot.windowY);
  };
  requestAnimationFrame(()=>{
    restore();
    requestAnimationFrame(restore);
  });
}

function preserveScroll(callback){
  const snapshot = getScrollSnapshot();
  try{
    return callback?.();
  }finally{
    restoreScrollSnapshot(snapshot);
  }
}

function renderAllPreserveScroll(){
  return preserveScroll(()=>renderAll());
}

const renderAllPreserveInventoryScroll = renderAllPreserveScroll;

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
  renderTop,
  preserveScroll,
  showToast
});
const saveAndSyncProfile = profileController.saveAndSync;
const applyServerProfile = profileController.applyServerProfile;
const switchLocalProfileScope = profileController.switchLocalProfileScope;
const accountProfileScope = profileController.accountProfileScope;

let authGate = null;
let gameRecovery = null;

function promptAuthGate(message = "Connecte ton compte AvosomaNox avant d'entrer en jeu."){
  if(appMode === "game"){
    if(multiplayer.auth?.token && (multiplayer.connecting || multiplayer.auth?.pending)) return;
    gameRecovery?.show?.("account");
    return;
  }
  authGate?.show?.();
  const now = Date.now();
  if(!lastGameAuthNoticeAt || now - lastGameAuthNoticeAt > 4000){
    showToast(message);
    lastGameAuthNoticeAt = now;
  }
}

function requireMmoAccountReady(message){
  if(isMmoAuthenticated(multiplayer)) return true;
  promptAuthGate(message);
  if(multiplayer.auth?.token && !multiplayer.connected && !multiplayer.connecting){
    connectMultiplayer({name:multiplayer.name});
  }
  return false;
}

function equipSelectedShip(){
  const ship = getShip(store.state.selectedShip);
  if(store.state.activeShip === ship.id) return showToast(`${ship.name} est deja le vaisseau equipe.`);
  sendMmoCommand({
    multiplayer,
    send:()=>equipServerActiveShip?.(ship.id),
    showToast,
    sentMessage:"Changement de vaisseau envoye au serveur.",
    failedMessage:"Changement de vaisseau impossible."
  });
}

const {
  buyShip,
  buyItem,
  buyAmmo,
  buyCombatDrone,
  buyDroneFormation,
  buyPremiumPack,
  claimPremiumReward
} = createShopActions({
  multiplayer,
  store,
  ammoTypes,
  getShip,
  getItem,
  getDroneCatalog,
  getDroneFormation,
  getShipPurchaseLockReason,
  buyServerShip,
  buyServerItem,
  buyServerAmmo,
  buyServerDrone,
  buyServerDroneFormation,
  buyServerPremiumPack,
  claimServerPremiumReward,
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
  multiplayer, store, getPortal, isPortalUnlocked,
  runServerSpaceCaster, unlockServerPortal, upgradeServerSkill, showToast
});
const {runSpaceCaster, unlockPortalWithPieces, unlockSkill} = progressionActions;

function applyDevProgressionBoost(){
  showToast("Mode test local desactive : utilise le panel admin serveur pour modifier un profil MMO.");
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
  isDronePermanentUpgradeItem,
  isDroneCompatibleEquipment,
  applyServerDroneUpgrade,
  equipServerInventoryItem,
  unequipServerSlot,
  unequipServerShip,
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
  renderAll,
  renderRefinery,
  showToast
});

document.addEventListener("click", (e)=>{
  if(handleAdminPanelClick(e, {showToast, renderAll:renderAllPreserveScroll})) return;

  const firmChoice = e.target.closest("[data-firm-choice]");
  if(firmChoice){
    store.pendingFirmName = document.getElementById("firmSetupName")?.value || store.pendingFirmName || "";
    store.pendingFirmId = firmChoice.dataset.firmChoice || "astra";
    renderAll();
    return;
  }
  const firmChoiceReset = e.target.closest("[data-firm-choice-reset]");
  if(firmChoiceReset){
    store.pendingFirmName = document.getElementById("firmSetupName")?.value || store.pendingFirmName || "";
    store.pendingFirmId = null;
    renderAll();
    return;
  }
  const firmSetupConfirm = e.target.closest("[data-firm-setup-confirm]");
  if(firmSetupConfirm){
    const name = document.getElementById("firmSetupName")?.value || store.state.player.name || multiplayer.auth?.account?.username || "NOVA-37";
    const firmId = store.pendingFirmId;
    if(!firmId) return showToast("Selectionne une firme avant de valider.");
    if(!multiplayer.connected) return showToast("Connexion serveur requise pour choisir la firme.");
    if(setupServerProfile({name, firmId})){
      showToast("Configuration du profil envoyee au serveur.");
      return;
    }
    showToast("Impossible d'envoyer le profil au serveur.");
    return;
  }

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
    sendMmoCommand({
      multiplayer,
      send:()=>setServerProfileTitle?.({titleId:profileTitleBtn.dataset.profileTitle || null}),
      showToast,
      sentMessage:"Changement de titre envoye au serveur.",
      failedMessage:"Changement de titre impossible."
    });
    return;
  }

  const profileTitleVisibilityBtn = e.target.closest("[data-profile-title-visibility]");
  if(profileTitleVisibilityBtn){
    sendMmoCommand({
      multiplayer,
      send:()=>setServerProfileTitle?.({visible:store.state.player.titleVisible === false}),
      showToast,
      sentMessage:"Visibilite du titre envoyee au serveur.",
      failedMessage:"Changement de visibilite impossible."
    });
    return;
  }

  const prestigeBtn = e.target.closest("[data-prestige]");
  if(prestigeBtn){
    sendMmoCommand({
      multiplayer,
      send:()=>performServerPrestige?.(),
      showToast,
      sentMessage:"Prestige envoye au serveur.",
      failedMessage:"Prestige impossible."
    });
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
    showToast("Reset local desactive en MMO-only. Utilise le panel admin serveur pour reinitialiser un profil.");
    return;
  }

  const storeModalClose = e.target.closest("[data-store-modal-close]");
  if(storeModalClose || e.target.matches?.("[data-store-modal-backdrop]")){
    store.storeModal = null;
    renderAll();
    return;
  }

  const storeTab = e.target.closest("[data-store-tab]");
  if(storeTab){
    store.storeTab = storeTab.dataset.storeTab || "premium";
    store.storeModal = null;
    renderAll();
    return;
  }

  const storeOffer = e.target.closest("[data-store-offer]");
  if(storeOffer && !e.target.closest("[data-buy-premium-pack], [data-claim-premium-reward]")){
    store.storeModal = {
      kind:storeOffer.dataset.storeOfferKind || "",
      id:storeOffer.dataset.storeOffer || ""
    };
    renderAll();
    return;
  }

  const premiumRewardBtn = e.target.closest("[data-claim-premium-reward]");
  if(premiumRewardBtn){ claimPremiumReward(); return; }

  const itemBtn = e.target.closest("[data-buy-item]");
  if(itemBtn){ buyItem(itemBtn.dataset.buyItem); return; }

  const premiumPackBtn = e.target.closest("[data-buy-premium-pack]");
  if(premiumPackBtn){ buyPremiumPack(premiumPackBtn.dataset.buyPremiumPack); return; }

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

  const firmMainTab = e.target.closest("[data-firm-main-tab]");
  if(firmMainTab){
    store.firmTab = firmMainTab.dataset.firmMainTab || "overview";
    if(store.firmTab === "shop") requestFirmSync({includeShop:true});
    renderFirm();
    return;
  }

  const firmRankingFilter = e.target.closest("[data-firm-ranking-filter]");
  if(firmRankingFilter){
    store.firmRankingFilter = firmRankingFilter.dataset.firmRankingFilter || "global";
    renderFirm();
    return;
  }

  const firmQuestTab = e.target.closest("[data-firm-quest-tab]");
  if(firmQuestTab){
    const tab = firmQuestTab.dataset.firmQuestTab;
    store.firmQuestTab = ["daily", "weekly", "seasonal"].includes(tab) ? tab : "daily";
    renderFirm();
    return;
  }

  const firmShopBuy = e.target.closest("[data-firm-shop-buy]");
  if(firmShopBuy){ buyFirmShopItem(firmShopBuy.dataset.firmShopBuy); return; }

  const firmBoxClose = e.target.closest("[data-firm-box-opening-close]");
  if(firmBoxClose){
    store.firmBoxOpening = null;
    renderFirm();
    return;
  }

  const firmShopFilter = e.target.closest("[data-firm-shop-filter]");
  if(firmShopFilter){
    store.firmShopFilter = firmShopFilter.dataset.firmShopFilter || "global";
    renderFirm();
    return;
  }

  const firmBoxOpen = e.target.closest("[data-firm-box-open]");
  if(firmBoxOpen){ openFirmBox(firmBoxOpen.dataset.firmBoxOpen); return; }

  const firmRewardClaim = e.target.closest("[data-firm-reward-claim]");
  if(firmRewardClaim){ claimFirmRewards(); return; }

  const firmQuestClaim = e.target.closest("[data-firm-quest-claim]");
  if(firmQuestClaim){ claimFirmQuest(firmQuestClaim.dataset.firmQuestClaim); return; }

  const inventoryFilter = e.target.closest("[data-inventory-filter]");
  if(inventoryFilter){
    const filter = inventoryFilter.dataset.inventoryFilter || "all";
    store.inventoryFilter = ["all", "equipment", "resources"].includes(filter) ? filter : "all";
    store.selectedInventoryUid = null;
    store.selectedInventoryResourceId = null;
    renderAllPreserveInventoryScroll();
    return;
  }

  const nav = e.target.closest("[data-view]");
  if(nav){
    setView(nav.dataset.view);
    if(nav.dataset.view === "firm") requestFirmSync({includeShop:true});
    if(nav.dataset.view === "leaderboard") requestLeaderboardSync();
    return;
  }

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
    if(!requireMmoConnection(multiplayer, showToast)) return;
    if(startServerPortal(portalBtn.dataset.startPortal)){
      Game.start("open");
      return;
    }
    showToast("Activation du portail serveur impossible.");
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
    store.selectedInventoryResourceId = null;
    clearTimeout(inventoryClickTimer);
    if(e.detail > 1) return;
    inventoryClickTimer = setTimeout(()=>{
      renderAllPreserveInventoryScroll();
    }, 180);
    return;
  }

  const inventoryResourceCard = e.target.closest("[data-inventory-resource-id]");
  if(inventoryResourceCard){
    store.selectedInventoryUid = null;
    store.selectedInventoryResourceId = inventoryResourceCard.dataset.inventoryResourceId;
    renderAllPreserveInventoryScroll();
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
    if(!requireMmoConnection(multiplayer, showToast)) return;
    if(unequipServerInventoryItem(uid)){
      showToast("Retrait envoye au serveur.");
      return;
    }
    showToast("Retrait serveur impossible.");
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
  store.selectedInventoryResourceId = null;
  autoEquipInventoryItem(inventoryCard.dataset.inventoryUid);
  store.selectedInventoryUid = null;
});

document.addEventListener("input", e=>{
  if(handleAdminPanelInput(e, {renderAll:renderAllPreserveScroll})) return;

  const firmNameInput = e.target.closest("[data-firm-setup-name]");
  if(firmNameInput){
    store.pendingFirmName = firmNameInput.value;
    return;
  }
  const amountInput = e.target.closest("#refineryPanel [data-refinery-shipment-amount]");
  if(!amountInput) return;
  store.selectedRefineryShipmentAmount = Math.max(1, Math.ceil(Number(amountInput.value || 1)));
});

document.addEventListener("change", e=>{
  if(handleAdminPanelChange(e, {renderAll:renderAllPreserveScroll})) return;

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
  store.selectedInventoryResourceId = null;
});

document.getElementById("selectedShipAction").addEventListener("click", equipSelectedShip);
document.getElementById("backToShipsBtn").addEventListener("click", ()=>{
  store.hangarDetailOpen = false;
  store.hangarTab = "vaisseau";
  renderAll();
});
document.getElementById("startGameBtn").addEventListener("click", ()=>{
  if(!requireMmoAccountReady()) return;
  if(!store.state.activeShip) return showToast("Équipe un vaisseau avant de lancer la mission.");
  if(multiplayer.auth?.account && store.state.player?.firmSelected !== true){
    showToast("Choisis ton nom de joueur et ta firme avant d'entrer en jeu.");
    store.hangarTab = "profile";
    renderAll();
    return;
  }
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
  const beforeFirmSelected = store.state?.player?.firmSelected;
  const beforeFirmId = store.state?.player?.firmId;
  applyServerProfile(event.detail?.profile);
  const player = event.detail?.profile?.player || null;
  const firmSetupChanged = player && (
    (Object.hasOwn(player, "firmSelected") && beforeFirmSelected !== store.state?.player?.firmSelected)
    || (Object.hasOwn(player, "firmId") && beforeFirmId !== store.state?.player?.firmId)
  );
  if(appMode === "game" && firmSetupChanged) renderAllPreserveScroll();
  if(appMode === "game") window.setTimeout(startGameWhenMmoReady, 0);
  gameRecovery?.handleProfileSync();
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
  getItem,
  getShip,
  getDroneFormation,
  renderAll:renderAllPreserveScroll,
  renderTop,
  renderProfile,
  showToast,
  accountProfileScope,
  switchLocalProfileScope,
  appMode,
  isGameRunning:()=>Game.running
});
window.addEventListener("voidsector:multiplayer-change", serverEvents.handleChange);
window.addEventListener("voidsector:multiplayer-change", event=>{
  const reason = String(event.detail?.reason || "");
  gameRecovery?.handleChange(event);
  if(handleAdminPanelServerChange(reason) || reason === "auth:success" || reason === "auth:role" || reason === "auth:logout") renderAllPreserveScroll();
  if(reason === "firm:updated" && event.detail?.payload?.action === "box-open"){
    store.firmBoxOpening = {...event.detail.payload, revealId:`box_${Date.now()}`};
  }
  if(store.currentView === "firm" && reason.startsWith("firm:")) renderFirm();
  if(store.currentView === "leaderboard" && reason === "leaderboard:ranking"){
    preserveScroll(()=>renderLeaderboard());
  }
});

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
authGate = createAuthGateController({
  multiplayer,
  loginAccount,
  registerAccount,
  setAuthRememberEnabled,
  connectMultiplayer,
  showToast,
  appMode
});
gameRecovery = createGameConnectionRecoveryController({
  appMode,
  multiplayer,
  isGameRunning:()=>Game.running,
  suspendGame:()=>{
    if(Game.running) Game.stop(false);
  },
  resumeGame:()=>startGameWhenMmoReady(),
  reconnect:()=>reconnectWithStoredAuthSession(),
  getAuthToken:()=>getLatestAuthToken(),
  disconnect:intent=>disconnectMultiplayer(intent)
});
if(appMode === "game" && !multiplayer.auth?.token && !isMmoAuthenticated(multiplayer)){
  gameRecovery.show("account");
}
window.voidResetFirm = ()=>{
  if(!multiplayer.auth?.account) return "Connecte un compte avant d'utiliser cette commande.";
  if(!multiplayer.connected) return "Serveur multijoueur deconnecte.";
  if(!resetServerFirmDebug()) return "Impossible d'envoyer la commande au serveur.";
  return "Reinitialisation du choix de firme envoyee. Attends la synchronisation du profil.";
};
window.voidResetFirme = window.voidResetFirm;
setView("hangar");
renderAll();
function startGameWhenMmoReady(){
  if(appMode !== "game" || Game.running) return;
  if(!isMmoAuthenticated(multiplayer)){
    if(multiplayer.auth?.token && !multiplayer.connected && !multiplayer.connecting && !gameStartConnectRequested){
      gameStartConnectRequested = true;
      connectMultiplayer({name:multiplayer.name});
    }
    promptAuthGate("Connecte ton compte AvosomaNox pour lancer la session.");
    return;
  }
  if(store.state.player?.firmSelected !== true){
    store.hangarTab = "profile";
    setView("hangar");
    renderAll();
    showToast("Choisis ton nom de joueur et ta firme avant d'entrer en jeu.");
    return;
  }
  if(!store.state.activeShip){
    showToast("Aucun vaisseau equipe. Retourne au launcher pour preparer ton depart.");
    return;
  }
  Game.start();
  if(pendingServerResume && Game.resumeWorldSession(pendingServerResume)) pendingServerResume = null;
}
if(appMode === "game"){
  const handleGameConnection = ()=>{
    if(Game.running){
      window.removeEventListener("voidsector:multiplayer-change", handleGameConnection);
      return;
    }
    startGameWhenMmoReady();
    if(Game.running) window.removeEventListener("voidsector:multiplayer-change", handleGameConnection);
  };
  window.addEventListener("voidsector:multiplayer-change", handleGameConnection);
  startGameWhenMmoReady();
}
setInterval(()=>{
  const changed = false;
  const hasRefineryUpgrade = store.state?.refineryUpgradeJobs && Object.keys(store.state.refineryUpgradeJobs).length > 0;
  const hasRefineryShipment = !!store.state?.refineryShipmentJob;
  if(changed) saveAndSyncProfile();
  if(store.currentView === "refinery" && (changed || hasRefineryUpgrade || hasRefineryShipment)) renderRefinery();
}, 1000);
setInterval(()=>{
  syncMultiplayerProfile(store.state);
}, 5000);
showToast("Hangar vaisseaux / drones chargé.");
