import { slotIndexFromEvent } from "../../core/keybinds.js";
import { installCombatActionBarInputHandlers, setCombatAssetDragImage } from "./combatActionBarInput.js";

export function installCombatInputHandlers({
  windowRef = window,
  documentRef = document,
  canvas,
  isRunning,
  isMovementLocked,
  resize,
  saveState,
  getMouse,
  setMoveTarget,
  setMouseMoveHeld,
  worldFromScreen,
  miniMapHitTest,
  worldFromMiniMap,
  setMiniMapPosition,
  resizeMiniMap,
  saveUtilityPanelLayout,
  saveSpawnPanelLayout,
  getCurrentMap,
  getSpawnPanelMode,
  getCombatMetricModes,
  getActionSlots,
  getSlotKeybinds,
  clearSelectedEnemy,
  hasSelectedEnemy,
  tryUseMapPortal,
  attackSelectedWithActiveLaser,
  selectActionSlot,
  getStationAt,
  progressMissionControl,
  findQuestNpcAt,
  interactQuestNpc,
  findEnemyAt,
  findPortalObjectiveAt,
  interactPortalObjective,
  findRemotePlayerAt,
  findCargoBoxAt,
  setCargoDestination,
  findGroundMaterialAt,
  setGroundMaterialDestination,
  setSelectedEnemy,
  renderSpawnInteractionPanel,
  openUtilityPanel,
  selectPortgunMapTarget,
  closeUtilityPanel,
  inviteGroupMember,
  handleSocialAction,
  handleGroupAction,
  togglePerfPanelVisibility,
  selectSocialTab,
  selectSocialContact,
  selectFirmPanelTab,
  fillSocialPlayerName,
  trackCombatQuest,
  claimCombatQuest,
  setCombatQuestDetailTab,
  selectQuestForPanel,
  markQuestAcceptedForPanel,
  selectQuestCategoryForPanel,
  selectQuestTypeForPanel,
  toggleLockedQuestsForPanel,
  setRefineryPanelTab,
  openShipRefineRecipe,
  closeShipRefineRecipe,
  closeSpawnPanel,
  updateHud,
  moveActionSlot,
  clearActionSlot,
  assignExtraToActionSlot,
  assignDroneFormationToActionSlot,
  assignAmmoToActionSlot,
  selectMissileAmmo,
  fireMissileLauncher,
  assignMissileLauncherToActionSlot,
  renderCombatQuickPanel,
  useCombatExtra,
  setCombatPanelTab,
  shiftCombatPanelTabs,
  buyCombatAmmo,
  activateRepairBot,
  useRickySupportSkill,
  acceptQuest,
  claimQuest,
  startRefineryJob,
  claimRefineryJob,
  refineShipCargoRecipe,
  depositCombatBoostMaterial,
  upgradeEquipment,
  showToast
}){
  let mouseMoveHeld = false;
  let miniMapDrag = null;

  windowRef.addEventListener("resize", ()=>{ if(isRunning()) resize(); });
  windowRef.addEventListener("beforeunload", ()=>{ try{ saveState(); }catch(e){} });
  windowRef.addEventListener("keydown", e=>{
    if(!isRunning()) return;
    if(e.key === "Escape" && hasSelectedEnemy()){
      e.preventDefault();
      clearSelectedEnemy();
      return;
    }
    if(String(e.key || "").toLowerCase() === "j"){
      if(isMovementLocked?.()){
        e.preventDefault();
        return;
      }
      if(tryUseMapPortal()) e.preventDefault();
      return;
    }
    const slotIndex = slotIndexFromEvent(e, getSlotKeybinds());
    if(slotIndex >= 0){
      e.preventDefault();
      selectActionSlot(slotIndex);
    }
  });
  windowRef.addEventListener("keyup", ()=>{});

  canvas.addEventListener("contextmenu", e=>e.preventDefault());
  canvas.addEventListener("mousemove", e=>{
    const r = canvas.getBoundingClientRect();
    const mouse = getMouse();
    if(mouse){
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      if(miniMapDrag){
        miniMapDrag.lastX = mouse.x;
        miniMapDrag.lastY = mouse.y;
        setMiniMapPosition?.(mouse.x - miniMapDrag.offsetX, mouse.y - miniMapDrag.offsetY, false);
        return;
      }
      if(mouseMoveHeld && !isMovementLocked?.()) setMoveTarget(worldFromScreen(mouse.x, mouse.y));
    }
  });
  canvas.addEventListener("mousedown", e=>{
    if(!isRunning()) return;
    const r = canvas.getBoundingClientRect();
    const mouse = getMouse();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    const world = worldFromScreen(mouse.x, mouse.y);
    if(e.button === 0 && isMovementLocked?.()){
      e.preventDefault();
      mouseMoveHeld = false;
      setMouseMoveHeld?.(false);
      return;
    }
    if(e.button === 0){
      const miniMapHit = miniMapHitTest?.(mouse.x, mouse.y);
      if(miniMapHit && miniMapHit.type !== "none"){
        e.preventDefault();
        if(miniMapHit.type === "resize"){
          resizeMiniMap?.(miniMapHit.delta);
          return;
        }
        if(miniMapHit.type === "drag"){
          miniMapDrag = {offsetX:miniMapHit.offsetX, offsetY:miniMapHit.offsetY, lastX:mouse.x, lastY:mouse.y};
          return;
        }
        if(miniMapHit.type === "map"){
          setMoveTarget(worldFromMiniMap(mouse.x, mouse.y));
          setMouseMoveHeld?.(false);
          updateHud();
          return;
        }
      }
      const station = getStationAt(world);
      if(station){
        const progressed = progressMissionControl?.(station);
        renderSpawnInteractionPanel(station.id);
        if(progressed) updateHud();
        return;
      }
      const questNpc = findQuestNpcAt?.(world);
      if(questNpc){
        interactQuestNpc?.(questNpc);
        return;
      }
      const cargo = findCargoBoxAt?.(world);
      if(cargo && setCargoDestination?.(cargo)){
        updateHud();
        return;
      }
      const groundMaterial = findGroundMaterialAt?.(world);
      if(groundMaterial && setGroundMaterialDestination?.(groundMaterial)){
        updateHud();
        return;
      }
      const portalObjective = findPortalObjectiveAt?.(world);
      if(portalObjective && interactPortalObjective?.(portalObjective)){
        mouseMoveHeld = false;
        setMouseMoveHeld?.(false);
        updateHud();
        return;
      }
      const enemy = findEnemyAt(world);
      if(enemy){
        setSelectedEnemy(enemy);
        if(e.detail >= 2) attackSelectedWithActiveLaser?.();
        mouseMoveHeld = false;
        setMouseMoveHeld?.(false);
      }else{
        const remotePlayer = findRemotePlayerAt?.(world);
        if(remotePlayer){
          fillSocialPlayerName?.(remotePlayer.name);
          setSelectedEnemy(remotePlayer);
          if(e.detail >= 2) attackSelectedWithActiveLaser?.();
          mouseMoveHeld = false;
          setMouseMoveHeld?.(false);
          updateHud();
          return;
        }
        mouseMoveHeld = true;
        setMouseMoveHeld?.(true);
        setMoveTarget(world);
        if(getSpawnPanelMode()) closeSpawnPanel();
      }
      updateHud();
    }
  });
  windowRef.addEventListener("mouseup", e=>{
    if(!isRunning() || e.button !== 0) return;
    if(miniMapDrag){
      setMiniMapPosition?.(miniMapDrag.lastX - miniMapDrag.offsetX, miniMapDrag.lastY - miniMapDrag.offsetY, true);
    }
    miniMapDrag = null;
    mouseMoveHeld = false;
    setMouseMoveHeld?.(false);
  });

  documentRef.getElementById("gameTargetPanel").addEventListener("click", e=>{
    if(!e.target.closest("[data-target-close]")) return;
    e.preventDefault();
    e.stopPropagation();
    clearSelectedEnemy();
  });

  documentRef.querySelector(".combat-status").addEventListener("click", e=>{
    const meter = e.target.closest("[data-combat-meter]");
    if(!meter) return;
    const modes = getCombatMetricModes();
    const metric = meter.dataset.combatMeter;
    if(!Object.prototype.hasOwnProperty.call(modes, metric)) return;
    modes[metric] = modes[metric] === "text" ? "bar" : "text";
    updateHud();
  });

  installCombatActionBarInputHandlers({
    windowRef,
    documentRef,
    actionBar:documentRef.getElementById("gameActionBar"),
    isRunning,
    getActionSlots,
    selectActionSlot,
    moveActionSlot,
    clearActionSlot,
    assignExtraToActionSlot,
    assignDroneFormationToActionSlot,
    assignAmmoToActionSlot,
    assignMissileLauncherToActionSlot
  });

  documentRef.getElementById("combatQuickMenuBtn").addEventListener("click", ()=>{
    if(!isRunning()) return;
    documentRef.getElementById("combatQuickPanel").classList.toggle("hidden");
    renderCombatQuickPanel();
  });
  documentRef.getElementById("rickySupportSkill")?.addEventListener("click", ()=>{
    if(!isRunning()) return;
    useRickySupportSkill?.();
  });
  documentRef.getElementById("combatQuickPanel").addEventListener("click", e=>{
    const tabShift = e.target.closest("[data-combat-tab-shift]");
    if(tabShift){
      shiftCombatPanelTabs(Number(tabShift.dataset.combatTabShift || 0));
      renderCombatQuickPanel();
      return;
    }
    const tab = e.target.closest("[data-combat-panel-tab]");
    if(tab){
      setCombatPanelTab(tab.dataset.combatPanelTab);
      renderCombatQuickPanel();
      return;
    }
    const buy = e.target.closest("[data-combat-buy-ammo]");
    if(buy){
      buyCombatAmmo(buy.dataset.combatBuyAmmo, Number(buy.dataset.combatBuyMultiplier || 1));
      return;
    }
    const extraUse = e.target.closest("[data-combat-extra-use]");
    if(extraUse){ useCombatExtra?.(extraUse.dataset.combatExtraUse); renderCombatQuickPanel(); updateHud(); return; }
    const extraSlot = e.target.closest("[data-combat-extra-slot]");
    if(extraSlot){
      const first = getActionSlots().findIndex(id=>!id);
      assignExtraToActionSlot(first >= 0 ? first : 0, extraSlot.dataset.combatExtraSlot);
      return;
    }
    const ammo = e.target.closest("[data-combat-ammo-id]");
    if(ammo){
      const first = getActionSlots().findIndex(id=>!id);
      assignAmmoToActionSlot(first >= 0 ? first : 0, ammo.dataset.combatAmmoId);
    }
  });
  documentRef.getElementById("combatQuickPanel").addEventListener("dragstart", e=>{
    const missileCpu = e.target.closest("[data-combat-missile-cpu]");
    if(missileCpu){
      e.dataTransfer.setData("application/x-voidsector-missile-cpu", "1");
      e.dataTransfer.setData("text/plain", "launcher_missile_mk1");
      e.dataTransfer.effectAllowed = "copy";
      setCombatAssetDragImage({event:e, source:missileCpu, documentRef, windowRef});
      return;
    }
    const extra = e.target.closest("[data-combat-extra-slot]");
    if(extra){
      e.dataTransfer.setData("application/x-voidsector-extra", extra.dataset.combatExtraSlot);
      e.dataTransfer.setData("text/plain", extra.dataset.combatExtraSlot);
      e.dataTransfer.effectAllowed = "copy";
      setCombatAssetDragImage({event:e, source:extra, documentRef, windowRef});
      return;
    }
    const formation = e.target.closest("[data-combat-drone-formation]");
    if(formation){
      e.dataTransfer.setData("application/x-voidsector-drone-formation", formation.dataset.combatDroneFormation);
      e.dataTransfer.setData("text/plain", formation.dataset.combatDroneFormation);
      e.dataTransfer.effectAllowed = "copy";
      setCombatAssetDragImage({event:e, source:formation, documentRef, windowRef});
      return;
    }
    const ammo = e.target.closest("[data-combat-ammo-id]");
    if(!ammo) return;
    e.dataTransfer.setData("application/x-voidsector-ammo", ammo.dataset.combatAmmoId);
    e.dataTransfer.setData("text/plain", ammo.dataset.combatAmmoId);
    e.dataTransfer.effectAllowed = "copy";
    setCombatAssetDragImage({event:e, source:ammo, documentRef, windowRef});
  });

  documentRef.getElementById("combatUtilityDock")?.addEventListener("click", e=>{
    if(!isRunning()) return;
    const btn = e.target.closest("[data-utility-panel]");
    if(!btn || btn.disabled) return;
    const panel = btn.dataset.utilityPanel;
    if(panel === "refinery"){
      if(getSpawnPanelMode?.() === "refinery"){
        closeSpawnPanel?.();
        return;
      }
      renderSpawnInteractionPanel("refinery");
      return;
    }
    if(panel === "quests"){
      openUtilityPanel?.("quests");
      return;
    }
    openUtilityPanel?.(panel);
  });
  documentRef.querySelectorAll(".combat-utility-panel").forEach(utilityPanel=>{
    const mode = utilityPanel.dataset.utilityMode || "";
    const utilityPanelHead = utilityPanel.querySelector(".combat-utility-panel-head");
    utilityPanelHead?.addEventListener("pointerdown", e=>{
      if(!isRunning() || e.target.closest("button")) return;
      e.preventDefault();
      const rect = utilityPanel.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      utilityPanel.setPointerCapture?.(e.pointerId);
      utilityPanel.style.left = `${rect.left}px`;
      utilityPanel.style.top = `${rect.top}px`;
      utilityPanel.style.right = "auto";
      utilityPanel.style.bottom = "auto";

      const movePanel = moveEvent=>{
        const panelRect = utilityPanel.getBoundingClientRect();
        const maxLeft = Math.max(0, windowRef.innerWidth - panelRect.width);
        const maxTop = Math.max(0, windowRef.innerHeight - panelRect.height);
        const left = Math.max(0, Math.min(maxLeft, moveEvent.clientX - offsetX));
        const top = Math.max(0, Math.min(maxTop, moveEvent.clientY - offsetY));
        utilityPanel.style.left = `${left}px`;
        utilityPanel.style.top = `${top}px`;
      };
      const stopDrag = upEvent=>{
        utilityPanel.releasePointerCapture?.(upEvent.pointerId);
        const finalRect = utilityPanel.getBoundingClientRect();
        saveUtilityPanelLayout?.(mode, {left:finalRect.left, top:finalRect.top});
        windowRef.removeEventListener("pointermove", movePanel);
        windowRef.removeEventListener("pointerup", stopDrag);
        windowRef.removeEventListener("pointercancel", stopDrag);
      };
      windowRef.addEventListener("pointermove", movePanel);
      windowRef.addEventListener("pointerup", stopDrag);
      windowRef.addEventListener("pointercancel", stopDrag);
    });
    utilityPanel.addEventListener("click", e=>{
      const socialTab = e.target.closest("[data-social-tab]");
      if(socialTab){
        selectSocialTab?.(socialTab.dataset.socialTab);
        return;
      }
      const firmPanelTab = e.target.closest("[data-firm-panel-tab]");
      if(firmPanelTab){
        selectFirmPanelTab?.(firmPanelTab.dataset.firmPanelTab);
        return;
      }
      const socialSelect = e.target.closest("[data-social-select]");
      if(socialSelect){
        selectSocialContact?.(socialSelect.dataset.socialSelect, utilityPanel.dataset.utilityMode || "friends");
        return;
      }
      const socialAction = e.target.closest("[data-social-action]");
      if(socialAction){
        handleSocialAction?.(socialAction.dataset.socialAction, socialAction);
        return;
      }
      const groupAction = e.target.closest("[data-group-action]");
      if(groupAction){
        handleGroupAction?.(groupAction.dataset.groupAction, groupAction.dataset.playerId);
        return;
      }
      const perfToggle = e.target.closest("[data-toggle-perf-panel]");
      if(perfToggle){
        togglePerfPanelVisibility?.();
        return;
      }
      const portgunTarget = e.target.closest("[data-portgun-target-map]");
      if(portgunTarget){
        selectPortgunMapTarget?.(portgunTarget.dataset.portgunTargetMap);
        return;
      }
      const questTabBtn = e.target.closest("[data-combat-quest-tab]");
      if(questTabBtn){
        setCombatQuestDetailTab?.(questTabBtn.dataset.combatQuestTab);
        return;
      }
      const trackQuestBtn = e.target.closest("[data-track-combat-quest]");
      if(trackQuestBtn){
        trackCombatQuest?.(trackQuestBtn.dataset.trackCombatQuest);
        return;
      }
      const claimQuestBtn = e.target.closest("[data-claim-combat-quest]");
      if(claimQuestBtn){
        claimCombatQuest?.(claimQuestBtn.dataset.claimCombatQuest);
        return;
      }
      const inviteBtn = e.target.closest("[data-group-invite]");
      if(!inviteBtn) return;
      const input = documentRef.getElementById("groupInviteName");
      inviteGroupMember?.(input?.value || "");
    });
    utilityPanel.addEventListener("keydown", e=>{
      if(e.key === "Enter" && e.target.closest("#socialAddName")){
        e.preventDefault();
        handleSocialAction?.("add-friend", e.target);
        return;
      }
      if(e.key !== "Enter" || !e.target.closest("#groupInviteName")) return;
      e.preventDefault();
      inviteGroupMember?.(e.target.value || "");
    });
  });

  documentRef.getElementById("spawnPanelClose")?.addEventListener("click", closeSpawnPanel);
  documentRef.querySelector("#spawnInteractionPanel .spawn-panel-header")?.addEventListener("pointerdown", e=>{
    if(!isRunning() || e.target.closest("button")) return;
    const panel = documentRef.getElementById("spawnInteractionPanel");
    if(!panel || panel.classList.contains("hidden")) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    panel.setPointerCapture?.(e.pointerId);
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";

    const movePanel = moveEvent=>{
      const panelRect = panel.getBoundingClientRect();
      const maxLeft = Math.max(0, windowRef.innerWidth - panelRect.width);
      const maxTop = Math.max(0, windowRef.innerHeight - panelRect.height);
      const left = Math.max(0, Math.min(maxLeft, moveEvent.clientX - offsetX));
      const top = Math.max(0, Math.min(maxTop, moveEvent.clientY - offsetY));
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
    };
    const stopDrag = upEvent=>{
      panel.releasePointerCapture?.(upEvent.pointerId);
      const finalRect = panel.getBoundingClientRect();
      saveSpawnPanelLayout?.({left:finalRect.left, top:finalRect.top});
      windowRef.removeEventListener("pointermove", movePanel);
      windowRef.removeEventListener("pointerup", stopDrag);
      windowRef.removeEventListener("pointercancel", stopDrag);
    };
    windowRef.addEventListener("pointermove", movePanel);
    windowRef.addEventListener("pointerup", stopDrag);
    windowRef.addEventListener("pointercancel", stopDrag);
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("click", e=>{
    const refineryTabBtn = e.target.closest("[data-spawn-refinery-tab]");
    if(refineryTabBtn){
      setRefineryPanelTab?.(refineryTabBtn.dataset.spawnRefineryTab);
      return;
    }
    const openShipRefineBtn = e.target.closest("[data-open-ship-refine]");
    if(openShipRefineBtn){
      openShipRefineRecipe?.(openShipRefineBtn.dataset.openShipRefine);
      return;
    }
    const closeShipRefineBtn = e.target.closest("[data-close-ship-refine]");
    if(closeShipRefineBtn){
      closeShipRefineRecipe?.();
      return;
    }
    const confirmShipRefineBtn = e.target.closest("[data-confirm-ship-refine]");
    if(confirmShipRefineBtn){
      const input = documentRef.querySelector("[data-ship-refine-amount]");
      const amount = Math.max(1, Math.floor(Number(input?.value || 1)));
      const result = refineShipCargoRecipe(confirmShipRefineBtn.dataset.confirmShipRefine, amount);
      if(!result.ok) showToast(result.reason);
      else if(result.serverPending){ showToast("Fusion envoyee au serveur."); closeShipRefineRecipe?.(); }
      else { saveState(); showToast(`Fusion : +${result.outputAmount} ${result.output?.name || result.recipe.outputId}.`); closeShipRefineRecipe?.(); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
      return;
    }
    const questCategoryBtn = e.target.closest("[data-quest-category]");
    if(questCategoryBtn){
      selectQuestCategoryForPanel?.(questCategoryBtn.dataset.questCategory);
      return;
    }
    const questTypeBtn = e.target.closest("[data-quest-type]");
    if(questTypeBtn){
      selectQuestTypeForPanel?.(questTypeBtn.dataset.questType);
      return;
    }
    const lockedQuestBtn = e.target.closest("[data-toggle-locked-quests]");
    if(lockedQuestBtn){
      toggleLockedQuestsForPanel?.();
      return;
    }
    const viewQuestBtn = e.target.closest("[data-view-quest]");
    if(viewQuestBtn){
      selectQuestForPanel?.(viewQuestBtn.dataset.viewQuest);
      return;
    }
    const acceptBtn = e.target.closest("[data-accept-quest]");
    if(acceptBtn){
      const result = acceptQuest(acceptBtn.dataset.acceptQuest);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Quête acceptée : ${result.quest.title}`); }
      if(result.ok) markQuestAcceptedForPanel?.(acceptBtn.dataset.acceptQuest);
      else renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const claimBtn = e.target.closest("[data-claim-quest]");
    if(claimBtn){
      const result = claimQuest(claimBtn.dataset.claimQuest);
      const claimIsServerPending = Boolean(result.serverPending);
      if(!result.ok) showToast(result.reason);
      else if(claimIsServerPending) showToast(`Reclamation envoyee : ${result.quest.title}`);
      else { saveState(); showToast(`Récompense reçue : ${result.quest.title}`); }
      renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const startRefBtn = e.target.closest("[data-start-refinery]");
    if(startRefBtn){
      const result = startRefineryJob(startRefBtn.dataset.startRefinery);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Raffinage lancé : ${result.recipe.name}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
      return;
    }
    const claimRefBtn = e.target.closest("[data-claim-refinery]");
    if(claimRefBtn){
      const result = claimRefineryJob();
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Raffinage terminé : +${result.recipe.outputAmount} ${result.recipe.outputId.toUpperCase()}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
      return;
    }
    const upgradeBtn = e.target.closest("[data-upgrade-ship-item], [data-upgrade-item]");
    if(upgradeBtn){
      const itemId = upgradeBtn.dataset.upgradeShipItem || upgradeBtn.dataset.upgradeItem;
      const result = upgradeEquipment(itemId, upgradeBtn.dataset.upgradeShipItem ? {materialSource:"shipCargo"} : {});
      if(!result.ok) showToast(result.reason);
      else if(result.serverPending) showToast(`Amelioration envoyee au serveur : ${itemId}.`);
      else { saveState(); showToast(`Amelioration appliquee : ${itemId} +${result.level}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
    }
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("dragstart", e=>{
    const material = e.target.closest("[data-boost-material]");
    if(!material) return;
    e.dataTransfer.setData("application/x-voidsector-boost-material", material.dataset.boostMaterial);
    e.dataTransfer.setData("text/plain", material.dataset.boostMaterial);
    e.dataTransfer.effectAllowed = "copy";
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("dragover", e=>{
    const slot = e.target.closest("[data-boost-drop-target]");
    if(!slot) return;
    e.preventDefault();
    slot.classList.add("drag-over");
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("dragleave", e=>{
    const slot = e.target.closest("[data-boost-drop-target]");
    if(slot) slot.classList.remove("drag-over");
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("drop", e=>{
    const slot = e.target.closest("[data-boost-drop-target]");
    if(!slot) return;
    e.preventDefault();
    slot.classList.remove("drag-over");
    const materialId = e.dataTransfer.getData("application/x-voidsector-boost-material");
    if(!materialId) return;
    const rawAmount = windowRef.prompt(`Quantite a deposer dans ${slot.dataset.boostDropTarget} ?`, "1");
    const amount = Math.max(0, Math.floor(Number(rawAmount || 0)));
    if(amount <= 0) return;
    const result = depositCombatBoostMaterial?.(slot.dataset.boostDropTarget, materialId, amount);
    if(!result?.ok) showToast(result?.reason || "Boost impossible.");
    else if(result.serverPending) showToast("Depot de perfectionnement envoye au serveur.");
    else{
      saveState();
      showToast(`${result.materialName} charge : +${result.added} ${result.field === "charges" ? "tir(s)" : "seconde(s)"} pour ${slot.dataset.boostDropTarget}.`);
      renderSpawnInteractionPanel("refinery");
      updateHud();
    }
  });
}
