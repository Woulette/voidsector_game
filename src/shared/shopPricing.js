import { getNovaDiscountedPrice } from "../data/premium.js";
import { getReputationShopSurcharge } from "./reputation.js";

export function getReputationAdjustedShopPrice(price, player){
  const base = Math.max(0, Math.round(Number(price || 0)));
  return Math.round(base * (100 + getReputationShopSurcharge(player)) / 100);
}

export function getShopCurrencyPrice(type, price, player){
  const adjusted = getReputationAdjustedShopPrice(price, player);
  return type === "premium" ? getNovaDiscountedPrice(adjusted, player) : adjusted;
}
