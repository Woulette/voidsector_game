import { fmt } from "../../core/utils.js";
import { equipment } from "../../data/catalog.js";

function questProgressState(quest, getQuestProgress){
  const progress = getQuestProgress(quest.id);
  const target = Number(quest.objective?.count || 0);
  return {progress, target, claimable:target > 0 && progress >= target};
}

function questObjectiveEntries(quest){
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  return objectives.filter(Boolean);
}

function formatObjectiveZone(objective = {}){
  if(Array.isArray(objective.zones) && objective.zones.length) return objective.zones.join(" / ");
  return objective.zone || "Toutes zones";
}

function formatObjectiveName(objective = {}, targetType = null){
  if(objective.type === "refinery_module_upgrade_start") return "Stockage niveau 2";
  return objective.label || targetType?.name || objective.target?.replaceAll("_", " ") || "Cible";
}

function renderObjectiveTab({quest, enemyTypes, getQuestProgress}){
  const objectives = questObjectiveEntries(quest);
  return `<div class="combat-quest-objectives">${objectives.map(objective=>{
    const targetType = enemyTypes[objective.target];
    const progress = getQuestProgress(quest.id);
    const target = Number(objective.count || 0);
    const name = formatObjectiveName(objective, targetType);
    return `<div class="combat-quest-objective-row">
      <img src="${targetType?.img || "assets/enemies/drone_pirate.png"}" alt="">
      <div><strong>${name}</strong><span>${formatObjectiveZone(objective)}</span></div>
      <b>${progress}/${target}</b>
    </div>`;
  }).join("")}</div>`;
}

function renderRewardsTab({quest, rawMaterials}){
  const materials = Object.entries(quest.rewards?.materials || {});
  const items = quest.rewards?.items || [];
  return `<div class="combat-quest-rewards">
    <div><span>Credits</span><b>${fmt(quest.rewards?.credits || 0)}</b></div>
    <div><span>NOVA</span><b>${fmt(quest.rewards?.premium || 0)}</b></div>
    <div><span>XP</span><b>${fmt(quest.rewards?.xp || 0)}</b></div>
    ${items.map(id=>{
      const item = equipment.find(entry=>entry.id === id);
      return `<div><span>Objet</span><b>${item?.name || id}</b></div>`;
    }).join("")}
    ${materials.map(([id, amount])=>{
      const material = rawMaterials.find(entry=>entry.id === id);
      return `<div><span>${material?.short || id.toUpperCase()}</span><b>${fmt(amount)}</b></div>`;
    }).join("") || `<div><span>Materiaux</span><b>0</b></div>`}
  </div>`;
}

function renderDescriptionTab(quest){
  return `<p class="combat-quest-description">${quest.desc}</p>`;
}

function renderTabContent({quest, tab, enemyTypes, rawMaterials, getQuestProgress}){
  if(tab === "rewards") return renderRewardsTab({quest, rawMaterials});
  if(tab === "description") return renderDescriptionTab(quest);
  return renderObjectiveTab({quest, enemyTypes, getQuestProgress});
}

export function renderCombatQuestTracker({
  activeQuests,
  trackedQuest,
  detailTab,
  enemyTypes,
  rawMaterials,
  getQuestProgress
}){
  const selected = activeQuests.find(quest=>quest.id === trackedQuest?.id) || activeQuests[0] || null;
  if(!activeQuests.length || !selected){
    return `<p class="group-panel-note">Aucune quete en cours. Passe par le relais pour accepter des missions.</p>`;
  }
  const slots = Array.from({length:5}, (_,index)=>{
    const quest = activeQuests[index] || null;
    const state = quest ? questProgressState(quest, getQuestProgress) : null;
    const selectedClass = selected?.id === quest?.id ? "selected" : "";
    const claimableClass = state?.claimable ? "claimable" : "";
    return `<button class="combat-quest-slot ${selectedClass} ${claimableClass} ${quest ? "" : "empty"}" type="button" ${quest ? `data-track-combat-quest="${quest.id}" title="${quest.title}"` : "disabled"}>
      <span>${index + 1}</span>
      <b>${quest ? `${state.progress}/${state.target}` : "VIDE"}</b>
    </button>`;
  }).join("");
  const targetType = enemyTypes[selected.objective?.target];
  const tab = ["quest", "rewards", "description"].includes(detailTab) ? detailTab : "quest";
  return `
    <div class="combat-quest-slots">${slots}</div>
    <article class="combat-quest-focus">
      <div class="combat-quest-focus-head">
        <div>
          <strong>${selected.title}</strong>
          <span>${formatObjectiveZone(selected.objective)}</span>
        </div>
        <img src="${targetType?.img || "assets/enemies/drone_pirate.png"}" alt="">
      </div>
      <div class="combat-quest-detail-tabs">
        <button class="${tab === "quest" ? "active" : ""}" data-combat-quest-tab="quest" type="button">Quete</button>
        <button class="${tab === "rewards" ? "active" : ""}" data-combat-quest-tab="rewards" type="button">Gains</button>
        <button class="${tab === "description" ? "active" : ""}" data-combat-quest-tab="description" type="button">Info</button>
      </div>
      ${renderTabContent({quest:selected, tab, enemyTypes, rawMaterials, getQuestProgress})}
    </article>
  `;
}
