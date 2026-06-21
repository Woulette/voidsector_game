import { fmt, fmtCompact } from "../../core/utils.js";
import { ammoTypes, equipment, portals } from "../../data/catalog.js";
import { getEnemyAssetRotationStyle, hasCompactQuestAsset } from "../../data/enemyVisuals.js";

function questProgressState(quest, getQuestProgress){
  const progress = getQuestProgress(quest.id);
  const objectives = questObjectiveEntries(quest);
  const target = objectives.reduce((sum, objective)=>sum + Number(objective.count || 0), 0);
  return {progress, target, claimable:target > 0 && progress >= target};
}

function questObjectiveEntries(quest){
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  return objectives.filter(Boolean);
}

function formatObjectiveZone(objective = {}){
  if(objective.type === "visit_map") return objective.map || "Carte";
  if(objective.type === "refinery_module_upgrade_start") return "Raffinerie";
  if(objective.type === "refinery_material_upgrade_start") return "Raffinerie";
  if(objective.type === "owned_combat_drone") return "Hangar";
  if(objective.type === "equipped_ship") return "Hangar";
  if(objective.type === "equipped_ship_lasers") return "Hangar";
  if(objective.type === "quest_item_drop") return Array.isArray(objective.zones) && objective.zones.length ? objective.zones.join(" / ") : objective.zone || "Toutes zones";
  if(objective.type === "visit_coordinates") return Array.isArray(objective.zones) && objective.zones.length ? objective.zones.join(" / ") : objective.zone || "Coordonnees";
  if(objective.type === "talk_npc") return objective.zone || "PNJ";
  if(objective.type === "deliver_item") return objective.zone || "PNJ";
  if(objective.type === "space_caster_use") return objective.zone || "Portails";
  if(objective.type === "portal_complete") return objective.zone || "Portails";
  if(Array.isArray(objective.zones) && objective.zones.length) return objective.zones.join(" / ");
  return objective.zone || "Toutes zones";
}

function formatObjectiveName(objective = {}, targetType = null){
  if(objective.type === "refinery_module_upgrade_start") return "Stockage niveau 2";
  if(objective.type === "refinery_material_upgrade_start") return objective.label || "Materiau niveau 2";
  if(objective.type === "owned_combat_drone") return objective.label || "Drone de Combat";
  if(objective.type === "equipped_ship") return objective.label || "Vaisseau equipe";
  if(objective.type === "equipped_ship_lasers") return objective.label || "Lasers équipés sur le vaisseau";
  if(objective.type === "quest_item_drop") return objective.label || objective.itemName || "Objet de quete";
  if(objective.type === "visit_map") return objective.label || `Atteindre ${objective.map || "la carte"}`;
  if(objective.type === "visit_coordinates") return objective.label || `Coord X ${objective.x} Y ${objective.y}`;
  if(objective.type === "talk_npc") return objective.label || "Parler au PNJ";
  if(objective.type === "deliver_item") return objective.label || objective.itemName || "Objet a rapporter";
  if(objective.type === "space_caster_use") return objective.label || "Space Caster";
  if(objective.type === "portal_complete") return objective.label || "Portail termine";
  return objective.label || targetType?.name || objective.target?.replaceAll("_", " ") || "Cible";
}

