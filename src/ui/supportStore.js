import { ammoTypes, equipment } from "../data/catalog.js?v=20260726-ancient1";
import { creditCurrencyPacks, getPremiumRewardStatus, hasStarterPackPurchase, isPremiumActive, novaCurrencyPacks, premiumFeatureList, premiumRemainingLabel, premiumRewardCalendar, premiumShopPacks, starterPacks, storeTabs } from "../data/premium.js?v=20260726-kharon1";
import { fmt } from "../core/utils.js";
import { getShopCurrencyPrice } from "../shared/shopPricing.js";
import { shopIcon } from "./shopIcons.js?v=20261023-boutique1";

const tabLabels = {beta:"Bêta", premium:"Premium", currencies:"NOVA & Crédits", starters:"Packs de départ", rewards:"Calendrier Premium"};
const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const euro = value=>String(value || "").replace(/ EUR$/, " €");
const currencyPacks = [...novaCurrencyPacks, ...creditCurrencyPacks];

export function renderStoreNavigation(activeTab, profile = {}, {now = Date.now(), betaOnly = false} = {}){
  const active = isPremiumActive(profile, now);
  const remaining = premiumRemainingLabel(profile, now);
  return `<div class="ss-navigation-row"><nav class="ss-navigation" aria-label="Rubriques de la boutique">${storeTabs.filter(tab=>!betaOnly || tab.id === "beta").map(tab=>`<button class="${tab.id === activeTab ? "active" : ""}" data-store-tab="${tab.id}" type="button" ${tab.id === activeTab ? 'aria-current="page"' : ""}>${tabLabels[tab.id]}</button>`).join("")}</nav><div class="ss-account-status ${active ? "is-active" : ""}">${shopIcon("premium")}<span>Premium <b>${active ? `actif${remaining !== "Inactif" ? ` · ${escapeHtml(remaining)}` : ""}` : "inactif"}</b></span></div></div>`;
}

function heading(eyebrow, title, description){
  return `<div class="bs-page-heading"><div><span class="bs-eyebrow">${eyebrow}</span><h2>${title}</h2><p>${description}</p></div></div>`;
}

function detailButton(kind, id, label){
  return `<button class="bs-button bs-button-muted" data-store-offer-kind="${kind}" data-store-offer="${escapeHtml(id)}" type="button" aria-label="${escapeHtml(label)}">Voir le détail ${shopIcon("arrow")}</button>`;
}

function novaPrice(pack, profile){ return getShopCurrencyPrice("premium", pack.price, profile.player || {}); }
function premiumPurchaseButton(pack, profile){
  const price = novaPrice(pack, profile);
  const affordable = Number(profile.player?.premium || 0) >= price;
  return `<button class="bs-button" data-buy-premium-pack="${escapeHtml(pack.id)}" type="button" ${affordable ? "" : "disabled"}>Activer · ${fmt(price)} NOVA</button>${affordable ? "" : '<small class="ss-payment-note">NOVA insuffisante.</small>'}`;
}

function renderPremium(profile){
  return `${heading("BOUTIQUE · PREMIUM", "Un pass pour aller plus loin.", "Choisissez votre durée. Le pass peut être activé avec votre NOVA ; l’achat en euros sera disponible ultérieurement.")}
    <div class="ss-offers ss-premium-offers">${premiumShopPacks.map(pack=>`<article class="ss-offer"><div class="ss-offer-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.name)}"></div><div class="ss-offer-body"><span class="ss-offer-tag">PASS PREMIUM</span><h3>${pack.days} jours</h3><p>Tous les avantages Premium pendant ${pack.days} jours. Une nouvelle activation prolonge votre abonnement en cours.</p><div class="ss-offer-footer"><div><strong class="bs-price">${escapeHtml(euro(pack.realPrice))}</strong><small class="ss-payment-note">Paiement en euros à venir</small></div>${detailButton("premium", pack.id, `Voir le pass Premium ${pack.days} jours`)}</div><div class="ss-nova-price"><span>Activation en NOVA</span><strong>${fmt(novaPrice(pack, profile))} NOVA</strong></div>${premiumPurchaseButton(pack, profile)}</div></article>`).join("")}</div>
    <section class="ss-benefits" aria-label="Avantages du Premium"><span class="bs-eyebrow">INCLUS AVEC LES DEUX PASS</span><h3>Les avantages Premium</h3><ul class="ss-feature-list">${premiumFeatureList.map(feature=>`<li>${shopIcon("check")}<span>${escapeHtml(feature)}</span></li>`).join("")}</ul></section><p class="ss-note">Le prix NOVA affiché tient compte de votre statut Premium et de votre réputation. La durée s’ajoute à celle de votre pass actuel.</p>`;
}

