import { ammoTypes, equipment, portals } from "../../data/catalog.js?v=20260726-kharon1";
import { getFirmDefinition, getMapDisplayName } from "../../data/firms.js";
import { getQuestBriefing } from "../../data/questBriefings.js";
import { getTutorialExpectedQuestId } from "../../shared/tutorial.js?v=20260726-kharon1";
import { renderQuestAbandonAction } from "./questAbandon.js";
import { escapeQuestHtml as esc, questIcon, questActivity, relayObjectiveStates, renderRelayObjectives } from "./questRelayObjectives.js";

const NUMBER = new Intl.NumberFormat("fr-FR");
const fmt = value=>NUMBER.format(Number(value) || 0);
// Presentation limit, checked against the canonical store limit in the relay tests.
export const RELAY_ACTIVE_QUEST_LIMIT = 5;
const QUEST_TABS = [{id:"available", label:"Disponibles"}, {id:"active", label:"En cours"}, {id:"completed", label:"Terminées"}];
const QUEST_TYPES = [{id:"normal", label:"Principales", icon:"mission"}, {id:"daily", label:"Journalières", icon:"calendar"}, {id:"weekly", label:"Hebdomadaires", icon:"clock"}];

function questToneClass(quest = {}){
  if(quest.red) return "red";
  if(quest.rare) return "rare";
  if(quest.special) return "special";
  return "";
}

function prerequisiteUnlocked(quest, quests, claims){
  if(quest.unlock?.type === "complete_quest") return !!claims[quest.unlock.questId];
  if(quest.unlock?.type !== "complete_level_quests") return true;
  return quests.filter(entry=>entry.id !== quest.id && !entry.rare
    && Number(entry.requiredLevel || 1) === Number(quest.unlock.level || quest.requiredLevel || 1)
    && (entry.category || "normal") === (quest.category || "normal"))
    .every(entry=>claims[entry.id]);
}

function questState(quest, context){
  const {activeIds, completedQuestClaims, playerLevel, premiumActive, quests} = context;
  const completed = !!completedQuestClaims[quest.id];
  const active = activeIds.has(quest.id) && !completed;
  const level = Number(quest.requiredLevel || 1);
  const levelLocked = playerLevel < level;
  const prereqLocked = !prerequisiteUnlocked(quest, quests, completedQuestClaims);
  const premiumLocked = quest.category === "weekly" && !premiumActive;
  const locked = !completed && (levelLocked || prereqLocked || premiumLocked);
  const entries = relayObjectiveStates(quest, {...context, active, completed});
  const target = entries.reduce((sum, entry)=>sum + entry.target, 0);
  const progress = entries.reduce((sum, entry)=>sum + (entry.progress || 0), 0);
  const claimable = active && entries.length > 0 && entries.every(entry=>entry.done);
  return {active, completed, level, locked, levelLocked, prereqLocked, premiumLocked, entries,
    claimable, percent:target ? progress / target * 100 : 0,
    panelStatus:completed ? "completed" : active ? "active" : "available",
    label:completed ? "Terminée" : locked ? "Verrouillée" : claimable ? "À réclamer" : active ? "En cours" : "Disponible"};
}

function renderTabs(tabs, selected, rows, kind){
  const category = kind === "category";
  return `<nav class="${category ? "quest-tabs" : "quest-type-tabs"}" aria-label="${category ? "État des missions" : "Type de mission"}">${tabs.map(tab=>{
    const count = rows.filter(row=>category ? row.state.panelStatus === tab.id : (row.quest.category || "normal") === tab.id).length;
    return `<button type="button" class="${category ? "quest-tab" : "quest-type-tab"} ${selected === tab.id ? "active" : ""}" data-quest-${kind}="${tab.id}" aria-pressed="${selected === tab.id}">${tab.icon ? questIcon(tab.icon) : ""}<span>${tab.label}</span><b>${count}</b></button>`;
  }).join("")}</nav>`;
}

function renderList(rows, selected){
  return rows.map(({quest, state})=>{
    const activity = questActivity(quest);
    const hint = state.claimable ? "Récompenses disponibles" : state.locked ? (state.premiumLocked ? "Premium requis" : state.prereqLocked ? "Prérequis à terminer" : "Niveau requis") : activity.label;
    return `<button class="quest-strip ${quest.id === selected?.quest.id ? "selected" : ""} ${state.active ? "active" : ""} ${questToneClass(quest)} ${state.claimable ? "claimable" : ""} ${state.locked ? "locked" : ""}" type="button" data-view-quest="${esc(quest.id)}" aria-pressed="${quest.id === selected?.quest.id}">
      <span class="quest-strip-icon" role="img" aria-label="${esc(activity.label)}">${questIcon(activity.icon)}</span>
      <span class="quest-strip-copy"><span class="quest-strip-title">${esc(quest.title)}</span><span class="quest-strip-hint">${esc(hint)}${quest.red ? " · Prioritaire" : quest.rare ? " · Rare" : ""}</span></span>
      <span class="quest-strip-meta">Niv. <b>${state.level}</b></span>
      ${state.active ? `<span class="quest-strip-bar"><i style="width:${state.percent}%"></i></span>` : ""}
    </button>`;
  }).join("");
}

