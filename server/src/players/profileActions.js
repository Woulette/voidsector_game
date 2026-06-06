import { applyDronePermanentUpgrade, applyEquipmentUpgrade, equipInventoryUid, unequipInventoryUid, unequipSlot } from "../economy/equipment.js";
import { claimServerRefineryJob, completeServerRefineryShipment, completeServerRefineryUpgrades, refineServerShipCargoRecipe, rushServerRefineryShipment, rushServerRefineryUpgrade, startServerRefineryJob, startServerRefineryShipment, startServerRefineryUpgrade, toggleServerRefineryProduction } from "../economy/refinery.js";
import { runServerSpaceCaster } from "../economy/spaceCaster.js";
import { acceptServerQuest, claimServerQuest, progressServerQuestAction, progressServerQuestKill, trackServerQuest } from "../quests/quests.js";
import { checkServerQuestTimers, recordServerQuestHpLoss } from "../quests/questFailures.js";
import { spendCurrency } from "./progression.js";
import { performServerPrestige, unlockServerPortal, upgradeServerSkill } from "./progressionActions.js";
import { sanitizeProfile } from "./profileSanitize.js";

export function createProfileActions({profiles, persist, getExistingProfile}){
  function spendAndUpdate({player, priceType, amount, update} = {}){
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
      }
    });
  }
  
  function addItemPurchase({player, purchase} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:purchase?.totalPrice,
      update:profile=>{
        if(!Array.isArray(profile.inventoryItems)) profile.inventoryItems = [];
        const nextUid = Math.max(1, Math.floor(Number(profile.nextInventoryUid || 1)));
        profile.inventoryItems.push({uid:`inv_${purchase.id}_${nextUid}`, itemId:purchase.id});
        profile.nextInventoryUid = nextUid + 1;
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
      }
    });
  }
  
  function addDroneFormationPurchase({player, purchase, owned = false} = {}){
    return spendAndUpdate({
      player,
      priceType:purchase?.priceType,
      amount:owned ? 0 : purchase?.totalPrice,
      update:profile=>{
        if(!Array.isArray(profile.ownedDroneFormations)) profile.ownedDroneFormations = ["base"];
        if(!profile.ownedDroneFormations.includes(purchase.id)) profile.ownedDroneFormations.push(purchase.id);
        profile.activeDroneFormation = purchase.id;
      }
    });
  }
  
  function applyEquipmentAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
    if(action?.kind === "equip"){
      result = equipInventoryUid(profile, action);
    }else if(action?.kind === "unequip-slot"){
      result = unequipSlot(profile, action);
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
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }
  
  function setActiveShipForPlayer({player, shipId, worldSession = null} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const cleanShipId = String(shipId || "");
    const {key, profile} = getExistingProfile(player);
    if(!cleanShipId) return {ok:false, reason:"Vaisseau invalide."};
    if(!Array.isArray(profile.ownedShips) || !profile.ownedShips.map(String).includes(cleanShipId)){
      return {ok:false, reason:"Vaisseau non possede."};
    }
    const next = sanitizeProfile({
      ...profile,
      activeShip:cleanShipId,
      selectedShip:cleanShipId,
      ...(worldSession ? {worldSession} : {}),
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {ok:true, shipId:cleanShipId, profile:next};
  }
  
  function applyQuestAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    let result = null;
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
    }else if(action?.kind === "timer-check"){
      result = checkServerQuestTimers(profile, action.now);
    }else{
      result = {ok:false, reason:"Action quete invalide."};
    }
    if(!result.ok) return result;
    if(action?.kind === "timer-check" && !result.changed) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }
  
  function applyEconomyAction({player, action} = {}){
    if(!player) return {ok:false, reason:"Joueur introuvable."};
    const {key, profile} = getExistingProfile(player);
    completeServerRefineryUpgrades(profile);
    completeServerRefineryShipment(profile);
    let result = null;
    let questProgress = null;
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
    }else{
      result = {ok:false, reason:"Action economie invalide."};
    }
    if(!result.ok) return result;
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, questUpdates:questProgress?.updates || [], profile:next};
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
    const next = sanitizeProfile({
      ...profile,
      updatedAt:Date.now()
    });
    profiles.set(key, next);
    persist();
    return {...result, profile:next};
  }
  
    return {addAmmoPurchase, addItemPurchase, addShipPurchase, addDronePurchase, addDroneFormationPurchase, applyEquipmentAction, setActiveShipForPlayer, applyQuestAction, applyEconomyAction, applyProgressionAction};
}
