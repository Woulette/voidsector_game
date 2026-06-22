import { renderActionBarHtml, updateActionBarDom } from "./actionBar.js";
import { renderShipAbilityBarHtml } from "./shipAbilityBar.js";
import { renderQuickPanelContent, updateQuickPanelTabs } from "./quickPanel.js";
import { describeAmmo, getAmmoCooldown as readAmmoCooldown, setAmmoCooldown as writeAmmoCooldown } from "../systems/projectiles.js";
import { requireMmoConnection } from "../../app/mmoGate.js";

export function createCombatActions({
  ammoTypes,
  droneFormations,
  store,
  getAmmo,
  getAmmoCount,
  getItem,
  getDroneFormation,
  getEquippedExtras,
  getEquippedLauncher,
  multiplayer,
  buyServerAmmo,
  buyServerDroneFormation,
  canAfford,
  saveState,
  syncProfile,
  refreshPlayerStats,
  setActionSlot,
  showToast,
  updateHud,
  getPlayer,
  getRepairState,
  activateRepairBot,
  getRepairBotDelay,
  getLaserVolley,
  fireManualRocket,
  fireManualMissile,
  openPortgunMap,
  getRickySupportState,
  activateRickyHealBeacon,
  getShipAbilityStates,
  activateShipAbility
}){
  let activeLaserSlot = null;
  let selectedRocketAmmoId = null;
  let ammoCooldowns = {};
  let combatPanelTab = "ammo";
  let combatPanelTabOffset = 0;
  let selectedMissileAmmoId = null;
  let missileLoaded = 0;
  let missileReload = 0;
  let lastRenderedCombatPanelTab = null;

  function reset(){
    activeLaserSlot = null;
    selectedRocketAmmoId = null;
    ammoCooldowns = {};
    combatPanelTab = "ammo";
    combatPanelTabOffset = 0;
    selectedMissileAmmoId = null;
    missileLoaded = 0;
    missileReload = 0;
    lastRenderedCombatPanelTab = null;
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

  function isLaserAmmo(ammo){
    return ammo?.weaponClass === "laser";
  }

  function rememberLaserAmmo(ammo){
    if(!isLaserAmmo(ammo)) return;
    if(store.state.lastLaserAmmoId === ammo.id) return;
    store.state.lastLaserAmmoId = ammo.id;
    saveAndSyncActionSlots();
  }

  function getLaserSlotForAttack(){
    const activeAmmo = getCombatAmmo(activeLaserSlot);
    if(isLaserAmmo(activeAmmo)) return activeLaserSlot;

    const remembered = getAmmo(store.state.lastLaserAmmoId);
    if(isLaserAmmo(remembered)){
      const rememberedSlot = (store.state.actionSlots || []).findIndex(id=>id === remembered.id);
      if(rememberedSlot >= 0) return rememberedSlot;
    }

    const fallbackSlot = (store.state.actionSlots || []).findIndex(id=>{
      const ammo = getAmmo(id);
      return isLaserAmmo(ammo) && getAmmoCount(ammo.id) > 0;
    });
    return fallbackSlot >= 0 ? fallbackSlot : null;
  }

  function getSelectedRocketAmmo(){
    const ammo = getAmmo(selectedRocketAmmoId);
    return ammo?.weaponClass === "rocket" ? ammo : null;
  }

  function getCombatExtra(index){
    const item = getItem(store.state.actionSlots?.[index]);
    if(!item || item.category !== "extra") return null;
    return getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id) ? item : null;
  }

  function getInventoryItemCount(itemId){
    return (store.state.inventoryItems || []).reduce((total, entry)=>{
      if(entry?.itemId !== itemId) return total;
      return total + Math.max(1, Math.floor(Number(entry.quantity || 1)));
    }, 0);
  }

  function getCombatCpu(index){
    const item = getItem(store.state.actionSlots?.[index]);
    if(item?.slotType !== "missileLauncher") return null;
    const launcher = getEquippedLauncher?.("missile");
    return launcher?.id === item.id ? item : null;
  }

  function getCombatDroneFormation(index){
    const formation = getDroneFormation?.(store.state.actionSlots?.[index]);
    if(!formation) return null;
    return store.state.ownedDroneFormations?.includes(formation.id) ? formation : null;
  }

  function getActionSlotState(index){
    const id = store.state.actionSlots?.[index] || null;
    if(!id) return {id:null, kind:"empty", available:false, usable:false, reason:`Slot ${index + 1} vide.`};

    const ammo = getAmmo(id);
    if(ammo){
      const count = getAmmoCount(ammo.id);
      if(count <= 0) return {id, kind:"ammo", ammo, available:true, usable:false, reason:`${ammo.name} : stock vide.`};
      if(ammo.weaponClass === "rocket" && !getEquippedLauncher?.("rocket")){
        return {id, kind:"ammo", ammo, available:false, usable:false, reason:"Aucun lance-roquette equipe sur ce vaisseau."};
      }
      if(ammo.weaponClass === "missile" && !getEquippedLauncher?.("missile")){
        return {id, kind:"ammo", ammo, available:false, usable:false, reason:"Aucun lance-missile equipe sur ce vaisseau."};
      }
      if(ammo.weaponClass === "laser" && getLaserVolley().count <= 0){
        return {id, kind:"ammo", ammo, available:false, usable:false, reason:"Aucun laser equipe sur ce vaisseau."};
      }
      return {id, kind:"ammo", ammo, available:true, usable:true, reason:""};
    }

    const item = getItem(id);
    if(item?.category === "extra"){
      const equipped = getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id);
      if(!equipped){
        return {id, kind:"extra", item, available:false, usable:false, reason:`${item.name} sauvegarde en slot, mais non equipe sur ce vaisseau.`};
      }
      if(item.effect?.repairBot){
        const repairState = getRepairState();
        const active = Boolean(getPlayer()?.repairBotActive);
        return {
          id,
          kind:"extra",
          item,
          available:true,
          usable:Boolean(repairState.ok || active),
          reason:repairState.ok || active ? "" : repairState.reason
        };
      }
      if(item.effect?.portgun){
        const fluidId = item.effect.teleportFluidItemId || "teleportation_fluid";
        const fluidCount = getInventoryItemCount(fluidId);
        const connected = Boolean(multiplayer?.connected && multiplayer?.socket);
        return {
          id,
          kind:"extra",
          item,
          available:true,
          usable:connected && fluidCount > 0,
          chargeCount:fluidCount,
          reason:!connected ? "Connexion serveur requise pour le Portgun." : fluidCount > 0 ? "" : "Il faut 1 fluide de teleportation."
        };
      }
      return {id, kind:"extra", item, available:true, usable:false, reason:`${item.name} est un extra passif.`};
    }

    if(item?.slotType === "missileLauncher"){
      const equipped = getEquippedLauncher?.("missile")?.id === item.id;
      if(!equipped){
        return {id, kind:"missileLauncher", item, available:false, usable:false, reason:`${item.name} sauvegarde en slot, mais non equipe sur ce vaisseau.`};
      }
      const missileState = getMissileLauncherState();
      if(!missileState.ammo) return {id, kind:"missileLauncher", item, available:true, usable:false, reason:"Selectionne un missile dans Munitions."};
      if(!missileState.ready) return {id, kind:"missileLauncher", item, available:true, usable:false, reason:`Lance-missile en charge : ${missileState.loaded}/${missileState.capacity}.`};
      return {id, kind:"missileLauncher", item, available:true, usable:true, reason:""};
    }

    if(item?.slotType === "rocketLauncher"){
      const equipped = getEquippedLauncher?.("rocket")?.id === item.id;
      if(!equipped){
        return {id, kind:"rocketLauncher", item, available:false, usable:false, reason:`${item.name} sauvegarde en slot, mais non equipe sur ce vaisseau.`};
      }
      return {id, kind:"rocketLauncher", item, available:true, usable:false, reason:"Utilise une munition roquette en slot pour tirer avec ce lanceur."};
    }

    const formation = getDroneFormation?.(id);
    if(formation){
      const owned = store.state.ownedDroneFormations?.includes(formation.id);
      return {
        id,
        kind:"formation",
        formation,
        available:Boolean(owned),
        usable:Boolean(owned),
        reason:owned ? "" : `${formation.name} sauvegardee en slot, mais non possedee.`
      };
    }

    return {id, kind:"invalid", available:false, usable:false, reason:"Objet de slot invalide."};
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
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    const slots = Array.from({length:9}, (_,i)=>store.state.actionSlots?.[i] || null);
    el.innerHTML = renderActionBarHtml({slots, slotKeybinds:store.state.slotKeybinds, getAmmo, getExtra:getCombatExtra, getCpu:getCombatCpu, getFormation:getCombatDroneFormation, getAmmoCount, missileState:getMissileLauncherState(), getSlotState:getActionSlotState});
    renderShipAbilityBar();
    updateGameActionBar();
  }

  function updateRickySupportSkill(){
    const button = document.getElementById("rickySupportSkill");
    if(!button) return;
    const support = getRickySupportState?.() || {};
    const available = Boolean(support.available);
    const cooldown = Math.max(0, Number(support.cooldown || 0));
    button.classList.toggle("hidden", !available);
    button.classList.toggle("ready", available && cooldown <= 0);
    button.classList.toggle("blocked", available && cooldown > 0);
    button.disabled = !available || cooldown > 0;
    button.title = cooldown > 0
      ? `Balise de soin de Ricky en recharge : ${Math.ceil(cooldown)}s`
      : "Déployer la balise de soin de Ricky";
    const cooldownLabel = button.querySelector(".ricky-support-skill-cooldown");
    if(cooldownLabel) cooldownLabel.textContent = cooldown > 0 ? String(Math.ceil(cooldown)) : "";
  }

  function renderShipAbilityBar(){
    const bar = document.getElementById("shipAbilityBar");
    if(!bar) return;
    const states = (getShipAbilityStates?.() || []).slice(0, 3);
    const signature = JSON.stringify([
      ...states.map(state=>[state.abilityId, state.icon, state.shortName]),
      ...(store.state.abilityKeybinds || [])
    ]);
    if(bar.dataset.signature !== signature){
      bar.innerHTML = renderShipAbilityBarHtml({states, abilityKeybinds:store.state.abilityKeybinds});
      bar.dataset.signature = signature;
    }
    bar.classList.toggle("hidden", states.length === 0);
  }

  function updateShipAbilitySkills(){
    const bar = document.getElementById("shipAbilityBar");
    if(!bar) return;
    renderShipAbilityBar();
    const states = (getShipAbilityStates?.() || []).slice(0, 3);
    states.forEach((state, index)=>{
      const button = bar.querySelector(`[data-ship-ability-index="${index}"]`);
      if(!button) return;
      const activeRemainingMs = Math.max(0, Number(state.activeRemainingMs || 0));
      const cooldownRemainingMs = Math.max(0, Number(state.cooldownRemainingMs || 0));
      const active = activeRemainingMs > 0;
      const blocked = !active && cooldownRemainingMs > 0;
      button.classList.toggle("ready", !active && !blocked);
      button.classList.toggle("active", active);
      button.classList.toggle("blocked", blocked);
      button.disabled = active || blocked;
      button.title = active
        ? `${state.name || "Compétence"} active : ${Math.ceil(activeRemainingMs / 1000)} s`
        : blocked
          ? `${state.name || "Compétence"} en recharge : ${Math.ceil(cooldownRemainingMs / 1000)} s`
          : state.description || state.name || "Compétence de vaisseau";
      const label = button.querySelector(".ship-ability-slot-cooldown");
      if(label){
        label.textContent = active
          ? `${Math.ceil(activeRemainingMs / 1000)}s`
          : blocked
            ? String(Math.ceil(cooldownRemainingMs / 1000))
            : "";
      }
    });
  }

  function updateGameActionBar(){
    const player = getPlayer();
    updateActionBarDom({
      activeLaserSlot,
      selectedRocketAmmo:player.extraBonus?.autoRocket ? getSelectedRocketAmmo() : null,
      repairBotActive:player.repairBotActive,
      missileState:getMissileLauncherState(),
      getAmmo:getCombatAmmo,
      getExtra:getCombatExtra,
      getCpu:getCombatCpu,
      getFormation:getCombatDroneFormation,
      getSlotState:getActionSlotState,
      activeDroneFormation:store.state.activeDroneFormation,
      getRepairState,
      getAmmoCooldown,
      getEffectiveAmmoCooldown,
      getAmmoCount
    });
    updateRickySupportSkill();
    updateShipAbilitySkills();
  }

  function renderCombatQuickPanel(){
    const player = getPlayer();
    const quickPanel = document.getElementById("combatQuickPanel");
    const content = document.getElementById("combatPanelContent");
    if(!quickPanel || !content) return;
    const previousGrid = lastRenderedCombatPanelTab === combatPanelTab ? content.querySelector(".combat-panel-grid") : null;
    const previousScrollTop = previousGrid ? previousGrid.scrollTop : null;
    const previousScrollLeft = previousGrid ? previousGrid.scrollLeft : null;
    updateQuickPanelTabs(quickPanel, combatPanelTab, combatPanelTabOffset);
    content.innerHTML = renderQuickPanelContent({
      tab:combatPanelTab,
      ammoTypes,
      droneFormations,
      ownedDroneFormations:store.state.ownedDroneFormations || [],
      activeDroneFormation:store.state.activeDroneFormation,
      extras:getEquippedExtras(store.state.activeShip),
      repairState:getRepairState(),
      repairBotActive:player.repairBotActive,
      extraBonus:player.extraBonus,
      repairBotDelay:getRepairBotDelay(),
      canAfford,
      getAmmoCount,
      laserVolleyCount:getLaserVolley().count || 1,
      missileState:getMissileLauncherState(),
      shipAbilityStates:getShipAbilityStates?.() || []
    });
    lastRenderedCombatPanelTab = combatPanelTab;
    if(previousScrollTop !== null){
      const nextGrid = content.querySelector(".combat-panel-grid");
      if(nextGrid){
        const maxTop = Math.max(0, nextGrid.scrollHeight - nextGrid.clientHeight);
        const maxLeft = Math.max(0, nextGrid.scrollWidth - nextGrid.clientWidth);
        nextGrid.scrollTop = Math.min(previousScrollTop, maxTop);
        nextGrid.scrollLeft = Math.min(previousScrollLeft, maxLeft);
      }
    }
  }

  function selectActionSlot(index){
    const slotState = getActionSlotState(index);
    const ammo = slotState.ammo || null;
    const extra = slotState.kind === "extra" ? slotState.item : getCombatExtra(index);
    const cpu = slotState.kind === "missileLauncher" ? slotState.item : getCombatCpu(index);
    const formation = slotState.formation || getCombatDroneFormation(index);
    if(!slotState.id) return showToast(slotState.reason || `Slot ${index+1} vide.`);
    if(slotState.available === false) return showToast(slotState.reason || "Objet indisponible sur ce vaisseau.");
    if(slotState.usable === false && slotState.reason) return showToast(slotState.reason);
    if(cpu){
      fireMissileLauncher();
      return;
    }
    if(formation){
      activateDroneFormation(formation);
      return;
    }
    if(extra){
      useCombatExtra(extra.id);
      return;
    }
    if(!ammo) return showToast(`Slot ${index+1} vide.`);
    if(getAmmoCount(ammo.id) <= 0) return showToast(`${ammo.name} : stock vide.`);
    if(ammo.weaponClass === "missile") return selectMissileAmmo(ammo.id);

    if(ammo.weaponClass === "rocket"){
      selectedRocketAmmoId = ammo.id;
      fireManualRocket(index, ammo);
      updateGameActionBar();
      return;
    }

    rememberLaserAmmo(ammo);

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

  function useRickySupportSkill(){
    const support = getRickySupportState?.() || {};
    if(!support.available) return false;
    if(Number(support.cooldown || 0) > 0){
      showToast(`Balise Ricky en recharge : ${Math.ceil(Number(support.cooldown || 0))}s.`);
      return false;
    }
    if(!activateRickyHealBeacon?.()) return false;
    showToast("Balise de soin Ricky demandee.");
    updateRickySupportSkill();
    return true;
  }

  function useShipAbility(index = 0){
    const state = (getShipAbilityStates?.() || [])[Math.max(0, Number(index || 0))] || {};
    if(!state.abilityId) return false;
    if(Number(state.activeRemainingMs || 0) > 0){
      showToast(`${state.name || "Compétence"} est déjà active.`);
      return false;
    }
    if(Number(state.cooldownRemainingMs || 0) > 0){
      showToast(`${state.name || "Compétence"} en recharge : ${Math.ceil(Number(state.cooldownRemainingMs) / 1000)}s.`);
      return false;
    }
    if(!activateShipAbility?.(state.abilityId)){
      showToast("Connexion serveur requise pour activer la compétence.");
      return false;
    }
    showToast(`${state.name || "Compétence"} demandée.`);
    return true;
  }

  function buyCombatAmmo(id, multiplier = 1){
    const ammo = getAmmo(id);
    if(!ammo) return;
    const count = [1, 10, 100, 1000].includes(Number(multiplier)) ? Number(multiplier) : 1;
    if(!requireMmoConnection(multiplayer, showToast)) return;
    if(buyServerAmmo?.(ammo.id, count)){
      showToast("Achat envoye au serveur.");
      return;
    }
    showToast("Achat de munitions impossible.");
  }

  function saveAndSyncActionSlots(){
    if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
    store.state.actionSlotsByShip[String(store.state.activeShip || "orion")] = Array.from({length:9}, (_,index)=>store.state.actionSlots?.[index] || null);
    saveState();
    syncProfile?.();
  }

  function assignAmmoToActionSlot(index, ammoId){
    const ammo = getAmmo(ammoId);
    if(!ammo) return;
    if(ammo.weaponClass === "rocket") selectedRocketAmmoId = ammo.id;
    setActionSlot(index, ammo.id);
    if((ammo.weaponClass === "rocket" || ammo.weaponClass === "missile") && activeLaserSlot === index) activeLaserSlot = null;
    saveAndSyncActionSlots();
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

  function tryFireAutomaticMissile(){
    const player = getPlayer();
    if(!player.extraBonus?.autoMissile) return false;
    const state = getMissileLauncherState();
    if(!state.ready) return false;
    const fired = fireManualMissile(state.ammo, state.capacity);
    if(fired){
      missileLoaded = 0;
      missileReload = 0;
      renderCombatQuickPanel();
      updateGameActionBar();
      return true;
    }
    return false;
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
    saveAndSyncActionSlots();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${launcher.name} place en slot ${slotIndex+1}.`);
  }

  function cleanCombatActionSlots({persist = false} = {}){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    const cleanedSlots = Array.from({length:9}, (_,index)=>{
      const id = store.state.actionSlots[index] || null;
      if(!id) return null;
      if(getAmmo(id)) return id;
      const item = getItem(id);
      if(item?.category === "extra" || ["missileLauncher", "rocketLauncher"].includes(item?.slotType)) return id;
      if(getDroneFormation?.(id)) return id;
      return null;
    });
    const changed = cleanedSlots.some((id, index)=>id !== (store.state.actionSlots[index] || null));
    store.state.actionSlots = cleanedSlots;
    if(changed && persist) saveAndSyncActionSlots();
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
    saveAndSyncActionSlots();
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
    saveAndSyncActionSlots();
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
    if(!item.effect.repairBot && !item.effect.portgun){
      return showToast(`${item.name} est un extra passif.`);
    }
    setActionSlot(index, item.id);
    if(activeLaserSlot === index) activeLaserSlot = null;
    saveAndSyncActionSlots();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${item.name} place en slot ${index+1}.`);
  }

  function useCombatExtra(itemId){
    const item = getItem(itemId);
    if(!item || item.category !== "extra") return false;
    if(!getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id)){
      showToast(`${item.name} doit etre equipe dans les extras du vaisseau.`);
      return false;
    }
    if(item.effect?.repairBot){
      activateRepairBot(true);
      renderCombatQuickPanel();
      updateHud();
      updateGameActionBar();
      return true;
    }
    if(item.effect?.portgun){
      const fluidId = item.effect.teleportFluidItemId || "teleportation_fluid";
      if(getInventoryItemCount(fluidId) <= 0){
        showToast("Il faut 1 fluide de teleportation.");
        return false;
      }
      if(!multiplayer?.connected || !multiplayer?.socket){
        showToast("Connexion serveur requise pour le Portgun.");
        return false;
      }
      openPortgunMap?.();
      return true;
    }
    showToast(`${item.name} est un extra passif.`);
    return false;
  }

  function assignDroneFormationToActionSlot(index, formationId){
    const formation = getDroneFormation?.(formationId);
    if(!formation) return;
    if(!store.state.ownedDroneFormations?.includes(formation.id)){
      return showToast(`${formation.name} doit etre achetee avant utilisation.`);
    }
    setActionSlot(index, formation.id);
    if(activeLaserSlot === index) activeLaserSlot = null;
    saveAndSyncActionSlots();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${formation.name} placee en slot ${index+1}.`);
  }

  function activateDroneFormation(formation){
    if(!formation) return false;
    if(!store.state.ownedDroneFormations?.includes(formation.id)){
      showToast(`${formation.name} doit etre achetee avant utilisation.`);
      return false;
    }
    if(!requireMmoConnection(multiplayer, showToast)) return false;
    if(buyServerDroneFormation?.({id:formation.id, owned:true})){
      showToast(`${formation.name} : activation envoyee au serveur.`);
      return true;
    }
    showToast("Connexion serveur requise pour activer cette formation.");
    return false;
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
    getLaserSlotForAttack,
    rememberLaserAmmo,
    getCombatAmmo,
    getSelectedRocketAmmo,
    getCombatExtra,
    getCombatCpu,
    getCombatDroneFormation,
    getAmmoCooldown,
    setAmmoCooldown,
    getEffectiveAmmoCooldown,
    tickAmmoCooldowns,
    renderGameActionBar,
    updateGameActionBar,
    useRickySupportSkill,
    useShipAbility,
    renderCombatQuickPanel,
    selectActionSlot,
    buyCombatAmmo,
    assignAmmoToActionSlot,
    selectMissileAmmo,
    tryFireAutomaticMissile,
    fireMissileLauncher,
    assignMissileLauncherToActionSlot,
    cleanCombatActionSlots,
    moveActionSlot,
    clearActionSlot,
    useCombatExtra,
    assignExtraToActionSlot,
    assignDroneFormationToActionSlot,
    setCombatPanelTab:value=>{ combatPanelTab = value; },
    shiftCombatPanelTabs:value=>{
      const maxOffset = Math.max(0, document.querySelectorAll("#combatQuickPanel [data-combat-panel-tab]").length - 5);
      combatPanelTabOffset = Math.max(0, Math.min(maxOffset, combatPanelTabOffset + Number(value || 0)));
    },
    refreshOpenQuickPanel
  };
}
