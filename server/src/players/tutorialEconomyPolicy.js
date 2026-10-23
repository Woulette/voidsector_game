import { TUTORIAL_ROCKET_TRAINING_AMOUNT, TUTORIAL_STEPS, getTutorialQuestIds } from "../../../src/shared/tutorial.js";
import { getServerItem } from "../economy/equipment.js";
import { getInventoryEntryQuantity, getInventoryItemCount } from "../economy/inventoryStacks.js";
import { SERVER_ITEM_SHOP, SERVER_SHIP_SHOP, getAmmoPurchase } from "../economy/shop.js";
import { getServerRefineryModuleUpgradeData } from "../economy/refineryUpgrades.js";

function beforeOrAt(profile, finalStep){
  const tutorial = profile?.tutorial;
  const index = TUTORIAL_STEPS.indexOf(tutorial?.step);
  return ["active", "paused"].includes(tutorial?.status)
    && index >= 0 && index <= TUTORIAL_STEPS.indexOf(finalStep);
}

function inRocketTraining(profile){
  const tutorial = profile?.tutorial;
  const index = TUTORIAL_STEPS.indexOf(tutorial?.step);
  return ["active", "paused"].includes(tutorial?.status)
    && index >= TUTORIAL_STEPS.indexOf("game_open_quick_shop") && index <= TUTORIAL_STEPS.indexOf("game_bind_rockets");
}

export function getTutorialReserves(profile){
  let credits = 0;
  let materials = {};
  let reservedLasers = 0;
  if(beforeOrAt(profile,"launcher_buy_laser")){
    credits += profile.ownedShips?.includes("velox") ? 0 : SERVER_SHIP_SHOP.velox.price;
    reservedLasers = Math.max(0, 2 - getInventoryItemCount(profile,"laser_mk1"));
    credits += reservedLasers * SERVER_ITEM_SHOP.laser_mk1.price;
  }
  const [passQuest,storageQuest,raiderQuest] = getTutorialQuestIds(profile?.player?.firmId);
  const trainingAlreadyStarted = TUTORIAL_STEPS.indexOf(profile?.tutorial?.step) >= TUTORIAL_STEPS.indexOf("game_open_quick_shop");
  if(beforeOrAt(profile,"game_buy_rockets") && profile.tutorial.rocketTrainingPurchased !== TUTORIAL_ROCKET_TRAINING_AMOUNT
    && (!profile.completedQuestClaims?.[raiderQuest] || trainingAlreadyStarted)){
    credits += getAmmoPurchase("rocket_r1",TUTORIAL_ROCKET_TRAINING_AMOUNT).totalPrice;
  }else if(beforeOrAt(profile,"game_bind_rockets") && trainingAlreadyStarted
    && profile.tutorial.rocketTrainingPurchased === TUTORIAL_ROCKET_TRAINING_AMOUNT && Number(profile.ammoInventory?.rocket_r1 || 0) <= 0){
    credits += getAmmoPurchase("rocket_r1",TUTORIAL_ROCKET_TRAINING_AMOUNT).totalPrice;
  }
  if(beforeOrAt(profile,"game_bind_rockets") && Number(profile.ammoInventory?.ammo_x1 || 0) <= 0) credits += getAmmoPurchase("ammo_x1").totalPrice;
  if(beforeOrAt(profile,"launcher_depart_velox") || inRocketTraining(profile)){
    const kit = kitCounts(profile);
    const passCompleted = Boolean(profile.completedQuestClaims?.[passQuest]);
    const requiredLasers = inRocketTraining(profile) ? 1 : passCompleted ? 3 : 1;
    credits += Math.max(0,requiredLasers - kit.lasers - reservedLasers) * SERVER_ITEM_SHOP.laser_mk1.price;
    if(kit.repair < 1) credits += SERVER_ITEM_SHOP.extra_repair_starter.price;
    if(passCompleted && kit.rocket < 1) credits += SERVER_ITEM_SHOP.launcher_rocket_mk1.price;
  }
  const storageJob = profile?.refineryUpgradeJobs?.["module:storage"];
  const storageStarted = storageJob?.type === "module" && storageJob.id === "storage" && Number(storageJob.toLevel) >= 2;
  if(beforeOrAt(profile,"launcher_launch_storage_upgrade")
    && !profile.completedQuestClaims?.[storageQuest] && !storageStarted && Number(profile.refineryModules?.storage || 1) < 2){
    const storage = getServerRefineryModuleUpgradeData(profile,"storage");
    if(storage){ credits += storage.credits; materials = {...storage.materials}; }
  }
  return {credits,materials};
}

