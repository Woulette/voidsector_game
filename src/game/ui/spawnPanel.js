import { fmt, fmtCompact } from "../../core/utils.js";
import { ammoTypes, equipment, portals } from "../../data/catalog.js";
import { getEnemyAssetRotationStyle, hasCompactQuestAsset } from "../../data/enemyVisuals.js";
import { getFirmDefinition, normalizeFirmId } from "../../data/firms.js";
import { getQuestBriefing } from "../../data/questBriefings.js";
import { MATERIAL_COMMERCE_ORDER, getMaterialCommerceUnitPrice, getMaterialCommerceValue } from "../../shared/materialCommerce.js";

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

function isPremiumQuestLocked(quest, premiumActive){
  return (quest?.category || "normal") === "weekly" && !premiumActive;
}

function questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel, premiumActive = false){
  const progress = getQuestProgress(quest.id);
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  const target = objectives.filter(Boolean).reduce((sum, objective)=>sum + Number(objective.count || 0), 0);
  const completed = !!completedQuestClaims?.[quest.id];
  const claimable = !completed && progress >= target;
  const percent = target ? Math.min(100, progress / target * 100) : 0;
  const requiredLevel = Number(quest.requiredLevel || 1);
  const levelLocked = Number(playerLevel || 1) < requiredLevel;
  const prereqLocked = !!quest.prereqLocked;
  const premiumLocked = !completed && isPremiumQuestLocked(quest, premiumActive);
  const locked = levelLocked || prereqLocked || premiumLocked;
  return {progress, target, completed, claimable, percent, requiredLevel, locked, levelLocked, prereqLocked, premiumLocked};
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
  const firstObjective = Array.isArray(quest.objectives) ? quest.objectives[0] || {} : objective;
  if(objective.type === "kill" || firstObjective.type === "kill"){
    return quest.desc || "Securise la zone et reviens au relais.";
  }
  if(objective.type === "owned_combat_drone") return quest.desc || "Possede au moins un drone de combat.";
  if(objective.type === "equipped_ship") return quest.desc || "Equipe le vaisseau demande.";
  if(objective.type === "equipped_ship_lasers") return quest.desc || "Equipe au moins le nombre de lasers demande sur ton vaisseau.";
  if(objective.type === "quest_item_drop") return quest.desc || "Recupere l'objet demande.";
  if(objective.type === "deliver_item") return quest.desc || "Rapporte les objets demandes.";
  if(objective.type === "space_caster_use") return quest.desc || "Lance le Space Caster.";
  if(firstObjective.type === "portal_complete") return quest.desc || "Termine le portail demande.";
  if(firstObjective.type === "talk_npc") return quest.desc || "Parle au PNJ indique.";
  if(objective.type === "refinery_module_upgrade_start") return quest.desc || "Ameliore le module de stockage dans la raffinerie.";
  if(firstObjective.type === "refinery_material_upgrade_start") return quest.desc || "Lance les ameliorations demandees dans la raffinerie.";
  if(firstObjective.type === "visit_coordinates") return quest.desc || "Rejoins les coordonnees indiquees.";
  return "OBJECTIF";
}

function formatQuestZone(quest = {}){
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  const zones = [];
  for(const objective of objectives.filter(Boolean)){
    if(objective.type === "refinery_module_upgrade_start") continue;
    if(objective.type === "refinery_material_upgrade_start") continue;
    if(objective.type === "owned_combat_drone") continue;
    if(objective.type === "equipped_ship") continue;
    if(objective.type === "equipped_ship_lasers") continue;
    if(objective.type === "visit_coordinates") continue;
    if(objective.type === "talk_npc") continue;
    if(objective.type === "deliver_item") continue;
    if(objective.type === "space_caster_use") continue;
    if(objective.type === "portal_complete") continue;
    if(Array.isArray(objective.zones)) zones.push(...objective.zones);
    else if(objective.zone) zones.push(objective.zone);
  }
  if(zones.length) return [...new Set(zones)].join(" / ");
  if(objectives.some(objective=>objective?.type === "refinery_material_upgrade_start")) return "Raffinerie";
  const objective = quest.objective || {};
  if(objective.type === "refinery_module_upgrade_start") return "";
  if(objective.type === "refinery_material_upgrade_start") return "Raffinerie";
  if(objective.type === "owned_combat_drone") return "Hangar";
  if(objective.type === "equipped_ship") return "Hangar";
  if(objective.type === "equipped_ship_lasers") return "Hangar";
  if(objective.type === "talk_npc") return objective.zone || "PNJ";
  if(objective.type === "deliver_item") return objective.zone || "PNJ";
  if(objective.type === "space_caster_use") return objective.zone || "Portails";
  if(objective.type === "portal_complete") return objective.zone || "Portails";
  return objective.zone || "Toutes zones";
}

