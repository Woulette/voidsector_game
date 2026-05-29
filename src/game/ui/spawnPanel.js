import { fmt } from "../../core/utils.js";
import { equipment } from "../../data/catalog.js";

const QUEST_TABS = [
  {id:"available", label:"Quete"},
  {id:"active", label:"En cours"},
  {id:"completed", label:"Termin&eacute;"}
];

const QUEST_TYPE_TABS = [
  {id:"normal", label:"Quete principale"},
  {id:"daily", label:"Quete journaliere"},
  {id:"weekly", label:"Quete hebdomadaire"}
];

function questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel){
  const progress = getQuestProgress(quest.id);
  const target = Number(quest.objective?.count || 0);
  const completed = !!completedQuestClaims?.[quest.id];
  const claimable = !completed && progress >= target;
  const percent = target ? Math.min(100, progress / target * 100) : 0;
  const requiredLevel = Number(quest.requiredLevel || 1);
  const locked = Number(playerLevel || 1) < requiredLevel;
  return {progress, target, completed, claimable, percent, requiredLevel, locked};
}

function questStatus({completed, claimable, active, locked}){
  if(completed) return "TERMINEE";
  if(locked) return "VERROUILLEE";
  if(claimable) return "A RECLAMER";
  if(active) return "EN COURS";
  return "DISPONIBLE";
}

function formatQuestObjective(quest){
  const objective = quest.objective || {};
  if(objective.type === "kill"){
    return quest.desc || "Securise la zone et reviens au relais.";
  }
  if(objective.type === "refinery_module_upgrade_start") return quest.desc || "Ameliore le module de stockage dans la raffinerie.";
  return "OBJECTIF";
}

function formatQuestZone(objective = {}){
  if(objective.type === "refinery_module_upgrade_start") return "";
  if(Array.isArray(objective.zones) && objective.zones.length) return objective.zones.join(" / ");
  return objective.zone || "Toutes zones";
}

function formatQuestMaterials(materials = {}, rawMaterials = []){
  const entries = Object.entries(materials);
  return entries.map(([id, amount])=>{
    const material = rawMaterials.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${material?.img || "assets/materials/cargo_box.svg"}" alt=""><b>${fmt(amount)}</b><small>${material?.short || id.toUpperCase()}</small></span>`;
  }).join("");
}

function formatQuestItems(items = []){
  return items.map(id=>{
    const item = equipment.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${item?.img || "assets/equipment/module_munitions.svg"}" alt=""><small>${item?.name || id}</small></span>`;
  }).join("");
}

function renderQuestTargetIcons(quest, enemyTypes = {}){
  if(quest.objective?.type === "refinery_module_upgrade_start"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/materials/zinc_spatial.svg" alt="Raffinage"></span><span class="quest-target-icon"><img src="assets/materials/titane_fissure.svg" alt="Raffinage"></span></div>`;
  }
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  const icons = objectives.filter(Boolean).map(objective=>{
    const targetType = enemyTypes[objective.target];
    const targetImage = targetType?.img || "assets/enemies/drone_pirate.png";
    const rotateClass = objective.target === "raider_astral" || objective.target === "boss_raider_astral" ? " rotate-180" : "";
    const count = Math.max(0, Number(objective.count || 0));
    return `<span class="quest-target-icon"><img class="${rotateClass}" src="${targetImage}" alt="${targetType?.name || "Cible"}">${count ? `<b>x${count}</b>` : ""}</span>`;
  }).join("");
  return icons ? `<div class="quest-target-icons">${icons}</div>` : "";
}

function renderQuestTabs({activeCategory, quests}){
  return `<div class="quest-tabs">${QUEST_TABS.map(tab=>{
    const count = quests.filter(quest=>quest.panelStatus === tab.id).length;
    return `<button class="quest-tab ${activeCategory === tab.id ? "active" : ""}" type="button" data-quest-category="${tab.id}">
      <span>${tab.label}</span><b>${count}</b>
    </button>`;
  }).join("")}</div>`;
}

