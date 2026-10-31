import { ammoTypes, equipment, ships } from "../data/catalog.js?v=20260726-ancient1";
import { betaRewardCalendar, getBetaRewardStatus } from "../data/premium.js?v=20261024-beta-clock1";
import { fmt } from "../core/utils.js";
import { shopIcon } from "./shopIcons.js?v=20261024-premium2";
import { renderBetaRewardCountdown } from "./betaRewardCountdown.js?v=20261024-beta-clock1";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

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
    return {quantity:1, label:"Vaisseau élite aléatoire", img:choices[0]?.img || "assets/ships/Vesperion.png", choices};
  }
  const [id,quantity] = Object.entries(reward.itemCounts || {})[0] || [];
  const item = equipment.find(entry=>entry.id === id);
  return {quantity:quantity || 1, label:id === "portal_anchor_key" ? "Clés Deadly" : id === "laser_mk4" ? "Lasers MK-IV" : item?.name || day?.label || "Récompense", img:item?.img || "assets/icons/premium.svg"};
}

export function betaDayStatus(day, status){
  if(status.claimedDays.includes(day.day)) return "Récompense reçue";
  if(status.completed) return "Calendrier terminé";
  if(day.day === status.nextDay) return status.canClaim ? "Disponible aujourd’hui" : "Disponible à 08:00";
  return "À venir";
}

function rewardDetail(day, status, now){
  const item = getBetaDayPresentation(day);
  const claimed = status.claimedDays.includes(day.day);
  const choices = item.choices;
  const art = choices || [item];
  return `<aside class="sc-reward-detail" aria-labelledby="betaRewardDetailTitle"><h3 id="betaRewardDetailTitle">JOUR ${day.day}</h3><div class="sc-reward-detail-art">${art.map(entry=>`<img src="${escapeHtml(entry.img)}" alt="">`).join("")}</div>${choices ? `<h4>Un vaisseau élite aléatoire</h4><div class="ss-reward-lines">${choices.map(ship=>`<span class="ss-reward-line"><img src="${escapeHtml(ship.img)}" alt=""><span>${escapeHtml(ship.name)}</span></span>`).join("")}</div>` : `<strong class="sc-detail-amount">${fmt(item.quantity)}</strong><span class="sc-detail-unit">${escapeHtml(item.label)}</span>`}<div class="sc-reward-action">${status.canClaim && day.day === status.nextDay ? `<button class="bs-button" data-claim-beta-reward type="button">Récupérer ${shopIcon("gift")}</button>` : `<span class="sc-reward-state">${shopIcon(claimed ? "check" : "lock")}${betaDayStatus(day,status)}</span>`}${renderBetaRewardCountdown(status,now)}</div><p>${choices ? "Un de ces trois vaisseaux est attribué aléatoirement." : "Une récompense par jour de connexion."}</p><small>Les récompenses suivent votre progression pendant la Bêta. Les jours 5, 10, 15, 20 et 25 réservent un bonus spécial.</small></aside>`;
}

export function renderBetaStoreCalendar(profile = {}, {now = Date.now(), calendarDay} = {}){
  const status = getBetaRewardStatus(profile,now);
  const selected = betaRewardCalendar.find(day=>day.day === Number(calendarDay)) || betaRewardCalendar[status.nextDay-1];
  return `<section class="sc-calendar" data-beta-reward-calendar aria-label="Calendrier Bêta de 25 jours"><div class="sc-calendar-main"><div class="sc-calendar-heading"><div class="bs-page-heading"><div><span class="bs-eyebrow">RÉCOMPENSES DE CONNEXION</span><h2>Calendrier Bêta</h2><p>25 récompenses au fil de vos connexions.</p></div></div><div class="sc-calendar-summary"><span class="sc-calendar-membership is-active">${shopIcon("gift")}Édition Bêta</span><strong>${status.claimedCount} / 25 jours</strong></div></div><div class="sc-calendar-grid" aria-label="Les 25 récompenses de la Bêta">${betaRewardCalendar.map(day=>{
    const item = getBetaDayPresentation(day);
    const claimed = status.claimedDays.includes(day.day);
    const today = status.canClaim && day.day === status.nextDay;
    const label = betaDayStatus(day,status);
    return `<button class="sc-calendar-day ${claimed ? "is-claimed" : ""} ${today ? "is-today" : ""} ${day.day % 5 === 0 ? "is-milestone" : ""} ${day.day === selected.day ? "is-selected" : ""}" data-beta-calendar-day="${day.day}" type="button" aria-pressed="${day.day === selected.day}" aria-label="Jour ${day.day} : ${fmt(item.quantity)} ${escapeHtml(item.label)}, ${label}"><span class="sc-day-head"><b>J${day.day}</b>${shopIcon(claimed ? "check" : today ? "gift" : "lock")}</span><span class="sc-day-art"><img src="${escapeHtml(item.img)}" alt=""></span><span class="sc-day-label">${fmt(item.quantity)} ${escapeHtml(item.label.replace(/^Munitions /,""))}</span></button>`;
  }).join("")}</div><p class="sc-calendar-foot">${shopIcon("calendar")}<span>${status.completed ? "Calendrier terminé. Merci d’avoir participé à la Bêta !" : status.claimedToday ? "Récompense du jour récupérée. Prochaine disponibilité à 08:00, heure de Paris." : `Prochaine récompense : jour ${status.nextDay}.`}</span></p></div>${rewardDetail(selected,status,now)}</section>`;
}
