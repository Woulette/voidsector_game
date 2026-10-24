import { PREMIUM_NOVA_DISCOUNT_RATE, PREMIUM_REPAIR_BOT_MULTIPLIER, PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER, PREMIUM_REWARD_DAYS, premiumFeatureList, premiumGoldFeatureList, premiumShopPacks } from "../data/premium.js?v=20261024-boutique3";
import { shopIcon } from "./shopIcons.js?v=20261024-premium2";
import { premiumPassArtwork } from "./premiumPassArtwork.js?v=20261024-gold-art1";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const premiumTier = value=>value === "gold" ? "gold" : "classic";
const tierName = tier=>tier === "gold" ? "Premium OR" : "Premium";
const euroPrice = value=>String(value || "").replace(/ EUR$/, " €");

function tierSwitch(tier){
  return `<div class="pps-tier-switch" role="group" aria-label="Formule Premium"><button class="${tier === "classic" ? "active" : ""}" data-premium-tier="classic" aria-pressed="${tier === "classic"}" type="button">${shopIcon("premium")} Premium</button><button class="${tier === "gold" ? "active" : ""}" data-premium-tier="gold" aria-pressed="${tier === "gold"}" type="button">${shopIcon("star")} Premium OR</button></div>`;
}

function highlights(tier){
  const common = [
    {icon:'<span aria-hidden="true">%</span>',label:`-${Math.round(PREMIUM_NOVA_DISCOUNT_RATE*100)} % sur les prix en NOVA`},
    {icon:shopIcon("transfer"),label:`Transferts raffinerie ${1/PREMIUM_REFINERY_SHIPMENT_DURATION_MULTIPLIER}× plus rapides`},
    {icon:shopIcon("repair"),label:`Drone de réparation : soin +${Math.round((PREMIUM_REPAIR_BOT_MULTIPLIER-1)*100)} %`},
    {icon:shopIcon("speed"),label:"Voyage automatique"},
    {icon:shopIcon("document"),label:"Quêtes hebdomadaires"}
  ];
  if(tier === "gold") common.push({icon:shopIcon("calendar"),label:`Calendrier OR : ${PREMIUM_REWARD_DAYS} jours`,gold:true});
  return common;
}

function offerRow(pack){
  const label = tierName(pack.tier);
  return `<article class="pps-offer${pack.tier === "gold" ? " pps-offer-gold" : ""}"><div class="pps-art"><img src="${escapeHtml(premiumPassArtwork(pack))}" alt="Carte ${label} ${pack.days} jours" decoding="async"></div><div class="pps-copy"><span class="pps-formula">${label}</span><h3>${pack.days} jours</h3><p>${pack.tier === "gold" ? "Tous les avantages et le calendrier OR." : "Tous les avantages, sans calendrier OR."}</p></div><div class="pps-pricing"><strong class="bs-price">${escapeHtml(euroPrice(pack.realPrice))}</strong><small>Paiement en euros à venir</small></div><div class="pps-action"><button class="bs-button" data-store-offer-kind="premium" data-store-offer="${escapeHtml(pack.id)}" aria-label="Voir le pass ${label} ${pack.days} jours" type="button">Voir le pass ${shopIcon("arrow")}</button></div></article>`;
}