function renderQuestTypeTabs({activeType, quests, activeCategory}){
  return `<div class="quest-type-tabs">${QUEST_TYPE_TABS.map(tab=>{
    const count = quests.filter(quest=>quest.panelStatus === activeCategory && quest.panelType === tab.id).length;
    return `<button class="quest-type-tab ${activeType === tab.id ? "active" : ""}" type="button" data-quest-type="${tab.id}">
      <span>${tab.label}</span><b>${count}</b>
    </button>`;
  }).join("")}</div>`;
}

function renderQuestLockToggle(showLockedQuests){
  return `<button class="quest-lock-toggle ${showLockedQuests ? "open" : ""}" type="button" data-toggle-locked-quests aria-label="${showLockedQuests ? "Masquer les quetes verrouillees" : "Afficher les quetes verrouillees"}" title="${showLockedQuests ? "Masquer les quetes verrouillees" : "Afficher les quetes verrouillees"}">
    <span aria-hidden="true"></span>
  </button>`;
}

function renderQuestList({quests, selectedQuest, activeQuest, activeQuests = [], getQuestProgress, completedQuestClaims, playerLevel}){
  const activeIds = new Set(activeQuests.map(quest=>quest.id));
  return quests.map(quest=>{
    const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel);
    const active = activeIds.has(quest.id) || activeQuest?.id === quest.id;
    const selected = selectedQuest?.id === quest.id;
    return `<button class="quest-strip ${selected ? "selected" : ""} ${active ? "active" : ""} ${quest.special ? "special" : ""} ${state.claimable ? "claimable" : ""} ${state.locked ? "locked" : ""}" type="button" data-view-quest="${quest.id}">
      <span class="quest-strip-title">${quest.title}</span>
      <span class="quest-strip-meta"><b>LV ${state.requiredLevel}</b></span>
      <span class="quest-strip-bar"><i style="width:${state.percent}%"></i></span>
    </button>`;
  }).join("");
}

function renderQuestDetail({quest, activeQuest, activeQuests = [], getQuestProgress, completedQuestClaims, enemyTypes, rawMaterials, playerLevel}){
  const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel);
  const active = activeQuests.some(entry=>entry.id === quest.id) || activeQuest?.id === quest.id;
  const tracked = activeQuest?.id === quest.id;
  const itemRewards = formatQuestItems(quest.rewards?.items);
  const materialRewards = formatQuestMaterials(quest.rewards?.materials, rawMaterials);
  const zoneLabel = formatQuestZone(quest.objective);
  const targetIcons = renderQuestTargetIcons(quest, enemyTypes);
  return `<article class="quest-detail ${active ? "active" : ""} ${quest.special ? "special" : ""} ${state.claimable ? "claimable" : ""} ${state.locked ? "locked" : ""}">
    <div class="quest-detail-hero">
      <div class="quest-detail-copy">
        <span>${quest.giver || "Relais de Commandement"}</span>
        <strong>${quest.title}</strong>
      </div>
      <div class="quest-level-badge"><span>LV</span><b>${state.requiredLevel}</b></div>
    </div>
    <div class="quest-section-title objective">Objectif</div>
    <p class="quest-objective-text">${formatQuestObjective(quest)}</p>
    ${targetIcons}
    ${zoneLabel ? `<div class="quest-objective-meta"><span>Zone</span><b>${zoneLabel}</b></div>` : ""}
    <div class="quest-reward-title">Recompenses</div>
    <div class="quest-info-grid compact">
      <div><span>Credits</span><b>${fmt(quest.rewards?.credits || 0)}</b></div>
      <div class="nova"><span>NOVA</span><b>${fmt(quest.rewards?.premium || 0)}</b></div>
      <div><span>XP</span><b>${fmt(quest.rewards?.xp || 0)}</b></div>
      ${itemRewards ? `<div class="quest-material-rewards"><span>Objets</span><b>${itemRewards}</b></div>` : ""}
      ${materialRewards ? `<div class="quest-material-rewards"><span>Materiaux</span><b>${materialRewards}</b></div>` : ""}
    </div>
    <div class="spawn-actions quest-actions">
      ${state.completed ? `<button class="blue-button small" type="button" disabled>Terminee</button>` : state.locked ? `<button class="blue-button small" type="button" disabled>LV ${state.requiredLevel} requis</button>` : state.claimable ? `<button class="blue-button small" data-claim-quest="${quest.id}" type="button">Reclamer</button>` : `<button class="blue-button small" data-accept-quest="${quest.id}" type="button" ${active ? "disabled" : ""}>${active ? (tracked ? "Suivie" : "En cours") : "Accepter"}</button>`}
    </div>
  </article>`;
}

