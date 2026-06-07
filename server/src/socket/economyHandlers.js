import { getAmmoPurchase, getDroneFormationPurchase, getDronePurchase, getItemPurchase, getShipPurchase } from "../economy/shop.js";

function emitQuestProgress(socket, result){
  if(!result.questUpdates?.length) return;
  socket.emit("quest:progress", {
    updates:result.questUpdates,
    at:Date.now()
  });
}

function emitQuestClaims(player, emitQuestClaimsForPlayer, result){
  if(!result.claimedQuests?.length) return;
  emitQuestClaimsForPlayer?.(player, result.claimedQuests, {auto:true});
}

export function registerEconomyHandlers(socket, context){
  const {emitProfileSync, emitQuestClaims:emitQuestClaimsForPlayer, guard, players, profileManager} = context;

  socket.on("space-caster:run", payload=>{
    if(!guard("space-caster:run")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"space-caster", portalId:payload?.portalId, count:payload?.count}
    });
    if(!result.ok){
      socket.emit("space-caster:error", {message:result.reason || "Space Caster impossible."});
      return;
    }
    socket.emit("space-caster:result", {
      portal:result.portal,
      count:result.count,
      cost:result.cost,
      rewards:result.rewards,
      at:Date.now()
    });
    emitQuestProgress(socket, result);
    emitQuestClaims(player, emitQuestClaimsForPlayer, result);
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:upgrade-start", payload=>{
    if(!guard("refinery:upgrade-start")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-upgrade-start", type:payload?.type, id:payload?.id}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Amelioration impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"upgrade-start",
      type:result.type,
      id:result.id,
      name:result.name,
      level:result.level,
      duration:result.duration,
      at:Date.now()
    });
    emitQuestProgress(socket, result);
    emitQuestClaims(player, emitQuestClaimsForPlayer, result);
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:upgrade-rush", payload=>{
    if(!guard("refinery:upgrade-rush")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-upgrade-rush", type:payload?.type, id:payload?.id}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Acceleration impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"upgrade-rush",
      type:result.type,
      id:result.id,
      name:result.name,
      level:result.level,
      cost:result.cost,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:production-toggle", payload=>{
    if(!guard("refinery:production-toggle")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-production-toggle", id:payload?.id}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Production impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"production-toggle",
      id:result.id,
      enabled:result.enabled,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:job-start", payload=>{
    if(!guard("refinery:job-start")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-job-start", recipeId:payload?.recipeId}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Raffinage impossible."});
      return;
    }
    socket.emit("refinery:updated", {action:"job-start", recipe:result.recipe, at:Date.now()});
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:job-claim", ()=>{
    if(!guard("refinery:job-claim")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-job-claim"}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Recuperation impossible."});
      return;
    }
    socket.emit("refinery:updated", {action:"job-claim", recipe:result.recipe, at:Date.now()});
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:shipment-start", payload=>{
    if(!guard("refinery:shipment-start")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{
        kind:"refinery-shipment-start",
        materialId:payload?.materialId,
        amount:payload?.amount,
        shipId:payload?.shipId
      }
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Expedition impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"shipment-start",
      material:result.material,
      amount:result.amount,
      ship:result.ship,
      credits:result.credits,
      duration:result.duration,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:shipment-rush", ()=>{
    if(!guard("refinery:shipment-rush")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{kind:"refinery-shipment-rush"}
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Acceleration expedition impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"shipment-rush",
      materialName:result.materialName,
      amount:result.amount,
      cost:result.cost,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:ship-cargo-refine", payload=>{
    if(!guard("refinery:ship-cargo-refine")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{
        kind:"ship-cargo-refine",
        recipeId:payload?.recipeId,
        amount:payload?.amount,
        shipId:payload?.shipId
      }
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Fusion impossible."});
      return;
    }
    socket.emit("refinery:updated", {
      action:"ship-cargo-refine",
      recipe:result.recipe,
      output:result.output,
      amount:result.amount,
      outputAmount:result.outputAmount,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-ammo", payload=>{
    if(!guard("shop:buy-ammo")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getAmmoPurchase(payload?.id, payload?.multiplier);
    if(!purchase){
      socket.emit("shop:error", {message:"Munition inconnue."});
      return;
    }
    const result = profileManager.addAmmoPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:ammo-bought", {
      id:purchase.id,
      name:purchase.name,
      amount:purchase.totalAmount,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      multiplier:purchase.multiplier,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-item", payload=>{
    if(!guard("shop:buy-item")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getItemPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Objet inconnu."});
      return;
    }
    const result = profileManager.addItemPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:item-bought", {
      id:purchase.id,
      name:purchase.name,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-ship", payload=>{
    if(!guard("shop:buy-ship")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getShipPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Vaisseau inconnu."});
      return;
    }
    const result = profileManager.addShipPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:ship-bought", {
      id:purchase.id,
      name:purchase.name,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-drone", payload=>{
    if(!guard("shop:buy-drone")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getDronePurchase({id:payload?.id || "combat_drone", ownedCount:payload?.ownedCount});
    if(!purchase){
      socket.emit("shop:error", {message:"Drone inconnu."});
      return;
    }
    if(purchase.locked){
      socket.emit("shop:error", {message:purchase.reason || "Drone indisponible."});
      return;
    }
    const result = profileManager.addDronePurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:drone-bought", {
      id:purchase.id,
      name:purchase.name,
      ownedCount:purchase.ownedCount,
      nextCount:purchase.nextCount,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-drone-formation", payload=>{
    if(!guard("shop:buy-drone-formation")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getDroneFormationPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Formation inconnue."});
      return;
    }
    const alreadyOwned = Boolean(payload?.owned);
    const result = profileManager.addDroneFormationPurchase({player, purchase, owned:alreadyOwned});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    socket.emit("shop:drone-formation-bought", {
      id:purchase.id,
      name:purchase.name,
      owned:alreadyOwned,
      priceType:purchase.priceType,
      price:alreadyOwned ? 0 : purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("inventory:sell-item", payload=>{
    if(!guard("inventory:sell-item")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.sellInventoryItem({
      player,
      inventoryUid:payload?.inventoryUid
    });
    if(!result.ok){
      socket.emit("inventory:error", {message:result.reason || "Vente impossible."});
      return;
    }
    socket.emit("inventory:item-sold", {
      inventoryUid:result.inventoryUid,
      item:result.item,
      priceType:result.priceType,
      amount:result.amount,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });
}
