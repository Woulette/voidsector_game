export function createShopActions({
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
}){
  function buyShip(id){
    const ship = getShip(id);
    if(store.state.ownedShips.includes(id)) return;
    const lockReason = getShipPurchaseLockReason(ship);
    if(lockReason) return showToast(lockReason);
    if(multiplayer.connected && buyServerShip(id)) return showToast("Achat envoye au serveur.");
    if(!canAfford(ship.priceType, ship.price)) return showToast("Fonds insuffisants.");
    spend(ship.priceType, ship.price);
    store.state.ownedShips.push(id);
    ensureShipLoadout(id);
    showToast(`${ship.name} achete. Il est disponible dans ton hangar.`);
    renderAll();
  }

  function buyItem(id){
    const item = getItem(id);
    if(!item) return;
    if(item.category === "quest_item" && !multiplayer.connected){
      return showToast("Connexion au serveur requise pour acheter un objet de quete.");
    }
    if(multiplayer.connected && buyServerItem(id)) return showToast("Achat envoye au serveur.");
    if(!canAfford(item.priceType, item.price)) return showToast("Fonds insuffisants.");
    spend(item.priceType, item.price);
    addInventoryItem(id);
    showToast(`${item.name} achete. Un exemplaire a ete ajoute a l'inventaire.`);
    renderAll();
  }

  function buyAmmo(id, multiplier = 1){
    const ammo = ammoTypes.find(entry=>entry.id === id);
    if(!ammo) return;
    const count = [1, 10, 100, 1000].includes(Number(multiplier)) ? Number(multiplier) : 1;
    if(multiplayer.connected && buyServerAmmo(id, count)) return showToast("Achat envoye au serveur.");
    const price = ammo.price * count;
    const amount = ammo.amount * count;
    if(!canAfford(ammo.priceType, price)) return showToast("Fonds insuffisants.");
    spend(ammo.priceType, price);
    addAmmo(ammo.id, amount);
    showToast(`${ammo.name} achetee : +${amount.toLocaleString("fr-FR")} munitions.`);
    renderAll();
  }

  function buyCombatDrone(){
    const drone = getDroneCatalog();
    const count = store.state.ownedDroneCount || 0;
    if(count >= drone.maxOwned) return showToast("Nombre maximum de drones atteint.");
    if(multiplayer.connected && buyServerDrone({id:drone.id, ownedCount:count})) return showToast("Achat envoye au serveur.");
    const price = getDronePurchasePrice(count);
    if(!canAfford(drone.priceType, price)) return showToast("Fonds insuffisants.");
    spend(drone.priceType, price);
    store.state.ownedDroneCount = count + 1;
    const loadout = getDroneLoadout();
    while(loadout.length < store.state.ownedDroneCount) loadout.push(null);
    store.hangarTab = "drone";
    showToast(`Drone ${store.state.ownedDroneCount} achete pour ${price.toLocaleString("fr-FR")} credits.`);
    renderAll();
  }

  function buyDroneFormation(id){
    const formation = getDroneFormation(id);
    if(!formation) return;
    if(!Array.isArray(store.state.ownedDroneFormations)) store.state.ownedDroneFormations = [];
    const owned = store.state.ownedDroneFormations.includes(id);
    if(multiplayer.connected && buyServerDroneFormation({id, owned})) return showToast(owned ? "Activation envoyee au serveur." : "Achat envoye au serveur.");
    if(!owned){
      if(!canAfford(formation.priceType, formation.price)) return showToast("Fonds insuffisants.");
      spend(formation.priceType, formation.price);
      store.state.ownedDroneFormations.push(id);
      showToast(`${formation.name} achetee.`);
    }else showToast(`${formation.name} activee.`);
    store.state.activeDroneFormation = id;
    renderAll();
  }

  return {buyShip, buyItem, buyAmmo, buyCombatDrone, buyDroneFormation};
}
