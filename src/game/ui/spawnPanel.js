import { renderRefineryPanel } from "./spawnRefineryPanel.js";
import { renderQuestPanel } from "./questRelayPanel.js";
import { fmt, fmtCompact } from "../../core/utils.js";
import { ammoTypes, craftResourceCatalog, equipment, portals } from "../../data/catalog.js?v=20260726-kharon1";
import { CRAFT_CATEGORY_TABS, getCraftJobProgress, getCraftRecipe, getCraftRecipeAvailability, getRedundantCraftOutputReason, getVisibleCraftRecipes } from "../../data/craftingRecipes.js?v=20260726-kharon1";
import { getNovaDiscountedPrice } from "../../data/premium.js?v=20260726-kharon1";
import { MATERIAL_COMMERCE_ORDER, getMaterialCommerceUnitPrice, getMaterialCommerceValue } from "../../shared/materialCommerce.js";
import { getRarityLabel, getRarityTier } from "../../shared/rarities.js";
import { RESOURCE_DROP_BANDS, formatResourceDropChance } from "../../shared/resourceDropRules.js?v=20260726-kharon1";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function commerceCreditsHtml(amount){
  return `<span class="commerce-credit-value"><span>${fmt(amount)}</span><img src="assets/icons/credits.svg" alt="" aria-hidden="true"></span>`;
}

function currencyCostHtml(amount, type = "credits"){
  const value = Math.max(0, Math.floor(Number(amount || 0)));
  const formatted = fmt(value);
  const icon = type === "premium" ? "assets/icons/premium.svg" : "assets/icons/credits.svg";
  const label = type === "premium" ? "NOVA" : "Credits";
  return `<span class="craft-currency ${type}">
    <img src="${icon}" alt="" aria-hidden="true">
    <span class="craft-currency-copy"><b title="${escapeHtml(formatted)}">${escapeHtml(formatted)}</b><small>${label}</small></span>
  </span>`;
}

function renderCraftPaymentChoice(costs = {}, selectedPaymentType = "", profile = {}){
  const selected = selectedPaymentType === "credits" || selectedPaymentType === "premium"
    ? selectedPaymentType
    : "";
  const player = profile.player || {};
  const options = [
    {type:"premium", amount:getNovaDiscountedPrice(costs.premium, player), balance:Math.max(0, Number(player.premium || 0))},
    {type:"credits", amount:Math.max(0, Math.floor(Number(costs.credits || 0))), balance:Math.max(0, Number(player.credits || 0))}
  ];
  return `<div class="craft-payment-choice" role="radiogroup" aria-label="Moyen de paiement">
    ${options.map((option, index)=>{
      const active = selected === option.type;
      const unavailable = option.balance < option.amount;
      return `${index ? `<span class="craft-payment-or" aria-hidden="true">OU</span>` : ""}
        <button class="craft-payment-option ${active ? "active" : ""} ${unavailable ? "unavailable" : ""}" type="button"
          data-craft-payment="${option.type}" role="radio" aria-checked="${active ? "true" : "false"}">
          ${currencyCostHtml(option.amount, option.type)}
          <small>${active ? "Selectionne" : "Choisir"}</small>
        </button>`;
    }).join("")}
  </div>`;
}

const CRAFT_RESOURCE_BY_ID = new Map(craftResourceCatalog.map(material=>[String(material.id), material]));
const CRAFT_CATEGORY_LABEL_BY_ID = new Map(CRAFT_CATEGORY_TABS.map(tab=>[tab.id, tab.label]));

function humanizeIdentifier(value, fallback = "Ressource inconnue"){
  const clean = String(value || "").trim();
  if(!clean || clean === "undefined") return fallback;
  return clean
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char=>char.toUpperCase());
}