function renderCurrencies(){
  return `${heading("BOUTIQUE · MONNAIES", "Votre réserve de NOVA et de crédits.", "Consultez les quantités et les tarifs prévus pour la boutique officielle.")}${[["NOVA",novaCurrencyPacks],["Crédits",creditCurrencyPacks]].map(([title,packs])=>`<section class="ss-currency-section" aria-label="Packs ${title}"><h3>${title}</h3><div class="ss-currency-grid">${packs.map(pack=>`<article class="ss-currency-card"><img src="${escapeHtml(pack.img)}" alt=""><div><span class="ss-offer-tag">${title}</span><h4 class="ss-amount">${fmt(pack.amount)}</h4><span class="bs-price">${escapeHtml(euro(pack.price))}</span></div>${detailButton("currency",pack.id,`Voir ${fmt(pack.amount)} ${title}`)}</article>`).join("")}</div></section>`).join("")}<p class="ss-note">Les packs de monnaie sont en préparation. Les achats en euros ne sont pas encore ouverts.</p>`;
}

function contentItems(items){
  return `<div class="bs-content-grid">${items.map(item=>`<div class="bs-content-item"><img src="${escapeHtml(item.img)}" alt=""><span>${escapeHtml(item.label)}<b>${escapeHtml(item.quantity)}</b></span></div>`).join("")}</div>`;
}

function renderStarters(profile){
  return `${heading("BOUTIQUE · PACKS DE DÉPART", "Une flotte prête à évoluer.", "Un vaisseau, son équipement et un pass Premium dans un pack de départ. Un achat par pack et par compte.")}
    <div class="ss-offers ss-starter-offers">${starterPacks.map(pack=>{
      const owned = hasStarterPackPurchase(profile, pack.id);
      return `<article class="ss-offer"><div class="ss-offer-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(pack.ship)}"></div><div class="ss-offer-body"><span class="ss-offer-tag">${owned ? "DÉJÀ ACQUIS" : "PACK DE DÉPART"}</span><h3>${escapeHtml(pack.ship)}</h3><p>${escapeHtml(pack.desc)}</p>${contentItems(pack.contents)}<div class="ss-offer-footer"><div><strong class="bs-price">${escapeHtml(euro(pack.price))}</strong><small class="ss-payment-note">${owned ? "Achat unique déjà utilisé" : "Paiement en euros à venir"}</small></div>${detailButton("starter",pack.id,`Voir le pack de départ ${pack.ship}`)}</div></div></article>`;
    }).join("")}</div>`;
}

export function getSupportRewardLines(reward = {}){
  const lines = [];
  if(reward.credits) lines.push({label:"crédits",quantity:reward.credits,img:"assets/icons/credits.svg"});
  if(reward.premium) lines.push({label:"NOVA",quantity:reward.premium,img:"assets/icons/premium.svg"});
  for(const [id,quantity] of Object.entries(reward.ammo || {})){
    const ammo = ammoTypes.find(item=>item.id === id);
    lines.push({label:ammo?.name || id,quantity,img:ammo?.img || "assets/icons/premium.svg"});
  }
  for(const [id,quantity] of Object.entries(reward.itemCounts || {})){
    const item = equipment.find(entry=>entry.id === id);
    lines.push({label:item?.name || id,quantity,img:item?.img || "assets/icons/premium.svg"});
  }
  return lines;
}

function rewardLinesMarkup(reward){
  return `<div class="ss-reward-lines">${getSupportRewardLines(reward).map(line=>`<span class="ss-reward-line"><img src="${escapeHtml(line.img)}" alt=""><span><b>${fmt(line.quantity)}</b> ${escapeHtml(line.label)}</span></span>`).join("")}</div>`;
}

function rewardStatus(day, status){
  if(status.claimedDays.includes(day)) return "Récompense reçue";
  if(status.completed) return "Calendrier terminé";
  if(!status.premiumActive) return "Premium requis";
  if(day === status.nextDay) return status.canClaim ? "Disponible aujourd’hui" : "Disponible demain";
  return "À venir";
}

