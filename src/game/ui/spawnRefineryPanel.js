import { fmt } from "../../core/utils.js";
import { getCombatBoostTargetMaterialInfo, getCombatBoostUnitAmount } from "../../data/combatBoosts.js";

const FUSION_GROUPS = [
  {id:"raw", name:"Minerais bruts", ids:["cuivre_orbital", "zinc_spatial", "nickel_brut", "titane_fissure", "silice_conductrice"]},
  {id:"intermediate", name:"Matériaux intermédiaires", ids:["alliage_cuivre_zinc", "catalyseur_quantique", "plaque_nickel_titane"]},
  {id:"advanced", name:"Composants avancés", ids:["conducteur_renforce", "blindage_composite"]},
  {id:"final", name:"Matériau final", ids:["noyau_astra"]}
];
const MATERIAL_NAMES = {catalyseur_quantique:"Catalyseur", noyau_astra:"Noyau Astra"};
const BOOST_MATERIALS = ["alliage_cuivre_zinc", "plaque_nickel_titane", "conducteur_renforce", "blindage_composite", "noyau_astra"];
const BOOST_TARGETS = [
  {id:"laser", type:"Laser", name:"Lasers", img:"assets/equipment/laser_mk1_mk1_slot_v2.png", hint:"1 matériau = 10 tirs", effect:"Dégâts des lasers"},
  {id:"rocket", type:"Roquettes", name:"Roquettes", img:"assets/equipment/launcher_rocket_mk1_slot.png?v=20260726-kharon1", hint:"1 matériau = 1 tir", effect:"Dégâts des roquettes"},
  {id:"generator", type:"Generateurs", name:"Générateurs", img:"assets/equipment/generator_shield_mk1.png", hint:"1 matériau = 1 min", effect:"Performances des générateurs"},
  {id:"drone", type:"Drones", name:"Drones", img:"assets/drones/drone_test_sprite.webp?v=20260726-kharon1", hint:"1 matériau = 1 min", effect:"Performances des drones"}
];

function escape(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}

function count(value){ return Math.max(0, Math.floor(Number(value) || 0)); }
function amountWithin(value, max){ return max > 0 ? Math.min(max, Math.max(1, count(value))) : 0; }
function name(material){ return MATERIAL_NAMES[material?.id] || material?.name || "Matériau"; }
function image(material, className = ""){
  return `<img class="orbital-material-art ${className}" src="${escape(material?.img || "assets/materials/cargo_box.svg")}" alt="${escape(name(material))}" decoding="async">`;
}
function materialGroups(groups, byId, renderCard){
  return `<div class="orbital-material-groups">${groups.map(group=>{
    const materials = group.ids.map(byId).filter(Boolean);
    return materials.length ? `<section class="orbital-material-group" data-refinery-group="${group.id}"><h4>${group.name}</h4><div class="orbital-material-row">${materials.map(renderCard).join("")}</div></section>` : "";
  }).join("")}</div>`;
}
function boostDuration(target, amount){
  const total = count(amount) * getCombatBoostUnitAmount(target);
  return target === "laser" || target === "rocket" ? `${fmt(total)} tirs renforcés` : `${fmt(total / 60)} min de bonus`;
}
function remainingText(summary = {}){
  if(summary.field !== "seconds") return `${fmt(count(summary.remaining))} tirs`;
  return `${Math.floor((summary.remaining || 0) / 60)}m ${Math.floor((summary.remaining || 0) % 60)}s`;
}
function stepper(inputAttribute, amount, max, scope){
  return `<div class="orbital-quantity"><button type="button" data-refinery-step="-1" data-refinery-quantity-scope="${scope}" aria-label="Diminuer la quantité" ${max ? "" : "disabled"}>−</button><input ${inputAttribute} type="number" min="${max ? 1 : 0}" max="${max}" step="1" value="${amount}" aria-label="${scope === "fusion" ? "Quantité à fusionner" : "Quantité à déposer"}" ${max ? "" : "disabled"}><button type="button" data-refinery-step="1" data-refinery-quantity-scope="${scope}" aria-label="Augmenter la quantité" ${max ? "" : "disabled"}>+</button><button type="button" class="orbital-max" data-refinery-max="${scope}" ${max ? "" : "disabled"}>Max</button></div>`;
}

