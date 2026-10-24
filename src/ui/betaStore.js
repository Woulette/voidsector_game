import { ammoTypes, equipment, ships } from "../data/catalog.js?v=20260726-ancient1";
import { betaPacks, betaRewardCalendar, getBetaRewardStatus, hasBetaPackPurchase } from "../data/premium.js?v=20260726-kharon1";
import { fmt } from "../core/utils.js";
import { shopIcon } from "./shopIcons.js?v=20261023-boutique1";

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
  return `<div class="bs-pack-inventory" aria-label="Contenu du pack ${escapeHtml(packName(pack))}">${pack.contents.map(item=>`<figure title="${escapeHtml(item.label)} · ${escapeHtml(item.quantity)}"><div><img src="${escapeHtml(item.img)}" alt="" decoding="async"><b>${escapeHtml(item.quantity)}</b></div><figcaption>${escapeHtml(contentLabel(item))}</figcaption></figure>`).join("")}</div>`;
}

function officialBonus(pack){
  return `<div class="bs-official">${shopIcon("gift")}<div><small>À LA SORTIE OFFICIELLE</small><strong>${escapeHtml(presentation[pack.id]?.official || pack.officialReward)}</strong></div></div>`;
}

function renderPack(pack, profile){
  const owned = hasBetaPackPurchase(profile, pack.id);
  return `<article class="bs-pack ${owned ? "is-owned" : ""}">
    <div class="bs-pack-head"><span>PACK BÊTA ${escapeHtml(pack.tag?.replace("BETA ", ""))}</span><span>${owned ? `${shopIcon("check")} DÉJÀ ACTIVÉ` : "UN ACHAT PAR COMPTE"}</span></div>
    <div class="bs-pack-hero"><div class="bs-pack-art"><img src="${escapeHtml(pack.img)}" alt="${escapeHtml(packName(pack))}" decoding="async"></div><div><h3>${escapeHtml(packName(pack))}</h3><p class="bs-pack-subtitle">${escapeHtml(presentation[pack.id]?.subtitle || pack.desc)}</p></div></div>
    <div class="bs-pack-copy"><span class="bs-pack-content-label">CONTENU DU PACK</span>${packContents(pack)}${officialBonus(pack)}
      <div class="bs-price-row"><div><span class="bs-price">${escapeHtml(euroPrice(pack))}</span><small>${pack.contents.length} éléments inclus</small></div><button class="bs-button" data-store-offer-kind="beta" data-store-offer="${escapeHtml(pack.id)}" type="button" aria-label="Voir le pack ${escapeHtml(packName(pack))}">Voir le pack ${shopIcon("arrow")}</button></div>
    </div>
  </article>`;
}

export function getBetaDayPresentation(day){
  const reward = day?.reward || {};
  if(reward.premium) return {quantity:reward.premium, label:"NOVA", img:"assets/icons/premium.svg"};
  if(reward.ammo){
    const [id,quantity] = Object.entries(reward.ammo)[0];
    const ammo = ammoTypes.find(entry=>entry.id === id);
    return {quantity, label:ammo?.name?.replace(/^Munition /, "Munitions ") || "Munitions", img:ammo?.img || "assets/equipment/ammo_laser_x4_same_preview.png"};
  }
  if(reward.shipRandom){
    const choices = (reward.shipRandom.shipIds || []).map(id=>ships.find(ship=>ship.id === id)).filter(Boolean);
    return {quantity:1, label:"Vaisseau élite", img:choices[0]?.img || "assets/ships/Vesperion.png", choices};
  }
  const [id,quantity] = Object.entries(reward.itemCounts || {})[0] || [];
  const item = equipment.find(entry=>entry.id === id);
  return {quantity:quantity || 1, label:id === "portal_anchor_key" ? "Clés Deadly" : id === "laser_mk4" ? "Lasers MK-IV" : item?.name || day?.label || "Récompense", img:item?.img || "assets/icons/premium.svg"};
}

function dayStatus(day, status){
  if(status.claimedDays.includes(day.day)) return "Récompense reçue";
  if(day.day === status.nextDay && status.canClaim) return "Disponible aujourd’hui";
  if(day.day === status.nextDay && status.claimedToday && !status.completed) return "Disponible demain";
  return "À venir";
}

