const COMBAT_UI_LAYOUT_KEY = "voidsector-combat-ui-layout";

function isObject(value){
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finiteLayoutNumber(value){
  return value !== null && value !== "" && Number.isFinite(Number(value))
    ? Number(value)
    : undefined;
}

function sanitizePanelLayout(layout){
  if(!isObject(layout)) return {};
  const sanitized = {...layout};
  for(const key of ["left", "top", "width", "height"]){
    const value = finiteLayoutNumber(layout[key]);
    if(value === undefined) delete sanitized[key];
    else sanitized[key] = value;
  }
  return sanitized;
}

function mergeLayout(base = {}, saved = {}){
  return {
    ...base,
    ...saved,
    combatChatPanel:{
      ...sanitizePanelLayout(base.combatChatPanel),
      ...sanitizePanelLayout(saved.combatChatPanel)
    },
    combatUtilityPanels:{
      ...(isObject(base.combatUtilityPanels) ? base.combatUtilityPanels : {}),
      ...(isObject(saved.combatUtilityPanels) ? saved.combatUtilityPanels : {})
    }
  };
}

export function readCombatUiLayout(){
  try{
    const raw = localStorage.getItem(COMBAT_UI_LAYOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return isObject(parsed) ? parsed : {};
  }catch{
    return {};
  }
}

export function hydrateCombatUiLayout(store){
  if(!store?.state) return {};
  if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
  store.state.uiLayout = mergeLayout(store.state.uiLayout, readCombatUiLayout());
  return store.state.uiLayout;
}

export function persistCombatUiLayout(store){
  try{
    if(!store?.state?.uiLayout || typeof store.state.uiLayout !== "object") return;
    localStorage.setItem(COMBAT_UI_LAYOUT_KEY, JSON.stringify(store.state.uiLayout));
  }catch{
    // UI layout persistence is a comfort feature; ignore quota/private-mode errors.
  }
}