function renderFusion({materials, recipes, shipCargo, shipCargoUsed, shipCargoCapacity, selectedShipRefineRecipeId, getShipRefineryRecipeData, refineryUiState}){
  const byId = id=>materials.find(material=>material.id === id);
  const validRecipes = recipes.filter(recipe=>byId(recipe.outputId));
  const selected = validRecipes.find(recipe=>recipe.id === selectedShipRefineRecipeId)
    || validRecipes.find(recipe=>recipe.id === refineryUiState.recipeId)
    || validRecipes[0];
  const output = selected && byId(selected.outputId);
  const recipeData = selected && getShipRefineryRecipeData?.(selected.id, 1);
  const max = count(recipeData?.maxAmount);
  const sameRecipe = refineryUiState.recipeId === selected?.id;
  const amount = amountWithin(sameRecipe ? refineryUiState.fusionAmount || 1 : 1, max);
  const outputPerUnit = Math.max(1, count(selected?.outputAmount || 1));
  const inputPerUnit = Object.values(selected?.costs || {}).reduce((sum, value)=>sum + count(value), 0);
  const after = Math.max(0, count(shipCargoUsed) - inputPerUnit * amount + outputPerUnit * amount);
  const cards = materialGroups(FUSION_GROUPS, byId, material=>{
    const recipe = validRecipes.find(entry=>entry.outputId === material.id);
    const active = Boolean(recipe && selected && recipe.id === selected.id);
    const tag = recipe ? "button" : "article";
    return `<${tag} class="orbital-flight-material ${material.kind || ""} ${active ? "selected" : ""} ${recipe ? "craftable" : "is-source"}" data-refinery-material="${material.id}" ${recipe ? `type="button" data-open-ship-refine="${escape(recipe.id)}" aria-pressed="${active}"` : ""} title="${escape(recipe ? `Afficher la recette : ${name(material)}` : material.desc || name(material))}">${image(material)}<strong>${escape(name(material))}</strong><b>${fmt(count(shipCargo[material.id]))}</b></${tag}>`;
  });
  const detail = selected && output ? `<aside class="orbital-fusion-detail" data-refinery-recipe="${escape(selected.id)}" data-refinery-input-per-unit="${inputPerUnit}" data-refinery-output-per-unit="${outputPerUnit}" data-refinery-cargo-used="${count(shipCargoUsed)}" data-refinery-cargo-capacity="${count(shipCargoCapacity)}">
    <header class="orbital-order-head">${image(output)}<div><span class="orbital-eyebrow">Fusion de soute</span><h3>${escape(name(output))}</h3></div></header>
    <div class="orbital-order-body">
    <div class="orbital-ingredients">${Object.entries(selected.costs || {}).map(([id, need])=>{
      const have = count(shipCargo[id]);
      const required = count(need) * Math.max(1, amount);
      return `<div class="orbital-ingredient ${have >= required ? "ready" : "missing"}" data-refinery-ingredient="${count(need)}" data-refinery-available="${have}">${image(byId(id))}<div><strong>${escape(name(byId(id)))}</strong><small>${fmt(have)} en soute</small></div><b><span data-refinery-needed>${fmt(required)}</span></b></div>`;
    }).join("")}</div>
    <div class="orbital-detail-row"><label for="shipRefineryAmount">Quantité à produire</label><b>Max. ${fmt(max)}</b></div>
    ${stepper('id="shipRefineryAmount" data-ship-refine-amount', amount, max, "fusion")}
    </div><div class="orbital-order-actions">
    <div class="orbital-fusion-result"><span>Résultat</span><strong><span data-refinery-output-amount>${fmt(amount * outputPerUnit)}</span> ${escape(name(output))}</strong></div>
    <div class="orbital-detail-row"><span>Soute après fusion</span><b><span data-refinery-cargo-after>${fmt(after)}</span> / ${fmt(count(shipCargoCapacity))}</b></div>
    <button class="orbital-primary" type="button" data-confirm-ship-refine="${escape(selected.id)}" ${max ? "" : "disabled"}>Fusionner</button>
    <p class="orbital-refinery-note">${max ? "Fusion immédiate · matériaux de soute." : "Ingrédients insuffisants en soute."}</p></div>
  </aside>` : `<aside class="orbital-fusion-detail"><p class="orbital-refinery-note">Aucune recette disponible.</p></aside>`;
  return `<section class="orbital-flight-content"><div class="orbital-flight-columns"><div class="orbital-cargo-materials">${cards}<p class="orbital-flight-note">Sélectionnez un matériau transformé pour afficher sa recette.</p></div>${detail}</div></section>`;
}