function renderQuestVisitObjectives(quest = {}){
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  return objectives.filter(objective=>(objective?.type === "visit_map" && objective.map) || objective?.type === "visit_coordinates").map(objective=>
    objective.type === "visit_coordinates"
      ? `<div class="quest-objective-meta"><span>Coord</span><b>X ${objective.x} / Y ${objective.y}</b></div>`
      : `<div class="quest-objective-meta"><span>Carte</span><b>${objective.map}</b></div>`
  ).join("");
}

function renderQuestFailConditions(quest = {}){
  const hpLossLimit = Math.max(0, Number(quest.failConditions?.hpLossLimit || 0));
  const timeLimit = Math.max(0, Number(quest.failConditions?.timeLimit || 0));
  return [
    hpLossLimit ? `<div class="quest-objective-meta warning"><span>Limite</span><b>Vie perdue max ${fmt(hpLossLimit)}</b></div>` : "",
    timeLimit ? `<div class="quest-objective-meta warning"><span>Temps</span><b>${Math.floor(timeLimit / 60)} min max</b></div>` : "",
    quest.failConditions?.deathResets ? `<div class="quest-objective-meta warning"><span>Mort</span><b>Progression remise a zero</b></div>` : ""
  ].join("");
}

function renderQuestZoneMeta(zoneLabel){
  if(!zoneLabel) return "";
  return `<div class="quest-objective-meta"><span>Zone</span><b>${zoneLabel}</b></div>`;
}

function formatQuestMaterials(materials = {}, rawMaterials = []){
  const entries = Object.entries(materials);
  return entries.map(([id, amount])=>{
    const material = rawMaterials.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${material?.img || "assets/materials/cargo_box.svg"}" alt=""><b title="${fmt(amount)}">${fmtCompact(amount)}</b><small>${material?.short || id.toUpperCase()}</small></span>`;
  }).join("");
}

function formatQuestItems(items = []){
  return items.map(id=>{
    const item = equipment.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${item?.img || "assets/equipment/module_munitions.svg"}" alt=""><small>${item?.name || id}</small></span>`;
  }).join("");
}

function formatQuestItemCounts(itemCounts = {}){
  return Object.entries(itemCounts).map(([id, amount])=>{
    const item = equipment.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${item?.img || "assets/equipment/module_munitions.svg"}" alt=""><b title="${fmt(amount)}">${fmtCompact(amount)}</b><small>${item?.name || id}</small></span>`;
  }).join("");
}

function formatQuestPortalPieces(portalPieces = {}){
  return Object.entries(portalPieces).map(([id, amount])=>{
    const portal = portals.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${portal?.pieceImg || portal?.img || "assets/portal_pieces/portal_piece_blue.png"}" alt=""><b title="${fmt(amount)}">${fmtCompact(amount)}</b><small>Piece ${portal?.name || id}</small></span>`;
  }).join("");
}

function formatQuestAmmo(ammoRewards = {}){
  return Object.entries(ammoRewards).map(([id, amount])=>{
    const ammo = ammoTypes.find(entry=>entry.id === id);
    return `<span class="quest-reward-item"><img src="${ammo?.img || "assets/equipment/ammo_laser_x2_same_preview.png"}" alt=""><b title="${fmt(amount)}">${fmtCompact(amount)}</b><small>${ammo?.short || id}</small></span>`;
  }).join("");
}