function getCraftMaterialMeta(id, materials = []){
  const cleanId = String(id || "");
  const fromCraftCatalog = CRAFT_RESOURCE_BY_ID.get(cleanId);
  if(fromCraftCatalog) return fromCraftCatalog;
  const fromProvidedMaterials = materials.find(entry=>String(entry?.id || "") === cleanId && (entry.name || entry.short || entry.img));
  if(fromProvidedMaterials) return fromProvidedMaterials;
  return {
    id:cleanId,
    name:humanizeIdentifier(cleanId),
    short:"",
    img:"assets/materials/cargo_box.svg"
  };
}

function craftCategoryLabel(category){
  return CRAFT_CATEGORY_LABEL_BY_ID.get(category) || humanizeIdentifier(category, "Categorie");
}


export function canOpenSpawnPanelMode(mode, canUseFirmServices){
  return !mode
    || mode === "crafting"
    || mode === "refinery"
    || mode === "commerce"
    || Boolean(canUseFirmServices);
}

function renderCommercePanel({
  materials = [],
  shipCargo = {},
  shipCargoUsed = 0,
  shipCargoCapacity = 0,
  commerceSaleAllowed = true
}){
  const materialById = id => materials.find(material=>material.id === id) || null;
  const getCargoAmount = id => Math.max(0, Math.floor(Number(shipCargo?.[id] || 0)));
  const orderedMaterials = MATERIAL_COMMERCE_ORDER
    .map(materialById)
    .filter(Boolean);
  const hiddenMaterials = materials
    .filter(material=>!MATERIAL_COMMERCE_ORDER.includes(material.id) && !material.rarity && getCargoAmount(material.id) > 0);
  const rows = orderedMaterials.map(material=>{
    const amount = getCargoAmount(material.id);
    const unitPrice = getMaterialCommerceUnitPrice(material.id);
    return `<article class="commerce-material-row ${material.kind || ""} ${amount > 0 ? "has-stock" : "empty"}"
      data-commerce-material="${material.id}"
      data-commerce-name="${escapeHtml(material.name)}"
      data-commerce-amount="${amount}"
      data-commerce-unit-price="${unitPrice}">
      <img src="${material.img}" alt="${escapeHtml(material.name)}">
      <div class="commerce-material-name">
        <strong>${escapeHtml(material.name)}</strong>
        <span>${fmt(amount)} en soute</span>
      </div>
      <div class="commerce-material-price"><span>Prix unite</span><b>${commerceCreditsHtml(unitPrice)}</b></div>
      <div class="commerce-material-total"><span>Total soute</span><b>${fmt(amount)}</b></div>
      <div class="commerce-material-actions">
        <button class="commerce-open-sale" type="button" data-commerce-open="${material.id}" ${amount > 0 && commerceSaleAllowed ? "" : "disabled"}>Vendre</button>
      </div>
    </article>`;
  }).join("");
  const sellableTotal = orderedMaterials.reduce((sum, material)=>sum + getMaterialCommerceValue(material.id, getCargoAmount(material.id)), 0);
  const cargoPercent = shipCargoCapacity > 0 ? Math.max(0, Math.min(100, Number(shipCargoUsed || 0) / shipCargoCapacity * 100)) : 0;
  const hiddenNotice = hiddenMaterials.length
    ? `<div class="commerce-note">${hiddenMaterials.map(material=>escapeHtml(material.name)).join(", ")} : pas de prix de vente defini.</div>`
    : "";
  const locationNotice = commerceSaleAllowed
    ? ""
    : `<div class="commerce-note">La vente de materiaux est autorisee uniquement dans les zones de ta firme.</div>`;
  return {
    title:"COMMERCE",
    html:`<section class="commerce-console">
      <header class="commerce-summary">
        <div><span>Valeur vendable en soute</span><strong>${commerceCreditsHtml(sellableTotal)}</strong></div>
      </header>
      <div class="refine-cargo-line"><span>Soute du vaisseau</span><b>${fmt(shipCargoUsed)} / ${fmt(shipCargoCapacity)}</b><i><em style="width:${cargoPercent}%"></em></i></div>
      <div class="commerce-material-list">${rows}</div>
      ${locationNotice}
      ${hiddenNotice}
      <div class="commerce-dialog-layer" data-commerce-dialog-layer hidden></div>
    </section>`
  };
}