function renderRewards(profile, now){
  const status = getPremiumRewardStatus(profile, now);
  const month = new Intl.DateTimeFormat("fr-FR", {month:"long",year:"numeric"}).format(new Date(now));
  return `${heading("BOUTIQUE · CALENDRIER PREMIUM", "Un rendez-vous chaque jour.", "28 récompenses à récupérer au fil de vos connexions. Le calendrier recommence au début de chaque mois civil.")}<section class="ss-section" aria-label="Récompenses Premium du mois"><div class="ss-reward-summary"><div><span class="ss-month">${escapeHtml(month)}</span><h3>${status.claimedCount} / 28 jours</h3><p>${status.completed ? "Toutes les récompenses de ce mois ont été récupérées." : !status.premiumActive ? "Activez un pass Premium pour récupérer les récompenses." : status.claimedToday ? "Votre récompense du jour est récupérée. À demain !" : `La récompense du jour ${status.nextDay} vous attend.`}</p></div>${status.canClaim ? `<button class="bs-button" data-claim-premium-reward type="button">Récupérer le jour ${status.nextDay} ${shopIcon("gift")}</button>` : `<span class="ss-empty-note">${status.completed ? "Terminé pour ce mois" : !status.premiumActive ? "Premium requis" : "À demain"}</span>`}</div><div class="ss-reward-grid">${premiumRewardCalendar.map(day=>{
    const claimed = status.claimedDays.includes(day.day);
    const today = status.canClaim && day.day === status.nextDay;
    const label = rewardStatus(day.day,status);
    return `<button class="ss-reward-day ${claimed ? "is-claimed" : ""} ${today ? "is-today" : ""} ${day.day % 7 === 0 ? "is-milestone" : ""}" data-premium-calendar-day="${day.day}" type="button" aria-label="Jour ${day.day} : ${getSupportRewardLines(day.reward).map(line=>`${fmt(line.quantity)} ${escapeHtml(line.label)}`).join(", ")}, ${label}"><span class="ss-day-head"><span>JOUR ${day.day}</span>${shopIcon(claimed ? "check" : today ? "gift" : "lock")}</span>${rewardLinesMarkup(day.reward)}<small>${label}</small></button>`;
  }).join("")}</div></section>`;
}

export function renderSupportStorefront(profile = {}, activeTab = "premium", {now = Date.now()} = {}){
  if(activeTab === "premium") return renderPremium(profile);
  if(activeTab === "currencies") return renderCurrencies();
  if(activeTab === "starters") return renderStarters(profile);
  if(activeTab === "rewards") return renderRewards(profile,now);
  return "";
}

export function renderSupportStoreModal(profile = {}, modal = {}, {now = Date.now()} = {}){
  let title = "", eyebrow = "", body = "", footer = "";
  if(modal.kind === "premium"){
    const pack = premiumShopPacks.find(item=>item.id === modal.id);
    if(!pack) return "";
    title=pack.name;eyebrow="PASS PREMIUM";
    body=`<div class="bs-detail-hero"><img src="${escapeHtml(pack.img)}" alt=""><p>${pack.days} jours de Premium. Si votre pass est encore actif, cette durée s’ajoute à votre abonnement actuel.</p></div><ul class="ss-feature-list">${pack.features.map(feature=>`<li>${shopIcon("check")}<span>${escapeHtml(feature)}</span></li>`).join("")}</ul>`;
    footer=`<div><strong class="bs-price">${escapeHtml(euro(pack.realPrice))}</strong><small class="ss-payment-note">Paiement en euros à venir</small></div><div>${premiumPurchaseButton(pack, profile)}</div>`;
  }else if(modal.kind === "currency"){
    const pack = currencyPacks.find(item=>item.id === modal.id);
    if(!pack) return "";
    const unit = pack.tag === "NOVA" ? "NOVA" : "crédits";
    title=`${fmt(pack.amount)} ${unit}`;eyebrow="PACK DE MONNAIE";
    body=`<div class="bs-detail-hero"><img src="${escapeHtml(pack.img)}" alt=""><p>Ce pack contient ${fmt(pack.amount)} ${unit}. Les achats en euros ne sont pas encore ouverts.</p></div>`;
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
    title=`Jour ${day.day}`;eyebrow="CALENDRIER PREMIUM";
    body=rewardLinesMarkup(day.reward);
    footer=`<span>${rewardStatus(day.day,status)}</span>${status.canClaim && day.day === status.nextDay ? `<button class="bs-button" data-claim-premium-reward type="button">Récupérer ${shopIcon("gift")}</button>` : ""}`;
  }else return "";
  return `<dialog class="bs-modal" data-beta-store-dialog data-store-modal-backdrop aria-labelledby="supportStoreDialogTitle"><section><div class="bs-dialog-top"><div><span class="bs-eyebrow">${eyebrow}</span><h3 id="supportStoreDialogTitle">${escapeHtml(title)}</h3></div><button class="bs-icon-button" data-store-modal-close type="button" aria-label="Fermer le détail">×</button></div>${body}<div class="bs-dialog-bottom ss-details-footer">${footer}</div></section></dialog>`;
}

export function handleSupportStoreInteraction(event, {store, render}){
  const button = event.target.closest?.("[data-premium-calendar-day]");
  if(!button) return false;
  const day = Number(button.dataset.premiumCalendarDay);
  if(!premiumRewardCalendar.some(entry=>entry.day === day)) return false;
  store.storeModal={kind:"premium-reward",id:String(day)};
  render();return true;
}
