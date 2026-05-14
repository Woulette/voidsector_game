import { slotIndexFromEvent } from "../../core/keybinds.js";

export function installCombatInputHandlers({
  windowRef = window,
  documentRef = document,
  canvas,
  isRunning,
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
  getCurrentMap,
  getSpawnPanelMode,
  getCombatMetricModes,
  getActionSlots,
  getSlotKeybinds,
  clearSelectedEnemy,
  hasSelectedEnemy,
  tryUseMapPortal,
  selectActionSlot,
  getStationAt,
  findEnemyAt,
  findCargoBoxAt,
  setCargoDestination,
  setSelectedEnemy,
  renderSpawnInteractionPanel,
  openUtilityPanel,
  closeUtilityPanel,
  inviteGroupMember,
  trackCombatQuest,
  claimCombatQuest,
  setCombatQuestDetailTab,
  selectQuestForPanel,
  selectQuestCategoryForPanel,
  closeSpawnPanel,
  updateHud,
  moveActionSlot,
  clearActionSlot,
  assignExtraToActionSlot,
  assignAmmoToActionSlot,
  renderCombatQuickPanel,
  setCombatPanelTab,
  buyCombatAmmo,
  activateRepairBot,
  acceptQuest,
  claimQuest,
  startRefineryJob,
  claimRefineryJob,
  upgradeEquipment,
  showToast
}){
  let draggedActionSlotIndex = null;
  let actionSlotDropHandled = false;
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
    if(e.key.toLowerCase() === "j"){
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
      if(mouseMoveHeld) setMoveTarget(worldFromScreen(mouse.x, mouse.y));
    }
  });
  canvas.addEventListener("mousedown", e=>{
    if(!isRunning()) return;
    const r = canvas.getBoundingClientRect();
    const mouse = getMouse();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    const world = worldFromScreen(mouse.x, mouse.y);
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
      const currentMap = getCurrentMap();
      const station = getStationAt(world);
      if(station && Math.hypot(world.x - currentMap.spawn.x, world.y - currentMap.spawn.y) <= (currentMap.spawn.safeRadius || currentMap.spawn.r || 260)){
        renderSpawnInteractionPanel(station.id);
        return;
      }
      const cargo = findCargoBoxAt?.(world);
      if(cargo && setCargoDestination?.(cargo)){
        updateHud();
        return;
      }
      const enemy = findEnemyAt(world);
      if(enemy) setSelectedEnemy(enemy);
      mouseMoveHeld = !enemy;
      setMouseMoveHeld?.(!enemy);
      setMoveTarget(enemy ? null : world);
      if(!enemy && getSpawnPanelMode()) closeSpawnPanel();
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

  const actionBar = documentRef.getElementById("gameActionBar");
  actionBar.addEventListener("click", e=>{
    if(!isRunning()) return;
    const slot = e.target.closest("[data-action-index]");
    if(slot) selectActionSlot(Number(slot.dataset.actionIndex));
  });
  actionBar.addEventListener("dragover", e=>{
    if(e.target.closest("[data-action-index]")) e.preventDefault();
  });
  actionBar.addEventListener("dragstart", e=>{
    if(!isRunning()) return;
    const slot = e.target.closest("[data-action-index]");
    if(!slot) return;
    const index = Number(slot.dataset.actionIndex);
    if(!getActionSlots()?.[index]) return e.preventDefault();
    draggedActionSlotIndex = index;
    actionSlotDropHandled = false;
    e.dataTransfer.setData("application/x-voidsector-action-slot", String(index));
    e.dataTransfer.effectAllowed = "move";
  });
  actionBar.addEventListener("dragend", ()=>{
    if(!isRunning()) return;
    if(draggedActionSlotIndex !== null && !actionSlotDropHandled) clearActionSlot(draggedActionSlotIndex);
    draggedActionSlotIndex = null;
    actionSlotDropHandled = false;
  });
  actionBar.addEventListener("drop", e=>{
    if(!isRunning()) return;
    const slot = e.target.closest("[data-action-index]");
    if(!slot) return;
    e.preventDefault();
    const fromSlot = e.dataTransfer.getData("application/x-voidsector-action-slot");
    if(fromSlot !== ""){
      actionSlotDropHandled = true;
      moveActionSlot(Number(fromSlot), Number(slot.dataset.actionIndex));
      return;
    }
    const extraId = e.dataTransfer.getData("application/x-voidsector-extra");
    const ammoId = e.dataTransfer.getData("application/x-voidsector-ammo") || e.dataTransfer.getData("text/plain");
    if(extraId) assignExtraToActionSlot(Number(slot.dataset.actionIndex), extraId);
    else assignAmmoToActionSlot(Number(slot.dataset.actionIndex), ammoId);
  });

  documentRef.addEventListener("dragover", e=>{
    if(!isRunning()) return;
    if(e.dataTransfer.types.includes("application/x-voidsector-action-slot")) e.preventDefault();
  });
  documentRef.addEventListener("drop", e=>{
    if(!isRunning()) return;
    const fromSlot = e.dataTransfer.getData("application/x-voidsector-action-slot");
    if(fromSlot === "") return;
    if(e.target.closest("#gameActionBar [data-action-index]")) return;
    e.preventDefault();
    actionSlotDropHandled = true;
    clearActionSlot(Number(fromSlot));
  });

  documentRef.getElementById("combatQuickMenuBtn").addEventListener("click", ()=>{
    if(!isRunning()) return;
    documentRef.getElementById("combatQuickPanel").classList.toggle("hidden");
    renderCombatQuickPanel();
  });
  documentRef.getElementById("combatQuickPanel").addEventListener("click", e=>{
    const tab = e.target.closest("[data-combat-panel-tab]");
    if(tab){
      setCombatPanelTab(tab.dataset.combatPanelTab);
      renderCombatQuickPanel();
      return;
    }
    const buy = e.target.closest("[data-combat-buy-ammo]");
    if(buy){ buyCombatAmmo(buy.dataset.combatBuyAmmo); return; }
    const extraUse = e.target.closest("[data-combat-extra-use]");
    if(extraUse){ activateRepairBot(true); renderCombatQuickPanel(); updateHud(); return; }
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
    const extra = e.target.closest("[data-combat-extra-slot]");
    if(extra){
      e.dataTransfer.setData("application/x-voidsector-extra", extra.dataset.combatExtraSlot);
      e.dataTransfer.setData("text/plain", extra.dataset.combatExtraSlot);
      e.dataTransfer.effectAllowed = "copy";
      return;
    }
    const ammo = e.target.closest("[data-combat-ammo-id]");
    if(!ammo) return;
    e.dataTransfer.setData("application/x-voidsector-ammo", ammo.dataset.combatAmmoId);
    e.dataTransfer.setData("text/plain", ammo.dataset.combatAmmoId);
    e.dataTransfer.effectAllowed = "copy";
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
      if(e.key !== "Enter" || !e.target.closest("#groupInviteName")) return;
      e.preventDefault();
      inviteGroupMember?.(e.target.value || "");
    });
  });

  documentRef.getElementById("spawnPanelClose")?.addEventListener("click", closeSpawnPanel);
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("click", e=>{
    const questCategoryBtn = e.target.closest("[data-quest-category]");
    if(questCategoryBtn){
      selectQuestCategoryForPanel?.(questCategoryBtn.dataset.questCategory);
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
      renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const claimBtn = e.target.closest("[data-claim-quest]");
    if(claimBtn){
      const result = claimQuest(claimBtn.dataset.claimQuest);
      if(!result.ok) showToast(result.reason);
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
    const upgradeBtn = e.target.closest("[data-upgrade-item]");
    if(upgradeBtn){
      const result = upgradeEquipment(upgradeBtn.dataset.upgradeItem);
      if(!result.ok) showToast(result.reason);
      else { saveState(); showToast(`Amélioration appliquée : ${upgradeBtn.dataset.upgradeItem} +${result.level}`); }
      renderSpawnInteractionPanel("refinery");
      updateHud();
    }
  });
}
