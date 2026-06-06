export function createCombatServerActions({
  multiplayer,
  getActiveShipId,
  getAllQuests,
  getRefineryRecipes,
  getEquipmentUpgradeLevel,
  acceptServerQuest,
  claimServerQuest,
  refineServerShipCargo,
  upgradeServerEquipment,
  acceptQuest,
  claimQuest,
  refineShipCargoRecipe,
  upgradeEquipment
}){
  function acceptQuestAction(questId){
    if(multiplayer.connected && acceptServerQuest(questId)){
      const quest = getAllQuests().find(entry=>entry.id === questId) || {id:questId, title:"quete serveur"};
      const local = acceptQuest(questId);
      return local.ok ? {...local, serverPending:true} : {ok:true, quest, serverPending:true};
    }
    return acceptQuest(questId);
  }

  function claimQuestAction(questId){
    if(multiplayer.connected && claimServerQuest(questId)){
      const quest = getAllQuests().find(entry=>entry.id === questId) || {id:questId, title:"quete serveur"};
      return {ok:true, quest, serverPending:true};
    }
    return claimQuest(questId);
  }

  function refineShipCargoRecipeAction(recipeId, amount = 1){
    if(multiplayer.connected && refineServerShipCargo({recipeId, amount, shipId:getActiveShipId()})){
      const recipe = getRefineryRecipes().find(entry=>entry.id === recipeId) || {id:recipeId, outputId:"materiau"};
      return {ok:true, recipe, output:null, outputAmount:0, serverPending:true};
    }
    return refineShipCargoRecipe(recipeId, amount);
  }

  function upgradeEquipmentAction(itemId, options = {}){
    if(multiplayer.connected && upgradeServerEquipment({
      itemId,
      materialSource:options.materialSource === "shipCargo" ? "shipCargo" : "cargoHold",
      shipId:options.shipId || getActiveShipId()
    })){
      return {ok:true, level:getEquipmentUpgradeLevel(itemId) + 1, serverPending:true};
    }
    return upgradeEquipment(itemId, options);
  }

  return {
    acceptQuestAction,
    claimQuestAction,
    refineShipCargoRecipeAction,
    upgradeEquipmentAction
  };
}