function renderBoost({materials, shipCargo, getCombatBoostSummary, getCombatBoostTooltip, refineryUiState}){
  const byId = id=>materials.find(material=>material.id === id);
  const target = BOOST_TARGETS.find(entry=>entry.id === refineryUiState.boostTarget) || BOOST_TARGETS[0];
  const compatible = BOOST_MATERIALS.map(byId).filter(material=>material && getCombatBoostTargetMaterialInfo(target.id, material.id));
  const material = compatible.find(entry=>entry.id === refineryUiState.boostMaterial) || compatible[0];
  const info = material && getCombatBoostTargetMaterialInfo(target.id, material.id);
  const max = count(shipCargo[material?.id]);
  const amount = amountWithin(refineryUiState.boostAmount || 1, max);
  const active = getCombatBoostSummary?.(target.type) || {};
  const targetEffect = target.id === "generator" ? "Vitesse, bouclier et régénération" : target.effect;
  const systems = BOOST_TARGETS.map(entry=>{
    const summary = getCombatBoostSummary?.(entry.type) || {};
    return `<button type="button" class="orbital-boost-target ${target.id === entry.id ? "selected" : ""}" data-refinery-boost-target="${entry.id}" data-boost-drop-target="${entry.type}" aria-pressed="${target.id === entry.id}"><img src="${entry.img}" alt="" decoding="async"><strong>${entry.name}</strong><small>${entry.hint}</small><span class="orbital-system-status ${summary.remaining > 0 ? "active" : ""}">${summary.remaining > 0 ? `+${Math.round(summary.percent * 100)}% · ${remainingText(summary)}` : "Aucun bonus actif"}</span></button>`;
  }).join("");
  const choices = compatible.map(entry=>{
    const effect = getCombatBoostTargetMaterialInfo(target.id, entry.id);
    return `<button class="orbital-boost-material ${entry.kind || ""} ${entry.id === material?.id ? "selected" : ""}" type="button" data-refinery-material="${entry.id}" draggable="true" data-boost-material="${entry.id}" data-boost-material-name="${escape(name(entry))}" data-boost-material-img="${escape(entry.img)}" data-boost-material-amount="${count(shipCargo[entry.id])}" aria-pressed="${entry.id === material?.id}" title="${escape(getCombatBoostTooltip?.(entry.id) || "")}"><span class="orbital-material-selected-tag" aria-hidden="true">Sélectionné</span>${image(entry)}<span class="orbital-material-bonus">+${Math.round(effect.percent * 100)}%</span><strong>${escape(name(entry))}</strong><small>${fmt(count(shipCargo[entry.id]))} en soute</small></button>`;
  }).join("");
  return `<section class="orbital-boost-content"><div class="orbital-boost-workbench orbital-equipment-post"><nav class="orbital-boost-targets" aria-label="Système à perfectionner">${systems}</nav><section class="orbital-boost-summary orbital-equipment-work" data-refinery-boost-system="${target.id}" data-refinery-boost-selected="${material?.id || ""}">
    <div class="orbital-boost-choices"><header class="orbital-equipment-hero"><img src="${target.img}" alt="" decoding="async"><div><h3>${target.name}</h3><p>${targetEffect}</p></div><div class="orbital-equipment-reserve"><small>Bonus actif</small><b>${active.remaining > 0 ? `+${Math.round(active.percent * 100)}%` : "Aucun"}</b><span>${active.remaining > 0 ? remainingText(active) : "Aucun bonus actif"}</span></div></header>
    <div class="orbital-equipment-heading"><h4>Choisir un matériau</h4><span>${compatible.length} matériau${compatible.length > 1 ? "x" : ""} compatible${compatible.length > 1 ? "s" : ""}</span></div><div class="orbital-boost-materials">${choices}</div></div>
    <footer class="orbital-equipment-order"><div class="orbital-equipment-order-info"><span class="orbital-eyebrow">Dépôt préparé</span><h3>${escape(name(material))} → ${target.name}</h3><p>Bonus +${Math.round((info?.percent || 0) * 100)}% · Quantité : <b data-refinery-boost-used>${fmt(amount)}</b></p><strong class="orbital-boost-duration" data-refinery-boost-duration>${boostDuration(target.id, amount)}</strong></div>
    <div class="orbital-equipment-order-controls"><div class="orbital-detail-row"><span>Quantité à déposer</span><b>Max. ${fmt(max)}</b></div>${stepper("data-refinery-boost-amount", amount, max, "boost")}<button class="orbital-primary" type="button" data-open-boost-deposit data-boost-deposit-target="${target.type}" data-boost-deposit-material="${material?.id || ""}" data-boost-deposit-name="${escape(name(material))}" data-boost-deposit-img="${escape(material?.img || "")}" data-boost-deposit-max="${max}" ${max ? "" : "disabled"}>Préparer le dépôt</button></div></footer>
    <p class="orbital-equipment-priority">${max ? "Le meilleur bonus disponible est utilisé en priorité." : "Ce matériau est absent de votre soute. Le meilleur bonus disponible est utilisé en priorité."}</p>
  </section></div></section>`;
}

