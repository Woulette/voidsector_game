import { getAmmoPurchase, getBetaPackPurchase, getBoosterPurchase, getDroneFormationPurchase, getDronePurchase, getItemPurchase, getPremiumPackPurchase, getShipPurchase } from "../economy/shop.js";
import { premiumRemainingLabel } from "../../../src/data/premium.js";
import { confirmProfileSave } from "./profileSaveGuard.js";

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

async function ensureSaved(socket, result, eventName){
  return confirmProfileSave(socket, result, {eventName});
}

export function registerEconomyHandlers(socket, context){
  const {emitProfileSync, emitQuestClaims:emitQuestClaimsForPlayer, emitTutorialUpdate, guard, players, profileManager} = context;

  socket.on("space-caster:run", async payload=>{
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
    if(!await ensureSaved(socket, result, "space-caster:error")) return;
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

  socket.on("refinery:upgrade-start", async payload=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
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
    emitTutorialUpdate?.(player, result, {source:"refinery:upgrade-start"});
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:upgrade-rush", async payload=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
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

  socket.on("refinery:production-toggle", async payload=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
    socket.emit("refinery:updated", {
      action:"production-toggle",
      id:result.id,
      enabled:result.enabled,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:job-start", async payload=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
    socket.emit("refinery:updated", {action:"job-start", recipe:result.recipe, at:Date.now()});
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:job-claim", async ()=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
    socket.emit("refinery:updated", {action:"job-claim", recipe:result.recipe, at:Date.now()});
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:shipment-start", async payload=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
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

  socket.on("refinery:shipment-rush", async ()=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
    socket.emit("refinery:updated", {
      action:"shipment-rush",
      materialName:result.materialName,
      amount:result.amount,
      cost:result.cost,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("refinery:ship-cargo-refine", async payload=>{
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
    if(!await ensureSaved(socket, result, "refinery:error")) return;
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

  socket.on("refinery:combat-boost-deposit", async payload=>{
    if(!guard("refinery:combat-boost-deposit")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{
        kind:"combat-boost-deposit",
        target:payload?.target,
        materialId:payload?.materialId,
        amount:payload?.amount,
        shipId:payload?.shipId
      }
    });
    if(!result.ok){
      socket.emit("refinery:error", {message:result.reason || "Perfectionnement impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "refinery:error")) return;
    socket.emit("refinery:updated", {
      action:"combat-boost-deposit",
      target:result.target,
      materialId:result.materialId,
      materialName:result.materialName,
      amount:result.amount,
      added:result.added,
      field:result.field,
      percent:result.percent,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("commerce:sell-material", async payload=>{
    if(!guard("commerce:sell-material")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyEconomyAction({
      player,
      action:{
        kind:"commerce-material-sell",
        materialId:payload?.materialId,
        amount:payload?.amount,
        all:Boolean(payload?.all),
        shipId:payload?.shipId
      }
    });
    if(!result.ok){
      socket.emit("commerce:error", {message:result.reason || "Vente impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "commerce:error")) return;
    socket.emit("commerce:material-sold", {
      all:Boolean(result.all),
      entries:result.entries || [],
      material:result.material || null,
      amount:result.amount,
      unitPrice:result.unitPrice,
      credits:result.credits,
      shipId:result.shipId,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-ammo", async payload=>{
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
    if(!await ensureSaved(socket, result, "shop:error")) return;
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

  socket.on("shop:buy-item", async payload=>{
    if(!guard("shop:buy-item")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getItemPurchase(payload?.id, payload?.multiplier);
    if(!purchase){
      socket.emit("shop:error", {message:"Objet inconnu."});
      return;
    }
    const result = profileManager.addItemPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "shop:error")) return;
    socket.emit("shop:item-bought", {
      id:purchase.id,
      name:purchase.name,
      quantity:purchase.quantity,
      multiplier:purchase.multiplier,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-booster", async payload=>{
    if(!guard("shop:buy-booster")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getBoosterPurchase(payload?.id, payload?.quantity);
    if(!purchase){
      socket.emit("shop:error", {message:"Booster S1 inconnu."});
      return;
    }
    const result = profileManager.addBoosterPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat du booster impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "shop:error")) return;
    socket.emit("shop:booster-bought", {
      id:purchase.id,
      type:purchase.type,
      name:purchase.name,
      series:"S1",
      quantity:purchase.quantity,
      durationMs:purchase.totalDurationMs,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-premium-pack", async payload=>{
    if(!guard("shop:buy-premium-pack")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getPremiumPackPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Pack premium inconnu."});
      return;
    }
    const result = profileManager.addPremiumPackPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat premium impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "shop:error")) return;
    socket.emit("shop:premium-pack-bought", {
      id:purchase.id,
      name:purchase.name,
      days:purchase.days,
      priceType:purchase.priceType,
      price:result.cost,
      basePrice:purchase.totalPrice,
      remaining:premiumRemainingLabel(result.profile?.player),
      premiumUntil:result.profile?.player?.premiumUntil || 0,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-beta-pack", async payload=>{
    if(!guard("shop:buy-beta-pack")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getBetaPackPurchase(payload?.id, payload?.shipChoice);
    if(!purchase){
      socket.emit("shop:error", {message:"Pack beta inconnu."});
      return;
    }
    const result = profileManager.addBetaPackPurchase({player, purchase});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat beta impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "shop:error")) return;
    socket.emit("shop:beta-pack-bought", {
      id:purchase.id,
      name:purchase.name,
      realPrice:purchase.realPrice || "",
      shipChoice:purchase.shipChoice || "",
      launchEntitlements:purchase.launchEntitlements || [],
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("premium:reward-claim", async ()=>{
    if(!guard("premium:reward-claim")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.claimPremiumReward({player});
    if(!result.ok){
      socket.emit("premium:reward-error", {message:result.reason || "Recompense premium impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "premium:reward-error")) return;
    socket.emit("premium:reward-claimed", {
      day:result.day,
      reward:result.reward,
      state:result.state,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("beta:reward-claim", async ()=>{
    if(!guard("beta:reward-claim")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.claimBetaReward({player});
    if(!result.ok){
      socket.emit("beta:reward-error", {message:result.reason || "Recompense beta impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "beta:reward-error")) return;
    socket.emit("beta:reward-claimed", {
      day:result.day,
      reward:result.reward,
      state:result.state,
      randomShip:result.randomShip || "",
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-ship", async payload=>{
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
    if(!await ensureSaved(socket, result, "shop:error")) return;
    socket.emit("shop:ship-bought", {
      id:purchase.id,
      name:purchase.name,
      priceType:purchase.priceType,
      price:purchase.totalPrice,
      at:Date.now()
    });
    emitQuestClaims(player, emitQuestClaimsForPlayer, result);
    emitProfileSync(player, result.profile);
  });

  socket.on("shop:buy-drone", async payload=>{
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
    if(!await ensureSaved(socket, result, "shop:error")) return;
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

  socket.on("shop:buy-drone-formation", async payload=>{
    if(!guard("shop:buy-drone-formation")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const purchase = getDroneFormationPurchase(payload?.id);
    if(!purchase){
      socket.emit("shop:error", {message:"Formation inconnue."});
      return;
    }
    const result = profileManager.addDroneFormationPurchase({player, purchase, owned:Boolean(payload?.owned)});
    if(!result.ok){
      socket.emit("shop:error", {message:result.reason || "Achat impossible."});
      return;
    }
    if(!await ensureSaved(socket, result, "shop:error")) return;
    socket.emit("shop:drone-formation-bought", {
      id:purchase.id,
      name:purchase.name,
      owned:Boolean(result.owned),
      priceType:purchase.priceType,
      price:result.owned ? 0 : purchase.totalPrice,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("inventory:sell-item", async payload=>{
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
    if(!await ensureSaved(socket, result, "inventory:error")) return;
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
