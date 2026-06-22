import { ammoTypes, portals } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import { canAfford, getCurrencyPrice, getPortalPieces, hasCurrencyDiscount, isPortalUnlocked, store } from "../core/store.js";
import { currencyAmountHtml } from "./currencyIcons.js";

function getCasterCost(){
  return 100;
}

function novaPriceHtml(price){
  const current = `<b class="shop-price premium">${currencyAmountHtml("premium", getCurrencyPrice("premium", price))}</b>`;
  if(!hasCurrencyDiscount("premium", price)) return current;
  return `<span class="shop-price-discount"><s>${currencyAmountHtml("premium", price)}</s>${current}</span>`;
}

function portalRewardHtml(reward){
  return String(reward || "").split(" · ").map(part=>{
    const match = part.match(/^([\d\s]+) NOVA(.*)$/i);
    return match ? `${currencyAmountHtml("premium", Number(match[1].replace(/\s/g, "")))}${match[2] || ""}` : part;
  }).join(" · ");
}

function getResultImage(entry, portal){
  if(entry?.img) return entry.img;
  const label = String(entry?.label || "").toLowerCase();
  if(label.includes("piece")) return portal.img;
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
  const results = Array.isArray(store.state.portalCasterResults) ? store.state.portalCasterResults : [];
  const canPay = canAfford("premium", totalCost);
  const completed = Math.max(0, Number(store.state.completedPortals?.[portal.id] || 0));
  const piecesFull = getPortalPieces(portal.id) >= portal.piecesRequired && completed <= 0;
  return `<div class="portal-caster-box">
    <div>
      <span class="tiny">SPACE CASTER</span>
      <h2>${portal.name}</h2>
    </div>
    <div class="portal-caster-orb"><img src="${portal.img}" alt="${portal.name}"></div>
    <div class="portal-caster-summary">
      <span>Cout : ${novaPriceHtml(cost)} par lancement</span>
      <span>Butin possible : pieces de portail, munitions x2/x3/x4, roquettes et missiles.</span>
      <span>Pieces : 4%${piecesFull ? " - bloquees jusqu'au nettoyage du portail" : ""}</span>
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

export function renderPortals(){
  const grid = document.getElementById("portalGrid");
  const caster = document.getElementById("portalCasterPanel");
  if(!grid) return;
  const selectedId = store.state.selectedPortalCasterId || portals[0]?.id;
  const selectedPortal = portals.find(p=>p.id === selectedId) || portals[0];
  grid.innerHTML = portals.map(p=>{
    const pieces = getPortalPieces(p.id);
    const unlocked = isPortalUnlocked(p.id);
    const reqLevelOk = store.state.player.level >= p.requirement.level;
    const canEnter = unlocked && reqLevelOk && !!store.state.activeShip;
    const canUnlockPieces = !unlocked && reqLevelOk && pieces >= p.piecesRequired;
    const clearCount = Math.max(0, Number(store.state.completedPortals?.[p.id] || 0));
    const run = store.state.portalRuns?.[p.id] || null;
    const runLives = run ? Math.max(0, Math.min(3, Math.round(Number(run.lives || 0)))) : 3;
    const actionLabel = run && runLives > 0 ? "Reprendre" : "Entrer";
    const actionHtml = unlocked
      ? `<button class="blue-button small" data-start-portal="${p.id}" ${canEnter ? "" : "disabled"}>${canEnter ? actionLabel : !store.state.activeShip ? "Equiper un vaisseau" : "Prerequis manquants"}</button>`
      : `<button class="blue-button secondary small" data-unlock-portal-pieces="${p.id}" ${canUnlockPieces ? "" : "disabled"}>Utiliser ${fmt(p.piecesRequired)} pieces</button><button class="blue-button small" data-portal-caster-select="${p.id}">Space Caster</button>`;
    return `<article class="portal-card ${canEnter ? "ready" : unlocked ? "unlocked" : "locked"} ${selectedPortal?.id === p.id ? "selected" : ""}" data-portal-caster-select="${p.id}">
      <img src="${p.img}" alt="${p.name}">
      <div class="portal-card-head"><h3>${p.name}</h3><span class="badge">${p.level}</span></div>
      <div class="portal-state">${unlocked ? "DEVERROUILLE" : "SCELLE"} - ${reqLevelOk ? "Niveau OK" : `Niv ${p.requirement.level}`}</div>
      <div class="portal-piece-row"><span>Pieces</span><strong>${fmt(pieces)} / ${fmt(p.piecesRequired)}</strong></div>
      <div class="stat-track compact"><span style="width:${Math.min(100, pieces / p.piecesRequired * 100)}%"></span></div>
      <p class="portal-copy">Drop : ${p.dropZones.join(", ")} - taux ${p.dropChance ? (p.dropChance * 100).toFixed(2).replace(".", ",") : "0,00"}%</p>
      <p class="portal-copy reward">Recompense : ${portalRewardHtml(p.reward)}</p>
      ${unlocked ? `<p class="portal-copy">Vies : ${runLives}/3${run?.status === "dead" ? " - reprise disponible" : ""}</p>` : ""}
      <div class="portal-actions">${actionHtml}</div>
      <small class="portal-history">${clearCount ? `${clearCount} nettoyage(s)` : "Jamais termine"}</small>
    </article>`;
  }).join("");
  if(caster) caster.innerHTML = renderCasterPanel(selectedPortal);
}
