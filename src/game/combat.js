import { ammoTypes, equipment, portals, ships } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import {
  addAmmo,
  addInventoryItem,
  addShipCargoMaterial,
  addPortalPiece,
  addXP,
  acceptQuest,
  canAfford,
  claimQuest,
  claimRefineryJob,
  consumeAmmo,
  getActiveQuest,
  getActiveQuests,
  getAllQuests,
  getAllRawMaterials,
  getAmmo,
  getAmmoCount,
  getCurrentRank,
  getDroneLoadout,
  getEquippedDroneLasers,
  getEquippedExtras,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getEquippedLasers,
  getItem,
  getItemFromInventoryUid,
  getMaterialCount,
  getRankAssetPath,
  RANK_TABLE,
  getQuestProgress,
  getRefineryJob,
  getRefineryRecipes,
  getShipCombatStats,
  getShipCargoCapacity,
  getShipCargoUsed,
  getSkillBonus,
  isRefineryComplete,
  markPortalCompleted,
  recordQuestKill,
  registerKill,
  saveState,
  setActionSlot,
  startRefineryJob,
  spend,
  store,
  upgradeEquipment
} from "../core/store.js";

import {
  AGGRO_RANGE,
  DEFAULT_ENGINE_PROFILE,
  ENEMY_HIT_CHANCE,
  ENEMY_TYPES,
  LEASH_RANGE,
  MAPS,
  PLAYER_COLLISION_RADIUS,
  PLAYER_HIT_CHANCE,
  PORTAL_WAVE_TOTAL,
  RADAR_RANGE,
  RAW_DROP_TABLE,
  SAFE_ZONE_DELAY,
  SHIP_ENGINE_PROFILES
} from "./combatData.js";
import { preloadCombatAssets } from "./combatAssets.js";
import { drawDamageTexts as drawDamageTextsCanvas, drawMiniMap as drawMiniMapCanvas } from "./render/canvasHud.js";
import { drawCargoBoxes, drawEnemies, drawGroundMaterials, drawParticles, drawProjectiles } from "./render/entities.js";
import { drawPlayerLayer, spawnPlayerEngineParticles as emitPlayerEngineParticles } from "./render/player.js";
import { drawWorldLayer } from "./render/world.js";
import { createCombatLoop } from "./systems/combatLoop.js";
import { updateEnemyAi } from "./systems/enemyAi.js";
import { buildMapState } from "./systems/mapState.js";
import { createMiniMapState } from "./systems/minimapState.js";
import { buildPortalEnvironment, buildPortalWave, createPortalMap } from "./systems/portalState.js";
import { createPlayerLifecycle } from "./systems/playerLifecycle.js";
import { clampPlayerToMap as clampPlayerToMapSystem, updateCamera, updatePlayerMovement, worldFromScreen as screenToWorld } from "./systems/playerMovement.js";
import { createProjectile, describeAmmo, getAmmoCooldown as readAmmoCooldown, setAmmoCooldown as writeAmmoCooldown, updateProjectiles } from "./systems/projectiles.js";
import { createRepairBotSystem } from "./systems/repairBot.js";
import { createRewardSystem } from "./systems/rewards.js";
import { createWeaponSystem } from "./systems/weapons.js";
import { renderActionBarHtml, updateActionBarDom } from "./ui/actionBar.js";
import { updateCombatMeter, updateLootPopup as renderLootPopup, updateSafeZoneNotice as renderSafeZoneNotice, updateTargetPanel } from "./ui/hud.js";
import { installCombatInputHandlers } from "./ui/inputBindings.js";
import { renderQuickPanelContent, updateQuickPanelTabs } from "./ui/quickPanel.js";
import { renderCombatQuestTracker as renderCombatQuestTrackerHtml } from "./ui/questTracker.js";
import { renderSpawnPanelContent } from "./ui/spawnPanel.js";
export function createCombatGame({renderAll, showToast}){
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const cache = {};
  const mapStates = new Map();

  let running = false;
  let last = 0;
  let hudT = 0;
  let quickPanelRefreshT = 0;
  let spawnPanelRefreshT = 0;
  let utilityPanelRefreshT = 0;
  let enemySeq = 1;
  let currentMap = MAPS[0];
  let teleportLock = 0;
  let player, camera, mouse, bullets, enemies, particles, damageTexts, stars, dust, nebulae, asteroids, cargoBoxes, groundMaterials, moveTarget, selectedEnemy;
  let pendingCargoBox = null;
  let pendingGroundMaterial = null;
  let activeLaserSlot, ammoCooldowns, combatPanelTab;
  let gameMode, activePortal, portalWave, portalDelay, portalCompleted;
  let spawnPanelMode = null;
  let radiationWarned = false;
  let mouseMoveHeld = false;
  let groupMembers = [];
  let selectedQuestId = null;
  let selectedQuestCategory = "normal";
  let combatQuestDetailTab = "quest";
  let combatCargoExpanded = false;
  const combatMetricModes = {hp:"bar", shield:"bar", xp:"bar"};
  const miniMap = createMiniMapState({
    canvas,
    getCurrentMap:()=>currentMap,
    initialLayout:store.state?.uiLayout?.miniMap,
    onChange:layout=>{
      if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
      store.state.uiLayout.miniMap = layout;
      saveState();
    }
  });
  const weapons = createWeaponSystem({
    getPlayer:()=>player,
    getBullets:()=>bullets,
    getParticles:()=>particles,
    getSelectedEnemy:validSelectedEnemy,
    getActiveShip:()=>store.state.activeShip,
    getActionSlots:()=>store.state.actionSlots || [],
    getActiveLaserSlot:()=>activeLaserSlot,
    setActiveLaserSlot:value=>{ activeLaserSlot = value; },
    getAmmo,
    getAmmoCount,
    getCombatAmmo:index=>getCombatAmmo(index),
    getAmmoCooldown:ammo=>getAmmoCooldown(ammo),
    setAmmoCooldown:(ammo, seconds)=>setAmmoCooldown(ammo, seconds),
    getEffectiveAmmoCooldown:ammo=>getEffectiveAmmoCooldown(ammo),
    tickAmmoCooldowns:dt=>{ for(const id of Object.keys(ammoCooldowns || {})) ammoCooldowns[id] = Math.max(0, ammoCooldowns[id] - dt); },
    getEquippedLasers,
    getEquippedDroneLasers,
    consumeAmmo,
    markCombatActivity,
    saveState,
    refreshActionBar:()=>updateGameActionBar(),
    refreshQuickPanel:()=>renderCombatQuickPanel(),
    showToast,
    playerHitChance:PLAYER_HIT_CHANCE
  });
  const repairBot = createRepairBotSystem({
    getPlayer:()=>player,
    getParticles:()=>particles,
    pushDamageText,
    showToast
  });
  const rewards = createRewardSystem({
    store,
    portals,
    enemyTypes:ENEMY_TYPES,
    rawDropTable:RAW_DROP_TABLE,
    getCurrentMap:()=>currentMap,
    getGameMode:()=>gameMode,
    getAllRawMaterials,
    getSkillBonus,
    registerKill,
    recordQuestKill,
    addXP,
    addPortalPiece,
    spawnCargoBox,
    getSelectedEnemy:()=>selectedEnemy,
    clearSelectedEnemy,
    getParticles:()=>particles,
    saveState,
    showToast,
    onLootChanged:()=>updateLootPopup()
  });
  const lifecycle = createPlayerLifecycle({
    getPlayer:()=>player,
    getCurrentMap:()=>currentMap,
    markCombatActivity,
    clearMovement:()=>{ moveTarget = null; },
    clearSelection:()=>{ selectedEnemy = null; },
    clearCombatEffects:()=>{ bullets = []; particles = []; damageTexts = []; cargoBoxes = []; groundMaterials = []; pendingCargoBox = null; pendingGroundMaterial = null; },
    setTeleportLock:value=>{ teleportLock = value; },
    updateHud,
    showToast
  });
  const frameLoop = createCombatLoop({
    isRunning:()=>running,
    update,
    draw,
    getLastTime:()=>last,
    setLastTime:value=>{ last = value; }
  });

  function preload(){
    preloadCombatAssets({cache, ships, equipment:[...equipment, ...getAllRawMaterials(), {img:"assets/materials/cargo_box.svg"}], enemyTypes:ENEMY_TYPES, maps:MAPS, ranks:RANK_TABLE, getRankAssetPath});
  }

  function getCanvasViewWidth(){ return canvas.__viewWidth || canvas.clientWidth || window.innerWidth || canvas.width; }
  function getCanvasViewHeight(){ return canvas.__viewHeight || canvas.clientHeight || window.innerHeight || canvas.height; }

  function resize(){
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    const dpr = Math.max(1, Math.min(1.75, window.devicePixelRatio || 1));
    canvas.__viewWidth = width;
    canvas.__viewHeight = height;
    canvas.__dpr = dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
  }

  function getActiveShip(){
    return ships.find(ship=>ship.id === store.state.activeShip) || ships[0];
  }

  function getMapState(map){
    if(!mapStates.has(map.id)){
      const built = buildMapState(map, enemySeq);
      enemySeq = built.nextEnemySeq;
      mapStates.set(map.id, built.state);
    }
    return mapStates.get(map.id);
  }

  function getSafeAreas(map = currentMap){
    const zones = [];
    if(map?.spawn) zones.push({id:"spawn", label:map.spawn.label || "Zone de spawn", x:map.spawn.x, y:map.spawn.y, r:map.spawn.safeRadius || map.spawn.r || 260, type:"spawn"});
    if(map?.portal) zones.push({id:"portal", label:"Zone portail", x:map.portal.x, y:map.portal.y, r:map.portal.safeRadius || Math.max(180, (map.portal.r || 90) * 2.2), type:"portal"});
    return zones;
  }

  function getCurrentSafeArea(){
    return getSafeAreas().find(zone=>Math.hypot(player.x-zone.x, player.y-zone.y) <= zone.r) || null;
  }

  function isSafeModeActive(){
    if(gameMode !== "open") return false;
    return !!getCurrentSafeArea() && (player.safeZoneLock || 0) <= 0;
  }

  function markCombatActivity(reason = "combat"){
    player.safeZoneLock = SAFE_ZONE_DELAY;
    if(reason === "outgoing") player.lastAggression = performance.now();
  }

  function getSpawnStations(){
    if(gameMode !== "open" || !currentMap?.spawn) return [];
    return [
      {id:"quests", x:currentMap.spawn.x - 128, y:currentMap.spawn.y - 86, radius:48, title:"RELAIS DE QUÊTES", subtitle:"Recevoir et rendre des missions"},
      {id:"refinery", x:currentMap.spawn.x + 132, y:currentMap.spawn.y - 90, radius:52, title:"RAFFINEUR", subtitle:"Fusionner et améliorer l’équipement"}
    ];
  }

  function makeGroundMaterialPreview(map){
    if(!map || map.id !== 0) return [];
    const raw = getAllRawMaterials().slice(0, 5);
    const offsets = [
      {x:1040, y:-620, glowCore:"rgba(249,115,22,.34)", glow:"rgba(249,115,22,.18)", fallback:"rgba(249,115,22,.74)"},
      {x:1340, y:-820, glowCore:"rgba(186,230,253,.34)", glow:"rgba(125,211,252,.18)", fallback:"rgba(186,230,253,.74)"},
      {x:1570, y:-430, glowCore:"rgba(203,213,225,.30)", glow:"rgba(203,213,225,.16)", fallback:"rgba(203,213,225,.74)"},
      {x:1230, y:-170, glowCore:"rgba(251,146,60,.30)", glow:"rgba(251,146,60,.16)", fallback:"rgba(251,146,60,.74)"},
      {x:1760, y:-40, glowCore:"rgba(103,232,249,.34)", glow:"rgba(103,232,249,.18)", fallback:"rgba(103,232,249,.74)"}
    ];
    return raw.map((material, index)=>({
      uid:`ground_${map.id}_${material.id}_${index}`,
      id:material.id,
      name:material.name,
      label:material.short || material.name,
      img:material.img,
      x:map.spawn.x + offsets[index].x,
      y:map.spawn.y + offsets[index].y,
      size:42,
      radius:30,
      phase:index * 1.7,
      ...offsets[index]
    }));
  }

  function getStationAt(world){
    return getSpawnStations().find(station=>Math.hypot(world.x-station.x, world.y-station.y) <= station.radius + 18) || null;
  }

  function closeSpawnPanel(){
    spawnPanelMode = null;
    spawnPanelRefreshT = 0;
    document.getElementById("spawnInteractionPanel")?.classList.add("hidden");
    syncUtilityDockButtons();
  }

  function escapeHtml(value = ""){
    return String(value).replace(/[&<>"']/g, char=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    })[char]);
  }

  function closeUtilityPanel(){
    document.querySelectorAll(".combat-utility-panel").forEach(panel=>panel.classList.add("hidden"));
    syncUtilityDockButtons();
  }

  function getUtilityPanel(mode){
    if(mode === "quests") return document.getElementById("combatUtilityPanelQuests");
    if(mode === "group") return document.getElementById("combatUtilityPanelGroup");
    return null;
  }

  function getUtilityContent(mode){
    if(mode === "quests") return document.getElementById("combatUtilityContentQuests");
    if(mode === "group") return document.getElementById("combatUtilityContentGroup");
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

  function saveUtilityPanelLayout(mode, layout){
    if(!store.state.uiLayout || typeof store.state.uiLayout !== "object") store.state.uiLayout = {};
    if(!store.state.uiLayout.combatUtilityPanels || typeof store.state.uiLayout.combatUtilityPanels !== "object") store.state.uiLayout.combatUtilityPanels = {};
    store.state.uiLayout.combatUtilityPanels[mode] = layout;
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
      enemyTypes:ENEMY_TYPES,
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

  function renderGroupUtilityContent(){
    const membersHtml = groupMembers.length
      ? groupMembers.map(name=>`<div class="group-panel-member"><strong>${escapeHtml(name)}</strong><span>Invite</span></div>`).join("")
      : `<p class="group-panel-note">Aucun allie invite pour le moment.</p>`;
    return `
      <div class="group-panel-form">
        <input id="groupInviteName" type="text" maxlength="24" placeholder="Nom du pilote">
        <button class="blue-button small" data-group-invite type="button">INVITER</button>
      </div>
      <p class="group-panel-note">Prototype groupe : entre le nom d'un allie pour preparer l'invitation.</p>
      <div class="group-panel-list">${membersHtml}</div>
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
    if(focus) document.getElementById("groupInviteName")?.focus();
  }

  function openUtilityPanel(mode){
    if(!["group", "quests"].includes(mode)) return;
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
    if(!cleaned) return showToast("Nom de pilote requis.");
    if(groupMembers.some(member=>member.toLowerCase() === cleaned.toLowerCase())){
      return showToast(`${cleaned} est deja dans la liste.`);
    }
    groupMembers.push(cleaned);
    showToast(`Invitation de groupe envoyee a ${cleaned}.`);
    refreshGroupUtilityPanel({show:true, focus:true});
  }

  function formatDuration(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function loadMap(mapId, x, y){
    gameMode = "open";
    activePortal = null;
    portalWave = 0;
    portalDelay = 0;
    portalCompleted = false;
    currentMap = MAPS.find(m=>m.id === mapId) || MAPS[0];
    const mapState = getMapState(currentMap);
    enemies = mapState.enemies;
    asteroids = mapState.asteroids;
    stars = mapState.stars;
    dust = mapState.dust;
    groundMaterials = makeGroundMaterialPreview(currentMap);
    nebulae = currentMap.id === 0 ? [
      {x:-1500,y:-820,r:980,c:"rgba(56,189,248,.11)",p:.22},
      {x:880,y:-260,r:760,c:"rgba(34,197,94,.06)",p:.18},
      {x:420,y:980,r:680,c:"rgba(14,165,233,.08)",p:.24}
    ] : [
      {x:-1250,y:-720,r:980,c:"rgba(168,85,247,.12)",p:.24},
      {x:1250,y:-120,r:820,c:"rgba(239,68,68,.09)",p:.27},
      {x:540,y:1080,r:760,c:"rgba(251,146,60,.08)",p:.2}
    ];
    player.x = x ?? currentMap.spawn.x;
    player.y = y ?? currentMap.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.engineParticleT = 0;
    player.radiationTimer = 30;
    clampPlayerToMap();
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    cargoBoxes = [];
    pendingCargoBox = null;
    particles = [];
    damageTexts = [];
    teleportLock = 1.2;
    player.safeZoneLock = 0;
    radiationWarned = false;
    closeSpawnPanel();
    showToast(`Entrée dans ${currentMap.name}.`);
    updateHud();
  }

  function spawnPortalWave(wave){
    portalWave = wave;
    portalDelay = 0;
    selectedEnemy = null;
    bullets = [];
    cargoBoxes = [];
    pendingCargoBox = null;
    const built = buildPortalWave(wave, enemySeq);
    enemySeq = built.nextEnemySeq;
    enemies = built.enemies;
    showToast(wave < PORTAL_WAVE_TOTAL ? `Portail : vague ${wave}/${PORTAL_WAVE_TOTAL}` : "Vague 30/30 · Boss !");
    updateHud();
  }

  function completePortalRun(){
    if(portalCompleted || !activePortal) return;
    portalCompleted = true;
    markPortalCompleted(activePortal.id);
    store.state.player.premium += 20000;
    addAmmo("ammo_x4", 20000);
    addInventoryItem("laser_mk4");
    showToast(`${activePortal.name} terminé : +20 000 NOVA, +20 000 munitions x4, +1 Laser MK-IV.`);
    saveState();
    updateHud();
  }

  function loadPortalArena(portalId){
    const portal = portals.find(p=>p.id === portalId) || portals[0];
    gameMode = "portal";
    activePortal = portal;
    portalWave = 0;
    portalDelay = 0.35;
    portalCompleted = false;
    currentMap = createPortalMap(portal);
    enemies = [];
    const environment = buildPortalEnvironment(portalId, currentMap);
    asteroids = environment.asteroids;
    stars = environment.stars;
    dust = environment.dust;
    groundMaterials = [];
    nebulae = environment.nebulae;
    player.x = currentMap.spawn.x;
    player.y = currentMap.spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    player.engineParticleT = 0;
    clampPlayerToMap();
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    particles = [];
    damageTexts = [];
    teleportLock = 1.2;
    player.safeZoneLock = SAFE_ZONE_DELAY;
    closeSpawnPanel();
    showToast(`Accès à ${portal.name}. 30 vagues détectées.`);
    updateHud();
  }

  function start(entry="open"){
    if(running) return;
    preload(); resize();
    miniMap.applyLayout(store.state?.uiLayout?.miniMap, false);
    running = true;
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");
    const stats = getShipCombatStats(store.state.activeShip);
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    player = {
      x:0,y:0,angle:0,
      hp:stats.vie,maxHp:stats.vie,
      shield:stats.bouclier,maxShield:stats.bouclier,regen:stats.regen,
      speed:stats.vitesseReelle,
      displayedSpeed:stats.vitesseReelle,
      damageBonus:stats.weaponDamage,
      damageMultiplier:1 + Number(stats.weaponDamagePercent || 0),
      shieldAbsorbRatio:Math.max(0, Math.min(0.9, Number(stats.shieldAbsorbRatio ?? 0.5))),
      extraBonus:stats.extraBonus || {autoRocket:false, rocketCooldownMultiplier:1, rocketDamageBonus:0, repairBot:false, repairBotAuto:false, repairBotHealRate:0.02, repairBotDelay:15},
      radar:RADAR_RANGE,
      droneOrbit:0,
      secondsSinceDamage:999,
      repairBotActive:false,
      repairBotTickTimer:0,
      safeZoneLock:0,
      lastAggression:0,
      vx:0,
      vy:0,
      enginePower:0,
      engineAngle:0,
      engineParticleT:0,
      radiationTimer:30
    };
    camera = {x:-getCanvasViewWidth()/2,y:-getCanvasViewHeight()/2,zoom:1};
    mouse = {x:getCanvasViewWidth()/2,y:getCanvasViewHeight()/2};
    bullets = []; particles = []; damageTexts = []; cargoBoxes = []; groundMaterials = []; pendingCargoBox = null; pendingGroundMaterial = null; selectedEnemy = null; moveTarget = null;
    cleanCombatActionSlots();
    activeLaserSlot = null;
    ammoCooldowns = {};
    combatPanelTab = "ammo";
    groupMembers = [];
    const activeQuest = getActiveQuest();
    selectedQuestCategory = activeQuest?.category || "normal";
    selectedQuestId = activeQuest?.id || getAllQuests().find(quest=>(quest.category || "normal") === selectedQuestCategory)?.id || null;
    hudT = 0; rewards.reset();
    if(typeof entry === "string" && entry.startsWith("portal:")) loadPortalArena(entry.split(":")[1] || "blue");
    else loadMap(0, MAPS[0].spawn.x, MAPS[0].spawn.y);
    renderGameActionBar();
    renderCombatQuickPanel();
    updateHud();
    frameLoop.start();
  }

  function stop(save=true){
    if(!running) return;
    running = false;
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("combatQuickPanel").classList.add("hidden");
    closeUtilityPanel();
    closeSpawnPanel();
    if(save){
      saveState();
      renderAll();
      showToast("Retour hangar.");
    }
  }

  function worldFromScreen(sx, sy){ return screenToWorld({sx, sy, camera}); }

  function clampPlayerToMap(){
    clampPlayerToMapSystem({player, map:currentMap});
  }

  function isPlayerOutsideMap(){
    if(!currentMap || gameMode !== "open") return false;
    const halfW = currentMap.width / 2;
    const halfH = currentMap.height / 2;
    return player.x < -halfW || player.x > halfW || player.y < -halfH || player.y > halfH;
  }

  function updateRadiation(dt){
    if(gameMode !== "open"){
      player.radiationTimer = 30;
      radiationWarned = false;
      return;
    }
    if(!isPlayerOutsideMap()){
      player.radiationTimer = 30;
      radiationWarned = false;
      return;
    }
    player.radiationTimer = Math.max(0, Number(player.radiationTimer ?? 30) - dt);
    if(!radiationWarned){
      radiationWarned = true;
      showToast("Zone irradiée : retourne dans la carte ou ton vaisseau sera détruit.");
    }
    if(player.radiationTimer <= 0){
      showToast("Vaisseau détruit par la zone irradiée.");
      player.radiationTimer = 30;
      radiationWarned = false;
      lifecycle.respawn();
    }
  }

  function findEnemyAt(world){
    let best = null, bestD = Infinity;
    for(const e of enemies){
      const d = Math.hypot(world.x-e.x, world.y-e.y);
      if(d < e.radius + 28 && d < bestD){ best = e; bestD = d; }
    }
    return best;
  }

  function validSelectedEnemy(){
    if(!selectedEnemy) return null;
    const live = enemies.find(e=>e.id === selectedEnemy.id && e.hp > 0);
    if(!live) selectedEnemy = null; else selectedEnemy = live;
    return selectedEnemy;
  }

  function clearSelectedEnemy(){
    selectedEnemy = null;
    updateHud();
  }

  function getCombatAmmo(index){ return getAmmo(store.state.actionSlots?.[index]); }
  function getCombatExtra(index){
    const item = getItem(store.state.actionSlots?.[index]);
    if(!item || item.category !== "extra") return null;
    return getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id) ? item : null;
  }

  function getAmmoCooldown(ammoOrId){
    return readAmmoCooldown(ammoCooldowns, ammoOrId, getAmmo);
  }

  function spawnCargoBox(enemy, materials){
    if(!materials?.length) return null;
    const box = {
      id:Date.now() + Math.floor(Math.random() * 10000),
      x:enemy.x + (Math.random() - .5) * 70,
      y:enemy.y + (Math.random() - .5) * 70,
      radius:38,
      materials
    };
    cargoBoxes.push(box);
    return box;
  }

  function findCargoBoxAt(world){
    return cargoBoxes.find(box=>Math.hypot(world.x - box.x, world.y - box.y) <= box.radius) || null;
  }

  function findGroundMaterialAt(world){
    return groundMaterials.find(node=>Math.hypot(world.x - node.x, world.y - node.y) <= (node.radius || 30)) || null;
  }

  function collectCargoBox(box){
    const index = cargoBoxes.findIndex(entry=>entry.id === box.id);
    if(index < 0) return false;
    const rawMaterials = getAllRawMaterials();
    const labels = [];
    const remainingMaterials = [];
    let addedTotal = 0;
    for(const drop of box.materials || []){
      const result = addShipCargoMaterial(drop.id, drop.amount);
      const material = rawMaterials.find(item=>item.id === drop.id);
      if(result.added > 0){
        labels.push(`${result.added} ${material?.short || drop.id.toUpperCase()}`);
        addedTotal += result.added;
      }
      if(result.remaining > 0) remainingMaterials.push({...drop, amount:result.remaining});
    }
    if(addedTotal <= 0){
      pendingCargoBox = null;
      showToast("Soute pleine.");
      updateHud();
      return false;
    }
    if(remainingMaterials.length) box.materials = remainingMaterials;
    else cargoBoxes.splice(index, 1);
    particles.push({x:box.x, y:box.y, life:.42, max:.42, size:26, color:"rgba(34,197,94,.58)"});
    saveState();
    const used = getShipCargoUsed(store.state.activeShip);
    const capacity = getShipCargoCapacity(store.state.activeShip);
    showToast(`Cargo récupéré : ${labels.join(" · ")} (${fmt(used)} / ${fmt(capacity)}).`);
    rewards.showCargoLoot(labels);
    pendingCargoBox = null;
    updateHud();
    if(spawnPanelMode) renderSpawnInteractionPanel(spawnPanelMode);
    return true;
  }

  function setCargoDestination(box){
    pendingCargoBox = box;
    pendingGroundMaterial = null;
    moveTarget = {x:box.x, y:box.y};
    return true;
  }

  function collectGroundMaterial(node){
    const index = groundMaterials.findIndex(entry=>entry.uid === node.uid);
    if(index < 0) return false;
    const result = addShipCargoMaterial(node.id, 1);
    if(result.added <= 0){
      pendingGroundMaterial = null;
      showToast("Soute pleine.");
      updateHud();
      return false;
    }
    groundMaterials.splice(index, 1);
    particles.push({x:node.x, y:node.y, life:.36, max:.36, size:24, color:node.glowCore || "rgba(125,211,252,.5)"});
    saveState();
    showToast(`+1 ${node.name} dans la soute.`);
    pendingGroundMaterial = null;
    updateHud();
    return true;
  }

  function setGroundMaterialDestination(node){
    pendingGroundMaterial = node;
    pendingCargoBox = null;
    moveTarget = {x:node.x, y:node.y};
    return true;
  }

  function setAmmoCooldown(ammo, seconds){
    writeAmmoCooldown(ammoCooldowns, ammo, seconds, getAmmoCooldown);
  }

  function getEffectiveAmmoCooldown(ammo){
    if(!ammo) return 1;
    if(ammo.weaponClass === "rocket") return Math.max(.5, (ammo.cooldown || 5) * (player.extraBonus?.rocketCooldownMultiplier || 1));
    return ammo.cooldown || 1;
  }

  function getRepairBotDelay(){
    return repairBot.getDelay();
  }

  function canRepairBotActivate(){
    return repairBot.canActivate();
  }

  function activateRepairBot(manual = false){
    return repairBot.activate(manual);
  }

  function updateRepairBot(dt){
    repairBot.update(dt);
  }

  function selectActionSlot(index){
    const ammo = getCombatAmmo(index);
    const extra = getCombatExtra(index);
    if(extra){
      if(extra.effect.repairBot){
        activateRepairBot(true);
        renderCombatQuickPanel();
        updateHud();
        updateGameActionBar();
        return;
      }
      return showToast(`${extra.name} est un extra passif.`);
    }
    if(!ammo) return showToast(`Slot ${index+1} vide.`);
    if(getAmmoCount(ammo.id) <= 0) return showToast(`${ammo.name} : stock vide.`);

    if(ammo.weaponClass === "rocket"){
      fireManualRocket(index, ammo);
      return;
    }

    if(activeLaserSlot === index){
      activeLaserSlot = null;
      showToast(`Laser désactivé : slot ${index+1}.`);
      updateGameActionBar();
      return;
    }

    activeLaserSlot = index;
    showToast(`Laser actif : slot ${index+1} · ${describeAmmo(ammo)}.`);
    updateGameActionBar();
  }

  function getLaserVolley(){
    return weapons.getLaserVolley();
  }


  function getEnemyHitChance(enemy){
    return ENEMY_HIT_CHANCE[enemy?.kind] || 0.88;
  }

  function getBulletTarget(bullet){
    if(bullet.owner === "enemy") return {x:player.x, y:player.y, entity:player};
    const enemy = enemies.find(e=>e.id === bullet.targetId && e.hp > 0);
    return enemy ? {x:enemy.x, y:enemy.y, entity:enemy} : null;
  }

  function pushDamageText({x, y, value, color, shadowColor}){
    damageTexts.push({x, y, value, life:.92, max:.92, color, shadowColor});
  }

  function resolveBulletImpact(bullet){
    const target = getBulletTarget(bullet);
    if(!target) return;
    particles.push({x:bullet.x, y:bullet.y, life:.22, max:.22, size:12, color:bullet.particle || "rgba(125,211,252,.8)"});
    const hitChance = bullet.hitChance ?? (bullet.owner === "enemy" ? 0.88 : PLAYER_HIT_CHANCE);
    const hit = Math.random() <= hitChance;

    if(bullet.owner === "enemy"){
      if(hit){
        const dealt = Math.round(bullet.damage);
        damagePlayer(dealt);
        pushDamageText({x:player.x, y:player.y-58, value:dealt, color:"rgba(248,113,113,", shadowColor:"rgba(248,113,113,.78)"});
      }else{
        pushDamageText({x:player.x, y:player.y-58, value:"MISS", color:"rgba(226,232,240,", shadowColor:"rgba(148,163,184,.78)"});
      }
      return;
    }

    const enemy = target.entity;
    if(!enemy || enemy.hp <= 0) return;
    if(hit){
      const dealt = Math.round(bullet.damage);
      enemy.hp -= dealt;
      enemy.aggro = true;
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
      if(enemy.hp <= 0) rewardEnemy(enemy);
    }else{
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
    }
  }

  function shootAt(enemy, ammo, slotIndex){
    return weapons.shootAt(enemy, ammo, slotIndex);
  }

  function fireManualRocket(index, ammo){
    return weapons.fireManualRocket(index, ammo);
  }

  function damagePlayer(amount){
    lifecycle.damage(amount);
  }

  function rewardEnemy(enemy){
    rewards.rewardEnemy(enemy);
  }

  function fireAutomaticRocket(enemy){
    return weapons.fireAutomaticRocket(enemy);
  }

  function updateWeapons(dt){
    return weapons.updateWeapons(dt);
  }

  function update(dt){
    teleportLock = Math.max(0, teleportLock - dt);
    rewards.tick(dt);
    player.safeZoneLock = Math.max(0, Number(player.safeZoneLock || 0) - dt);
    updateLootPopup();

    if(isSafeModeActive()){
      bullets = bullets.filter(bullet=>bullet.owner !== "enemy");
      for(const enemy of enemies) enemy.aggro = false;
    }

    if(mouseMoveHeld && mouse) moveTarget = worldFromScreen(mouse.x, mouse.y);
    moveTarget = updatePlayerMovement({player, moveTarget, dt, map:currentMap, clampToMap:gameMode !== "open"});
    updateRadiation(dt);
    if(pendingCargoBox){
      const liveCargo = cargoBoxes.find(box=>box.id === pendingCargoBox.id);
      if(!liveCargo) pendingCargoBox = null;
      else if(Math.hypot(player.x - liveCargo.x, player.y - liveCargo.y) <= liveCargo.radius + 24) collectCargoBox(liveCargo);
    }
    if(pendingGroundMaterial){
      const liveMaterial = groundMaterials.find(node=>node.uid === pendingGroundMaterial.uid);
      if(!liveMaterial) pendingGroundMaterial = null;
      else if(Math.hypot(player.x - liveMaterial.x, player.y - liveMaterial.y) <= (liveMaterial.radius || 30) + 24) collectGroundMaterial(liveMaterial);
    }

    if(gameMode === "portal"){
      if(!portalCompleted && enemies.length === 0){
        if(portalWave === 0 || portalWave < PORTAL_WAVE_TOTAL){
          portalDelay -= dt;
          if(portalDelay <= 0) spawnPortalWave(portalWave + 1);
        }else completePortalRun();
      }
    }

    const enemy = validSelectedEnemy();
    if(enemy && activeLaserSlot !== null) player.angle = Math.atan2(enemy.y-player.y, enemy.x-player.x)+Math.PI/2;
    emitPlayerEngineParticles({
      dt,
      player,
      ship:getActiveShip(),
      particles,
      defaultProfile:DEFAULT_ENGINE_PROFILE,
      profiles:SHIP_ENGINE_PROFILES
    });

    updateEnemies(dt);
    updateWeapons(dt);
    updateBullets(dt);
    updateParticles(dt);
    updateRepairBot(dt);

    if(player.maxShield > 0) player.shield = Math.min(player.maxShield, player.shield + (player.regen || 0)*dt);
    const targetZoom = isPlayerOutsideMap() ? 0.78 : 1;
    camera.zoom = (camera.zoom || 1) + (targetZoom - (camera.zoom || 1)) * Math.min(1, dt * 4.5);
    updateCamera({camera, player, canvas, follow:1});
    hudT -= dt;
    if(hudT <= 0){
      updateHud();
      updateGameActionBar();
      hudT = .10;
    }
    const quickPanel = document.getElementById("combatQuickPanel");
    if(quickPanel && !quickPanel.classList.contains("hidden")){
      quickPanelRefreshT -= dt;
      if(quickPanelRefreshT <= 0 && !quickPanel.matches(":hover")){
        renderCombatQuickPanel();
        quickPanelRefreshT = 1;
      }
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
  }

  function updateEnemies(dt){
    updateEnemyAi({
      enemies,
      player,
      dt,
      safeMode:isSafeModeActive(),
      aggroRange:AGGRO_RANGE,
      leashRange:LEASH_RANGE,
      playerCollisionRadius:PLAYER_COLLISION_RADIUS,
      onEnemyAttack:fireEnemyBullet
    });
  }

  function fireEnemyBullet(enemy, dx, dy, dist){
    const d = dist || Math.hypot(dx,dy) || 1;
    const a = Math.atan2(dy, dx);
    const speed = enemy.projectileSpeed || 600;
    const startX = enemy.x + Math.cos(a)*(enemy.radius+14);
    const startY = enemy.y + Math.sin(a)*(enemy.radius+14);
    bullets.push(createProjectile({
      owner:"enemy",
      startX,
      startY,
      damage:enemy.attackDamage || 10,
      travelTime:Math.max(.11, Math.min(1.15, d/speed + .06)),
      radius:5,
      color:enemy.color || "rgba(248,113,113,.95)",
      particle:enemy.particle || "rgba(252,165,165,.75)",
      sourceId:enemy.id,
      hitChance:getEnemyHitChance(enemy)
    }));
    particles.push({x:startX,y:startY,life:.16,max:.16,size:16,color:enemy.particle || "rgba(252,165,165,.72)"});
  }

  function updateBullets(dt){
    bullets = updateProjectiles({bullets, dt, getTarget:getBulletTarget, onImpact:resolveBulletImpact});
    enemies = enemies.filter(e=>e.hp>0);
    getMapState(currentMap).enemies = enemies;
  }

  function updateParticles(dt){
    for(const p of particles){ p.life -= dt; p.x += (p.vx||0)*dt; p.y += (p.vy||0)*dt; }
    particles = particles.filter(p=>p.life>0);
    for(const t of damageTexts){ t.life -= dt; t.y -= 38*dt; }
    damageTexts = damageTexts.filter(t=>t.life>0);
  }

  function drawBackground(){
    drawWorldLayer({ctx, canvas, cache, currentMap, camera, nebulae, stars, dust, asteroids, player, safeReady:isSafeModeActive(), stations:getSpawnStations()});
  }

  function draw(){
    const dpr = canvas.__dpr || 1;
    const viewW = getCanvasViewWidth();
    const viewH = getCanvasViewHeight();
    const zoom = camera?.zoom || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    canvas.__renderWidth = viewW / zoom;
    canvas.__renderHeight = viewH / zoom;
    ctx.save();
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    drawBackground();
    drawProjectiles({ctx, camera, bullets});
    drawParticles({ctx, camera, particles});
    drawGroundMaterials({ctx, camera, cache, materials:groundMaterials});
    drawEnemies({ctx, camera, cache, enemies, selectedEnemy});
    drawCargoBoxes({ctx, camera, cache, cargoBoxes});
    const rank = getCurrentRank();
    drawPlayerLayer({
      ctx,
      camera,
      cache,
      player,
      ship:getActiveShip(),
      drones:getDroneLoadout(),
      rank,
      rankAssetPath:getRankAssetPath(rank),
      pilotName:store.state.player.name || "PILOTE",
      getItemFromInventoryUid,
      defaultProfile:DEFAULT_ENGINE_PROFILE,
      profiles:SHIP_ENGINE_PROFILES
    });
    drawDamageTexts();
    ctx.restore();
    canvas.__renderWidth = null;
    canvas.__renderHeight = null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRadiationOverlay();
    drawMiniMap();
  }

  function drawRadiationOverlay(){
    if(gameMode !== "open" || !isPlayerOutsideMap()) return;
    const viewW = getCanvasViewWidth();
    const viewH = getCanvasViewHeight();
    const pulse = (Math.sin(performance.now() / 155) + 1) / 2;
    const alpha = .07 + pulse * .16;
    ctx.save();
    ctx.fillStyle = `rgba(185,28,28,${alpha})`;
    ctx.fillRect(0, 0, viewW, viewH);
    const g = ctx.createRadialGradient(viewW / 2, viewH / 2, Math.min(viewW, viewH) * .20, viewW / 2, viewH / 2, Math.max(viewW, viewH) * .72);
    g.addColorStop(0, "rgba(127,29,29,0)");
    g.addColorStop(.58, `rgba(127,29,29,${alpha * .42})`);
    g.addColorStop(1, `rgba(220,38,38,${alpha * 1.35})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.restore();
  }

  function drawDamageTexts(){
    drawDamageTextsCanvas({ctx, camera, damageTexts});
  }

  function drawMiniMap(){
    drawMiniMapCanvas({ctx, canvas, currentMap, player, enemies, rect:miniMap.rect(), moveTarget});
  }

  function updateHud(){
    const enemy = validSelectedEnemy();
    const rank = getCurrentRank();
    const repairState = canRepairBotActivate();
    const safeArea = getCurrentSafeArea();
    const safeLabel = safeArea ? ((player.safeZoneLock || 0) <= 0 ? ` · SAFE ${safeArea.type === "portal" ? "PORTAIL" : "SPAWN"}` : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`) : "";
    document.getElementById("gameZoneName").textContent = gameMode === "portal" ? `PORTAIL : ${activePortal?.name || currentMap.name}${portalWave ? ` · VAGUE ${Math.min(portalWave, PORTAL_WAVE_TOTAL)}/${PORTAL_WAVE_TOTAL}` : " · PRÉPARATION"}` : `ZONE : ${currentMap.name}${safeLabel}`;
    document.getElementById("gamePlayerName").textContent = store.state.player.name || "PILOTE";
    document.getElementById("gameRankHud").innerHTML = `<img class="rank-icon" src="${getRankAssetPath(rank)}" alt="${rank.name}"><span>${rank.name}</span>`;
    document.getElementById("gameLevel").textContent = store.state.player.level;
    updateCombatMeter({metric:"hp", value:player.hp, max:player.maxHp, label:"la vie", mode:combatMetricModes.hp});
    updateCombatMeter({metric:"shield", value:player.shield, max:player.maxShield, label:"le bouclier", mode:combatMetricModes.shield});
    updateCombatMeter({metric:"xp", value:store.state.player.xp, max:store.state.player.xpNext, label:"l'expérience", mode:combatMetricModes.xp});
    document.getElementById("gameSpeed").textContent = player.displayedSpeed;
    const cargoUsed = getShipCargoUsed(store.state.activeShip);
    const cargoCapacity = getShipCargoCapacity(store.state.activeShip);
    const cargoPercent = cargoCapacity > 0 ? Math.max(0, Math.min(100, cargoUsed / cargoCapacity * 100)) : 0;
    const cargoToggle = document.getElementById("gameCargoToggle");
    const cargoValue = document.getElementById("gameCargoValue");
    const cargoFill = document.getElementById("gameCargoFill");
    if(cargoValue) cargoValue.textContent = `${fmt(cargoUsed)} / ${fmt(cargoCapacity)}`;
    if(cargoFill) cargoFill.style.width = `${cargoPercent}%`;
    if(cargoToggle){
      cargoToggle.classList.toggle("expanded", combatCargoExpanded);
      cargoToggle.classList.toggle("full", cargoCapacity > 0 && cargoUsed >= cargoCapacity);
      cargoToggle.title = `Soute : ${fmt(cargoUsed)} / ${fmt(cargoCapacity)}`;
    }
    document.getElementById("gameRepairHud").textContent = !player.extraBonus?.repairBot ? "Robot : non équipé" : player.repairBotActive ? "Robot : actif" : repairState.ok ? (player.extraBonus?.repairBotAuto ? "Robot : prêt (auto)" : "Robot : prêt") : `Robot : ${repairState.reason}`;
    document.getElementById("gameCreditsHud").textContent = fmt(store.state.player.credits);
    document.getElementById("gamePremiumHud").textContent = fmt(store.state.player.premium);
    renderSafeZoneNotice({safeArea, isActive:gameMode === "open" && safeArea && (player.safeZoneLock || 0) <= 0});
    renderRadiationNotice();
    updateTargetPanel(enemy);
  }

  function renderRadiationNotice(){
    if(gameMode !== "open" || !isPlayerOutsideMap()) return;
    const notice = document.getElementById("safeZoneNotice");
    if(!notice) return;
    notice.classList.remove("hidden");
    notice.classList.add("is-radiation");
    const title = notice.querySelector("strong");
    const text = notice.querySelector("span");
    if(title) title.textContent = "ZONE IRRADIÉE";
    if(text) text.textContent = `Votre vaisseau sera détruit dans ${Math.ceil(player.radiationTimer ?? 30)}s si vous ne rejoignez pas la zone non irradiée.`;
  }

  function updateLootPopup(){
    renderLootPopup({notices:rewards.getLootNotices()});
  }

  function renderGameActionBar(){
    const el = document.getElementById("gameActionBar");
    const slots = Array.from({length:9}, (_,i)=>store.state.actionSlots?.[i] || null);
    el.innerHTML = renderActionBarHtml({slots, slotKeybinds:store.state.slotKeybinds, getAmmo, getExtra:getCombatExtra, getAmmoCount});
    updateGameActionBar();
  }

  function updateGameActionBar(){
    updateActionBarDom({
      activeLaserSlot,
      repairBotActive:player.repairBotActive,
      getAmmo:getCombatAmmo,
      getExtra:getCombatExtra,
      getRepairState:canRepairBotActivate,
      getAmmoCooldown,
      getEffectiveAmmoCooldown,
      getAmmoCount
    });
  }

  function renderCombatQuickPanel(){
    quickPanelRefreshT = 1;
    const panel = document.getElementById("combatQuickPanel");
    const content = document.getElementById("combatPanelContent");
    if(!panel || !content) return;
    updateQuickPanelTabs(panel, combatPanelTab);
    content.innerHTML = renderQuickPanelContent({
      tab:combatPanelTab,
      ammoTypes,
      extras:getEquippedExtras(store.state.activeShip),
      repairState:canRepairBotActivate(),
      repairBotActive:player.repairBotActive,
      extraBonus:player.extraBonus,
      repairBotDelay:getRepairBotDelay(),
      canAfford,
      getAmmoCount,
      laserVolleyCount:getLaserVolley().count || 1
    });
  }

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
    if(!mode){
      panel.classList.add("hidden");
      syncUtilityDockButtons();
      return;
    }
    panel.classList.remove("hidden");
    syncUtilityDockButtons();
    const upgradeables = [...new Set((store.state.inventoryItems || []).map(entry=>entry.itemId))]
      .map(id=>getItem(id))
      .filter(item=>item && ["canon","generateur"].includes(item.category));
    const rendered = renderSpawnPanelContent({
      mode,
      activeQuest:getActiveQuest(),
      activeQuests:getActiveQuests(),
      selectedQuestId,
      selectedQuestCategory,
      quests:getAllQuests(),
      playerLevel:store.state.player.level,
      enemyTypes:ENEMY_TYPES,
      rawMaterials:getAllRawMaterials(),
      getQuestProgress,
      completedQuestClaims:store.state.completedQuestClaims,
      job:getRefineryJob(),
      recipes:getRefineryRecipes(),
      materials:getAllRawMaterials(),
      getMaterialCount,
      upgradeables,
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
    selectedQuestCategory = category || "normal";
    const quests = getAllQuests().filter(quest=>(quest.category || "normal") === selectedQuestCategory);
    if(!quests.some(quest=>quest.id === selectedQuestId)) selectedQuestId = quests[0]?.id || null;
    renderSpawnInteractionPanel("quests");
  }

  function buyCombatAmmo(id){
    const ammo = getAmmo(id);
    if(!ammo) return;
    if(!canAfford(ammo.priceType, ammo.price)) return showToast("Fonds insuffisants.");
    spend(ammo.priceType, ammo.price);
    addAmmo(ammo.id, ammo.amount);
    saveState();
    updateHud();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${ammo.name} achetée : +${ammo.amount}.`);
  }

  function assignAmmoToActionSlot(index, ammoId){
    const ammo = getAmmo(ammoId);
    if(!ammo) return;
    setActionSlot(index, ammo.id);
    if(ammo.weaponClass === "rocket" && activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${ammo.name} placée en slot ${index+1}.`);
  }

  function cleanCombatActionSlots(){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    const equippedExtraIds = new Set(getEquippedExtras(store.state.activeShip).map(item=>item.id));
    store.state.actionSlots = Array.from({length:9}, (_,index)=>{
      const id = store.state.actionSlots[index] || null;
      if(!id || getAmmo(id)) return id;
      const item = getItem(id);
      return item?.category === "extra" && equippedExtraIds.has(item.id) ? id : null;
    });
  }

  function moveActionSlot(fromIndex, toIndex){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    if(fromIndex < 0 || fromIndex >= 9 || toIndex < 0 || toIndex >= 9 || fromIndex === toIndex) return false;
    const fromValue = store.state.actionSlots[fromIndex] || null;
    if(!fromValue) return false;
    const toValue = store.state.actionSlots[toIndex] || null;
    store.state.actionSlots[toIndex] = fromValue;
    store.state.actionSlots[fromIndex] = toValue;
    if(activeLaserSlot === fromIndex) activeLaserSlot = toIndex;
    else if(activeLaserSlot === toIndex) activeLaserSlot = fromIndex;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`Slot ${fromIndex+1} déplacé vers slot ${toIndex+1}.`);
    return true;
  }

  function clearActionSlot(index){
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    if(index < 0 || index >= 9 || !store.state.actionSlots[index]) return false;
    store.state.actionSlots[index] = null;
    if(activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`Slot ${index+1} vidé.`);
    return true;
  }

  function assignExtraToActionSlot(index, itemId){
    const item = getItem(itemId);
    if(!item || item.category !== "extra") return;
    if(!getEquippedExtras(store.state.activeShip).some(extra=>extra.id === item.id)){
      return showToast(`${item.name} doit etre equipe dans les extras du vaisseau.`);
    }
    if(!item.effect.repairBot){
      return showToast(`${item.name} est un extra passif.`);
    }
    setActionSlot(index, item.id);
    if(activeLaserSlot === index) activeLaserSlot = null;
    saveState();
    renderGameActionBar();
    renderCombatQuickPanel();
    showToast(`${item.name} place en slot ${index+1}.`);
  }

  function tryUseMapPortal(){
    if(gameMode !== "open" || !currentMap.portal) return false;
    const portalD = Math.hypot(player.x-currentMap.portal.x, player.y-currentMap.portal.y);
    if(portalD >= currentMap.portal.r) return false;
    if(teleportLock > 0) return true;
    loadMap(currentMap.portal.targetMap, currentMap.portal.targetX, currentMap.portal.targetY);
    return true;
  }

  installCombatInputHandlers({
    canvas,
    isRunning:()=>running,
    resize,
    saveState,
    getMouse:()=>mouse,
    setMoveTarget:value=>{ moveTarget = value; },
    setMouseMoveHeld:value=>{ mouseMoveHeld = value; },
    worldFromScreen,
    miniMapHitTest:miniMap.hitTest,
    worldFromMiniMap:miniMap.worldFromPoint,
    setMiniMapPosition:miniMap.setPosition,
    resizeMiniMap:miniMap.resize,
    saveUtilityPanelLayout,
    getCurrentMap:()=>currentMap,
    getSpawnPanelMode:()=>spawnPanelMode,
    getCombatMetricModes:()=>combatMetricModes,
    getActionSlots:()=>store.state.actionSlots || [],
    getSlotKeybinds:()=>store.state.slotKeybinds,
    clearSelectedEnemy,
    hasSelectedEnemy:()=>!!selectedEnemy,
    tryUseMapPortal,
    selectActionSlot,
    getStationAt,
    findEnemyAt,
    findCargoBoxAt,
    setCargoDestination,
    findGroundMaterialAt,
    setGroundMaterialDestination,
    setSelectedEnemy:enemy=>{ selectedEnemy = enemy; },
    renderSpawnInteractionPanel,
    openUtilityPanel,
    closeUtilityPanel,
    inviteGroupMember,
    trackCombatQuest,
    claimCombatQuest,
    setCombatQuestDetailTab,
    selectQuestForPanel,
    selectQuestCategoryForPanel,
    closeSpawnPanel,
    updateHud,
    moveActionSlot,
    clearActionSlot,
    assignExtraToActionSlot,
    assignAmmoToActionSlot,
    renderCombatQuickPanel,
    setCombatPanelTab:value=>{ combatPanelTab = value; },
    buyCombatAmmo,
    activateRepairBot,
    acceptQuest,
    claimQuest,
    startRefineryJob,
    claimRefineryJob,
    upgradeEquipment,
    showToast
  });

  document.getElementById("gameCargoToggle")?.addEventListener("click", e=>{
    e.preventDefault();
    e.stopPropagation();
    if(!running) return;
    combatCargoExpanded = !combatCargoExpanded;
    updateHud();
  });

  return {start, stop, get running(){return running;}};
}


