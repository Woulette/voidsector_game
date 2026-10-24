import { PREMIUM_NOVA_DISCOUNT_RATE, PREMIUM_REPAIR_BOT_MULTIPLIER, PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER, PREMIUM_REWARD_DAYS, premiumFeatureList, premiumShopPacks } from "../data/premium.js?v=20260726-kharon1";
import { getShopCurrencyPrice } from "../shared/shopPricing.js";
import { fmt } from "../core/utils.js";
import { shopIcon } from "./shopIcons.js?v=20261024-premium2";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const paymentMode = value=>value === "premium" ? "premium" : "real";
const euroPrice = value=>String(value || "").replace(/ EUR$/, " €");
const novaPrice = (pack,profile)=>getShopCurrencyPrice("premium",pack.price,profile.player || {});

function paymentSwitch(payment){
  return `<div class="pps-payment-switch" role="group" aria-label="Monnaie des pass Premium"><button class="${payment === "real" ? "active" : ""}" data-premium-payment="real" aria-pressed="${payment === "real"}" type="button"><span aria-hidden="true">€</span> Euros</button><button class="${payment === "premium" ? "active" : ""}" data-premium-payment="premium" aria-pressed="${payment === "premium"}" type="button">${shopIcon("premium")} NOVA</button></div>`;
}

function highlights(){
  return [
    {icon:'<span aria-hidden="true">%</span>',label:`-${Math.round(PREMIUM_NOVA_DISCOUNT_RATE*100)} % sur les prix en NOVA`},
    {icon:shopIcon("transfer"),label:`Transferts raffinerie ${1/PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER}× plus rapides`},
    {icon:shopIcon("repair"),label:`Drone de réparation : soin +${Math.round((PREMIUM_REPAIR_BOT_MULTIPLIER-1)*100)} %`},
    {icon:shopIcon("speed"),label:"Voyage automatique"},
    {icon:shopIcon("document"),label:"Quêtes hebdomadaires"},
    {icon:shopIcon("calendar"),label:`Calendrier mensuel : ${PREMIUM_REWARD_DAYS} jours`}
  ];
}

function offerRow(pack,profile,payment){
  const price = payment === "premium" ? `${fmt(novaPrice(pack,profile))} NOVA` : euroPrice(pack.realPrice);
  return `<article class="pps-offer"><div class="pps-art"><img src="${escapeHtml(pack.img)}" alt="Carte Premium ${pack.days} jours" decoding="async"></div><div class="pps-copy"><h3>${pack.days} jours</h3><p>Tous les avantages Premium pendant ${pack.days} jours.</p></div><div class="pps-pricing"><strong class="bs-price">${escapeHtml(price)}</strong><small>${payment === "real" ? "Paiement en euros à venir" : "Activation avec votre NOVA"}</small></div><div class="pps-action"><button class="bs-button" data-store-offer-kind="premium" data-store-offer="${escapeHtml(pack.id)}" aria-label="Voir le pass Premium ${pack.days} jours" type="button">Voir le pass ${shopIcon("arrow")}</button></div></article>`;
}

export function renderPremiumPassStore(profile = {}, {payment = "real"} = {}){
  const mode = paymentMode(payment);
  return `<div class="pps-layout"><section class="pps-main" aria-label="Pass Premium disponibles"><div class="pps-heading"><div class="pps-heading-copy"><span class="bs-eyebrow">BOUTIQUE · PREMIUM</span><h2>Pass Premium</h2><p>Choisissez votre durée. Le pass peut être activé avec votre NOVA ; l’achat en euros sera disponible ultérieurement.</p></div>${paymentSwitch(mode)}</div><div class="pps-offers">${premiumShopPacks.map(pack=>offerRow(pack,profile,mode)).join("")}</div><p class="pps-duration-note">${shopIcon("info")}La durée s’ajoute à votre pass actuel.</p><div class="pps-calendar-link">${shopIcon("calendar")}<strong>Calendrier Premium</strong><span>Un calendrier mensuel de ${PREMIUM_REWARD_DAYS} jours est inclus dans le pass Premium.</span><button class="bs-button bs-button-muted" data-store-tab="rewards" type="button">Consulter ${shopIcon("arrow")}</button></div>${mode === "premium" ? '<p class="ss-note">Les prix NOVA affichés tiennent compte de votre statut Premium et de votre réputation.</p>' : ""}</section><aside class="pps-benefits" aria-label="Avantages du Premium"><h3>Les avantages Premium</h3><ul>${highlights().map(item=>`<li><span class="pps-benefit-icon" aria-hidden="true">${item.icon}</span><span>${escapeHtml(item.label)}</span></li>`).join("")}</ul><button class="pps-all-benefits" data-premium-benefits type="button">Tous les avantages ${shopIcon("arrow")}</button></aside></div>`;
}