export function renderPremiumPassStore(profile = {}, {tier = "classic"} = {}){
  const selectedTier = premiumTier(tier), label = tierName(selectedTier);
  const calendar = selectedTier === "gold"
    ? `<strong>Calendrier OR</strong><span>Les ${PREMIUM_REWARD_DAYS} récompenses mensuelles sont incluses avec Premium OR.</span><button class="bs-button bs-button-muted" data-store-tab="rewards" type="button">Consulter ${shopIcon("arrow")}</button>`
    : `<strong>Premium OR</strong><span>Ajoutez le calendrier mensuel de ${PREMIUM_REWARD_DAYS} jours avec la formule OR.</span><button class="bs-button bs-button-muted" data-premium-tier="gold" type="button">Découvrir ${shopIcon("arrow")}</button>`;
  return `<div class="pps-layout${selectedTier === "gold" ? " pps-layout-gold" : ""}"><section class="pps-main" aria-label="Pass ${label} disponibles"><div class="pps-heading"><div class="pps-heading-copy"><span class="bs-eyebrow">BOUTIQUE · PREMIUM</span><h2>Pass ${label}</h2><p>Choisissez votre formule et votre durée. Les abonnements sont proposés uniquement en euros.</p></div>${tierSwitch(selectedTier)}</div><div class="pps-offers">${premiumShopPacks.filter(pack=>pack.tier === selectedTier).map(offerRow).join("")}</div><p class="pps-duration-note">${shopIcon("info")}La durée du pass s’ajoute à vos avantages Premium.</p><div class="pps-calendar-link">${shopIcon("calendar")}${calendar}</div></section><aside class="pps-benefits" aria-label="Avantages ${label}"><h3>Les avantages ${label}</h3><ul>${highlights(selectedTier).map(item=>`<li${item.gold ? ' class="pps-gold-benefit"' : ""}><span class="pps-benefit-icon" aria-hidden="true">${item.icon}</span><span>${escapeHtml(item.label)}</span></li>`).join("")}</ul><button class="pps-all-benefits" data-premium-benefits type="button">Tous les avantages ${shopIcon("arrow")}</button></aside></div>`;
}

export function renderPremiumPassModal(profile = {}, modal = {}, {tier = "classic"} = {}){
  const allBenefits = modal.kind === "premium-benefits";
  if(!allBenefits && modal.kind !== "premium") return "";
  const pack = allBenefits ? null : premiumShopPacks.find(entry=>entry.id === modal.id);
  if(!allBenefits && !pack) return "";
  const selectedTier = premiumTier(pack?.tier || tier), label = tierName(selectedTier);
  const title = allBenefits ? `Tous les avantages ${label}` : pack.name;
  const features = allBenefits ? (selectedTier === "gold" ? premiumGoldFeatureList : premiumFeatureList) : pack.features;
  const body = `${allBenefits ? "" : `<div class="bs-detail-hero"><img src="${escapeHtml(premiumPassArtwork(pack))}" alt="Carte ${label} ${pack.days} jours"><p>${pack.days} jours de ${label}. ${selectedTier === "gold" ? "Calendrier accessible pendant votre période OR." : "Calendrier OR non inclus."} La durée du pass s’ajoute à vos avantages Premium.</p></div>`}<ul class="ss-feature-list pps-modal-features">${features.map(feature=>`<li>${shopIcon("check")}<span>${escapeHtml(feature)}</span></li>`).join("")}</ul>`;
  const footer = allBenefits ? '<button class="bs-button bs-button-muted" data-store-modal-close type="button">Fermer</button>' : `<div><strong class="bs-price">${escapeHtml(euroPrice(pack.realPrice))}</strong><small class="ss-payment-note">Paiement en euros à venir</small></div><button class="bs-button" disabled type="button">Paiement à venir</button>`;
  return `<dialog class="bs-modal pps-modal${selectedTier === "gold" ? " pps-modal-gold" : ""}" data-beta-store-dialog data-store-modal-backdrop aria-labelledby="premiumPassDialogTitle"><section><div class="bs-dialog-top"><div><span class="bs-eyebrow">PASS ${label.toUpperCase()}</span><h3 id="premiumPassDialogTitle">${escapeHtml(title)}</h3></div><button class="bs-icon-button" data-store-modal-close aria-label="Fermer le détail" type="button">×</button></div>${body}<div class="bs-dialog-bottom ss-details-footer">${footer}</div></section></dialog>`;
}

export function handlePremiumPassInteraction(event,{store,render}){
  const button = event.target.closest?.("[data-premium-tier]");
  if(button){
    const value = button.dataset.premiumTier;
    if(!["classic","gold"].includes(value)) return false;
    store.premiumStoreTier=value;
    render();return true;
  }
  if(event.target.closest?.("[data-premium-benefits]")){
    store.storeModal={kind:"premium-benefits",id:"all"};
    render();return true;
  }
  return false;
}
