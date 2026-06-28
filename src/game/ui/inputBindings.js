import { abilityIndexFromEvent, isEditableTarget, slotIndexFromEvent } from "../../core/keybinds.js?v=ship-abilities-1";
import { installCombatActionBarInputHandlers, setCombatAssetDragImage } from "./combatActionBarInput.js";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

export function installCombatInputHandlers({
  windowRef = window,
  documentRef = document,
  canvas,
  isRunning,
  isMovementLocked,
  isSettingsOpen = ()=>false,
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
  getAbilityKeybinds,
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
  toggleBoosterDetail,
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
  selectQuestCategoryForPanel,
  selectQuestTypeForPanel,
  toggleLockedQuestsForPanel,
  selectCraftCategory,
  selectCraftTabPage,
  selectCraftRecipe,
  setRefineryPanelTab,
  openShipRefineRecipe,
  closeShipRefineRecipe,
  sellCommerceMaterial,
  closeSpawnPanel,
  updateHud,
  moveActionSlot,
  clearActionSlot,
  assignExtraToActionSlot,
  assignDroneFormationToActionSlot,
  getDroneFormation,
  activateDroneFormation,
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
  useNpcAbility,
  useShipAbility,
  acceptQuest,
  claimQuest,
  startCraft,
  claimCraft,
  startRefineryJob,
  claimRefineryJob,
  refineShipCargoRecipe,
  depositCombatBoostMaterial,
  upgradeEquipment,
  showToast
}){
  const combatDoubleClickDelayMs = 500;
  const combatDoubleClickTolerancePx = 80;
  let mouseMoveHeld = false;
  let miniMapDrag = null;
  let lastCombatTargetClick = null;
  let pendingBoostDeposit = null;
  let pendingCommerceSale = null;
  let firmRewardTooltip = null;

  function getFirmRewardTooltip(){
    if(firmRewardTooltip?.isConnected) return firmRewardTooltip;
    if(!documentRef.body) return null;
    firmRewardTooltip = documentRef.createElement("div");
    firmRewardTooltip.className = "combat-firm-reward-tooltip";
    firmRewardTooltip.setAttribute("role", "tooltip");
    documentRef.body.appendChild(firmRewardTooltip);
    return firmRewardTooltip;
  }

  function positionFirmRewardTooltip(trigger, tooltip){
    const triggerRect = trigger.getBoundingClientRect();
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.right = "auto";
    tooltip.style.bottom = "auto";
    tooltip.classList.add("visible");
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 10;
    const margin = 8;
    let left = triggerRect.left - tooltipRect.width - gap;
    if(left < margin) left = triggerRect.right + gap;
    if(left + tooltipRect.width > windowRef.innerWidth - margin){
      left = Math.max(margin, windowRef.innerWidth - tooltipRect.width - margin);
    }
    let top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    top = Math.max(margin, Math.min(windowRef.innerHeight - tooltipRect.height - margin, top));
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function showFirmRewardTooltip(trigger){
    const source = trigger?.querySelector?.(".combat-firm-reward-tooltip-source");
    const tooltip = source ? getFirmRewardTooltip() : null;
    if(!tooltip) return;
    tooltip.innerHTML = source.innerHTML;
    positionFirmRewardTooltip(trigger, tooltip);
  }

  function hideFirmRewardTooltip(){
    if(!firmRewardTooltip) return;
    firmRewardTooltip.classList.remove("visible");
    firmRewardTooltip.innerHTML = "";
  }

  function getBoostDepositElements(){
    const layer = documentRef.getElementById("combatBoostDepositLayer");
    return {
      layer,
      amount:layer?.querySelector("[data-boost-deposit-amount]"),
      range:layer?.querySelector("[data-boost-deposit-range]")
    };
  }

  function clampBoostDepositAmount(value){
    const max = Math.max(1, Number(pendingBoostDeposit?.maxAmount || 1));
    return Math.max(1, Math.min(max, Math.floor(Number(value || 1))));
  }

  function getBoostDepositResultLabel(target, amount){
    const cleanAmount = Math.max(0, Number(amount || 0));
    if(target === "Laser") return `${cleanAmount * 10} tirs renforcés`;
    if(target === "Roquettes") return `${cleanAmount} tir${cleanAmount > 1 ? "s" : ""} renforcé${cleanAmount > 1 ? "s" : ""}`;
    const minutes = cleanAmount;
    return `${minutes} minute${minutes > 1 ? "s" : ""} de boost`;
  }

  function syncBoostDepositAmount(value){
    if(!pendingBoostDeposit) return;
    const {layer, amount, range} = getBoostDepositElements();
    const next = clampBoostDepositAmount(value);
    if(amount) amount.value = String(next);
    if(range) range.value = String(next);
    const result = layer?.querySelector("[data-boost-deposit-result]");
    if(result) result.textContent = getBoostDepositResultLabel(pendingBoostDeposit.target, next);
  }

  function closeBoostDepositDialog(){
    const {layer} = getBoostDepositElements();
    layer?.classList.add("hidden");
    layer?.setAttribute("aria-hidden", "true");
    pendingBoostDeposit = null;
  }

  function getCommerceSaleLayer(){
    return documentRef.querySelector("[data-commerce-dialog-layer]");
  }

  function closeCommerceSaleDialog(){
    const layer = getCommerceSaleLayer();
    if(layer){
      layer.hidden = true;
      layer.innerHTML = "";
    }
    pendingCommerceSale = null;
  }

  function closeSpawnPanelWithDeposit(){
    closeBoostDepositDialog();
    closeCommerceSaleDialog();
    closeSpawnPanel?.();
  }

  function clampCommerceSaleAmount(value){
    const max = Math.max(0, Number(pendingCommerceSale?.maxAmount || 0));
    return Math.max(0, Math.min(max, Math.floor(Number(value || 0))));
  }

  function commerceCreditsHtml(amount){
    const value = Math.max(0, Math.floor(Number(amount || 0))).toLocaleString("fr-FR");
    return `<span class="commerce-credit-value"><span>${value}</span><img src="assets/icons/credits.svg" alt="" aria-hidden="true"></span>`;
  }

  function syncCommerceSaleAmount(value){
    if(!pendingCommerceSale) return;
    const layer = getCommerceSaleLayer();
    const amountInput = layer?.querySelector("[data-commerce-sale-amount]");
    const amountRange = layer?.querySelector("[data-commerce-sale-range]");
    const totalNode = layer?.querySelector("[data-commerce-sale-total]");
    const confirmBtn = layer?.querySelector("[data-commerce-sale-confirm]");
    const next = clampCommerceSaleAmount(value);
    if(amountInput) amountInput.value = String(next);
    if(amountRange) amountRange.value = String(next);
    if(totalNode) totalNode.innerHTML = commerceCreditsHtml(next * pendingCommerceSale.unitPrice);
    if(confirmBtn) confirmBtn.disabled = next <= 0;
  }

  function openCommerceSaleDialog(materialId){
    const row = [...documentRef.querySelectorAll("[data-commerce-material]")]
      .find(entry=>entry.dataset.commerceMaterial === materialId);
    const layer = getCommerceSaleLayer();
    const maxAmount = Math.max(0, Math.floor(Number(row?.dataset.commerceAmount || 0)));
    const unitPrice = Math.max(0, Math.floor(Number(row?.dataset.commerceUnitPrice || 0)));
    if(!row || !layer || maxAmount <= 0 || unitPrice <= 0){
      showToast("Aucun materiau vendable.");
      return false;
    }
    pendingCommerceSale = {
      materialId,
      materialName:row.dataset.commerceName || materialId,
      maxAmount,
      unitPrice
    };
    layer.hidden = false;
    layer.innerHTML = `<aside class="commerce-sale-dialog" role="dialog" aria-modal="true">
      <h3>${escapeHtml(pendingCommerceSale.materialName)}</h3>
      <div class="commerce-sale-meta">
        <div><span>Stock</span><b>${maxAmount.toLocaleString("fr-FR")}</b></div>
        <div><span>Prix unite</span><b>${commerceCreditsHtml(unitPrice)}</b></div>
      </div>
      <div class="commerce-sale-slider">
        <div><span>Quantite</span><b><input type="number" min="0" max="${maxAmount}" step="1" value="0" data-commerce-sale-amount></b></div>
        <input type="range" min="0" max="${maxAmount}" step="1" value="0" data-commerce-sale-range>
      </div>
      <div class="commerce-sale-meta">
        <div><span>Total vente</span><b data-commerce-sale-total>${commerceCreditsHtml(0)}</b></div>
        <div><span>Maximum</span><b>${commerceCreditsHtml(maxAmount * unitPrice)}</b></div>
      </div>
      <div class="commerce-sale-presets">
        <button class="commerce-sale-preset" type="button" data-commerce-sale-preset="0">0</button>
        <button class="commerce-sale-preset" type="button" data-commerce-sale-preset="${Math.floor(maxAmount * .5)}">Moitie</button>
        <button class="commerce-sale-preset" type="button" data-commerce-sale-preset="${maxAmount}">Tout</button>
      </div>
      <div class="commerce-sale-actions">
        <button class="commerce-sale-cancel" type="button" data-commerce-dialog-close>Annuler</button>
        <button class="commerce-sale-confirm" type="button" data-commerce-sale-confirm="${materialId}" disabled>Vendre</button>
      </div>
    </aside>`;
    const input = layer.querySelector("[data-commerce-sale-amount]");
    input?.focus({preventScroll:true});
    input?.select();
    return true;
  }

  function openBoostDepositDialog({target, materialId, materialName, materialImg, maxAmount}){
    const {layer, amount, range} = getBoostDepositElements();
    const available = Math.max(0, Math.floor(Number(maxAmount || 0)));
    if(!layer || available <= 0){
      showToast("Aucun matériau disponible dans la soute.");
      return false;
    }
    pendingBoostDeposit = {target, materialId, materialName, materialImg, maxAmount:available};
    const targetNode = layer.querySelector("[data-boost-deposit-target]");
    const materialNode = layer.querySelector("[data-boost-deposit-material]");
    const imageNode = layer.querySelector("[data-boost-deposit-img]");
    const stockNode = layer.querySelector("[data-boost-deposit-stock]");
    const effectNode = layer.querySelector("[data-boost-deposit-effect]");
    if(targetNode) targetNode.textContent = target;
    if(materialNode) materialNode.textContent = materialName || materialId;
    if(imageNode){
      imageNode.src = materialImg || "assets/materials/cargo_box.svg";
      imageNode.alt = materialName || materialId;
    }
    if(stockNode) stockNode.textContent = available.toLocaleString("fr-FR");
    if(effectNode) effectNode.textContent = target === "Laser"
      ? "1 matériau = 10 tirs"
      : target === "Roquettes"
        ? "1 matériau = 1 tir"
        : "1 matériau = 1 minute";
    if(amount) amount.max = String(available);
    if(range) range.max = String(available);
    layer.classList.remove("hidden");
    layer.setAttribute("aria-hidden", "false");
    syncBoostDepositAmount(1);
    amount?.focus({preventScroll:true});
    amount?.select();
    return true;
  }

  function confirmBoostDeposit(){
    if(!pendingBoostDeposit) return;
    const {amount} = getBoostDepositElements();
    const deposit = {...pendingBoostDeposit};
    const selectedAmount = clampBoostDepositAmount(amount?.value);
    const result = depositCombatBoostMaterial?.(deposit.target, deposit.materialId, selectedAmount);
    if(!result?.ok){
      showToast(result?.reason || "Boost impossible.");
      return;
    }
    closeBoostDepositDialog();
    if(result.serverPending) showToast(`Dépôt envoyé : ${selectedAmount} ${deposit.materialName || "matériau"}.`);
    else showToast("Dépôt local refusé : validation serveur requise.");
  }

  function combatTargetKey(target){
    if(!target) return "";
    const targetId = target.isPlayerTarget ? target.playerId ?? target.id : target.serverId ?? target.id;
    if(targetId === undefined || targetId === null || targetId === "") return target;
    return `${target.isPlayerTarget ? "player" : "enemy"}:${targetId}`;
  }

  function isRepeatedCombatTargetClick(target, e){
    const key = combatTargetKey(target);
    const now = Date.now();
    const previous = lastCombatTargetClick;
    const repeated = Boolean(
      key &&
      previous?.key === key &&
      now - previous.at <= combatDoubleClickDelayMs
    );
    lastCombatTargetClick = repeated ? null : {
      key,
      target,
      at:now,
      clientX:e.clientX,
      clientY:e.clientY
    };
    return repeated;
  }

  function toleratedPreviousCombatTarget(e){
    const previous = lastCombatTargetClick;
    if(!previous) return null;
    const recent = Date.now() - previous.at <= combatDoubleClickDelayMs;
    const close = Math.hypot(e.clientX - previous.clientX, e.clientY - previous.clientY) <= combatDoubleClickTolerancePx;
    if(!recent || !close) return null;
    lastCombatTargetClick = null;
    return previous.target;
  }

  windowRef.addEventListener("resize", ()=>{ if(isRunning()) resize(); });
  windowRef.addEventListener("beforeunload", ()=>{ try{ saveState(); }catch(e){} });
  windowRef.addEventListener("keydown", e=>{
    if(!isRunning()) return;
    if(isSettingsOpen() || isEditableTarget(e.target)) return;
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
    const abilityIndex = abilityIndexFromEvent(e, getAbilityKeybinds?.(), getSlotKeybinds());
    if(abilityIndex >= 0){
      e.preventDefault();
      useShipAbility?.(abilityIndex);
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
        if(isRepeatedCombatTargetClick(enemy, e)) attackSelectedWithActiveLaser?.();
        mouseMoveHeld = false;
        setMouseMoveHeld?.(false);
      }else{
        const remotePlayer = findRemotePlayerAt?.(world);
        if(remotePlayer){
          fillSocialPlayerName?.(remotePlayer.name);
          setSelectedEnemy(remotePlayer);
          if(isRepeatedCombatTargetClick(remotePlayer, e)) attackSelectedWithActiveLaser?.();
          mouseMoveHeld = false;
          setMouseMoveHeld?.(false);
          updateHud();
          return;
        }
        const toleratedTarget = toleratedPreviousCombatTarget(e);
        if(toleratedTarget){
          setSelectedEnemy(toleratedTarget);
          attackSelectedWithActiveLaser?.();
          mouseMoveHeld = false;
          setMouseMoveHeld?.(false);
          updateHud();
          return;
        }
        lastCombatTargetClick = null;
        mouseMoveHeld = true;
        setMouseMoveHeld?.(true);
        setMoveTarget(world);
        if(getSpawnPanelMode()) closeSpawnPanelWithDeposit();
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
  documentRef.getElementById("npcAbilityBar")?.addEventListener("click", event=>{
    if(!isRunning()) return;
    const slot = event.target.closest("[data-npc-ability-index]");
    if(slot) useNpcAbility?.(Number(slot.dataset.npcAbilityIndex || 0));
  });
  documentRef.getElementById("shipAbilityBar")?.addEventListener("click", event=>{
    if(!isRunning()) return;
    const slot = event.target.closest("[data-ship-ability-index]");
    if(slot) useShipAbility?.(Number(slot.dataset.shipAbilityIndex || 0));
  });
  documentRef.getElementById("combatQuickPanel").addEventListener("click", e=>{
    if(e.target.closest("[data-use-ship-ability]")){
      useShipAbility?.(Number(e.target.closest("[data-use-ship-ability]").dataset.useShipAbility || 0));
      renderCombatQuickPanel();
      return;
    }
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
    const formationUse = e.target.closest("[data-combat-formation-use]");
    if(formationUse){
      const formation = getDroneFormation?.(formationUse.dataset.combatFormationUse);
      if(formation) activateDroneFormation?.(formation);
      renderCombatQuickPanel();
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
    const toggle = e.target.closest("[data-utility-dock-toggle]");
    if(toggle){
      const dock = toggle.closest("#combatUtilityDock");
      const expanded = !dock?.classList.contains("expanded");
      dock?.classList.toggle("expanded", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", expanded ? "Masquer les modules suivants" : "Afficher les modules suivants");
      toggle.setAttribute("title", expanded ? "Masquer les modules suivants" : "Afficher les modules suivants");
      return;
    }
    const btn = e.target.closest("[data-utility-panel]");
    if(!btn || btn.disabled) return;
    const panel = btn.dataset.utilityPanel;
    if(panel === "refinery" || panel === "crafting"){
      if(getSpawnPanelMode?.() === panel){
        closeSpawnPanelWithDeposit();
        return;
      }
      renderSpawnInteractionPanel(panel);
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
      utilityPanel.style.transform = "none";

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
    utilityPanel.addEventListener("pointerover", e=>{
      const gift = e.target.closest("[data-firm-reward-gift]");
      if(gift && utilityPanel.contains(gift)) showFirmRewardTooltip(gift);
    });
    utilityPanel.addEventListener("pointerout", e=>{
      const gift = e.target.closest("[data-firm-reward-gift]");
      if(!gift) return;
      const next = e.relatedTarget;
      if(next && gift.contains(next)) return;
      hideFirmRewardTooltip();
    });
    utilityPanel.addEventListener("focusin", e=>{
      const gift = e.target.closest("[data-firm-reward-gift]");
      if(gift) showFirmRewardTooltip(gift);
    });
    utilityPanel.addEventListener("focusout", e=>{
      if(e.target.closest("[data-firm-reward-gift]")) hideFirmRewardTooltip();
    });
    utilityPanel.addEventListener("scroll", hideFirmRewardTooltip, true);
    utilityPanel.addEventListener("click", e=>{
      const boosterDetail = e.target.closest("[data-toggle-booster-detail]");
      if(boosterDetail){
        toggleBoosterDetail?.(boosterDetail.dataset.toggleBoosterDetail);
        return;
      }
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

  documentRef.getElementById("spawnPanelClose")?.addEventListener("click", closeSpawnPanelWithDeposit);
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
    const openCommerceBtn = e.target.closest("[data-commerce-open]");
    if(openCommerceBtn){
      openCommerceSaleDialog(openCommerceBtn.dataset.commerceOpen);
      return;
    }
    if(e.target.closest("[data-commerce-dialog-close]") || e.target.closest("[data-commerce-dialog-layer]") === e.target){
      closeCommerceSaleDialog();
      return;
    }
    const commercePresetBtn = e.target.closest("[data-commerce-sale-preset]");
    if(commercePresetBtn){
      syncCommerceSaleAmount(commercePresetBtn.dataset.commerceSalePreset);
      return;
    }
    const commerceConfirmBtn = e.target.closest("[data-commerce-sale-confirm]");
    if(commerceConfirmBtn){
      const input = documentRef.querySelector("[data-commerce-sale-amount]");
      const amount = clampCommerceSaleAmount(input?.value);
      if(amount <= 0){
        showToast("Choisis une quantite.");
        return;
      }
      const result = sellCommerceMaterial?.({materialId:commerceConfirmBtn.dataset.commerceSaleConfirm, amount});
      if(!result?.ok) showToast(result?.reason || "Vente impossible.");
      else if(result.serverPending) showToast("Vente commerce envoyee au serveur.");
      closeCommerceSaleDialog();
      renderSpawnInteractionPanel("commerce");
      updateHud();
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
      else showToast("Fusion locale refusee : validation serveur requise.");
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
      else if(result.serverPending) showToast(`Acceptation envoyee : ${result.quest.title}`);
      else showToast("Acceptation locale refusee : validation serveur requise.");
      renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const claimBtn = e.target.closest("[data-claim-quest]");
    if(claimBtn){
      const result = claimQuest(claimBtn.dataset.claimQuest);
      const claimIsServerPending = Boolean(result.serverPending);
      if(!result.ok) showToast(result.reason);
      else if(claimIsServerPending) showToast(`Reclamation envoyee : ${result.quest.title}`);
      else showToast("Recompense locale refusee : validation serveur requise.");
      renderSpawnInteractionPanel("quests");
      updateHud();
      return;
    }
    const craftTabPageBtn = e.target.closest("[data-craft-tab-page]");
    if(craftTabPageBtn){
      selectCraftTabPage?.(craftTabPageBtn.dataset.craftTabPage);
      return;
    }
    const craftCategoryBtn = e.target.closest("[data-craft-category]");
    if(craftCategoryBtn){
      selectCraftCategory?.(craftCategoryBtn.dataset.craftCategory);
      return;
    }
    const craftRecipeBtn = e.target.closest("[data-select-craft]");
    if(craftRecipeBtn){
      selectCraftRecipe?.(craftRecipeBtn.dataset.selectCraft);
      return;
    }
    const startCraftBtn = e.target.closest("[data-start-craft]");
    if(startCraftBtn){
      const result = startCraft?.(startCraftBtn.dataset.startCraft);
      if(!result?.ok) showToast(result?.reason || "Fabrication impossible.");
      else if(result.serverPending) showToast(`Fabrication envoyee : ${result.recipe?.name || "recette"}.`);
      else showToast("Fabrication locale refusee : validation serveur requise.");
      renderSpawnInteractionPanel("crafting");
      updateHud();
      return;
    }
    const claimCraftBtn = e.target.closest("[data-claim-craft]");
    if(claimCraftBtn){
      const result = claimCraft?.();
      if(!result?.ok) showToast(result?.reason || "Recuperation impossible.");
      else if(result.serverPending) showToast("Recuperation de fabrication envoyee.");
      else showToast("Recuperation locale refusee : validation serveur requise.");
      renderSpawnInteractionPanel("crafting");
      updateHud();
      return;
    }
    const startRefBtn = e.target.closest("[data-start-refinery]");
    if(startRefBtn){
      const result = startRefineryJob(startRefBtn.dataset.startRefinery);
      if(!result.ok) showToast(result.reason);
      else if(result.serverPending) showToast(`Raffinage envoye au serveur : ${result.recipe.name}`);
      else showToast("Raffinage local refuse : validation serveur requise.");
      renderSpawnInteractionPanel("refinery");
      updateHud();
      return;
    }
    const claimRefBtn = e.target.closest("[data-claim-refinery]");
    if(claimRefBtn){
      const result = claimRefineryJob();
      if(!result.ok) showToast(result.reason);
      else if(result.serverPending) showToast("Recuperation envoyee au serveur.");
      else showToast("Recuperation locale refusee : validation serveur requise.");
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
      else showToast("Amelioration locale refusee : validation serveur requise.");
      renderSpawnInteractionPanel("refinery");
      updateHud();
    }
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("input", e=>{
    const commerceAmount = e.target.closest("[data-commerce-sale-amount],[data-commerce-sale-range]");
    if(commerceAmount) syncCommerceSaleAmount(commerceAmount.value);
  });
  documentRef.getElementById("spawnInteractionPanel")?.addEventListener("keydown", e=>{
    if(e.key !== "Enter") return;
    const commerceAmount = e.target.closest("[data-commerce-sale-amount]");
    if(!commerceAmount || !pendingCommerceSale) return;
    e.preventDefault();
    const amount = clampCommerceSaleAmount(commerceAmount.value);
    if(amount <= 0){
      showToast("Choisis une quantite.");
      return;
    }
    const result = sellCommerceMaterial?.({materialId:pendingCommerceSale.materialId, amount});
    if(!result?.ok) showToast(result?.reason || "Vente impossible.");
    else if(result.serverPending) showToast("Vente commerce envoyee au serveur.");
    closeCommerceSaleDialog();
    renderSpawnInteractionPanel("commerce");
    updateHud();
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
    const materialCard = [...documentRef.querySelectorAll("[data-boost-material]")]
      .find(card=>card.dataset.boostMaterial === materialId);
    openBoostDepositDialog({
      target:slot.dataset.boostDropTarget,
      materialId,
      materialName:materialCard?.dataset.boostMaterialName || materialId,
      materialImg:materialCard?.dataset.boostMaterialImg || "",
      maxAmount:materialCard?.dataset.boostMaterialAmount || 0
    });
  });

  const boostDepositLayer = documentRef.getElementById("combatBoostDepositLayer");
  boostDepositLayer?.addEventListener("click", e=>{
    if(e.target.closest("[data-boost-deposit-close]")){
      closeBoostDepositDialog();
      return;
    }
    const step = e.target.closest("[data-boost-deposit-step]");
    if(step){
      const {amount} = getBoostDepositElements();
      syncBoostDepositAmount(Number(amount?.value || 1) + Number(step.dataset.boostDepositStep || 0));
      return;
    }
    const preset = e.target.closest("[data-boost-deposit-preset]");
    if(preset){
      const value = preset.dataset.boostDepositPreset;
      syncBoostDepositAmount(value === "max"
        ? pendingBoostDeposit?.maxAmount
        : value === "half"
          ? Math.max(1, Math.floor(Number(pendingBoostDeposit?.maxAmount || 1) / 2))
          : value);
      return;
    }
    if(e.target.closest("[data-boost-deposit-confirm]")) confirmBoostDeposit();
  });
  boostDepositLayer?.querySelector("[data-boost-deposit-amount]")?.addEventListener("input", e=>{
    syncBoostDepositAmount(e.target.value);
  });
  boostDepositLayer?.querySelector("[data-boost-deposit-range]")?.addEventListener("input", e=>{
    syncBoostDepositAmount(e.target.value);
  });
  boostDepositLayer?.querySelector("[data-boost-deposit-amount]")?.addEventListener("keydown", e=>{
    if(e.key === "Enter"){
      e.preventDefault();
      confirmBoostDeposit();
    }
  });
  windowRef.addEventListener("keydown", e=>{
    if(e.key === "Escape" && pendingBoostDeposit) closeBoostDepositDialog();
  });
}
