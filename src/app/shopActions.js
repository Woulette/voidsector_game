import { getPremiumPack } from "../data/premium.js";
import { sendMmoCommand } from "./mmoGate.js";

export function createShopActions({
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
  buyServerBooster,
  buyServerAmmo,
  buyServerDrone,
  buyServerDroneFormation,
  buyServerPremiumPack,
  claimServerPremiumReward,
  showToast
}){
  function buyShip(id){
    const ship = getShip(id);
    if(store.state.ownedShips.includes(id)) return;
    const lockReason = getShipPurchaseLockReason(ship);
    if(lockReason) return showToast(lockReason);
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerShip?.(id),
      showToast,
      sentMessage:"Achat envoye au serveur.",
      failedMessage:"Achat de vaisseau impossible."
    });
  }

  function buyItem(id, multiplier = 1){
    const item = getItem(id);
    if(!item) return;
    const count = item.id === "teleportation_fluid" && [1, 10, 100, 1000].includes(Number(multiplier)) ? Number(multiplier) : 1;
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerItem?.(id, count),
      showToast,
      sentMessage:"Achat envoye au serveur.",
      failedMessage:"Achat d'objet impossible."
    });
  }

  function buyBooster(id, quantity = 1){
    const count = [1, 10, 50, 100].includes(Number(quantity)) ? Number(quantity) : 1;
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerBooster?.(id, count),
      showToast,
      sentMessage:"Achat du booster S1 envoyé au serveur.",
      failedMessage:"Achat du booster S1 impossible."
    });
  }

  function buyAmmo(id, multiplier = 1){
    const ammo = ammoTypes.find(entry=>entry.id === id);
    if(!ammo) return;
    const count = [1, 10, 100, 1000].includes(Number(multiplier)) ? Number(multiplier) : 1;
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerAmmo?.(id, count),
      showToast,
      sentMessage:"Achat envoye au serveur.",
      failedMessage:"Achat de munitions impossible."
    });
  }

  function buyCombatDrone(){
    const drone = getDroneCatalog();
    const count = store.state.ownedDroneCount || 0;
    if(count >= drone.maxOwned) return showToast("Nombre maximum de drones atteint.");
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerDrone?.({id:drone.id, ownedCount:count}),
      showToast,
      sentMessage:"Achat envoye au serveur.",
      failedMessage:"Achat de drone impossible."
    });
  }

  function buyDroneFormation(id){
    const formation = getDroneFormation(id);
    if(!formation) return;
    if(!Array.isArray(store.state.ownedDroneFormations)) store.state.ownedDroneFormations = [];
    const owned = store.state.ownedDroneFormations.includes(id);
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerDroneFormation?.({id, owned}),
      showToast,
      sentMessage:owned ? "Activation envoyee au serveur." : "Achat envoye au serveur.",
      failedMessage:"Action formation drone impossible."
    });
  }

  function buyPremiumPack(id){
    const pack = getPremiumPack(id);
    if(!pack) return showToast("Pack premium inconnu.");
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerPremiumPack?.(id),
      showToast,
      sentMessage:"Activation premium envoyee au serveur.",
      failedMessage:"Achat premium impossible."
    });
  }

  function claimPremiumReward(){
    sendMmoCommand({
      multiplayer,
      send:()=>claimServerPremiumReward?.(),
      showToast,
      sentMessage:"Reclamation premium envoyee au serveur.",
      failedMessage:"Recompense premium impossible."
    });
  }

  return {buyShip, buyItem, buyBooster, buyAmmo, buyCombatDrone, buyDroneFormation, buyPremiumPack, claimPremiumReward};
}
