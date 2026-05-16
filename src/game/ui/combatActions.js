import { renderActionBarHtml, updateActionBarDom } from "./actionBar.js";
import { renderQuickPanelContent, updateQuickPanelTabs } from "./quickPanel.js";
import { describeAmmo, getAmmoCooldown as readAmmoCooldown, setAmmoCooldown as writeAmmoCooldown } from "../systems/projectiles.js";

export function createCombatActions({
  ammoTypes,
  store,
  getAmmo,
  getAmmoCount,
  getItem,
  getEquippedExtras,
  getEquippedLauncher,
  canAfford,
  spend,
  addAmmo,
  saveState,
  setActionSlot,
  showToast,
  updateHud,
  getPlayer,
  getRepairState,
  activateRepairBot,
  getRepairBotDelay,
  getLaserVolley,
  fireManualRocket,
  fireManualMissile
}){
  let activeLaserSlot = null;
  let ammoCooldowns = {};
  let combatPanelTab = "ammo";
  let selectedMissileAmmoId = null;
  let missileLoaded = 0;
  let missileReload = 0;

  function reset(){
    activeLaserSlot = null;
    ammoCooldowns = {};
    combatPanelTab = "ammo";
    selectedMissileAmmoId = null;
    missileLoaded = 0;
    missileReload = 0;
  }

  function getActiveLaserSlot(){
    return activeLaserSlot;
  }

  function setActiveLaserSlot(value){
    activeLaserSlot = value;
  }

  function getCombatAmmo(index){
    return getAmmo(store.state.actionSlots?.[index]);
  }

  function getCombatExtra(index){
    const item = getItem(store.state.actionSlots?.[index]);
    if(!item || item.category !== "extra") return null;
    return getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id) ? item : null;
  }

  function getCombatCpu(index){
    const item = getItem(store.state.actionSlots?.[index]);
    if(item?.slotType !== "missileLauncher") return null;
    const launcher = getEquippedLauncher?.("missile");
    return launcher?.id === item.id ? item : null;
  }

  function getAmmoCooldown(ammoOrId){
    return readAmmoCooldown(ammoCooldowns, ammoOrId, getAmmo);
  }

  function setAmmoCooldown(ammo, seconds){
    writeAmmoCooldown(ammoCooldowns, ammo, seconds, getAmmoCooldown);
  }

  function tickAmmoCooldowns(dt){
    for(const id of Object.keys(ammoCooldowns || {})) ammoCooldowns[id] = Math.max(0, ammoCooldowns[id] - dt);
    tickMissileLauncher(dt);
  }

  function getMissileCapacity(){
    const launcher = getEquippedLauncher?.("missile");
    return Math.max(1, Number(launcher?.effect?.missileCapacity || 3));
  }

  function getMissileReloadTime(){
    const launcher = getEquippedLauncher?.("missile");
    return Math.max(.25, Number(launcher?.effect?.missileReload || 3));
  }

  function getSelectedMissileAmmo(){
    const ammo = getAmmo(selectedMissileAmmoId);
    return ammo?.weaponClass === "missile" ? ammo : null;
  }

  function tickMissileLauncher(dt){
    const launcher = getEquippedLauncher?.("missile");
    const ammo = getSelectedMissileAmmo();
    if(!launcher || !ammo){
      missileLoaded = 0;
      missileReload = 0;
      return;
    }
    const capacity = getMissileCapacity();
    const stock = getAmmoCount(ammo.id);
    if(stock <= missileLoaded || missileLoaded >= capacity){
      missileReload = 0;
      return;
    }
    missileReload += dt;
    const reloadTime = getMissileReloadTime();
    while(missileLoaded < capacity && stock > missileLoaded && missileReload >= reloadTime){
      missileLoaded += 1;
      missileReload -= reloadTime;
    }
  }

  function getMissileLauncherState(){
    const launcher = getEquippedLauncher?.("missile");
    const ammo = getSelectedMissileAmmo();
    const capacity = getMissileCapacity();
    const reloadTime = getMissileReloadTime();
    const stock = ammo ? getAmmoCount(ammo.id) : 0;
    const ready = !!launcher && !!ammo && missileLoaded >= capacity && stock >= capacity;
    const partial = missileLoaded >= capacity ? capacity : missileLoaded + Math.min(1, missileReload / reloadTime);
    return {
      launcher,
      ammo,
      stock,
      loaded:missileLoaded,
      capacity,
      progress:launcher && ammo ? partial / capacity * 100 : 0,
      ready
    };
  }

  function getEffectiveAmmoCooldown(ammo){
    const player = getPlayer();
    if(!ammo) return 1;
    if(ammo.weaponClass === "rocket"){
      const launcher = getEquippedLauncher?.("rocket");
      const cooldown = Number(launcher?.effect?.rocketCooldown || ammo.cooldown || 5);
      return Math.max(.5, cooldown * (player.extraBonus?.rocketCooldownMultiplier || 1));
    }
    if(ammo.weaponClass === "missile") return 1;
    return ammo.cooldown || 1;
  }

  function renderGameActionBar(){
    const el = document.getElementById("gameActionBar");
    const slots = Array.from({length:9}, (_,i)=>store.state.actionSlots?.[i] || null);
    el.innerHTML = renderActionBarHtml({slots, slotKeybinds:store.state.slotKeybinds, getAmmo, getExtra:getCombatExtra, getCpu:getCombatCpu, getAmmoCount, missileState:getMissileLauncherState()});
    updateGameActionBar();
  }

  function updateGameActionBar(){
    const player = getPlayer();
    updateActionBarDom({
      activeLaserSlot,
      repairBotActive:player.repairBotActive,
      missileState:getMissileLauncherState(),
      getAmmo:getCombatAmmo,
      getExtra:getCombatExtra,
      getCpu:getCombatCpu,
      getRepairState,
      getAmmoCooldown,
      getEffectiveAmmoCooldown,
      getAmmoCount
    });
  }

  function renderCombatQuickPanel(){
    const player = getPlayer();
    const quickPanel = document.getElementById("combatQuickPanel");
    const content = document.getElementById("combatPanelContent");
    if(!quickPanel || !content) return;
    updateQuickPanelTabs(quickPanel, combatPanelTab);
    content.innerHTML = renderQuickPanelContent({
      tab:combatPanelTab,
      ammoTypes,
      extras:getEquippedExtras(store.state.activeShip),
      repairState:getRepairState(),
      repairBotActive:player.repairBotActive,
      extraBonus:player.extraBonus,
      repairBotDelay:getRepairBotDelay(),
      canAfford,
      getAmmoCount,
      laserVolleyCount:getLaserVolley().count || 1,
      missileState:getMissileLauncherState()
    });
  }

  function selectActionSlot(index){
    const ammo = getCombatAmmo(index);
    const extra = getCombatExtra(index);
    const cpu = getCombatCpu(index);
    if(cpu){
      fireMissileLauncher();
      return;
    }
    if(extra){
      if(extra.effect.repairBot){
        activateRepairBot(true);
        renderCombatQuickPanel();
        updateHud();
        updateGameActionBar();
        return;
      }
      return showToast(`${extra.name} est un extra passif.`);
    }
    if(!ammo) return showToast(`Slot ${index+1} vide.`);
    if(getAmmoCount(ammo.id) <= 0) return showToast(`${ammo.name} : stock vide.`);
    if(ammo.weaponClass === "missile") return selectMissileAmmo(ammo.id);

    if(ammo.weaponClass === "rocket"){
      fireManualRocket(index, ammo);
      return;
    }

    if(activeLaserSlot === index){
      activeLaserSlot = null;
      showToast(`Laser desactive : slot ${index+1}.`);
      updateGameActionBar();
      return;
    }

    activeLaserSlot = index;
    showToast(`Laser actif : slot ${index+1} - ${describeAmmo(ammo)}.`);
    updateGameActionBar();
  }

  function buyCombatAmmo(id){
    const ammo = getAmmo(id);
    if(!ammo) return;
    if(!canAfford(ammo.priceType, ammo.price)) return showToast("Fonds insuffisants.");
    spend(ammo.priceType, ammo.price);
    addAmmo(ammo.id, ammo.amount);
    saveState();
    updateHud();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${ammo.name} achetee : +${ammo.amount}.`);
  }

  function assignAmmoToActionSlot(index, ammoId){
    const ammo = getAmmo(ammoId);
    if(!ammo) return;
    if(ammo.weaponClass === "missile") return selectMissileAmmo(ammo.id);
    setActionSlot(index, ammo.id);
    if(ammo.weaponClass === "rocket" && activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${ammo.name} placee en slot ${index+1}.`);
  }

  function selectMissileAmmo(ammoId){
    const ammo = getAmmo(ammoId);
    if(!ammo || ammo.weaponClass !== "missile") return;
    if(getAmmoCount(ammo.id) <= 0) return showToast(`${ammo.name} : stock vide.`);
    selectedMissileAmmoId = ammo.id;
    missileLoaded = 0;
    missileReload = 0;
    renderCombatQuickPanel();
    renderGameActionBar();
    showToast(`${ammo.name} charge dans le lance-missile.`);
  }

  function fireMissileLauncher(){
    const state = getMissileLauncherState();
    if(!state.launcher) return showToast("Aucun lance-missile equipe.");
    if(!state.ammo) return showToast("Selectionne un missile dans Munitions.");
    if(!state.ready) return showToast(`Lance-missile en charge : ${state.loaded}/${state.capacity}.`);
    const fired = fireManualMissile(state.ammo, state.capacity);
    if(fired){
      missileLoaded = 0;
      missileReload = 0;
      renderCombatQuickPanel();
      updateGameActionBar();
    }
  }

  function assignMissileLauncherToActionSlot(index){
    const launcher = getEquippedLauncher?.("missile");
    if(!launcher) return showToast("Aucun lance-missile equipe.");
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    const target = index >= 0 && index < 9 ? index : store.state.actionSlots.findIndex(id=>!id);
    const slotIndex = target >= 0 ? target : 0;
    store.state.actionSlots[slotIndex] = launcher.id;
    if(activeLaserSlot === slotIndex) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${launcher.name} place en slot ${slotIndex+1}.`);
  }

  function cleanCombatActionSlots(){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    const equippedExtraIds = new Set(getEquippedExtras(store.state.activeShip).map(item=>item.id));
    store.state.actionSlots = Array.from({length:9}, (_,index)=>{
      const id = store.state.actionSlots[index] || null;
      if(!id || getAmmo(id)) return id;
      const item = getItem(id);
      if(item?.slotType === "missileLauncher" && getEquippedLauncher?.("missile")?.id === item.id) return id;
      return item?.category === "extra" && equippedExtraIds.has(item.id) ? id : null;
    });
  }

  function moveActionSlot(fromIndex, toIndex){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    if(fromIndex < 0 || fromIndex >= 9 || toIndex < 0 || toIndex >= 9 || fromIndex === toIndex) return false;
    const fromValue = store.state.actionSlots[fromIndex] || null;
    if(!fromValue) return false;
    const toValue = store.state.actionSlots[toIndex] || null;
    store.state.actionSlots[toIndex] = fromValue;
    store.state.actionSlots[fromIndex] = toValue;
    if(activeLaserSlot === fromIndex) activeLaserSlot = toIndex;
    else if(activeLaserSlot === toIndex) activeLaserSlot = fromIndex;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`Slot ${fromIndex+1} deplace vers slot ${toIndex+1}.`);
    return true;
  }

  function clearActionSlot(index){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    if(index < 0 || index >= 9 || !store.state.actionSlots[index]) return false;
    store.state.actionSlots[index] = null;
    if(activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`Slot ${index+1} vide.`);
    return true;
  }

  function assignExtraToActionSlot(index, itemId){
    const item = getItem(itemId);
    if(!item || item.category !== "extra") return;
    if(!getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id)){
      return showToast(`${item.name} doit etre equipe dans les extras du vaisseau.`);
    }
    if(!item.effect.repairBot){
      return showToast(`${item.name} est un extra passif.`);
    }
    setActionSlot(index, item.id);
    if(activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${item.name} place en slot ${index+1}.`);
  }

  function refreshOpenQuickPanel(dt, refreshState){
    const quickPanel = document.getElementById("combatQuickPanel");
    if(quickPanel && !quickPanel.classList.contains("hidden")){
      refreshState.value -= dt;
      if(refreshState.value <= 0 && !quickPanel.matches(":hover")){
        renderCombatQuickPanel();
        refreshState.value = 1;
      }
    }
  }

  return {
    reset,
    getActiveLaserSlot,
    setActiveLaserSlot,
    getCombatAmmo,
    getCombatExtra,
    getCombatCpu,
    getAmmoCooldown,
    setAmmoCooldown,
    getEffectiveAmmoCooldown,
    tickAmmoCooldowns,
    renderGameActionBar,
    updateGameActionBar,
    renderCombatQuickPanel,
    selectActionSlot,
    buyCombatAmmo,
    assignAmmoToActionSlot,
    selectMissileAmmo,
    fireMissileLauncher,
    assignMissileLauncherToActionSlot,
    cleanCombatActionSlots,
    moveActionSlot,
    clearActionSlot,
    assignExtraToActionSlot,
    setCombatPanelTab:value=>{ combatPanelTab = value; },
    refreshOpenQuickPanel
  };
}
