import { fmt } from "../../core/utils.js";

const QUEST_TABS = [
  {id:"normal", label:"Quetes normales"},
  {id:"daily", label:"Journalieres"},
  {id:"weekly", label:"Hebdomadaires"}
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
    const target = objective.target ? objective.target.replaceAll("_", " ").toUpperCase() : "CIBLES";
    return `${objective.count || 0} ${target}`;
  }
  return "OBJECTIF";
}

function formatQuestMaterials(materials = {}, rawMaterials = []){
  const entries = Object.entries(materials);
  if(!entries.length) return "Aucun";
  return entries.map(([id, amount])=>{
    const material = rawMaterials.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${material?.img || "assets/materials/cargo_box.svg"}" alt=""><b>${amount}</b><small>${material?.short || id.toUpperCase()}</small></span>`;
  }).join("");
}

function renderQuestTabs({activeCategory, quests}){
  return `<div class="quest-tabs">${QUEST_TABS.map(tab=>{
    const count = quests.filter(quest=>(quest.category || "normal") === tab.id).length;
    return `<button class="quest-tab ${activeCategory === tab.id ? "active" : ""}" type="button" data-quest-category="${tab.id}">
      <span>${tab.label}</span><b>${count}</b>
    </button>`;
  }).join("")}</div>`;
}

function renderQuestList({quests, selectedQuest, activeQuest, activeQuests = [], getQuestProgress, completedQuestClaims, playerLevel}){
  const activeIds = new Set(activeQuests.map(quest=>quest.id));
  return quests.map(quest=>{
    const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel);
    const active = activeIds.has(quest.id) || activeQuest?.id === quest.id;
    const selected = selectedQuest?.id === quest.id;
    return `<button class="quest-strip ${selected ? "selected" : ""} ${active ? "active" : ""} ${state.claimable ? "claimable" : ""} ${state.locked ? "locked" : ""}" type="button" data-view-quest="${quest.id}">
      <span class="quest-strip-title">${quest.title}</span>
      <span class="quest-strip-meta">LV ${state.requiredLevel} · ${state.progress}/${state.target} · ${quest.objective?.zone || "Toutes zones"}</span>
      <span class="quest-strip-bar"><i style="width:${state.percent}%"></i></span>
    </button>`;
  }).join("");
}

function renderQuestDetail({quest, activeQuest, activeQuests = [], getQuestProgress, completedQuestClaims, enemyTypes, rawMaterials, playerLevel}){
  const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel);
  const active = activeQuests.some(entry=>entry.id === quest.id) || activeQuest?.id === quest.id;
  const tracked = activeQuest?.id === quest.id;
  const targetType = enemyTypes[quest.objective?.target];
  const targetImage = targetType?.img || "assets/enemies/drone_pirate.png";
  const status = questStatus({...state, active});
  return `<article class="quest-detail ${active ? "active" : ""} ${state.claimable ? "claimable" : ""} ${state.locked ? "locked" : ""}">
    <div class="quest-detail-hero">
      <div class="quest-detail-copy">
        <span>${quest.giver || "Relais de Commandement"}</span>
        <strong>${quest.title}</strong>
        <small>${status} · LV ${state.requiredLevel}</small>
      </div>
      <img src="${targetImage}" alt="${targetType?.name || "Cible"}">
    </div>
    <p>${quest.desc}</p>
    <div class="quest-progress-row">
      <div class="quest-progress-label"><span>${formatQuestObjective(quest)}</span><b>${state.progress}/${state.target}</b></div>
      <div class="spawn-progress"><span style="width:${state.percent}%"></span></div>
    </div>
    <div class="quest-info-grid">
      <div><span>Niveau</span><b>LV ${state.requiredLevel}</b></div>
      <div><span>Zone</span><b>${quest.objective?.zone || "Toutes zones"}</b></div>
      <div><span>Credits</span><b>${fmt(quest.rewards?.credits || 0)}</b></div>
      <div><span>XP</span><b>${fmt(quest.rewards?.xp || 0)}</b></div>
      <div class="quest-material-rewards"><span>Materiaux</span><b>${formatQuestMaterials(quest.rewards?.materials, rawMaterials)}</b></div>
    </div>
    <div class="spawn-actions quest-actions">
      ${state.completed ? `<button class="blue-button small" type="button" disabled>Terminee</button>` : state.locked ? `<button class="blue-button small" type="button" disabled>LV ${state.requiredLevel} requis</button>` : state.claimable ? `<button class="blue-button small" data-claim-quest="${quest.id}" type="button">Reclamer</button>` : `<button class="blue-button small" data-accept-quest="${quest.id}" type="button" ${active ? "disabled" : ""}>${active ? (tracked ? "Suivie" : "En cours") : "Accepter"}</button>`}
    </div>
  </article>`;
}

function renderQuestPanel({activeQuest, activeQuests = [], selectedQuestId, selectedQuestCategory = "normal", quests, getQuestProgress, completedQuestClaims, enemyTypes = {}, rawMaterials = [], playerLevel = 1}){
  const activeCategory = selectedQuestCategory || "normal";
  const visibleQuests = quests.filter(quest=>(quest.category || "normal") === activeCategory);
  const selectedQuest = visibleQuests.find(quest=>quest.id === selectedQuestId) || (activeQuest && (activeQuest.category || "normal") === activeCategory ? activeQuest : null) || visibleQuests[0];
  const claimableCount = visibleQuests.filter(quest=>questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel).claimable).length;
  const completedCount = visibleQuests.filter(quest=>completedQuestClaims?.[quest.id]).length;
  return {
    title:"RELAIS DE QUETES",
    html:`
      ${renderQuestTabs({activeCategory, quests})}
      <div class="quest-console">
        <aside class="quest-menu">
          <div class="quest-menu-head">
            <span>Missions</span>
            <b>${claimableCount}</b>
          </div>
          <div class="quest-strip-list">${visibleQuests.length ? renderQuestList({quests:visibleQuests, selectedQuest, activeQuest, activeQuests, getQuestProgress, completedQuestClaims, playerLevel}) : `<div class="spawn-panel-note">Aucune mission dans cette categorie.</div>`}</div>
          <div class="quest-menu-foot">${completedCount}/${visibleQuests.length} terminees</div>
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
