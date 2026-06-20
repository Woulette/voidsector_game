export const LOCAL_PREFERENCES_VERSION = 1;

function clonePlainObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

export function getLocalPreferences(state){
  return {
    localPreferencesVersion:LOCAL_PREFERENCES_VERSION,
    graphicsQuality:typeof state?.graphicsQuality === "string" ? state.graphicsQuality : "high",
    slotKeybinds:Array.isArray(state?.slotKeybinds) ? [...state.slotKeybinds] : [],
    uiLayout:clonePlainObject(state?.uiLayout)
  };
}

export function loadLocalPreferences(storage, storageKey){
  const raw = storage?.getItem?.(storageKey);
  if(!raw) return null;
  const preferences = getLocalPreferences(JSON.parse(raw));
  const sanitized = JSON.stringify(preferences);
  if(raw !== sanitized) storage?.setItem?.(storageKey, sanitized);
  return preferences;
}

export function saveLocalPreferences(storage, storageKey, state){
  const preferences = getLocalPreferences(state);
  storage?.setItem?.(storageKey, JSON.stringify(preferences));
  return preferences;
}
