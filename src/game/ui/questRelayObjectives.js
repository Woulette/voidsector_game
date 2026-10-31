import { ships } from "../../data/catalog.js?v=20260726-kharon1";
import { getEnemyAssetRotationStyle } from "../../data/enemyVisuals.js";
import { getQuestActivityCategory, renderQuestCategoryIcon } from "./questCategories.js";
import { getQuestObjectiveImage } from "./questObjectiveVisuals.js?v=20261024-quest-assets1";

export function escapeQuestHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}

const ICONS = {
  mission:'<path d="m12 3 8 9-8 9-8-9Z"/><path d="m8 12 3 3 5-6"/>',
  target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  reward:'<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8c-8 0-8-7-3-5 2 1 3 5 3 5s1-4 3-5c5-2 5 5-3 5Z"/>',
  calendar:'<path d="M4 5h16v16H4zM4 10h16M8 2v6m8-6v6M8 14h2m4 0h2m-8 3h2"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  arrow:'<path d="m9 5 7 7-7 7"/>',
  signal:'<path d="M8 4a11 11 0 0 0 0 16M16 4a11 11 0 0 1 0 16M10 8a5 5 0 0 0 0 8m4-8a5 5 0 0 1 0 8"/><circle cx="12" cy="12" r="1"/>',
};

export function questIcon(name, className = "", quest = {}){
  const categoryIcon = renderQuestCategoryIcon(name, className, quest);
  if(categoryIcon) return categoryIcon;
  return `<svg class="quest-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.mission}</svg>`;
}

export function questObjectives(quest){
  return (Array.isArray(quest?.objectives) ? quest.objectives : [quest?.objective]).filter(Boolean);
}

// Matches the canonical progress-store keys; the renderer never writes progress.
export function relayObjectiveKey(objective = {}, index = 0){
  return objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
}

export function questActivity(quest){
  return getQuestActivityCategory(quest);
}

export function relayObjectiveInfo(objective = {}, enemyTypes = {}){
  const ship = ships.find(entry=>entry.id === objective.shipId);
  const enemy = enemyTypes[objective.target];
  const place = (objective.zones?.length ? objective.zones.join(" / ") : objective.zone) || "Toutes zones";
  const result = {title:objective.label || "Accomplir la mission", place, icon:"mission", image:null, style:"", note:""};
  switch(objective.type){
    case "kill": return {...result, icon:"combat", title:`Éliminer : ${enemy?.name || objective.label || objective.target}`, image:enemy?.img || "assets/enemies/drone_pirate.png", style:getEnemyAssetRotationStyle(objective.target)};
    case "owned_ship": return {...result, icon:"ship", title:`Posséder un ${ship?.name || objective.shipId}`, place:"Hangar", image:ship?.img};
    case "equipped_ship": return {...result, icon:"ship", title:`Équiper le ${ship?.name || objective.shipId}`, place:"Hangar", image:ship?.img};
    case "owned_combat_drone": return {...result, icon:"drone", title:"Posséder un drone de combat", place:"Hangar", image:getQuestObjectiveImage(objective)};
    case "equipped_ship_lasers": return {...result, icon:"laser", title:"Équiper les lasers du vaisseau", place:"Hangar", image:getQuestObjectiveImage(objective)};
    case "refinery_module_upgrade_start": return {...result, icon:"upgrade", title:`Améliorer le stockage au niveau ${Number(objective.targetLevel || 2)}`, place:"Raffinerie", note:"Lancer l’amélioration suffit à valider cet objectif."};
    case "refinery_material_upgrade_start": return {...result, icon:"upgrade", title:`Améliorer : ${objective.label || objective.material}`, place:"Raffinerie", image:getQuestObjectiveImage(objective), note:"Lancer l’amélioration suffit à valider cet objectif."};
    case "visit_map": return {...result, icon:"location", title:`Rejoindre ${objective.map}`, place:objective.map};
    case "visit_coordinates": return {...result, icon:"location", title:`Rejoindre X ${objective.x} · Y ${objective.y}`};
    case "quest_item_drop": {
      const targets = (objective.targets || [objective.target]).filter(Boolean).map(id=>enemyTypes[id]?.name || id);
      return {...result, icon:"collect", title:`Récupérer : ${objective.itemName || objective.label}`, image:getQuestObjectiveImage(objective), note:`${targets.length ? `Sur ${targets.join(" / ")}` : "Sur les ennemis de la zone"}${objective.dropChance ? ` · Chance : ${Math.round(objective.dropChance * 100)} %` : ""}`};
    }
    case "deliver_item": return {...result, icon:"deliver", title:objective.label || `Livrer : ${objective.itemName}`, image:objective.itemImg, note:objective.consumeItems ? "Les objets seront remis au destinataire." : ""};
    case "talk_npc": return {...result, icon:"signal", title:objective.label || "Parler au contact", image:getQuestObjectiveImage(objective)};
    case "mission_control": return {...result, icon:"signal", title:objective.label || "Retourner au relais de quêtes", place:objective.zone || "Relais de quêtes"};
    case "space_caster_use": return {...result, icon:"portal", title:"Utiliser le Space Caster", place:objective.zone || "Portails", image:getQuestObjectiveImage(objective)};
    case "portal_complete": return {...result, icon:"portal", title:objective.label || "Terminer le portail", place:objective.zone || "Portails", image:getQuestObjectiveImage(objective)};
    default: return result;
  }
}

