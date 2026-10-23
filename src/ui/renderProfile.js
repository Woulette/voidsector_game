import { fmt } from "../core/utils.js";
import { getActiveDroneFormation, getCurrentRank, getDroneCatalog, getDroneLoadout, getDronePermanentUpgrade, getItemFromInventoryUid, getNextRank, getPlayerLevelCap, getPrestigeStatus, getRankAssetPath, getRankProgress, getShip, getShipCombatStats, getSpentSkillPoints, store } from "../core/store.js?v=20260726-kharon1";
import { getRarityLabel } from "../shared/rarities.js";
import { createProfilePresentation } from "./profilePresentation.js?v=20261023-profilemilestones1";
import { profileIcon } from "./profileIcons.js?v=20261023-profilemilestones1";
import { renderProfileMilestoneCards, syncProfileMilestoneDialog } from "./profileMilestones.js?v=20261023-profilemilestones1";
export { handleProfileMilestoneInteraction, handleProfileMilestoneKeydown, settleProfileMilestoneCommand } from "./profileMilestones.js?v=20261023-profilemilestones1";

const escapeHtml = value=>String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
const renderedMarkup = new WeakMap();

export function getProfilePresentationModel(){
  const rank = getCurrentRank();
  const nextRank = getNextRank();
  const drones = getDroneLoadout().map((uid, index)=>({uid, index})).filter(entry=>Boolean(entry.uid)).map(entry=>{
    const item = getItemFromInventoryUid(entry.uid);
    return {...entry, name:item?.short || item?.name || "Module inconnu", rarity:getRarityLabel(item), upgraded:Boolean(getDronePermanentUpgrade(entry.index))};
  });
  return createProfilePresentation({
    state:store.state, rank, nextRank, rankProgress:getRankProgress(), rankAsset:getRankAssetPath(rank), nextRankAsset:nextRank ? getRankAssetPath(nextRank) : "",
    levelCap:getPlayerLevelCap(), ship:getShip(store.state.activeShip), stats:getShipCombatStats(store.state.activeShip), ascension:getPrestigeStatus(),
    drones, drone:getDroneCatalog(), formation:getActiveDroneFormation(), displayMode:store.profileDisplay, spentSkillPoints:getSpentSkillPoints()
  });
}

function renderIdentity(identity){
  const next = identity.nextRank;
  return `<section class="pilot-profile-identity profile-frame" aria-labelledby="pilot-profile-identity-heading">
    <h3 id="pilot-profile-identity-heading" class="pilot-profile-card-heading">Identité du pilote</h3>
    <div class="pilot-profile-identity-body">
      <div class="pilot-profile-rank-art"><img src="${escapeHtml(identity.rankAsset)}" alt="Grade ${escapeHtml(identity.rankName)}"></div>
      <div class="pilot-profile-identity-copy">
        <h3 title="${escapeHtml(identity.name)}">${escapeHtml(identity.name)}</h3><strong class="pilot-profile-rank-name" title="${escapeHtml(identity.rankName)}">${escapeHtml(identity.rankName)}</strong>
        <p class="pilot-profile-level">Niveau ${fmt(identity.level)} / ${fmt(identity.levelCap)}</p>
        <div class="pilot-profile-rank-progress" role="progressbar" aria-label="Progression vers le prochain grade" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${identity.rankPercent}"><span style="width:${identity.rankPercent}%"></span></div>
        <div class="pilot-profile-next-rank">${next ? `<img src="${escapeHtml(next.asset)}" alt=""><div><span>Prochain grade : ${escapeHtml(next.name)}</span><small>${fmt(identity.rankPoints)} / ${fmt(next.points)} points de grade</small></div>` : `${profileIcon("check")}<div><span>Grade maximum atteint</span><small>${fmt(identity.rankPoints)} points de grade</small></div>`}</div>
      </div>
    </div>
  </section>`;
}

function renderDossier(counters){
  return `<section class="pilot-profile-dossier profile-frame" aria-labelledby="pilot-profile-dossier-heading"><h3 id="pilot-profile-dossier-heading" class="pilot-profile-card-heading">Dossier</h3><dl>${counters.map(entry=>`<div class="pilot-profile-dossier-row"${entry.detail ? ` title="${escapeHtml(entry.detail)}"` : ""}><dt>${profileIcon(entry.icon)}<span>${escapeHtml(entry.label)}</span></dt><dd>${escapeHtml(typeof entry.value === "number" ? fmt(entry.value) : entry.value)}</dd></div>`).join("")}</dl></section>`;
}

function renderDroneVisual(model){
  if(!model.drones.length) return `<div class="pilot-profile-drone-empty"><img src="${escapeHtml(model.droneImage)}" alt=""><strong>Aucun drone utilisé</strong><p>Équipez un module sur un drone pour l'activer.</p></div>`;
  return `<div class="pilot-profile-drone-content"><div class="pilot-profile-drone-summary"><span>Formation active</span><strong>${escapeHtml(model.formationName)}</strong><b>${fmt(model.drones.length)} actif${model.drones.length > 1 ? "s" : ""}</b></div><div class="pilot-profile-drone-grid" data-profile-scroll="drones">${model.drones.map(entry=>`<article class="pilot-profile-drone${entry.upgraded ? " upgraded" : ""}"><img src="${escapeHtml(model.droneImage)}" alt="Drone ${entry.index + 1}"><div><span>Drone ${String(entry.index + 1).padStart(2, "0")}</span><strong>${escapeHtml(entry.name)}</strong><small>${entry.upgraded ? "Noyau Overdrive actif" : escapeHtml(entry.rarity)}</small></div></article>`).join("")}</div></div>`;
}