export function getTutorialCreditReserve(profile){
  return getTutorialReserves(profile).credits;
}

function kitCounts(profile){
  const counts = {lasers:0,repair:0,rocket:0};
  for(const entry of profile?.inventoryItems || []){
    const item = getServerItem(entry.itemId);
    const quantity = getInventoryEntryQuantity(entry);
    if(item?.category === "canon") counts.lasers += quantity;
    if(item?.effect?.repairBot) counts.repair += quantity;
    if(item?.slotType === "rocketLauncher") counts.rocket += quantity;
  }
  return counts;
}

export function validateTutorialEconomyChange(before, after){
  const previousReserve = getTutorialReserves(before);
  const reserve = getTutorialReserves(after);
  const previousCredits = Number(before?.player?.credits || 0);
  const credits = Number(after?.player?.credits || 0);
  const deficit = (needed,available)=>Math.max(0,needed-available);
  if(deficit(reserve.credits,credits) > deficit(previousReserve.credits,previousCredits)){
    return {
      ok:false,
      code:"TUTORIAL_BUDGET_RESERVED",
      reason:`Tutoriel : conserve ${reserve.credits.toLocaleString("fr-FR")} credits pour le Velox, les lasers, le stockage et les 100 roquettes R-1 restants. Tu peux gagner des credits en combattant avant de reprendre.`,
      tutorialReserve:reserve.credits
    };
  }
  for(const id of new Set([...Object.keys(previousReserve.materials),...Object.keys(reserve.materials)])){
    if(deficit(Number(reserve.materials[id] || 0),Number(after?.cargoHold?.[id] || 0))
      > deficit(Number(previousReserve.materials[id] || 0),Number(before?.cargoHold?.[id] || 0))){
      return {ok:false,code:"TUTORIAL_MATERIAL_RESERVED",reason:"Tutoriel : conserve le titane et la silice necessaires au stockage niveau 2. Laisse leur production active dans la raffinerie."};
    }
  }
  if(beforeOrAt(before,"launcher_depart_velox") || inRocketTraining(before)){
    const currentKit = kitCounts(before);
    const nextKit = kitCounts(after);
    for(const [kind,minimum] of Object.entries({lasers:inRocketTraining(before) ? 1 : 3,repair:1,rocket:1})){
      if(nextKit[kind] < Math.min(minimum,currentKit[kind])){
        return {ok:false,code:"TUTORIAL_EQUIPMENT_RESERVED",reason:"Tutoriel : conserve tes canons, ton drone de reparation et ton lance-roquette jusqu'au depart du Velox."};
      }
    }
  }
  return {ok:true};
}

export function rejectRepeatedTutorialLaserPurchase(profile, purchase){
  if(!["active", "paused"].includes(profile?.tutorial?.status)
    || profile.tutorial.step !== "launcher_buy_laser" || purchase?.id !== "laser_mk1") return null;
  const missing = Math.max(0, 2 - getInventoryItemCount(profile,"laser_mk1"),3 - kitCounts(profile).lasers);
  if(missing > 0 && Number(purchase.quantity || 1) <= missing) return null;
  return {ok:false,code:"TUTORIAL_PURCHASE_ALREADY_READY",reason:"Tutoriel : achete seulement le MK-I manquant, puis reprends le guide. Aucun achat supplementaire n'est necessaire."};
}
