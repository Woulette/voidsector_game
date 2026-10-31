import { getReputationAdjustedShopPrice } from "../../../src/shared/shopPricing.js";
import { spendCurrency } from "../players/progression.js";

export function spendShopCurrency(player, priceType, amount, levelCap = 100){
  return spendCurrency(player, priceType, getReputationAdjustedShopPrice(amount, player), levelCap);
}