function rewardChip({image, label, amount, xp = false}){
  return `<div class="quest-reward-item">${xp ? '<span class="quest-relay-xp-icon"><svg viewBox="0 0 52 52" aria-hidden="true"><path d="M15 3h22l12 12v22L37 49H15L3 37V15Z"/><path d="M16 7h20l9 9v20l-9 9H16l-9-9V16Z"/></svg><span>XP</span></span>' : `<img src="${esc(image)}" alt="">`}<span>${amount !== undefined ? `<b>${fmt(amount)}</b>` : ""}<small>${esc(label)}</small></span></div>`;
}

function renderRewards(quest, rawMaterials){
  const rewards = quest.rewards || {};
  const items = new Map(Object.entries(rewards.itemCounts || {}));
  for(const id of rewards.items || []) items.set(id, Number(items.get(id) || 0) + 1);
  const extras = [...items].map(([id, amount])=>{
    const item = equipment.find(entry=>entry.id === id);
    return rewardChip({image:item?.img || "assets/equipment/module_munitions.svg", label:item?.name || id, amount});
  });
  for(const [id, amount] of Object.entries(rewards.portalPieces || {})){
    const portal = portals.find(entry=>entry.id === id);
    extras.push(rewardChip({image:portal?.pieceImg || portal?.img || "assets/portal_pieces/fragment_azuron.png", label:portal?.pieceLabel || `Fragment ${portal?.name || id}`, amount}));
  }
  for(const [id, amount] of Object.entries(rewards.ammo || {})){
    const ammo = ammoTypes.find(entry=>entry.id === id);
    extras.push(rewardChip({image:ammo?.img || "assets/equipment/ammo_laser_x2_same_preview.png", label:ammo?.name || ammo?.short || id, amount}));
  }
  const materials = {...rewards.materials};
  for(const [id, amount] of Object.entries(rewards.shipCargoMaterialsForced || {})) materials[id] = Number(materials[id] || 0) + Number(amount || 0);
  for(const [id, amount] of Object.entries(materials)){
    const material = rawMaterials.find(entry=>entry.id === id);
    extras.push(rewardChip({image:material?.img || "assets/materials/cargo_box.svg", label:material?.name || material?.short || id, amount}));
  }
  return `<section class="quest-reward-card"><h3>${questIcon("reward")}Récompenses</h3><div class="quest-rewards-main">
    ${rewardChip({image:"assets/icons/credits.svg", label:"Crédits", amount:rewards.credits || 0})}
    ${rewardChip({image:"assets/icons/premium.svg", label:"Nova", amount:rewards.premium || 0})}
    ${rewardChip({xp:true, label:"XP", amount:rewards.xp || 0})}
    </div>${extras.length ? `<div class="quest-rewards-extra">${extras.join("")}</div>` : ""}</section>`;
}

function renderConditions(quest){
  const fail = quest.failConditions || {};
  const conditions = [fail.hpLossLimit ? `Perte de coque maximale : ${fmt(fail.hpLossLimit)}` : "",
    fail.timeLimit ? `Délai : ${fmt(fail.timeLimit / 60)} min` : "",
    fail.deathResets ? "Progression perdue en cas de destruction" : ""].filter(Boolean);
  return conditions.length ? `<div class="quest-conditions"><strong>Conditions de réussite</strong>${conditions.map(text=>`<span>${esc(text)}</span>`).join("")}</div>` : "";
}

function lockReason(quest, state, quests){
  if(state.levelLocked) return `Atteins le niveau ${state.level} pour accepter cette mission.`;
  if(state.prereqLocked){
    const prerequisite = quests.find(entry=>entry.id === quest.unlock?.questId);
    return prerequisite ? `Termine d’abord « ${prerequisite.title} ».` : `Termine d’abord les missions principales de niveau ${Number(quest.unlock?.level || state.level)}.`;
  }
  return "Un abonnement Premium actif est nécessaire pour cette mission hebdomadaire.";
}

