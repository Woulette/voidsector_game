import { persistCombatUiLayout } from "./combatUiLayout.js";

export function createCombatUtilityDock({store, documentRef = document}){
  const dock = documentRef.getElementById("combatUtilityDock");
  const toggle = dock?.querySelector("[data-utility-dock-toggle]");
  const items = dock?.querySelector("#combatUtilityItems");
  if(!toggle || !items) return {refresh(){}};

  function refresh(){
    const collapsed = store.state?.uiLayout?.combatUtilityDock?.collapsed === true;
    dock.classList.toggle("is-collapsed", collapsed);
    items.hidden = collapsed;
    const label = collapsed ? "Déplier les modules" : "Replier les modules";
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
  }

  toggle.addEventListener("click", ()=>{
    if(!store.state) return;
    store.state.uiLayout ||= {};
    store.state.uiLayout.combatUtilityDock = {
      ...store.state.uiLayout.combatUtilityDock,
      collapsed:!dock.classList.contains("is-collapsed")
    };
    persistCombatUiLayout(store);
    refresh();
  });
  refresh();
  return {refresh};
}
