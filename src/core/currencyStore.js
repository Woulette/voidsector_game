import { fmt } from "./utils.js";
import { store } from "./store.js";
import { getNovaDiscountedPrice, hasNovaDiscount, isPremiumActive } from "../data/premium.js";

const MIN_PLAYER_CREDITS = 0;
const MIN_PLAYER_PREMIUM = 0;

export function getCurrencyPrice(type, price, player = store.state?.player){
  const base = Math.max(0, Math.round(Number(price || 0)));
  return type === "premium" ? getNovaDiscountedPrice(base, player) : base;
}

export function hasCurrencyDiscount(type, price, player = store.state?.player){
  return type === "premium" && hasNovaDiscount(price, player);
}

export function basePriceLabel(type, price){
  return type === "premium" ? `${fmt(price)} NOVA` : `${fmt(price)} CR`;
}

export function priceLabel(type, price){
  return basePriceLabel(type, getCurrencyPrice(type, price));
}

export function canAfford(type, price){
  const cost = getCurrencyPrice(type, price);
  return type === "premium" ? store.state.player.premium >= cost : store.state.player.credits >= cost;
}

export function enforcePlayerCurrencyMinimums(player = store.state?.player){
  if(!player) return;
  player.credits = Math.max(MIN_PLAYER_CREDITS, Number(player.credits || 0));
  player.premium = Math.max(MIN_PLAYER_PREMIUM, Number(player.premium || 0));
  player.premiumUntil = Math.max(0, Number(player.premiumUntil || 0));
  player.premiumActive = isPremiumActive(player);
}

export function spend(type, price){
  const cost = getCurrencyPrice(type, price);
  if(type === "premium") store.state.player.premium -= cost;
  else store.state.player.credits -= cost;
  enforcePlayerCurrencyMinimums();
  return cost;
}
