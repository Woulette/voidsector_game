import { getDronePurchase } from "./shop.js";
import { getProgressionLevelCap, spendCurrency } from "../players/progression.js";
import { appendProfileActivity } from "../players/activityLog.js";

export function purchaseServerDrone(profile, {id = "combat_drone", expectedPrice, expectedCount} = {}){
  const purchase = getDronePurchase({id, profile});
  if(!purchase) return {ok:false, reason:"Drone inconnu."};
  if(purchase.locked) return {ok:false, reason:purchase.reason};
  // Client values are only stale-quote checks. They never determine the price or grant.
  if((expectedPrice !== undefined && expectedPrice !== purchase.totalPrice)
    || (expectedCount !== undefined && expectedCount !== purchase.ownedCount)){
    return {ok:false, code:"DRONE_QUOTE_CHANGED", reason:"Le prix du prochain drone a changé. Vérifie le nouveau prix avant d'acheter."};
  }
  const payment = spendCurrency(profile.player, purchase.priceType, purchase.totalPrice, getProgressionLevelCap(profile.prestigeCount));
  if(!payment.ok) return payment;
  profile.player = payment.player;
  profile.ownedDroneCount = purchase.nextCount;
  if(!Array.isArray(profile.droneLoadout)) profile.droneLoadout = [];
  while(profile.droneLoadout.length < purchase.nextCount) profile.droneLoadout.push(null);
  appendProfileActivity(profile, {
    type:"drone_purchase",
    label:"Achat drone",
    detail:`Drone ${purchase.nextCount} pour ${payment.cost} ${purchase.priceType}.`,
    data:{nextCount:purchase.nextCount, price:payment.cost, priceType:purchase.priceType}
  });
  return {...payment, purchase};
}
