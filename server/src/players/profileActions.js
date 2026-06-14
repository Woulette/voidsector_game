import { applyDronePermanentUpgrade, applyEquipmentUpgrade, equipInventoryUid, findEquippedSlot, getServerItem, unequipInventoryUid, unequipShipLoadout, unequipSlot } from "../economy/equipment.js";
import { claimServerRefineryJob, completeServerRefineryShipment, completeServerRefineryUpgrades, refineServerShipCargoRecipe, rushServerRefineryShipment, rushServerRefineryUpgrade, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, toggleServerRefineryProduction } from "../economy/refinery.js";
import { runServerSpaceCaster } from "../economy/spaceCaster.js";
import { acceptServerQuest, claimCompletedServerQuests, claimServerQuest, progressServerQuestAction, progressServerQuestKill, trackServerQuest } from "../quests/quests.js";
import { checkServerQuestTimers, recordServerQuestDeath, recordServerQuestHpLoss } from "../quests/questFailures.js";
import { spendCurrency } from "./progression.js";
import { performServerPrestige, unlockServerPortal, upgradeServerSkill } from "./progressionActions.js";
import { sanitizeProfile } from "./profileSanitize.js";
import { addInventoryItemAmount } from "../economy/inventoryStacks.js";
import { appendProfileActivity } from "./activityLog.js";
import { depositServerCombatBoostMaterial } from "../economy/combatBoosts.js";

