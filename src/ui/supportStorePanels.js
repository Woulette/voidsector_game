import { ammoTypes, equipment } from "../data/catalog.js?v=20260726-ancient1";
import { creditCurrencyPacks, getPremiumRewardStatus, hasStarterPackPurchase, novaCurrencyPacks, premiumRewardCalendar, starterPacks } from "../data/premium.js?v=20261024-boutique3";
import { fmt } from "../core/utils.js";
import { shopIcon } from "./shopIcons.js?v=20261024-premium2";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const euro = value=>String(value || "").replace(/ EUR$/, " €");

function heading(eyebrow, title, description){
  return `<div class="bs-page-heading"><div><span class="bs-eyebrow">${eyebrow}</span><h2>${title}</h2><p>${description}</p></div></div>`;
}

function detailButton(kind, id, label){
  return `<button class="bs-button" data-store-offer-kind="${kind}" data-store-offer="${escapeHtml(id)}" type="button" aria-label="${escapeHtml(label)}">Voir le pack ${shopIcon("arrow")}</button>`;
}

export function currencyPackArt(pack){
  const nova = pack.tag === "NOVA";
  const packs = nova ? novaCurrencyPacks : creditCurrencyPacks;
  const index = Math.max(0, packs.findIndex(entry=>entry.id === pack.id));
  const position = `${index % 3 * 50}% ${index < 3 ? 0 : 100}%`;
  return `<span class="sc-currency-art ${nova ? "is-nova" : "is-credits"}" style="background-position:${position}" role="img" aria-label="${nova ? "Réserve de NOVA" : "Réserve de crédits"}"></span>`;
}

export function renderCurrencyStore({currency = "nova"} = {}){
  const mode = currency === "credits" ? "credits" : "nova";
  const nova = mode === "nova";
  const packs = nova ? novaCurrencyPacks : creditCurrencyPacks;
  const unit = nova ? "NOVA" : "crédits";
  return `<section class="sc-currencies" aria-label="Packs de monnaie"><div class="sc-currency-heading">${heading("BOUTIQUE · NOVA & CRÉDITS", "NOVA & Crédits", "Choisissez votre réserve.")}<div class="sc-currency-switch" role="group" aria-label="Monnaie des packs">${[["nova","NOVA","assets/icons/premium.svg"],["credits","Crédits","assets/icons/credits.svg"]].map(([value,label,img])=>`<button class="${mode === value ? "is-selected" : ""}" data-store-currency="${value}" type="button" aria-pressed="${mode === value}"><img src="${img}" alt="">${label}</button>`).join("")}</div></div><div class="sc-currency-grid">${packs.map(pack=>`<article class="sc-currency-card ${nova ? "is-nova" : "is-credits"}">${currencyPackArt(pack)}<div class="sc-currency-quantity"><h3>${fmt(pack.amount)}</h3><span>${unit}</span></div><div class="sc-currency-purchase"><strong class="bs-price">${escapeHtml(euro(pack.price))}</strong>${detailButton("currency",pack.id,`Voir le pack de ${fmt(pack.amount)} ${unit}`)}</div></article>`).join("")}</div><p class="sc-store-note">${shopIcon("info")}Paiement en euros à venir.</p></section>`;
}

function starterImage(item){
  if(item.kind === "premium") return /30/.test(item.label) ? "assets/store/premium-pass-30.png" : "assets/store/premium-pass-7.png";
  return item.img;
}

export function contentItems(items){
  return `<div class="bs-content-grid">${items.map(item=>`<div class="bs-content-item"><img src="${escapeHtml(starterImage(item))}" alt=""><span>${escapeHtml(item.label)}<b>${escapeHtml(item.quantity)}</b></span></div>`).join("")}</div>`;
}

