import { renderCombatQuestTracker as renderCombatQuestTrackerHtml } from "./questTracker.js";
import { renderSpawnPanelContent } from "./spawnPanel.js";
import {
  multiplayer,
  connectMultiplayer,
  inviteMultiplayerPlayer,
  startCoopTestInstance
} from "../../multiplayer/client.js";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

const GLOBAL_MAP_NODES = [
  {id:"solaris-01", firm:"solaris", name:"SOLARIS-01", x:9, y:8},
  {id:"solaris-02", firm:"solaris", name:"SOLARIS-02", x:20, y:16},
  {id:"solaris-03", firm:"solaris", name:"SOLARIS-03", x:36, y:16},
  {id:"solaris-04", firm:"solaris", name:"SOLARIS-04", x:20, y:29},
  {id:"solaris-05", firm:"solaris", name:"SOLARIS-05", x:36, y:29},
  {id:"virdis-01", firm:"virdis", name:"VIRDIS-01", x:91, y:8},
  {id:"virdis-02", firm:"virdis", name:"VIRDIS-02", x:80, y:16},
  {id:"virdis-03", firm:"virdis", name:"VIRDIS-03", x:64, y:16},
  {id:"virdis-04", firm:"virdis", name:"VIRDIS-04", x:80, y:29},
  {id:"virdis-05", firm:"virdis", name:"VIRDIS-05", x:64, y:29},
  {id:"astra-01", firm:"astra", name:"ASTRA-01", x:9, y:66},
  {id:"astra-02", firm:"astra", name:"ASTRA-02", x:20, y:58},
  {id:"astra-03", firm:"astra", name:"ASTRA-03", x:36, y:58},
  {id:"astra-04", firm:"astra", name:"ASTRA-04", x:20, y:45},
  {id:"astra-05", firm:"astra", name:"ASTRA-05", x:36, y:45},
  {id:"cyan-01", firm:"cyan", name:"CYAN-01", x:91, y:66},
  {id:"cyan-02", firm:"cyan", name:"CYAN-02", x:80, y:58},
  {id:"cyan-03", firm:"cyan", name:"CYAN-03", x:64, y:58},
  {id:"cyan-04", firm:"cyan", name:"CYAN-04", x:80, y:45},
  {id:"cyan-05", firm:"cyan", name:"CYAN-05", x:64, y:45},
  {id:"nexus", firm:"nexus", name:"NEXUS PRIME", x:50, y:36}
];

const GLOBAL_MAP_LINKS = [
  ["solaris-01","solaris-02"],["solaris-02","solaris-03"],["solaris-02","solaris-04"],["solaris-03","solaris-04"],["solaris-03","solaris-05"],["solaris-04","solaris-05"],["solaris-05","nexus"],
  ["virdis-01","virdis-02"],["virdis-02","virdis-03"],["virdis-02","virdis-04"],["virdis-03","virdis-04"],["virdis-03","virdis-05"],["virdis-04","virdis-05"],["virdis-05","nexus"],
  ["astra-01","astra-02"],["astra-02","astra-03"],["astra-02","astra-04"],["astra-03","astra-04"],["astra-03","astra-05"],["astra-04","astra-05"],["astra-05","nexus"],
  ["cyan-01","cyan-02"],["cyan-02","cyan-03"],["cyan-02","cyan-04"],["cyan-03","cyan-04"],["cyan-03","cyan-05"],["cyan-04","cyan-05"],["cyan-05","nexus"],
  ["solaris-03","virdis-03"],["solaris-05","virdis-05"],
  ["astra-03","cyan-03"],["astra-05","cyan-05"],
  ["solaris-04","astra-04"],["virdis-04","cyan-04"],
  ["virdis-05","cyan-05"],["astra-05","solaris-05"]
];

function nodeById(id){ return GLOBAL_MAP_NODES.find(node=>node.id === id); }

const GLOBAL_FIRMS = {
  astra:{name:"Astra Dominion", short:"ASTRA"},
  solaris:{name:"Solaris Pact", short:"SOLARIS"},
  virdis:{name:"Virdis Union", short:"VIRDIS"},
  cyan:{name:"Cyan Coalition", short:"CYAN"}
};

