import { getTutorialQuestIds } from "../../shared/tutorial.js?v=20260726-kharon1";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[char]);
}

export function isQuestAbandonProtected(questId, tutorial, firmId){
  return ["active", "paused"].includes(tutorial?.status)
    && getTutorialQuestIds(firmId).includes(String(questId || ""));
}

export function renderQuestAbandonAction({questId, tutorial, firmId}){
  const protectedQuest = isQuestAbandonProtected(questId, tutorial, firmId);
  return `<div class="quest-abandon-action">
    <button class="quest-abandon-button" type="button" data-abandon-quest="${escapeHtml(questId)}" ${protectedQuest ? "disabled" : ""}>Abandonner la quête</button>
    ${protectedQuest ? `<small>Mission nécessaire au tutoriel en cours.</small>` : ""}
  </div>`;
}

// This controller only sends a request. The canonical profile removes the quest.
export function createQuestAbandonController({documentRef = document, windowRef = window, getState, getQuests, send, showToast}){
  let dialog = null;
  let questId = "";
  let pending = false;
  let origin = null;
  let timeout = null;

  function clearPending(){
    pending = false;
    if(timeout !== null) windowRef.clearTimeout(timeout);
    timeout = null;
  }

  function activeQuest(id){
    const state = getState();
    const activeIds = Array.isArray(state.activeQuestIds) ? state.activeQuestIds : [state.activeQuestId];
    if(!activeIds.includes(id) || state.completedQuestClaims?.[id]) return null;
    return getQuests().find(quest=>quest.id === id) || null;
  }

  function close(){
    clearPending();
    questId = "";
    dialog?.close();
    dialog?.remove();
    dialog = null;
    if(origin?.isConnected) origin.focus({preventScroll:true});
    origin = null;
  }

  function fail(message){
    clearPending();
    const button = dialog?.querySelector("[data-confirm-quest-abandon]");
    if(button){ button.disabled = false; button.textContent = "Abandonner la quête"; }
    const keep = dialog?.querySelector("[data-keep-quest]");
    if(keep) keep.disabled = false;
    const status = dialog?.querySelector("[data-quest-abandon-status]");
    if(status) status.textContent = message;
  }

  function confirm(){
    if(pending || !questId) return;
    const state = getState();
    if(!activeQuest(questId)){
      close();
      showToast("Cette quête n'est plus en cours.");
      return;
    }
    if(isQuestAbandonProtected(questId, state.tutorial, state.player?.firmId)){
      fail("Cette mission est nécessaire au tutoriel en cours.");
      return;
    }
    // Set pending before emit so a synchronous rejection cannot be lost.
    pending = true;
    const button = dialog.querySelector("[data-confirm-quest-abandon]");
    button.disabled = true;
    button.textContent = "En attente du serveur…";
    dialog.querySelector("[data-keep-quest]").disabled = true;
    dialog.querySelector("[data-quest-abandon-status]").textContent = "";
    if(!send(questId)){
      fail("Connexion au serveur requise. La quête est conservée.");
      return;
    }
    if(pending) timeout = windowRef.setTimeout(()=>{
      fail("Confirmation non reçue. Vérifie ta connexion puis réessaie.");
    }, 10000);
  }

  function open(id, trigger){
    const quest = activeQuest(id);
    if(!quest) return showToast("Cette quête n'est plus en cours.");
    const state = getState();
    if(isQuestAbandonProtected(id, state.tutorial, state.player?.firmId)){
      return showToast("Cette mission est nécessaire au tutoriel en cours.");
    }
    close();
    questId = id;
    origin = trigger;
    dialog = documentRef.createElement("dialog");
    dialog.className = "quest-abandon-dialog";
    dialog.setAttribute("aria-labelledby", "questAbandonTitle");
    dialog.setAttribute("aria-describedby", "questAbandonCopy");
    dialog.innerHTML = `<h2 id="questAbandonTitle">Abandonner cette quête ?</h2>
      <strong data-quest-abandon-title></strong>
      <p id="questAbandonCopy">La progression de cette quête sera effacée. Aucune récompense ne sera reçue.</p>
      <p class="quest-abandon-status" data-quest-abandon-status role="status"></p>
      <div class="quest-abandon-dialog-actions">
        <button type="button" data-keep-quest>Garder la quête</button>
        <button type="button" data-confirm-quest-abandon>Abandonner la quête</button>
      </div>`;
    dialog.querySelector("[data-quest-abandon-title]").textContent = quest.title;
    dialog.querySelector("[data-keep-quest]").addEventListener("click", ()=>{ if(!pending) close(); });
    dialog.querySelector("[data-confirm-quest-abandon]").addEventListener("click", confirm);
    dialog.addEventListener("cancel", event=>{ event.preventDefault(); if(!pending) close(); });
    // Do not route game hotkeys through the modal. Native dialog handles focus.
    dialog.addEventListener("keydown", event=>event.stopPropagation());
    dialog.addEventListener("keyup", event=>event.stopPropagation());
    documentRef.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector("[data-keep-quest]").focus();
  }

  function onClick(event){
    const button = event.target.closest?.("[data-abandon-quest]");
    if(!button || button.disabled) return;
    event.preventDefault();
    open(button.dataset.abandonQuest, button);
  }

  function onChange(event){
    if(!dialog) return;
    const {reason, payload} = event.detail || {};
    if(reason === "quest:abandoned" && payload?.id === questId) close();
    else if(reason === "quest:error" && pending) fail(payload?.message || "Abandon refusé par le serveur.");
    else if(["auth:logout", "auth:replaced", "auth:banned"].includes(reason)) close();
  }

  function onProfile(){
    if(dialog && !activeQuest(questId)) close();
  }

  documentRef.addEventListener("click", onClick);
  windowRef.addEventListener("voidsector:multiplayer-change", onChange);
  windowRef.addEventListener("voidsector:profile-applied", onProfile);
  return {
    close,
    destroy(){
      close();
      documentRef.removeEventListener("click", onClick);
      windowRef.removeEventListener("voidsector:multiplayer-change", onChange);
      windowRef.removeEventListener("voidsector:profile-applied", onProfile);
    }
  };
}