export function renderRefineryPanel({materials = [], recipes = [], shipCargo = {}, shipCargoUsed = 0, shipCargoCapacity = 0, refineryTab = "raffinage", selectedShipRefineRecipeId = null, getShipRefineryRecipeData, getCombatBoostSummary, getCombatBoostTooltip, refineryUiState = {}} = {}){
  const boost = refineryTab === "perfectionnement";
  const percent = shipCargoCapacity > 0 ? Math.max(0, Math.min(100, shipCargoUsed / shipCargoCapacity * 100)) : 0;
  const options = {materials, recipes, shipCargo, shipCargoUsed, shipCargoCapacity, selectedShipRefineRecipeId, getShipRefineryRecipeData, getCombatBoostSummary, getCombatBoostTooltip, refineryUiState};
  return {title:"RAFFINAGE", html:`<section class="refine-console orbital-refinery ${boost ? "is-upgrade" : "is-materials"}"><div class="orbital-refinery-tabs"><button type="button" data-spawn-refinery-tab="raffinage" class="${boost ? "" : "active"}" aria-pressed="${!boost}">Raffinage</button><button type="button" data-spawn-refinery-tab="perfectionnement" class="${boost ? "active" : ""}" aria-pressed="${boost}">Perfectionnement</button><span>Atelier embarqué</span></div><div class="orbital-cargo-line"><span>Matériaux en soute</span><i><em style="width:${percent}%"></em></i><b>${fmt(count(shipCargoUsed))} / ${fmt(count(shipCargoCapacity))}</b></div>${boost ? renderBoost(options) : renderFusion(options)}</section>`};
}

