export function createEquipmentActions({
  multiplayer,
  store,
  getItemFromInventoryUid,
  getShip,
  getLoadout,
  getDroneLoadout,
  findEquippedSlot,
  unequipInventoryItem,
  isDronePermanentUpgradeItem,
  isDroneCompatibleEquipment,
  applyDronePermanentUpgrade,
  applyServerDroneUpgrade,
  equipServerInventoryItem,
  unequipServerSlot,
  saveState,
  renderAllPreserveInventoryScroll,
  showToast
}){
  function canMoveInventoryItemToTarget(inventoryUid, target){
    const equipped = findEquippedSlot(inventoryUid);
    if(!equipped) return true;
    if(target.location === "ship" && equipped.location === "ship" && equipped.shipId === target.shipId) return true;
    if(target.location === "drone" && equipped.location === "drone" && equipped.index === target.index) return true;
    unequipInventoryItem(inventoryUid);
    return true;
  }

  function equipPart(type, index, inventoryUid){
    const item = getItemFromInventoryUid(inventoryUid);
    if(!item) return;
    if(multiplayer.connected){
      if(type === "drone" && isDronePermanentUpgradeItem(item) && applyServerDroneUpgrade({index, inventoryUid})){
        showToast("Amelioration drone envoyee au serveur.");
        return;
      }
      const ship = getShip(store.state.selectedShip);
      if(equipServerInventoryItem({type, index, inventoryUid, shipId:ship?.id})){
        showToast("Equipement envoye au serveur.");
        return;
      }
    }
    if(["laser", "generator", "missileLauncher", "rocketLauncher", "extra"].includes(type)){
      const ship = getShip(store.state.selectedShip);
      const loadout = getLoadout(ship.id);
      if(type === "laser"){
        if(item.category !== "canon") return showToast("Ce n'est pas un canon.");
        if(index >= ship.stats.maxLasers || !canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
        loadout.lasers = loadout.lasers.map(uid=>uid === inventoryUid ? null : uid);
        loadout.lasers[index] = inventoryUid;
      }else if(type === "generator"){
        if(item.category !== "generateur") return showToast("Ce n'est pas un generateur.");
        if(index >= ship.stats.maxGenerators || !canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
        loadout.generators = loadout.generators.map(uid=>uid === inventoryUid ? null : uid);
        loadout.generators[index] = inventoryUid;
      }else if(type === "missileLauncher" || type === "rocketLauncher"){
        if(item.slotType !== type) return showToast(type === "missileLauncher" ? "Ce n'est pas un lance missile." : "Ce n'est pas un lance roquette.");
        if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
        if(loadout[type] && loadout[type] !== inventoryUid) unequipInventoryItem(loadout[type]);
        loadout[type] = inventoryUid;
      }else{
        if(item.category !== "extra") return showToast("Ce n'est pas un extra.");
        if(index >= (ship.stats.maxExtras || 3) || !canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
        loadout.extras = loadout.extras.map(uid=>uid === inventoryUid ? null : uid);
        loadout.extras[index] = inventoryUid;
      }
      store.state.shipLoadouts[ship.id] = loadout;
      showToast(`${item.name} equipe sur ${ship.name}.`);
      renderAllPreserveInventoryScroll();
      return;
    }
    if(type !== "drone") return;
    const drones = getDroneLoadout();
    if(index >= drones.length) return showToast("Aucun drone a cet emplacement.");
    if(isDronePermanentUpgradeItem(item)){
      const result = applyDronePermanentUpgrade(index, inventoryUid);
      if(!result.ok) return showToast(result.reason);
      saveState();
      showToast(`Drone ${index + 1} passe en overdrive rouge : lasers du drone +50%.`);
      renderAllPreserveInventoryScroll();
      return;
    }
    if(!isDroneCompatibleEquipment(item)) return showToast("Un drone accepte uniquement un laser ou un generateur de bouclier.");
    if(drones[index] && drones[index] !== inventoryUid) unequipInventoryItem(drones[index]);
    if(!canMoveInventoryItemToTarget(inventoryUid, {location:"drone", index})) return;
    for(let i = 0; i < drones.length; i++) if(drones[i] === inventoryUid) drones[i] = null;
    drones[index] = inventoryUid;
    saveState();
    showToast(`${item.name} equipe sur Drone ${index + 1}.`);
    renderAllPreserveInventoryScroll();
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
    if(!canMoveInventoryItemToTarget(inventoryUid, {location:"ship", shipId:ship.id})) return;
    const loadout = getLoadout(ship.id);
    const type = item.category === "canon" ? "laser" : item.category === "generateur" ? "generator" : item.slotType === "missileLauncher" ? "missileLauncher" : item.slotType === "rocketLauncher" ? "rocketLauncher" : item.category === "extra" ? "extra" : null;
    if(!type) return showToast("Cet equipement n'est pas montable sur un vaisseau pour le moment.");
    if(type === "missileLauncher" || type === "rocketLauncher") return equipPart(type, 0, inventoryUid);
    const slots = type === "laser" ? loadout.lasers : type === "generator" ? loadout.generators : loadout.extras;
    const currentIndex = slots.indexOf(inventoryUid);
    let index = currentIndex >= 0 ? currentIndex : slots.findIndex(uid=>!uid);
    if(index < 0) index = 0;
    equipPart(type, index, inventoryUid);
  }

  function unequipPart(type, index){
    if(multiplayer.connected){
      const ship = getShip(store.state.selectedShip);
      if(unequipServerSlot({type, index, shipId:ship?.id})){
        showToast("Retrait envoye au serveur.");
        return;
      }
    }
    if(type === "drone"){
      const drones = getDroneLoadout();
      if(index >= 0 && index < drones.length) drones[index] = null;
      showToast(`Drone ${index + 1} vide.`);
      renderAllPreserveInventoryScroll();
      return;
    }
    const ship = getShip(store.state.selectedShip);
    const loadout = getLoadout(ship.id);
    if(type === "laser") loadout.lasers[index] = null;
    else if(type === "generator") loadout.generators[index] = null;
    else if(type === "missileLauncher") loadout.missileLauncher = null;
    else if(type === "rocketLauncher") loadout.rocketLauncher = null;
    else if(type === "extra") loadout.extras[index] = null;
    store.state.shipLoadouts[ship.id] = loadout;
    showToast(`Slot ${index + 1} vide sur ${ship.name}.`);
    renderAllPreserveInventoryScroll();
  }

  return {equipPart, autoEquipInventoryItem, unequipPart};
}
