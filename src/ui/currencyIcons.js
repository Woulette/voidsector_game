import { fmt } from "../core/utils.js";

const CURRENCY_META = Object.freeze({
  credits:{label:"crédits", icon:"assets/icons/credits.svg"},
  premium:{label:"NOVA", icon:"assets/icons/premium.svg"}
});

function normalizedCurrency(type){
  return type === "premium" ? "premium" : "credits";
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[char]);
}

export function currencyIconHtml(type, className = ""){
  const currency = normalizedCurrency(type);
  const meta = CURRENCY_META[currency];
  return `<img class="currency-icon currency-icon-${currency}${className ? ` ${className}` : ""}" src="${meta.icon}" alt="" aria-hidden="true">`;
}

export function realMoneyPriceHtml(price, {className = "", fallback = "Bientot"} = {}){
  const label = String(price || fallback);
  return `<span class="store-real-price${className ? ` ${className}` : ""}">${escapeHtml(label)}</span>`;
}

export function currencyAmountHtml(type, amount, {className = "", prefix = ""} = {}){
  const currency = normalizedCurrency(type);
  const meta = CURRENCY_META[currency];
  const value = Math.max(0, Math.round(Number(amount || 0)));
  const amountLabel = `${prefix}${fmt(value)}`;
  return `<span class="currency-amount ${currency}${className ? ` ${className}` : ""}" aria-label="${amountLabel} ${meta.label}" title="${meta.label}"><span>${amountLabel}</span>${currencyIconHtml(currency)}</span>`;
}
