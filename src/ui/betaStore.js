import { betaPacks, betaRewardCalendar, getBetaRewardStatus, hasBetaPackPurchase } from "../data/premium.js?v=20260726-kharon1";
import { fmt } from "../core/utils.js";
import { shopIcon } from "./shopIcons.js?v=20261023-boutique1";
import { getBetaDayPresentation, betaDayStatus as dayStatus, renderBetaStoreCalendar } from "./betaStoreCalendar.js?v=20261024-beta-layout1";

export { getBetaDayPresentation } from "./betaStoreCalendar.js?v=20261024-beta-layout1";

const presentation = {
  beta_valkyrie:{subtitle:"Pour prendre votre envol.",official:"7 jours Premium"},
  beta_astralis:{subtitle:"Une puissance de feu affirmée.",official:"30 jours Premium"},
  beta_commander:{subtitle:"Un intercepteur pour voir plus loin.",official:"30 jours Premium + pack de remerciement"}
};

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function packName(pack){ return pack.name.replace(/^Pack Beta /, ""); }
function euroPrice(pack){ return String(pack.price || "").replace(/ EUR$/, " €"); }
function contentLabel(item){
  return String(item.label || "")
    .replace(/^Vaisseau /, "")
    .replace(/^Canon Laser /, "Laser ")
    .replace(/^Generateur A /, "Bouclier A ")
    .replace(/^Generateur Vitesse /, "Vitesse ")
    .replace(/^Munition /, "Munitions ")
    .replace(/^Drone de Reparation Rouge$/, "Drone réparation");
}

function packContents(pack){
  return `<div class="sc-starter-items bs-pack-inventory" style="--bs-item-count:${pack.contents.length}" aria-label="Contenu du pack ${escapeHtml(packName(pack))}">${pack.contents.map(item=>`<figure title="${escapeHtml(item.label)} · ${escapeHtml(item.quantity)}"><div><img src="${escapeHtml(item.img)}" alt="" decoding="async"><b>${escapeHtml(item.quantity)}</b></div><figcaption>${escapeHtml(contentLabel(item))}</figcaption></figure>`).join("")}</div>`;
}

function officialBonus(pack){
  return `<div class="bs-official">${shopIcon("gift")}<div><small>À LA SORTIE OFFICIELLE</small><strong>${escapeHtml(presentation[pack.id]?.official || pack.officialReward)}</strong></div></div>`;
}

function renderPack(pack, profile){
  const owned = hasBetaPackPurchase(profile, pack.id);
  return `<article class="bs-pack bs-pack-row sc-starter-row ${owned ? "is-owned" : ""}" data-store-pack-id="${escapeHtml(pack.id)}">
    <div class="sc-starter-ship"><img src="${escapeHtml(pack.img)}" alt="Vaisseau ${escapeHtml(packName(pack))}" decoding="async"></div>
    <div class="sc-starter-content"><div class="sc-starter-title"><h3>Pack Bêta ${escapeHtml(packName(pack))}</h3>${owned ? `<span>${shopIcon("check")}Déjà activé</span>` : ""}</div>${packContents(pack)}${officialBonus(pack)}</div>
    <div class="sc-starter-purchase"><strong class="bs-price">${escapeHtml(euroPrice(pack))}</strong><small>${owned ? "Achat unique déjà utilisé" : "Un achat par compte"}</small><button class="bs-button" data-store-offer-kind="beta" data-store-offer="${escapeHtml(pack.id)}" type="button" aria-label="Voir le pack ${escapeHtml(packName(pack))}">Voir le pack ${shopIcon("arrow")}</button></div>
  </article>`;
}

export function renderBetaStorefront(profile = {}, {now = Date.now(), calendarDay} = {}){
  return `<div class="beta-storefront"><div class="bs-page-heading"><div><span class="bs-eyebrow">BOUTIQUE · ÉDITION BÊTA</span><h2>Packs Bêta</h2><p>Choisissez votre vaisseau, découvrez le contenu de votre pack et soutenez Avosoma.</p></div><span class="bs-edition">BÊTA</span></div><section class="bs-packs" aria-label="Packs de soutien Bêta">${betaPacks.map(pack=>renderPack(pack, profile)).join("")}</section><p class="bs-packs-note">${shopIcon("info")}Un achat par pack et par compte. Les bonus de lancement seront attribués à la sortie officielle.</p>${renderBetaStoreCalendar(profile, {now,calendarDay})}</div>`;
}

