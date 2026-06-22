import { getGameSettings } from "../../core/settingsStore.js";

export function createCombatSettingsRuntime({
  store,
  resize,
  chat,
  saveState,
  documentRef = document,
  windowRef = window
}){
  const gameScreen = documentRef.getElementById("gameScreen");

  function applySettings({syncChat = false} = {}){
    if(!store.state) return null;
    const settings = getGameSettings();
    const ui = settings.interface;
    gameScreen?.style.setProperty("--combat-ui-scale", String(ui.uiScale));
    gameScreen?.classList.toggle("settings-hide-target-details", !ui.targetDetailsVisible);
    documentRef.getElementById("combatPerfPanel")?.classList.toggle("hidden", !ui.perfVisible);
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    store.state.uiLayout.perfVisible = ui.perfVisible;
    if(syncChat){
      if(ui.chatVisible) chat?.open?.();
      else chat?.close?.();
    }
    resize?.();
    windowRef.dispatchEvent(new CustomEvent("voidsector:settings-applied", {detail:{settings}}));
    return settings;
  }

  function isFullscreen(){
    return Boolean(documentRef.fullscreenElement);
  }

  async function toggleFullscreen(){
    try{
      if(isFullscreen()) await documentRef.exitFullscreen?.();
      else await documentRef.documentElement?.requestFullscreen?.();
      return isFullscreen();
    }catch{
      return isFullscreen();
    }
  }

  function persistAndApply(options){
    const settings = applySettings(options);
    if(!settings) return null;
    saveState?.();
    return settings;
  }

  return {applySettings, persistAndApply, isFullscreen, toggleFullscreen};
}
