import { renderCombatQuestTracker as renderCombatQuestTrackerHtml } from "./questTracker.js";
import { renderSpawnPanelContent } from "./spawnPanel.js";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

const GLOBAL_MAP_NODES = [
  {id:"solaris-01", firm:"solaris", name:"SOLARIS-01", x:9, y:8},
  {id:"solaris-02", firm:"solaris", name:"SOLARIS-02", x:20, y:16},
  {id:"solaris-03", firm:"solaris", name:"SOLARIS-03", x:36, y:16},
  {id:"solaris-04", firm:"solaris", name:"SOLARIS-04", x:20, y:29},
  {id:"solaris-05", firm:"solaris", name:"SOLARIS-05", x:36, y:29},
  {id:"virdis-01", firm:"virdis", name:"VIRDIS-01", x:91, y:8},
  {id:"virdis-02", firm:"virdis", name:"VIRDIS-02", x:80, y:16},
  {id:"virdis-03", firm:"virdis", name:"VIRDIS-03", x:64, y:16},
  {id:"virdis-04", firm:"virdis", name:"VIRDIS-04", x:80, y:29},
  {id:"virdis-05", firm:"virdis", name:"VIRDIS-05", x:64, y:29},
  {id:"astra-01", firm:"astra", name:"ASTRA-01", x:9, y:66},
  {id:"astra-02", firm:"astra", name:"ASTRA-02", x:20, y:58},
  {id:"astra-03", firm:"astra", name:"ASTRA-03", x:36, y:58},
  {id:"astra-04", firm:"astra", name:"ASTRA-04", x:20, y:45},
  {id:"astra-05", firm:"astra", name:"ASTRA-05", x:36, y:45},
  {id:"cyan-01", firm:"cyan", name:"CYAN-01", x:91, y:66},
  {id:"cyan-02", firm:"cyan", name:"CYAN-02", x:80, y:58},
  {id:"cyan-03", firm:"cyan", name:"CYAN-03", x:64, y:58},
  {id:"cyan-04", firm:"cyan", name:"CYAN-04", x:80, y:45},
  {id:"cyan-05", firm:"cyan", name:"CYAN-05", x:64, y:45},
  {id:"nexus", firm:"nexus", name:"NEXUS PRIME", x:50, y:36}
];

const GLOBAL_MAP_LINKS = [
  ["solaris-01","solaris-02"],["solaris-02","solaris-03"],["solaris-02","solaris-04"],["solaris-03","solaris-04"],["solaris-03","solaris-05"],["solaris-04","solaris-05"],["solaris-05","nexus"],
  ["virdis-01","virdis-02"],["virdis-02","virdis-03"],["virdis-02","virdis-04"],["virdis-03","virdis-04"],["virdis-03","virdis-05"],["virdis-04","virdis-05"],["virdis-05","nexus"],
  ["astra-01","astra-02"],["astra-02","astra-03"],["astra-02","astra-04"],["astra-03","astra-04"],["astra-03","astra-05"],["astra-04","astra-05"],["astra-05","nexus"],
  ["cyan-01","cyan-02"],["cyan-02","cyan-03"],["cyan-02","cyan-04"],["cyan-03","cyan-04"],["cyan-03","cyan-05"],["cyan-04","cyan-05"],["cyan-05","nexus"],
  ["solaris-03","virdis-03"],["solaris-05","virdis-05"],
  ["astra-03","cyan-03"],["astra-05","cyan-05"],
  ["solaris-04","astra-04"],["virdis-04","cyan-04"],
  ["virdis-05","cyan-05"],["astra-05","solaris-05"]
];

function nodeById(id){ return GLOBAL_MAP_NODES.find(node=>node.id === id); }

const GLOBAL_FIRMS = {
  astra:{name:"Astra Dominion", short:"ASTRA"},
  solaris:{name:"Solaris Pact", short:"SOLARIS"},
  virdis:{name:"Virdis Union", short:"VIRDIS"},
  cyan:{name:"Cyan Coalition", short:"CYAN"}
};

