import { renderCombatQuestTracker as renderCombatQuestTrackerHtml } from "./questTracker.js";
import { renderSpawnPanelContent } from "./spawnPanel.js?v=tutorial-quest-lock-1";
import { renderCombatFirmPanel } from "./combatFirmPanel.js?v=firm-panel-gift-3";
import { renderCombatMapPanel } from "./combatMapPanel.js";
import { renderCombatBoostersPanel } from "./combatBoostersPanel.js";
import { createTypewriterTextController } from "./typewriterText.js";
import { FIRMS, getFirmIdFromMapName, normalizeFirmId } from "../../data/firms.js";
import { isPremiumActive } from "../../data/premium.js";
import { getCurrentRank } from "../../core/store.js";
import { hydrateCombatUiLayout, persistCombatUiLayout } from "./combatUiLayout.js";
import {
  multiplayer,
  claimFirmQuest,
  claimFirmRewards,
  claimFirmSeasonObjective,
  inviteMultiplayerPlayer,
  inviteMultiplayerPlayerByName,
  kickMultiplayerGroupMember,
  leaveMultiplayerGroup,
  pingMultiplayerGroupMember,
  promoteMultiplayerGroupMember,
  removeSocialRelation,
  requestFirmRankingSync,
  requestSocialSync,
  respondFriendRequest,
  sendFriendRequest,
  setSocialCategory,
  startPortgunTeleport
} from "../../multiplayer/client.js?v=action-slots-save-1-fps-burst-1";

