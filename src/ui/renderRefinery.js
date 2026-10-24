import { fmt } from "../core/utils.js";
import {
  getAllRefineryMaterials, getMaterialCount, getMaterialStorageCap, getMaterialStorageCapAt,
  getRawMaterial, getRefineryMaterialLevel, getRefineryModuleLevel, getRefineryModuleUpgradeData,
  getRefineryProductionRate, getRefineryProductionRateAt, getRefineryRecipes, getRefineryRushCost,
  getRefineryTransportCapacity, getRefineryTransportCapacityAt, getRefineryUpgradeData,
  getRefineryUpgradeProgress, isRefineryProductionEnabled, store
} from "../core/store.js?v=20260726-kharon1";
import { currencyAmountHtml, currencyIconHtml } from "./currencyIcons.js";
import { updateRefineryDom } from "./refineryDom.js";
import { refineryShipmentPanel, refineryStatsPanel } from "./refineryHangarPanels.js";
import {
  REFINERY_TREE_POSITIONS, refineryArt, refineryDuration, refineryEscape as esc,
  refineryMaterialName as name, refineryProductionStatus, refineryStocksHtml, refineryTreeHtml
} from "./refineryPresentation.js";

const boundPanels = new WeakSet();

function bindQuantityInputs(panel){
  if(boundPanels.has(panel)) return;
  boundPanels.add(panel);
  panel.addEventListener("input", event=>{
    const input = event.target.closest?.("[data-refinery-shipment-amount]");
    if(!input) return;
    store.selectedRefineryShipmentAmount = Math.max(1, Math.ceil(Number(input.value || 1)));
    renderRefinery();
  });
}

function moduleIllustration(id){
  return {name:id === "storage" ? "Module de stockage" : "Transporteur spatial", img:`assets/materials/refinery-v2/module-${id === "storage" ? "stockage" : "transport"}.png`};
}

function moduleButton(id){
  const storage = id === "storage", job = getRefineryUpgradeProgress("module", id);
  const data = getRefineryModuleUpgradeData(id);
  const art = moduleIllustration(id);
  return `<button type="button" class="rf-module" data-upgrade-refinery-module="${id}" data-refinery-key="module:${id}" ${!job && !data ? "disabled" : ""}>${refineryArt(art, "rf-module-art")}<span class="rf-module-copy"><strong>${storage ? "Stockage" : "Transport"}</strong><small>${storage ? `${fmt(getMaterialStorageCap("cuivre_orbital"))} / minerai` : `${fmt(getRefineryTransportCapacity())} / envoi`}</small>${job ? `<small class="rf-module-job">Amélioration · ${refineryDuration(job.remaining)}</small>` : ""}</span><b>Niveau ${getRefineryModuleLevel(id)}</b><span class="rf-module-open" aria-hidden="true">↗</span>${job ? `<i class="rf-module-progress" style="width:${job.percent}%"></i>` : ""}</button>`;
}

function upgradePopover(){
  const selected = store.selectedRefineryUpgrade;
  if(!selected) return "";
  const isModule = selected.type === "module";
  if(isModule ? !["storage", "transport"].includes(selected.id) : !REFINERY_TREE_POSITIONS[selected.id]) return "";
  const job = getRefineryUpgradeProgress(selected.type, selected.id);
  const data = isModule ? getRefineryModuleUpgradeData(selected.id) : getRefineryUpgradeData(selected.id);
  const material = isModule ? moduleIllustration(selected.id) : getRawMaterial(selected.id);
  const currentLevel = isModule ? getRefineryModuleLevel(selected.id) : getRefineryMaterialLevel(selected.id);
  const nextLevel = job?.toLevel ?? data?.nextLevel ?? currentLevel;
  const title = isModule ? (selected.id === "storage" ? "Stockage" : "Transport") : name(material);
  const rush = job ? getRefineryRushCost(selected.type, selected.id) : null;
  const delta = isModule
    ? selected.id === "storage"
      ? `Capacité par minerai <b>${fmt(getMaterialStorageCapAt("cuivre_orbital", currentLevel))} → ${fmt(getMaterialStorageCapAt("cuivre_orbital", nextLevel))}</b>`
      : `Capacité par envoi <b>${fmt(getRefineryTransportCapacityAt(currentLevel))} → ${fmt(getRefineryTransportCapacityAt(nextLevel))}</b>`
    : `Débit théorique / h <b>${fmt(getRefineryProductionRateAt(selected.id, currentLevel))} → ${fmt(getRefineryProductionRateAt(selected.id, nextLevel))}</b>`;
  const costs = Object.entries(data?.materials || {}).map(([id, amount])=>{
    const input = getRawMaterial(id), have = getMaterialCount(id);
    return `<div class="rf-cost ${have >= amount ? "is-affordable" : "is-missing"}">${refineryArt(input)}<span>${esc(name(input))}</span><b>${fmt(have)} / ${fmt(amount)}</b></div>`;
  }).join("");
  return `<div class="sky-upgrade-overlay" data-refinery-key="upgrade-overlay"><section class="sky-upgrade-popover" role="dialog" aria-modal="true" aria-labelledby="refinery-upgrade-title" data-refinery-key="upgrade:${esc(selected.type)}:${esc(selected.id)}">
    <button type="button" class="sky-upgrade-close" data-close-refinery-upgrade aria-label="Fermer l’amélioration">×</button><span class="rf-eyebrow">${job ? "AMÉLIORATION EN COURS" : "AMÉLIORATION DE LA STATION"}</span><div class="rf-upgrade-heading">${refineryArt(material)}<div><h3 id="refinery-upgrade-title">${esc(title)}</h3><span>Niveau ${currentLevel} → ${nextLevel}</span></div></div><div class="rf-upgrade-delta">${delta}</div>${job
    ? `<div class="rf-upgrade-timer"><span>Temps restant <b>${refineryDuration(job.remaining)}</b></span><div class="rf-progress"><i style="width:${job.percent}%"></i></div><span>Terminer maintenant <b>${currencyAmountHtml("premium", rush?.effectiveCost ?? rush?.cost ?? 0)}</b></span><button type="button" class="rf-primary" data-rush-refinery-upgrade="${esc(selected.id)}" data-rush-refinery-type="${esc(selected.type)}" ${rush?.canAfford ? "" : "disabled"}>Terminer maintenant</button></div>`
    : `<div class="rf-upgrade-costs"><span class="rf-eyebrow">RESSOURCES NÉCESSAIRES</span><div class="rf-cost ${Number(store.state.player.credits || 0) >= Number(data?.credits || 0) ? "is-affordable" : "is-missing"}">${currencyIconHtml("credits")}<span>Crédits</span><b>${fmt(store.state.player.credits)} / ${fmt(data?.credits || 0)}</b></div>${costs}</div><div class="rf-upgrade-duration"><span>Durée</span><b>${data ? refineryDuration(data.duration) : "Niveau maximum"}</b></div><button type="button" class="rf-primary" ${data?.canAfford ? "" : "disabled"} ${isModule ? `data-confirm-refinery-module-upgrade="${esc(selected.id)}"` : `data-confirm-refinery-upgrade="${esc(selected.id)}"`}>${currentLevel <= 0 ? "Débloquer la production" : "Lancer l’amélioration"}</button>`}</section></div>`;
}