function renderQuestTargetIcons(quest, enemyTypes = {}){
  if(quest.objective?.type === "refinery_module_upgrade_start"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/materials/zinc_spatial.svg" alt="Raffinage"></span><span class="quest-target-icon"><img src="assets/materials/titane_fissure.svg" alt="Raffinage"></span></div>`;
  }
  if(quest.objective?.type === "owned_combat_drone"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/drones/drone_test_sprite.webp" alt="Drone de Combat"><b>x${Number(quest.objective.count || 1)}</b></span></div>`;
  }
  if(quest.objective?.type === "equipped_ship"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/ships/Velox.png" alt="Velox"><b>x${Number(quest.objective.count || 1)}</b></span></div>`;
  }
  if(quest.objective?.type === "equipped_ship_lasers"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/equipment/laser_mk1_mk1_slot_v2.png" alt="Lasers équipés"><b>${Number(quest.objective.count || 1)}+</b></span></div>`;
  }
  if(quest.objective?.type === "quest_item_drop"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="${quest.objective.itemImg || "assets/quest_items/contaminated_sample.png"}" alt="${quest.objective.itemName || "Objet de quete"}"><b>${Math.round(Number(quest.objective.dropChance || 0) * 100)}%</b></span></div>`;
  }
  if(quest.objective?.type === "deliver_item"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="${quest.objective.itemImg || "assets/quest_items/teleportation_fluid.png"}" alt="${quest.objective.itemName || "Objet de quete"}"><b>x${Number(quest.objective.count || 1)}</b></span></div>`;
  }
  if(quest.objective?.type === "space_caster_use"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/portals/portail_bleu.svg" alt="Space Caster"><b>x${Number(quest.objective.count || 1)}</b></span></div>`;
  }
  if(quest.objective?.type === "portal_complete"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/portals/portail_bleu.svg" alt="Portail"><b>x${Number(quest.objective.count || 1)}</b></span></div>`;
  }
  if(quest.objective?.type === "talk_npc"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="${quest.objective.npcImg || "assets/ships/npc/npc_saucer.png"}" alt="PNJ"><b>PNJ</b></span></div>`;
  }
  if(quest.objective?.type === "mission_control"){
    return `<div class="quest-target-icons"><span class="quest-target-icon"><img src="assets/spawn/spawn_quest_relay.png" alt="Controleur de mission"><b>CTRL</b></span></div>`;
  }
  const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
  const materialObjectives = objectives.filter(objective=>objective?.type === "refinery_material_upgrade_start");
  if(materialObjectives.length){
    return `<div class="quest-target-icons">${materialObjectives.map(objective=>{
      const material = {
        cuivre_orbital:{img:"assets/materials/cuivre_orbital.svg", name:"Cuivre"},
        nickel_brut:{img:"assets/materials/nickel_brut.svg", name:"Nickel"},
        silice_conductrice:{img:"assets/materials/silice_conductrice.svg", name:"Silice"}
      }[objective.material] || {img:"assets/materials/cargo_box.svg", name:objective.label || "Materiau"};
      return `<span class="quest-target-icon"><img src="${material.img}" alt="${material.name}"><b>LV${Number(objective.targetLevel || 2)}</b></span>`;
    }).join("")}</div>`;
  }
  const icons = objectives.filter(objective=>objective?.type === "kill").map(objective=>{
    const targetType = enemyTypes[objective.target];
    const targetImage = targetType?.img || "assets/enemies/drone_pirate.png";
    const rotationStyle = getEnemyAssetRotationStyle(objective.target);
    const count = Math.max(0, Number(objective.count || 0));
    return `<span class="quest-target-icon"><img class="${hasCompactQuestAsset(objective.target) ? "quest-enemy-art-large" : ""}" src="${targetImage}" alt="${targetType?.name || "Cible"}"${rotationStyle ? ` style="${rotationStyle}"` : ""}>${count ? `<b>x${count}</b>` : ""}</span>`;
  });
  const coordinateIcons = objectives.filter(objective=>objective?.type === "visit_coordinates").map(objective=>
    `<span class="quest-target-icon"><img src="assets/icons/coordinate_marker.svg" alt="Coordonnees"><b>LOC</b></span>`
  );
  const npcIcons = objectives.filter(objective=>objective?.type === "talk_npc").map(objective=>
    `<span class="quest-target-icon"><img src="${objective.npcImg || "assets/ships/npc/npc_saucer.png"}" alt="PNJ"><b>PNJ</b></span>`
  );
  const missionControlIcons = objectives.filter(objective=>objective?.type === "mission_control").map(()=>
    `<span class="quest-target-icon"><img src="assets/spawn/spawn_quest_relay.png" alt="Controleur de mission"><b>CTRL</b></span>`
  );
  const deliverIcons = objectives.filter(objective=>objective?.type === "deliver_item").map(objective=>
    `<span class="quest-target-icon"><img src="${objective.itemImg || "assets/quest_items/teleportation_fluid.png"}" alt="${objective.itemName || "Objet de quete"}"><b>x${Number(objective.count || 1)}</b></span>`
  );
  const casterIcons = objectives.filter(objective=>objective?.type === "space_caster_use").map(objective=>
    `<span class="quest-target-icon"><img src="assets/portals/portail_bleu.svg" alt="Space Caster"><b>x${Number(objective.count || 1)}</b></span>`
  );
  const portalIcons = objectives.filter(objective=>objective?.type === "portal_complete").map(objective=>
    `<span class="quest-target-icon"><img src="assets/portals/portail_bleu.svg" alt="Portail"><b>x${Number(objective.count || 1)}</b></span>`
  );
  const allIcons = [...icons, ...coordinateIcons, ...npcIcons, ...missionControlIcons, ...deliverIcons, ...casterIcons, ...portalIcons].join("");
  return allIcons ? `<div class="quest-target-icons">${allIcons}</div>` : "";
}

function isQuestPrerequisiteUnlocked(quest, quests = [], completedQuestClaims = {}){
  if(!quest.unlock) return true;
  if(quest.unlock.type === "complete_level_quests"){
    const level = Number(quest.unlock.level || quest.requiredLevel || 1);
    const category = quest.category || "normal";
    return quests
      .filter(entry=>entry.id !== quest.id && !entry.rare && Number(entry.requiredLevel || 1) === level && (entry.category || "normal") === category)
      .every(entry=>completedQuestClaims?.[entry.id]);
  }
  if(quest.unlock.type === "complete_quest"){
    return Boolean(completedQuestClaims?.[quest.unlock.questId]);
  }
  return true;
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

function renderQuestList({quests, selectedQuest, activeQuest, activeQuests = [], getQuestProgress, completedQuestClaims, playerLevel, premiumActive = false}){
  const activeIds = new Set(activeQuests.map(quest=>quest.id));
  return quests.map(quest=>{
    const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel, premiumActive);
    const active = activeIds.has(quest.id) || activeQuest?.id === quest.id;
    const selected = selectedQuest?.id === quest.id;
    const claimable = active && state.claimable;
    return `<button class="quest-strip ${selected ? "selected" : ""} ${active ? "active" : ""} ${quest.special ? "special" : ""} ${quest.rare ? "rare" : ""} ${quest.red ? "red" : ""} ${claimable ? "claimable" : ""} ${state.locked ? "locked" : ""} ${state.premiumLocked ? "premium-locked" : ""}" type="button" data-view-quest="${quest.id}">
      <span class="quest-strip-title">${quest.title}</span>
      <span class="quest-strip-meta"><b>${state.premiumLocked ? "PREMIUM" : `LV ${state.requiredLevel}`}</b></span>
      <span class="quest-strip-bar"><i style="width:${state.percent}%"></i></span>
    </button>`;
  }).join("");
}

function renderQuestDetail({
  quest,
  activeQuest,
  activeQuests = [],
  getQuestProgress,
  completedQuestClaims,
  enemyTypes,
  rawMaterials,
  playerLevel,
  playerName,
  playerRank,
  firmId,
  premiumActive = false
}){
  const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel, premiumActive);
  const active = activeQuests.some(entry=>entry.id === quest.id) || activeQuest?.id === quest.id;
  const claimable = active && state.claimable;
  const tracked = activeQuest?.id === quest.id;
  const itemRewards = formatQuestItems(quest.rewards?.items) + formatQuestItemCounts(quest.rewards?.itemCounts);
  const portalPieceRewards = formatQuestPortalPieces(quest.rewards?.portalPieces);
  const ammoRewards = formatQuestAmmo(quest.rewards?.ammo);
  const materialRewards = formatQuestMaterials({...quest.rewards?.materials, ...quest.rewards?.shipCargoMaterialsForced}, rawMaterials);
  const zoneLabel = formatQuestZone(quest);
  const visitObjectives = renderQuestVisitObjectives(quest);
  const targetIcons = renderQuestTargetIcons(quest, enemyTypes);
  const lockLabel = state.premiumLocked
    ? "Premium requis"
    : state.prereqLocked
      ? "Prerequis requis"
      : `LV ${state.requiredLevel} requis`;
  const briefingStatus = state.completed ? "completed" : claimable ? "claimable" : active ? "active" : "available";
  const briefing = getQuestBriefing({quest, playerName, playerRank, firmId, status:briefingStatus});
  const firm = getFirmDefinition(quest.firmId || firmId);
  const status = questStatus({completed:state.completed, claimable, active, locked:state.locked});
  const typewriterKey = `${quest.id}:${briefingStatus}:${playerRank?.id || "recrue"}`;
  return `<article class="quest-detail ${active ? "active" : ""} ${quest.special ? "special" : ""} ${quest.rare ? "rare" : ""} ${quest.red ? "red" : ""} ${claimable ? "claimable" : ""} ${state.locked ? "locked" : ""} ${state.premiumLocked ? "premium-locked" : ""}">
    <div class="quest-detail-hero">
      <div class="quest-detail-copy">
        <span>${escapeHtml(quest.giver || "Relais de Commandement")} · ${escapeHtml(firm.label)}</span>
        <strong>${escapeHtml(quest.title)}</strong>
      </div>
      <span class="quest-status-chip">${escapeHtml(status)}</span>
      <div class="quest-level-badge"><span>LV</span><b>${state.requiredLevel}</b></div>
    </div>
    <section class="quest-command-briefing" style="--quest-firm-color:${escapeHtml(firm.color)}" data-quest-briefing-skip>
      <figure class="quest-command-portrait">
        <img src="${escapeHtml(briefing.representative.asset)}" alt="${escapeHtml(briefing.representative.title)}">
        <figcaption><strong>${escapeHtml(briefing.representative.name)}</strong><span>${escapeHtml(briefing.representative.title)}</span></figcaption>
      </figure>
      <div class="quest-command-transmission">
        <div class="quest-command-transmission-head">
          <span>Transmission prioritaire</span>
          <b>À ${escapeHtml(briefing.addressee)}</b>
        </div>
        <p data-typewriter-key="${escapeHtml(typewriterKey)}" data-typewriter-text="${escapeHtml(briefing.message)}"></p>
        <i class="quest-command-cursor" aria-hidden="true"></i>
        <small>Cliquer sur le message pour afficher immédiatement la transmission.</small>
      </div>
    </section>
    <div class="quest-detail-columns">
      <section class="quest-mission-card">
        <div class="quest-section-title objective">Ordres de mission</div>
        <p class="quest-objective-text">${escapeHtml(formatQuestObjective(quest))}</p>
        <div class="quest-progress-row">
          <div class="quest-progress-label"><span>Progression opérationnelle</span><b>${fmt(state.progress)} / ${fmt(state.target)}</b></div>
          <div class="quest-progress-track"><span style="width:${state.percent}%"></span></div>
        </div>
        ${targetIcons}
        <div class="quest-objective-metadata">
          ${visitObjectives}
          ${renderQuestFailConditions(quest)}
          ${renderQuestZoneMeta(zoneLabel)}
        </div>
      </section>
      <aside class="quest-reward-card">
        <div class="quest-reward-title">Dotation de mission</div>
        <div class="quest-info-grid compact">
          <div class="credits" aria-label="Crédits"><img src="assets/icons/credits.svg" alt=""><span>Crédits</span><b title="${fmt(quest.rewards?.credits || 0)}">${fmtCompact(quest.rewards?.credits || 0)}</b></div>
          <div class="nova" aria-label="NOVA"><img src="assets/icons/premium.svg" alt=""><span>NOVA</span><b title="${fmt(quest.rewards?.premium || 0)}">${fmtCompact(quest.rewards?.premium || 0)}</b></div>
          <div class="xp"><span class="quest-xp-icon">XP</span><span>Expérience</span><b title="${fmt(quest.rewards?.xp || 0)}">${fmtCompact(quest.rewards?.xp || 0)}</b></div>
          ${itemRewards || portalPieceRewards || ammoRewards ? `<div class="quest-material-rewards"><span>Équipement et objets</span><b>${itemRewards}${portalPieceRewards}${ammoRewards}</b></div>` : ""}
          ${materialRewards ? `<div class="quest-material-rewards"><span>Matériaux</span><b>${materialRewards}</b></div>` : ""}
        </div>
        <div class="spawn-actions quest-actions">
          ${state.completed ? `<button class="blue-button small" type="button" disabled>Terminée</button>` : state.locked ? `<button class="blue-button small" type="button" disabled>${escapeHtml(lockLabel)}</button>` : claimable ? `<button class="blue-button small" data-claim-quest="${escapeHtml(quest.id)}" type="button">Réclamer</button>` : `<button class="blue-button small" data-accept-quest="${escapeHtml(quest.id)}" type="button" ${active ? "disabled" : ""}>${active ? (tracked ? "Mission suivie" : "En cours") : "Accepter la mission"}</button>`}
        </div>
      </aside>
    </div>
  </article>`;
}

function getQuestPanelStatus(quest, activeQuests = [], completedQuestClaims = {}){
  if(completedQuestClaims?.[quest.id]) return "completed";
  if(activeQuests.some(entry=>entry.id === quest.id)) return "active";
  return "available";
}

function renderQuestPanel({
  activeQuest,
  activeQuests = [],
  selectedQuestId,
  selectedQuestCategory = "available",
  selectedQuestType = "normal",
  showLockedQuests = false,
  quests,
  getQuestProgress,
  completedQuestClaims,
  enemyTypes = {},
  rawMaterials = [],
  playerLevel = 1,
  playerName = "Pilote",
  playerRank = null,
  firmId = "astra",
  premiumActive = false
}){
  const activeCategory = QUEST_TABS.some(tab=>tab.id === selectedQuestCategory) ? selectedQuestCategory : "available";
  const activeType = QUEST_TYPE_TABS.some(tab=>tab.id === selectedQuestType) ? selectedQuestType : "normal";
  const questsWithStatus = quests.map(quest=>({
    ...quest,
    prereqLocked:!isQuestPrerequisiteUnlocked(quest, quests, completedQuestClaims),
    panelStatus:getQuestPanelStatus(quest, activeQuests, completedQuestClaims),
    panelType:quest.category || "normal"
  }));
  const shouldHideLocked = quest=>{
    const state = questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel, premiumActive);
    return quest.panelStatus === "available" && !showLockedQuests && state.locked && (!state.premiumLocked || state.levelLocked || state.prereqLocked);
  };
  const displayQuests = questsWithStatus.filter(quest=>!shouldHideLocked(quest));
  const visibleQuests = displayQuests
    .filter(quest=>quest.panelStatus === activeCategory && quest.panelType === activeType)
    .sort((a,b)=>
      Number(a.requiredLevel || 1) - Number(b.requiredLevel || 1)
      || Number(a.prereqLocked || 0) - Number(b.prereqLocked || 0)
      || Number(b.special || 0) - Number(a.special || 0)
      || Number(b.rare || 0) - Number(a.rare || 0)
      || String(a.title || "").localeCompare(String(b.title || ""), "fr")
    );
  const selectedQuest = visibleQuests.find(quest=>quest.id === selectedQuestId)
    || (activeQuest && getQuestPanelStatus(activeQuest, activeQuests, completedQuestClaims) === activeCategory && (activeQuest.category || "normal") === activeType ? activeQuest : null)
    || visibleQuests[0];
  const activeIds = new Set(activeQuests.map(quest=>quest.id));
  const claimableCount = visibleQuests.filter(quest=>activeIds.has(quest.id) && questProgressData(quest, getQuestProgress, completedQuestClaims, playerLevel, premiumActive).claimable).length;
  const completedCount = visibleQuests.filter(quest=>completedQuestClaims?.[quest.id]).length;
  return {
    title:`RELAIS DE QUÊTES — ${getFirmDefinition(normalizeFirmId(firmId)).label}`,
    html:`
      ${renderQuestTabs({activeCategory, quests:displayQuests})}
      ${renderQuestTypeTabs({activeType, quests:displayQuests, activeCategory})}
      <div class="quest-console">
        <aside class="quest-menu">
          <div class="quest-menu-head">
            <span>${QUEST_TABS.find(tab=>tab.id === activeCategory)?.label || "Quete"}</span>
            <b>${claimableCount}</b>
          </div>
          <div class="quest-strip-list">${visibleQuests.length ? renderQuestList({quests:visibleQuests, selectedQuest, activeQuest, activeQuests, getQuestProgress, completedQuestClaims, playerLevel, premiumActive}) : `<div class="spawn-panel-note">Aucune mission ici.</div>`}</div>
          <div class="quest-menu-foot"><span>${completedCount}/${visibleQuests.length} terminees</span>${renderQuestLockToggle(showLockedQuests)}</div>
        </aside>
        <section class="quest-detail-wrap">
          ${selectedQuest ? renderQuestDetail({quest:selectedQuest, activeQuest, activeQuests, getQuestProgress, completedQuestClaims, enemyTypes, rawMaterials, playerLevel, playerName, playerRank, firmId, premiumActive}) : `<div class="spawn-panel-note">Aucune mission disponible.</div>`}
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
    return `<button class="boost-material-card ${material.kind || ""}" type="button" draggable="true"
      data-boost-material="${id}"
      data-boost-material-name="${materialDisplayNames[id] || material.name}"
      data-boost-material-img="${material.img}"
      data-boost-material-amount="${Math.max(0, Math.floor(Number(shipCargo[id] || 0)))}"
      title="${getCombatBoostTooltip?.(id) || ""}">
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

function renderCommercePanel({materials = [], shipCargo = {}, shipCargoUsed = 0, shipCargoCapacity = 0}){
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
        <button class="commerce-open-sale" type="button" data-commerce-open="${material.id}" ${amount > 0 ? "" : "disabled"}>Vendre</button>
      </div>
    </article>`;
  }).join("");
  const sellableTotal = orderedMaterials.reduce((sum, material)=>sum + getMaterialCommerceValue(material.id, getCargoAmount(material.id)), 0);
  const cargoPercent = shipCargoCapacity > 0 ? Math.max(0, Math.min(100, Number(shipCargoUsed || 0) / shipCargoCapacity * 100)) : 0;
  const hiddenNotice = hiddenMaterials.length
    ? `<div class="commerce-note">${hiddenMaterials.map(material=>escapeHtml(material.name)).join(", ")} : pas de prix de vente defini.</div>`
    : "";
  return {
    title:"COMMERCE",
    html:`<section class="commerce-console">
      <header class="commerce-summary">
        <div><span>Valeur vendable en soute</span><strong>${commerceCreditsHtml(sellableTotal)}</strong></div>
      </header>
      <div class="refine-cargo-line"><span>Soute du vaisseau</span><b>${fmt(shipCargoUsed)} / ${fmt(shipCargoCapacity)}</b><i><em style="width:${cargoPercent}%"></em></i></div>
      <div class="commerce-material-list">${rows}</div>
      ${hiddenNotice}
      <div class="commerce-dialog-layer" data-commerce-dialog-layer hidden></div>
    </section>`
  };
}

export function renderSpawnPanelContent(options){
  if(options.mode === "quests") return renderQuestPanel(options);
  if(options.mode === "commerce") return renderCommercePanel(options);
  return renderRefineryPanel(options);
}


