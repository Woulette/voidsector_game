const panelMarkup = new WeakMap();

// Keep the existing nodes, scroll position and focus when their content is unchanged.
export function updateCombatPanelContent(content, html){
  if(!content || panelMarkup.get(content) === html) return false;
  const scrollTop = content.scrollTop;
  content.innerHTML = html;
  content.scrollTop = scrollTop;
  panelMarkup.set(content, html);
  return true;
}

export function createCombatPanelRefreshTimers(){
  const remaining = new Map();
  return {
    reset(){ remaining.clear(); },
    defer(mode, interval){ remaining.set(mode, interval); },
    due(mode, dt, interval){
      const next = (remaining.get(mode) || 0) - Math.max(0, Number(dt) || 0);
      remaining.set(mode, next > 0 ? next : interval);
      return next <= 0;
    }
  };
}

export function isCombatPanelCollapsed(layout, mode, hasPendingInvite = false){
  if(mode !== "group" && mode !== "quests") return false;
  if(mode === "group" && hasPendingInvite) return false;
  return typeof layout?.collapsed === "boolean" ? layout.collapsed : mode === "group";
}

export function syncCombatPanelDisclosure(panel, collapsed){
  if(!panel) return;
  panel.classList.toggle("is-collapsed", collapsed);
  const toggle = panel.querySelector("[data-hud-panel-collapse]");
  if(!toggle) return;
  toggle.setAttribute("aria-expanded", String(!collapsed));
  const name = panel.dataset.utilityMode === "group" ? "le groupe" : "le suivi de quêtes";
  toggle.setAttribute("aria-label", `${collapsed ? "Déplier" : "Réduire"} ${name}`);
  toggle.title = `${collapsed ? "Déplier" : "Réduire"} ${name}`;
}
