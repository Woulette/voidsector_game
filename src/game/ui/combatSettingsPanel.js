import {
  GRAPHICS_EFFECT_GROUPS,
  GRAPHICS_PRESET_IDS,
  FPS_LIMIT_VALUES,
  UI_SCALE_VALUES
} from "../../core/settingsSchema.js";
import {
  getGameSettings,
  setAudioSetting,
  setFpsLimit,
  setGraphicsEffect,
  setGraphicsPreset,
  setInterfaceSetting
} from "../../core/settingsStore.js";
import { DEFAULT_ABILITY_KEYBINDS, DEFAULT_SLOT_KEYBINDS, eventToCode, keyCodeToLabel, normalizeAbilityKeybinds, normalizeSlotKeybinds } from "../../core/keybinds.js?v=ship-abilities-1";

const TABS = [
  {id:"graphics", label:"Graphisme"},
  {id:"interface", label:"Interface"},
  {id:"audio", label:"Son"},
  {id:"controls", label:"Touches"}
];

const PRESET_LABELS = {low:"Bas", medium:"Moyen", high:"Haut", custom:"Personnalisé"};
const RESERVED_CODES = new Set(["Escape", "Tab", "Enter", "F5", "F11", "KeyJ"]);

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}

function switchRow({label, description, checked, data}){
  return `<label class="combat-settings-switch">
    <span><strong>${escapeHtml(label)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ""}</span>
    <input type="checkbox" ${checked ? "checked" : ""} ${data}>
    <i aria-hidden="true"></i>
  </label>`;
}

