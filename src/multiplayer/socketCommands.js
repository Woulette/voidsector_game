function canEmit(multiplayer){
  return Boolean(multiplayer.connected && multiplayer.socket);
}

function emit(multiplayer, event, payload){
  if(!canEmit(multiplayer)) return false;
  multiplayer.socket.emit(event, payload);
  return true;
}

export function createSocketCommands({multiplayer}){
  return {
    requestServerLogout(){
      return emit(multiplayer, "session:logout-request");
    },
    requestPlayerRespawn(choice){
      return choice ? emit(multiplayer, "player:respawn", {choice}) : false;
    },
    startPortgunTeleport(mapId){
      return mapId !== undefined && mapId !== null ? emit(multiplayer, "portgun:teleport", {mapId}) : false;
    },
    requestLeaderboardSync(){
      return emit(multiplayer, "leaderboard:sync");
    },
    requestAdminSync({profileLimit = 0, auditLimit = 50} = {}){
      return emit(multiplayer, "admin:sync", {profileLimit, auditLimit});
    },
    inspectAdminPlayer(payload = {}){
      return emit(multiplayer, "admin:inspect-player", payload);
    },
    kickAdminPlayer(payload = {}){
      return emit(multiplayer, "admin:kick", payload);
    },
    adjustAdminPlayer(payload = {}){
      return emit(multiplayer, "admin:adjust-player", payload);
    },
    removeAdminInventoryItem(payload = {}){
      return emit(multiplayer, "admin:inventory-remove", payload);
    },
    moderateAdminAccount(payload = {}){
      return emit(multiplayer, "admin:moderate-account", payload);
    },
    resetAdminInstance(payload = {}){
      return emit(multiplayer, "admin:reset-instance", payload);
    },
    setupServerProfile({name, firmId} = {}){
      return emit(multiplayer, "profile:setup", {name, firmId});
    },
    resetServerFirmDebug(){
      return emit(multiplayer, "profile:debug-reset-firm");
    },
    sendChatMessage({channel = "global", text = ""} = {}){
      return emit(multiplayer, "chat:send", {channel, text});
    },
    acceptServerQuest(id){
      return id ? emit(multiplayer, "quest:accept", {id}) : false;
    },
    claimServerQuest(id){
      return id ? emit(multiplayer, "quest:claim", {id}) : false;
    },
    trackServerQuest(id){
      return id ? emit(multiplayer, "quest:track", {id}) : false;
    },
    progressServerQuest(payload = {}){
      return payload?.type ? emit(multiplayer, "quest:progress", payload) : false;
    },
    upgradeServerSkill(id){
      return id ? emit(multiplayer, "skill:upgrade", {id}) : false;
    },
    unlockServerPortal({id, method = "pieces"} = {}){
      return id ? emit(multiplayer, "portal:unlock", {id, method}) : false;
    },
    performServerPrestige(){
      return emit(multiplayer, "prestige:perform");
    },
    runServerSpaceCaster({portalId, count = 1} = {}){
      return portalId ? emit(multiplayer, "space-caster:run", {portalId, count}) : false;
    },
    startServerRefineryUpgrade({type = "material", id} = {}){
      return id ? emit(multiplayer, "refinery:upgrade-start", {type, id}) : false;
    },
    rushServerRefineryUpgrade({type = "material", id} = {}){
      return id ? emit(multiplayer, "refinery:upgrade-rush", {type, id}) : false;
    },
    toggleServerRefineryProduction(id){
      return id ? emit(multiplayer, "refinery:production-toggle", {id}) : false;
    },
    startServerRefineryJob(recipeId){
      return recipeId ? emit(multiplayer, "refinery:job-start", {recipeId}) : false;
    },
    claimServerRefineryJob(){
      return emit(multiplayer, "refinery:job-claim");
    },
    startServerRefineryShipment({materialId, amount, shipId} = {}){
      return materialId ? emit(multiplayer, "refinery:shipment-start", {materialId, amount, shipId}) : false;
    },
    rushServerRefineryShipment(){
      return emit(multiplayer, "refinery:shipment-rush");
    },
    refineServerShipCargo({recipeId, amount = 1, shipId} = {}){
      return recipeId ? emit(multiplayer, "refinery:ship-cargo-refine", {recipeId, amount, shipId}) : false;
    },
    depositServerCombatBoostMaterial({target, materialId, amount = 1, shipId} = {}){
      return target && materialId ? emit(multiplayer, "refinery:combat-boost-deposit", {target, materialId, amount, shipId}) : false;
    },
    buyServerAmmo(id, multiplier = 1){
      return emit(multiplayer, "shop:buy-ammo", {id, multiplier});
    },
    buyServerItem(id){
      return emit(multiplayer, "shop:buy-item", {id});
    },
    sellServerInventoryItem(inventoryUid){
      return inventoryUid ? emit(multiplayer, "inventory:sell-item", {inventoryUid}) : false;
    },
    buyServerShip(id){
      return emit(multiplayer, "shop:buy-ship", {id});
    },
    equipServerActiveShip(shipId){
      return shipId ? emit(multiplayer, "ship:equip-active", {shipId}) : false;
    },
    buyServerDrone({id = "combat_drone", ownedCount = 0} = {}){
      return emit(multiplayer, "shop:buy-drone", {id, ownedCount});
    },
    buyServerDroneFormation({id, owned = false} = {}){
      return emit(multiplayer, "shop:buy-drone-formation", {id, owned});
    },
    equipServerInventoryItem({type, index = 0, inventoryUid, shipId} = {}){
      return emit(multiplayer, "equipment:equip", {type, index, inventoryUid, shipId});
    },
    unequipServerSlot({type, index = 0, shipId} = {}){
      return emit(multiplayer, "equipment:unequip-slot", {type, index, shipId});
    },
    unequipServerShip({shipId} = {}){
      return shipId ? emit(multiplayer, "equipment:unequip-ship", {shipId}) : false;
    },
    unequipServerInventoryItem(inventoryUid){
      return emit(multiplayer, "equipment:unequip-inventory", {inventoryUid});
    },
    applyServerDroneUpgrade({index = 0, inventoryUid} = {}){
      return emit(multiplayer, "equipment:drone-upgrade", {index, inventoryUid});
    },
    upgradeServerEquipment({itemId, materialSource = "cargoHold", shipId} = {}){
      return itemId ? emit(multiplayer, "equipment:upgrade", {itemId, materialSource, shipId}) : false;
    },
    requestServerLootPickup(id){
      return id ? emit(multiplayer, "loot:pickup", {id}) : false;
    }
  };
}
