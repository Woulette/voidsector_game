import { ammoTypes } from "../data/catalog.js?v=20260726-ancient1";
import { fmt } from "../core/utils.js";
import { currencyAmountHtml } from "./currencyIcons.js";
import { getPortalAccess, getPortalPresentation, splitPortalRewards } from "./portalPresentation.js?v=20261023-portals-ui1";

const renderedPanels = new WeakMap();

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}

function icon(name){
  const paths = {
    arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
    shield:'<path d="m12 3 8 3v5c0 5-8 10-8 10S4 16 4 11V6z"/><path d="m8 12 3 3 5-6"/>',
    target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    gift:'<rect x="4" y="10" width="16" height="11" rx="1"/><path d="M3 6h18v4H3zm9 0v15"/><path d="M12 6C3 6 7 0 10 3zm0 0c9 0 5-6 2-3z"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.target}</svg>`;
}

function renderPortalOption(portal, index, selectedId, state, compact = false){
  const presentation = getPortalPresentation(portal);
  const access = getPortalAccess(portal, state);
  const selected = portal.id === selectedId;
  return `<button type="button" class="portal-route-option ${selected ? "is-selected" : ""} ${compact ? "is-compact" : ""}" style="--portal-accent:${presentation?.color || "#7096b0"}" data-portal-caster-select="${portal.id}" data-portal-focus="select:${portal.id}" aria-pressed="${selected}">
    <span class="portal-route-number">${String(index + 1).padStart(2, "0")}</span>
    <img src="${portal.img}" alt="" class="portal-route-art">
    <span class="portal-route-copy"><strong>${escapeHtml(portal.shortName || portal.name)}</strong><span>Niv. ${portal.requirement.level} <i aria-hidden="true">·</i> ${fmt(access.pieces)} / ${fmt(access.required)} fragments</span><small class="${access.unlocked ? "is-unlocked" : ""}">${access.unlocked ? icon("check") : icon("lock")}${escapeHtml(access.status)}</small></span>
    <span class="portal-route-indicator" aria-hidden="true">${icon("arrow")}</span>
  </button>`;
}

export function renderPortalNavigation(portals, selectedId, state, otherOpen){
  const first = portals.filter(portal=>getPortalPresentation(portal));
  const other = portals.filter(portal=>!getPortalPresentation(portal));
  return `<nav class="portal-navigation" aria-label="Choisir un portail">
    <div class="portal-navigation-label"><span>Choisir un portail</span><span>01 — 04</span></div>
    <div class="portal-primary-options">${first.map(portal=>renderPortalOption(portal, portals.indexOf(portal), selectedId, state)).join("")}</div>
    <details class="portal-other-list" ${otherOpen ? "open" : ""}><summary><span>Portails suivants</span><span>05 — 09 <b aria-hidden="true">⌄</b></span></summary><div class="portal-other-options">${other.map(portal=>renderPortalOption(portal, portals.indexOf(portal), selectedId, state, true)).join("")}</div></details>
  </nav>`;
}

function renderReward(reward){
  if(reward.kind === "nova") return `<div class="portal-guaranteed-reward"><img src="assets/icons/premium.svg" alt=""><span><strong>${fmt(reward.amount)}</strong><small>NOVA</small></span></div>`;
  const ammo = ammoTypes.find(entry=>entry.id === `ammo_x${reward.multiplier}`);
  return `<div class="portal-guaranteed-reward">${ammo ? `<img src="${ammo.img}" alt="">` : ""}<span><strong>${fmt(reward.amount)}</strong><small>Munitions ×${reward.multiplier}</small></span></div>`;
}

export function renderPortalDetail(portal, state){
  const presentation = getPortalPresentation(portal);
  if(!presentation) return "";
  const access = getPortalAccess(portal, state);
  const rewards = splitPortalRewards(portal);
  const specialRewards = rewards.filter(reward=>reward.kind === "special" && !/^D[eé](?:verrouille|bloque)/iu.test(reward.text));
  const unlockNote = portal.id === "violet" ? "" : `<div class="portal-unlock-note">${icon(access.clears > 0 ? "check" : "lock")}<span>Débloque : ${escapeHtml(presentation.unlock)}</span></div>`;
  const mapDropChance = (Math.max(0, Number(portal.dropChance || 0)) * 100).toFixed(2).replace(".", ",");
  const action = access.unlocked ? `data-prepare-portal="${portal.id}"` : `data-unlock-portal-pieces="${portal.id}"`;
  const enabled = access.unlocked ? access.canPrepare : access.canUnlock;
  const actionText = !access.levelOk ? `Niveau ${portal.requirement.level} requis` : access.unlocked ? !state.activeShip ? "Équiper un vaisseau" : "Préparer le portail" : access.canUnlock ? "Déverrouiller le portail" : `Réunir ${fmt(access.required)} fragments`;
  const hint = access.unlocked ? "Préparez votre portail, puis rejoignez-le près de votre base en jeu." : !access.levelOk ? `Atteignez le niveau ${portal.requirement.level} et réunissez les fragments pour déverrouiller ce portail.` : access.missing > 0 ? `Encore ${fmt(access.missing)} fragment${access.missing > 1 ? "s" : ""} à obtenir sur les maps ou au Space Caster.` : "Vos fragments sont réunis. Vous pouvez déverrouiller ce portail.";
  return `<div class="portal-dossier" style="--portal-accent:${presentation.color}">
    <header class="portal-dossier-heading"><span>PORTAIL ${presentation.number} <i aria-hidden="true">/</i> ${escapeHtml(presentation.type)}</span><span class="portal-access-badge ${access.unlocked ? "is-unlocked" : ""}">${icon(access.unlocked ? "check" : "lock")}${escapeHtml(access.status)}</span></header>
    <div class="portal-dossier-hero">
      <div class="portal-hero-art"><span class="portal-orbit orbit-one" aria-hidden="true"></span><span class="portal-orbit orbit-two" aria-hidden="true"></span><img src="${portal.img}" alt="${escapeHtml(portal.name)}"><span class="portal-art-caption">PORTAIL DIMENSIONNEL <b>${presentation.number}</b></span></div>
      <div class="portal-hero-copy"><span class="portal-eyebrow">${escapeHtml(presentation.type)}</span><h2>${escapeHtml(portal.name)}</h2><p>${escapeHtml(portal.desc)}</p><div class="portal-mission-tags"><span>${icon("target")}${escapeHtml(presentation.format)}</span><span>${icon("shield")}${escapeHtml(presentation.rhythm)}</span></div></div>
    </div>
    <div class="portal-mission-facts"><div><small>ACCÈS</small><strong>Niveau ${portal.requirement.level}<span>+</span></strong></div><div><small>MODE</small><strong>Solo</strong></div><div><small>VIES</small><strong>${access.lives}<span> / 3</span></strong></div><div><small>VICTOIRES</small><strong>${fmt(access.clears)}<span> nettoyage${access.clears === 1 ? "" : "s"}</span></strong></div></div>
    <section class="portal-collection-section" aria-label="Accès et fragments"><div class="portal-section-heading"><h3>Fragments du portail</h3><strong>${fmt(access.pieces)} <span>/ ${fmt(access.required)}</span></strong></div><div class="portal-collection-track" role="progressbar" aria-label="${escapeHtml(portal.pieceLabel)}" aria-valuemin="0" aria-valuemax="${access.required}" aria-valuenow="${Math.min(access.pieces, access.required)}"><span style="width:${access.progress}%"></span></div><div class="portal-collection-sources"><span>${escapeHtml((portal.dropZones || []).join(" · "))} <b>${mapDropChance} %</b></span><span>Space Caster <b>${((portal.casterDropChance ?? 0.04) * 100).toFixed(0)} %</b></span></div></section>
    <section class="portal-rewards-section" aria-label="Récompenses du portail"><div class="portal-section-heading"><h3>${icon("gift")}Récompenses</h3><span>À la victoire</span></div><div class="portal-guaranteed-rewards">${rewards.filter(reward=>reward.kind !== "special").map(renderReward).join("")}</div><ul class="portal-special-rewards">${specialRewards.map(reward=>`<li>${escapeHtml(reward.text)}</li>`).join("")}</ul>${unlockNote}</section>
    <footer class="portal-dossier-action"><p>${escapeHtml(hint)}</p><button type="button" class="blue-button portal-primary-action" ${action} data-portal-focus="access:${portal.id}" ${enabled ? "" : "disabled"}>${icon(enabled ? "arrow" : "lock")}${escapeHtml(actionText)}</button></footer>
  </div>`;
}

export function renderFocusedCaster(portal, state, {cost, priceHtml, canPay, renderResult}){
  const presentation = getPortalPresentation(portal);
  const access = getPortalAccess(portal, state);
  const count = [1, 10, 100].includes(Number(state.portalCasterPendingCount)) ? Number(state.portalCasterPendingCount) : 1;
  const totalCost = cost * count;
  const payable = canPay(totalCost);
  const cached = state.portalCasterResultsByPortal?.[portal.id];
  const results = Array.isArray(cached) ? cached : Array.isArray(state.portalCasterResults) ? state.portalCasterResults : [];
  const piecesFull = access.pieces >= access.required && access.clears <= 0;
  const ammo = id=>ammoTypes.find(entry=>entry.id === id)?.img || "";
  return `<div class="portal-caster-box portal-caster-focused" style="--portal-accent:${presentation.color}">
    <header class="portal-caster-title"><span class="portal-eyebrow">SPACE CASTER</span><h2>Obtenir des fragments</h2><p>Choisissez un lot et découvrez votre butin.</p></header>
    <div class="portal-caster-target"><img src="${portal.img}" alt=""><span><small>PORTAIL SÉLECTIONNÉ</small><strong>${escapeHtml(portal.shortName || portal.name)}</strong></span><b>${fmt(access.pieces)}<span> / ${fmt(access.required)}</span></b></div>
    <div class="portal-caster-fragment"><img src="${portal.pieceImg || portal.img}" alt=""><span><strong>${escapeHtml(portal.pieceLabel)}</strong><small>${piecesFull ? "Réserve complète" : "Chance par lancement"}</small></span><b>${piecesFull ? "—" : `${((portal.casterDropChance ?? 0.04) * 100).toFixed(0)} %`}</b></div>
    ${piecesFull ? `<p class="portal-caster-collection-note">Utilisez vos fragments pour reprendre leur collecte.</p>` : ""}
    <div class="portal-caster-loot"><span>Également dans le butin</span><div><span><img src="${ammo("ammo_x4")}" alt="">Munitions ×2 / ×3 / ×4</span><span><img src="${ammo("rocket_r2")}" alt="">Roquettes</span><span><img src="${ammo("missile_m1")}" alt="">Missiles</span></div></div>
    <fieldset class="portal-caster-lots"><legend>Nombre de lancements <span>${priceHtml(cost)} / unité</span></legend><div class="portal-caster-tabs">${[1, 10, 100].map(value=>`<button type="button" class="blue-button small ${count === value ? "active" : ""}" data-space-caster-count="${value}" data-space-caster-portal="${portal.id}" data-portal-focus="count:${value}" aria-pressed="${count === value}">×${value}</button>`).join("")}</div></fieldset>
    <div class="portal-caster-checkout"><div><span>Coût total</span><strong>${priceHtml(totalCost)}</strong></div><small>Votre solde ${currencyAmountHtml("premium", state.player.premium)}</small><button type="button" class="blue-button portal-caster-launch" data-space-caster-pay="${portal.id}" data-portal-focus="pay:${portal.id}" ${payable ? "" : "disabled"}>${icon("target")}Lancer ×${count}${icon("arrow")}</button>${payable ? "" : `<p class="portal-caster-insufficient">Solde NOVA insuffisant pour ce lot.</p>`}</div>
    <section class="portal-caster-history" aria-label="Résultats du Space Caster"><div class="portal-section-heading"><h3>Dernier tirage</h3><span>Butin reçu</span></div><div class="portal-caster-results ${results.length ? "" : "is-empty"}" aria-live="polite">${results.length ? results.map(entry=>renderResult(entry, portal)).join("") : `<div class="portal-caster-empty">${icon("gift")}<strong>Aucun tirage effectué</strong><span>Votre prochain butin apparaîtra ici.</span></div>`}</div></section>
  </div>`;
}

export function updatePortalPanel(element, html){
  if(!element || renderedPanels.get(element) === html) return;
  const focused = element.contains(document.activeElement) ? document.activeElement?.dataset?.portalFocus : null;
  const results = element.querySelector(".portal-caster-results");
  const resultsScroll = results?.scrollTop || 0;
  element.innerHTML = html;
  renderedPanels.set(element, html);
  if(resultsScroll) element.querySelector(".portal-caster-results")?.scrollTo({top:resultsScroll});
  if(focused){
    const target = [...element.querySelectorAll("[data-portal-focus]")].find(button=>button.dataset.portalFocus === focused);
    if(target && !target.disabled) target.focus({preventScroll:true});
  }
}