function forgePanel(materials, recipes, read){
  const selectedId = materials.some(material=>material.id === store.selectedRefineryMaterial)
    ? store.selectedRefineryMaterial : "noyau_astra";
  return `<div class="rf-forge" data-refinery-key="forge">${refineryStocksHtml(materials, read)}${refineryTreeHtml(materials, recipes, selectedId, read)}</div>`;
}

export function renderRefinery(){
  const panel = document.getElementById("refineryPanel");
  if(!panel) return;
  bindQuantityInputs(panel);
  const materials = getAllRefineryMaterials(), recipes = getRefineryRecipes();
  const read = id=>{
    const level = getRefineryMaterialLevel(id), stock = getMaterialCount(id), cap = getMaterialStorageCap(id);
    const enabled = isRefineryProductionEnabled(id), recipe = recipes.find(entry=>entry.outputId === id);
    return {level, stock, cap, enabled, rate:getRefineryProductionRate(id), upgrade:getRefineryUpgradeData(id), job:getRefineryUpgradeProgress("material", id),
      status:refineryProductionStatus({level, stock, cap, enabled, recipe, getStock:getMaterialCount})};
  };
  const tab = ["forge", "shipment", "stats"].includes(store.selectedRefineryTab) ? store.selectedRefineryTab : "forge";
  const panelHead = panel.closest(".refinery-panel")?.querySelector(".panel-head");
  if(panelHead){
    updateRefineryDom(panelHead, `<div class="rf-header-title" data-refinery-key="header-title"><span class="rf-eyebrow">COMPLEXE ORBITAL</span><h2>Raffinerie</h2></div><nav class="sky-refinery-tabs" aria-label="Sections de la raffinerie" data-refinery-key="sections">${[["forge", "Raffinerie", "◇"], ["shipment", "Expédition", "↗"], ["stats", "Bilan de production", "▥"]].map(([id, label, icon])=>`<button type="button" data-refinery-tab="${id}" data-refinery-key="tab:${id}" aria-pressed="${tab === id}" class="${tab === id ? "active" : ""}"><span aria-hidden="true">${icon}</span>${label}</button>`).join("")}</nav><div class="rf-infrastructure" data-refinery-key="infrastructure">${moduleButton("storage")}${moduleButton("transport")}</div>`);
  }
  const title = tab === "shipment" ? "Préparer une expédition" : tab === "stats" ? "Bilan de production" : "Raffinerie orbitale";
  const intro = tab === "shipment" ? "Transférez des matériaux de la station vers la soute de votre vaisseau." : tab === "stats" ? "Comprendre ce que votre station produit, transforme et conserve." : "Toute la chaîne de fabrication, de vos minerais au Noyau Astra.";
  updateRefineryDom(panel, `<div class="sky-refinery rf-workshop" data-refinery-key="workshop">${tab === "forge" ? "" : `<header class="rf-page-heading"><h2>${title}</h2><p>${intro}</p></header>`}${tab === "shipment" ? refineryShipmentPanel() : tab === "stats" ? refineryStatsPanel(materials, recipes, read) : forgePanel(materials, recipes, read)}${upgradePopover()}</div>`);
}