export function createProfileActions({profiles, persist, getExistingProfile}){
  function spendAndUpdate({player, priceType, amount, update, activity} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const result = spendCurrency(profile.player || {}, priceType, amount);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now(),
      player:result.player
    });
    if(typeof update === "function") update(next);
    if(activity) appendProfileActivity(next, activity);
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }
  
  function addAmmoPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!profile.ammoInventory || typeof profile.ammoInventory !== "object") profile.ammoInventory = {};
        profile.ammoInventory[purchase.id] = Math.max(0, Number(profile.ammoInventory[purchase.id] || 0)) + Math.max(0, Number(purchase.totalAmount || 0));
      },
      activity:{
        type:"shop_purchase",
        label:"Achat munitions",
        detail:`${purchase?.id || "munition"} x${Math.max(0, Number(purchase?.totalAmount || 0))} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{itemId:purchase?.id || "", amount:Number(purchase?.totalAmount || 0), price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }
  
  function addItemPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        addInventoryItemAmount(profile, purchase.id, 1);
      },
      activity:{
        type:"shop_purchase",
        label:"Achat objet",
        detail:`${purchase?.id || "objet"} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{itemId:purchase?.id || "", price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }
  
  function addShipPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!Array.isArray(profile.ownedShips)) profile.ownedShips = ["orion", "test_runner"];
        if(!profile.ownedShips.includes(purchase.id)) profile.ownedShips.push(purchase.id);
        if(!profile.shipLoadouts || typeof profile.shipLoadouts !== "object") profile.shipLoadouts = {};
        if(!profile.shipLoadouts[purchase.id]) profile.shipLoadouts[purchase.id] = {lasers:[], generators:[], extras:[]};
      },
      activity:{
        type:"ship_purchase",
        label:"Achat vaisseau",
        detail:`${purchase?.id || "vaisseau"} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{shipId:purchase?.id || "", price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }
  
  function addDronePurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        profile.ownedDroneCount = Math.max(Number(profile.ownedDroneCount || 0), Number(purchase.nextCount || 0));
        if(!Array.isArray(profile.droneLoadout)) profile.droneLoadout = [];
        while(profile.droneLoadout.length < profile.ownedDroneCount) profile.droneLoadout.push(null);
        if(profile.droneLoadout.length > profile.ownedDroneCount) profile.droneLoadout.length = profile.ownedDroneCount;
      },
      activity:{
        type:"drone_purchase",
        label:"Achat drone",
        detail:`Drone ${Math.max(0, Number(purchase?.nextCount || 0))} pour ${Math.max(0, Number(purchase?.totalPrice || 0))} ${purchase?.priceType || "credits"}.`,
        data:{nextCount:Number(purchase?.nextCount || 0), price:Number(purchase?.totalPrice || 0), priceType:purchase?.priceType || "credits"}
      }
    });
  }
  
  function addDroneFormationPurchase({player, purchase} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    const alreadyOwned = Array.isArray(profile.ownedDroneFormations) && profile.ownedDroneFormations.includes(purchase.id);
    const result = spendCurrency(profile.player || {}, purchase?.priceType, alreadyOwned ? 0 : purchase?.totalPrice);
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now(),
      player:result.player
    });
    if(!Array.isArray(next.ownedDroneFormations)) next.ownedDroneFormations = ["base"];
    if(!next.ownedDroneFormations.includes("base")) next.ownedDroneFormations.unshift("base");
    if(!next.ownedDroneFormations.includes(purchase.id)) next.ownedDroneFormations.push(purchase.id);
    next.activeDroneFormation = purchase.id;
    appendProfileActivity(next, {
      type:"drone_formation",
      label:"Formation drone",
      detail:`Formation ${purchase?.id || "drone"} ${alreadyOwned ? "equipee" : "achetee"}.`,
      data:{formationId:purchase?.id || "", owned:alreadyOwned}
    });
    const finalProfile = sanitizeProfile(next);
    profiles.set(key, finalProfile);
    persist();
    return {...result, profile:finalProfile, owned:alreadyOwned};
  }

  function getSaleValue(item){
    if(!item || item.shop === false || item.category === "quest_item") return null;
    const price = Math.max(0, Math.round(Number(item.price || 0)));
    if(price <= 0) return null;
    return {
      priceType:item.priceType === "premium" ? "premium" : "credits",
      amount:Math.max(1, Math.floor(price * 0.35))
    };
  }

  function sellInventoryItem({player, inventoryUid} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const uid = String(inventoryUid || "");
    if(!uid) return {ok:false, reason:"Objet invalide."};
    const {key, profile} = getExistingProfile(player);
    const entryIndex = Array.isArray(profile.inventoryItems)
      ? profile.inventoryItems.findIndex(entry=>entry?.uid === uid)
      : -1;
    if(entryIndex < 0) return {ok:false, reason:"Objet introuvable."};
    if(findEquippedSlot(profile, uid)) return {ok:false, reason:"Des equipe l'objet avant de le vendre."};
    const entry = profile.inventoryItems[entryIndex];
    const item = getServerItem(entry.itemId);
    const value = getSaleValue(item);
    if(!value) return {ok:false, reason:"Objet non vendable."};
    if(!profile.player || typeof profile.player !== "object") profile.player = {};
    const currencyKey = value.priceType === "premium" ? "premium" : "credits";
    profile.player[currencyKey] = Math.max(0, Number(profile.player[currencyKey] || 0)) + value.amount;
    profile.inventoryItems.splice(entryIndex, 1);
    appendProfileActivity(profile, {
      type:"inventory_sale",
      label:"Vente objet",
      detail:`${item.name || item.id} vendu pour ${value.amount} ${value.priceType}.`,
      data:{itemId:item.id, amount:value.amount, priceType:value.priceType}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {
      ok:true,
      item:{id:item.id, name:item.name},
      inventoryUid:uid,
      priceType:value.priceType,
      amount:value.amount,
      profile:next
    };
  }
  
  function applyEquipmentAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
    if(action?.kind === "equip"){
      result = equipInventoryUid(profile, action);
    }else if(action?.kind === "unequip-slot"){
      result = unequipSlot(profile, action);
    }else if(action?.kind === "unequip-ship"){
      result = unequipShipLoadout(profile, action);
    }else if(action?.kind === "unequip-inventory"){
      result = unequipInventoryUid(profile, String(action.inventoryUid || ""))
        ? {ok:true}
        : {ok:false, reason:"Objet deja retire."};
    }else if(action?.kind === "drone-upgrade"){
      result = applyDronePermanentUpgrade(profile, action);
    }else if(action?.kind === "equipment-upgrade"){
      result = applyEquipmentUpgrade(profile, action);
    }else{
      result = {ok:false, reason:"Action equipement invalide."};
    }
    if(!result.ok) return result;
    const claimedQuests = claimCompletedServerQuests(profile).claimed || [];
    appendProfileActivity(profile, {
      type:"equipment",
      label:"Equipement",
      detail:`Action ${action?.kind || "equipement"} appliquee${action?.type ? ` sur ${action.type}` : ""}.`,
      data:{kind:action?.kind || "", type:action?.type || "", itemId:action?.itemId || action?.inventoryUid || ""}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, claimedQuests, profile:next};
  }
  
  function setActiveShipForPlayer({player, shipId, worldSession = null} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const cleanShipId = String(shipId || "");
    const {key, profile} = getExistingProfile(player);
    if(!cleanShipId) return {ok:false, reason:"Vaisseau invalide."};
    if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.map(String).includes(cleanShipId)){
      return {ok:false, reason:"Vaisseau non possede."};
    }
    const draft = sanitizeProfile({
      ...profile,
      activeShip:cleanShipId,
      selectedShip:cleanShipId,
      ...(worldSession ? {worldSession} : {}),
      ...(worldSession ? {shipWorldSessions:{
        ...(profile.shipWorldSessions || {}),
        [String(worldSession.shipId || cleanShipId)]:worldSession
      }} : {}),
      updatedAt:Date.now()
    });
    appendProfileActivity(draft, {
      type:"ship_switch",
      label:"Changement vaisseau",
      detail:`Vaisseau actif : ${cleanShipId}.`,
      data:{shipId:cleanShipId}
    });
    const claimedQuests = claimCompletedServerQuests(draft).claimed || [];
    if(claimedQuests.length) draft.updatedAt = Date.now();
    const next = sanitizeProfile(draft);
    profiles.set(key, next);
    persist();
    return {ok:true, shipId:cleanShipId, claimedQuests, profile:next};
  }
  
  function applyQuestAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
    let claimedQuests = [];
    if(action?.kind === "accept"){
      result = acceptServerQuest(profile, action.questId);
    }else if(action?.kind === "track"){
      result = trackServerQuest(profile, action.questId);
    }else if(action?.kind === "claim"){
      result = claimServerQuest(profile, action.questId);
    }else if(action?.kind === "kill"){
      result = progressServerQuestKill(profile, {
        kind:action.enemyKind,
        zoneName:action.zoneName
      });
    }else if(action?.kind === "progress"){
      result = progressServerQuestAction(profile, action);
    }else if(action?.kind === "hp-loss"){
      result = recordServerQuestHpLoss(profile, action.amount);
    }else if(action?.kind === "death"){
      result = recordServerQuestDeath(profile);
    }else if(action?.kind === "timer-check"){
      result = checkServerQuestTimers(profile, action.now);
    }else{
      result = {ok:false, reason:"Action quete invalide."};
    }
    if(!result.ok) return result;
    if(action?.kind === "claim") claimedQuests = result.claimedQuests || [];
    if(action?.kind === "kill" || action?.kind === "progress"){
      const completedIds = [...new Set((result.updates || [])
        .filter(update=>update?.completed)
        .map(update=>String(update.questId || update.id || ""))
        .filter(Boolean))];
      if(completedIds.length) claimedQuests = claimCompletedServerQuests(profile, completedIds).claimed || [];
    }
    if((action?.kind === "timer-check" || action?.kind === "death") && !result.changed) return result;
    if(action?.kind !== "timer-check"){
      appendProfileActivity(profile, {
        type:"quest",
        label:"Quete",
        detail:`Action ${action?.kind || "quete"}${action?.questId ? ` : ${action.questId}` : ""}.`,
        data:{kind:action?.kind || "", questId:action?.questId || "", claimed:claimedQuests.length}
      });
    }
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, claimedQuests, profile:next};
  }
  
  function applyEconomyAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    completeServerRefineryUpgrades(profile);
    completeServerRefineryShipment(profile);
    let result = null;
    let questProgress = null;
    let claimedQuests = [];
    if(action?.kind === "space-caster"){
      result = runServerSpaceCaster(profile, action);
      if(result.ok) questProgress = progressServerQuestAction(profile, {type:"space_caster_use", amount:result.count});
    }else if(action?.kind === "refinery-upgrade-start"){
      result = startServerRefineryUpgrade(profile, action);
      if(result.ok){
        questProgress = progressServerQuestAction(profile, {
          type:result.type === "module" ? "refinery_module_upgrade_start" : "refinery_material_upgrade_start",
          moduleId:result.type === "module" ? result.id : "",
          materialId:result.type === "material" ? result.id : "",
          targetLevel:result.level
        });
      }
    }else if(action?.kind === "refinery-upgrade-rush"){
      result = rushServerRefineryUpgrade(profile, action);
    }else if(action?.kind === "refinery-production-toggle"){
      result = toggleServerRefineryProduction(profile, action.id);
    }else if(action?.kind === "refinery-job-start"){
      result = startServerRefineryJob(profile, action);
    }else if(action?.kind === "refinery-job-claim"){
      result = claimServerRefineryJob(profile, action);
    }else if(action?.kind === "refinery-shipment-start"){
      result = startServerRefineryShipment(profile, action);
    }else if(action?.kind === "refinery-shipment-rush"){
      result = rushServerRefineryShipment(profile, action);
    }else if(action?.kind === "ship-cargo-refine"){
      result = refineServerShipCargoRecipe(profile, action);
    }else if(action?.kind === "combat-boost-deposit"){
      result = depositServerCombatBoostMaterial(profile, action);
    }else{
      result = {ok:false, reason:"Action economie invalide."};
    }
    if(!result.ok) return result;
    const completedIds = [...new Set((questProgress?.updates || [])
      .filter(update=>update?.completed)
      .map(update=>String(update.questId || update.id || ""))
      .filter(Boolean))];
    if(completedIds.length) claimedQuests = claimCompletedServerQuests(profile, completedIds).claimed || [];
    appendProfileActivity(profile, {
      type:"economy",
      label:"Economie",
      detail:`Action ${action?.kind || "economie"} appliquee.`,
      data:{kind:action?.kind || "", claimed:claimedQuests.length}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, questUpdates:questProgress?.updates || [], claimedQuests, profile:next};
  }
  
  function applyProgressionAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
    if(action?.kind === "skill-upgrade"){
      result = upgradeServerSkill(profile, action.id);
    }else if(action?.kind === "portal-unlock"){
      result = unlockServerPortal(profile, {id:action.id, method:action.method});
    }else if(action?.kind === "prestige"){
      result = performServerPrestige(profile);
    }else{
      result = {ok:false, reason:"Action progression invalide."};
    }
    if(!result.ok) return result;
    appendProfileActivity(profile, {
      type:"progression",
      label:"Progression",
      detail:`Action ${action?.kind || "progression"} appliquee${action?.id ? ` : ${action.id}` : ""}.`,
      data:{kind:action?.kind || "", id:action?.id || ""}
    });
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }
  
  return {addAmmoPurchase, addItemPurchase, addShipPurchase, addDronePurchase, addDroneFormationPurchase, sellInventoryItem, applyEquipmentAction, setActiveShipForPlayer, applyQuestAction, applyEconomyAction, applyProgressionAction};
}
