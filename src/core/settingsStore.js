import { store } from "./store.js";
import {
  FPS_LIMIT_VALUES,
  UI_SCALE_VALUES,
  normalizeGameSettings,
  settingsWithGraphicsEffect,
  settingsWithGraphicsPreset
} from "./settingsSchema.js";

export function getGameSettings(){
  const current = store.state?.settings;
  if(current?.graphics?.effects && current?.interface && current?.audio) return current;
  const normalized = normalizeGameSettings(store.state?.settings, {legacyGraphicsQuality:store.state?.graphicsQuality});
  if(store.state) store.state.settings = normalized;
  return normalized;
}

export function setGraphicsPreset(value){
  const next = settingsWithGraphicsPreset(getGameSettings(), value);
  store.state.settings = next;
  store.state.graphicsQuality = next.graphics.basePreset;
  return next.graphics.preset;
}

export function setGraphicsEffect(effectId, enabled){
  const next = settingsWithGraphicsEffect(getGameSettings(), effectId, enabled);
  store.state.settings = next;
  store.state.graphicsQuality = next.graphics.basePreset;
  return next.graphics.effects[effectId];
}

export function setFpsLimit(value){
  const requested = Number(value);
  const settings = getGameSettings();
  settings.graphics.fpsLimit = FPS_LIMIT_VALUES.includes(requested) ? requested : 0;
  return settings.graphics.fpsLimit;
}

export function setInterfaceSetting(key, value){
  const settings = getGameSettings();
  if(key === "uiScale"){
    const requested = Number(value);
    settings.interface.uiScale = UI_SCALE_VALUES.includes(requested) ? requested : 1;
  }else if(["targetDetailsVisible", "chatVisible", "perfVisible"].includes(key)){
    settings.interface[key] = Boolean(value);
  }
  return settings.interface[key];
}

export function setAudioSetting(key, value){
  const settings = getGameSettings();
  if(key === "muted") settings.audio.muted = Boolean(value);
  else if(["master", "music", "effects", "ambience"].includes(key)){
    settings.audio[key] = Math.max(0, Math.min(100, Number(value) || 0));
  }
  return settings.audio[key];
}
