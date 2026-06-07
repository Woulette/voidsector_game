import { hydrateCombatUiLayout, persistCombatUiLayout } from "./combatUiLayout.js";

const CHAT_TABS = [
  {id:"global", label:"Global"},
  {id:"firm", label:"Firme", locked:true},
  {id:"guild", label:"Guilde", locked:true},
  {id:"log", label:"Log"}
];

const MAX_LOG_ROWS = 160;

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function timeLabel(value){
  return new Date(Number(value || Date.now())).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"});
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function finiteNumber(value){
  return value !== null && value !== "" && Number.isFinite(Number(value))
    ? Number(value)
    : null;
}

function ensureChatLogs(store){
  if(!Array.isArray(store.state.chatLogs)) store.state.chatLogs = [];
  return store.state.chatLogs;
}

function compactLogParts(entry, fmt){
  const parts = [];
  if(entry.label) parts.push(String(entry.label));
  if(Number(entry.credits || 0) > 0) parts.push(`+${fmt(entry.credits)} credits`);
  if(Number(entry.premium || 0) > 0) parts.push(`+${fmt(entry.premium)} NOVA`);
  if(Number(entry.xp || 0) > 0) parts.push(`+${fmt(entry.xp)} XP`);
  if(Number(entry.reputation || 0) > 0) parts.push(`+${fmt(entry.reputation)} reputation`);
  return parts;
}

function lootPickedLabel(payload, fmt){
  const amount = Math.max(1, Math.round(Number(payload.amount || 1)));
  const name = payload.name || payload.portalName || payload.itemId || payload.ammoId || payload.materialId || "Butin";
  return `${name}${amount > 1 ? ` x${fmt(amount)}` : ""}`;
}

export function createCombatChat({
  store,
  saveState,
  multiplayer,
  sendChatMessage,
  fmt,
  showToast,
  windowRef = window,
  documentRef = document
}){
  let activeTab = "global";
  let layoutHydrated = false;
  hydrateCombatUiLayout(store);
  const panel = documentRef.getElementById("combatChatPanel");
  const toggleBtn = documentRef.querySelector("[data-chat-toggle]");
  const closeBtn = documentRef.querySelector("[data-chat-close]");
  const tabsEl = documentRef.getElementById("combatChatTabs");
  const messagesEl = documentRef.getElementById("combatChatMessages");
  const formEl = documentRef.getElementById("combatChatForm");
  const inputEl = documentRef.getElementById("combatChatInput");
  const headerEl = panel?.querySelector("[data-chat-drag-handle]");
  const resizeEl = panel?.querySelector("[data-chat-resize]");

  function ensureLayoutHydrated(){
    if(layoutHydrated || !store.state) return;
    hydrateCombatUiLayout(store);
    layoutHydrated = true;
  }

  function getLayout(){
    ensureLayoutHydrated();
    return store.state?.uiLayout?.combatChatPanel || {};
  }

  function getPanelBounds(){
    const parent = panel?.offsetParent;
    return {
      parentRect:parent?.getBoundingClientRect?.() || {left:0, top:0},
      width:Math.max(0, parent?.clientWidth || windowRef.innerWidth),
      height:Math.max(0, parent?.clientHeight || windowRef.innerHeight)
    };
  }

  function saveLayout({open = !panel?.classList.contains("hidden")} = {}){
    ensureLayoutHydrated();
    if(!store.state) return;
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    const previous = getLayout();
    const rect = open && panel && !panel.classList.contains("hidden") ? panel.getBoundingClientRect() : null;
    const bounds = rect ? getPanelBounds() : null;
    const validRect = rect && bounds && rect.width >= 120 && rect.height >= 120 && bounds.width >= 120 && bounds.height >= 120;
    store.state.uiLayout.combatChatPanel = {
      ...previous,
      ...(validRect ? {
        left:Math.round(rect.left - bounds.parentRect.left),
        top:Math.round(rect.top - bounds.parentRect.top),
        width:Math.round(rect.width),
        height:Math.round(rect.height)
      } : {}),
      open:Boolean(open)
    };
    persistCombatUiLayout(store);
    saveState?.();
  }

  function applyLayout(){
    if(!panel) return;
    ensureLayoutHydrated();
    const layout = getLayout();
    const bounds = getPanelBounds();
    const defaultWidth = 520;
    const defaultHeight = 270;
    const savedWidth = finiteNumber(layout.width);
    const savedHeight = finiteNumber(layout.height);
    const savedLeft = finiteNumber(layout.left);
    const savedTop = finiteNumber(layout.top);
    const width = clamp(savedWidth ?? defaultWidth, 340, Math.max(340, bounds.width - 24));
    const height = clamp(savedHeight ?? defaultHeight, 190, Math.max(190, bounds.height - 86));
    const left = savedLeft !== null ? clamp(savedLeft, 8, Math.max(8, bounds.width - width - 8)) : 16;
    const top = savedTop !== null ? clamp(savedTop, 8, Math.max(8, bounds.height - height - 8)) : Math.max(12, bounds.height - height - 58);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = `${width}px`;
    panel.style.height = `${height}px`;
  }

  function renderTabs(){
    if(!tabsEl) return;
    tabsEl.innerHTML = CHAT_TABS.map(tab=>`
      <button class="${activeTab === tab.id ? "active" : ""}" data-chat-tab="${tab.id}" type="button">
        <strong>${escapeHtml(tab.label)}</strong>${tab.locked ? "<span>A venir</span>" : ""}
      </button>
    `).join("");
  }

  function renderGlobalMessages(){
    const messages = (multiplayer.chatMessages || [])
      .filter(message=>String(message.channel || "global") === "global")
      .slice(-80);
    if(!messages.length) return `<div class="combat-chat-empty">Aucun message global.</div>`;
    return messages.map(message=>`
      <div class="combat-chat-row">
        <time>${escapeHtml(timeLabel(message.at))}</time>
        <strong>${escapeHtml(message.author?.name || "Pilote")}</strong>
        <span>${escapeHtml(message.text || "")}</span>
      </div>
    `).join("");
  }

  function renderLogMessages(){
    const rows = ensureChatLogs(store).slice(-MAX_LOG_ROWS);
    if(!rows.length) return `<div class="combat-chat-empty">Aucun gain enregistre.</div>`;
    return rows.map(entry=>{
      const title = entry.enemyName || entry.enemyType || (entry.kind === "loot" ? "Ramassage" : "Monstre");
      const parts = compactLogParts(entry, fmt);
      return `
        <div class="combat-chat-row log">
          <time>${escapeHtml(timeLabel(entry.at))}</time>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(parts.join(" - ") || "Gain sans valeur")}</span>
        </div>
      `;
    }).join("");
  }

  function renderLockedTab(label){
    return `<div class="combat-chat-empty">Canal ${escapeHtml(label)} prevu pour plus tard.</div>`;
  }

  function render(){
    if(!panel || panel.classList.contains("hidden")) return;
    renderTabs();
    if(messagesEl){
      if(activeTab === "global") messagesEl.innerHTML = renderGlobalMessages();
      else if(activeTab === "log") messagesEl.innerHTML = renderLogMessages();
      else messagesEl.innerHTML = renderLockedTab(activeTab === "firm" ? "firme" : "guilde");
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    if(formEl){
      const canSend = activeTab === "global";
      formEl.classList.toggle("hidden", activeTab === "log");
      formEl.classList.toggle("locked", !canSend && activeTab !== "log");
      if(inputEl){
        inputEl.disabled = !canSend;
        inputEl.placeholder = canSend ? "Message global..." : "Canal a venir";
      }
    }
  }

  function setOpen(open){
    if(!panel) return;
    panel.classList.toggle("hidden", !open);
    toggleBtn?.classList.toggle("active", open);
    if(open){
      applyLayout();
      render();
      if(activeTab === "global") setTimeout(()=>inputEl?.focus(), 0);
    }
    saveLayout({open});
  }

  function appendLog(detail = {}){
    const logs = ensureChatLogs(store);
    logs.push({at:Date.now(), ...detail});
    if(logs.length > MAX_LOG_ROWS) logs.splice(0, logs.length - MAX_LOG_ROWS);
    saveState?.();
    if(activeTab === "log") render();
  }

  function installDrag(){
    headerEl?.addEventListener("pointerdown", e=>{
      if(e.target.closest("button")) return;
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      headerEl.setPointerCapture?.(e.pointerId);
      const move = event=>{
        const nextRect = panel.getBoundingClientRect();
        const bounds = getPanelBounds();
        panel.style.left = `${clamp(event.clientX - bounds.parentRect.left - offsetX, 8, Math.max(8, bounds.width - nextRect.width - 8))}px`;
        panel.style.top = `${clamp(event.clientY - bounds.parentRect.top - offsetY, 8, Math.max(8, bounds.height - nextRect.height - 8))}px`;
      };
      const stop = event=>{
        headerEl.releasePointerCapture?.(event.pointerId);
        windowRef.removeEventListener("pointermove", move);
        windowRef.removeEventListener("pointerup", stop);
        windowRef.removeEventListener("pointercancel", stop);
        saveLayout({open:true});
      };
      windowRef.addEventListener("pointermove", move);
      windowRef.addEventListener("pointerup", stop);
      windowRef.addEventListener("pointercancel", stop);
    });
  }

  function installResize(){
    resizeEl?.addEventListener("pointerdown", e=>{
      e.preventDefault();
      e.stopPropagation();
      const rect = panel.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;
      resizeEl.setPointerCapture?.(e.pointerId);
      const move = event=>{
        const bounds = getPanelBounds();
        const localLeft = rect.left - bounds.parentRect.left;
        const localTop = rect.top - bounds.parentRect.top;
        panel.style.width = `${clamp(startWidth + event.clientX - startX, 340, Math.max(340, bounds.width - localLeft - 8))}px`;
        panel.style.height = `${clamp(startHeight + event.clientY - startY, 190, Math.max(190, bounds.height - localTop - 8))}px`;
      };
      const stop = event=>{
        resizeEl.releasePointerCapture?.(event.pointerId);
        windowRef.removeEventListener("pointermove", move);
        windowRef.removeEventListener("pointerup", stop);
        windowRef.removeEventListener("pointercancel", stop);
        saveLayout({open:true});
      };
      windowRef.addEventListener("pointermove", move);
      windowRef.addEventListener("pointerup", stop);
      windowRef.addEventListener("pointercancel", stop);
    });
  }

  toggleBtn?.addEventListener("click", e=>{
    e.preventDefault();
    e.stopPropagation();
    setOpen(panel?.classList.contains("hidden"));
  });
  closeBtn?.addEventListener("click", e=>{
    e.preventDefault();
    setOpen(false);
  });
  tabsEl?.addEventListener("click", e=>{
    const btn = e.target.closest("[data-chat-tab]");
    if(!btn) return;
    activeTab = btn.dataset.chatTab || "global";
    render();
  });
  formEl?.addEventListener("submit", e=>{
    e.preventDefault();
    const text = String(inputEl?.value || "").trim();
    if(!text) return;
    if(activeTab !== "global"){
      showToast?.("Ce canal n'est pas encore disponible.");
      return;
    }
    if(!multiplayer.connected || !sendChatMessage?.({channel:"global", text})){
      showToast?.("Chat indisponible.");
      return;
    }
    inputEl.value = "";
  });
  panel?.addEventListener("pointerup", ()=>saveLayout({open:!panel.classList.contains("hidden")}));
  windowRef.addEventListener("resize", ()=>{
    if(!panel?.classList.contains("hidden")) applyLayout();
  });
  windowRef.addEventListener("voidsector:multiplayer-change", event=>{
    const reason = event.detail?.reason;
    if(reason === "chat:message" || reason === "connection:disconnect") render();
    if(reason === "loot:picked"){
      const payload = event.detail?.payload || {};
      appendLog({
        kind:"loot",
        enemyName:"Ramassage",
        label:lootPickedLabel(payload, fmt),
        at:payload.at || Date.now()
      });
    }
  });
  windowRef.addEventListener("voidsector:combat-log", event=>appendLog(event.detail || {}));
  windowRef.addEventListener("voidsector:profile-applied", ()=>{
    layoutHydrated = false;
    hydrateCombatUiLayout(store);
    layoutHydrated = true;
    applyLayout();
    if(getLayout().open) setOpen(true);
  });
  installDrag();
  installResize();
  applyLayout();
  if(getLayout().open) setOpen(true);

  return {
    open:()=>setOpen(true),
    close:()=>setOpen(false),
    toggle:()=>setOpen(panel?.classList.contains("hidden")),
    render,
    appendLog
  };
}
