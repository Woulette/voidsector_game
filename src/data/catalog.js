export { ships } from "./ships.js";
export { ammoTypes, droneCatalog, equipment } from "./equipment.js";
export { pageText, portals, questCatalog, rawMaterialCatalog, refineryRecipes, skills } from "./progression.js";

export const defaultState = {
  player:{name:"NOVA-37", level:1, xp:0, xpNext:100, credits:85000, premium:20, skillPoints:3, totalXp:0, totalKills:0, rankScore:0},
  activeShip:"orion",
  selectedShip:"orion",
  ownedShips:["orion"],
  ownedItems:["laser_mk1"],
  inventoryItems:[{uid:"inv_laser_mk1_1", itemId:"laser_mk1"}],
  nextInventoryUid:2,
  shipLoadouts:{orion:{lasers:["inv_laser_mk1_1"], generators:[], extras:[]}},
  droneLoadout:[],
  ownedDroneCount:0,
  ammoInventory:{ammo_x1:2500},
  actionSlots:["ammo_x1", null, null, null, null, null, null, null, null],
  slotKeybinds:["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9"],
  portalPieces:{blue:0,violet:0,red:0,emerald:0,void:0,ancient:0},
  unlockedPortals:[],
  completedPortals:{},
  unlockedSkills:[],
  skillLevels:{damage:0, shield:0, utility:0},
  cargoHold:{
    cuivre_orbital:0,
    zinc_spatial:0,
    nickel_brut:0,
    titane_fissure:0,
    silice_conductrice:0,
    alliage_cuivre_zinc:0,
    plaque_nickel_titane:0,
    conducteur_renforce:0,
    blindage_composite:0,
    catalyseur_quantique:0,
    noyau_astra:0
  },
  shipCargo:{},
  refineryLevels:{},
  refineryProductionDisabled:{},
  refineryModules:{storage:1, transport:1},
  refineryUpgradeJobs:{},
  refineryShipmentJob:null,
  refineryLastTick:Date.now(),
  refineryJob:null,
  equipmentUpgrades:{},
  activeQuestIds:[],
  activeQuestId:null,
  questProgress:{},
  completedQuestClaims:{},
  uiLayout:{
    combatUtilityPanel:null,
    combatUtilityPanels:{},
    miniMap:null
  }
};