function renderShowcase(model){
  const {ship, displayMode} = model;
  return `<section class="pilot-profile-showcase profile-frame ${escapeHtml(ship.rarityClass)}" aria-label="${displayMode === "ship" ? "Vaisseau actif" : "Drones utilisés"}">
    <div class="pilot-profile-stage-grid" aria-hidden="true"></div><div class="pilot-profile-stage-radar" aria-hidden="true"><i></i><i></i></div>
    <div class="pilot-profile-showcase-heading"><span>${displayMode === "ship" ? "Vaisseau actif" : "Drones utilisés"}</span><h3>${escapeHtml(displayMode === "ship" ? ship.name : model.formationName)}</h3><p>${escapeHtml(displayMode === "ship" ? ship.className : `${model.drones.length} drone${model.drones.length > 1 ? "s" : ""} actif${model.drones.length > 1 ? "s" : ""}`)}</p>${displayMode === "ship" ? `<b class="pilot-profile-rarity">${escapeHtml(ship.rarity)}</b>` : ""}</div>
    ${displayMode === "drones" ? renderDroneVisual(model) : `<img class="pilot-profile-ship-art" src="${escapeHtml(ship.image)}" alt="${escapeHtml(ship.name)}">`}
    <div class="pilot-profile-view-switch" role="group" aria-label="Affichage du profil"><button type="button" data-profile-display="ship" aria-pressed="${displayMode === "ship"}" class="${displayMode === "ship" ? "active" : ""}">Vaisseau</button><button type="button" data-profile-display="drones" aria-pressed="${displayMode === "drones"}" class="${displayMode === "drones" ? "active" : ""}">Drones utilisés <b>${fmt(model.drones.length)}</b></button></div>
  </section>`;
}

function renderStats(model){
  return `<aside class="pilot-profile-right profile-frame" aria-label="Statistiques effectives et expérience"><section class="pilot-profile-efficiency"><h3 class="pilot-profile-card-heading">Efficacité du vaisseau</h3><dl>${model.stats.map(entry=>`<div class="pilot-profile-stat"><dt>${profileIcon(entry.icon)}<span>${escapeHtml(entry.label)}</span></dt><dd>${fmt(entry.value)}${escapeHtml(entry.suffix || "")}</dd></div>`).join("")}</dl><p class="pilot-profile-stats-note">${profileIcon("info")}<span>Équipement et bonus actifs inclus.</span></p></section><section class="pilot-profile-experience"><h3 class="pilot-profile-card-heading">Expérience</h3><p>XP ${fmt(model.xp.value)} / ${fmt(model.xp.next)}</p><div class="pilot-profile-xp-progress" role="progressbar" aria-label="Expérience du niveau actuel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${model.xp.percent}"><span style="width:${model.xp.percent}%"></span></div><small>${fmt(model.xp.total)} XP cumulée</small></section></aside>`;
}

export function renderProfileMarkup(model){
  return `<div class="pilot-profile-sheet${model.ascension.ascended ? " ascended" : ""}"><header class="pilot-profile-heading"><span class="tiny">Hangar</span><h2>Dossier du pilote</h2></header><div class="pilot-profile-grid"><div class="pilot-profile-left">${renderIdentity(model.identity)}${renderDossier(model.counters)}</div>${renderShowcase(model)}${renderStats(model)}</div><div class="pilot-profile-footer">${renderProfileMilestoneCards(model)}</div></div>`;
}

export function updateProfilePresentation(section, model){
  syncProfileMilestoneDialog(model);
  const markup = renderProfileMarkup(model);
  if(renderedMarkup.get(section) === markup) return;
  const scroll = [...section.querySelectorAll("[data-profile-scroll]")].map(element=>({id:element.dataset.profileScroll, top:element.scrollTop, left:element.scrollLeft}));
  const active = section.contains(document.activeElement) ? document.activeElement : null;
  const focusAttribute = ["data-profile-display", "data-profile-milestone-open"].find(attribute=>active?.hasAttribute(attribute));
  const focusValue = focusAttribute ? active.getAttribute(focusAttribute) : null;
  section.innerHTML = markup;
  renderedMarkup.set(section, markup);
  for(const position of scroll){
    const element = [...section.querySelectorAll("[data-profile-scroll]")].find(entry=>entry.dataset.profileScroll === position.id);
    if(element){ element.scrollTop = position.top; element.scrollLeft = position.left; }
  }
  if(focusAttribute){
    const controls = [...section.querySelectorAll(`[${focusAttribute}]`)];
    const target = controls.find(element=>element.getAttribute(focusAttribute) === focusValue);
    target?.focus({preventScroll:true});
  }
}

export function renderProfile(){
  const section = document.getElementById("profileSection");
  if(section) updateProfilePresentation(section, getProfilePresentationModel());
}
