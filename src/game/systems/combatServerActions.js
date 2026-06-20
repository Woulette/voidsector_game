import { MMO_REQUIRED_MESSAGE, isMmoConnected } from "../../app/mmoGate.js";

export function createCombatServerActions({
  multiplayer,
  getActiveShipId,
  getAllQuests,
  getRefineryRecipes,
  getEquipmentUpgradeLevel,
  acceptServerQuest,
  claimServerQuest,
  refineServerShipCargo,
  upgradeServerEquipment
}){
  function acceptQuestAction(questId){
    const quest = getAllQuests().find(entry=>entry.id === questId);
    if(!quest) return {ok:false, reason:"Quete inconnue."};
    if(!isMmoConnected(multiplayer)) return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    if(acceptServerQuest(questId)) return {ok:true, quest, serverPending:true};
    return {ok:false, reason:"Acceptation serveur impossible."};
  }

  function claimQuestAction(questId){
    if(isMmoConnected(multiplayer) && claimServerQuest(questId)){
      const quest = getAllQuests().find(entry=>entry.id === questId) || {id:questId, title:"quete serveur"};
      return {ok:true, quest, serverPending:true};
    }
    return {ok:false, reason:MMO_REQUIRED_MESSAGE};
  }

  function refineShipCargoRecipeAction(recipeId, amount = 1){
    if(isMmoConnected(multiplayer) && refineServerShipCargo({recipeId, amount, shipId:getActiveShipId()})){
      const recipe = getRefineryRecipes().find(entry=>entry.id === recipeId) || {id:recipeId, outputId:"materiau"};
      return {ok:true, recipe, output:null, outputAmount:0, serverPending:true};
    }
    return {ok:false, reason:MMO_REQUIRED_MESSAGE};
  }

  function upgradeEquipmentAction(itemId, options = {}){
    if(isMmoConnected(multiplayer) && upgradeServerEquipment({
      itemId,
      materialSource:options.materialSource === "shipCargo" ? "shipCargo" : "cargoHold",
      shipId:options.shipId || getActiveShipId()
    })){
      return {ok:true, level:getEquipmentUpgradeLevel(itemId) + 1, serverPending:true};
    }
    return {ok:false, reason:MMO_REQUIRED_MESSAGE};
  }

  return {
    acceptQuestAction,
    claimQuestAction,
    refineShipCargoRecipeAction,
    upgradeEquipmentAction
  };
}
