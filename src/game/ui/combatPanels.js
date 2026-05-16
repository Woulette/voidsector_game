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

export function createCombatPanels({
  store,
  saveState,
  showToast,
  updateHud,
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
  formatDuration
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
    return null;
  }

  function getUtilityContent(mode){
    if(mode === "quests") return document.getElementById("combatUtilityContentQuests");
    if(mode === "group") return document.getElementById("combatUtilityContentGroup");
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

  function openUtilityPanel(mode){
    if(!["group", "quests"].includes(mode)) return;
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