function escapeHtml(value = ""){
  return String(value).replace(/[&<>"']/g, char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  })[char]);
}

function clampPercent(value){
  return Math.max(0, Math.min(100, Number(value || 0)));
}

const UTILITY_PANEL_MODES = ["group", "friends", "firm", "quests", "settings", "map", "boosters"];

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
  getQuestObjectiveProgress,
  getQuestProgress,
  claimQuest,
  trackServerQuest,
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
  getGraphicsQuality,
  renderSettingsContent
}){
  hydrateCombatUiLayout(store);
  let spawnPanelMode = null;
  let spawnPanelRefreshT = 0;
  let utilityPanelRefreshT = 0;
  let utilityBadgeRefreshT = 0;
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
  let mapPanelMode = "view";
  let selectedSocialTab = "friends";
  let selectedSocialKey = null;
  let selectedFirmPanelTab = "overview";
  let socialRefreshT = 0;
  let firmTimerRefreshT = 0;
  let boosterTimerRefreshT = 0;
  let expandedBoosterType = "";
  let pendingGroupInviteName = "";
  let pendingSocialAddName = "";
  const questBriefingTypewriter = createTypewriterTextController({charactersPerSecond:32});

  function canUseCurrentMapFirmServices(){
    const mapFirmId = getFirmIdFromMapName(getCurrentMap()?.name);
    if(!mapFirmId) return true;
    return mapFirmId === normalizeFirmId(store.state?.player?.firmId || "astra");
  }

  function reset(){
    groupMembers = [];
    const activeQuest = getActiveQuest();
    selectedQuestCategory = activeQuest ? "active" : "available";
    selectedQuestType = activeQuest?.category || "normal";
    selectedQuestId = activeQuest?.id || getAllQuests().find(quest=>!store.state.completedQuestClaims?.[quest.id])?.id || null;
    combatQuestDetailTab = "quest";
    refineryPanelTab = "raffinage";
    selectedShipRefineRecipeId = null;
    questBriefingTypewriter.reset();
    spawnPanelRefreshT = 0;
    utilityPanelRefreshT = 0;
    groupHudRefreshT = 0;
    refreshGroupFloatingHud();
    hydrateCombatUiLayout(store);
    setTimeout(()=>{
      restoreOpenUtilityPanels();
      restoreOpenSpawnPanel();
    }, 0);
    requestFirmRankingSync();
  }

  function getSpawnPanelMode(){
    return spawnPanelMode;
  }

  function closeSpawnPanel(options = {}){
    const persist = options?.persist !== false;
    spawnPanelMode = null;
    spawnPanelRefreshT = 0;
    questBriefingTypewriter.reset();
    document.getElementById("spawnInteractionPanel")?.classList.add("hidden");
    if(persist) saveSpawnPanelOpenState(null, false);
    syncUtilityDockButtons();
  }

  function closeUtilityPanel(options = {}){
    const persist = options?.persist === true;
    document.querySelectorAll(".combat-utility-panel").forEach(panel=>panel.classList.add("hidden"));
    if(persist) saveUtilityPanelsOpenState([]);
    syncUtilityDockButtons();
  }

  function getUtilityPanel(mode){
    if(mode === "quests") return document.getElementById("combatUtilityPanelQuests");
    if(mode === "group") return document.getElementById("combatUtilityPanelGroup");
    if(mode === "friends") return document.getElementById("combatUtilityPanelFriends");
    if(mode === "firm") return document.getElementById("combatUtilityPanelFirm");
    if(mode === "settings") return document.getElementById("combatUtilityPanelSettings");
    if(mode === "map") return document.getElementById("combatUtilityPanelMap");
    if(mode === "boosters") return document.getElementById("combatUtilityPanelBoosters");
    return null;
  }

  function getUtilityContent(mode){
    if(mode === "quests") return document.getElementById("combatUtilityContentQuests");
    if(mode === "group") return document.getElementById("combatUtilityContentGroup");
    if(mode === "friends") return document.getElementById("combatUtilityContentFriends");
    if(mode === "firm") return document.getElementById("combatUtilityContentFirm");
    if(mode === "settings") return document.getElementById("combatUtilityContentSettings");
    if(mode === "map") return document.getElementById("combatUtilityContentMap");
    if(mode === "boosters") return document.getElementById("combatUtilityContentBoosters");
    return null;
  }

  function syncUtilityDockButtons(){
    document.querySelectorAll("[data-utility-panel]").forEach(btn=>{
      const mode = btn.dataset.utilityPanel;
      const panel = getUtilityPanel(mode);
      const utilityOpen = !!panel && !panel.classList.contains("hidden");
      const refineryOpen = mode === "refinery" && spawnPanelMode === "refinery" && !document.getElementById("spawnInteractionPanel")?.classList.contains("hidden");
      btn.classList.toggle("active", utilityOpen || refineryOpen);
      if(mode === "quests") syncQuestDockBadge(btn);
      if(mode === "group") syncDockBadge(btn, multiplayer.invites.length, "group");
      if(mode === "friends") syncDockBadge(btn, multiplayer.social?.incoming?.length || 0, "friends");
      if(mode === "boosters") syncDockBadge(btn, multiplayer.firmSnapshot?.personal?.boosters?.items?.length || 0, "boosters");
    });
  }

  function syncDockBadge(btn, count, label){
    let badge = btn.querySelector(".combat-utility-badge");
    if(count <= 0){
      badge?.remove();
      if(btn.dataset.notify === label) btn.removeAttribute("data-notify");
      return;
    }
    if(!badge){
      badge = document.createElement("span");
      badge.className = "combat-utility-badge";
      btn.appendChild(badge);
    }
    badge.textContent = String(Math.min(99, count));
    btn.dataset.notify = label;
  }

  function getClaimableQuestCount(){
    return getActiveQuests().filter(quest=>{
      const objectives = Array.isArray(quest.objectives) ? quest.objectives : [quest.objective];
      const target = objectives.filter(Boolean).reduce((sum, objective)=>sum + Number(objective.count || 0), 0);
      return target > 0 && getQuestProgress(quest.id) >= target && !store.state.completedQuestClaims?.[quest.id];
    }).length;
  }

  function syncQuestDockBadge(btn){
    const count = getClaimableQuestCount();
    let badge = btn.querySelector(".combat-utility-badge");
    if(count <= 0){
      badge?.remove();
      btn.removeAttribute("data-notify");
      return;
    }
    if(!badge){
      badge = document.createElement("span");
      badge.className = "combat-utility-badge";
      btn.appendChild(badge);
    }
    badge.textContent = String(Math.min(99, count));
    btn.dataset.notify = "quests";
  }

  function applyUtilityPanelLayout(mode, panel){
    const layout = store.state?.uiLayout?.combatUtilityPanels?.[mode] || store.state?.uiLayout?.combatUtilityPanel;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    panel.style.left = `${Math.max(0, Number(layout.left))}px`;
    panel.style.top = `${Math.max(0, Number(layout.top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
  }

  function applySpawnPanelLayout(panel){
    const layout = store.state?.uiLayout?.spawnInteractionPanel;
    if(!layout || !Number.isFinite(Number(layout.left)) || !Number.isFinite(Number(layout.top))) return;
    panel.style.left = `${Math.max(0, Number(layout.left))}px`;
    panel.style.top = `${Math.max(0, Number(layout.top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function ensureUtilityPanelLayout(mode){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    if(!store.state.uiLayout.combatUtilityPanels || typeof store.state.uiLayout.combatUtilityPanels !== "object") store.state.uiLayout.combatUtilityPanels = {};
    if(!store.state.uiLayout.combatUtilityPanels[mode] || typeof store.state.uiLayout.combatUtilityPanels[mode] !== "object") store.state.uiLayout.combatUtilityPanels[mode] = {};
    return store.state.uiLayout.combatUtilityPanels[mode];
  }

  function saveUtilityPanelsOpenState(openModes){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    if(!store.state.uiLayout.combatUtilityPanels || typeof store.state.uiLayout.combatUtilityPanels !== "object") store.state.uiLayout.combatUtilityPanels = {};
    const openSet = new Set(openModes);
    for(const mode of UTILITY_PANEL_MODES){
      const previous = store.state.uiLayout.combatUtilityPanels[mode] || {};
      store.state.uiLayout.combatUtilityPanels[mode] = {...previous, open:openSet.has(mode)};
    }
    persistCombatUiLayout(store);
    saveState();
  }

  function saveUtilityPanelOpenState(mode, open){
    const layout = ensureUtilityPanelLayout(mode);
    layout.open = Boolean(open);
    persistCombatUiLayout(store);
    saveState();
  }

  function saveUtilityPanelLayout(mode, layout){
    const previous = ensureUtilityPanelLayout(mode);
    store.state.uiLayout.combatUtilityPanels[mode] = {...previous, ...layout, open:previous.open !== false};
    persistCombatUiLayout(store);
    saveState();
  }

  function saveSpawnPanelLayout(layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    const previous = store.state.uiLayout.spawnInteractionPanel || {};
    store.state.uiLayout.spawnInteractionPanel = {...previous, ...layout};
    persistCombatUiLayout(store);
    saveState();
  }

  function saveSpawnPanelOpenState(mode, open){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    const previous = store.state.uiLayout.spawnInteractionPanel || {};
    store.state.uiLayout.spawnInteractionPanel = {...previous, mode:mode || previous.mode || null, open:Boolean(open)};
    persistCombatUiLayout(store);
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
    return renderCombatQuestTrackerHtml({
      activeQuests,
      trackedQuest:selected,
      selectedQuestId,
      detailTab:combatQuestDetailTab,
      enemyTypes,
      rawMaterials:getAllRawMaterials(),
      getQuestProgress,
      getQuestObjectiveProgress,
      questFailProgress:store.state.questFailProgress || {}
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
    return found?.displayName || found?.name || (id !== undefined && id !== null ? String(id) : "Hors combat");
  }

  function getVisibleGroupMembers(){
    const members = [...(multiplayer.group?.members || [])];
    const ally = multiplayer.portalAlly;
    if(!ally || ally.alive === false || Number(ally.hp || 0) <= 0) return members;
    const portalId = multiplayer.portalInstance?.portal?.id || "ricky";
    members.push({
      id:ally.id || "ricky_companion",
      name:ally.name || "Ricky",
      npcAlly:true,
      state:{
        ...ally,
        mapId:`portal-${portalId}`,
        updatedAt:Date.now()
      }
    });
    return members;
  }

  function resolveGroupMemberState(member){
    if(member?.npcAlly) return member.state || multiplayer.portalAlly || null;
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

  function renderCompactGroupMeter(label, value, max, className){
    const safeMax = Math.max(1, Number(max || value || 1));
    const cleanValue = Math.max(0, Number(value || 0));
    const percent = clampPercent(cleanValue / safeMax * 100);
    return `<div class="group-compact-meter ${className}" data-meter-label="${escapeHtml(label)} : ${Math.round(cleanValue)} / ${Math.round(safeMax)}"><i style="width:${percent}%"></i></div>`;
  }

  function renderGroupMemberCard(member){
    const currentMap = getCurrentMap?.();
    const localPlayer = getPlayer?.();
    const state = resolveGroupMemberState(member);
    const isLocal = member.id === multiplayer.playerId;
    const role = member.npcAlly ? "Soutien" : member.id === multiplayer.group?.leaderId ? "Chef" : "Membre";
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
    const members = getVisibleGroupMembers();
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
    const members = getVisibleGroupMembers();
    const currentMap = getCurrentMap?.();
    const localPlayer = getPlayer?.();
    const mapLabel = state=>{
      const id = state?.mapId;
      const found = maps.find(map=>String(map.id) === String(id) || String(map.name) === String(id));
      return found?.name || (id !== undefined && id !== null ? String(id) : "Hors combat");
    };
    const resolveMemberState = member=>resolveGroupMemberState(member);
    const renderMeter = (label, value, max, className)=>{
      const safeMax = Math.max(1, Number(max || value || 1));
      const percent = clampPercent(Number(value || 0) / safeMax * 100);
      return `<div class="group-member-meter ${className}"><span>${label}</span><b>${Math.round(Number(value || 0))}/${Math.round(safeMax)}</b><i style="width:${percent}%"></i></div>`;
    };
    const membersHtml = members.length
      ? members.map(member=>{
        const state = resolveMemberState(member);
        const isLocal = member.id === multiplayer.playerId;
        const role = member.npcAlly ? "Soutien" : member.id === multiplayer.group?.leaderId ? "Chef" : "Membre";
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
      ? `<div class="group-panel-list">${multiplayer.invites.map(invite=>`<div class="group-panel-member group-panel-invite"><strong>${escapeHtml(invite.fromName || "Pilote")}</strong><span>Invitation</span><button class="group-invite-response accept" data-mp-action="accept" data-group-id="${escapeHtml(invite.groupId)}" type="button" title="Accepter" aria-label="Accepter">&#10003;</button><button class="group-invite-response decline" data-mp-action="decline" data-group-id="${escapeHtml(invite.groupId)}" type="button" title="Refuser" aria-label="Refuser">&times;</button></div>`).join("")}</div>`
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

  function renderCompactGroupUtilityContent(){
    const members = getVisibleGroupMembers();
    const isLeader = multiplayer.group?.leaderId === multiplayer.playerId;
    const actionButton = (action, targetId, label, title)=>`<button class="group-icon-action" data-group-action="${action}" data-player-id="${escapeHtml(targetId)}" type="button" title="${title}" aria-label="${title}">${label}</button>`;
    const visibleMembers = members.length <= 1 ? [] : members;
    const membersHtml = visibleMembers.map(member=>{
      const state = resolveGroupMemberState(member);
      const isLocal = member.id === multiplayer.playerId;
      const memberIsLeader = !member.npcAlly && member.id === multiplayer.group?.leaderId;
      const mapName = getGroupMapLabel(state);
      return `
        <div class="group-compact-member ${isLocal ? "local" : ""}">
          <div class="group-compact-name">${memberIsLeader ? `<span class="group-crown" title="Chef du groupe">&#9819;</span>` : ""}<strong>${escapeHtml(member.name || (isLocal ? multiplayer.name : "Pilote"))}</strong><span class="group-compact-map">${escapeHtml(mapName)}</span></div>
          <div class="group-compact-actions">
            ${!isLocal && !member.npcAlly ? actionButton("ping", member.id, `<svg viewBox="0 0 24 24"><path d="M12 21s6-5.5 6-12a6 6 0 1 0-12 0c0 6.5 6 12 6 12z"></path><circle cx="12" cy="9" r="2"></circle></svg>`, "Ping GPS") : ""}
            ${isLeader && !isLocal && !member.npcAlly ? actionButton("promote", member.id, "&#9819;", "Donner le role de chef") : ""}
            ${isLocal ? actionButton("leave", member.id, "&times;", "Quitter le groupe") : isLeader && !member.npcAlly ? actionButton("kick", member.id, "&times;", "Retirer du groupe") : ""}
          </div>
          ${state ? `<div class="group-compact-meters">${renderCompactGroupMeter("PV", state.hp, state.maxHp, "hp")}${renderCompactGroupMeter("Bouclier", state.shield, state.maxShield, "shield")}</div>` : `<p class="group-panel-note">Signal indisponible.</p>`}
        </div>`;
    }).join("");
    const outgoing = (multiplayer.outgoingGroupInvites || []).filter(invite=>Number(invite.expiresAt || 0) > Date.now());
    const outgoingHtml = outgoing.map(invite=>`<div class="group-pending-invite"><strong>${escapeHtml(invite.playerName || "Pilote")}</strong><span>Invitation envoyee</span></div>`).join("");
    const invitesHtml = multiplayer.invites.length
      ? `<div class="group-panel-list">${multiplayer.invites.map(invite=>`<div class="group-panel-member group-panel-invite"><strong>${escapeHtml(invite.fromName || "Pilote")}</strong><span>Invitation</span><button class="group-invite-response accept" data-mp-action="accept" data-group-id="${escapeHtml(invite.groupId)}" type="button" title="Accepter" aria-label="Accepter">&#10003;</button><button class="group-invite-response decline" data-mp-action="decline" data-group-id="${escapeHtml(invite.groupId)}" type="button" title="Refuser" aria-label="Refuser">&times;</button></div>`).join("")}</div>`
      : "";
    return `
      <div class="group-invite-form">
        <input id="groupInviteName" type="text" maxlength="24" value="${escapeHtml(pendingGroupInviteName)}" placeholder="Nom du joueur">
        <button class="group-invite-button" data-group-invite type="button" title="Inviter en groupe" aria-label="Inviter en groupe"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.7-3.6 2.6-5.3 5.8-5.3s5.2 1.7 5.9 5.3"></path><path d="M17 7v6M14 10h6"></path></svg></button>
      </div>
      ${invitesHtml}
      ${outgoingHtml ? `<div class="group-pending-list">${outgoingHtml}</div>` : ""}
      ${membersHtml ? `<div class="group-compact-list">${membersHtml}</div>` : ""}
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
    content.innerHTML = renderCompactGroupUtilityContent();
    syncUtilityDockButtons();
    if(focus) document.getElementById("groupInviteName")?.focus();
  }

  function isInteractingWithUtilityPanel(mode){
    const panel = getUtilityPanel(mode);
    const active = document.activeElement;
    return !!panel && (panel.matches(":hover") || (!!active && panel.contains(active)));
  }

  function firmBadgeAsset(firmId){
    return `assets/firms/${normalizeFirmId(firmId || "astra")}.svg`;
  }

  function socialStatusLabel(status){
    return status === "online" ? "En ligne" : status === "away" ? "Absent / AFK" : "Hors ligne";
  }

  function findSocialContact(key){
    const social = multiplayer.social || {};
    return ["friends", "incoming", "outgoing", "enemies", "ignored", "firmMembers"]
      .flatMap(field=>Array.isArray(social[field]) ? social[field] : [])
      .find(contact=>contact.key === key) || null;
  }

  function renderSocialContact(contact, {pending = false, incoming = false, category = "friends"} = {}){
    return `
      <div class="social-contact ${pending ? "pending" : ""}">
        <i class="social-status ${escapeHtml(contact.status || "offline")}" title="${escapeHtml(socialStatusLabel(contact.status))}"></i>
        <img class="social-firm-icon" src="${firmBadgeAsset(contact.firmId)}" alt="${escapeHtml(contact.firmLabel || contact.firmId)}">
        <div class="social-contact-main" data-social-select="${escapeHtml(contact.key)}">
          <strong>${escapeHtml(contact.name)}</strong>
          <span>${escapeHtml(contact.firmLabel || contact.firmId)} · ${escapeHtml(socialStatusLabel(contact.status))} · ${escapeHtml(contact.mapName || "Inconnue")}</span>
        </div>
        ${incoming
          ? `<div class="social-actions social-inline-actions"><button data-social-action="accept" data-social-key="${escapeHtml(contact.key)}" type="button" title="Accepter" aria-label="Accepter">&#10003;</button><button data-social-action="decline" data-social-key="${escapeHtml(contact.key)}" type="button" title="Refuser" aria-label="Refuser">&times;</button></div>`
          : `<span class="social-contact-tag">${pending ? "Demande envoyee" : escapeHtml(category)}</span>`}
      </div>`;
  }

  function renderSocialDetail(contact, category = "friends"){
    if(!contact) return "";
    const canInvite = contact.status !== "offline" && contact.playerId;
    const canAddFriend = category !== "friends" && category !== "outgoing" && category !== "incoming";
    const canPrivate = category === "friends";
    const isIncoming = category === "incoming";
    const canEnemy = category !== "friends" && category !== "enemies";
    const canIgnore = category !== "ignored";
    const canRemove = ["friends","enemies","ignored","outgoing"].includes(category);
    return `
      <div class="social-detail social-detail-redesign">
        <div class="social-detail-header">
          <strong class="social-detail-name">${escapeHtml(contact.name)}</strong>
          <div class="social-detail-meta">
            <span>Firme : <b>${escapeHtml(contact.firmLabel || contact.firmId)}</b></span>
            <span>Carte : <b>${escapeHtml(contact.mapName || "Hors ligne")}</b></span>
            <span>Vaisseau : <b>${escapeHtml(contact.shipName || "Inconnu")}</b></span>
            <span>Statut : <b>${escapeHtml(socialStatusLabel(contact.status))}</b></span>
          </div>
        </div>
        <div class="social-detail-grid">
          ${isIncoming ? `<button data-social-action="accept" data-social-key="${escapeHtml(contact.key)}" type="button">ACCEPTER</button><button data-social-action="decline" data-social-key="${escapeHtml(contact.key)}" type="button">REFUSER</button>` : ""}
          ${canPrivate ? `<button data-social-action="private" data-social-key="${escapeHtml(contact.key)}" type="button">MESSAGE PRIVE</button>` : ""}
          ${category === "friends" && canInvite ? `<button data-social-action="group" data-player-id="${escapeHtml(contact.playerId)}" type="button">INVITER EN GROUPE</button>` : ""}
          ${canAddFriend ? `<button data-social-action="friend" data-social-name="${escapeHtml(contact.name)}" type="button">AJOUTER AMI</button>` : ""}
          ${canEnemy ? `<button data-social-action="enemy" data-social-name="${escapeHtml(contact.name)}" type="button">ENNEMI</button>` : ""}
          ${canIgnore ? `<button data-social-action="ignore" data-social-name="${escapeHtml(contact.name)}" type="button">IGNORER</button>` : ""}
          ${canRemove ? `<button data-social-action="remove" data-social-key="${escapeHtml(contact.key)}" data-social-category="${escapeHtml(category)}" type="button">RETIRER</button>` : ""}
        </div>
      </div>`;
  }

  function renderFriendsUtilityContent(){
    const social = multiplayer.social || {};
    const incoming = Array.isArray(social.incoming) ? social.incoming : [];
    const outgoing = Array.isArray(social.outgoing) ? social.outgoing : [];
    const categories = {
      friends:Array.isArray(social.friends) ? social.friends : [],
      enemies:Array.isArray(social.enemies) ? social.enemies : [],
      ignored:Array.isArray(social.ignored) ? social.ignored : []
    };
    const rows = selectedSocialTab === "friends"
      ? [...incoming.map(contact=>renderSocialContact(contact, {incoming:true, category:"demande"})),
        ...outgoing.map(contact=>renderSocialContact(contact, {pending:true, category:"outgoing"})),
        ...categories.friends.map(contact=>renderSocialContact(contact, {category:"ami"}))]
      : categories[selectedSocialTab].map(contact=>renderSocialContact(contact, {category:selectedSocialTab === "enemies" ? "ennemi" : "ignore"}));
    const selected = findSocialContact(selectedSocialKey);
    const selectedCategory = incoming.some(contact=>contact.key === selectedSocialKey)
      ? "incoming"
      : outgoing.some(contact=>contact.key === selectedSocialKey)
        ? "outgoing"
        : selectedSocialTab;
    return `
      <div class="social-add-form">
        <input id="socialAddName" maxlength="24" value="${escapeHtml(pendingSocialAddName)}" placeholder="Nom du joueur">
        <button class="blue-button small" data-social-action="add-friend" type="button">AJOUTER AMI</button>
      </div>
      <div class="social-tabs">
        <button class="${selectedSocialTab === "friends" ? "active" : ""}" data-social-tab="friends" type="button">AMIS ${categories.friends.length}</button>
        <button class="${selectedSocialTab === "enemies" ? "active" : ""}" data-social-tab="enemies" type="button">ENNEMIS ${categories.enemies.length}</button>
        <button class="${selectedSocialTab === "ignored" ? "active" : ""}" data-social-tab="ignored" type="button">IGNORES ${categories.ignored.length}</button>
      </div>
      <div class="social-list">${rows.length ? rows.join("") : `<p class="social-empty">Aucun joueur dans cette liste.</p>`}</div>
      ${renderSocialDetail(selected, selectedCategory)}
    `;
  }

  function renderFirmUtilityContent(){
    return renderCombatFirmPanel({
      snapshot:multiplayer.firmSnapshot || multiplayer.firmRanking,
      selectedTab:selectedFirmPanelTab
    });
  }

  function refreshFirmUtilityContent({preserveScroll = false} = {}){
    const panel = getUtilityPanel("firm");
    const content = getUtilityContent("firm");
    if(!content) return;
    const panelScrollTop = preserveScroll ? panel?.scrollTop || 0 : 0;
    const contentScrollTop = preserveScroll ? content.scrollTop : 0;
    content.innerHTML = renderFirmUtilityContent();
    if(preserveScroll){
      if(panel) panel.scrollTop = Math.min(panelScrollTop, Math.max(0, panel.scrollHeight - panel.clientHeight));
      content.scrollTop = Math.min(contentScrollTop, Math.max(0, content.scrollHeight - content.clientHeight));
    }
  }

  function refreshSocialUtilityPanel(mode, {show = false, preserveScroll = false} = {}){
    const panel = getUtilityPanel(mode);
    const content = getUtilityContent(mode);
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout(mode, panel);
      panel.classList.remove("hidden");
      requestSocialSync();
      if(mode === "firm") requestFirmRankingSync();
    }
    if(mode === "firm") refreshFirmUtilityContent({preserveScroll:preserveScroll || !show});
    else content.innerHTML = renderFriendsUtilityContent();
    syncUtilityDockButtons();
  }

  function handleSocialAction(action, element){
    if(action === "add-friend"){
      const name = String(document.getElementById("socialAddName")?.value || "").trim();
      pendingSocialAddName = name.slice(0, 24);
      if(name) sendFriendRequest(name);
    }else if(action === "accept" || action === "decline"){
      respondFriendRequest(element.dataset.socialKey, action === "accept");
    }else if(action === "friend"){
      sendFriendRequest(element.dataset.socialName);
    }else if(action === "enemy" || action === "ignore"){
      setSocialCategory(element.dataset.socialName, action === "enemy" ? "enemies" : "ignored");
    }else if(action === "remove"){
      removeSocialRelation(element.dataset.socialKey, element.dataset.socialCategory);
      selectedSocialKey = null;
    }else if(action === "group"){
      inviteMultiplayerPlayer(element.dataset.playerId);
    }else if(action === "private"){
      const contact = findSocialContact(element.dataset.socialKey);
      if(contact) window.dispatchEvent(new CustomEvent("voidsector:open-private-chat", {detail:{contact}}));
    }else if(action === "firm-reward-claim"){
      claimFirmRewards();
    }else if(action === "firm-quest-claim"){
      claimFirmQuest(element.dataset.firmQuestClaim);
    }else if(action === "firm-season-objective-claim"){
      claimFirmSeasonObjective(element.dataset.firmSeasonObjectiveClaim);
    }
  }

  function selectSocialTab(tab){
    selectedSocialTab = ["friends", "enemies", "ignored"].includes(tab) ? tab : "friends";
    selectedSocialKey = null;
    refreshSocialUtilityPanel("friends");
  }

  function selectSocialContact(key, mode = "friends"){
    const nextKey = String(key || "");
    selectedSocialKey = selectedSocialKey === nextKey ? null : nextKey;
    refreshSocialUtilityPanel(mode);
  }

  function selectFirmPanelTab(tab){
    selectedFirmPanelTab = ["overview", "firms", "players", "rankings", "quests", "weekly-quests", "seasonal-objectives", "rewards"].includes(tab) ? tab : "overview";
    selectedSocialKey = null;
    requestFirmRankingSync();
    refreshSocialUtilityPanel("firm");
  }

  function fillSocialPlayerName(name){
    const clean = String(name || "").trim().slice(0, 24);
    if(!clean) return;
    pendingGroupInviteName = clean;
    pendingSocialAddName = clean;
    const groupInput = document.getElementById("groupInviteName");
    if(groupInput) groupInput.value = clean;
    const socialInput = document.getElementById("socialAddName");
    if(socialInput) socialInput.value = clean;
  }

  window.addEventListener("voidsector:multiplayer-change", event=>{
    const reason = String(event.detail?.reason || "");
    const forceGroupRefresh = reason.startsWith("group:");
    const panel = getUtilityPanel("group");
    if(panel && !panel.classList.contains("hidden") && (forceGroupRefresh || !isInteractingWithUtilityPanel("group"))) refreshGroupUtilityPanel({show:true});
    for(const mode of ["friends", "firm", "boosters"]){
      const socialPanel = getUtilityPanel(mode);
      if(!socialPanel || socialPanel.classList.contains("hidden") || isInteractingWithUtilityPanel(mode)) continue;
      if(mode === "boosters") refreshBoostersUtilityPanel();
      else refreshSocialUtilityPanel(mode, {preserveScroll:mode === "firm"});
    }
    syncUtilityDockButtons();
    refreshGroupFloatingHud();
  });

  function isPerfPanelVisible(){
    return store.state?.uiLayout?.perfVisible !== false;
  }

  function applyPerfPanelVisibility(){
    document.getElementById("combatPerfPanel")?.classList.toggle("hidden", !isPerfPanelVisible());
  }

  function togglePerfPanelVisibility(){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    store.state.uiLayout.perfVisible = !isPerfPanelVisible();
    if(store.state.settings?.interface) store.state.settings.interface.perfVisible = store.state.uiLayout.perfVisible;
    applyPerfPanelVisibility();
    saveState?.();
    refreshSettingsUtilityPanel();
  }

  window.addEventListener("voidsector:portgun-open-map", ()=>{
    openPortgunMapPanel();
  });

  function renderSettingsUtilityContent(){
    const quality = getGraphicsQuality?.() || store.state.graphicsQuality || "high";
    const perfVisible = isPerfPanelVisible();
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
      <div class="combat-map-head">
        <div><span>Interface</span><strong>Statistiques PERF</strong></div>
        <small>${perfVisible ? "Visible" : "Masque"}</small>
      </div>
      <button class="quality-option ${perfVisible ? "active" : ""}" data-toggle-perf-panel type="button">
        <strong>${perfVisible ? "Masquer PERF" : "Afficher PERF"}</strong>
        <span>Active ou desactive le panneau FPS / frame / update / draw.</span>
      </button>
    </div>`;
  }

  function refreshSettingsUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("settings");
    const content = getUtilityContent("settings");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("settings", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderSettingsContent?.() || renderSettingsUtilityContent();
    syncUtilityDockButtons();
  }

  function renderGameMapUtilityContent(){
    return renderCombatMapPanel({
      maps,
      getCurrentMap,
      mode:mapPanelMode,
      playerLevel:store.state.player?.level || 1
    });
  }

  function refreshMapUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("map");
    const content = getUtilityContent("map");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("map", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderGameMapUtilityContent();
    syncUtilityDockButtons();
  }

  function refreshBoostersUtilityPanel({show = false} = {}){
    const panel = getUtilityPanel("boosters");
    const content = getUtilityContent("boosters");
    if(!panel || !content) return;
    if(show){
      applyUtilityPanelLayout("boosters", panel);
      panel.classList.remove("hidden");
    }
    content.innerHTML = renderCombatBoostersPanel(multiplayer.firmSnapshot, Date.now(), expandedBoosterType);
    syncUtilityDockButtons();
  }

  function openUtilityPanel(mode){
    if(!UTILITY_PANEL_MODES.includes(mode)) return;
    const panel = getUtilityPanel(mode);
    const content = getUtilityContent(mode);
    if(!panel || !content) return;
    if(!panel.classList.contains("hidden")){
      panel.classList.add("hidden");
      saveUtilityPanelOpenState(mode, false);
      syncUtilityDockButtons();
      return;
    }
    if(mode === "quests"){
      refreshQuestUtilityPanel({show:true});
      saveUtilityPanelOpenState(mode, true);
      return;
    }
    if(mode === "settings"){
      refreshSettingsUtilityPanel({show:true});
      saveUtilityPanelOpenState(mode, false);
      return;
    }
    if(mode === "map"){
      mapPanelMode = "view";
      refreshMapUtilityPanel({show:true});
      saveUtilityPanelOpenState(mode, true);
      return;
    }
    if(mode === "boosters"){
      requestFirmRankingSync();
      refreshBoostersUtilityPanel({show:true});
      saveUtilityPanelOpenState(mode, true);
      return;
    }
    if(mode === "friends" || mode === "firm"){
      refreshSocialUtilityPanel(mode, {show:true});
      saveUtilityPanelOpenState(mode, true);
      return;
    }
    refreshGroupUtilityPanel({show:true, focus:true});
    saveUtilityPanelOpenState(mode, true);
  }

  function toggleBoosterDetail(type){
    const cleanType = String(type || "");
    expandedBoosterType = expandedBoosterType === cleanType ? "" : cleanType;
    refreshBoostersUtilityPanel({show:true});
  }

  function openPortgunMapPanel(){
    mapPanelMode = "portgun";
    refreshMapUtilityPanel({show:true});
    saveUtilityPanelOpenState("map", true);
    showToast?.("Choisis une destination Portgun sur la carte.");
  }

  function selectPortgunMapTarget(mapId){
    if(mapPanelMode !== "portgun") return false;
    if(!multiplayer.connected || !multiplayer.socket){
      showToast?.("Connexion serveur requise pour le Portgun.");
      return true;
    }
    if(startPortgunTeleport(mapId)){
      mapPanelMode = "view";
      getUtilityPanel("map")?.classList.add("hidden");
      saveUtilityPanelOpenState("map", false);
      syncUtilityDockButtons();
      showToast?.("Teleportation Portgun demandee.");
      return true;
    }
    showToast?.("Teleportation Portgun impossible.");
    return true;
  }

  function restoreOpenUtilityPanels(){
    for(const mode of UTILITY_PANEL_MODES){
      if(mode === "settings") continue;
      const layout = store.state?.uiLayout?.combatUtilityPanels?.[mode];
      if(!layout?.open) continue;
      if(mode === "quests") refreshQuestUtilityPanel({show:true});
      else if(mode === "settings") refreshSettingsUtilityPanel({show:true});
      else if(mode === "map") refreshMapUtilityPanel({show:true});
      else if(mode === "boosters") refreshBoostersUtilityPanel({show:true});
      else if(mode === "friends" || mode === "firm") refreshSocialUtilityPanel(mode, {show:true});
      else refreshGroupUtilityPanel({show:true, focus:false});
    }
  }

  function restoreOpenSpawnPanel(){
    const layout = store.state?.uiLayout?.spawnInteractionPanel;
    const mode = layout?.open ? String(layout.mode || "") : "";
    if(!["refinery", "quests", "commerce"].includes(mode)) return;
    renderSpawnInteractionPanel(mode);
  }

  window.addEventListener("voidsector:profile-applied", event=>{
    if(event.detail?.profile?.boosters){
      const boostersPanel = getUtilityPanel("boosters");
      if(boostersPanel && !boostersPanel.classList.contains("hidden")) requestFirmRankingSync();
    }
    const uiChanges = event.detail?.uiChanges;
    if(uiChanges && !uiChanges.layoutChanged && !uiChanges.panelsChanged) return;
    setTimeout(()=>{
      if(!uiChanges || uiChanges.layoutChanged){
        hydrateCombatUiLayout(store);
        restoreOpenUtilityPanels();
      }
      restoreOpenSpawnPanel();
    }, 0);
  });

  function trackCombatQuest(questId){
    if(!Array.isArray(store.state.activeQuestIds) || !store.state.activeQuestIds.includes(questId)){
      return showToast("Cette quete n'est pas en cours.");
    }
    const previousQuestId = selectedQuestId;
    selectedQuestId = questId;
    refreshQuestUtilityPanel({show:true});
    if(trackServerQuest?.(questId)) return;
    selectedQuestId = previousQuestId;
    refreshQuestUtilityPanel({show:true});
    showToast("Suivi de quete serveur impossible.");
  }

  function setCombatQuestDetailTab(tab){
    combatQuestDetailTab = ["quest", "rewards", "description"].includes(tab) ? tab : "quest";
    refreshQuestUtilityPanel({show:true});
  }

  function claimCombatQuest(questId){
    const result = claimQuest(questId);
    if(!result.ok) return showToast(result.reason);
    if(result.serverPending){
      showToast(`Reclamation envoyee : ${result.quest.title}`);
      return;
    }
    showToast("Recompense locale refusee : validation serveur requise.");
  }

  function inviteGroupMember(name){
    const cleaned = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
    pendingGroupInviteName = cleaned;
    inviteMultiplayerPlayerByName(cleaned);
  }

  function handleGroupAction(action, playerId){
    if(action === "leave") leaveMultiplayerGroup();
    else if(action === "kick") kickMultiplayerGroupMember(playerId);
    else if(action === "promote") promoteMultiplayerGroupMember(playerId);
    else if(action === "ping") pingMultiplayerGroupMember(playerId);
  }

  function renderSpawnInteractionPanel(mode = spawnPanelMode){
    const panel = document.getElementById("spawnInteractionPanel");
    const title = document.getElementById("spawnPanelTitle");
    const content = document.getElementById("spawnPanelContent");
    if(!panel || !title || !content){
      spawnPanelMode = null;
      return;
    }
    if(mode && !canUseCurrentMapFirmServices()){
      spawnPanelMode = null;
      panel.classList.add("hidden");
      saveSpawnPanelOpenState(null, false);
      syncUtilityDockButtons();
      showToast("Les services de cette firme te sont interdits.");
      return;
    }
    const questListScrollTop = mode === "quests" ? content.querySelector(".quest-strip-list")?.scrollTop : null;
    spawnPanelMode = mode;
    spawnPanelRefreshT = 1;
    panel.classList.toggle("refinery-mode", mode === "refinery");
    panel.classList.toggle("commerce-mode", mode === "commerce");
    panel.classList.toggle("quest-mode", mode === "quests");
    if(!mode){
      panel.classList.add("hidden");
      saveSpawnPanelOpenState(null, false);
      syncUtilityDockButtons();
      return;
    }
    panel.classList.remove("hidden");
    applySpawnPanelLayout(panel);
    saveSpawnPanelOpenState(mode, true);
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
      quests:getAllQuests().filter(quest=>!quest.firmId || normalizeFirmId(quest.firmId) === normalizeFirmId(store.state.player?.firmId || "astra")),
      playerLevel:store.state.player.level,
      playerName:store.state.player?.name || "Pilote",
      playerRank:getCurrentRank(),
      firmId:normalizeFirmId(store.state.player?.firmId || "astra"),
      premiumActive:isPremiumActive(store.state?.player),
      tutorial:store.state.tutorial,
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
    questBriefingTypewriter.sync(content);
    content.querySelector("[data-quest-briefing-skip]")?.addEventListener("click", event=>{
      if(event.target.closest("button")) return;
      questBriefingTypewriter.complete();
    });
    if(questListScrollTop !== null){
      const questList = content.querySelector(".quest-strip-list");
      if(questList) questList.scrollTop = questListScrollTop;
    }
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

  applyPerfPanelVisibility();

  function tick(dt){
    questBriefingTypewriter.update(dt);
    utilityBadgeRefreshT -= dt;
    if(utilityBadgeRefreshT <= 0){
      syncUtilityDockButtons();
      utilityBadgeRefreshT = .25;
    }
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
    const groupPanel = getUtilityPanel("group");
    if(groupPanel && !groupPanel.classList.contains("hidden") && !isInteractingWithUtilityPanel("group")){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("group");
        if(content) content.innerHTML = renderCompactGroupUtilityContent();
        utilityPanelRefreshT = .5;
      }
    }
    const mapPanel = getUtilityPanel("map");
    if(mapPanel && !mapPanel.classList.contains("hidden")){
      utilityPanelRefreshT -= dt;
      if(utilityPanelRefreshT <= 0){
        const content = getUtilityContent("map");
        if(content) content.innerHTML = renderGameMapUtilityContent();
        utilityPanelRefreshT = .75;
      }
    }
    const socialOpen = ["friends", "firm", "boosters"].some(mode=>{
      const panel = getUtilityPanel(mode);
      return panel && !panel.classList.contains("hidden");
    });
    const firmPanel = getUtilityPanel("firm");
    if(firmPanel && !firmPanel.classList.contains("hidden")){
      firmTimerRefreshT -= dt;
      if(firmTimerRefreshT <= 0){
        const content = getUtilityContent("firm");
        if(content && !isInteractingWithUtilityPanel("firm")) refreshFirmUtilityContent({preserveScroll:true});
        firmTimerRefreshT = 1;
      }
    }
    const boostersPanel = getUtilityPanel("boosters");
    if(boostersPanel && !boostersPanel.classList.contains("hidden")){
      boosterTimerRefreshT -= dt;
      if(boosterTimerRefreshT <= 0){
        const content = getUtilityContent("boosters");
        if(content && !isInteractingWithUtilityPanel("boosters")) content.innerHTML = renderCombatBoostersPanel(multiplayer.firmSnapshot, Date.now(), expandedBoosterType);
        boosterTimerRefreshT = 1;
      }
    }
    if(socialOpen){
      socialRefreshT -= dt;
      if(socialRefreshT <= 0){
        requestSocialSync();
        if(["firm", "boosters"].some(mode=>getUtilityPanel(mode) && !getUtilityPanel(mode).classList.contains("hidden"))) requestFirmRankingSync();
        socialRefreshT = 5;
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
    toggleBoosterDetail,
    openPortgunMapPanel,
    selectPortgunMapTarget,
    inviteGroupMember,
    handleGroupAction,
    togglePerfPanelVisibility,
    handleSocialAction,
    selectSocialTab,
    selectSocialContact,
    selectFirmPanelTab,
    fillSocialPlayerName,
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
