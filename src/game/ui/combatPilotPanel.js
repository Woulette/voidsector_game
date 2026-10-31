import { hydrateCombatUiLayout, persistCombatUiLayout } from "./combatUiLayout.js";

export function createCombatPilotPanel({store, documentRef = document, windowRef = window}){
  const panel = documentRef.querySelector(".combat-status");
  const host = documentRef.getElementById("gameScreen");
  if(!panel || !host) return {refresh(){}};
  host.appendChild(panel);
  const handle = panel.querySelector("[data-pilot-drag-handle]");
  const toggle = panel.querySelector("[data-pilot-collapse]");
  let hydratedState;
  let moving = false;
  function layout(){ return store.state?.uiLayout?.combatPilotPanel || {}; }
  function save(patch){
    if(!store.state) return;
    store.state.uiLayout ||= {};
    store.state.uiLayout.combatPilotPanel = {...layout(), ...patch};
    persistCombatUiLayout(store);
  }
  function place(left, top){
    const rect = panel.getBoundingClientRect();
    const width = host.clientWidth || windowRef.innerWidth;
    const height = host.clientHeight || windowRef.innerHeight;
    panel.style.left = `${Math.max(0, Math.min(width - (rect.width || 326), left))}px`;
    panel.style.top = `${Math.max(0, Math.min(height - (rect.height || 184), top))}px`;
  }
  function apply(){
    const saved = layout();
    panel.classList.toggle("is-collapsed", saved.collapsed === true);
    toggle?.setAttribute("aria-expanded", String(saved.collapsed !== true));
    toggle?.setAttribute("aria-label", saved.collapsed ? "Déplier la fiche pilote" : "Replier la fiche pilote");
    place(Number.isFinite(saved.left) ? saved.left : 12, Number.isFinite(saved.top) ? saved.top : 12);
  }
  function refresh(){
    if(hydratedState === store.state) return;
    hydrateCombatUiLayout(store);
    hydratedState = store.state;
    apply();
  }
  handle?.addEventListener("pointerdown", event=>{
    if(event.button !== 0 || event.target.closest("button, input, select, a")) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect(), origin = host.getBoundingClientRect();
    const dx = event.clientX - rect.left, dy = event.clientY - rect.top;
    moving = true;
    handle.setPointerCapture?.(event.pointerId);
    panel.classList.add("is-dragging");
    const move = next=>place(next.clientX - origin.left - dx, next.clientY - origin.top - dy);
    const stop = next=>{
      moving = false;
      panel.classList.remove("is-dragging");
      handle.releasePointerCapture?.(next.pointerId);
      const final = panel.getBoundingClientRect();
      save({left:Math.round(final.left - origin.left), top:Math.round(final.top - origin.top)});
      windowRef.removeEventListener("pointermove", move);
      windowRef.removeEventListener("pointerup", stop);
      windowRef.removeEventListener("pointercancel", stop);
    };
    windowRef.addEventListener("pointermove", move);
    windowRef.addEventListener("pointerup", stop);
    windowRef.addEventListener("pointercancel", stop);
  });
  toggle?.addEventListener("click", ()=>{save({collapsed:!panel.classList.contains("is-collapsed")});apply();});
  windowRef.addEventListener("resize", ()=>{if(!moving) apply();});
  windowRef.addEventListener("voidsector:profile-applied", ()=>{hydratedState = null;refresh();});
  refresh();
  return {refresh};
}
