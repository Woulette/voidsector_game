import { normalizeGameSettings } from "./settingsSchema.js";

export const LOCAL_PREFERENCES_VERSION = 4;

function migrateLocalPreferences(preferences){
  if(!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return preferences;
  const version = Number(preferences.localPreferencesVersion || 0);
  if(version >= LOCAL_PREFERENCES_VERSION) return preferences;
  if(version < 3){
    const settings = preferences.settings && typeof preferences.settings === "object" ? preferences.settings : {};
    const interfaceSettings = settings.interface && typeof settings.interface === "object" ? settings.interface : {};
    preferences.settings = {
      ...settings,
      interface:{
        ...interfaceSettings,
        targetDetailsVisible:false,
        perfVisible:false
      }
    };
  }
  return preferences;
}

function clonePlainObject(value){
  if(!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value));
}

export function getLocalPreferences(state){
  const settings = normalizeGameSettings(state?.settings, {legacyGraphicsQuality:state?.graphicsQuality});
  return {
    localPreferencesVersion:LOCAL_PREFERENCES_VERSION,
    graphicsQuality:settings.graphics.basePreset,
    settings,
    slotKeybinds:Array.isArray(state?.slotKeybinds) ? [...state.slotKeybinds] : [],
    abilityKeybinds:Array.isArray(state?.abilityKeybinds) ? [...state.abilityKeybinds] : [],
    uiLayout:clonePlainObject(state?.uiLayout)
  };
}

export function loadLocalPreferences(storage, storageKey){
  const raw = storage?.getItem?.(storageKey);
  if(!raw) return null;
  const preferences = getLocalPreferences(migrateLocalPreferences(JSON.parse(raw)));
  const sanitized = JSON.stringify(preferences);
  if(raw !== sanitized) storage?.setItem?.(storageKey, sanitized);
  return preferences;
}

export function saveLocalPreferences(storage, storageKey, state){
  const preferences = getLocalPreferences(state);
  storage?.setItem?.(storageKey, JSON.stringify(preferences));
  return preferences;
}
