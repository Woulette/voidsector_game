import { requireMmoConnection } from "./mmoGate.js";
import { findMatchingExtraGroupIndex } from "../shared/equipmentRules.js";

export function createEquipmentActions({
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
}){
  function equipPart(type, index, inventoryUid){
    const item = getItemFromInventoryUid(inventoryUid);
    if(!item) return;
    if(!requireMmoConnection(multiplayer, showToast)) return;
    if(type === "drone" && isDronePermanentUpgradeItem(item)){
      if(applyServerDroneUpgrade?.({index, inventoryUid})){
        showToast("Amelioration drone envoyee au serveur.");
        return;
      }
      showToast("Amelioration drone impossible.");
      return;
    }
    const ship = getShip(store.state.selectedShip);
    if(equipServerInventoryItem?.({type, index, inventoryUid, shipId:ship?.id})){
      showToast("Equipement envoye au serveur.");
      return;
    }
    showToast("Equipement serveur impossible.");
  }

  function autoEquipInventoryItem(inventoryUid){
    store.selectedInventoryUid = inventoryUid;
    const item = getItemFromInventoryUid(inventoryUid);
    if(!item) return;
    if(store.hangarTab === "drone"){
      const drones = getDroneLoadout();
      if(!drones.length) return showToast("Achete d'abord un drone.");
      if(isDronePermanentUpgradeItem(item)){
        const index = drones.findIndex((_, i)=>!store.state.dronePermanentUpgrades?.[i]);
        return index < 0 ? showToast("Tous les drones sont deja ameliores.") : equipPart("drone", index, inventoryUid);
      }
      if(!isDroneCompatibleEquipment(item)) return showToast("Cet equipement n'est pas compatible avec les drones.");
      const currentIndex = drones.indexOf(inventoryUid);
      let index = currentIndex >= 0 ? currentIndex : drones.findIndex(uid=>!uid);
      if(index < 0) index = 0;
      equipPart("drone", index, inventoryUid);
      return;
    }
    const ship = getShip(store.state.selectedShip);
    const loadout = getLoadout(ship.id);
    const type = item.category === "canon" ? "laser" : item.category === "generateur" ? "generator" : item.slotType === "missileLauncher" ? "missileLauncher" : item.slotType === "rocketLauncher" ? "rocketLauncher" : item.category === "extra" ? "extra" : null;
    if(!type) return showToast("Cet equipement n'est pas montable sur un vaisseau pour le moment.");
    if(type === "missileLauncher" || type === "rocketLauncher") return equipPart(type, 0, inventoryUid);
    const slots = type === "laser" ? loadout.lasers : type === "generator" ? loadout.generators : loadout.extras;
    const currentIndex = slots.indexOf(inventoryUid);
    const matchingExtraIndex = type === "extra"
      ? findMatchingExtraGroupIndex(slots, item, getItemFromInventoryUid, inventoryUid)
      : -1;
    let index = currentIndex >= 0 ? currentIndex : matchingExtraIndex >= 0 ? matchingExtraIndex : slots.findIndex(uid=>!uid);
    if(index < 0) index = 0;
    equipPart(type, index, inventoryUid);
  }

  function unequipPart(type, index){
    if(!requireMmoConnection(multiplayer, showToast)) return;
    const ship = getShip(store.state.selectedShip);
    if(unequipServerSlot?.({type, index, shipId:ship?.id})){
      showToast("Retrait envoye au serveur.");
      return;
    }
    showToast("Retrait serveur impossible.");
  }

  function countShipLoadoutItems(loadout){
    return [
      ...(Array.isArray(loadout?.lasers) ? loadout.lasers : []),
      loadout?.missileLauncher,
      loadout?.rocketLauncher,
      ...(Array.isArray(loadout?.generators) ? loadout.generators : []),
      ...(Array.isArray(loadout?.extras) ? loadout.extras : [])
    ].filter(Boolean).length;
  }

  function unequipSelectedShipLoadout(){
    const ship = getShip(store.state.selectedShip);
    if(!ship) return false;
    if(!requireMmoConnection(multiplayer, showToast)) return false;
    if(unequipServerShip?.({shipId:ship.id})){
      showToast("Retrait complet envoye au serveur.");
      return true;
    }
    showToast("Retrait complet serveur impossible.");
    return false;
  }

  return {equipPart, autoEquipInventoryItem, unequipPart, unequipSelectedShipLoadout};
}
