function serialize(value){
  return JSON.stringify(value ?? null);
}

function pick(state, keys){
  return serialize(keys.map(key=>state?.[key]));
}

export function captureProfileUiState(state = {}){
  return {
    loadout:pick(state, [
      "activeShip",
      "shipLoadouts",
      "equipmentUpgrades",
      "droneLoadout",
      "dronePermanentUpgrades",
      "activeDroneFormation",
      "skillRanks",
      "skillLevels"
    ]),
    actionBar:pick(state, [
      "activeShip",
      "actionSlots",
      "actionSlotsByShip",
      "inventoryItems",
      "ammoInventory",
      "shipLoadouts"
    ]),
    panels:pick(state, [
      "activeQuestIds",
      "activeQuestId",
      "questProgress",
      "questFailProgress",
      "completedQuestClaims",
      "refineryLevels",
      "refineryModules",
      "refineryUpgradeJobs",
      "refineryProductionDisabled",
      "refineryShipmentJob",
      "refineryJob",
      "inventoryItems"
    ]),
    layout:serialize(state.uiLayout)
  };
}

export function getProfileUiChanges(before, after){
  return {
    loadoutChanged:before.loadout !== after.loadout,
    actionBarChanged:before.actionBar !== after.actionBar,
    panelsChanged:before.panels !== after.panels,
    layoutChanged:before.layout !== after.layout
  };
}

export function hasProfileUiChanges(changes = {}){
  return Boolean(changes.loadoutChanged || changes.actionBarChanged || changes.panelsChanged || changes.layoutChanged);
}