function getQuestPanelStatus(quest, activeQuests = [], completedQuestClaims = {}){
  if(completedQuestClaims?.[quest.id]) return "completed";
  if(activeQuests.some(entry=>entry.id === quest.id)) return "active";
  return "available";
}

function renderQuestPanel({activeQuest, activeQuests = [], selectedQuestId, selectedQuestCategory = "available", selectedQuestType = "normal", showLockedQuests = false, quests, getQuestProgress, completedQuestClaims, enemyTypes = {}, rawMaterials = [], playerLevel = 1}){
  const activeCategory = QUEST_TABS.some(tab=>tab.id === selectedQuestCategory) ? selectedQuestCategory : "available";
  const activeType = QUEST_TYPE_TABS.some(tab=>tab.id === selectedQuestType) ? selectedQuestType : "normal";
  const questsWithStatus = quests.map(quest=>({
    ...quest,
    panelStatus:getQuestPanelStatus(quest, activeQuests, completedQuestClaims),
    panelType:quest.category || "normal"
  }));
  const shouldHideLocked = quest=>quest.panelStatus === "available" && !showLockedQuests && questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel).locked;
  const displayQuests = questsWithStatus.filter(quest=>!shouldHideLocked(quest));
  const visibleQuests = displayQuests
    .filter(quest=>quest.panelStatus === activeCategory && quest.panelType === activeType)
    .sort((a,b)=>Number(b.special || 0) - Number(a.special || 0) || Number(a.requiredLevel || 1) - Number(b.requiredLevel || 1) || String(a.title || "").localeCompare(String(b.title || ""), "fr"));
  const selectedQuest = visibleQuests.find(quest=>quest.id === selectedQuestId)
    || (activeQuest && getQuestPanelStatus(activeQuest, activeQuests, completedQuestClaims) === activeCategory && (activeQuest.category || "normal") === activeType ? activeQuest : null)
    || visibleQuests[0];
  const claimableCount = visibleQuests.filter(quest=>questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel).claimable).length;
  const completedCount = visibleQuests.filter(quest=>completedQuestClaims?.[quest.id]).length;
  return {
    title:"RELAIS DE QUETES",
    html:`
      ${renderQuestTabs({activeCategory, quests:displayQuests})}
      ${renderQuestTypeTabs({activeType, quests:displayQuests, activeCategory})}
      <div class="quest-console">
        <aside class="quest-menu">
          <div class="quest-menu-head">
            <span>${QUEST_TABS.find(tab=>tab.id === activeCategory)?.label || "Quete"}</span>
            <b>${claimableCount}</b>
          </div>
          <div class="quest-strip-list">${visibleQuests.length ? renderQuestList({quests:visibleQuests, selectedQuest, activeQuest, activeQuests, getQuestProgress, completedQuestClaims, playerLevel}) : `<div class="spawn-panel-note">Aucune mission ici.</div>`}</div>
          <div class="quest-menu-foot"><span>${completedCount}/${visibleQuests.length} terminees</span>${renderQuestLockToggle(showLockedQuests)}</div>
        </aside>
        <section class="quest-detail-wrap">
          ${selectedQuest ? renderQuestDetail({quest:selectedQuest, activeQuest, activeQuests, getQuestProgress, completedQuestClaims, enemyTypes, rawMaterials, playerLevel}) : `<div class="spawn-panel-note">Aucune mission disponible.</div>`}
        </section>
      </div>`
  };
}