export function createCombatSettingsPanel({
  store,
  saveState,
  applySettings,
  runtime,
  chat,
  closePanel,
  refreshActionBar,
  showToast,
  documentRef = document,
  windowRef = window
}){
  let activeTab = "graphics";
  let pendingKeySlot = null;
  let pendingAbilityKeySlot = null;
  const panel = documentRef.getElementById("combatUtilityPanelSettings");
  const content = documentRef.getElementById("combatUtilityContentSettings");

  function isOpen(){
    return Boolean(panel && !panel.classList.contains("hidden"));
  }

  function renderPresetBar(settings){
    return `<div class="combat-settings-presets" role="radiogroup" aria-label="Qualité graphique">
      ${GRAPHICS_PRESET_IDS.map(id=>`<button class="${settings.graphics.preset === id ? "active" : ""}" data-settings-preset="${id}" type="button"><strong>${PRESET_LABELS[id]}</strong><small>${id === "custom" ? "Réglage manuel" : id === "high" ? "Qualité maximale" : id === "medium" ? "Équilibré" : "Performances"}</small></button>`).join("")}
    </div>`;
  }

  function renderGraphics(settings){
    return `<div class="combat-settings-page">
      <section class="combat-settings-section">
        <div class="combat-settings-section-head"><div><span>PRÉRÉGLAGE</span><h3>Qualité graphique</h3></div><b>${PRESET_LABELS[settings.graphics.preset]}</b></div>
        ${renderPresetBar(settings)}
        <p class="combat-settings-help">Modifier une option active automatiquement le mode Personnalisé.</p>
      </section>
      <section class="combat-settings-tech-grid">
        <label class="combat-settings-field"><span>Limiteur de FPS</span><select data-settings-fps>${FPS_LIMIT_VALUES.map(value=>`<option value="${value}" ${settings.graphics.fpsLimit === value ? "selected" : ""}>${value === 0 ? "Illimité" : value}</option>`).join("")}</select><small>La limite ne dépasse pas la fréquence de ton écran.</small></label>
        <div class="combat-settings-field"><span>Plein écran</span><button class="combat-settings-fullscreen ${runtime.isFullscreen() ? "active" : ""}" data-settings-fullscreen type="button">${runtime.isFullscreen() ? "QUITTER LE PLEIN ÉCRAN" : "ACTIVER LE PLEIN ÉCRAN"}</button><small>Le navigateur exige un clic pour l’activer.</small></div>
      </section>
      <div class="combat-settings-effects">
        ${GRAPHICS_EFFECT_GROUPS.map(group=>`<section class="combat-settings-effect-group"><header><span>${escapeHtml(group.label)}</span><b>${group.effects.filter(effect=>settings.graphics.effects[effect.id]).length}/${group.effects.length}</b></header>${group.effects.map(effect=>switchRow({label:effect.label, checked:settings.graphics.effects[effect.id], data:`data-settings-effect="${effect.id}"`})).join("")}</section>`).join("")}
      </div>
    </div>`;
  }

  function renderInterface(settings){
    return `<div class="combat-settings-page">
      <section class="combat-settings-section">
        <div class="combat-settings-section-head"><div><span>CONFORT</span><h3>Taille du HUD</h3></div><b>${Math.round(settings.interface.uiScale * 100)}%</b></div>
        <p class="combat-settings-help">Agrandit ou réduit les éléments affichés autour du jeu. Le canvas et la zone de clic ne changent pas.</p>
        <div class="combat-settings-scale">${UI_SCALE_VALUES.map(value=>`<button class="${settings.interface.uiScale === value ? "active" : ""}" data-settings-ui-scale="${value}" type="button">${Math.round(value * 100)}%</button>`).join("")}</div>
      </section>
      <section class="combat-settings-section">
        <div class="combat-settings-section-head"><div><span>AFFICHAGE</span><h3>Éléments d’interface</h3></div><b>EN DIRECT</b></div>
        <div class="combat-settings-switch-list">
          ${switchRow({label:"Fiche de la cible", description:"Vie, bouclier et niveau de l’ennemi sélectionné.", checked:settings.interface.targetDetailsVisible, data:'data-settings-interface="targetDetailsVisible"'})}
          ${switchRow({label:"Panneau PERF", description:"FPS, temps de frame, update et draw.", checked:settings.interface.perfVisible, data:'data-settings-interface="perfVisible"'})}
          ${switchRow({label:"Fenêtre de chat", description:"Peut toujours être rouverte depuis l’icône Chat.", checked:settings.interface.chatVisible, data:'data-settings-interface="chatVisible"'})}
        </div>
        <p class="combat-settings-help">La barre d’action reste toujours visible et les raccourcis restent actifs.</p>
      </section>
    </div>`;
  }

  function audioSlider(id, label, value){
    return `<label class="combat-settings-volume"><span><strong>${escapeHtml(label)}</strong><output data-settings-audio-output="${id}">${Math.round(value)}%</output></span><input type="range" min="0" max="100" step="1" value="${value}" data-settings-audio="${id}"></label>`;
  }

  function renderAudio(settings){
    return `<div class="combat-settings-page">
      <section class="combat-settings-section">
        <div class="combat-settings-section-head"><div><span>AUDIO</span><h3>Mixage sonore</h3></div><b>PRÉPARÉ</b></div>
        <p class="combat-settings-help">Le moteur audio sera branché plus tard. Tes valeurs sont déjà sauvegardées.</p>
        <div class="combat-settings-volume-list">
          ${audioSlider("master", "Volume général", settings.audio.master)}
          ${audioSlider("music", "Musique", settings.audio.music)}
          ${audioSlider("effects", "Effets", settings.audio.effects)}
          ${audioSlider("ambience", "Ambiance", settings.audio.ambience)}
        </div>
        <button class="combat-settings-mute ${settings.audio.muted ? "active" : ""}" data-settings-mute type="button"><span>${settings.audio.muted ? "SON COUPÉ" : "TOUT COUPER"}</span><small>Les volumes précédents sont conservés.</small></button>
      </section>
    </div>`;
  }

  function renderControls(){
    const keys = normalizeSlotKeybinds(store.state.slotKeybinds);
    const abilityKeys = normalizeAbilityKeybinds(store.state.abilityKeybinds, keys);
    return `<div class="combat-settings-page">
      <section class="combat-settings-section">
        <div class="combat-settings-section-head"><div><span>COMMANDES</span><h3>Touches d’action</h3></div><button class="combat-settings-reset" data-settings-reset-keys type="button">RÉINITIALISER</button></div>
        <p class="combat-settings-help">Clique sur une touche, puis appuie directement sur la nouvelle. Échap annule la capture.</p>
        <div class="combat-settings-key-grid">${keys.map((code,index)=>`<button class="combat-settings-key ${pendingKeySlot === index ? "listening" : ""}" data-settings-key-slot="${index}" type="button"><span>Action ${index + 1}</span><strong>${pendingKeySlot === index ? "APPUIE…" : escapeHtml(keyCodeToLabel(code))}</strong><small>${pendingKeySlot === index ? "Échap pour annuler" : "Modifier"}</small></button>`).join("")}</div>
        <p class="combat-settings-help warning">Les doublons et les touches réservées au jeu sont refusés.</p>
      </section>
      <section class="combat-settings-section">
        <div class="combat-settings-section-head"><div><span>VAISSEAU</span><h3>Touches de compétences</h3></div><button class="combat-settings-reset" data-settings-reset-ability-keys type="button">RÉINITIALISER</button></div>
        <p class="combat-settings-help">Ces touches activent les slots de compétences affichés au-dessus de la barre d’action.</p>
        <div class="combat-settings-key-grid ability">${abilityKeys.map((code,index)=>`<button class="combat-settings-key ${pendingAbilityKeySlot === index ? "listening" : ""}" data-settings-ability-key-slot="${index}" type="button"><span>Compétence ${index + 1}</span><strong>${pendingAbilityKeySlot === index ? "APPUIE…" : escapeHtml(keyCodeToLabel(code))}</strong><small>${pendingAbilityKeySlot === index ? "Échap pour annuler" : "Modifier"}</small></button>`).join("")}</div>
      </section>
    </div>`;
  }

  function renderContent(){
    const settings = getGameSettings();
    const page = activeTab === "interface" ? renderInterface(settings) : activeTab === "audio" ? renderAudio(settings) : activeTab === "controls" ? renderControls() : renderGraphics(settings);
    return `<nav class="combat-settings-tabs" role="tablist">${TABS.map(tab=>`<button class="${activeTab === tab.id ? "active" : ""}" data-settings-tab="${tab.id}" type="button">${tab.label}</button>`).join("")}</nav><div class="combat-settings-body">${page}</div>`;
  }

  function render(){
    if(content) content.innerHTML = renderContent();
  }

  function persist({syncChat = false} = {}){
    applySettings?.({syncChat});
    saveState?.();
    render();
  }

  panel?.addEventListener("click", async event=>{
    if(event.target.closest("[data-settings-close]")){ closePanel?.(); return; }
    const tab = event.target.closest("[data-settings-tab]");
    if(tab){ activeTab = tab.dataset.settingsTab || "graphics"; pendingKeySlot = null; pendingAbilityKeySlot = null; render(); return; }
    const preset = event.target.closest("[data-settings-preset]");
    if(preset){ setGraphicsPreset(preset.dataset.settingsPreset); persist(); return; }
    const scale = event.target.closest("[data-settings-ui-scale]");
    if(scale){ setInterfaceSetting("uiScale", Number(scale.dataset.settingsUiScale)); persist(); return; }
    if(event.target.closest("[data-settings-fullscreen]")){
      const wasFullscreen = runtime.isFullscreen();
      const fullscreen = await runtime.toggleFullscreen();
      if(!wasFullscreen && !fullscreen) showToast?.("Le navigateur a refusé le passage en plein écran.");
      render();
      return;
    }
    if(event.target.closest("[data-settings-mute]")){
      setAudioSetting("muted", !getGameSettings().audio.muted);
      persist();
      return;
    }
    if(event.target.closest("[data-settings-reset-keys]")){
      store.state.slotKeybinds = [...DEFAULT_SLOT_KEYBINDS];
      store.state.abilityKeybinds = normalizeAbilityKeybinds(store.state.abilityKeybinds, store.state.slotKeybinds);
      pendingKeySlot = null;
      saveState?.();
      refreshActionBar?.();
      render();
      showToast?.("Touches d’action réinitialisées.");
      return;
    }
    if(event.target.closest("[data-settings-reset-ability-keys]")){
      store.state.abilityKeybinds = normalizeAbilityKeybinds(DEFAULT_ABILITY_KEYBINDS, store.state.slotKeybinds);
      pendingAbilityKeySlot = null;
      saveState?.();
      refreshActionBar?.();
      render();
      showToast?.("Touches de compétences réinitialisées.");
      return;
    }
    const key = event.target.closest("[data-settings-key-slot]");
    if(key){ pendingKeySlot = Number(key.dataset.settingsKeySlot); pendingAbilityKeySlot = null; render(); return; }
    const abilityKey = event.target.closest("[data-settings-ability-key-slot]");
    if(abilityKey){ pendingAbilityKeySlot = Number(abilityKey.dataset.settingsAbilityKeySlot); pendingKeySlot = null; render(); return; }
  });

  panel?.addEventListener("change", event=>{
    const effect = event.target.closest("[data-settings-effect]");
    if(effect){ setGraphicsEffect(effect.dataset.settingsEffect, effect.checked); persist(); return; }
    const fps = event.target.closest("[data-settings-fps]");
    if(fps){ setFpsLimit(fps.value); persist(); return; }
    const ui = event.target.closest("[data-settings-interface]");
    if(ui){
      const key = ui.dataset.settingsInterface;
      setInterfaceSetting(key, ui.checked);
      persist({syncChat:key === "chatVisible"});
    }
  });

  panel?.addEventListener("input", event=>{
    const audio = event.target.closest("[data-settings-audio]");
    if(!audio) return;
    setAudioSetting(audio.dataset.settingsAudio, audio.value);
    panel.querySelector(`[data-settings-audio-output="${audio.dataset.settingsAudio}"]`)?.replaceChildren(`${Math.round(Number(audio.value))}%`);
    saveState?.();
  });

  windowRef.addEventListener("keydown", event=>{
    if(pendingKeySlot === null && pendingAbilityKeySlot === null){
      if(isOpen() && event.key === "Escape"){
        event.preventDefault();
        event.stopImmediatePropagation();
        closePanel?.();
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const code = eventToCode(event);
    if(code === "Escape"){
      pendingKeySlot = null;
      pendingAbilityKeySlot = null;
      render();
      return;
    }
    if(event.ctrlKey || event.metaKey || event.altKey || ["ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(code) || RESERVED_CODES.has(code)){
      showToast?.("Cette touche est réservée et ne peut pas être assignée.");
      return;
    }
    const actionKeys = normalizeSlotKeybinds(store.state.slotKeybinds);
    const abilityKeys = normalizeAbilityKeybinds(store.state.abilityKeybinds, actionKeys);
    const duplicateAction = actionKeys.findIndex((value,index)=>value === code && index !== pendingKeySlot);
    const duplicateAbility = abilityKeys.findIndex((value,index)=>value === code && index !== pendingAbilityKeySlot);
    if(duplicateAction >= 0){
      showToast?.(`La touche ${keyCodeToLabel(code)} est déjà utilisée par l’action ${duplicateAction + 1}.`);
      return;
    }
    if(duplicateAbility >= 0){
      showToast?.(`La touche ${keyCodeToLabel(code)} est déjà utilisée par la compétence ${duplicateAbility + 1}.`);
      return;
    }
    if(pendingAbilityKeySlot !== null){
      abilityKeys[pendingAbilityKeySlot] = code;
      store.state.abilityKeybinds = normalizeAbilityKeybinds(abilityKeys, actionKeys);
      showToast?.(`Compétence ${pendingAbilityKeySlot + 1} assignée à ${keyCodeToLabel(code)}.`);
      pendingAbilityKeySlot = null;
    }else{
      actionKeys[pendingKeySlot] = code;
      store.state.slotKeybinds = normalizeSlotKeybinds(actionKeys);
      store.state.abilityKeybinds = normalizeAbilityKeybinds(abilityKeys, store.state.slotKeybinds);
      showToast?.(`Action ${pendingKeySlot + 1} assignée à ${keyCodeToLabel(code)}.`);
      pendingKeySlot = null;
    }
    saveState?.();
    refreshActionBar?.();
    render();
  }, {capture:true});

  documentRef.addEventListener("fullscreenchange", render);

  return {isOpen, render, renderContent};
}