function renderDetail({quest, state}, context){
  const {playerName, playerRank, firmId, tutorial, activeQuest, activeIds, rawMaterials, enemyTypes, quests} = context;
  const status = state.completed ? "completed" : state.claimable ? "claimable" : state.active ? "active" : "available";
  const briefing = getQuestBriefing({quest, playerName, playerRank, firmId, status});
  const full = activeIds.size >= RELAY_ACTIVE_QUEST_LIMIT;
  const actionLabel = state.completed ? "Mission terminée" : state.locked ? "Mission verrouillée" : state.claimable ? "Réclamer les récompenses" : state.active ? (activeQuest?.id === quest.id ? "Mission suivie" : "Mission en cours") : full ? "5 missions déjà en cours" : "Accepter la mission";
  const disabled = state.completed || state.locked || (state.active && !state.claimable) || (!state.active && full);
  const action = state.claimable ? `data-claim-quest="${esc(quest.id)}"` : !disabled ? `data-accept-quest="${esc(quest.id)}"` : "";
  const singleObjective = state.entries.length === 1;
  const hangarScene = singleObjective && ["owned_ship", "equipped_ship", "owned_combat_drone", "equipped_ship_lasers"].includes(state.entries[0].objective.type);
  const footnote = state.completed ? "Récompenses déjà récupérées." : state.locked ? lockReason(quest, state, quests) : state.claimable ? "Tous les objectifs sont validés." : state.active ? "Termine les objectifs, puis reviens au relais." : full ? "Termine ou abandonne une mission pour libérer une place." : "La progression commence à l’acceptation.";
  return `<article class="quest-detail ${questToneClass(quest)} ${state.claimable ? "claimable" : ""} ${state.locked ? "locked" : ""}" data-quest-detail="${esc(quest.id)}" style="--quest-firm-color:${esc(briefing.firm.color)}">
    <div class="quest-detail-scroll" tabindex="0" aria-label="Détails de la mission">
      <div class="quest-detail-hero"><h2>${esc(quest.title)}</h2><span class="quest-status-chip ${status}">${esc(state.label)}</span><span class="quest-level-badge">Niveau <b>${state.level}</b></span></div>
      <section class="quest-command-briefing">
        <div class="quest-command-summary"><div class="quest-command-portrait-frame" data-firm="${esc(firmId)}"><img class="quest-command-portrait" src="${esc(briefing.representative.asset)}" alt="${esc(briefing.representative.name)}"></div>
          <div class="quest-command-identity"><strong>${esc(briefing.representative.name)}</strong><span>${esc(briefing.representative.title)}</span></div>
          <p>${esc(briefing.summary)}</p>
        </div>
        <details class="quest-transmission-details"><summary>Lire la transmission complète ${questIcon("arrow")}</summary>
          <div class="quest-command-transmission" data-quest-briefing-skip><span>À ${esc(briefing.addressee)}</span><p data-typewriter-key="${esc(`${quest.id}:${status}:${playerRank?.id || "recrue"}`)}" data-typewriter-text="${esc(briefing.message)}"></p><small>Cliquer sur le message pour l’afficher entièrement.</small></div>
        </details>
      </section>
      <section class="quest-mission-card ${singleObjective ? "single-objective" : "multiple-objectives"} ${hangarScene ? "hangar-scene" : ""}"><h3>${questIcon("target")}${state.entries.length > 1 ? "Objectifs" : "Objectif"}${state.entries.length > 1 ? `<small>${state.entries.filter(entry=>entry.done).length} / ${state.entries.length} validés</small>` : ""}</h3>
        ${renderRelayObjectives(quest, state.entries, enemyTypes)}
        <p class="quest-objective-description">${esc(quest.desc || "Accomplis les objectifs et reviens au relais.")}</p>
        ${renderConditions(quest)}
      </section>
      ${renderRewards(quest, rawMaterials)}
    </div>
    <footer class="quest-action-footer"><div class="quest-action-context"><p>${esc(footnote)}</p>${state.active ? renderQuestAbandonAction({questId:quest.id, tutorial, firmId}) : ""}</div>
      <button class="quest-primary-action" type="button" ${action} ${disabled ? "disabled" : ""}>${questIcon(state.locked ? "lock" : "check", "quest-action-mark")}<span>${actionLabel}</span>${!disabled ? questIcon("arrow") : ""}</button>
    </footer>
  </article>`;
}