function renderCalendar(profile, now){
  const status = getBetaRewardStatus(profile, now);
  const next = getBetaDayPresentation(status.reward);
  return `<section class="bs-calendar" aria-label="Calendrier Bêta de 25 jours">
    <div class="bs-calendar-heading"><div><span class="bs-eyebrow">RÉCOMPENSES DE CONNEXION</span><h3>Calendrier Bêta</h3><p>25 jours de connexion. Une récompense à récupérer chaque jour.</p></div><div class="bs-calendar-progress" aria-live="polite"><strong>${status.claimedCount} / 25 jours</strong><div class="bs-track" role="progressbar" aria-label="Progression du calendrier Bêta" aria-valuenow="${status.claimedCount}" aria-valuemin="0" aria-valuemax="25"><span style="width:${status.claimedCount * 4}%"></span></div></div></div>
    <div class="bs-today ${status.completed ? "is-completed" : status.canClaim ? "is-available" : "is-received"}">${status.completed ? shopIcon("check") : `<img src="${escapeHtml(next.img)}" alt="">`}<div class="bs-today-copy"><span>${status.completed ? "CALENDRIER TERMINÉ" : status.canClaim ? `DISPONIBLE AUJOURD’HUI · JOUR ${status.nextDay}` : "RÉCOMPENSE DU JOUR RÉCUPÉRÉE"}</span><b>${status.completed ? "Merci d’avoir participé à la Bêta !" : status.canClaim ? `${fmt(next.quantity)} ${escapeHtml(next.label)}` : "Revenez demain pour la suite"}</b></div><button class="bs-button" data-claim-beta-reward type="button" ${status.canClaim ? "" : "disabled"}>${status.completed ? "Terminé" : status.canClaim ? `Récupérer ${shopIcon("gift")}` : "À demain"}</button></div>
    <div class="bs-days">${betaRewardCalendar.map(day=>{
      const item = getBetaDayPresentation(day);
      const claimed = status.claimedDays.includes(day.day);
      const today = !claimed && status.canClaim && day.day === status.nextDay;
      const label = dayStatus(day, status);
      return `<button class="bs-day ${claimed ? "is-claimed" : ""} ${today ? "is-today" : ""} ${day.day % 5 === 0 ? "is-milestone" : ""}" data-beta-calendar-day="${day.day}" type="button" aria-label="Jour ${day.day} : ${fmt(item.quantity)} ${escapeHtml(item.label)}, ${label}"><span class="bs-day-top"><span>JOUR ${day.day}</span>${shopIcon(claimed ? "check" : today ? "gift" : "lock")}</span><span class="bs-day-reward"><img src="${escapeHtml(item.img)}" alt="" loading="lazy"><span><b>${fmt(item.quantity)}</b><small>${escapeHtml(item.label)}</small></span></span><span class="bs-day-status">${claimed ? "Reçu" : today ? "À récupérer" : day.day === status.nextDay && status.claimedToday && !status.completed ? "Demain" : day.day % 5 === 0 ? "Bonus spécial" : "À venir"}</span></button>`;
    }).join("")}</div>
    <p class="bs-calendar-foot">${shopIcon("info")}Les récompenses suivent vos jours de connexion. Les jours 5, 10, 15, 20 et 25 réservent un bonus spécial.</p>
  </section>`;
}

export function renderBetaStorefront(profile = {}, {now = Date.now()} = {}){
  return `<div class="beta-storefront"><div class="bs-page-heading"><div><span class="bs-eyebrow">BOUTIQUE · ÉDITION BÊTA</span><h2>Packs Bêta</h2><p>Choisissez votre vaisseau, découvrez le contenu de votre pack et soutenez Avosoma.</p></div><span class="bs-edition">BÊTA</span></div><section class="bs-packs" aria-label="Packs de soutien Bêta">${betaPacks.map(pack=>renderPack(pack, profile)).join("")}</section><p class="bs-packs-note">${shopIcon("info")}Un achat par pack et par compte. Les bonus de lancement seront attribués à la sortie officielle.</p>${renderCalendar(profile, now)}</div>`;
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
  store.storeModal = {kind:"beta-reward", id:String(id)};
  render();
  return true;
}
