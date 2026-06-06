export function createRefineryActions({
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
}){
  function handleClick(event){
    const startJob = event.target.closest("#refineryPanel [data-start-refinery]");
    if(startJob){
      if(multiplayer.connected && startServerRefineryJob(startJob.dataset.startRefinery)) showToast("Raffinage envoye au serveur.");
      else{
        const result = startRefineryJob(startJob.dataset.startRefinery);
        showToast(result.ok ? `${result.recipe.name} lance.` : result.reason);
        saveState();
        renderRefinery();
      }
      return true;
    }
    const claimJob = event.target.closest("#refineryPanel [data-claim-refinery]");
    if(claimJob){
      if(multiplayer.connected && claimServerRefineryJob()) showToast("Recuperation envoyee au serveur.");
      else{
        const result = claimRefineryJob();
        showToast(result.ok ? "Raffinage recupere." : result.reason);
        saveState();
        renderRefinery();
      }
      return true;
    }
    const tab = event.target.closest(".refinery-panel [data-refinery-tab]");
    if(tab){
      store.selectedRefineryTab = ["forge", "shipment", "stats"].includes(tab.dataset.refineryTab) ? tab.dataset.refineryTab : "forge";
      store.selectedRefineryUpgrade = null;
      renderRefinery();
      return true;
    }
    const shipmentPick = event.target.closest("#refineryPanel [data-refinery-shipment-pick]");
    if(shipmentPick){
      store.selectedRefineryShipmentMaterial = shipmentPick.dataset.refineryShipmentPick;
      renderRefinery();
      return true;
    }
    const toggleProduction = event.target.closest("#refineryPanel [data-toggle-refinery-production]");
    if(toggleProduction){
      if(multiplayer.connected && toggleServerRefineryProduction(toggleProduction.dataset.toggleRefineryProduction)) showToast("Changement de production envoye au serveur.");
      else{
        const enabled = toggleRefineryProduction(toggleProduction.dataset.toggleRefineryProduction);
        showToast(`Production ${enabled ? "activee" : "coupee"}.`);
        saveState();
        renderAll();
      }
      return true;
    }
    const materialUpgrade = event.target.closest("#refineryPanel [data-upgrade-refinery]");
    if(materialUpgrade){
      store.selectedRefineryUpgrade = {type:"material", id:materialUpgrade.dataset.upgradeRefinery};
      renderRefinery();
      return true;
    }
    const moduleUpgrade = event.target.closest("#refineryPanel [data-upgrade-refinery-module]");
    if(moduleUpgrade){
      store.selectedRefineryUpgrade = {type:"module", id:moduleUpgrade.dataset.upgradeRefineryModule};
      renderRefinery();
      return true;
    }
    if(event.target.closest("#refineryPanel [data-close-refinery-upgrade]")){
      store.selectedRefineryUpgrade = null;
      renderRefinery();
      return true;
    }
    const confirmMaterial = event.target.closest("#refineryPanel [data-confirm-refinery-upgrade]");
    if(confirmMaterial){
      const id = confirmMaterial.dataset.confirmRefineryUpgrade;
      if(multiplayer.connected && startServerRefineryUpgrade({type:"material", id})){
        showToast("Amelioration envoyee au serveur.");
        store.selectedRefineryUpgrade = null;
      }else{
        const result = startRefineryMaterialUpgrade(id);
        if(result.ok){
          if(multiplayer.connected) progressServerQuest({type:"refinery_material_upgrade_start", materialId:id, targetLevel:result.level});
          else recordQuestRefineryMaterialUpgradeStart(id, result.level);
        }
        showToast(result.ok ? `${result.material.name} niveau ${result.level} en construction.` : result.reason);
        store.selectedRefineryUpgrade = result.ok ? null : store.selectedRefineryUpgrade;
        saveState();
        renderAll();
      }
      return true;
    }
    const confirmModule = event.target.closest("#refineryPanel [data-confirm-refinery-module-upgrade]");
    if(confirmModule){
      const id = confirmModule.dataset.confirmRefineryModuleUpgrade;
      if(multiplayer.connected && startServerRefineryUpgrade({type:"module", id})){
        showToast("Amelioration envoyee au serveur.");
        store.selectedRefineryUpgrade = null;
      }else{
        const result = startRefineryModuleUpgrade(id);
        if(result.ok){
          if(multiplayer.connected) progressServerQuest({type:"refinery_module_upgrade_start", moduleId:id, targetLevel:result.level});
          else recordQuestRefineryModuleUpgradeStart(id, result.level);
        }
        showToast(result.ok ? `${result.module} niveau ${result.level} en construction.` : result.reason);
        store.selectedRefineryUpgrade = result.ok ? null : store.selectedRefineryUpgrade;
        saveState();
        renderAll();
      }
      return true;
    }
    const rushUpgrade = event.target.closest("#refineryPanel [data-rush-refinery-upgrade]");
    if(rushUpgrade){
      const type = rushUpgrade.dataset.rushRefineryType;
      const id = rushUpgrade.dataset.rushRefineryUpgrade;
      if(multiplayer.connected && rushServerRefineryUpgrade({type, id})) showToast("Acceleration envoyee au serveur.");
      else{
        const result = rushRefineryUpgrade(type, id);
        showToast(result.ok ? `${result.name} niveau ${result.level} termine pour ${result.cost} NOVA.` : result.reason);
        store.selectedRefineryUpgrade = result.ok ? null : store.selectedRefineryUpgrade;
        saveState();
        renderAll();
      }
      return true;
    }
    if(event.target.closest("#refineryPanel [data-start-refinery-shipment]")){
      if(multiplayer.connected && startServerRefineryShipment({materialId:store.selectedRefineryShipmentMaterial, amount:store.selectedRefineryShipmentAmount, shipId:store.state.activeShip})) showToast("Expedition envoyee au serveur.");
      else{
        const result = startRefineryShipment(store.selectedRefineryShipmentMaterial, store.selectedRefineryShipmentAmount);
        showToast(result.ok ? `${result.amount} ${result.material.name} envoyes vers ${result.ship.name}.` : result.reason);
        saveState();
        renderAll();
      }
      return true;
    }
    if(event.target.closest("#refineryPanel [data-rush-refinery-shipment]")){
      if(multiplayer.connected && rushServerRefineryShipment()) showToast("Acceleration expedition envoyee au serveur.");
      else{
        const result = rushRefineryShipment();
        showToast(result.ok ? `Expedition terminee pour ${result.cost} NOVA.` : result.reason);
        saveState();
        renderAll();
      }
      return true;
    }
    return false;
  }

  return {handleClick};
}
