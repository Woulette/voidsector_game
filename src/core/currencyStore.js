import { fmt } from "./utils.js";
import { store } from "./store.js";

const MIN_PLAYER_CREDITS = 0;
const MIN_PLAYER_PREMIUM = 0;

export function priceLabel(type, price){
  return type === "premium" ? `${fmt(price)} NOVA` : `${fmt(price)} CR`;
}

export function canAfford(type, price){
  return type === "premium" ? store.state.player.premium >= price : store.state.player.credits >= price;
}

export function enforcePlayerCurrencyMinimums(player = store.state?.player){
  if(!player) return;
  player.credits = Math.max(MIN_PLAYER_CREDITS, Number(player.credits || 0));
  player.premium = Math.max(MIN_PLAYER_PREMIUM, Number(player.premium || 0));
}

export function spend(type, price){
  if(type === "premium") store.state.player.premium -= price;
  else store.state.player.credits -= price;
  enforcePlayerCurrencyMinimums();
}