export function renderBetaStoreModal(profile = {}, modal = {}, {now = Date.now()} = {}){
  let title = "", type = "", body = "", statusText = "", action = "";
  if(modal.kind === "beta"){
    const pack = betaPacks.find(entry=>entry.id === modal.id);
    if(!pack) return "";
    const owned = hasBetaPackPurchase(profile, pack.id);
    title = packName(pack); type = "PACK BÊTA";
    body = `<div class="bs-detail-hero"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(title)}"><p>${escapeHtml(pack.desc)}</p></div><div class="bs-content-grid">${pack.contents.map(item=>`<div class="bs-content-item"><img src="${escapeHtml(item.img)}" alt=""><span>${escapeHtml(item.label)}<b>${escapeHtml(item.quantity)}</b></span></div>`).join("")}</div>${officialBonus(pack)}<p class="bs-detail-note">${escapeHtml(pack.officialReward)}</p>`;
    statusText = `<strong class="bs-price">${escapeHtml(euroPrice(pack))}</strong>`;
    action = `<button class="bs-button" data-buy-beta-pack="${escapeHtml(pack.id)}" type="button" ${owned ? "disabled" : ""}>${owned ? "Déjà activé" : "Activer le pack Bêta"}</button>`;
  }else if(modal.kind === "beta-reward"){
    const day = betaRewardCalendar.find(entry=>entry.day === Number(modal.id));
    if(!day) return "";
    const item = getBetaDayPresentation(day);
    const status = getBetaRewardStatus(profile, now);
    title = `Jour ${day.day} · ${fmt(item.quantity)} ${item.label}`; type = "CALENDRIER BÊTA";
    body = item.choices ? `<p class="bs-detail-note">Un de ces trois vaisseaux est attribué aléatoirement :</p><div class="bs-ship-options">${item.choices.map(ship=>`<figure><img src="${escapeHtml(ship.img)}" alt=""><figcaption>${escapeHtml(ship.name)}</figcaption></figure>`).join("")}</div>` : `<div class="bs-detail-hero"><img src="${escapeHtml(item.img)}" alt=""><p>${escapeHtml(day.label)}</p></div>`;
    statusText = escapeHtml(dayStatus(day, status));
    if(status.canClaim && day.day === status.nextDay) action = `<button class="bs-button" data-claim-beta-reward type="button">Récupérer ${shopIcon("gift")}</button>`;
  }else return "";
  return `<dialog class="bs-modal" data-beta-store-dialog data-store-modal-backdrop aria-labelledby="betaStoreDialogTitle"><section><div class="bs-dialog-top"><div><span class="bs-eyebrow">${type}</span><h3 id="betaStoreDialogTitle">${escapeHtml(title)}</h3></div><button class="bs-icon-button" data-store-modal-close type="button" aria-label="Fermer le détail">×</button></div>${body}<div class="bs-dialog-bottom"><span>${statusText}</span><div class="bs-dialog-actions">${action}<button class="bs-button bs-button-muted" data-store-modal-close type="button">Fermer</button></div></div></section></dialog>`;
}

export function syncBetaStoreModal(panel, onCancel){
  const dialog = panel.querySelector("[data-beta-store-dialog]");
  if(!dialog || typeof dialog.showModal !== "function") return;
  dialog.addEventListener("cancel", event=>{event.preventDefault(); onCancel();}, {once:true});
  if(!dialog.open) dialog.showModal();
}

export function handleBetaStoreInteraction(event, {store, render}){
  const day = event.target.closest?.("[data-beta-calendar-day]");
  if(!day) return false;
  const id = Number(day.dataset.betaCalendarDay);
  if(!betaRewardCalendar.some(entry=>entry.day === id)) return false;
  store.betaCalendarDay = id;
  store.storeModal = null;
  render();
  return true;
}