function renderRefineryPanel({materials, recipes = [], shipCargo = {}, shipCargoUsed = 0, shipCargoCapacity = 0, refineryTab = "raffinage", selectedShipRefineRecipeId = null, upgradeables, getShipRefineryRecipeData, getCombatBoostSummary, getCombatBoostTooltip, getEquipmentUpgradeLevel, getEquipmentUpgradeCost}){
  const activeTab = refineryTab === "perfectionnement" ? "perfectionnement" : "raffinage";
  const cargoPercent = shipCargoCapacity > 0 ? Math.max(0, Math.min(100, shipCargoUsed / shipCargoCapacity * 100)) : 0;
  const materialById = id => materials.find(material=>material.id === id) || null;
  const materialOrder = [
    "cuivre_orbital", "zinc_spatial", "nickel_brut", "titane_fissure", "silice_conductrice",
    "alliage_cuivre_zinc", "catalyseur_quantique", "plaque_nickel_titane",
    "conducteur_renforce", "blindage_composite",
    "noyau_astra"
  ];
  const materialDisplayNames = {
    cuivre_orbital:"Cuivre",
    zinc_spatial:"Zinc",
    nickel_brut:"Nickel",
    titane_fissure:"Titane",
    silice_conductrice:"Silice",
    alliage_cuivre_zinc:"Alliage",
    plaque_nickel_titane:"Plaque",
    catalyseur_quantique:"Condensateur",
    conducteur_renforce:"Conducteur",
    blindage_composite:"Blindage",
    noyau_astra:"Noyau Astra"
  };
  const orderedMaterials = materialOrder.map(materialById).filter(Boolean);
  const recipeByOutput = outputId => recipes.find(recipe=>recipe.outputId === outputId) || null;
  const recipeCostText = recipe => Object.entries(recipe?.costs || {}).map(([id, amount])=>`${fmt(amount)} ${materialDisplayNames[id] || materialById(id)?.name || id}`).join(" + ");
  const materialCards = orderedMaterials.map((material, index)=>{
    const amount = Number(shipCargo[material.id] || 0);
    const isFinal = material.kind === "final";
    const recipe = recipeByOutput(material.id);
    const craft = recipe ? getShipRefineryRecipeData?.(recipe.id, 1) : null;
    return `<article class="refine-material-card ${material.kind || ""} ${isFinal ? "final-row" : ""} ${recipe ? "craftable" : ""}" ${recipe ? `data-open-ship-refine="${recipe.id}" title="Fusionner : ${recipeCostText(recipe)}"` : ""} style="--delay:${index}">
      <span>${materialDisplayNames[material.id] || material.name}</span>
      <img src="${material.img}" alt="${material.name}">
      <b>${fmt(amount)}</b>
      ${recipe ? `<small>${craft?.maxAmount > 0 ? "Fusion" : "Manque"}</small>` : ""}
    </article>`;
  }).join("");
  const selectedRecipe = selectedShipRefineRecipeId ? recipes.find(recipe=>recipe.id === selectedShipRefineRecipeId) : null;
  const selectedRecipeData = selectedRecipe ? getShipRefineryRecipeData?.(selectedRecipe.id, 1) : null;
  const selectedOutput = selectedRecipe ? materialById(selectedRecipe.outputId) : null;
  const refineDialog = selectedRecipe && selectedOutput ? `<div class="ship-refine-overlay">
    <aside class="ship-refine-dialog">
      <button class="ship-refine-close" data-close-ship-refine type="button" aria-label="Fermer">x</button>
      <span>Fusion de soute</span>
      <h3>${materialDisplayNames[selectedOutput.id] || selectedOutput.name}</h3>
      <div class="ship-refine-flow">
        <div>${Object.entries(selectedRecipe.costs || {}).map(([id, amount])=>{
          const material = materialById(id);
          return `<figure><img src="${material?.img || "assets/materials/cargo_box.svg"}" alt=""><figcaption>${fmt(amount)} ${materialDisplayNames[id] || material?.name || id}</figcaption></figure>`;
        }).join("")}</div>
        <strong>-></strong>
        <figure><img src="${selectedOutput.img}" alt=""><figcaption>${fmt(selectedRecipe.outputAmount || 1)} ${materialDisplayNames[selectedOutput.id] || selectedOutput.name}</figcaption></figure>
      </div>
      <label><span>Quantite</span><input data-ship-refine-amount type="number" min="1" max="${selectedRecipeData?.maxAmount || 0}" value="${Math.max(1, Math.min(1, selectedRecipeData?.maxAmount || 1))}"></label>
      <div class="ship-refine-max">Maximum possible : <b>${fmt(selectedRecipeData?.maxAmount || 0)}</b></div>
      <button class="blue-button small" data-confirm-ship-refine="${selectedRecipe.id}" type="button" ${selectedRecipeData?.maxAmount > 0 ? "" : "disabled"}>Fusionner</button>
    </aside>
  </div>` : "";
  const boostTargets = [
    {type:"Laser", name:"Boost laser", img:"assets/equipment/laser_mk1_mk1_slot_v2.png", hint:"1 materiau = 10 tirs"},
    {type:"Roquettes", name:"Boost roquettes", img:"assets/equipment/pod_missiles.svg", hint:"1 materiau = 1 tir"},
    {type:"Generateurs", name:"Boost generateurs", img:"assets/equipment/generator_shield_mk1.png", hint:"1 materiau = 1 min"},
    {type:"Drones", name:"Boost drones", img:"assets/equipment/drone_combat.svg", hint:"1 materiau = 1 min"}
  ];
  const boostTargetCards = boostTargets.map(target=>{
    const summary = getCombatBoostSummary?.(target.type) || {};
    const remainingLabel = summary.field === "seconds" ? `${Math.floor((summary.remaining || 0) / 60)}m ${Math.floor((summary.remaining || 0) % 60)}s` : `${fmt(summary.remaining || 0)} tirs`;
    return `<article class="boost-target-card">
      <span>${target.type}</span>
      <img src="${target.img}" alt="${target.name}"><strong>${target.name}</strong>
      <small>${target.hint}</small>
      <button class="boost-drop-slot" type="button" data-boost-drop-target="${target.type}" aria-label="Depot ${target.type}">
        <em>${summary.remaining > 0 ? `+${Math.round((summary.percent || 0) * 100)}%` : "Depot"}</em>
        <b>${summary.remaining > 0 ? remainingLabel : ""}</b>
      </button>
    </article>`;
  }).join("");
  const boostMaterialIds = ["alliage_cuivre_zinc", "plaque_nickel_titane", "conducteur_renforce", "blindage_composite", "noyau_astra"];
  const boostMaterialCards = boostMaterialIds.map(id=>{
    const material = materialById(id);
    if(!material) return "";
    return `<button class="boost-material-card ${material.kind || ""}" type="button" draggable="true" data-boost-material="${id}" title="${getCombatBoostTooltip?.(id) || ""}">
      <span>${materialDisplayNames[id] || material.name}</span>
      <img src="${material.img}" alt="${material.name}">
      <b>${fmt(shipCargo[id] || 0)}</b>
    </button>`;
  }).join("");
  return {
    title:"RAFFINAGE",
    html:`<section class="refine-console ${activeTab === "perfectionnement" ? "is-upgrade" : "is-materials"}">
      <div class="refine-tabs">
        <button class="${activeTab === "raffinage" ? "active" : ""}" data-spawn-refinery-tab="raffinage" type="button">Raffinage</button>
        <button class="${activeTab === "perfectionnement" ? "active" : ""}" data-spawn-refinery-tab="perfectionnement" type="button">Perfectionnement</button>
      </div>
      <div class="refine-cargo-line"><span>Soute du vaisseau</span><b>${fmt(shipCargoUsed)} / ${fmt(shipCargoCapacity)}</b><i><em style="width:${cargoPercent}%"></em></i></div>
      ${activeTab === "raffinage" ? `<section class="refine-materials">
        <h4>Materiaux embarques</h4>
        <div class="refine-material-grid">${materialCards}</div>
        ${refineDialog}
      </section>` : `<section class="refine-upgrades">
        <h4>Perfectionnement de combat</h4>
        <div class="boost-target-grid">${boostTargetCards}</div>
        <div class="boost-material-row">${boostMaterialCards}</div>
      </section>`}
    </section>`
  };
}

export function renderSpawnPanelContent(options){
  return options.mode === "quests" ? renderQuestPanel(options) : renderRefineryPanel(options);
}


