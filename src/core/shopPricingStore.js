import { store } from "./store.js?v=20260726-kharon1";
import { getShopCurrencyPrice as priceForPlayer } from "../shared/shopPricing.js";
import { getReputationShopSurcharge } from "../shared/reputation.js";

export function getShopCurrencyPrice(type, price, player = store.state?.player){
  return priceForPlayer(type, price, player);
}

export function canAffordShop(type, price, player = store.state?.player){
  return Number(player?.[type === "premium" ? "premium" : "credits"] || 0) >= getShopCurrencyPrice(type, price, player);
}

export function hasShopCurrencyDiscount(type, price, player = store.state?.player){
  return getShopCurrencyPrice(type, price, player) < Math.max(0, Math.round(Number(price || 0)));
}

export function reputationShopNotice(player = store.state?.player){
  const percent = getReputationShopSurcharge(player);
  return percent ? `Réputation négative : prix du magasin majorés de ${percent} %.` : "";
}