function formatCraftDurationLabel(ms){
  const totalMinutes = Math.max(1, Math.round(Number(ms || 0) / 60_000));
  if(totalMinutes >= 60 && totalMinutes % 60 === 0) return `${fmt(totalMinutes / 60)} h`;
  if(totalMinutes >= 60) return `${fmt(Math.floor(totalMinutes / 60))} h ${String(totalMinutes % 60).padStart(2, "0")}`;
  return `${fmt(totalMinutes)} min`;
}

function craftOutputLabel(recipe){
  const output = recipe?.output || {};
  const amount = Math.max(1, Math.floor(Number(output.amount || 1)));
  if(output.type === "ammo"){
    const ammo = ammoTypes.find(entry=>entry.id === output.id);
    if(ammo?.weaponClass === "rocket") return `${fmt(amount)} roquettes`;
    if(ammo?.weaponClass === "missile") return `${fmt(amount)} missiles`;
    return `${fmt(amount)} munitions`;
  }
  if(output.type === "ship") return "Hangar";
  if(output.type === "drone") return "+1 drone";
  if(output.type === "formation") return "Formation drone";
  if(output.type === "booster") return `Booster S1 · ${formatCraftDurationLabel(output.durationMs)}`;
  return amount > 1 ? `x${fmt(amount)} inventaire` : "Inventaire";
}

function craftStatusText(availability){
  if(availability?.ok) return "Pret";
  return availability?.reason || "Indisponible";
}

function getCraftDropTone(chance){
  if(chance >= 0.05) return "high";
  if(chance >= 0.01) return "low";
  return "very-low";
}

function getCraftResourceDropRows(rarity){
  return Object.values(RESOURCE_DROP_BANDS)
    .map(band=>({band, chance:Number(band.chances?.[rarity] || 0)}))
    .filter(entry=>entry.chance > 0)
    .map(({band, chance})=>({
      maps:band.mapLabel,
      range:band.levelLabel,
      chance:formatResourceDropChance(chance),
      tone:getCraftDropTone(chance)
    }));
}

export const CRAFT_RESOURCE_RARITY_META = Object.freeze({
  common:{
    key:"common",
    label:"Commun",
    source:"Drop monstres + magasin de firme · X = toutes firmes",
    drops:getCraftResourceDropRows("common")
  },
  rare:{
    key:"rare",
    label:"Rare",
    source:"Drop monstres + magasin de firme · X = toutes firmes",
    drops:getCraftResourceDropRows("rare")
  },
  veryRare:{
    key:"veryRare",
    label:"Très rare",
    source:"Drop monstres + magasin de firme · X = toutes firmes",
    drops:getCraftResourceDropRows("veryRare")
  },
  elite:{
    key:"elite",
    label:"Élite",
    source:"Drop monstres + magasin de firme · X = toutes firmes",
    drops:getCraftResourceDropRows("elite")
  },
  mythic:{
    key:"mythic",
    label:"Mythique",
    source:"Drop monstres + magasin de firme · X = toutes firmes",
    drops:getCraftResourceDropRows("mythic")
  }
});

function getCraftResourceRarityMeta(material){
  const clean = String(material?.rarity || "").trim();
  if(CRAFT_RESOURCE_RARITY_META[clean]) return CRAFT_RESOURCE_RARITY_META[clean];
  return CRAFT_RESOURCE_RARITY_META.common;
}

function getCraftRarityKey(recipe = {}){
  return getRarityTier(recipe) || getCraftResourceRarityMeta(recipe).key;
}

function getCraftRarityLabel(recipe = {}){
  return getRarityLabel(recipe, recipe.rarity || recipe.rarityTier || "");
}

