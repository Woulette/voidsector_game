// Keep hover on the same world-space hit test as clicks, including camera/zoom changes.
export function createSpawnStationHover({
  canvas, worldFromScreen, getStationAt, miniMapHitTest = ()=>null,
  isEnabled = ()=>true, documentRef = canvas.ownerDocument,
  windowRef = documentRef.defaultView
}){
  let pointer = null;
  let ownsCursor = false;
  let previousCursor = "";

  function setCursor(active){
    if(active === ownsCursor) return;
    if(active){
      previousCursor = canvas.style.cursor;
      canvas.style.cursor = "pointer";
    }else if(canvas.style.cursor === "pointer"){
      canvas.style.cursor = previousCursor;
    }
    ownsCursor = active;
  }

  function clear(){
    pointer = null;
    setCursor(false);
  }

  function track(event){
    if(event.pointerType === "touch" || !isEnabled()) return clear();
    pointer = {x:event.clientX, y:event.clientY};
  }

  function getHoveredStation(){
    if(!pointer || !isEnabled() || documentRef.hidden){
      setCursor(false);
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const x = pointer.x - rect.left, y = pointer.y - rect.top;
    const miniMapHit = miniMapHitTest(x, y);
    let station = null;
    if(x >= 0 && y >= 0 && x < rect.width && y < rect.height
      && (!miniMapHit || miniMapHit.type === "none")){
      station = getStationAt(worldFromScreen(x, y));
    }
    // Also handle a panel appearing under a stationary pointer.
    if(station?.presentation !== "industrial"
      || documentRef.elementFromPoint(pointer.x, pointer.y) !== canvas) station = null;
    setCursor(Boolean(station));
    return station;
  }

  canvas.addEventListener("pointerenter", track);
  canvas.addEventListener("pointermove", track);
  canvas.addEventListener("pointerleave", clear);
  canvas.addEventListener("pointercancel", clear);
  windowRef.addEventListener("blur", clear);
  documentRef.addEventListener("visibilitychange", clear);
  return {
    getHoveredStation, clear,
    dispose(){
      clear();
      canvas.removeEventListener("pointerenter", track);
      canvas.removeEventListener("pointermove", track);
      canvas.removeEventListener("pointerleave", clear);
      canvas.removeEventListener("pointercancel", clear);
      windowRef.removeEventListener("blur", clear);
      documentRef.removeEventListener("visibilitychange", clear);
    }
  };
}
