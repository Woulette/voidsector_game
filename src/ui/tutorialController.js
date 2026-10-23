import { equipment } from "../data/catalog.js?v=20260726-kharon1";
import { getTutorialQuestIds, sanitizeTutorialState } from "../shared/tutorial.js";
import { createTutorialStages, getTutorialRecovery } from "./tutorialStages.js";
import { createTutorialGuidance } from "./tutorialGuidance.js";
import { escapeTutorialHtml, renderTutorialView, tutorialAbandonMarkup } from "./tutorialView.js";

const DEPARTURES = new Set(["launcher_depart","launcher_depart_velox"]);

export function createTutorialController({store,appMode,game,updateTutorial,multiplayer}){
  let root, launcher, abandonDialog, rewardOverlay, guidance, timer;
  let pending = null, retryAt = 0, errorMessage = "", renderedKey = "", collapsed = false;
  let definitions = {}, contextKey = "", rewardKey = "", rewardTimer, previousFocus = null;
  const removers = [];
  const listen = (target,name,handler)=>{
    target.addEventListener(name,handler);
    removers.push(()=>target.removeEventListener(name,handler));
  };
  const state = ()=>store.state || {};
  const stepKey = tutorial=>`${tutorial?.status}:${tutorial?.step}:${tutorial?.revision || 0}`;
  const ready = ()=>state().player?.firmSelected === true && multiplayer?.auth?.profileReady === true;
  const connected = ()=>Boolean(multiplayer?.connected);

  function definition(){
    const player = state().player || {}, key = `${player.firmId}:${player.name}`;
    if(key !== contextKey){
      contextKey = key;
      definitions = createTutorialStages({firmId:player.firmId,playerName:player.name});
    }
    const recovery = getTutorialRecovery(state(),state().tutorial?.step);
    return recovery ? {...recovery,recovery:true} : definitions[state().tutorial?.step];
  }
  function send(kind, expected = state().tutorial){
    if(pending || !ready() || !connected() || !expected) return false;
    // A delayed interaction must never be applied to the following objective.
    if(stepKey(expected) !== stepKey(state().tutorial)) return false;
    const request = {kind,currentStep:expected.step,revision:expected.revision || 0};
    pending = {key:stepKey(expected),startedAt:Date.now()};
    errorMessage = "";
    if(!updateTutorial?.(request)){ pending = null; errorMessage = "La connexion est en cours de rétablissement."; }
    syncStatus();
    return Boolean(pending);
  }
  function syncText(selector,text){
    const element = root?.querySelector(selector);
    if(!element) return;
    if(element.textContent !== text) element.textContent = text;
    element.classList.toggle("hidden",!text);
  }
  function syncStatus(){
    syncText("[data-tutorial-status]",!connected() ? "Connexion interrompue. Reprise à cette étape dès ton retour." : errorMessage || (pending ? "Validation en cours…" : ""));
    root?.querySelectorAll("[data-tutorial-next],[data-tutorial-gift]").forEach(button=>{ button.disabled = Boolean(pending) || !connected(); });
    const abandon = abandonDialog?.querySelector("[data-tutorial-abandon]");
    if(abandon) abandon.disabled = Boolean(pending) || !connected();
  }
  function closeAbandon(){
    abandonDialog.classList.add("hidden");
    if(previousFocus?.isConnected) previousFocus.focus();
  }
  function openAbandon(){
    previousFocus = document.activeElement;
    abandonDialog.classList.remove("hidden");
    abandonDialog.querySelector("[data-tutorial-keep]").focus();
    syncStatus();
  }
  function travel(){
    if(definition()?.mode === "game"){
      document.getElementById("startGameBtn")?.click();
      return;
    }
    try{
      if(window.opener && !window.opener.closed && window.opener.location.origin === window.location.origin){
        window.opener.focus();
        syncText("[data-tutorial-hint]","Reprends dans l'onglet du tableau de bord déjà ouvert.");
        return;
      }
    }catch{ /* A former opener may belong to another origin. */ }
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    const dashboard = window.open(url.toString(),"voidsector-launcher");
    dashboard?.focus();
    if(!dashboard) syncText("[data-tutorial-hint]","Ouvre le tableau de bord dans ton autre onglet Avosoma.");
  }
  function ensureDom(){
    if(root) return;
    root = document.createElement("section");
    root.className = `tutorial-guide hidden tutorial-${appMode}`;
    root.setAttribute("aria-label","Guide de formation");
    launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "tutorial-launcher hidden";
    launcher.textContent = "Reprendre la formation";
    abandonDialog = document.createElement("div");
    abandonDialog.className = "tutorial-abandon-backdrop hidden";
    abandonDialog.innerHTML = tutorialAbandonMarkup;
    rewardOverlay = document.createElement("div");
    rewardOverlay.className = "tutorial-reward-overlay hidden";
    document.body.append(root,launcher,abandonDialog,rewardOverlay);
    guidance = createTutorialGuidance({game,guide:root});
    listen(launcher,"click",()=>send("start"));
    listen(root,"click",event=>{
      if(event.target.closest("[data-tutorial-close]")) openAbandon();
      else if(event.target.closest("[data-tutorial-collapse]")){ collapsed = !collapsed; render(); }
      else if(event.target.closest("[data-tutorial-travel]")) travel();
      else if(event.target.closest("[data-tutorial-next]")) send("advance");
      else if(event.target.closest("[data-tutorial-gift]")) send("claim-reward");
    });
    listen(root,"keydown",event=>event.stopPropagation());
    listen(abandonDialog,"click",event=>{
      if(event.target === abandonDialog || event.target.closest("[data-tutorial-keep]")) closeAbandon();
      if(event.target.closest("[data-tutorial-abandon]") && send("abandon")) closeAbandon();
    });
    listen(abandonDialog,"keydown",event=>{
      event.stopPropagation();
      if(event.key === "Escape"){ event.preventDefault(); closeAbandon(); }
      if(event.key === "Tab"){
        const buttons = [...abandonDialog.querySelectorAll("button")].filter(button=>!button.disabled);
        const index = buttons.indexOf(document.activeElement);
        event.preventDefault();
        buttons[(index+(event.shiftKey ? buttons.length-1 : 1))%buttons.length]?.focus();
      }
    });
  }
  function render(){
    ensureDom();
    const tutorial = state().tutorial, stage = definition();
    const visible = ready() && tutorial?.status === "active" && stage;
    launcher.classList.toggle("hidden",!ready() || !["pending","paused"].includes(tutorial?.status));
    root.classList.toggle("hidden",!visible);
    if(!visible){ guidance.hide(); abandonDialog.classList.add("hidden"); renderedKey = ""; return; }
    const recoveryKey = stage.recovery ? `${stage.mode}:${stage.objective}:${stage.message}` : "";
    const key = `${stepKey(tutorial)}:${contextKey}:${appMode}:${collapsed}:${recoveryKey}`;
    if(key !== renderedKey){
      const focusWasInside = root.contains(document.activeElement);
      const wasCollapse = document.activeElement?.hasAttribute("data-tutorial-collapse");
      renderedKey = key;
      root.innerHTML = renderTutorialView({tutorial,definition:stage,firmId:state().player.firmId,appMode,collapsed});
      root.classList.toggle("tutorial-dialogue",Boolean(stage.dialogue));
      if(focusWasInside) root.querySelector(wasCollapse ? "[data-tutorial-collapse]" : "[data-tutorial-next],[data-tutorial-travel],[data-tutorial-gift],[data-tutorial-collapse]")?.focus();
    }
    syncStatus();
  }
  function showRewardAnimation(itemId){
    const item = equipment.find(entry=>entry.id === itemId);
    if(!item) return;
    const key = `${itemId}:${state().tutorial?.completedAt}`;
    if(key === rewardKey) return;
    rewardKey = key;
    const e = escapeTutorialHtml;
    rewardOverlay.innerHTML = `<section class="tutorial-reward-card" role="status"><span>FORMATION ACCOMPLIE</span><img src="${e(item.img)}" alt=""><h2>${e(item.name)}</h2><p>Cadeau du commandement ajouté à ton inventaire.</p></section>`;
    rewardOverlay.classList.remove("hidden");
    clearTimeout(rewardTimer);
    rewardTimer = setTimeout(()=>rewardOverlay.classList.add("hidden"),4200);
  }
  function refresh(){
    if(pending && pending.key !== stepKey(state().tutorial)){ pending = null; errorMessage = ""; }
    render();
  }
  function onMultiplayerChange(event){
    const {reason = "",payload = {}} = event.detail || {};
    if(reason === "quest:accepted" && getTutorialQuestIds(state().player?.firmId).includes(String(payload.id || ""))) game?.closeTutorialInteractionPanel?.();
    if(reason === "tutorial:updated"){
      const incoming = payload.tutorial;
      if(incoming && Number(incoming.revision || 0) >= Number(state().tutorial?.revision || 0)) state().tutorial = sanitizeTutorialState(incoming);
      pending = null; errorMessage = "";
      if(payload.rewardItemId === "laser_mk3") showRewardAnimation(payload.rewardItemId);
    }else if(reason === "tutorial:error"){
      pending = null; retryAt = Date.now()+3000;
      errorMessage = payload.message || "L'action n'a pas encore été confirmée. Vérifie l'objectif indiqué.";
    }
    refresh();
  }
  function tick(){
    if(document.hidden) return;
    render();
    if(!ready()) return;
    const now = Date.now(), tutorial = state().tutorial, stage = definition();
    if(pending && now-pending.startedAt > 7000){ pending = null; retryAt = now+1500; errorMessage = "Confirmation en attente. Reconnexion ou nouvelle tentative possible."; }
    if((tutorial?.status === "pending" || (tutorial?.status === "active" && tutorial.needsReview)) && connected() && now >= retryAt) send("start");
    if(tutorial?.status !== "active" || !stage) return;
    if(stage.mode !== appMode){
      guidance.hide();
      if(!stage.recovery && appMode === "game" && DEPARTURES.has(tutorial.step) && game?.running && !pending && now >= retryAt) send("advance");
      return;
    }
    if(!abandonDialog.classList.contains("hidden")){ guidance.hide(); return; }
    const {snapshot,hint,instruction} = guidance.update(stage,state(),tutorial.step);
    syncText("[data-tutorial-objective]",instruction || stage.objective || stage.title);
    syncText("[data-tutorial-hint]",hint);
    syncText("[data-tutorial-progress]",stage.progress?.(state(),snapshot) || "");
    if(!pending && !stage.manual && !DEPARTURES.has(tutorial.step) && now >= retryAt && stage.condition?.(state(),snapshot)) send("advance");
  }
  function init(){
    if(timer) return;
    ensureDom();
    listen(window,"voidsector:profile-applied",refresh);
    listen(window,"voidsector:multiplayer-change",onMultiplayerChange);
    listen(document,"visibilitychange",refresh);
    timer = window.setInterval(tick,100);
    render();
  }
  function destroy(){
    clearInterval(timer); clearTimeout(rewardTimer); timer = null;
    removers.splice(0).forEach(remove=>remove());
    guidance?.destroy();
    [root,launcher,abandonDialog,rewardOverlay].forEach(element=>element?.remove());
    root = null;
  }
  return {init,render,destroy};
}
