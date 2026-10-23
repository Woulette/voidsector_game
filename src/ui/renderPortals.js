import { ammoTypes, portals } from "../data/catalog.js?v=20260726-ancient1";
import { fmt } from "../core/utils.js";
import { canAfford, getCurrencyPrice, getPortalPieces, hasCurrencyDiscount, isPortalUnlocked, store } from "../core/store.js?v=20260726-kharon1";
import { currencyAmountHtml } from "./currencyIcons.js";
import { getPortalPresentation } from "./portalPresentation.js?v=20261023-portals-ui1";
import { renderFocusedCaster, renderPortalDetail, renderPortalNavigation, updatePortalPanel } from "./renderPortalWorkspace.js?v=20261023-portals-ui1";

function getCasterCost(){
  return 100;
}

function percentLabel(value){
  return `${(Math.max(0, Number(value || 0)) * 100).toFixed(2).replace(".", ",")}%`;
}

function portalMapDropLabel(portal){
  const zones = Array.isArray(portal?.dropZones) ? portal.dropZones : [];
  if(!zones.length || zones.every(zone=>String(zone).trim().toLowerCase() === "à définir")){
    return "Drop sur les maps : zones à définir";
  }
  return `Drop ${zones.join(", ")} : ${percentLabel(portal.dropChance)}`;
}

function novaPriceHtml(price){
  const current = `<b class="shop-price premium">${currencyAmountHtml("premium", getCurrencyPrice("premium", price))}</b>`;
  if(!hasCurrencyDiscount("premium", price)) return current;
  return `<span class="shop-price-discount"><s>${currencyAmountHtml("premium", price)}</s>${current}</span>`;
}

function portalRewardHtml(reward){
  return String(reward || "").split(/\s*(?:Â·|·)\s*/u).map(part=>{
    const match = part.match(/^([\d\s]+) NOVA(.*)$/i);
    return match ? `${currencyAmountHtml("premium", Number(match[1].replace(/\s/g, "")))}${match[2] || ""}` : part;
  }).join(" · ");
}

function getResultImage(entry, portal){
  if(entry?.img) return entry.img;
  const label = String(entry?.label || "").toLowerCase();
  if(/pi[eè]ce|fragment/u.test(label)) return portal.pieceImg || portal.img;
  if(label.includes("x2")) return ammoTypes.find(ammo=>ammo.id === "ammo_x2")?.img || "";
  if(label.includes("x3")) return ammoTypes.find(ammo=>ammo.id === "ammo_x3")?.img || "";
  if(label.includes("x4")) return ammoTypes.find(ammo=>ammo.id === "ammo_x4")?.img || "";
  if(label.includes("r-1")) return ammoTypes.find(ammo=>ammo.id === "rocket_r1")?.img || "";
  if(label.includes("r-2")) return ammoTypes.find(ammo=>ammo.id === "rocket_r2")?.img || "";
  if(label.includes("r-3")) return ammoTypes.find(ammo=>ammo.id === "rocket_r3")?.img || "";
  if(label.includes("ms-1")) return ammoTypes.find(ammo=>ammo.id === "missile_m1")?.img || "";
  if(label.includes("ms-2")) return ammoTypes.find(ammo=>ammo.id === "missile_m2")?.img || "";
  return "";
}

function renderCasterResult(entry, portal){
  const img = getResultImage(entry, portal);
  return `<div class="portal-caster-result">
    <span>${img ? `<img src="${img}" alt="">` : ""}<em>${entry.label}</em></span>
    <b>x${fmt(entry.amount)}</b>
  </div>`;
}

function renderCasterPanel(portal){
  if(!portal) return "";
  const cost = getCasterCost();
  const pendingCount = [1, 10, 100].includes(Number(store.state.portalCasterPendingCount)) ? Number(store.state.portalCasterPendingCount) : 1;
  const totalCost = cost * pendingCount;
  const cachedResults = store.state.portalCasterResultsByPortal?.[portal.id];
  const results = Array.isArray(cachedResults)
    ? cachedResults
    : Array.isArray(store.state.portalCasterResults)
      ? store.state.portalCasterResults
      : [];
  const canPay = canAfford("premium", totalCost);
  const completed = Math.max(0, Number(store.state.completedPortals?.[portal.id] || 0));
  const piecesFull = getPortalPieces(portal.id) >= portal.piecesRequired && completed <= 0;
  const pieceLabel = portal.pieceLabel || "Fragments de portail";
  const casterDropChance = percentLabel(portal.casterDropChance ?? 0.04);
  return `<div class="portal-caster-box">
    <div class="portal-caster-heading">
      <div>
        <span class="tiny">SPACE CASTER</span>
        <h2>${portal.name}</h2>
      </div>
      <strong class="portal-caster-piece-count" title="${pieceLabel} obtenus">
        <small>${pieceLabel}</small>
        <span>${fmt(getPortalPieces(portal.id))} / ${fmt(portal.piecesRequired)}</span>
      </strong>
    </div>
    <div class="portal-caster-orb"><img src="${portal.img}" alt="${portal.name}"></div>
    <div class="portal-caster-summary">
      <span>Cout : ${novaPriceHtml(cost)} par lancement</span>
      <span>Butin possible : ${pieceLabel.toLowerCase()}, munitions x2/x3/x4, roquettes et missiles.</span>
      <span>${pieceLabel} : ${casterDropChance} au Space Caster${piecesFull ? ` · collecte suspendue tant que les ${portal.piecesRequired} fragments n’ont pas été utilisés` : ""} · ${portalMapDropLabel(portal)}</span>
    </div>
    <div class="portal-caster-tabs">
      <button class="blue-button small ${pendingCount === 1 ? "active" : ""}" data-space-caster-count="1" data-space-caster-portal="${portal.id}">x1</button>
      <button class="blue-button small ${pendingCount === 10 ? "active" : ""}" data-space-caster-count="10" data-space-caster-portal="${portal.id}">x10</button>
      <button class="blue-button small ${pendingCount === 100 ? "active" : ""}" data-space-caster-count="100" data-space-caster-portal="${portal.id}">x100</button>
    </div>
    <div class="portal-caster-pay">
      <span>Prix selection : ${novaPriceHtml(totalCost)}</span>
      <button class="blue-button" data-space-caster-pay="${portal.id}" ${canPay ? "" : "disabled"}>Payer</button>
    </div>
    <div class="portal-caster-results">
      ${results.length ? results.map(entry=>renderCasterResult(entry, portal)).join("") : `<div class="portal-caster-result"><span>Aucun lancement effectue</span><b>-</b></div>`}
    </div>
  </div>`;
}