export function renderStarterStore(profile){
  return `<section class="sc-starters">${heading("BOUTIQUE · PACKS DE DÉPART", "Packs de départ", "Un vaisseau et son équipement réunis dans un pack.")}<div class="sc-starter-list">${starterPacks.map(pack=>{
    const owned = hasStarterPackPurchase(profile,pack.id);
    return `<article class="sc-starter-row ${owned ? "is-owned" : ""}"><div class="sc-starter-ship"><img src="${escapeHtml(pack.img)}" alt="Vaisseau ${escapeHtml(pack.ship)}"></div><div class="sc-starter-content"><div class="sc-starter-title"><h3>${escapeHtml(pack.ship)}</h3>${owned ? `<span>${shopIcon("check")}Déjà acquis</span>` : ""}</div><div class="sc-starter-items">${pack.contents.map(item=>`<figure><div><img src="${escapeHtml(starterImage(item))}" alt="">${item.quantity !== "x1" ? `<b>${escapeHtml(item.quantity)}</b>` : ""}</div><figcaption>${escapeHtml(item.label)}${item.quantity === "x1" && item.kind !== "premium" ? " ×1" : ""}</figcaption></figure>`).join("")}</div></div><div class="sc-starter-purchase"><strong class="bs-price">${escapeHtml(euro(pack.price))}</strong><small>${owned ? "Achat unique déjà utilisé" : "Paiement en euros à venir"}</small>${detailButton("starter",pack.id,`Voir le pack de départ ${pack.ship}`)}</div></article>`;
  }).join("")}</div><p class="sc-store-note">${shopIcon("info")}Un achat par pack et par compte.<span class="sc-note-divider"></span>Paiement en euros à venir.</p></section>`;
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

export function rewardLinesMarkup(reward){
  return `<div class="ss-reward-lines">${getSupportRewardLines(reward).map(line=>`<span class="ss-reward-line"><img src="${escapeHtml(line.img)}" alt=""><span><b>${fmt(line.quantity)}</b> ${escapeHtml(line.label)}</span></span>`).join("")}</div>`;
}

export function supportRewardStatus(day, status){
  if(status.claimedDays.includes(day)) return "Récompense reçue";
  if(status.completed) return "Calendrier terminé";
  if(!status.premiumGoldActive) return "Premium OR requis";
  if(day === status.nextDay) return status.canClaim ? "Disponible aujourd’hui" : "Disponible demain";
  return "À venir";
}

function compactRewardLabel(entry, lines){
  if(lines.length > 2) return entry.label;
  const shortName = line=>line.label.replace(/^Munition /," ").replace(/^Roquette /," ").replace(/^Missile /," ").replace(/^Fluide de Téléportation$/i,"fluides").trim();
  return lines.map(line=>`${fmt(line.quantity)} ${shortName(line)}`).join(" · ");
}

function rewardDetail(entry,status){
  const lines = getSupportRewardLines(entry.reward);
  const single = lines.length === 1;
  const label = supportRewardStatus(entry.day,status);
  return `<aside class="sc-reward-detail" aria-labelledby="scRewardDetailTitle"><h3 id="scRewardDetailTitle">JOUR ${entry.day}</h3><div class="sc-reward-detail-art">${lines.slice(0,3).map(line=>`<img src="${escapeHtml(line.img)}" alt="">`).join("")}</div>${single ? `<strong class="sc-detail-amount">${fmt(lines[0].quantity)}</strong><span class="sc-detail-unit">${escapeHtml(lines[0].label)}</span>` : `<h4>${escapeHtml(entry.label)}</h4>${rewardLinesMarkup(entry.reward)}`}<div class="sc-reward-action">${status.canClaim && entry.day === status.nextDay ? `<button class="bs-button" data-claim-premium-reward type="button">Récupérer ${shopIcon("gift")}</button>` : `<span class="sc-reward-state">${shopIcon(status.claimedDays.includes(entry.day) ? "check" : "lock")}${label}</span>`}</div><p>Une récompense par jour de connexion.</p><small>Le calendrier recommence au début de chaque mois civil.</small></aside>`;
}

export function renderPremiumRewardStore(profile, {now = Date.now(), calendarDay} = {}){
  const status = getPremiumRewardStatus(profile,now);
  const selected = premiumRewardCalendar.find(entry=>entry.day === Number(calendarDay)) || premiumRewardCalendar[status.nextDay-1];
  const month = new Intl.DateTimeFormat("fr-FR", {month:"long",year:"numeric"}).format(new Date(now));
  return `<section class="sc-calendar" aria-label="Calendrier Premium OR"><div class="sc-calendar-main"><div class="sc-calendar-heading">${heading("BOUTIQUE · CALENDRIER OR", "Calendrier Premium OR", "28 récompenses au fil de vos connexions.")}<div class="sc-calendar-summary"><span class="sc-calendar-membership ${status.premiumGoldActive ? "is-active" : ""}">${shopIcon("premium")}${status.premiumGoldActive ? "Premium OR actif" : "Premium OR requis"}</span><strong>${status.claimedCount} / 28 jours</strong><button class="bs-button bs-button-muted" data-store-premium-tier="gold" type="button">Voir le Premium OR ${shopIcon("arrow")}</button></div></div><div class="sc-calendar-grid" aria-label="Récompenses de ${escapeHtml(month)}">${premiumRewardCalendar.map(entry=>{
    const lines = getSupportRewardLines(entry.reward);
    const claimed = status.claimedDays.includes(entry.day);
    const today = status.canClaim && entry.day === status.nextDay;
    const label = supportRewardStatus(entry.day,status);
    return `<button class="sc-calendar-day ${claimed ? "is-claimed" : ""} ${today ? "is-today" : ""} ${entry.day % 7 === 0 ? "is-milestone" : ""} ${entry.day === selected.day ? "is-selected" : ""}" data-premium-calendar-day="${entry.day}" type="button" aria-pressed="${entry.day === selected.day}" aria-label="Jour ${entry.day} : ${escapeHtml(lines.map(line=>`${fmt(line.quantity)} ${line.label}`).join(", "))}, ${label}"><span class="sc-day-head"><b>J${entry.day}</b>${shopIcon(claimed ? "check" : today ? "gift" : "lock")}</span><span class="sc-day-art">${lines.slice(0,3).map(line=>`<img src="${escapeHtml(line.img)}" alt="">`).join("")}</span><span class="sc-day-label">${escapeHtml(compactRewardLabel(entry,lines))}</span></button>`;
  }).join("")}</div><p class="sc-calendar-foot">${shopIcon("calendar")}<span>${escapeHtml(month)} · ${status.completed ? "Toutes les récompenses du mois ont été récupérées." : status.claimedToday ? "Récompense du jour récupérée. À demain !" : status.premiumGoldActive ? `Prochaine récompense : jour ${status.nextDay}.` : "Le calendrier est inclus uniquement avec le Premium OR."}</span></p></div>${rewardDetail(selected,status)}</section>`;
}