export function createCombatPanels({
  store,
  saveState,
  showToast,
  updateHud,
  maps = [],
  getCurrentMap,
  getPlayer,
  ammoTypes = [],
  enemyTypes,
  getAllRawMaterials,
  getActiveQuest,
  getActiveQuests,
  getAllQuests,
  getQuestProgress,
  claimQuest,
  getItem,
  getRefineryJob,
  getRefineryRecipes,
  getMaterialCount,
  getShipCargo,
  getShipCargoCapacity,
  getShipCargoUsed,
  getShipRefineryRecipeData,
  getCombatBoostSummary,
  getCombatBoostTooltip,
  getEquipmentUpgradeLevel,
  getEquipmentUpgradeCost,
  isRefineryComplete,
  formatDuration,
  graphicsQualityPresets = [],
  getGraphicsQuality
}){
  let spawnPanelMode = null;
  let spawnPanelRefreshT = 0;
  let utilityPanelRefreshT = 0;
  let groupMembers = [];
  let selectedQuestId = null;
  let selectedQuestCategory = "normal";
  let combatQuestDetailTab = "quest";
  let refineryPanelTab = "raffinage";
  let selectedShipRefineRecipeId = null;

  function reset(){
    groupMembers = [];
    const activeQuest = getActiveQuest();
    selectedQuestCategory = activeQuest?.category || "normal";
    selectedQuestId = activeQuest?.id || getAllQuests().find(quest=>(quest.category || "normal") === selectedQuestCategory)?.id || null;
    combatQuestDetailTab = "quest";
    refineryPanelTab = "raffinage";
    selectedShipRefineRecipeId = null;
    spawnPanelRefreshT = 0;
    utilityPanelRefreshT = 0;
  }

  function getSpawnPanelMode(){
    return spawnPanelMode;
  }

  function closeSpawnPanel(){
    spawnPanelMode = null;
    spawnPanelRefreshT = 0;
    document.getElementById("spawnInteractionPanel")?.classList.add("hidden");
    syncUtilityDockButtons();
  }

  function closeUtilityPanel(){
    document.querySelectorAll(".combat-utility-panel").forEach(panel=>panel.classList.add("hidden"));
    syncUtilityDockButtons();
  }

  function getUtilityPanel(mode){
    if(mode === "quests") return document.getElementById("combatUtilityPanelQuests");
    if(mode === "group") return document.getElementById("combatUtilityPanelGroup");
    if(mode === "map") return document.getElementById("combatUtilityPanelMap");
    if(mode === "settings") return document.getElementById("combatUtilityPanelSettings");
    return null;
  }

  function getUtilityContent(mode){
    if(mode === "quests") return document.getElementById("combatUtilityContentQuests");
    if(mode === "group") return document.getElementById("combatUtilityContentGroup");
    if(mode === "map") return document.getElementById("combatUtilityContentMap");
    if(mode === "settings") return document.getElementById("combatUtilityContentSettings");
    return null;
  }

  function syncUtilityDockButtons(){
    document.querySelectorAll("[data-utility-panel]").forEach(btn=>{
      const mode = btn.dataset.utilityPanel;
      const panel = getUtilityPanel(mode);
      const utilityOpen = !!panel && !panel.classList.contains("hidden");
      const refineryOpen = mode === "refinery" && spawnPanelMode === "refinery" && !document.getElementById("spawnInteractionPanel")?.classList.contains("hidden");
      btn.classList.toggle("active", utilityOpen || refineryOpen);
    });
  }

  function applyUtilityPanelLayout(mode, panel){
    const layout = store.state?.uiLayout?.combatUtilityPanels?.[mode] || store.state?.uiLayout?.combatUtilityPanel;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    panel.style.left = `${Math.max(0, Number(layout.left))}px`;
    panel.style.top = `${Math.max(0, Number(layout.top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function applySpawnPanelLayout(panel){
    const layout = store.state?.uiLayout?.spawnInteractionPanel;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    panel.style.left = `${Math.max(0, Number(layout.left))}px`;
    panel.style.top = `${Math.max(0, Number(layout.top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function saveUtilityPanelLayout(mode, layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    if(!store.state.uiLayout.combatUtilityPanels || typeof store.state.uiLayout.combatUtilityPanels !== "object") store.state.uiLayout.combatUtilityPanels = {};
    store.state.uiLayout.combatUtilityPanels[mode] = layout;
    saveState();
  }

  function saveSpawnPanelLayout(layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    store.state.uiLayout.spawnInteractionPanel = layout;
    saveState();
  }

  function renderCombatQuestTracker(){
    const activeQuests = getActiveQuests();
    const trackedQuest = getActiveQuest();
    const selected = activeQuests.find(quest=>quest.id === trackedQuest?.id) || activeQuests[0] || null;
    if(selected && store.state.activeQuestId !== selected.id) store.state.activeQuestId = selected.id;
    return renderCombatQuestTrackerHtml({
      activeQuests,
      trackedQuest:selected,
      detailTab:combatQuestDetailTab,
      enemyTypes,
      rawMaterials:getAllRawMaterials(),
      getQuestProgress
    });
  }

  function refreshQuestUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("quests");
    const content = getUtilityContent("quests");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("quests", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderCombatQuestTracker();
    utilityPanelRefreshT = .25;
    syncUtilityDockButtons();
  }

  function renderGroupUtilityContent(){
    const membersHtml = groupMembers.length
      ? groupMembers.map(name=>`<div class="group-panel-member"><strong>${escapeHtml(name)}</strong><span>Invite</span></div>`).join("")
      : `<p class="group-panel-note">Aucun allie invite pour le moment.</p>`;
    return `
      <div class="group-panel-form">
        <input id="groupInviteName" type="text" maxlength="24" placeholder="Nom du pilote">
        <button class="blue-button small" data-group-invite type="button">INVITER</button>
      </div>
      <p class="group-panel-note">Prototype groupe : entre le nom d'un allie pour preparer l'invitation.</p>
      <div class="group-panel-list">${membersHtml}</div>
    `;
  }

  function refreshGroupUtilityPanel({show = false, focus = false} = {}){
    const panel = getUtilityPanel("group");
    const content = getUtilityContent("group");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("group", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderGroupUtilityContent();
    syncUtilityDockButtons();
    if(focus) document.getElementById("groupInviteName")?.focus();
  }

  function mapPercent(map, point, axis){
    const size = axis === "x" ? map.width : map.height;
    if(!size) return 50;
    const value = axis === "x" ? point?.x : point?.y;
    return Math.max(3, Math.min(97, ((Number(value || 0) + size / 2) / size) * 100));
  }

  function renderGlobalMap(current){
    const currentName = String(current?.name || "").toUpperCase();
    const orderedLinks = [...GLOBAL_MAP_LINKS].sort(([fromA, toA], [fromB, toB])=>{
      const aFrom = nodeById(fromA);
      const aTo = nodeById(toA);
      const bFrom = nodeById(fromB);
      const bTo = nodeById(toB);
      const aInternal = aFrom && aTo && aFrom.firm === aTo.firm && aFrom.firm !== "nexus";
      const bInternal = bFrom && bTo && bFrom.firm === bTo.firm && bFrom.firm !== "nexus";
      return Number(aInternal) - Number(bInternal);
    });
    const links = orderedLinks.map(([fromId, toId])=>{
      const from = nodeById(fromId);
      const to = nodeById(toId);
      if(!from || !to) return "";
      const sameFirm = from.firm === to.firm && from.firm !== "nexus";
      const className = sameFirm ? `firm-link ${from.firm}` : "cross-link";
      const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      return `<path class="route-back ${className}" d="${d}"></path><path class="route-main ${className}" d="${d}"></path>`;
    }).join("");
    const nodes = GLOBAL_MAP_NODES.map(node=>{
      const active = node.name.toUpperCase() === currentName;
      const isNexus = node.firm === "nexus";
      return `<g class="galaxy-node ${node.firm} ${active ? "active" : ""} ${node.firm === "nexus" ? "central" : ""}" transform="translate(${node.x} ${node.y})">
        ${isNexus
          ? `<circle class="node-halo" r="8.5"></circle><rect class="node-ring" x="-5.2" y="-5.2" width="10.4" height="10.4"></rect><rect class="node-core" x="-1.9" y="-1.9" width="3.8" height="3.8"></rect>`
          : `<rect class="node-halo" x="-5.4" y="-4.2" width="10.8" height="8.4"></rect><rect class="node-ring" x="-3.5" y="-2.8" width="7" height="5.6"></rect><rect class="node-core" x="-1.35" y="-1.05" width="2.7" height="2.1"></rect>`}
        <text x="0" y="${node.firm === "nexus" ? -8.2 : -5.0}">${escapeHtml(node.name)}</text>
      </g>`;
    }).join("");
    const legend = Object.entries(GLOBAL_FIRMS).map(([id, firm])=>`<span class="${id}"><i></i>${escapeHtml(firm.short)}</span>`).join("");
    return `<div class="combat-galaxy-map">
      <div class="combat-galaxy-legend">${legend}</div>
      <svg viewBox="0 0 100 72" role="img" aria-label="Carte globale des firmes">
        <defs>
          <radialGradient id="galaxyNexusGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(245,222,196,.44)"></stop>
            <stop offset="100%" stop-color="rgba(245,222,196,0)"></stop>
          </radialGradient>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation=".9" result="blur"></feGaussianBlur>
            <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
          </filter>
        </defs>
        <g class="sector-layer">
          <polygon class="sector solaris" points="5,4 45,4 45,33 20,33 5,22"></polygon>
          <polygon class="sector virdis" points="55,4 95,4 95,22 80,33 55,33"></polygon>
          <polygon class="sector astra" points="5,42 20,68 45,68 45,40 20,40"></polygon>
          <polygon class="sector cyan" points="55,40 80,40 95,50 95,68 55,68"></polygon>
        </g>
        <circle class="nexus-field" cx="50" cy="36" r="13"></circle>
        <circle class="nexus-ring one" cx="50" cy="36" r="7.2"></circle>
        <circle class="nexus-ring two" cx="50" cy="36" r="10.2"></circle>
        <g class="route-layer">${links}</g>
        <g class="node-layer">${nodes}</g>
      </svg>
    </div>`;
  }

  function getMapPortals(map){
    if(!map) return [];
    if(Array.isArray(map.portals)) return map.portals;
    return map.portal ? [map.portal] : [];
  }

  function renderMapUtilityContent(){
    const current = getCurrentMap?.() || maps[0] || {};
    const player = getPlayer?.();
    const spawn = current.spawn || {x:0, y:0};
    const portals = getMapPortals(current);
    const portalLabel = portals.length
      ? portals.map(portal=>maps.find(map=>map.id === portal.targetMap)?.name || portal.label || "Actif").join(" / ")
      : "Aucun";
    const playerPoint = player ? {x:player.x, y:player.y} : spawn;
    return `<div class="combat-map-card">
      <div class="combat-map-head">
        <div><span>Carte globale</span><strong>${escapeHtml(current.name || "Carte")}</strong></div>
        <small>Réseau des firmes · accès Nexus</small>
      </div>
      ${renderGlobalMap(current)}
      <div class="combat-map-meta">
        <span>Position <b>${escapeHtml(current.name || "Inconnue")}</b></span>
        <span>Coord. locale <b>${Math.round(playerPoint.x || 0)} / ${Math.round(playerPoint.y || 0)}</b></span>
        <span>Portail <b>${escapeHtml(portalLabel)}</b></span>
      </div>
      <div class="combat-map-note">Les routes ivoire sont des corridors neutres entre firmes. Les routes internes restent discrètes et teintées par faction.</div>
    </div>`;
  }

  function renderSettingsUtilityContent(){
    const quality = getGraphicsQuality?.() || store.state.graphicsQuality || "high";
    return `<div class="combat-settings-card">
      <div class="combat-map-head">
        <div><span>Rendu</span><strong>Qualite graphique</strong></div>
        <small>Applique en direct</small>
      </div>
      <div class="quality-option-grid combat-quality-grid">
        ${graphicsQualityPresets.map(preset=>`
          <button class="quality-option ${quality === preset.id ? "active" : ""}" data-set-graphics-quality="${preset.id}" type="button">
            <strong>${escapeHtml(preset.name)}</strong>
            <span>${escapeHtml(preset.desc)}</span>
          </button>
        `).join("")}
      </div>
      <p class="group-panel-note">Moyenne retire les nuages proches et garde les asteroides. Basse garde surtout la planete et les etoiles.</p>
    </div>`;
  }

  function refreshMapUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("map");
    const content = getUtilityContent("map");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("map", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderMapUtilityContent();
    utilityPanelRefreshT = .25;
    syncUtilityDockButtons();
  }

  function refreshSettingsUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("settings");
    const content = getUtilityContent("settings");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("settings", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderSettingsUtilityContent();
    syncUtilityDockButtons();
  }

  function openUtilityPanel(mode){
    if(!["group", "quests", "map", "settings"].includes(mode)) return;
    const panel = getUtilityPanel(mode);
    const content = getUtilityContent(mode);
    if(!panel || !content) return;
    if(!panel.classList.contains("hidden")){
      panel.classList.add("hidden");
      syncUtilityDockButtons();
      return;
    }
    if(mode === "quests"){
      refreshQuestUtilityPanel({show:true});
      return;
    }
    if(mode === "map"){
      refreshMapUtilityPanel({show:true});
      return;
    }
    if(mode === "settings"){
      refreshSettingsUtilityPanel({show:true});
      return;
    }
    refreshGroupUtilityPanel({show:true, focus:true});
  }

  function trackCombatQuest(questId){
    if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.includes(questId)){
      return showToast("Cette quete n'est pas en cours.");
    }
    store.state.activeQuestId = questId;
    selectedQuestId = questId;
    saveState();
    refreshQuestUtilityPanel({show:true});
  }

  function setCombatQuestDetailTab(tab){
    combatQuestDetailTab = ["quest", "rewards", "description"].includes(tab) ? tab : "quest";
    refreshQuestUtilityPanel({show:true});
  }

  function claimCombatQuest(questId){
    const result = claimQuest(questId);
    if(!result.ok) return showToast(result.reason);
    saveState();
    showToast(`Recompense recue : ${result.quest.title}`);
    updateHud();
    if(spawnPanelMode) renderSpawnInteractionPanel(spawnPanelMode);
    refreshQuestUtilityPanel({show:true});
  }

  function inviteGroupMember(name){
    const cleaned = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
    if(!cleaned) return showToast("Nom de pilote requis.");
    if(groupMembers.some(member=>member.toLowerCase() === cleaned.toLowerCase())){
      return showToast(`${cleaned} est deja dans la liste.`);
    }
    groupMembers.push(cleaned);
    showToast(`Invitation de groupe envoyee a ${cleaned}.`);
    refreshGroupUtilityPanel({show:true, focus:true});
  }

  function renderSpawnInteractionPanel(mode = spawnPanelMode){
    const panel = document.getElementById("spawnInteractionPanel");
    const title = document.getElementById("spawnPanelTitle");
    const content = document.getElementById("spawnPanelContent");
    if(!panel || !title || !content){
      spawnPanelMode = null;
      return;
    }
    spawnPanelMode = mode;
    spawnPanelRefreshT = 1;
    panel.classList.toggle("refinery-mode", mode === "refinery");
    if(!mode){
      panel.classList.add("hidden");
      syncUtilityDockButtons();
      return;
    }
    panel.classList.remove("hidden");
    applySpawnPanelLayout(panel);
    syncUtilityDockButtons();
    const inventoryUpgradeables = [...new Set((store.state.inventoryItems || []).map(entry=>entry.itemId))]
      .map(id=>getItem(id))
      .filter(item=>item && ["canon","generateur"].includes(item.category));
    const bestBy = (items, score)=>items.slice().sort((a,b)=>score(b)-score(a))[0] || null;
    const laserUpgrade = bestBy(inventoryUpgradeables.filter(item=>item.category === "canon"), item=>Number(item.weapon?.maxDamage || item.weapon?.damage || 0));
    const rocketUpgrade = bestBy(ammoTypes.filter(ammo=>ammo.weaponClass === "rocket"), ammo=>Number(ammo.damageMax || 0));
    const speedUpgrade = bestBy(inventoryUpgradeables.filter(item=>item.category === "generateur" && Number(item.stats?.vitesse || 0) > 0), item=>Number(item.stats?.vitesse || 0));
    const shieldUpgrade = bestBy(inventoryUpgradeables.filter(item=>item.category === "generateur" && (Number(item.stats?.bouclier || 0) > 0 || Number(item.stats?.regen || 0) > 0)), item=>Number(item.stats?.bouclier || 0) + Number(item.stats?.regen || 0) * 20);
    const droneUid = Array.isArray(store.state.droneLoadout) ? store.state.droneLoadout.find(Boolean) : null;
    const droneUpgrade = droneUid ? getItem(store.state.inventoryItems?.find(entry=>entry.uid === droneUid)?.itemId) : null;
    const upgradeables = [...new Map([laserUpgrade, rocketUpgrade, speedUpgrade, shieldUpgrade, droneUpgrade].filter(Boolean).map(item=>[item.id, item])).values()];
    const rendered = renderSpawnPanelContent({
      mode,
      activeQuest:getActiveQuest(),
      activeQuests:getActiveQuests(),
      selectedQuestId,
      selectedQuestCategory,
      quests:getAllQuests(),
      playerLevel:store.state.player.level,
      enemyTypes,
      rawMaterials:getAllRawMaterials(),
      getQuestProgress,
      completedQuestClaims:store.state.completedQuestClaims,
      job:getRefineryJob(),
      recipes:getRefineryRecipes(),
      materials:getAllRawMaterials(),
      getMaterialCount,
      shipCargo:getShipCargo(store.state.activeShip),
      shipCargoUsed:getShipCargoUsed(store.state.activeShip),
      shipCargoCapacity:getShipCargoCapacity(store.state.activeShip),
      refineryTab:refineryPanelTab,
      selectedShipRefineRecipeId,
      upgradeables,
      getShipRefineryRecipeData,
      getCombatBoostSummary,
      getCombatBoostTooltip,
      getEquipmentUpgradeLevel,
      getEquipmentUpgradeCost,
      isRefineryComplete,
      formatDuration
    });
    title.textContent = rendered.title;
    content.innerHTML = rendered.html;
  }

  function selectQuestForPanel(questId){
    selectedQuestId = questId;
    renderSpawnInteractionPanel("quests");
  }

  function selectQuestCategoryForPanel(category){
    selectedQuestCategory = category || "normal";
    const quests = getAllQuests().filter(quest=>(quest.category || "normal") === selectedQuestCategory);
    if(!quests.some(quest=>quest.id === selectedQuestId)) selectedQuestId = quests[0]?.id || null;
    renderSpawnInteractionPanel("quests");
  }

  function setRefineryPanelTab(tab){
    refineryPanelTab = tab === "perfectionnement" ? "perfectionnement" : "raffinage";
    selectedShipRefineRecipeId = null;
    renderSpawnInteractionPanel("refinery");
  }

  function openShipRefineRecipe(recipeId){
    selectedShipRefineRecipeId = recipeId || null;
    refineryPanelTab = "raffinage";
    renderSpawnInteractionPanel("refinery");
  }

  function closeShipRefineRecipe(){
    selectedShipRefineRecipeId = null;
    renderSpawnInteractionPanel("refinery");
  }

  function tick(dt){
    if(spawnPanelMode){
      const spawnPanel = document.getElementById("spawnInteractionPanel");
      spawnPanelRefreshT -= dt;
      if(spawnPanelRefreshT <= 0 && !spawnPanel.matches(":hover")){
        renderSpawnInteractionPanel(spawnPanelMode);
        spawnPanelRefreshT = 1;
      }
    }
    const utilityPanel = getUtilityPanel("quests");
    if(utilityPanel && !utilityPanel.classList.contains("hidden") && !utilityPanel.matches(":hover")){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("quests");
        if(content) content.innerHTML = renderCombatQuestTracker();
        utilityPanelRefreshT = .25;
      }
    }
    const mapPanel = getUtilityPanel("map");
    if(mapPanel && !mapPanel.classList.contains("hidden") && !mapPanel.matches(":hover")){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("map");
        if(content) content.innerHTML = renderMapUtilityContent();
        utilityPanelRefreshT = .25;
      }
    }
  }

  return {
    reset,
    tick,
    getSpawnPanelMode,
    closeSpawnPanel,
    closeUtilityPanel,
    saveUtilityPanelLayout,
    saveSpawnPanelLayout,
    renderSpawnInteractionPanel,
    openUtilityPanel,
    inviteGroupMember,
    trackCombatQuest,
    claimCombatQuest,
    setCombatQuestDetailTab,
    selectQuestForPanel,
    selectQuestCategoryForPanel,
    setRefineryPanelTab,
    openShipRefineRecipe,
    closeShipRefineRecipe
  };
}