function craftMaterialTooltipHtml({material, materialName, rarity, stock, need}){
  const dropLines = rarity.drops.map(drop=>`<span class="craft-drop-line ${escapeHtml(drop.tone || "")}">
      <b>${escapeHtml(drop.chance)}</b>
      <span><strong>${escapeHtml(drop.maps || "")}</strong><small>${escapeHtml(drop.range || "")}</small></span>
    </span>`).join("");
  const tooltipOffset = -(130 + Math.max(0, rarity.drops.length - 1) * 14);
  return `<span class="craft-material-tooltip" role="tooltip" style="--craft-tooltip-offset:${tooltipOffset}px">
    <span class="craft-material-tooltip-head">
      <img src="${material?.img || "assets/materials/cargo_box.svg"}" alt="${escapeHtml(materialName)}">
      <span><strong>${escapeHtml(materialName)}</strong><em>${escapeHtml(rarity.label)}</em></span>
    </span>
    <span class="craft-material-tooltip-line"><b>Stock actuel</b><span>${fmt(stock)}</span></span>
    <span class="craft-material-tooltip-line"><b>Besoin recette</b><span>${fmt(need)}</span></span>
    <span class="craft-material-tooltip-line"><b>Source</b><span>${escapeHtml(rarity.source)}</span></span>
    <span class="craft-material-tooltip-drops"><b>Taux de drop</b>${dropLines}</span>
    ${material?.desc ? `<span class="craft-material-tooltip-desc">${escapeHtml(material.desc)}</span>` : ""}
  </span>`;
}

function renderCraftMaterialCosts(recipe, materials = [], profile = {}){
  const cargoHold = profile.cargoHold && typeof profile.cargoHold === "object" ? profile.cargoHold : {};
  const entries = Object.entries(recipe?.costs?.materials || {});
  if(!entries.length) return `<div class="craft-empty-cost">Aucune ressource</div>`;
  return entries.map(([id, amount])=>{
    const material = getCraftMaterialMeta(id, materials);
    const need = Math.max(0, Number(amount || 0));
    const stock = Math.max(0, Number(cargoHold[id] || 0));
    const missing = stock < need;
    const materialName = material?.name || humanizeIdentifier(id);
    const rarity = getCraftResourceRarityMeta(material);
    const amountText = `${fmt(stock)} / ${fmt(need)}`;
    return `<div class="craft-material-cost rarity-${rarity.key} ${missing ? "missing" : ""}" tabindex="0">
      <img src="${material?.img || "assets/materials/cargo_box.svg"}" alt="${escapeHtml(materialName)}">
      <span class="craft-material-copy"><strong title="${escapeHtml(materialName)}">${escapeHtml(materialName)}</strong></span>
      <span class="craft-material-rarity">${escapeHtml(rarity.label)}</span>
      <b title="${escapeHtml(amountText)}">${escapeHtml(amountText)}</b>
      ${craftMaterialTooltipHtml({material, materialName, rarity, stock, need})}
    </div>`;
  }).join("");
}

function renderCraftActiveJob({job, recipe, profile, formatDuration}){
  if(!job || !recipe) return "";
  const progress = getCraftJobProgress(job, Date.now());
  const percent = Math.round(progress.progress * 100);
  const remaining = progress.done ? "Termine" : (formatDuration?.(progress.remainingMs) || `${Math.ceil(progress.remainingMs / 1000)}s`);
  const rarityKey = getCraftRarityKey(recipe);
  const redundantReason = getRedundantCraftOutputReason(recipe, profile);
  return `<section class="craft-active-job rarity-${escapeHtml(rarityKey)} ${progress.done ? "done" : ""}">
    <div class="craft-active-head">
      <img class="craft-art-hd" src="${recipe.img}" alt="${escapeHtml(recipe.name)}" width="44" height="44" decoding="async">
      <div><span>${redundantReason ? "Fabrication à clôturer" : "Fabrication en cours"}</span><strong>${escapeHtml(recipe.name)}</strong></div>
      <b>${redundantReason ? "Remboursable" : remaining}</b>
    </div>
    <div class="craft-progress"><span style="width:${percent}%"></span></div>
    ${redundantReason ? `<p class="spawn-panel-note">${escapeHtml(redundantReason)} Clôture cette fabrication pour récupérer les ressources et le paiement.</p>` : ""}
    <button class="blue-button small" type="button" data-claim-craft ${progress.done || redundantReason ? "" : "disabled"}>${redundantReason ? "Clôturer et rembourser" : progress.done ? "Recuperer" : "En fabrication"}</button>
  </section>`;
}

