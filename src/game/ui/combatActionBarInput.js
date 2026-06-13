export const ACTION_SLOT_CLEAR_DISTANCE = 72;

export function hasActionSlotClearDistanceReached(start, event, threshold = ACTION_SLOT_CLEAR_DISTANCE){
  if(!start) return false;
  const dx = Number(event?.clientX || 0) - Number(start.x || 0);
  const dy = Number(event?.clientY || 0) - Number(start.y || 0);
  return Math.hypot(dx, dy) >= threshold;
}

export function readActionSlotDropData(dataTransfer){
  return {
    fromSlot:dataTransfer.getData("application/x-voidsector-action-slot"),
    extraId:dataTransfer.getData("application/x-voidsector-extra"),
    missileCpu:dataTransfer.getData("application/x-voidsector-missile-cpu"),
    droneFormation:dataTransfer.getData("application/x-voidsector-drone-formation"),
    ammoId:dataTransfer.getData("application/x-voidsector-ammo") || dataTransfer.getData("text/plain")
  };
}

export function setCombatAssetDragImage({event, source, documentRef, windowRef}){
  if(!event.dataTransfer?.setDragImage || !source || !documentRef.body) return;
  const visual = source.querySelector("img, .ammo-glyph") || source;
  const ghost = visual.cloneNode(true);
  ghost.removeAttribute?.("id");
  Object.assign(ghost.style, {
    position:"fixed",
    left:"-120px",
    top:"-120px",
    width:"58px",
    height:"58px",
    objectFit:"contain",
    pointerEvents:"none",
    zIndex:"-1",
    opacity:"0.96"
  });
  if(ghost.classList?.contains("ammo-glyph")){
    ghost.style.display = "grid";
    ghost.style.placeItems = "center";
    ghost.style.borderRadius = "8px";
  }
  documentRef.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, 29, 29);
  windowRef.setTimeout(()=>ghost.remove(), 0);
}

export function installCombatActionBarInputHandlers({
  windowRef,
  documentRef,
  actionBar,
  isRunning,
  getActionSlots,
  selectActionSlot,
  moveActionSlot,
  clearActionSlot,
  assignExtraToActionSlot,
  assignDroneFormationToActionSlot,
  assignAmmoToActionSlot,
  assignMissileLauncherToActionSlot
}){
  let draggedActionSlotIndex = null;
  let actionSlotDropHandled = false;
  let actionSlotDragStart = null;
  let actionSlotClearDistanceReached = false;

  function updateActionSlotClearDistance(event){
    if(hasActionSlotClearDistanceReached(actionSlotDragStart, event)) actionSlotClearDistanceReached = true;
  }

  actionBar.addEventListener("click", event=>{
    if(!isRunning()) return;
    const slot = event.target.closest("[data-action-index]");
    if(slot) selectActionSlot(Number(slot.dataset.actionIndex));
  });
  actionBar.addEventListener("dragover", event=>{
    if(event.target.closest("[data-action-index]")) event.preventDefault();
  });
  actionBar.addEventListener("dragstart", event=>{
    if(!isRunning()) return;
    const slot = event.target.closest("[data-action-index]");
    if(!slot) return;
    const index = Number(slot.dataset.actionIndex);
    if(!getActionSlots()?.[index]) return event.preventDefault();
    draggedActionSlotIndex = index;
    actionSlotDropHandled = false;
    actionSlotDragStart = {x:Number(event.clientX || 0), y:Number(event.clientY || 0)};
    actionSlotClearDistanceReached = false;
    event.dataTransfer.setData("application/x-voidsector-action-slot", String(index));
    event.dataTransfer.effectAllowed = "move";
    setCombatAssetDragImage({event, source:slot, documentRef, windowRef});
  });
  actionBar.addEventListener("dragend", event=>{
    if(!isRunning()) return;
    updateActionSlotClearDistance(event);
    if(draggedActionSlotIndex !== null && !actionSlotDropHandled && actionSlotClearDistanceReached) clearActionSlot(draggedActionSlotIndex);
    draggedActionSlotIndex = null;
    actionSlotDropHandled = false;
    actionSlotDragStart = null;
    actionSlotClearDistanceReached = false;
  });
  actionBar.addEventListener("drop", event=>{
    if(!isRunning()) return;
    const slot = event.target.closest("[data-action-index]");
    if(!slot) return;
    event.preventDefault();
    const {fromSlot, extraId, missileCpu, droneFormation, ammoId} = readActionSlotDropData(event.dataTransfer);
    if(fromSlot !== ""){
      actionSlotDropHandled = true;
      moveActionSlot(Number(fromSlot), Number(slot.dataset.actionIndex));
      return;
    }
    if(extraId) assignExtraToActionSlot(Number(slot.dataset.actionIndex), extraId);
    else if(missileCpu) assignMissileLauncherToActionSlot(Number(slot.dataset.actionIndex));
    else if(droneFormation) assignDroneFormationToActionSlot(Number(slot.dataset.actionIndex), droneFormation);
    else assignAmmoToActionSlot(Number(slot.dataset.actionIndex), ammoId);
  });

  documentRef.addEventListener("dragover", event=>{
    if(!isRunning()) return;
    if(event.dataTransfer.types.includes("application/x-voidsector-action-slot")){
      updateActionSlotClearDistance(event);
      event.preventDefault();
    }
  });
  documentRef.addEventListener("drop", event=>{
    if(!isRunning()) return;
    const fromSlot = event.dataTransfer.getData("application/x-voidsector-action-slot");
    if(fromSlot === "") return;
    if(event.target.closest("#gameActionBar [data-action-index]")) return;
    event.preventDefault();
    actionSlotDropHandled = true;
    updateActionSlotClearDistance(event);
    if(actionSlotClearDistanceReached) clearActionSlot(Number(fromSlot));
  });
}
