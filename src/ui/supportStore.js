import { creditCurrencyPacks, getPremiumGoldUntil, getPremiumRewardStatus, hasStarterPackPurchase, isPremiumActive, isPremiumGoldActive, novaCurrencyPacks, premiumRemainingLabel, premiumRewardCalendar, starterPacks, storeTabs } from "../data/premium.js?v=20261024-boutique3";
import { fmt } from "../core/utils.js";
import { renderPremiumPassModal, renderPremiumPassStore } from "./premiumPassStore.js?v=20261024-boutique3";
import { contentItems, currencyPackArt, renderCurrencyStore, renderPremiumRewardStore, renderStarterStore, rewardLinesMarkup, supportRewardStatus } from "./supportStorePanels.js?v=20261024-boutique3";
import { shopIcon } from "./shopIcons.js?v=20261024-premium2";

export { getSupportRewardLines } from "./supportStorePanels.js?v=20261024-boutique3";

const tabLabels = {beta:"Bêta",premium:"Premium",currencies:"NOVA & Crédits",starters:"Packs de départ",rewards:"Calendrier OR"};
const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const euro = value=>String(value || "").replace(/ EUR$/, " €");
const currencyPacks = [...novaCurrencyPacks,...creditCurrencyPacks];

export function renderStoreNavigation(activeTab, profile = {}, {now = Date.now(), betaOnly = false} = {}){
  const active = isPremiumActive(profile,now);
  const gold = isPremiumGoldActive(profile,now);
  const goldTime = Math.max(0,getPremiumGoldUntil(profile)-now);
  const goldRemaining = goldTime >= 86_400_000 ? `${Math.floor(goldTime/86_400_000)}j ${Math.floor(goldTime%86_400_000/3_600_000)}h` : `${Math.ceil(goldTime/60_000)}m`;
  const remaining = gold ? goldRemaining : premiumRemainingLabel(profile,now);
  return `<div class="ss-navigation-row"><nav class="ss-navigation" aria-label="Rubriques de la boutique">${storeTabs.filter(tab=>!betaOnly || tab.id === "beta").map(tab=>`<button class="${tab.id === activeTab ? "active" : ""}" data-store-tab="${tab.id}" type="button" ${tab.id === activeTab ? 'aria-current="page"' : ""}>${tabLabels[tab.id]}</button>`).join("")}</nav><div class="ss-account-status ${active ? "is-active" : ""} ${gold ? "is-gold" : ""}">${shopIcon("premium")}<span>${gold ? "Premium OR" : "Premium"} <b>${active ? `actif${remaining !== "Inactif" && remaining !== "0m" ? ` · ${escapeHtml(remaining)}` : ""}` : "inactif"}</b></span></div></div>`;
}

export function renderSupportStorefront(profile = {}, activeTab = "premium", {now = Date.now(), tier, currency, calendarDay} = {}){
  if(activeTab === "premium") return renderPremiumPassStore(profile,{now,tier});
  if(activeTab === "currencies") return renderCurrencyStore({currency});
  if(activeTab === "starters") return renderStarterStore(profile);
  if(activeTab === "rewards") return renderPremiumRewardStore(profile,{now,calendarDay});
  return "";
}

export function renderSupportStoreModal(profile = {}, modal = {}, {now = Date.now(), tier} = {}){
  let title = "", eyebrow = "", body = "", footer = "";
  if(modal.kind === "premium" || modal.kind === "premium-benefits") return renderPremiumPassModal(profile,modal,{now,tier});
  if(modal.kind === "currency"){
    const pack = currencyPacks.find(item=>item.id === modal.id);
    if(!pack) return "";
    const unit = pack.tag === "NOVA" ? "NOVA" : "crédits";
    title=`${fmt(pack.amount)} ${unit}`;eyebrow="PACK DE MONNAIE";
    body=`<div class="bs-detail-hero sc-currency-detail">${currencyPackArt(pack)}<p>Ce pack contient ${fmt(pack.amount)} ${unit}. Les achats en euros ne sont pas encore ouverts.</p></div>`;
    footer=`<strong class="bs-price">${escapeHtml(euro(pack.price))}</strong><button class="bs-button" type="button" disabled>Paiement à venir</button>`;
  }else if(modal.kind === "starter"){
    const pack = starterPacks.find(item=>item.id === modal.id);
    if(!pack) return "";
    const owned = hasStarterPackPurchase(profile,pack.id);
    title=pack.name;eyebrow="PACK DE DÉPART";
    body=`<div class="bs-detail-hero"><img src="${escapeHtml(pack.img)}" alt=""><p>${escapeHtml(pack.desc)} ${owned ? "Ce pack a déjà été acquis sur ce compte." : "Un achat par compte."}</p></div>${contentItems(pack.contents)}`;
    footer=`<strong class="bs-price">${escapeHtml(euro(pack.price))}</strong><button class="bs-button" type="button" disabled>${owned ? "Déjà acquis" : "Paiement à venir"}</button>`;
  }else if(modal.kind === "premium-reward"){
    const day = premiumRewardCalendar.find(item=>item.day === Number(modal.id));
    if(!day) return "";
    const status = getPremiumRewardStatus(profile,now);
    title=`Jour ${day.day}`;eyebrow="CALENDRIER PREMIUM OR";
    body=rewardLinesMarkup(day.reward);
    footer=`<span>${supportRewardStatus(day.day,status)}</span>${status.canClaim && day.day === status.nextDay ? `<button class="bs-button" data-claim-premium-reward type="button">Récupérer ${shopIcon("gift")}</button>` : ""}`;
  }else return "";
  return `<dialog class="bs-modal" data-beta-store-dialog data-store-modal-backdrop aria-labelledby="supportStoreDialogTitle"><section><div class="bs-dialog-top"><div><span class="bs-eyebrow">${eyebrow}</span><h3 id="supportStoreDialogTitle">${escapeHtml(title)}</h3></div><button class="bs-icon-button" data-store-modal-close type="button" aria-label="Fermer le détail">×</button></div>${body}<div class="bs-dialog-bottom ss-details-footer">${footer}</div></section></dialog>`;
}

export function handleSupportStoreInteraction(event, {store,render}){
  if(event.target.closest?.("[data-store-premium-tier=\"gold\"]")){
    store.storeTab="premium";
    store.premiumStoreTier="gold";
    store.storeModal=null;
    render();return true;
  }
  const currency = event.target.closest?.("[data-store-currency]");
  if(currency){
    const value = currency.dataset.storeCurrency;
    if(!["nova","credits"].includes(value)) return false;
    store.storeCurrency=value;
    render();return true;
  }
  const button = event.target.closest?.("[data-premium-calendar-day]");
  if(!button) return false;
  const day = Number(button.dataset.premiumCalendarDay);
  if(!premiumRewardCalendar.some(entry=>entry.day === day)) return false;
  store.premiumCalendarDay=day;
  render();return true;
}