function novaPurchase(pack,profile){
  const price = novaPrice(pack,profile);
  const affordable = Number(profile.player?.premium || 0) >= price;
  return `<div><button class="bs-button" data-buy-premium-pack="${escapeHtml(pack.id)}" ${affordable ? "" : "disabled"} type="button">Activer · ${fmt(price)} NOVA</button>${affordable ? "" : '<small class="ss-payment-note">NOVA insuffisante.</small>'}</div>`;
}

export function renderPremiumPassModal(profile = {}, modal = {}, {payment = "real"} = {}){
  const mode = paymentMode(payment);
  const allBenefits = modal.kind === "premium-benefits";
  if(!allBenefits && modal.kind !== "premium") return "";
  const pack = allBenefits ? null : premiumShopPacks.find(entry=>entry.id === modal.id);
  if(!allBenefits && !pack) return "";
  const title = allBenefits ? "Tous les avantages Premium" : pack.name;
  const features = allBenefits ? premiumFeatureList : pack.features;
  const body = `${allBenefits ? "" : `${paymentSwitch(mode)}<div class="bs-detail-hero"><img src="${escapeHtml(pack.img)}" alt="Carte Premium ${pack.days} jours"><p>${pack.days} jours de Premium. Si votre pass est encore actif, cette durée s’ajoute à votre abonnement actuel.</p></div>`}<ul class="ss-feature-list pps-modal-features">${features.map(feature=>`<li>${shopIcon("check")}<span>${escapeHtml(feature)}</span></li>`).join("")}</ul>`;
  const footer = allBenefits ? `<button class="bs-button bs-button-muted" data-store-modal-close type="button">Fermer</button>` : `<div><strong class="bs-price">${escapeHtml(mode === "premium" ? `${fmt(novaPrice(pack,profile))} NOVA` : euroPrice(pack.realPrice))}</strong><small class="ss-payment-note">${mode === "premium" ? "Réduction Premium et réputation prises en compte" : "Paiement en euros à venir"}</small></div>${mode === "premium" ? novaPurchase(pack,profile) : '<button class="bs-button" disabled type="button">Paiement à venir</button>'}`;
  return `<dialog class="bs-modal pps-modal" data-beta-store-dialog data-store-modal-backdrop aria-labelledby="premiumPassDialogTitle"><section><div class="bs-dialog-top"><div><span class="bs-eyebrow">PASS PREMIUM</span><h3 id="premiumPassDialogTitle">${escapeHtml(title)}</h3></div><button class="bs-icon-button" data-store-modal-close aria-label="Fermer le détail" type="button">×</button></div>${body}<div class="bs-dialog-bottom ss-details-footer">${footer}</div></section></dialog>`;
}

export function handlePremiumPassInteraction(event,{store,render}){
  const payment = event.target.closest?.("[data-premium-payment]");
  if(payment){
    const value = payment.dataset.premiumPayment;
    if(!["real","premium"].includes(value)) return false;
    store.premiumStorePayment=value;
    render();return true;
  }
  if(event.target.closest?.("[data-premium-benefits]")){
    store.storeModal={kind:"premium-benefits",id:"all"};
    render();return true;
  }
  return false;
}
