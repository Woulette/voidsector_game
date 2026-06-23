import { captureProfileUiState, getProfileUiChanges, hasProfileUiChanges } from "./profileSyncChanges.js";
import { setPersonalPlayerBoosters } from "../core/firmBoosterStore.js";

export function createProfileController({
  store,
  game,
  appMode,
  profileScopeStorageKey,
  getXpNextForLevel,
  xpCurveVersion,
  ensureShipLoadout,
  setStateStorageScope,
  loadState,
  saveState,
  syncMultiplayerProfile,
  renderAll,
  renderTop = null,
  preserveScroll = callback=>callback(),
  showToast
}){
  let activeProfileScope = localStorage.getItem(profileScopeStorageKey) || "guest";
  const clone = value=>JSON.parse(JSON.stringify(value || {}));
  const normalizeActionSlots = slots=>Array.from({length:9}, (_,index)=>{
    const itemId = Array.isArray(slots) ? slots[index] : null;
    return typeof itemId === "string" && itemId.length > 0 ? itemId : null;
  });
  const isGameRunning = ()=>appMode === "game" && Boolean(game.running);
  const normalizeActionSlotsByShip = slotsByShip=>Object.fromEntries(Object.entries(slotsByShip || {}).map(([shipId, slots])=>[
    String(shipId),
    normalizeActionSlots(slots)
  ]));
  const getLocalActiveActionSlots = (shipId, profileHasSlotsByShip)=>{
    const slotsByShip = store.state.actionSlotsByShip;
    if(slotsByShip && typeof slotsByShip === "object" && Array.isArray(slotsByShip[shipId])){
      return normalizeActionSlots(slotsByShip[shipId]);
    }
    if(profileHasSlotsByShip) return normalizeActionSlots([]);
    return normalizeActionSlots(store.state.actionSlots);
  };

  function accountProfileScope(account){
    return account?.id ? `account:${account.id}` : "guest";
  }

  function switchLocalProfileScope(scope){
    const nextScope = String(scope || "guest");
    if(nextScope === activeProfileScope && store.state) return false;
    if(store.state) saveState();
    activeProfileScope = nextScope;
    localStorage.setItem(profileScopeStorageKey, activeProfileScope);
    setStateStorageScope(activeProfileScope);
    loadState();
    store.hangarDetailOpen = false;
    store.hangarTab = "vaisseau";
    store.currentView = "hangar";
    if(appMode === "game" && game.running) game.refreshActiveLoadout?.();
    renderAll();
    return true;
  }

  function saveAndSync(){
    store.state.mmoProfileUpdatedAt = Date.now();
    saveState();
    syncMultiplayerProfile(store.state);
  }

  function applyServerProfile(profile){
    if(!profile || typeof profile !== "object") return;
    const uiBefore = captureProfileUiState(store.state);
    const incomingVersion = Number(profile.updatedAt || 0);
    const localSelectedShip = store.state.selectedShip;
    const incomingOwnedShips = Array.isArray(profile.ownedShips) ? profile.ownedShips.map(String) : null;
    const keepLocalSelectedShip = store.currentView === "hangar"
      && store.hangarTab === "vaisseau"
      && store.hangarDetailOpen
      && typeof localSelectedShip === "string"
      && (incomingOwnedShips ? incomingOwnedShips.includes(localSelectedShip) : store.state.ownedShips.includes(localSelectedShip));
    if(profile.player) store.state.player = {...store.state.player, ...clone(profile.player)};
    if(profile.boosters && typeof profile.boosters === "object"){
      store.state.boosters = clone(profile.boosters);
      setPersonalPlayerBoosters(profile.boosters);
    }
    if(typeof profile.activeShip === "string") store.state.activeShip = profile.activeShip;
    if(typeof profile.selectedShip === "string") store.state.selectedShip = profile.selectedShip;
    if(Array.isArray(profile.ownedShips)){
      store.state.ownedShips = [...new Set(profile.ownedShips.map(String))];
      for(const shipId of store.state.ownedShips) ensureShipLoadout(shipId);
    }
    if(Array.isArray(profile.inventoryItems)) store.state.inventoryItems = clone(profile.inventoryItems);
    if(Number.isFinite(Number(profile.nextInventoryUid))) store.state.nextInventoryUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid)));
    if(profile.ammoInventory && typeof profile.ammoInventory === "object") store.state.ammoInventory = clone(profile.ammoInventory);
    const profileHasSlotsByShip = profile.actionSlotsByShip && typeof profile.actionSlotsByShip === "object";
    if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
    const activeShipId = String(store.state.activeShip || "orion");
    if(profileHasSlotsByShip){
      const incomingSlotsByShip = normalizeActionSlotsByShip(profile.actionSlotsByShip);
      if(isGameRunning()) incomingSlotsByShip[activeShipId] = getLocalActiveActionSlots(activeShipId, true);
      store.state.actionSlotsByShip = {
        ...store.state.actionSlotsByShip,
        ...incomingSlotsByShip
      };
    }
    if(Array.isArray(store.state.actionSlotsByShip?.[activeShipId])){
      store.state.actionSlots = normalizeActionSlots(store.state.actionSlotsByShip[activeShipId]);
    }else if(Array.isArray(profile.actionSlots)){
      store.state.actionSlots = isGameRunning()
        ? getLocalActiveActionSlots(activeShipId, false)
        : normalizeActionSlots(profile.actionSlots);
      if(isGameRunning()) store.state.actionSlotsByShip[activeShipId] = [...store.state.actionSlots];
    }
    if(Object.hasOwn(profile, "lastLaserAmmoId")) store.state.lastLaserAmmoId = typeof profile.lastLaserAmmoId === "string" ? profile.lastLaserAmmoId : null;
    if(profile.shipLoadouts && typeof profile.shipLoadouts === "object") store.state.shipLoadouts = clone(profile.shipLoadouts);
    if(Array.isArray(profile.unlockedPortals)) store.state.unlockedPortals = [...new Set(profile.unlockedPortals.map(String))];
    if(Object.hasOwn(profile, "prestigeCount")) store.state.prestigeCount = Math.max(0, Math.floor(Number(profile.prestigeCount || 0)));
    if(Number.isFinite(Number(profile.ownedDroneCount))) store.state.ownedDroneCount = Math.max(0, Math.floor(Number(profile.ownedDroneCount)));
    if(Array.isArray(profile.droneLoadout)) store.state.droneLoadout = clone(profile.droneLoadout);
    if(profile.dronePermanentUpgrades && typeof profile.dronePermanentUpgrades === "object") store.state.dronePermanentUpgrades = clone(profile.dronePermanentUpgrades);
    if(profile.equipmentUpgrades && typeof profile.equipmentUpgrades === "object") store.state.equipmentUpgrades = clone(profile.equipmentUpgrades);
    if(Array.isArray(profile.ownedDroneFormations)) store.state.ownedDroneFormations = [...new Set(profile.ownedDroneFormations.map(String))];
    if(Object.hasOwn(profile, "activeDroneFormation")) store.state.activeDroneFormation = typeof profile.activeDroneFormation === "string" ? profile.activeDroneFormation : "base";
    store.state.player.xpNext = getXpNextForLevel(store.state.player.level);
    store.state.player.xp = Math.min(Math.max(0, Number(store.state.player.xp || 0)), store.state.player.xpNext);
    store.state.xpCurveVersion = xpCurveVersion;
      for(const key of ["cargoHold","shipCargo","combatBoosts","shipAbilityStates","boosters","skillRanks","skillLevels","completedPortals","portalPieces","refineryLevels","refineryModules","refineryUpgradeJobs","refineryProductionDisabled","questProgress","questFailProgress","completedQuestClaims","killStats","rankKillStats","worldSession","shipWorldSessions","firmBoxes"]){
        if(profile[key] && typeof profile[key] === "object") store.state[key] = clone(profile[key]);
      }
    if(Number.isFinite(Number(profile.firmatons))) store.state.firmatons = Math.max(0, Math.floor(Number(profile.firmatons)));
    if(Array.isArray(profile.firmRewardHistory)) store.state.firmRewardHistory = clone(profile.firmRewardHistory).slice(-60);
    if(Array.isArray(profile.activeQuestIds)) store.state.activeQuestIds = profile.activeQuestIds.map(String).slice(0, 5);
    if(Object.hasOwn(profile, "activeQuestId")) store.state.activeQuestId = typeof profile.activeQuestId === "string" ? profile.activeQuestId : (store.state.activeQuestIds?.[0] || null);
    if(profile.tutorial && typeof profile.tutorial === "object") store.state.tutorial = clone(profile.tutorial);
    store.state.refineryShipmentJob = profile.refineryShipmentJob ? clone(profile.refineryShipmentJob) : null;
    store.state.refineryJob = profile.refineryJob ? clone(profile.refineryJob) : null;
    if(Number.isFinite(Number(profile.refineryLastTick))) store.state.refineryLastTick = Number(profile.refineryLastTick);
    if(keepLocalSelectedShip) store.state.selectedShip = localSelectedShip;
    store.state.mmoProfileUpdatedAt = incomingVersion || Date.now();
    const uiChanges = getProfileUiChanges(uiBefore, captureProfileUiState(store.state));
    const hasUiChanges = hasProfileUiChanges(uiChanges);
    saveState();
    if(appMode === "game" && game.running){
      if(uiChanges.loadoutChanged) preserveScroll(()=>game.refreshActiveLoadout?.());
      game.updateHud?.();
    }else{
      if(hasUiChanges) preserveScroll(()=>renderAll());
      else renderTop?.();
    }
    window.dispatchEvent(new CustomEvent("voidsector:profile-applied", {detail:{profile, uiChanges}}));
    if(appMode !== "game" && hasUiChanges) showToast("Profil MMO synchronise.");
  }

  function initializeScope(){
    setStateStorageScope(activeProfileScope);
    return activeProfileScope;
  }

  return {accountProfileScope, switchLocalProfileScope, saveAndSync, applyServerProfile, initializeScope, get activeProfileScope(){return activeProfileScope;}};
}