export function renderQuestPanel({activeQuest = null, activeQuests = [], selectedQuestId, selectedQuestCategory = "available", selectedQuestType = "normal",
  showLockedQuests = false, quests = [], getQuestProgress = ()=>0, getQuestObjectiveProgress, completedQuestClaims = {}, enemyTypes = {}, rawMaterials = [],
  playerLevel = 1, playerName = "Pilote", playerRank = null, firmId = "astra", mapName, premiumActive = false, tutorial = null}){
  const activeIds = new Set([...activeQuests.map(quest=>quest.id), ...(activeQuest ? [activeQuest.id] : [])].filter(id=>!completedQuestClaims[id]));
  const context = {activeQuest, activeIds, quests, getQuestProgress, getQuestObjectiveProgress, completedQuestClaims, enemyTypes, rawMaterials, playerLevel, playerName, playerRank, firmId, premiumActive, tutorial};
  const tutorialGate = tutorial?.status === "active";
  const expectedId = getTutorialExpectedQuestId(tutorial, firmId);
  const source = tutorialGate ? quests.filter(quest=>quest.id === expectedId) : quests;
  const allRows = source.map(quest=>({quest, state:questState(quest, context)}));
  const displayRows = allRows.filter(({state})=>tutorialGate || showLockedQuests || state.panelStatus !== "available" || !state.locked || (state.premiumLocked && !state.levelLocked && !state.prereqLocked));
  let category = QUEST_TABS.some(tab=>tab.id === selectedQuestCategory) ? selectedQuestCategory : "available";
  let type = QUEST_TYPES.some(tab=>tab.id === selectedQuestType) ? selectedQuestType : "normal";
  if(tutorialGate && allRows.length){ category = allRows[0].state.panelStatus; type = allRows[0].quest.category || "normal"; }
  const categoryRows = displayRows.filter(({state})=>state.panelStatus === category);
  const visible = categoryRows.filter(({quest})=>(quest.category || "normal") === type)
    .sort((a,b)=>a.state.level - b.state.level || Number(a.state.prereqLocked) - Number(b.state.prereqLocked)
      || Number(b.quest.special || 0) - Number(a.quest.special || 0) || Number(b.quest.rare || 0) - Number(a.quest.rare || 0)
      || String(a.quest.title).localeCompare(String(b.quest.title), "fr"));
  const selected = visible.find(({quest})=>quest.id === selectedQuestId) || visible.find(({quest})=>quest.id === activeQuest?.id) || visible[0];
  const firm = getFirmDefinition(firmId);
  const emptyMessage = tutorialGate ? "Suis les instructions de ton tutoriel pour débloquer la prochaine mission." : category === "active" ? "Aucune mission en cours dans cette catégorie." : category === "completed" ? "Tu n’as pas encore terminé de mission dans cette catégorie." : "Aucune mission disponible dans cette catégorie.";
  return {
    title:`RELAIS DE QUÊTES — ${firm.label}`,
    titleHtml:`<span class="quest-relay-brand"><span class="quest-relay-emblem" style="color:${esc(firm.color)}"><svg viewBox="0 0 64 72" aria-hidden="true"><path fill="currentColor" d="m32 3 10 24-4 20-6-15-6 15-4-20ZM20 30l6 23-8 6-15 7Zm24 0 17 36-15-7-8-6ZM32 44l7 14-7-4-7 4Z"/></svg></span><span><span class="quest-relay-heading">Relais de quêtes <em style="color:${esc(firm.color)}">${esc(firm.label)}</em></span><small>Secteur ${esc(getMapDisplayName(mapName || firm.homeMapName))}</small></span></span>`,
    html:`${renderTabs(QUEST_TABS, category, displayRows, "category")}
      <div class="quest-console"><aside class="quest-menu">${renderTabs(QUEST_TYPES, type, categoryRows, "type")}
        <div class="quest-strip-list" aria-label="Missions">${visible.length ? renderList(visible, selected) : `<p class="quest-empty-list">${esc(emptyMessage)}</p>`}</div>
        <footer class="quest-menu-foot"><span>${questIcon("location")}${activeIds.size} / ${RELAY_ACTIVE_QUEST_LIMIT} missions en cours</span>
          ${!tutorialGate ? `<button class="quest-lock-toggle ${showLockedQuests ? "open" : ""}" type="button" data-toggle-locked-quests aria-pressed="${showLockedQuests}">${questIcon("lock")}<span>${showLockedQuests ? "Masquer les verrouillées" : "Voir les verrouillées"}</span></button>` : ""}</footer>
      </aside><section class="quest-detail-wrap">${selected ? renderDetail(selected, context) : `<div class="quest-empty-state">${questIcon("mission")}<h2>Aucune mission sélectionnée</h2><p>${esc(emptyMessage)}</p>${!tutorialGate && category === "available" && !showLockedQuests ? '<p>Les missions verrouillées indiquent les niveaux et prérequis nécessaires.</p>' : ""}</div>`}</section></div>`
  };
}
