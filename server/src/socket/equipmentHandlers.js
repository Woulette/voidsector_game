export function registerEquipmentHandlers(socket, context){
  const {
    guard,
    io,
    players,
    profileManager,
    accountSocketsForPlayer,
    buildFirmSpawnSession,
    canChangeActiveShipAtFirmSpawn,
    canChangeEquipmentAtFirmSpawn,
    finishEquipmentChangeAtFirmSpawn,
    setPlayerMap,
    emitQuestClaims,
    emitProfileSync
  } = context;

  socket.on("ship:equip-active", payload=>{
    if(!guard("ship:equip-active")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeActiveShipAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("ship:equip-error", {message:location.reason || "Changement de vaisseau impossible."});
      return;
    }
    const liveGamePlayer = location.gamePlayerId ? players.get(location.gamePlayerId) : null;
    if(liveGamePlayer?.state){
      profileManager.saveWorldSession({player:liveGamePlayer, state:liveGamePlayer.state, force:true});
    }
    const targetShipId = String(payload?.shipId || "");
    const spawnSession = buildFirmSpawnSession({
      shipId:targetShipId,
      firmId:location.firmId,
      state:liveGamePlayer?.state || profileManager.getWorldSessionForPlayer(player),
      savedSession:profileManager.getShipWorldSessionForPlayer(player, targetShipId)
    });
    const result = profileManager.setActiveShipForPlayer({
      player,
      shipId:targetShipId,
      worldSession:spawnSession
    });
    if(!result.ok){
      socket.emit("ship:equip-error", {message:result.reason || "Changement de vaisseau impossible."});
      return;
    }
    let syncedProfile = result.profile || null;
    if(liveGamePlayer?.state){
      liveGamePlayer.state = {
        ...liveGamePlayer.state,
        ...spawnSession,
        shipId:result.shipId,
        updatedAt:Date.now()
      };
      liveGamePlayer.shipSwitchLockUntil = Date.now() + 900;
      liveGamePlayer.mapId = spawnSession.mapId;
      const gameSocket = io.sockets.sockets.get(liveGamePlayer.id);
      if(gameSocket) setPlayerMap(gameSocket, spawnSession.mapId);
      syncedProfile = profileManager.saveWorldSession({player:liveGamePlayer, state:liveGamePlayer.state, force:true}) || syncedProfile;
    }
    const event = {
      shipId:result.shipId,
      homeMap:location.homeMap,
      mapId:spawnSession.mapId,
      x:spawnSession.x,
      y:spawnSession.y,
      source:location.source,
      at:Date.now()
    };
    if(result.claimedQuests?.length) emitQuestClaims?.(player, result.claimedQuests, {auto:true});
    for(const accountPlayer of accountSocketsForPlayer(player)){
      const accountSocket = io.sockets.sockets.get(accountPlayer.id);
      if(!accountSocket) continue;
      accountSocket.emit("ship:active-equipped", event);
      if(accountPlayer.clientMode === "game"){
        accountSocket.emit("player:resume", spawnSession);
      }
      if(syncedProfile) accountSocket.emit("profile:sync", syncedProfile);
    }
  });

  socket.on("equipment:equip", payload=>{
    if(!guard("equipment:equip")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"equip",
        type:String(payload?.type || ""),
        index:payload?.index,
        inventoryUid:String(payload?.inventoryUid || ""),
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Equipement impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"equip", target:result.target || null, item:result.item || null, at:Date.now()});
  });

  socket.on("equipment:unequip-slot", payload=>{
    if(!guard("equipment:unequip-slot")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"unequip-slot",
        type:String(payload?.type || ""),
        index:payload?.index,
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Retrait impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"unequip-slot", at:Date.now()});
  });

  socket.on("equipment:unequip-ship", payload=>{
    if(!guard("equipment:unequip-ship")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"unequip-ship",
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Retrait impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"unequip-ship", shipId:result.shipId, count:result.count || 0, at:Date.now()});
  });

  socket.on("equipment:unequip-inventory", payload=>{
    if(!guard("equipment:unequip-inventory")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"unequip-inventory",
        inventoryUid:String(payload?.inventoryUid || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Retrait impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"unequip-inventory", at:Date.now()});
  });

  socket.on("equipment:drone-upgrade", payload=>{
    if(!guard("equipment:drone-upgrade")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const location = canChangeEquipmentAtFirmSpawn(player);
    if(!location.ok){
      socket.emit("equipment:error", {message:location.reason || "Modification d'equipement impossible."});
      return;
    }
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"drone-upgrade",
        index:payload?.index,
        inventoryUid:String(payload?.inventoryUid || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Amelioration impossible."});
      return;
    }
    finishEquipmentChangeAtFirmSpawn(player, location, result, {action:"drone-upgrade", target:result.target || null, item:result.item || null, at:Date.now()});
  });

  socket.on("equipment:upgrade", payload=>{
    if(!guard("equipment:upgrade")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEquipmentAction({
      player,
      action:{
        kind:"equipment-upgrade",
        itemId:String(payload?.itemId || ""),
        materialSource:String(payload?.materialSource || ""),
        shipId:String(payload?.shipId || "")
      }
    });
    if(!result.ok){
      socket.emit("equipment:error", {message:result.reason || "Amelioration impossible."});
      return;
    }
    socket.emit("equipment:updated", {
      action:"equipment-upgrade",
      item:result.item || null,
      level:result.level,
      cost:result.cost,
      materialSource:result.materialSource,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });
}