function clampPercent(value){
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export function createCombatPanels({
  store,
  saveState,
  showToast,
  updateHud,
  maps = [],
  getCurrentMap,
  getPlayer,
  ammoTypes = [],
  enemyTypes,
  getAllRawMaterials,
  getActiveQuest,
  getActiveQuests,
  getAllQuests,
  getQuestProgress,
  claimQuest,
  getItem,
  getRefineryJob,
  getRefineryRecipes,
  getMaterialCount,
  getShipCargo,
  getShipCargoCapacity,
  getShipCargoUsed,
  getShipRefineryRecipeData,
  getCombatBoostSummary,
  getCombatBoostTooltip,
  getEquipmentUpgradeLevel,
  getEquipmentUpgradeCost,
  isRefineryComplete,
  formatDuration,
  graphicsQualityPresets = [],
  getGraphicsQuality
}){
  let spawnPanelMode = null;
  let spawnPanelRefreshT = 0;
  let utilityPanelRefreshT = 0;
  let groupMembers = [];
  let selectedQuestId = null;
  let selectedQuestCategory = "available";
  let selectedQuestType = "normal";
  let showLockedQuests = false;
  let combatQuestDetailTab = "quest";
  let refineryPanelTab = "raffinage";
  let selectedShipRefineRecipeId = null;
  let groupHudRefreshT = 0;
  let groupHudDragReady = false;

  function reset(){
    groupMembers = [];
    const activeQuest = getActiveQuest();
    selectedQuestCategory = activeQuest ? "active" : "available";
    selectedQuestType = activeQuest?.category || "normal";
    selectedQuestId = activeQuest?.id || getAllQuests().find(quest=>!store.state.completedQuestClaims?.[quest.id])?.id || null;
    combatQuestDetailTab = "quest";
    refineryPanelTab = "raffinage";
    selectedShipRefineRecipeId = null;
    spawnPanelRefreshT = 0;
    utilityPanelRefreshT = 0;
    groupHudRefreshT = 0;
    refreshGroupFloatingHud();
  }

  function getSpawnPanelMode(){
    return spawnPanelMode;
  }

  function closeSpawnPanel(){
    spawnPanelMode = null;
    spawnPanelRefreshT = 0;
    document.getElementById("spawnInteractionPanel")?.classList.add("hidden");
    syncUtilityDockButtons();
  }

  function closeUtilityPanel(){
    document.querySelectorAll(".combat-utility-panel").forEach(panel=>panel.classList.add("hidden"));
    syncUtilityDockButtons();
  }

  function getUtilityPanel(mode){
    if(mode === "quests") return document.getElementById("combatUtilityPanelQuests");
    if(mode === "group") return document.getElementById("combatUtilityPanelGroup");
    if(mode === "map") return document.getElementById("combatUtilityPanelMap");
    if(mode === "settings") return document.getElementById("combatUtilityPanelSettings");
    return null;
  }

  function getUtilityContent(mode){
    if(mode === "quests") return document.getElementById("combatUtilityContentQuests");
    if(mode === "group") return document.getElementById("combatUtilityContentGroup");
    if(mode === "map") return document.getElementById("combatUtilityContentMap");
    if(mode === "settings") return document.getElementById("combatUtilityContentSettings");
    return null;
  }

  function syncUtilityDockButtons(){
    document.querySelectorAll("[data-utility-panel]").forEach(btn=>{
      const mode = btn.dataset.utilityPanel;
      const panel = getUtilityPanel(mode);
      const utilityOpen = !!panel && !panel.classList.contains("hidden");
      const refineryOpen = mode === "refinery" && spawnPanelMode === "refinery" && !document.getElementById("spawnInteractionPanel")?.classList.contains("hidden");
      btn.classList.toggle("active", utilityOpen || refineryOpen);
    });
  }

  function applyUtilityPanelLayout(mode, panel){
    const layout = store.state?.uiLayout?.combatUtilityPanels?.[mode] || store.state?.uiLayout?.combatUtilityPanel;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    panel.style.left = `${Math.max(0, Number(layout.left))}px`;
    panel.style.top = `${Math.max(0, Number(layout.top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function applySpawnPanelLayout(panel){
    const layout = store.state?.uiLayout?.spawnInteractionPanel;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    panel.style.left = `${Math.max(0, Number(layout.left))}px`;
    panel.style.top = `${Math.max(0, Number(layout.top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function saveUtilityPanelLayout(mode, layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    if(!store.state.uiLayout.combatUtilityPanels || typeof store.state.uiLayout.combatUtilityPanels !== "object") store.state.uiLayout.combatUtilityPanels = {};
    store.state.uiLayout.combatUtilityPanels[mode] = layout;
    saveState();
  }

  function saveSpawnPanelLayout(layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    store.state.uiLayout.spawnInteractionPanel = layout;
    saveState();
  }

  function saveGroupFloatingHudLayout(layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    store.state.uiLayout.groupFloatingHud = layout;
    saveState();
  }

  function renderCombatQuestTracker(){
    const activeQuests = getActiveQuests();
    const trackedQuest = getActiveQuest();
    const selected = activeQuests.find(quest=>quest.id === trackedQuest?.id) || activeQuests[0] || null;
    if(selected && store.state.activeQuestId !== selected.id) store.state.activeQuestId = selected.id;
    return renderCombatQuestTrackerHtml({
      activeQuests,
      trackedQuest:selected,
      detailTab:combatQuestDetailTab,
      enemyTypes,
      rawMaterials:getAllRawMaterials(),
      getQuestProgress
    });
  }

  function refreshQuestUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("quests");
    const content = getUtilityContent("quests");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("quests", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderCombatQuestTracker();
    utilityPanelRefreshT = .25;
    syncUtilityDockButtons();
  }

  function getGroupMapLabel(state){
    const id = state?.mapId;
    const found = maps.find(map=>String(map.id) === String(id) || String(map.name) === String(id));
    return found?.name || (id !== undefined && id !== null ? String(id) : "Hors combat");
  }

  function resolveGroupMemberState(member){
    const currentMap = getCurrentMap?.();
    const localPlayer = getPlayer?.();
    if(member.id === multiplayer.playerId && localPlayer){
      return {
        x:localPlayer.x,
        y:localPlayer.y,
        hp:localPlayer.hp,
        maxHp:localPlayer.maxHp,
        shield:localPlayer.shield,
        maxShield:localPlayer.maxShield,
        mapId:currentMap?.id ?? currentMap?.name ?? "unknown",
        updatedAt:Date.now()
      };
    }
    return multiplayer.remotePlayers.get(member.id)?.state || multiplayer.players.find(player=>player.id === member.id)?.state || member.state || null;
  }

  function renderGroupMemberMeter(label, value, max, className){
    const safeMax = Math.max(1, Number(max || value || 1));
    const percent = clampPercent(Number(value || 0) / safeMax * 100);
    return `<div class="group-member-meter ${className}"><span>${label}</span><b>${Math.round(Number(value || 0))}/${Math.round(safeMax)}</b><i style="width:${percent}%"></i></div>`;
  }

  function renderGroupMemberCard(member){
    const currentMap = getCurrentMap?.();
    const localPlayer = getPlayer?.();
    const state = resolveGroupMemberState(member);
    const isLocal = member.id === multiplayer.playerId;
    const role = member.id === multiplayer.group?.leaderId ? "Chef" : "Membre";
    const sameMap = state && currentMap && String(state.mapId) === String(currentMap.id);
    const distance = state && localPlayer && sameMap && !isLocal ? Math.round(Math.hypot(Number(state.x || 0) - localPlayer.x, Number(state.y || 0) - localPlayer.y)) : null;
    const lastSeen = state?.updatedAt ? Math.max(0, Math.round((Date.now() - Number(state.updatedAt || 0)) / 1000)) : null;
    return `
      <div class="group-member-card ${isLocal ? "local" : ""}">
        <div class="group-member-head">
          <strong>${escapeHtml(member.name || (isLocal ? multiplayer.name : "Pilote"))}</strong>
          <span>${role}${isLocal ? " · Toi" : ""}</span>
        </div>
        <div class="group-member-meta">
          <span>Carte <b>${escapeHtml(getGroupMapLabel(state))}</b></span>
          <span>${sameMap ? "Même carte" : "Autre carte"}</span>
          ${distance !== null ? `<span>Distance <b>${distance}</b></span>` : ""}
          ${lastSeen !== null && !isLocal ? `<span>Signal <b>${lastSeen}s</b></span>` : ""}
        </div>
        ${state ? `
          <div class="group-member-meters">
            ${renderGroupMemberMeter("PV", state.hp, state.maxHp, "hp")}
            ${renderGroupMemberMeter("Bouclier", state.shield, state.maxShield, "shield")}
          </div>
        ` : `<p class="group-panel-note">En attente du signal joueur.</p>`}
      </div>
    `;
  }

  function ensureGroupFloatingHud(){
    let hud = document.getElementById("groupFloatingHud");
    if(!hud){
      hud = document.createElement("div");
      hud.id = "groupFloatingHud";
      hud.className = "group-floating-hud frame hidden";
      hud.innerHTML = `<div class="group-floating-head"><strong>Groupe</strong></div><div class="group-floating-content"></div>`;
      document.getElementById("gameScreen")?.appendChild(hud);
    }
    if(!groupHudDragReady){
      groupHudDragReady = true;
      hud.querySelector(".group-floating-head")?.addEventListener("pointerdown", e=>{
        e.preventDefault();
        const rect = hud.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        hud.setPointerCapture?.(e.pointerId);
        hud.style.left = `${rect.left}px`;
        hud.style.top = `${rect.top}px`;
        hud.style.right = "auto";
        hud.style.bottom = "auto";

        const moveHud = moveEvent=>{
          const hudRect = hud.getBoundingClientRect();
          const maxLeft = Math.max(0, window.innerWidth - hudRect.width);
          const maxTop = Math.max(0, window.innerHeight - hudRect.height);
          const left = Math.max(0, Math.min(maxLeft, moveEvent.clientX - offsetX));
          const top = Math.max(0, Math.min(maxTop, moveEvent.clientY - offsetY));
          hud.style.left = `${left}px`;
          hud.style.top = `${top}px`;
        };
        const stopDrag = upEvent=>{
          hud.releasePointerCapture?.(upEvent.pointerId);
          const finalRect = hud.getBoundingClientRect();
          saveGroupFloatingHudLayout({left:finalRect.left, top:finalRect.top});
          window.removeEventListener("pointermove", moveHud);
          window.removeEventListener("pointerup", stopDrag);
          window.removeEventListener("pointercancel", stopDrag);
        };
        window.addEventListener("pointermove", moveHud);
        window.addEventListener("pointerup", stopDrag);
        window.addEventListener("pointercancel", stopDrag);
      });
    }
    return hud;
  }

  function applyGroupFloatingHudLayout(hud){
    const layout = store.state?.uiLayout?.groupFloatingHud;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    hud.style.left = `${Math.max(0, Number(layout.left))}px`;
    hud.style.top = `${Math.max(0, Number(layout.top))}px`;
    hud.style.right = "auto";
    hud.style.bottom = "auto";
  }

  function refreshGroupFloatingHud(){
    const hud = ensureGroupFloatingHud();
    const content = hud.querySelector(".group-floating-content");
    const members = multiplayer.group?.members || [];
    if(!members.length){
      hud.classList.add("hidden");
      if(content) content.innerHTML = "";
      return;
    }
    applyGroupFloatingHudLayout(hud);
    hud.classList.remove("hidden");
    if(content) content.innerHTML = members.map(renderGroupMemberCard).join("");
  }

  function renderGroupUtilityContent(){
    const onlinePlayers = multiplayer.players.filter(player=>player.id !== multiplayer.playerId);
    const members = multiplayer.group?.members || [];
    const currentMap = getCurrentMap?.();
    const localPlayer = getPlayer?.();
    const mapLabel = state=>{
      const id = state?.mapId;
      const found = maps.find(map=>String(map.id) === String(id) || String(map.name) === String(id));
      return found?.name || (id !== undefined && id !== null ? String(id) : "Hors combat");
    };
    const resolveMemberState = member=>{
      if(member.id === multiplayer.playerId && localPlayer){
        return {
          x:localPlayer.x,
          y:localPlayer.y,
          hp:localPlayer.hp,
          maxHp:localPlayer.maxHp,
          shield:localPlayer.shield,
          maxShield:localPlayer.maxShield,
          mapId:currentMap?.id ?? currentMap?.name ?? "unknown",
          updatedAt:Date.now()
        };
      }
      return multiplayer.remotePlayers.get(member.id)?.state || multiplayer.players.find(player=>player.id === member.id)?.state || member.state || null;
    };
    const renderMeter = (label, value, max, className)=>{
      const safeMax = Math.max(1, Number(max || value || 1));
      const percent = clampPercent(Number(value || 0) / safeMax * 100);
      return `<div class="group-member-meter ${className}"><span>${label}</span><b>${Math.round(Number(value || 0))}/${Math.round(safeMax)}</b><i style="width:${percent}%"></i></div>`;
    };
    const membersHtml = members.length
      ? members.map(member=>{
        const state = resolveMemberState(member);
        const isLocal = member.id === multiplayer.playerId;
        const role = member.id === multiplayer.group?.leaderId ? "Chef" : "Membre";
        const sameMap = state && currentMap && String(state.mapId) === String(currentMap.id);
        const distance = state && localPlayer && sameMap && !isLocal ? Math.round(Math.hypot(Number(state.x || 0) - localPlayer.x, Number(state.y || 0) - localPlayer.y)) : null;
        const lastSeen = state?.updatedAt ? Math.max(0, Math.round((Date.now() - Number(state.updatedAt || 0)) / 1000)) : null;
        return `
          <div class="group-member-card ${isLocal ? "local" : ""}">
            <div class="group-member-head">
              <strong>${escapeHtml(member.name || (isLocal ? multiplayer.name : "Pilote"))}</strong>
              <span>${role}${isLocal ? " · Toi" : ""}</span>
            </div>
            <div class="group-member-meta">
              <span>Carte <b>${escapeHtml(mapLabel(state))}</b></span>
              <span>${sameMap ? "Même carte" : "Autre carte"}</span>
              ${distance !== null ? `<span>Distance <b>${distance}</b></span>` : ""}
              ${lastSeen !== null && !isLocal ? `<span>Signal <b>${lastSeen}s</b></span>` : ""}
            </div>
            ${state ? `
              <div class="group-member-meters">
                ${renderMeter("PV", state.hp, state.maxHp, "hp")}
                ${renderMeter("Bouclier", state.shield, state.maxShield, "shield")}
              </div>
            ` : `<p class="group-panel-note">En attente du signal joueur.</p>`}
          </div>
        `;
      }).join("")
      : `<p class="group-panel-note">Aucun groupe actif.</p>`;
    const invitesHtml = multiplayer.invites.length
      ? `<div class="group-panel-list">${multiplayer.invites.map(invite=>`<div class="group-panel-member"><strong>${escapeHtml(invite.fromName || "Pilote")}</strong><span>Invitation</span><button class="blue-button small" data-mp-action="accept" data-group-id="${escapeHtml(invite.groupId)}" type="button">ACCEPTER</button><button class="blue-button small secondary" data-mp-action="decline" data-group-id="${escapeHtml(invite.groupId)}" type="button">REFUSER</button></div>`).join("")}</div>`
      : "";
    const playersHtml = onlinePlayers.length
      ? onlinePlayers.map(player=>`<div class="group-panel-member"><strong>${escapeHtml(player.name)}</strong><span>${player.groupId ? "En groupe" : "En ligne"}</span><button class="blue-button small" data-mp-action="invite" data-player-id="${escapeHtml(player.id)}" type="button">INVITER</button></div>`).join("")
      : `<p class="group-panel-note">Aucun autre joueur connecte.</p>`;
    const status = multiplayer.connected ? `Connecte : ${escapeHtml(multiplayer.name)}` : multiplayer.connecting ? "Connexion..." : "Hors ligne";
    return `
      <div class="group-panel-form">
        <input id="mpPlayerName" type="text" maxlength="24" value="${escapeHtml(multiplayer.name || store.state?.player?.name || "NOVA-37")}" placeholder="Pseudo">
        <input id="mpServerUrl" type="text" value="${escapeHtml(multiplayer.serverUrl)}" placeholder="URL serveur">
        ${multiplayer.connected
          ? `<button class="blue-button small secondary" data-mp-action="disconnect" type="button">DECONNECTER</button>`
          : `<button class="blue-button small" data-mp-action="connect" type="button">${multiplayer.connecting ? "CONNEXION" : "CONNECTER"}</button>`}
      </div>
      <p class="group-panel-note">${status}. Pour jouer a distance, le serveur doit etre lance et accessible par les deux joueurs.</p>
      ${invitesHtml}
      <div class="group-panel-form">
        <button class="blue-button small" data-mp-action="create-group" type="button">CREER GROUPE</button>
        <button class="blue-button small" data-mp-action="start-coop-test" type="button">INSTANCE TEST</button>
        <button class="blue-button small secondary" data-mp-action="leave-group" type="button">QUITTER GROUPE</button>
      </div>
      <div class="group-panel-list">${playersHtml}</div>
    `;
  }

  function refreshGroupUtilityPanel({show = false, focus = false} = {}){
    const panel = getUtilityPanel("group");
    const content = getUtilityContent("group");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("group", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderGroupUtilityContent();
    syncUtilityDockButtons();
    if(focus) document.getElementById("mpPlayerName")?.focus();
  }

  function isEditingGroupUtilityPanel(){
    const panel = getUtilityPanel("group");
    const active = document.activeElement;
    return !!panel && !!active && panel.contains(active) && !!active.closest("input, textarea, select");
  }

  window.addEventListener("voidsector:multiplayer-change", ()=>{
    const panel = getUtilityPanel("group");
    if(panel && !panel.classList.contains("hidden") && !isEditingGroupUtilityPanel()) refreshGroupUtilityPanel({show:true});
    refreshGroupFloatingHud();
  });

  function mapPercent(map, point, axis){
    const size = axis === "x" ? map.width : map.height;
    if(!size) return 50;
    const value = axis === "x" ? point?.x : point?.y;
    return Math.max(3, Math.min(97, ((Number(value || 0) + size / 2) / size) * 100));
  }

  function renderGlobalMap(current){
    const currentName = String(current?.name || "").toUpperCase();
    const orderedLinks = [...GLOBAL_MAP_LINKS].sort(([fromA, toA], [fromB, toB])=>{
      const aFrom = nodeById(fromA);
      const aTo = nodeById(toA);
      const bFrom = nodeById(fromB);
      const bTo = nodeById(toB);
      const aInternal = aFrom && aTo && aFrom.firm === aTo.firm && aFrom.firm !== "nexus";
      const bInternal = bFrom && bTo && bFrom.firm === bTo.firm && bFrom.firm !== "nexus";
      return Number(aInternal) - Number(bInternal);
    });
    const links = orderedLinks.map(([fromId, toId])=>{
      const from = nodeById(fromId);
      const to = nodeById(toId);
      if(!from || !to) return "";
      const sameFirm = from.firm === to.firm && from.firm !== "nexus";
      const className = sameFirm ? `firm-link ${from.firm}` : "cross-link";
      const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      return `<path class="route-back ${className}" d="${d}"></path><path class="route-main ${className}" d="${d}"></path>`;
    }).join("");
    const nodes = GLOBAL_MAP_NODES.map(node=>{
      const active = node.name.toUpperCase() === currentName;
      const isNexus = node.firm === "nexus";
      return `<g class="galaxy-node ${node.firm} ${active ? "active" : ""} ${node.firm === "nexus" ? "central" : ""}" transform="translate(${node.x} ${node.y})">
        ${isNexus
          ? `<circle class="node-halo" r="8.5"></circle><rect class="node-ring" x="-5.2" y="-5.2" width="10.4" height="10.4"></rect><rect class="node-core" x="-1.9" y="-1.9" width="3.8" height="3.8"></rect>`
          : `<rect class="node-halo" x="-5.4" y="-4.2" width="10.8" height="8.4"></rect><rect class="node-ring" x="-3.5" y="-2.8" width="7" height="5.6"></rect><rect class="node-core" x="-1.35" y="-1.05" width="2.7" height="2.1"></rect>`}
        <text x="0" y="${node.firm === "nexus" ? -8.2 : -5.0}">${escapeHtml(node.name)}</text>
      </g>`;
    }).join("");
    const legend = Object.entries(GLOBAL_FIRMS).map(([id, firm])=>`<span class="${id}"><i></i>${escapeHtml(firm.short)}</span>`).join("");
    return `<div class="combat-galaxy-map">
      <div class="combat-galaxy-legend">${legend}</div>
      <svg viewBox="0 0 100 72" role="img" aria-label="Carte globale des firmes">
        <defs>
          <radialGradient id="galaxyNexusGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(245,222,196,.44)"></stop>
            <stop offset="100%" stop-color="rgba(245,222,196,0)"></stop>
          </radialGradient>
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation=".9" result="blur"></feGaussianBlur>
            <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
          </filter>
        </defs>
        <g class="sector-layer">
          <polygon class="sector solaris" points="5,4 45,4 45,33 20,33 5,22"></polygon>
          <polygon class="sector virdis" points="55,4 95,4 95,22 80,33 55,33"></polygon>
          <polygon class="sector astra" points="5,42 20,68 45,68 45,40 20,40"></polygon>
          <polygon class="sector cyan" points="55,40 80,40 95,50 95,68 55,68"></polygon>
        </g>
        <circle class="nexus-field" cx="50" cy="36" r="13"></circle>
        <circle class="nexus-ring one" cx="50" cy="36" r="7.2"></circle>
        <circle class="nexus-ring two" cx="50" cy="36" r="10.2"></circle>
        <g class="route-layer">${links}</g>
        <g class="node-layer">${nodes}</g>
      </svg>
    </div>`;
  }

  function getMapPortals(map){
    if(!map) return [];
    if(Array.isArray(map.portals)) return map.portals;
    return map.portal ? [map.portal] : [];
  }

  function renderMapUtilityContent(){
    const current = getCurrentMap?.() || maps[0] || {};
    const player = getPlayer?.();
    const spawn = current.spawn || {x:0, y:0};
    const portals = getMapPortals(current);
    const portalLabel = portals.length
      ? portals.map(portal=>maps.find(map=>map.id === portal.targetMap)?.name || portal.label || "Actif").join(" / ")
      : "Aucun";
    const playerPoint = player ? {x:player.x, y:player.y} : spawn;
    return `<div class="combat-map-card">
      <div class="combat-map-head">
        <div><span>Carte globale</span><strong>${escapeHtml(current.name || "Carte")}</strong></div>
        <small>Réseau des firmes · accès Nexus</small>
      </div>
      ${renderGlobalMap(current)}
      <div class="combat-map-meta">
        <span>Position <b>${escapeHtml(current.name || "Inconnue")}</b></span>
        <span>Coord. locale <b>${Math.round(playerPoint.x || 0)} / ${Math.round(playerPoint.y || 0)}</b></span>
        <span>Portail <b>${escapeHtml(portalLabel)}</b></span>
      </div>
      <div class="combat-map-note">Les routes ivoire sont des corridors neutres entre firmes. Les routes internes restent discrètes et teintées par faction.</div>
    </div>`;
  }

  function renderSettingsUtilityContent(){
    const quality = getGraphicsQuality?.() || store.state.graphicsQuality || "high";
    return `<div class="combat-settings-card">
      <div class="combat-map-head">
        <div><span>Rendu</span><strong>Qualite graphique</strong></div>
        <small>Applique en direct</small>
      </div>
      <div class="quality-option-grid combat-quality-grid">
        ${graphicsQualityPresets.map(preset=>`
          <button class="quality-option ${quality === preset.id ? "active" : ""}" data-set-graphics-quality="${preset.id}" type="button">
            <strong>${escapeHtml(preset.name)}</strong>
            <span>${escapeHtml(preset.desc)}</span>
          </button>
        `).join("")}
      </div>
      <p class="group-panel-note">Moyenne retire les nuages proches et garde les asteroides. Basse garde surtout la planete et les etoiles.</p>
    </div>`;
  }

  function refreshMapUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("map");
    const content = getUtilityContent("map");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("map", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderMapUtilityContent();
    utilityPanelRefreshT = .25;
    syncUtilityDockButtons();
  }

  function refreshSettingsUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("settings");
    const content = getUtilityContent("settings");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("settings", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderSettingsUtilityContent();
    syncUtilityDockButtons();
  }

  function openUtilityPanel(mode){
    if(!["group", "quests", "map", "settings"].includes(mode)) return;
    const panel = getUtilityPanel(mode);
    const content = getUtilityContent(mode);
    if(!panel || !content) return;
    if(!panel.classList.contains("hidden")){
      panel.classList.add("hidden");
      syncUtilityDockButtons();
      return;
    }
    if(mode === "quests"){
      refreshQuestUtilityPanel({show:true});
      return;
    }
    if(mode === "map"){
      refreshMapUtilityPanel({show:true});
      return;
    }
    if(mode === "settings"){
      refreshSettingsUtilityPanel({show:true});
      return;
    }
    refreshGroupUtilityPanel({show:true, focus:true});
  }

  function trackCombatQuest(questId){
    if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.includes(questId)){
      return showToast("Cette quete n'est pas en cours.");
    }
    store.state.activeQuestId = questId;
    selectedQuestId = questId;
    saveState();
    refreshQuestUtilityPanel({show:true});
  }

  function setCombatQuestDetailTab(tab){
    combatQuestDetailTab = ["quest", "rewards", "description"].includes(tab) ? tab : "quest";
    refreshQuestUtilityPanel({show:true});
  }

  function claimCombatQuest(questId){
    const result = claimQuest(questId);
    if(!result.ok) return showToast(result.reason);
    saveState();
    showToast(`Recompense recue : ${result.quest.title}`);
    updateHud();
    if(spawnPanelMode) renderSpawnInteractionPanel(spawnPanelMode);
    refreshQuestUtilityPanel({show:true});
  }

  function inviteGroupMember(name){
    const cleaned = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
    const found = multiplayer.players.find(player=>player.name.toLowerCase() === cleaned.toLowerCase() && player.id !== multiplayer.playerId);
    if(found){
      inviteMultiplayerPlayer(found.id);
      return;
    }
    if(!multiplayer.connected) connectMultiplayer({name:cleaned || store.state?.player?.name});
    else showToast("Choisis un joueur connecte a inviter.");
  }

  void startCoopTestInstance;

  function renderSpawnInteractionPanel(mode = spawnPanelMode){
    const panel = document.getElementById("spawnInteractionPanel");
    const title = document.getElementById("spawnPanelTitle");
    const content = document.getElementById("spawnPanelContent");
    if(!panel || !title || !content){
      spawnPanelMode = null;
      return;
    }
    spawnPanelMode = mode;
    spawnPanelRefreshT = 1;
    panel.classList.toggle("refinery-mode", mode === "refinery");
    panel.classList.toggle("quest-mode", mode === "quests");
    if(!mode){
      panel.classList.add("hidden");
      syncUtilityDockButtons();
      return;
    }
    panel.classList.remove("hidden");
    applySpawnPanelLayout(panel);
    syncUtilityDockButtons();
    const inventoryUpgradeables = [...new Set((store.state.inventoryItems || []).map(entry=>entry.itemId))]
      .map(id=>getItem(id))
      .filter(item=>item && ["canon","generateur"].includes(item.category));
    const bestBy = (items, score)=>items.slice().sort((a,b)=>score(b)-score(a))[0] || null;
    const laserUpgrade = bestBy(inventoryUpgradeables.filter(item=>item.category === "canon"), item=>Number(item.weapon?.maxDamage || item.weapon?.damage || 0));
    const rocketUpgrade = bestBy(ammoTypes.filter(ammo=>ammo.weaponClass === "rocket"), ammo=>Number(ammo.damageMax || 0));
    const speedUpgrade = bestBy(inventoryUpgradeables.filter(item=>item.category === "generateur" && Number(item.stats?.vitesse || 0) > 0), item=>Number(item.stats?.vitesse || 0));
    const shieldUpgrade = bestBy(inventoryUpgradeables.filter(item=>item.category === "generateur" && (Number(item.stats?.bouclier || 0) > 0 || Number(item.stats?.regen || 0) > 0)), item=>Number(item.stats?.bouclier || 0) + Number(item.stats?.regen || 0) * 20);
    const droneUid = Array.isArray(store.state.droneLoadout) ? store.state.droneLoadout.find(Boolean) : null;
    const droneUpgrade = droneUid ? getItem(store.state.inventoryItems?.find(entry=>entry.uid === droneUid)?.itemId) : null;
    const upgradeables = [...new Map([laserUpgrade, rocketUpgrade, speedUpgrade, shieldUpgrade, droneUpgrade].filter(Boolean).map(item=>[item.id, item])).values()];
    const rendered = renderSpawnPanelContent({
      mode,
      activeQuest:getActiveQuest(),
      activeQuests:getActiveQuests(),
      selectedQuestId,
      selectedQuestCategory,
      selectedQuestType,
      showLockedQuests,
      quests:getAllQuests(),
      playerLevel:store.state.player.level,
      enemyTypes,
      rawMaterials:getAllRawMaterials(),
      getQuestProgress,
      completedQuestClaims:store.state.completedQuestClaims,
      job:getRefineryJob(),
      recipes:getRefineryRecipes(),
      materials:getAllRawMaterials(),
      getMaterialCount,
      shipCargo:getShipCargo(store.state.activeShip),
      shipCargoUsed:getShipCargoUsed(store.state.activeShip),
      shipCargoCapacity:getShipCargoCapacity(store.state.activeShip),
      refineryTab:refineryPanelTab,
      selectedShipRefineRecipeId,
      upgradeables,
      getShipRefineryRecipeData,
      getCombatBoostSummary,
      getCombatBoostTooltip,
      getEquipmentUpgradeLevel,
      getEquipmentUpgradeCost,
      isRefineryComplete,
      formatDuration
    });
    title.textContent = rendered.title;
    content.innerHTML = rendered.html;
  }

  function selectQuestForPanel(questId){
    selectedQuestId = questId;
    renderSpawnInteractionPanel("quests");
  }

  function selectQuestCategoryForPanel(category){
    selectedQuestCategory = ["available", "active", "completed"].includes(category) ? category : "available";
    const activeIds = new Set(getActiveQuests().map(quest=>quest.id));
    const completedClaims = store.state.completedQuestClaims || {};
    const quests = getAllQuests().filter(quest=>{
      if(completedClaims[quest.id]) return selectedQuestCategory === "completed";
      if(activeIds.has(quest.id)) return selectedQuestCategory === "active";
      if(!showLockedQuests && selectedQuestCategory === "available" && Number(store.state.player?.level || 1) < Number(quest.requiredLevel || 1)) return false;
      return selectedQuestCategory === "available";
    }).filter(quest=>(quest.category || "normal") === selectedQuestType);
    if(!quests.some(quest=>quest.id === selectedQuestId)) selectedQuestId = quests[0]?.id || null;
    renderSpawnInteractionPanel("quests");
  }

  function selectQuestTypeForPanel(type){
    selectedQuestType = ["normal", "daily", "weekly"].includes(type) ? type : "normal";
    const activeIds = new Set(getActiveQuests().map(quest=>quest.id));
    const completedClaims = store.state.completedQuestClaims || {};
    const quests = getAllQuests().filter(quest=>{
      if((quest.category || "normal") !== selectedQuestType) return false;
      if(completedClaims[quest.id]) return selectedQuestCategory === "completed";
      if(activeIds.has(quest.id)) return selectedQuestCategory === "active";
      if(!showLockedQuests && selectedQuestCategory === "available" && Number(store.state.player?.level || 1) < Number(quest.requiredLevel || 1)) return false;
      return selectedQuestCategory === "available";
    });
    if(!quests.some(quest=>quest.id === selectedQuestId)) selectedQuestId = quests[0]?.id || null;
    renderSpawnInteractionPanel("quests");
  }

  function toggleLockedQuestsForPanel(){
    showLockedQuests = !showLockedQuests;
    const activeIds = new Set(getActiveQuests().map(quest=>quest.id));
    const completedClaims = store.state.completedQuestClaims || {};
    const quests = getAllQuests().filter(quest=>{
      if((quest.category || "normal") !== selectedQuestType) return false;
      if(completedClaims[quest.id]) return selectedQuestCategory === "completed";
      if(activeIds.has(quest.id)) return selectedQuestCategory === "active";
      if(!showLockedQuests && selectedQuestCategory === "available" && Number(store.state.player?.level || 1) < Number(quest.requiredLevel || 1)) return false;
      return selectedQuestCategory === "available";
    });
    if(!quests.some(quest=>quest.id === selectedQuestId)) selectedQuestId = quests[0]?.id || null;
    renderSpawnInteractionPanel("quests");
  }

  function setRefineryPanelTab(tab){
    refineryPanelTab = tab === "perfectionnement" ? "perfectionnement" : "raffinage";
    selectedShipRefineRecipeId = null;
    renderSpawnInteractionPanel("refinery");
  }

  function openShipRefineRecipe(recipeId){
    selectedShipRefineRecipeId = recipeId || null;
    refineryPanelTab = "raffinage";
    renderSpawnInteractionPanel("refinery");
  }

  function closeShipRefineRecipe(){
    selectedShipRefineRecipeId = null;
    renderSpawnInteractionPanel("refinery");
  }

  function tick(dt){
    if(spawnPanelMode){
      const spawnPanel = document.getElementById("spawnInteractionPanel");
      spawnPanelRefreshT -= dt;
      if(spawnPanelRefreshT <= 0 && !spawnPanel.matches(":hover")){
        renderSpawnInteractionPanel(spawnPanelMode);
        spawnPanelRefreshT = 1;
      }
    }
    const utilityPanel = getUtilityPanel("quests");
    if(utilityPanel && !utilityPanel.classList.contains("hidden") && !utilityPanel.matches(":hover")){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("quests");
        if(content) content.innerHTML = renderCombatQuestTracker();
        utilityPanelRefreshT = .25;
      }
    }
    const mapPanel = getUtilityPanel("map");
    if(mapPanel && !mapPanel.classList.contains("hidden") && !mapPanel.matches(":hover")){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("map");
        if(content) content.innerHTML = renderMapUtilityContent();
        utilityPanelRefreshT = .25;
      }
    }
    const groupPanel = getUtilityPanel("group");
    if(groupPanel && !groupPanel.classList.contains("hidden") && !groupPanel.contains(document.activeElement)){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("group");
        if(content) content.innerHTML = renderGroupUtilityContent();
        utilityPanelRefreshT = .5;
      }
    }
    groupHudRefreshT -= dt;
    if(groupHudRefreshT <= 0){
      refreshGroupFloatingHud();
      groupHudRefreshT = .25;
    }
  }

  return {
    reset,
    tick,
    getSpawnPanelMode,
    closeSpawnPanel,
    closeUtilityPanel,
    saveUtilityPanelLayout,
    saveSpawnPanelLayout,
    renderSpawnInteractionPanel,
    openUtilityPanel,
    inviteGroupMember,
    trackCombatQuest,
    claimCombatQuest,
    setCombatQuestDetailTab,
    selectQuestForPanel,
    selectQuestCategoryForPanel,
    selectQuestTypeForPanel,
    toggleLockedQuestsForPanel,
    setRefineryPanelTab,
    openShipRefineRecipe,
    closeShipRefineRecipe
  };
}
