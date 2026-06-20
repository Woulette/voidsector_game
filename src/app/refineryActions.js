import { sendMmoCommand } from "./mmoGate.js";

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
  renderAll,
  renderRefinery,
  showToast
}){
  function handleClick(event){
    const startJob = event.target.closest("#refineryPanel [data-start-refinery]");
    if(startJob){
      sendMmoCommand({
        multiplayer,
        send:()=>startServerRefineryJob?.(startJob.dataset.startRefinery),
        showToast,
        sentMessage:"Raffinage envoye au serveur.",
        failedMessage:"Raffinage impossible."
      });
      return true;
    }
    const claimJob = event.target.closest("#refineryPanel [data-claim-refinery]");
    if(claimJob){
      sendMmoCommand({
        multiplayer,
        send:()=>claimServerRefineryJob?.(),
        showToast,
        sentMessage:"Recuperation envoyee au serveur.",
        failedMessage:"Recuperation impossible."
      });
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
      sendMmoCommand({
        multiplayer,
        send:()=>toggleServerRefineryProduction?.(toggleProduction.dataset.toggleRefineryProduction),
        showToast,
        sentMessage:"Changement de production envoye au serveur.",
        failedMessage:"Changement de production impossible."
      });
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
      if(sendMmoCommand({
        multiplayer,
        send:()=>startServerRefineryUpgrade?.({type:"material", id}),
        showToast,
        sentMessage:"Amelioration envoyee au serveur.",
        failedMessage:"Amelioration impossible."
      })){
        store.selectedRefineryUpgrade = null;
        renderAll();
      }
      return true;
    }
    const confirmModule = event.target.closest("#refineryPanel [data-confirm-refinery-module-upgrade]");
    if(confirmModule){
      const id = confirmModule.dataset.confirmRefineryModuleUpgrade;
      if(sendMmoCommand({
        multiplayer,
        send:()=>startServerRefineryUpgrade?.({type:"module", id}),
        showToast,
        sentMessage:"Amelioration envoyee au serveur.",
        failedMessage:"Amelioration impossible."
      })){
        store.selectedRefineryUpgrade = null;
        renderAll();
      }
      return true;
    }
    const rushUpgrade = event.target.closest("#refineryPanel [data-rush-refinery-upgrade]");
    if(rushUpgrade){
      const type = rushUpgrade.dataset.rushRefineryType;
      const id = rushUpgrade.dataset.rushRefineryUpgrade;
      if(sendMmoCommand({
        multiplayer,
        send:()=>rushServerRefineryUpgrade?.({type, id}),
        showToast,
        sentMessage:"Acceleration envoyee au serveur.",
        failedMessage:"Acceleration impossible."
      })){
        store.selectedRefineryUpgrade = null;
        renderAll();
      }
      return true;
    }
    if(event.target.closest("#refineryPanel [data-start-refinery-shipment]")){
      sendMmoCommand({
        multiplayer,
        send:()=>startServerRefineryShipment?.({materialId:store.selectedRefineryShipmentMaterial, amount:store.selectedRefineryShipmentAmount, shipId:store.state.activeShip}),
        showToast,
        sentMessage:"Expedition envoyee au serveur.",
        failedMessage:"Expedition impossible."
      });
      return true;
    }
    if(event.target.closest("#refineryPanel [data-rush-refinery-shipment]")){
      sendMmoCommand({
        multiplayer,
        send:()=>rushServerRefineryShipment?.(),
        showToast,
        sentMessage:"Acceleration expedition envoyee au serveur.",
        failedMessage:"Acceleration expedition impossible."
      });
      return true;
    }
    return false;
  }

  return {handleClick};
}
