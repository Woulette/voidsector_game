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

function renderRefineryPanel({job, recipes, materials, getMaterialCount, upgradeables, getEquipmentUpgradeLevel, getEquipmentUpgradeCost, isRefineryComplete, formatDuration}){
  return {
    title:"RAFFINEUR & ATELIER",
    html:`
      <div class="spawn-panel-grid-two">
        <section class="spawn-panel-section">
          <h4>Soute</h4>
          <div class="spawn-list compact">${materials.map(material=>`<div class="spawn-mini-row"><span>${material.name}</span><b>${fmt(getMaterialCount(material.id))}</b></div>`).join("")}</div>
        </section>
        <section class="spawn-panel-section">
          <h4>Raffinage</h4>
          ${job ? (()=>{
            const recipe = recipes.find(entry=>entry.id === job.recipeId);
            const complete = isRefineryComplete();
            return `<article class="spawn-card active"><div class="spawn-card-head"><strong>${recipe?.name || "Raffinage"}</strong><span>${complete ? "Termine" : formatDuration(Number(job.endsAt || 0) - Date.now())}</span></div><p>${recipe?.desc || ""}</p><div class="spawn-actions">${complete ? `<button class="blue-button small" data-claim-refinery type="button">Recuperer</button>` : `<button class="blue-button small" type="button" disabled>En cours</button>`}</div></article>`;
          })() : recipes.map(recipe=>`<article class="spawn-card"><div class="spawn-card-head"><strong>${recipe.name}</strong><span>${formatDuration(recipe.durationMs)}</span></div><p>${recipe.desc}</p><div class="spawn-meta"><small>Cout : ${Object.entries(recipe.costs || {}).map(([id, amount])=>`${amount} ${id.toUpperCase()}`).join(" · ")}</small><small>Resultat : +${recipe.outputAmount} ${recipe.outputId.toUpperCase()}</small></div><div class="spawn-actions"><button class="blue-button small" data-start-refinery="${recipe.id}" type="button">Lancer</button></div></article>`).join("")}
        </section>
      </div>
      <section class="spawn-panel-section">
        <h4>Atelier d'amelioration</h4>
        <div class="spawn-list">${upgradeables.length ? upgradeables.map(item=>{
          const level = getEquipmentUpgradeLevel(item.id);
          const cost = getEquipmentUpgradeCost(item);
          return `<article class="spawn-card"><div class="spawn-card-head"><strong>${item.short || item.name}</strong><span>+${level}</span></div><p>${item.category === "canon" ? "Ameliore les degats de l'arme." : "Ameliore bouclier, regeneration ou vitesse selon le module."}</p><div class="spawn-meta"><small>Cout : ${cost ? `${cost.amount} ${cost.materialId.toUpperCase()}` : "—"}</small></div><div class="spawn-actions"><button class="blue-button small" data-upgrade-item="${item.id}" type="button" ${!cost || getMaterialCount(cost.materialId) < cost.amount ? "disabled" : ""}>Ameliorer</button></div></article>`;
        }).join("") : `<div class="spawn-panel-note">Aucun canon ou generateur dans l'inventaire.</div>`}</div>
      </section>`
  };
}

export function renderSpawnPanelContent(options){
  return options.mode === "quests" ? renderQuestPanel(options) : renderRefineryPanel(options);
}