function formatTimer(seconds){
  const safe = Math.max(0, Math.ceil(Number(seconds || 0)));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getObjectiveKey(objective = {}, index = 0){
  return objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
}

function objectiveRequirementsMet(quest, objective, objectives, getQuestProgress, getQuestObjectiveProgress){
  const requiredIds = [
    ...(Array.isArray(objective?.requiresObjectives) ? objective.requiresObjectives : []),
    ...(objective?.requiresObjective ? [objective.requiresObjective] : [])
  ];
  if(!requiredIds.length) return true;
  return requiredIds.every(requiredId=>{
    const requiredIndex = objectives.findIndex(entry=>entry?.id === requiredId);
    if(requiredIndex < 0) return false;
    const requiredObjective = objectives[requiredIndex];
    const target = Number(requiredObjective.count || 0);
    const progress = getQuestObjectiveProgress
      ? getQuestObjectiveProgress(quest.id, getObjectiveKey(requiredObjective, requiredIndex))
      : getQuestProgress(quest.id);
    return target > 0 && progress >= target;
  });
}

function renderObjectiveIcon(objective = {}, targetType = null){
  if(objective.type === "refinery_module_upgrade_start"){
    return `<span class="combat-quest-objective-icon material-pair">
      <img src="assets/materials/zinc_spatial.svg" alt="">
      <img src="assets/materials/titane_fissure.svg" alt="">
    </span>`;
  }
  if(objective.type === "refinery_material_upgrade_start"){
    const material = {
      cuivre_orbital:"assets/materials/cuivre_orbital.svg",
      nickel_brut:"assets/materials/nickel_brut.svg",
      silice_conductrice:"assets/materials/silice_conductrice.svg"
    }[objective.material] || "assets/materials/cargo_box.svg";
    return `<span class="combat-quest-objective-icon"><img src="${material}" alt=""></span>`;
  }
  if(objective.type === "owned_combat_drone"){
    return `<span class="combat-quest-objective-icon"><img src="assets/drones/drone_test_sprite.webp" alt=""></span>`;
  }
  if(objective.type === "equipped_ship"){
    return `<span class="combat-quest-objective-icon"><img src="assets/ships/Velox.png" alt=""></span>`;
  }
  if(objective.type === "equipped_ship_lasers"){
    return `<span class="combat-quest-objective-icon"><img src="assets/equipment/laser_mk1_mk1_slot_v2.png" alt=""></span>`;
  }
  if(objective.type === "quest_item_drop"){
    return `<span class="combat-quest-objective-icon"><img src="${objective.itemImg || "assets/quest_items/contaminated_sample.png"}" alt=""></span>`;
  }
  if(objective.type === "talk_npc"){
    return `<span class="combat-quest-objective-icon"><img src="${objective.npcImg || "assets/ships/npc/npc_saucer.png"}" alt=""></span>`;
  }
  if(objective.type === "mission_control"){
    return `<span class="combat-quest-objective-icon"><img src="assets/spawn/spawn_quest_relay.png" alt=""></span>`;
  }
  if(objective.type === "deliver_item"){
    return `<span class="combat-quest-objective-icon"><img src="${objective.itemImg || "assets/quest_items/teleportation_fluid.png"}" alt=""></span>`;
  }
  if(objective.type === "space_caster_use"){
    return `<span class="combat-quest-objective-icon"><img src="assets/portals/portail_bleu.svg" alt=""></span>`;
  }
  if(objective.type === "portal_complete"){
    return `<span class="combat-quest-objective-icon"><img src="assets/portals/portail_bleu.svg" alt=""></span>`;
  }
  const img = objective.type === "visit_coordinates" || objective.type === "visit_map" ? "assets/icons/coordinate_marker.svg" : targetType?.img || "assets/enemies/drone_pirate.png";
  const rotationStyle = getEnemyAssetRotationStyle(objective.target);
  return `<span class="combat-quest-objective-icon"><img class="${hasCompactQuestAsset(objective.target) ? "quest-enemy-art-large" : ""}" src="${img}" alt=""${rotationStyle ? ` style="${rotationStyle}"` : ""}></span>`;
}

function renderObjectiveTab({quest, enemyTypes, getQuestProgress, getQuestObjectiveProgress, questFailProgress = {}}){
  const objectives = questObjectiveEntries(quest);
  const hpLossLimit = Math.max(0, Number(quest.failConditions?.hpLossLimit || 0));
  const timeLimit = Math.max(0, Number(quest.failConditions?.timeLimit || 0));
  const deathResets = !!quest.failConditions?.deathResets;
  const failState = questFailProgress?.[quest.id] || {};
  const hpLost = Math.max(0, Math.min(hpLossLimit, Number(failState.hpLost || 0)));
  const startedAt = Math.max(0, Number(failState.timeStartedAt || 0));
  const pausedAt = Math.max(0, Number(failState.timePausedAt || 0));
  const timerNow = pausedAt || Date.now();
  const absoluteElapsed = startedAt ? Math.max(0, (timerNow - startedAt) / 1000) : 0;
  const timeElapsed = Math.max(0, Number(failState.timeElapsed || 0), absoluteElapsed);
  const timeRemaining = Math.max(0, timeLimit - timeElapsed);
  return `<div class="combat-quest-objectives">${objectives.map((objective, index)=>{
    const targetType = enemyTypes[objective.target];
    const key = getObjectiveKey(objective, index);
    const progress = getQuestObjectiveProgress ? getQuestObjectiveProgress(quest.id, key) : getQuestProgress(quest.id);
    const target = Number(objective.count || 0);
    const name = formatObjectiveName(objective, targetType);
    const locked = !objectiveRequirementsMet(quest, objective, objectives, getQuestProgress, getQuestObjectiveProgress);
    return `<div class="combat-quest-objective-row ${locked ? "locked" : ""}">
      ${renderObjectiveIcon(objective, targetType)}
      <div><strong>${name}</strong><span>${formatObjectiveZone(objective)}</span></div>
      <b>${progress}/${target}</b>
    </div>`;
  }).join("")}${hpLossLimit ? `<div class="combat-quest-objective-row warning">
      <span class="combat-quest-objective-icon"><img src="assets/icons/medical_cross.svg" alt=""></span>
      <div><strong>Vie perdue max</strong><span>Condition d'echec</span></div>
      <b>${fmt(hpLost)}/${fmt(hpLossLimit)}</b>
    </div>` : ""}${timeLimit ? `<div class="combat-quest-objective-row warning">
      <span class="combat-quest-objective-icon"><img src="assets/icons/time_limit.svg" alt=""></span>
      <div><strong>Temps max</strong><span>Condition d'echec</span></div>
      <b>${formatTimer(timeRemaining)}</b>
    </div>` : ""}${deathResets ? `<div class="combat-quest-objective-row warning">
      <span class="combat-quest-objective-icon"><img src="assets/quest_items/contaminated_sample.png" alt=""></span>
      <div><strong>Ne pas mourir</strong><span>Condition d'echec</span></div>
      <b>0 mort</b>
    </div>` : ""}</div>`;
}

function renderRewardsTab({quest, rawMaterials}){
  const materials = Object.entries(quest.rewards?.materials || {});
  const shipMaterials = Object.entries(quest.rewards?.shipCargoMaterialsForced || {});
  const items = quest.rewards?.items || [];
  const itemCounts = Object.entries(quest.rewards?.itemCounts || {});
  const portalPieces = Object.entries(quest.rewards?.portalPieces || {});
  const ammoRewards = Object.entries(quest.rewards?.ammo || {});
  const itemRows = items.map(id=>{
      const item = equipment.find(entry=>entry.id === id);
      return `<div class="combat-quest-reward-row item">
        <img src="${item?.img || "assets/equipment/module_munitions.svg"}" alt="">
        <span>Objet</span>
        <b>${item?.name || id}</b>
      </div>`;
    }).join("");
  const portalRows = portalPieces.map(([id, amount])=>{
      const portal = portals.find(entry=>entry.id === id);
      return `<div class="combat-quest-reward-row item">
        <img src="${portal?.pieceImg || portal?.img || "assets/portal_pieces/portal_piece_blue.png"}" alt="">
        <span>Piece</span>
        <b>${fmtCompact(amount)} Piece ${portal?.name || id}</b>
      </div>`;
    }).join("");
  const itemCountRows = itemCounts.map(([id, amount])=>{
      const item = equipment.find(entry=>entry.id === id);
      return `<div class="combat-quest-reward-row item">
        <img src="${item?.img || "assets/equipment/module_munitions.svg"}" alt="">
        <span>Objet</span>
        <b>${fmtCompact(amount)} ${item?.name || id}</b>
      </div>`;
    }).join("");
  const ammoRows = ammoRewards.map(([id, amount])=>{
      const ammo = ammoTypes.find(entry=>entry.id === id);
      return `<div class="combat-quest-reward-row item">
        <img src="${ammo?.img || "assets/equipment/ammo_laser_x2_same_preview.png"}" alt="">
        <span>Munition</span>
        <b>${fmtCompact(amount)} ${ammo?.short || id}</b>
      </div>`;
    }).join("");
  const materialRows = [
    ...materials.map(entry=>({entry, label:"Materiau"})),
    ...shipMaterials.map(entry=>({entry, label:"Soute"}))
  ].map(({entry:[id, amount], label})=>{
      const material = rawMaterials.find(entry=>entry.id === id);
      return `<div class="combat-quest-reward-row material">
        <img src="${material?.img || "assets/materials/cargo_box.svg"}" alt="">
        <span>${label} ${material?.short || id.toUpperCase()}</span>
        <b title="${fmt(amount)}">${fmtCompact(amount)}</b>
      </div>`;
    }).join("");
  return `<div class="combat-quest-rewards">
    <div class="combat-quest-reward-line two">
      <div class="combat-quest-reward-row credits"><img src="assets/icons/credits.svg" alt=""><span>Credits</span><b title="${fmt(quest.rewards?.credits || 0)}">${fmtCompact(quest.rewards?.credits || 0)}</b></div>
      <div class="combat-quest-reward-row nova"><img src="assets/icons/premium.svg" alt=""><span>NOVA</span><b title="${fmt(quest.rewards?.premium || 0)}">${fmtCompact(quest.rewards?.premium || 0)}</b></div>
    </div>
    <div class="combat-quest-reward-line">
      <div class="combat-quest-reward-row xp"><span class="combat-quest-reward-icon">XP</span><span>Experience</span><b title="${fmt(quest.rewards?.xp || 0)}">${fmtCompact(quest.rewards?.xp || 0)}</b></div>
    </div>
    ${itemRows || itemCountRows || portalRows || ammoRows ? `<div class="combat-quest-reward-line list">${itemRows}${itemCountRows}${portalRows}${ammoRows}</div>` : ""}
    ${materialRows ? `<div class="combat-quest-reward-line list">${materialRows}</div>` : ""}
  </div>`;
}

function renderDescriptionTab(quest){
  return `<p class="combat-quest-description">${quest.desc}</p>`;
}

function renderTabContent({quest, tab, enemyTypes, rawMaterials, getQuestProgress, getQuestObjectiveProgress, questFailProgress}){
  if(tab === "rewards") return renderRewardsTab({quest, rawMaterials});
  if(tab === "description") return renderDescriptionTab(quest);
  return renderObjectiveTab({quest, enemyTypes, getQuestProgress, getQuestObjectiveProgress, questFailProgress});
}

export function renderCombatQuestTracker({
  activeQuests,
  trackedQuest,
  selectedQuestId = null,
  detailTab,
  enemyTypes,
  rawMaterials,
  getQuestProgress,
  getQuestObjectiveProgress,
  questFailProgress = {}
}){
  const selected = activeQuests.find(quest=>quest.id === selectedQuestId)
    || activeQuests.find(quest=>quest.id === trackedQuest?.id)
    || activeQuests[0]
    || null;
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
  const firstObjective = questObjectiveEntries(selected).find(objective=>objective.target || objective.type === "refinery_module_upgrade_start" || objective.type === "refinery_material_upgrade_start" || objective.type === "owned_combat_drone" || objective.type === "equipped_ship" || objective.type === "equipped_ship_lasers" || objective.type === "quest_item_drop" || objective.type === "visit_coordinates" || objective.type === "talk_npc" || objective.type === "deliver_item" || objective.type === "space_caster_use" || objective.type === "portal_complete") || selected.objective || {};
  const targetType = enemyTypes[firstObjective.target];
  const tab = ["quest", "rewards", "description"].includes(detailTab) ? detailTab : "quest";
  return `
    <div class="combat-quest-slots">${slots}</div>
    <article class="combat-quest-focus">
      <div class="combat-quest-focus-head">
        <div>
          <strong>${selected.title}</strong>
          <span>${formatObjectiveZone(firstObjective)}</span>
        </div>
        ${renderObjectiveIcon(firstObjective, targetType)}
      </div>
      <div class="combat-quest-detail-tabs">
        <button class="${tab === "quest" ? "active" : ""}" data-combat-quest-tab="quest" type="button">Quete</button>
        <button class="${tab === "rewards" ? "active" : ""}" data-combat-quest-tab="rewards" type="button">Gains</button>
        <button class="${tab === "description" ? "active" : ""}" data-combat-quest-tab="description" type="button">Info</button>
      </div>
      ${renderTabContent({quest:selected, tab, enemyTypes, rawMaterials, getQuestProgress, getQuestObjectiveProgress, questFailProgress})}
    </article>
  `;
}
