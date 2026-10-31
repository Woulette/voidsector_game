export function createSectorTravelHud({container, maps = [], getCurrentMap, onCancel, documentRef = document}){
  let banner = null;
  let label = null;
  let detail = null;
  let previousKey = "";

  function mapName(id){
    return maps.find(map=>String(map.id) === String(id))?.name || "secteur";
  }

  function ensureBanner(){
    if(banner?.isConnected) return;
    banner = documentRef.createElement("div");
    banner.className = "sector-travel-banner";
    banner.hidden = true;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    const copy = documentRef.createElement("div");
    copy.className = "sector-travel-banner-copy";
    label = documentRef.createElement("strong");
    detail = documentRef.createElement("small");
    copy.append(label, detail);
    const stop = documentRef.createElement("button");
    stop.type = "button";
    stop.textContent = "Arrêter";
    stop.setAttribute("aria-label", "Arrêter le voyage automatique");
    stop.addEventListener("click", ()=>onCancel?.("manual"));
    banner.append(copy, stop);
    container?.append(banner);
  }

  function update(state){
    const visible = Boolean(state?.active || state?.pending);
    if(!visible && !banner) return;
    ensureBanner();
    banner.hidden = !visible;
    if(!visible){ previousKey = ""; return; }
    const currentId = getCurrentMap?.()?.id;
    const route = Array.isArray(state.routeMapIds) ? state.routeMapIds : [];
    const index = route.findIndex(id=>String(id) === String(currentId));
    const remaining = Math.max(0, route.length - index - 1);
    const key = [state.status, state.targetMapId, state.nextMapId, remaining].join(":");
    if(key === previousKey) return;
    previousKey = key;
    label.textContent = `Voyage automatique · ${mapName(state.targetMapId)}`;
    detail.textContent = state.pending
      ? "Vérification du Premium…"
      : state.status === "transferring"
        ? `Passage vers ${mapName(state.nextMapId)} · Cliquer pour reprendre la main`
        : `${remaining} saut${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""} · Cliquer pour reprendre la main`;
  }

  return {update};
}
