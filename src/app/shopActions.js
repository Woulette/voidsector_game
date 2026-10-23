import { getPremiumPack } from "../data/premium.js";
import { sendMmoCommand } from "./mmoGate.js";
import { createServerActionBurstQueue } from "./serverActionBurstQueue.js?v=20260726-economy-burst1";

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
  buyServerBetaPack,
  claimServerPremiumReward,
  claimServerBetaReward,
  showToast
}){
  const purchaseQueue = createServerActionBurstQueue({
    onSendFailure:()=>showToast("Connexion perdue : achat en attente annule.")
  });

  function buyShip(id){
    const ship = getShip(id);
    if(store.state.ownedShips.includes(id)) return;
    const lockReason = getShipPurchaseLockReason(ship, multiplayer.auth.account?.role);
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
      send:()=>purchaseQueue.enqueue({
        channel:"shop:buy-item",
        key:`${id}:${count}`,
        send:repeat=>buyServerItem?.(id, count, repeat)
      }),
      showToast,
      sentMessage:"Achat pris en compte.",
      failedMessage:"Achat d'objet impossible."
    });
  }

  function buyBooster(id, quantity = 1){
    const count = [1, 10, 50, 100].includes(Number(quantity)) ? Number(quantity) : 1;
    sendMmoCommand({
      multiplayer,
      send:()=>purchaseQueue.enqueue({
        channel:"shop:buy-booster",
        key:`${id}:${count}`,
        send:repeat=>buyServerBooster?.(id, count, repeat)
      }),
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
      send:()=>purchaseQueue.enqueue({
        channel:"shop:buy-ammo",
        key:`${id}:${count}`,
        send:repeat=>buyServerAmmo?.(id, count, repeat)
      }),
      showToast,
      sentMessage:"Achat pris en compte.",
      failedMessage:"Achat de munitions impossible."
    });
  }

  function buyCombatDrone(){
    const drone = getDroneCatalog();
    const count = store.state.ownedDroneCount || 0;
    if(count >= drone.maxStandardOwned) return showToast(`Limite de ${drone.maxStandardOwned} drones standards atteinte.`);
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerDrone?.({id:drone.id, expectedPrice:Math.round(drone.basePrice * Math.pow(2, count))}),
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

  function buyBetaPack(id, shipChoice = ""){
    sendMmoCommand({
      multiplayer,
      send:()=>buyServerBetaPack?.(id, shipChoice),
      showToast,
      sentMessage:"Achat beta envoye au serveur.",
      failedMessage:"Achat beta impossible."
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

  function claimBetaReward(){
    sendMmoCommand({
      multiplayer,
      send:()=>claimServerBetaReward?.(),
      showToast,
      sentMessage:"Reclamation beta envoyee au serveur.",
      failedMessage:"Recompense beta impossible."
    });
  }

  return {buyShip, buyItem, buyBooster, buyAmmo, buyCombatDrone, buyDroneFormation, buyPremiumPack, buyBetaPack, claimPremiumReward, claimBetaReward};
}