/** UI-only state: quantities and choices survive the normal panel refresh. */
export function captureSpawnRefineryUi(content, state = {}){
  const recipe = content.querySelector("[data-refinery-recipe]");
  if(recipe){
    state.recipeId = recipe.dataset.refineryRecipe;
    state.fusionAmount = Number(content.querySelector("[data-ship-refine-amount]")?.value || 1);
  }
  const boost = content.querySelector("[data-refinery-boost-system]");
  if(boost){
    state.boostTarget = boost.dataset.refineryBoostSystem;
    state.boostMaterial = boost.dataset.refineryBoostSelected;
    state.boostAmount = Number(content.querySelector("[data-refinery-boost-amount]")?.value || 1);
  }
  return state;
}

function syncQuantity(content, scope, value){
  const input = content.querySelector(scope === "fusion" ? "[data-ship-refine-amount]" : "[data-refinery-boost-amount]");
  if(!input) return;
  const amount = amountWithin(value, count(input.max));
  input.value = String(amount);
  if(scope === "boost"){
    const target = content.querySelector("[data-refinery-boost-system]")?.dataset.refineryBoostSystem;
    const used = content.querySelector("[data-refinery-boost-used]");
    const duration = content.querySelector("[data-refinery-boost-duration]");
    if(used) used.textContent = fmt(amount);
    if(duration) duration.textContent = boostDuration(target, amount);
    return;
  }
  const detail = content.querySelector("[data-refinery-recipe]");
  if(!detail) return;
  for(const ingredient of detail.querySelectorAll("[data-refinery-ingredient]")){
    const need = Number(ingredient.dataset.refineryIngredient) * Math.max(1, amount);
    ingredient.querySelector("[data-refinery-needed]").textContent = fmt(need);
    ingredient.classList.toggle("ready", Number(ingredient.dataset.refineryAvailable) >= need);
    ingredient.classList.toggle("missing", Number(ingredient.dataset.refineryAvailable) < need);
  }
  detail.querySelector("[data-refinery-output-amount]").textContent = fmt(Number(detail.dataset.refineryOutputPerUnit) * amount);
  detail.querySelector("[data-refinery-cargo-after]").textContent = fmt(Math.max(0, Number(detail.dataset.refineryCargoUsed) + (Number(detail.dataset.refineryOutputPerUnit) - Number(detail.dataset.refineryInputPerUnit)) * amount));
}

export function bindSpawnRefineryUi(content, state, render){
  const console = content.querySelector(".orbital-refinery");
  if(!console) return;
  console.addEventListener("input", event=>{
    const scope = event.target.matches("[data-ship-refine-amount]") ? "fusion" : event.target.matches("[data-refinery-boost-amount]") ? "boost" : null;
    if(scope){ syncQuantity(content, scope, event.target.value); captureSpawnRefineryUi(content, state); }
  });
  console.addEventListener("click", event=>{
    const target = event.target.closest("[data-refinery-boost-target]");
    const material = event.target.closest("[data-boost-material]");
    if(target || material){
      captureSpawnRefineryUi(content, state);
      if(target){ state.boostTarget = target.dataset.refineryBoostTarget; state.boostAmount = 1; }
      else { state.boostMaterial = material.dataset.boostMaterial; state.boostAmount = 1; }
      render();
      return;
    }
    const step = event.target.closest("[data-refinery-step]");
    const max = event.target.closest("[data-refinery-max]");
    if(!step && !max) return;
    const scope = max?.dataset.refineryMax || step.dataset.refineryQuantityScope;
    const input = content.querySelector(scope === "fusion" ? "[data-ship-refine-amount]" : "[data-refinery-boost-amount]");
    syncQuantity(content, scope, max ? input?.max : Number(input?.value) + Number(step.dataset.refineryStep));
    captureSpawnRefineryUi(content, state);
  });
}
