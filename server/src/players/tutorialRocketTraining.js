import { TUTORIAL_ROCKET_TRAINING_AMOUNT, sanitizeTutorialState } from "../../../src/shared/tutorial.js";
import { getAmmoPurchase } from "../economy/shop.js";

const PURCHASE_STEPS = new Set(["game_open_quick_shop","game_buy_rockets"]);

export function getTutorialRocketTrainingSlots(profile){
  return Array.isArray(profile?.actionSlotsByShip?.velox) ? profile.actionSlotsByShip.velox : [];
}

export function getMissingTutorialRocketTrainingStep(profile){
  if(Number(profile?.tutorial?.rocketTrainingPurchased || 0) < TUTORIAL_ROCKET_TRAINING_AMOUNT) return "game_open_quick_shop";
  const slots = getTutorialRocketTrainingSlots(profile);
  if(profile.activeShip !== "velox" || slots[0] !== "ammo_x1" || Number(profile.ammoInventory?.ammo_x1 || 0) <= 0) return "game_bind_laser";
  if(slots[1] !== "rocket_r1" || Number(profile.ammoInventory?.rocket_r1 || 0) <= 0) return "game_bind_rockets";
  return "game_hunt_raiders";
}

function isExactRocketTrainingPurchase(purchase){
  if(purchase?.id !== "rocket_r1") return false;
  const canonical = getAmmoPurchase(purchase.id,purchase.multiplier,purchase.repeat);
  return canonical?.totalAmount === TUTORIAL_ROCKET_TRAINING_AMOUNT
    && canonical.multiplier === TUTORIAL_ROCKET_TRAINING_AMOUNT && canonical.repeat === 1
    && purchase.totalAmount === canonical.totalAmount
    && purchase.totalPrice === canonical.totalPrice
    && purchase.priceType === canonical.priceType;
}

export function rejectRepeatedTutorialRocketPurchase(profile,purchase){
  if(profile?.tutorial?.status !== "active" || !PURCHASE_STEPS.has(profile.tutorial.step)
    || !isExactRocketTrainingPurchase(purchase) || profile.tutorial.rocketTrainingPurchased !== TUTORIAL_ROCKET_TRAINING_AMOUNT
    || Number(profile.ammoInventory?.rocket_r1 || 0) <= 0) return null;
  return {ok:false,code:"TUTORIAL_PURCHASE_ALREADY_READY",reason:"Tes 100 roquettes R-1 ont deja ete achetees. Poursuis la preparation des raccourcis."};
}

export function recordTutorialRocketPurchase(profile,purchase){
  const tutorial = sanitizeTutorialState(profile?.tutorial);
  if(tutorial.status !== "active" || !PURCHASE_STEPS.has(tutorial.step)
    || tutorial.rocketTrainingPurchased >= TUTORIAL_ROCKET_TRAINING_AMOUNT || !isExactRocketTrainingPurchase(purchase)) return false;
  profile.tutorial = {...tutorial,rocketTrainingPurchased:TUTORIAL_ROCKET_TRAINING_AMOUNT,
    revision:tutorial.revision+1,updatedAt:Date.now()};
  return true;
}