function renderCraftingPanel({
  materials = [],
  profile = {},
  selectedCraftCategory = "all",
  selectedCraftRecipeId = "",
  selectedCraftPaymentType = "",
  selectedCraftTabPage = 0,
  formatDuration
}){
  const visibleRecipes = getVisibleCraftRecipes(profile);
  const activeCategory = CRAFT_CATEGORY_TABS.some(tab=>tab.id === selectedCraftCategory) ? selectedCraftCategory : "all";
  const tabWindowSize = 4;
  const maxTabOffset = Math.max(0, CRAFT_CATEGORY_TABS.length - tabWindowSize);
  const activeTabOffset = Math.max(0, Math.min(maxTabOffset, Math.floor(Number(selectedCraftTabPage || 0))));
  const visibleCategoryTabs = CRAFT_CATEGORY_TABS.slice(activeTabOffset, activeTabOffset + tabWindowSize);
  const categoryRecipes = activeCategory === "all"
    ? visibleRecipes
    : visibleRecipes.filter(recipe=>recipe.category === activeCategory);
  const selectedRecipe = categoryRecipes.find(recipe=>recipe.id === selectedCraftRecipeId)
    || visibleRecipes.find(recipe=>recipe.id === selectedCraftRecipeId)
    || categoryRecipes[0]
    || visibleRecipes[0]
    || null;
  const activeJob = profile.craftingJob || null;
  const activeJobRecipe = activeJob ? getCraftRecipe(activeJob.recipeId) || selectedRecipe : null;
  const activePaymentType = selectedCraftPaymentType === "credits" || selectedCraftPaymentType === "premium"
    ? selectedCraftPaymentType
    : "";
  const selectedAvailability = getCraftRecipeAvailability(selectedRecipe, profile, Date.now(), activePaymentType);
  const categoryTabs = visibleCategoryTabs.map(tab=>{
    const count = tab.id === "all" ? visibleRecipes.length : visibleRecipes.filter(recipe=>recipe.category === tab.id).length;
    return `<button class="craft-category-tab ${activeCategory === tab.id ? "active" : ""}" type="button" data-craft-category="${tab.id}" title="${escapeHtml(tab.label)}">
      <span>${escapeHtml(tab.label)}</span><b>${count}</b>
    </button>`;
  }).join("");
  const recipeRows = categoryRecipes.map(recipe=>{
    const availability = recipe.costs?.currencyMode === "either"
      ? ["premium", "credits"].map(type=>getCraftRecipeAvailability(recipe, profile, Date.now(), type)).find(result=>result.ok)
        || getCraftRecipeAvailability(recipe, profile, Date.now(), "premium")
      : getCraftRecipeAvailability(recipe, profile, Date.now());
    const selected = selectedRecipe?.id === recipe.id;
    const rarityKey = getCraftRarityKey(recipe);
    const rarityLabel = getCraftRarityLabel(recipe);
    return `<button class="craft-recipe-strip rarity-${escapeHtml(rarityKey)} ${selected ? "selected" : ""} ${availability.ok ? "ready" : "locked"}" type="button" data-select-craft="${recipe.id}">
      <img class="craft-art-hd" src="${recipe.img}" alt="${escapeHtml(recipe.name)}" width="40" height="40" decoding="async">
      <span><strong>${escapeHtml(recipe.name)}</strong><small>${escapeHtml(rarityLabel)}</small></span>
      <b>${escapeHtml(craftCategoryLabel(recipe.category))}</b>
    </button>`;
  }).join("");
  const selectedCost = selectedRecipe ? selectedRecipe.costs || {} : {};
  const selectedOutput = selectedRecipe ? craftOutputLabel(selectedRecipe) : "";
  const selectedRarityKey = selectedRecipe ? getCraftRarityKey(selectedRecipe) : "common";
  const activeJobHtml = activeJob ? renderCraftActiveJob({job:activeJob, recipe:activeJobRecipe, profile, formatDuration}) : "";
  const requiresPaymentChoice = selectedCost.currencyMode === "either";
  const startDisabled = !selectedAvailability.ok || Boolean(activeJob);
  const statusLabel = activeJob
    ? "Une fabrication est deja en cours"
    : (requiresPaymentChoice && !activePaymentType ? "Choisis NOVA ou credits" : craftStatusText(selectedAvailability));
  return {
    title:"FABRICATION",
    html:`<section class="craft-console">
      <div class="craft-category-tabs">
        <button class="craft-category-shift" type="button" data-craft-tab-page="${activeTabOffset - 1}" aria-label="Voir les categories precedentes" ${activeTabOffset <= 0 ? "disabled" : ""}><span aria-hidden="true">&#8249;</span></button>
        <div class="craft-category-track" data-craft-category-track>${categoryTabs}</div>
        <button class="craft-category-shift" type="button" data-craft-tab-page="${activeTabOffset + 1}" aria-label="Voir les categories suivantes" ${activeTabOffset >= maxTabOffset ? "disabled" : ""}><span aria-hidden="true">&#8250;</span></button>
      </div>
      <div class="craft-layout">
        <aside class="craft-recipe-list">
          <div class="craft-list-head"><span>Recettes</span><b>${categoryRecipes.length}</b></div>
          <div class="craft-recipe-scroll">${recipeRows || `<div class="spawn-panel-note">Aucune recette dans cette categorie.</div>`}</div>
        </aside>
        <article class="craft-detail${activeJob ? " has-job" : ""}">
          ${activeJobHtml}
          ${selectedRecipe ? `
            <header class="craft-detail-head rarity-${escapeHtml(selectedRarityKey)}">
              <img class="craft-art-hd" src="${selectedRecipe.img}" alt="${escapeHtml(selectedRecipe.name)}" width="80" height="80" decoding="async">
              <div class="craft-detail-title"><strong>${escapeHtml(selectedRecipe.name)}</strong><small>${escapeHtml(selectedOutput)}</small></div>
              <span class="craft-detail-rarity rarity-${escapeHtml(selectedRarityKey)}">${escapeHtml(getCraftRarityLabel(selectedRecipe))}</span>
            </header>
            <div class="craft-detail-grid">
              <section class="craft-cost-card craft-resource-card">
                <h4>Ressources</h4>
                <div class="craft-material-costs">${renderCraftMaterialCosts(selectedRecipe, materials, profile)}</div>
              </section>
              <section class="craft-cost-card craft-payment-card">
                <h4>Paiement</h4>
                ${requiresPaymentChoice
                  ? renderCraftPaymentChoice(selectedCost, activePaymentType, profile)
                  : `<div class="craft-currency-row">
                      ${currencyCostHtml(selectedCost.credits || 0, "credits")}
                      ${currencyCostHtml(getNovaDiscountedPrice(selectedCost.premium, profile.player), "premium")}
                    </div>`}
                <div class="craft-time"><span>Duree</span><b>${formatDuration?.(selectedRecipe.durationMs) || "1:00"}</b></div>
                <div class="craft-action-row">
                  <span class="${selectedAvailability.ok && !activeJob ? "ready" : "blocked"}">${escapeHtml(statusLabel)}</span>
                  <button class="blue-button small" type="button" data-start-craft="${selectedRecipe.id}" data-craft-payment-type="${activePaymentType}" ${startDisabled ? "disabled" : ""}>Demarrer</button>
                </div>
              </section>
            </div>
          ` : `<div class="spawn-panel-note">Aucune recette disponible.</div>`}
        </article>
      </div>
    </section>`
  };
}

export function renderSpawnPanelContent(options){
  if(options.mode === "quests") return renderQuestPanel(options);
  if(options.mode === "commerce") return renderCommercePanel(options);
  if(options.mode === "crafting") return renderCraftingPanel(options);
  return renderRefineryPanel(options);
}