function renderLegacyPortalCard(p, selectedPortal){
    const pieces = getPortalPieces(p.id);
    const unlocked = isPortalUnlocked(p.id);
    const reqLevelOk = store.state.player.level >= p.requirement.level;
    const contentReady = p.contentStatus !== "to_define";
    const canEnter = unlocked && reqLevelOk && !!store.state.activeShip && contentReady;
    const canUnlockPieces = !unlocked && reqLevelOk && pieces >= p.piecesRequired;
    const clearCount = Math.max(0, Number(store.state.completedPortals?.[p.id] || 0));
    const run = store.state.portalRuns?.[p.id] || null;
    const runLives = run ? Math.max(0, Math.min(3, Math.round(Number(run.lives || 0)))) : 3;
    const pieceUnit = p.pieceUnit || "pièces";
    const casterAction = `<button class="blue-button small" data-portal-caster-select="${p.id}">Space Caster</button>`;
    const levelGateLabel = `Niveau ${p.requirement.level} requis`;
    const actionHtml = unlocked
      ? `<button class="blue-button small" data-prepare-portal="${p.id}" ${canEnter ? "" : "disabled"}>${canEnter ? "Preparer" : !reqLevelOk ? levelGateLabel : !contentReady ? "Contenu à définir" : !store.state.activeShip ? "Equiper un vaisseau" : "Prerequis manquants"}</button>${casterAction}`
      : `<button class="blue-button secondary small" data-unlock-portal-pieces="${p.id}" ${canUnlockPieces ? "" : "disabled"}>${!reqLevelOk ? levelGateLabel : `Utiliser ${fmt(p.piecesRequired)} ${pieceUnit}`}</button>${casterAction}`;
    return `<article class="portal-card ${canEnter ? "ready" : unlocked ? "unlocked" : "locked"} ${contentReady ? "content-ready" : "content-pending"} ${selectedPortal?.id === p.id ? "selected" : ""}" data-portal-caster-select="${p.id}">
      <img src="${p.img}" alt="${p.name}">
      <div class="portal-card-head"><h3>${p.name}</h3><span class="badge">${p.level}</span></div>
      <div class="portal-state">SOLO · ${unlocked ? "DEVERROUILLE" : "SCELLE"} - ${reqLevelOk ? "Niveau OK" : `Niv ${p.requirement.level}`}</div>
      <p class="portal-content-status ${contentReady ? "ready" : "pending"}">${p.contentLabel || (contentReady ? "Contenu disponible" : "Contenu à définir")}</p>
      ${p.desc ? `<p class="portal-copy intro">${p.desc}</p>` : ""}
      <div class="portal-piece-row"><span>${p.pieceLabel || "Pièces"}</span><strong>${fmt(pieces)} / ${fmt(p.piecesRequired)}</strong></div>
      <div class="stat-track compact"><span style="width:${Math.min(100, pieces / p.piecesRequired * 100)}%"></span></div>
      <p class="portal-copy">${portalMapDropLabel(p)}</p>
      <p class="portal-copy reward">Recompense : ${portalRewardHtml(p.reward)}</p>
      ${unlocked ? `<p class="portal-copy">Vies : ${runLives}/3${run?.status === "dead" ? " - reprise disponible" : ""}</p>` : ""}
      <div class="portal-actions">${actionHtml}</div>
      <small class="portal-history">${clearCount ? `${clearCount} nettoyage(s)` : "Jamais termine"}</small>
    </article>`;
}

export function renderPortals(){
  const grid = document.getElementById("portalGrid");
  const caster = document.getElementById("portalCasterPanel");
  const detail = document.getElementById("portalDetailPanel");
  if(!grid) return;
  const selectedId = store.state.selectedPortalCasterId || portals[0]?.id;
  const selectedPortal = portals.find(p=>p.id === selectedId) || portals[0];
  if(!detail){
    updatePortalPanel(grid, portals.map(portal=>renderLegacyPortalCard(portal, selectedPortal)).join(""));
    updatePortalPanel(caster, renderCasterPanel(selectedPortal));
    return;
  }
  const focused = Boolean(getPortalPresentation(selectedPortal));
  const otherOpen = Boolean(grid.querySelector(".portal-other-list")?.open) || !focused;
  updatePortalPanel(grid, renderPortalNavigation(portals, selectedPortal.id, store.state, otherOpen));
  updatePortalPanel(detail, focused ? renderPortalDetail(selectedPortal, store.state) : renderLegacyPortalCard(selectedPortal, selectedPortal));
  caster?.classList.toggle("has-focused-caster", focused);
  updatePortalPanel(caster, focused ? renderFocusedCaster(selectedPortal, store.state, {
    cost:getCasterCost(),
    priceHtml:novaPriceHtml,
    canPay:price=>canAfford("premium", price),
    renderResult:renderCasterResult
  }) : renderCasterPanel(selectedPortal));
}