export function relayObjectiveStates(quest, {getQuestObjectiveProgress, getQuestProgress = ()=>0, completed = false, active = false}){
  const objectives = questObjectives(quest);
  return objectives.map((objective, index)=>{
    const key = relayObjectiveKey(objective, index);
    const target = Math.max(0, Number(objective.count || 0));
    const raw = completed ? target : !active ? 0 : getQuestObjectiveProgress ? getQuestObjectiveProgress(quest.id, key) : objectives.length === 1 ? getQuestProgress(quest.id) : null;
    const progress = raw === null ? null : Math.min(target, Math.max(0, Number(raw) || 0));
    return {objective, key, target, progress, done:progress !== null && progress >= target};
  });
}

export function renderRelayObjectives(quest, entries, enemyTypes = {}){
  const single = entries.length === 1;
  const html = entries.map((entry, index)=>{
    const {objective, progress, target, done} = entry;
    const info = relayObjectiveInfo(objective, enemyTypes);
    const prerequisites = [...(objective.requiresObjectives || []), ...(objective.requiresObjective ? [objective.requiresObjective] : [])];
    const pending = prerequisites.filter(key=>!entries.find(other=>other.key === key)?.done);
    const percent = target ? (progress || 0) / target * 100 : 0;
    const image = info.image ? `<img class="quest-objective-art" src="${escapeQuestHtml(info.image)}" alt="" ${info.style ? `style="${escapeQuestHtml(info.style)}"` : ""}>` : "";
    const symbol = !done && info.image && ["equipped_ship_lasers", "refinery_material_upgrade_start", "quest_item_drop", "portal_complete", "space_caster_use"].includes(objective.type)
      ? `<img class="quest-icon quest-category-art quest-objective-symbol-art" src="${escapeQuestHtml(info.image)}" alt="">`
      : questIcon(done ? "check" : info.icon);
    return `<li class="quest-objective ${single ? "hero" : ""} ${done ? "done" : ""} ${pending.length ? "pending" : ""} ${image ? "has-art" : ""}">
      <span class="quest-objective-symbol">${!single ? `<small class="quest-step-number">${index + 1}</small>` : ""}${symbol}</span>
      <div class="quest-objective-main"><strong>${escapeQuestHtml(info.title)}</strong>
        <span class="quest-objective-count">${progress === null ? "—" : progress} <small>/ ${target}</small>${done ? '<span class="quest-objective-done">Validé</span>' : ""}</span>
        <span class="quest-objective-place">${questIcon("location")}Lieu : ${escapeQuestHtml(info.place)}</span>
        ${info.note ? `<small class="quest-objective-note">${escapeQuestHtml(info.note)}</small>` : ""}
        ${pending.length ? `<small class="quest-objective-prerequisite">${questIcon("lock")}Après les étapes : ${pending.map(key=>entries.findIndex(other=>other.key === key) + 1).filter(Boolean).join(", ")}</small>` : ""}
      </div>${image}
      ${!single ? `<span class="quest-objective-meter" role="progressbar" aria-label="${escapeQuestHtml(info.title)}" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${progress || 0}"><i style="width:${percent}%"></i></span>` : ""}
    </li>`;
  }).join("");
  return `<ol class="quest-objectives ${single ? "single" : "multiple"}">${html}</ol>`;
}
