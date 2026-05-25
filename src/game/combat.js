import { ammoTypes, droneFormations, equipment, portals, ships } from "../data/catalog.js";
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
  consumeCombatBoostCharges,
  depositCombatBoostMaterial,
  getActiveQuest,
  getActiveQuests,
  getAllQuests,
  getAllRawMaterials,
  getAmmo,
  getAmmoCount,
  getCurrentRank,
  getDroneLoadout,
  getDroneFormation,
  getEquippedDroneLasers,
  getEquippedLauncher,
  getEquippedExtras,
  getGraphicsQuality,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getEquippedLasers,
  getItem,
  getItemFromInventoryUid,
  getMaterialCount,
  getRankAssetPath,
  RANK_TABLE,
  GRAPHICS_QUALITY_PRESETS,
  getQuestProgress,
  getRefineryJob,
  getRefineryRecipes,
  getShipCombatStats,
  getShipCargo,
  getShipCargoCapacity,
  getShipCargoUsed,
  getShipRefineryRecipeData,
  getCombatBoostSummary,
  getCombatBoostTooltip,
  getSkillBonus,
  isRefineryComplete,
  markPortalCompleted,
  recordQuestKill,
  refineShipCargoRecipe,
  registerKill,
  saveState,
  setActionSlot,
  startRefineryJob,
  spend,
  store,
  tickCombatBoosts,
  upgradeEquipment
} from "../core/store.js";

import {
  AGGRO_RANGE,
  DEFAULT_ENGINE_PROFILE,
  ENEMY_HIT_CHANCE,
  ENEMY_TYPES,
  LEASH_RANGE,
  MAPS,
  getMapPortals,
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
import { drawBeams, drawCargoBoxes, drawEnemies, drawGroundMaterials, drawImpactEffects, drawParticles, drawProjectiles } from "./render/entities.js";
import { drawPlayerLayer, spawnPlayerEngineParticles as emitPlayerEngineParticles } from "./render/player.js";
import { drawPortalTransitionOverlay } from "./render/portalTransition.js";
import { drawWorldLayer } from "./render/world.js";
import { createCombatLoop } from "./systems/combatLoop.js";
import { createCombatBeamSystem } from "./systems/combatBeams.js";
import { createCombatCargoSystem } from "./systems/combatCargo.js";
import { updateEnemyAi } from "./systems/enemyAi.js";
import { makeGroundMaterialPreview } from "./systems/groundMaterials.js";
import { advanceMapPortalTransition, createMapPortalTransition, findMapPortalAt } from "./systems/mapPortalTransfer.js";
import { buildMapState, createMapEnemy } from "./systems/mapState.js";
import { createMiniMapState } from "./systems/minimapState.js";
import { buildPortalEnvironment, buildPortalWave, createPortalMap } from "./systems/portalState.js";
import { createPlayerLifecycle } from "./systems/playerLifecycle.js";
import { clampPlayerToMap as clampPlayerToMapSystem, updateCamera, updatePlayerMovement, worldFromScreen as screenToWorld } from "./systems/playerMovement.js";
import { createProjectile, updateProjectiles } from "./systems/projectiles.js";
import { createRepairBotSystem } from "./systems/repairBot.js";
import { createRewardSystem } from "./systems/rewards.js";
import { createWeaponSystem } from "./systems/weapons.js";
import { updateCombatMeter, updateLootPopup as renderLootPopup, updatePoisonStatus, updateSafeZoneNotice as renderSafeZoneNotice, updateTargetPanel } from "./ui/hud.js";
import { installCombatInputHandlers } from "./ui/inputBindings.js";
import { createCombatActions } from "./ui/combatActions.js";
import { createCombatPanels } from "./ui/combatPanels.js";
export function createCombatGame({renderAll, showToast}){
  const PORTAL_STARTING_LIVES = 3;
  const PORTAL_WAVE_DELAY = 30;
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const cache = {};
  const mapStates = new Map();
  const PROFILE_TITLES = {
    first_contact:"Premier sang",
    hunter_100:"Traqueur spatial",
    veteran_25:"Vétéran d'Astra",
    portal_mastery:"Nettoyeur d'Astra",
    quest_5:"Mercenaire fiable",
    inventory_30:"Ingénieur de bord",
    skill_15:"Spécialiste",
    drone_5:"Chef d'escadron",
    hunter_500:"Chasseur abyssal"
  };

  let running = false;
  let last = 0;
  let hudT = 0;
  let quickPanelRefreshT = 0;
  let enemySeq = 1;
  let currentMap = MAPS[0];
  let teleportLock = 0;
  let player, camera, mouse, bullets, enemies, particles, impactEffects, damageTexts, stars, dust, nebulae, asteroids, moveTarget, selectedEnemy;
  let gameMode, activePortal, portalWave, portalDelay, portalCompleted, portalLives;
  let portalTransition = null;
  const missileSalvos = new Map();
  let radiationWarned = false;
  let mouseMoveHeld = false;
  let combatCargoExpanded = false;
  let deathState = null;
  let deathRespawnHandlersInstalled = false;
  let lastTargetLaserSlot = null;
  const perf = {
    frames:0,
    elapsed:0,
    frameTotal:0,
    frameMax:0,
    updateMs:0,
    drawMs:0,
    overlayT:0
  };
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
  const beams = createCombatBeamSystem({
    getTargetById:id=>enemies.find(enemy=>enemy.id === id && enemy.hp > 0) || null
  });
  let actions;
  const weapons = createWeaponSystem({
    getPlayer:()=>player,
    getBullets:()=>bullets,
    getParticles:()=>particles,
    getSelectedEnemy:validSelectedEnemy,
    getActiveShip:()=>store.state.activeShip,
    getActionSlots:()=>store.state.actionSlots || [],
    getActiveLaserSlot:()=>actions.getActiveLaserSlot(),
    setActiveLaserSlot:value=>actions.setActiveLaserSlot(value),
    getSelectedRocketAmmo:()=>actions.getSelectedRocketAmmo(),
    tryFireAutomaticMissile:()=>actions.tryFireAutomaticMissile(),
    getAmmo,
    getAmmoCount,
    getCombatAmmo:index=>actions.getCombatAmmo(index),
    getAmmoCooldown:ammo=>actions.getAmmoCooldown(ammo),
    setAmmoCooldown:(ammo, seconds)=>actions.setAmmoCooldown(ammo, seconds),
    getEffectiveAmmoCooldown:ammo=>actions.getEffectiveAmmoCooldown(ammo),
    tickAmmoCooldowns:dt=>actions.tickAmmoCooldowns(dt),
    getEquippedLasers,
    getEquippedDroneLasers,
    getEquippedLauncher,
    getEquipmentUpgradeLevel,
    consumeCombatBoostCharges,
    consumeAmmo,
    markCombatActivity,
    addLaserBeam:beam=>beams.add(beam),
    resolveLaserHit,
    saveState,
    refreshActionBar:()=>actions.updateGameActionBar(),
    refreshQuickPanel:()=>actions.renderCombatQuickPanel(),
    showToast,
    playerHitChance:PLAYER_HIT_CHANCE
  });
  const repairBot = createRepairBotSystem({
    getPlayer:()=>player,
    getParticles:()=>particles,
    pushDamageText,
    showToast
  });

  function refreshPlayerStatsFromLoadout(){
    if(!player) return;
    const stats = getShipCombatStats(store.state.activeShip);
    const hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    const shieldRatio = player.maxShield > 0 ? player.shield / player.maxShield : 1;
    player.maxHp = stats.vie;
    player.hp = Math.max(0, Math.min(player.maxHp, hpRatio * player.maxHp));
    player.maxShield = stats.bouclier;
    player.shield = player.maxShield > 0 ? Math.max(0, Math.min(player.maxShield, shieldRatio * player.maxShield)) : 0;
    player.regen = stats.regen;
    player.speed = stats.vitesseReelle;
    player.displayedSpeed = stats.vitesseReelle;
    player.damageBonus = stats.weaponDamage;
    player.damageMultiplier = Number(stats.weaponDamageMultiplier || (1 + Number(stats.weaponDamagePercent || 0)));
    player.shieldAbsorbRatio = Math.max(0, Math.min(0.9, Number(stats.shieldAbsorbRatio ?? 0.5)));
    player.evasionChance = Math.max(0, Math.min(0.75, Number(stats.evasionChance || 0)));
    player.damageToHpChance = Math.max(0, Math.min(0.5, Number(stats.damageToHpChance || 0)));
    player.blueLaserBeams = Boolean(stats.blueLaserBeams);
    player.extraBonus = stats.extraBonus || player.extraBonus;
  }

  actions = createCombatActions({
    ammoTypes,
    droneFormations,
    store,
    getAmmo,
    getAmmoCount,
    getItem,
    getDroneFormation,
    getEquippedExtras,
    getEquippedLauncher,
    canAfford,
    spend,
    addAmmo,
    saveState,
    refreshPlayerStats:refreshPlayerStatsFromLoadout,
    setActionSlot,
    showToast,
    updateHud,
    getPlayer:()=>player,
    getRepairState:()=>canRepairBotActivate(),
    activateRepairBot,
    getRepairBotDelay,
    getLaserVolley,
    fireManualRocket,
    fireManualMissile
  });
  const panels = createCombatPanels({
    store,
    saveState,
    showToast,
    updateHud,
    maps:MAPS,
    getCurrentMap:()=>currentMap,
    getPlayer:()=>player,
    ammoTypes,
    enemyTypes:ENEMY_TYPES,
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
    graphicsQualityPresets:GRAPHICS_QUALITY_PRESETS,
    getGraphicsQuality
  });
  let cargo;
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
    spawnCargoBox:(enemy, materials)=>cargo.spawnCargoBox(enemy, materials),
    getSelectedEnemy:()=>selectedEnemy,
    clearSelectedEnemy,
    getParticles:()=>particles,
    saveState,
    showToast,
    onLootChanged:()=>updateLootPopup()
  });
  cargo = createCombatCargoSystem({
    addShipCargoMaterial,
    getAllRawMaterials,
    getShipCargoCapacity,
    getShipCargoUsed,
    getActiveShipId:()=>store.state.activeShip,
    getSpawnPanelMode:()=>panels.getSpawnPanelMode(),
    fmt,
    rewards,
    saveState,
    showToast,
    onCargoChanged:()=>updateHud(),
    onSpawnPanelRefresh:mode=>panels.renderSpawnInteractionPanel(mode),
    particles:()=>particles
  });
  const lifecycle = createPlayerLifecycle({
    getPlayer:()=>player,
    getCurrentMap:()=>currentMap,
    markCombatActivity,
    clearMovement:()=>{ moveTarget = null; },
    clearSelection:()=>{ selectedEnemy = null; },
    clearCombatEffects:()=>{ bullets = []; particles = []; impactEffects = []; damageTexts = []; missileSalvos.clear(); beams.clear(); cargo.clear(); },
    setTeleportLock:value=>{ teleportLock = value; },
    updateHud,
    showToast,
    pushDamageText,
    onDeath:handlePlayerDeath
  });
  const frameLoop = createCombatLoop({
    isRunning:()=>running,
    update:measuredUpdate,
    draw:measuredDraw,
    getLastTime:()=>last,
    setLastTime:value=>{ last = value; },
    onFrameMetrics:recordFrameMetrics
  });

  function preload(){
    preloadCombatAssets({cache, ships, equipment:[...equipment, ...getAllRawMaterials(), {img:"assets/materials/cargo_box.svg"}], ammoTypes, enemyTypes:ENEMY_TYPES, maps:MAPS, ranks:RANK_TABLE, getRankAssetPath});
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

  function measuredUpdate(dt){
    const start = performance.now();
    update(dt);
    perf.updateMs = performance.now() - start;
  }

  function measuredDraw(){
    const start = performance.now();
    draw();
    perf.drawMs = performance.now() - start;
  }

  function recordFrameMetrics({dt, frameMs}){
    perf.frames += 1;
    perf.elapsed += dt;
    perf.frameTotal += frameMs;
    perf.frameMax = Math.max(perf.frameMax, frameMs);
    perf.overlayT -= dt;
    if(perf.overlayT <= 0) updatePerfPanel();
  }

  function updatePerfPanel(){
    const panel = document.getElementById("combatPerfPanel");
    if(!panel) return;
    const seconds = Math.max(.001, perf.elapsed);
    const fps = perf.frames / seconds;
    const frameAvg = perf.frameTotal / Math.max(1, perf.frames);
    const objects = [
      `E${enemies?.length || 0}`,
      `P${particles?.length || 0}`,
      `T${bullets?.length || 0}`,
      `B${beams.getBeams().length || 0}`,
      `I${impactEffects?.length || 0}`
    ].join(" ");
    panel.querySelector("[data-perf-fps]").textContent = String(Math.round(fps));
    panel.querySelector("[data-perf-frame]").textContent = `${frameAvg.toFixed(1)} / ${perf.frameMax.toFixed(1)}`;
    panel.querySelector("[data-perf-update]").textContent = perf.updateMs.toFixed(1);
    panel.querySelector("[data-perf-draw]").textContent = perf.drawMs.toFixed(1);
    panel.querySelector("[data-perf-objects]").textContent = objects;
    perf.frames = 0;
    perf.elapsed = 0;
    perf.frameTotal = 0;
    perf.frameMax = 0;
    perf.overlayT = .35;
  }

  function resetPerfMetrics(){
    perf.frames = 0;
    perf.elapsed = 0;
    perf.frameTotal = 0;
    perf.frameMax = 0;
    perf.updateMs = 0;
    perf.drawMs = 0;
    perf.overlayT = 0;
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
    if(gameMode === "portal") return [];
    const zones = [];
    if(map?.spawn && map.spawn.kind !== "portal") zones.push({id:"spawn", label:map.spawn.label || "Zone de spawn", x:map.spawn.x, y:map.spawn.y, r:map.spawn.safeRadius || map.spawn.r || 260, type:"spawn"});
    getMapPortals(map).forEach((portal, index)=>{
      zones.push({id:`portal-${index}`, label:portal.label || "Zone portail", x:portal.x, y:portal.y, r:(portal.safeRadius || Math.max(330, (portal.r || 90) * 3.5)) * 1.95, type:"portal"});
    });
    return zones;
  }

  function getNearestPortal(point = player, map = currentMap){
    const portals = getMapPortals(map);
    if(!point || !portals.length) return null;
    return portals.reduce((nearest, portal)=>{
      const distance = Math.hypot(point.x - portal.x, point.y - portal.y);
      return !nearest || distance < nearest.distance ? {portal, distance} : nearest;
    }, null)?.portal || null;
  }

  function getCurrentSafeArea(){
    return getSafeAreas().find(zone=>Math.hypot(player.x-zone.x, player.y-zone.y) <= zone.r) || null;
  }

  function isSafeModeActive(){
    if(gameMode !== "open") return false;
    return !!getCurrentSafeArea() && (player.safeZoneLock || 0) <= 0;
  }

  function clearPoison(){
    if(player) player.poisonEffect = null;
    updatePoisonStatus(null);
  }

  function renderDeathPanelContent(){
    const panel = document.getElementById("deathRespawnPanel");
    if(!panel) return;
    const head = panel.querySelector(".death-respawn-head");
    const actions = panel.querySelector(".death-respawn-actions");
    if(!head || !actions) return;
    if(deathState?.gameMode === "portal"){
      head.innerHTML = `<span>Vie de portail perdue</span><strong>${Math.max(0, portalLives)} / ${PORTAL_STARTING_LIVES} vies restantes</strong>`;
      actions.innerHTML = `
        <button data-respawn-choice="portal-resume" type="button">Reprendre le portail<br><small>Position de mort</small></button>
        <button data-respawn-choice="spawn" type="button">Abandonner<br><small>Retour ASTRA-01</small></button>
      `;
      return;
    }
    head.innerHTML = `<span>Vaisseau detruit</span><strong>Choisir un point de retour</strong>`;
    actions.innerHTML = `
      <button data-respawn-choice="spawn" type="button">ASTRA-01<br><small>Gratuit - 20% PV</small></button>
      <button data-respawn-choice="portal" type="button">Portail proche<br><small>100 NOVA</small></button>
      <button data-respawn-choice="death" type="button">Position actuelle<br><small>200 NOVA</small></button>
    `;
  }

  function setDeathPanelVisible(visible){
    if(visible) renderDeathPanelContent();
    document.getElementById("deathRespawnPanel")?.classList.toggle("hidden", !visible);
  }

  function handlePlayerDeath(){
    if(!player || player.isDead) return;
    if(gameMode === "portal") portalLives = Math.max(0, Number(portalLives ?? PORTAL_STARTING_LIVES) - 1);
    if(gameMode === "portal" && activePortal){
      if(!store.state.portalRuns) store.state.portalRuns = {};
      store.state.portalRuns[activePortal.id] = {lives:portalLives, status:"dead"};
      saveState();
    }
    deathState = {
      mapId:gameMode === "open" ? currentMap.id : 0,
      gameMode,
      x:player.x,
      y:player.y,
      portal:(()=>{ const portal = getNearestPortal(); return portal ? {x:portal.x, y:portal.y} : null; })()
    };
    player.isDead = true;
    player.hp = 0;
    player.vx = 0;
    player.vy = 0;
    moveTarget = null;
    mouseMoveHeld = false;
    clearPoison();
    bullets = bullets.filter(bullet=>bullet.owner !== "enemy");
    if(gameMode === "portal" && portalLives <= 0){
      failPortalRun();
      return;
    }
    setDeathPanelVisible(true);
    showToast("Vaisseau détruit.");
    saveState();
    updateHud();
  }

  function finishRespawn({mapId, x, y, message}){
    const map = MAPS.find(entry=>entry.id === mapId) || MAPS[0];
    if(currentMap.id !== map.id || gameMode !== "open") loadMap(map.id, x, y);
    else{
      player.x = x;
      player.y = y;
      moveTarget = null;
      selectedEnemy = null;
      bullets = [];
      missileSalvos.clear();
      impactEffects = [];
      beams.clear();
      cargo.clear();
      setTeleportLock(1.6);
    }
    player.isDead = false;
    clearPoison();
    player.hp = Math.max(1, Math.round(player.maxHp * 0.2));
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    if(activePortal){
      if(!store.state.portalRuns) store.state.portalRuns = {};
      store.state.portalRuns[activePortal.id] = {lives:portalLives, status:"active"};
    }
    deathState = null;
    setDeathPanelVisible(false);
    showToast(message);
    updateHud();
  }

  function finishPortalRespawn(){
    if(!deathState || deathState.gameMode !== "portal") return;
    player.x = deathState.x;
    player.y = deathState.y;
    player.vx = 0;
    player.vy = 0;
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    missileSalvos.clear();
    impactEffects = [];
    beams.clear();
    cargo.clear();
    setTeleportLock(1.6);
    player.isDead = false;
    clearPoison();
    player.hp = Math.max(1, Math.round(player.maxHp * 0.5));
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    deathState = null;
    setDeathPanelVisible(false);
    showToast("Retour dans le portail.");
    updateHud();
  }

  function failPortalRun(){
    const failedName = activePortal?.name || "Portail";
    const failedId = activePortal?.id;
    deathState = null;
    setDeathPanelVisible(false);
    activePortal = null;
    portalWave = 0;
    portalDelay = 0;
    portalCompleted = false;
    portalLives = 0;
    if(failedId && store.state.portalRuns) delete store.state.portalRuns[failedId];
    player.isDead = false;
    clearPoison();
    const map = MAPS[0];
    loadMap(map.id, map.spawn.x, map.spawn.y);
    player.hp = Math.max(1, Math.round(player.maxHp * 0.2));
    player.shield = player.maxShield;
    showToast(`${failedName} ferme : 3 vies perdues.`);
    updateHud();
  }

  function chooseDeathRespawn(choice){
    if(!deathState || !player?.isDead) return;
    if(deathState.gameMode === "portal"){
      if(choice === "portal-resume") finishPortalRespawn();
      else failPortalRun();
      saveState();
      return;
    }
    if(choice === "portal"){
      if(!canAfford("premium", 100)) return showToast("Pas assez de NOVA.");
      spend("premium", 100);
      const map = MAPS.find(entry=>entry.id === deathState.mapId) || MAPS[0];
      const point = deathState.portal || map.spawn;
      finishRespawn({mapId:map.id, x:point.x, y:point.y, message:"Respawn au portail le plus proche."});
    }else if(choice === "death"){
      if(!canAfford("premium", 200)) return showToast("Pas assez de NOVA.");
      spend("premium", 200);
      finishRespawn({mapId:deathState.mapId, x:deathState.x, y:deathState.y, message:"Respawn à la position de destruction."});
    }else{
      const map = MAPS[0];
      finishRespawn({mapId:map.id, x:map.spawn.x, y:map.spawn.y, message:"Respawn gratuit sur ASTRA-01."});
    }
    saveState();
  }

  function markCombatActivity(reason = "combat"){
    if(reason === "outgoing"){
      player.safeZoneLock = SAFE_ZONE_DELAY;
      player.lastAggression = performance.now();
    }
  }

  function getSpawnStations(){
    if(gameMode !== "open" || !currentMap?.spawn || currentMap.spawn.kind === "portal") return [];
    return [
      {id:"quests", x:currentMap.spawn.x - 128, y:currentMap.spawn.y - 86, radius:48, title:"RELAIS DE QUÊTES", subtitle:"Recevoir et rendre des missions"},
      {id:"refinery", x:currentMap.spawn.x + 132, y:currentMap.spawn.y - 90, radius:52, title:"RAFFINEUR", subtitle:"Fusionner et améliorer l'équipement"}
    ];
  }

  function getStationAt(world){
    return getSpawnStations().find(station=>Math.hypot(world.x-station.x, world.y-station.y) <= station.radius + 18) || null;
  }

  function formatDuration(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function loadMap(mapId, x, y, options = {}){
    portalTransition = null;
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
    cargo.clear();
    cargo.setGroundMaterials(makeGroundMaterialPreview(currentMap, getAllRawMaterials()));
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
    missileSalvos.clear();
    beams.clear();
    impactEffects = [];
    particles = [];
    damageTexts = [];
    teleportLock = 1.2;
    player.safeZoneLock = options.safeNow ? 0 : SAFE_ZONE_DELAY;
    radiationWarned = false;
    panels.closeSpawnPanel();
    saveState();
    showToast(`Entrée dans ${currentMap.name}.`);
    updateHud();
  }

  function normalizeMapToken(value){
    return String(value ?? "").trim().toUpperCase().replace(/[\s_-]+/g, "");
  }

  function resolveDebugMap(value){
    const token = normalizeMapToken(value);
    const asNumber = Number(token);
    if(Number.isFinite(asNumber)){
      const astraName = `ASTRA-${String(asNumber).padStart(2, "0")}`;
      return MAPS.find(map=>map.name === astraName) || MAPS.find(map=>map.id === asNumber) || null;
    }
    return MAPS.find(map=>normalizeMapToken(map.name) === token)
      || MAPS.find(map=>normalizeMapToken(map.name).includes(token))
      || null;
  }

  function getDebugMapEntryPoint(map, xOrPreset, y){
    if(Number.isFinite(Number(xOrPreset)) && Number.isFinite(Number(y))){
      return {x:Number(xOrPreset), y:Number(y)};
    }
    const preset = normalizeMapToken(xOrPreset);
    if(preset === "CENTER" || preset === "CENTRE") return {x:0, y:0};
    if(preset === "PORTAL"){
      const portal = getMapPortals(map)[0];
      if(portal) return {x:portal.x, y:portal.y};
    }
    if(map?.spawn) return {x:map.spawn.x, y:map.spawn.y};
    const portal = getMapPortals(map)[0];
    return portal ? {x:portal.x, y:portal.y} : {x:0, y:0};
  }

  function debugTeleportMap(value, xOrPreset, y){
    if(!running || !player) return "Le combat n'est pas lance.";
    const map = resolveDebugMap(value);
    if(!map){
      const names = MAPS.map(entry=>entry.name).join(", ");
      showToast("Map introuvable.");
      return `Map introuvable. Maps disponibles: ${names}`;
    }
    const point = getDebugMapEntryPoint(map, xOrPreset, y);
    loadMap(map.id, point.x, point.y);
    return `Teleportation debug: ${map.name} (${Math.round(point.x)}, ${Math.round(point.y)})`;
  }

  function installDebugCommands(){
    window.voidMap = debugTeleportMap;
    window.voidMaps = ()=>MAPS.map(map=>({name:map.name, id:map.id}));
  }

  function getPortalBatchEnd(startWave){
    if(startWave >= 27) return PORTAL_WAVE_TOTAL;
    return Math.min(PORTAL_WAVE_TOTAL, startWave + 1);
  }

  function getPlayerFirmId(){
    return String(store.state.player?.firm || store.state.player?.company || store.state.player?.faction || "astra")
      .trim()
      .toLowerCase();
  }

  function getHomeMapForPlayer(){
    const firm = getPlayerFirmId();
    const targetName = `${firm.toUpperCase()}-01`;
    return MAPS.find(map=>String(map.name || "").toUpperCase() === targetName) || MAPS[0];
  }

  function getPortalCompletionRewards(portal){
    const isBlue = portal?.id === "blue";
    return {
      credits:isBlue ? 3000000 : 0,
      xp:isBlue ? 400000 : 0,
      premium:20000,
      ammoX4:20000,
      itemId:"laser_mk4",
      itemName:"Laser MK-IV"
    };
  }

  function spawnPortalExit(){
    if(!currentMap || gameMode !== "portal") return;
    const homeMap = getHomeMapForPlayer();
    currentMap.portal = {
      x:0,
      y:0,
      r:110,
      safeRadius:270,
      activationRadius:320,
      targetMap:homeMap.id,
      targetX:homeMap.spawn?.x ?? 0,
      targetY:homeMap.spawn?.y ?? 0,
      label:`SORTIE ${homeMap.name}`
    };
  }

  function spawnPortalWave(wave){
    const batchEnd = getPortalBatchEnd(wave);
    portalWave = batchEnd;
    portalDelay = PORTAL_WAVE_DELAY;
    selectedEnemy = null;
    bullets = [];
    missileSalvos.clear();
    beams.clear();
    impactEffects = [];
    cargo.setCargoBoxes([]);
    cargo.clearPending();
    const spawned = [];
    for(let currentWave = wave; currentWave <= batchEnd; currentWave++){
      const built = buildPortalWave(currentWave, enemySeq);
      enemySeq = built.nextEnemySeq;
      spawned.push(...built.enemies);
    }
    enemies = enemies.concat(spawned);
    showToast(wave < PORTAL_WAVE_TOTAL ? `Portail : vague ${wave}/${PORTAL_WAVE_TOTAL}` : "Vague 30/30 · Boss !");
    updateHud();
  }

  function completePortalRun(){
    if(portalCompleted || !activePortal) return;
    portalCompleted = true;
    const completionRewards = getPortalCompletionRewards(activePortal);
    markPortalCompleted(activePortal.id);
    if(store.state.portalRuns) delete store.state.portalRuns[activePortal.id];
    store.state.player.credits += completionRewards.credits;
    store.state.player.premium += completionRewards.premium;
    addAmmo("ammo_x4", completionRewards.ammoX4);
    addInventoryItem(completionRewards.itemId);
    if(addXP(completionRewards.xp)) showToast(`Niveau ${store.state.player.level} atteint ! +1 point de compÃ©tence.`);
    spawnPortalExit();
    rewards.showLootNotice({
      message:"Vous avez gagne",
      credits:completionRewards.credits,
      xp:completionRewards.xp,
      premium:completionRewards.premium,
      ammo:[`+${fmt(completionRewards.ammoX4)} munitions x4`],
      items:[`+1 ${completionRewards.itemName}`]
    });
    showToast(`${activePortal.name} termine : portail de sortie ouvert.`);
    saveState();
    updateHud();
  }

  function loadPortalArena(portalId){
    const portal = portals.find(p=>p.id === portalId) || portals[0];
    const savedRun = store.state.portalRuns?.[portal.id];
    gameMode = "portal";
    activePortal = portal;
    portalWave = 0;
    portalDelay = 0.35;
    portalCompleted = false;
    portalLives = savedRun?.lives > 0 ? Math.min(PORTAL_STARTING_LIVES, Math.round(savedRun.lives)) : PORTAL_STARTING_LIVES;
    if(!store.state.portalRuns) store.state.portalRuns = {};
    store.state.portalRuns[portal.id] = {lives:portalLives, status:"active"};
    currentMap = createPortalMap(portal);
    enemies = [];
    const environment = buildPortalEnvironment(portalId, currentMap);
    asteroids = environment.asteroids;
    stars = environment.stars;
    dust = environment.dust;
    cargo.clear();
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
    missileSalvos.clear();
    beams.clear();
    impactEffects = [];
    particles = [];
    damageTexts = [];
    teleportLock = 1.2;
    player.safeZoneLock = SAFE_ZONE_DELAY;
    saveState();
    panels.closeSpawnPanel();
    showToast(`Accès à ${portal.name}. 30 vagues détectées.`);
    updateHud();
  }

  function start(entry="open"){
    if(running) return;
    preload(); resize();
    resetPerfMetrics();
    miniMap.applyLayout(store.state?.uiLayout?.miniMap, false);
    running = true;
    installDebugCommands();
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");
    setDeathPanelVisible(false);
    if(!deathRespawnHandlersInstalled){
      document.getElementById("deathRespawnPanel")?.addEventListener("click", e=>{
        const btn = e.target.closest("[data-respawn-choice]");
        if(btn) chooseDeathRespawn(btn.dataset.respawnChoice);
      });
      deathRespawnHandlersInstalled = true;
    }
    const stats = getShipCombatStats(store.state.activeShip);
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    player = {
      x:0,y:0,angle:0,
      hp:stats.vie,maxHp:stats.vie,
      shield:stats.bouclier,maxShield:stats.bouclier,regen:stats.regen,
      speed:stats.vitesseReelle,
      displayedSpeed:stats.vitesseReelle,
      damageBonus:stats.weaponDamage,
      damageMultiplier:Number(stats.weaponDamageMultiplier || (1 + Number(stats.weaponDamagePercent || 0))),
      shieldAbsorbRatio:Math.max(0, Math.min(0.9, Number(stats.shieldAbsorbRatio ?? 0.5))),
      evasionChance:Math.max(0, Math.min(0.75, Number(stats.evasionChance || 0))),
      damageToHpChance:Math.max(0, Math.min(0.5, Number(stats.damageToHpChance || 0))),
      blueLaserBeams:Boolean(stats.blueLaserBeams),
      extraBonus:stats.extraBonus || {autoRocket:false, autoMissile:false, rocketCooldownMultiplier:1, rocketDamageBonus:0, repairBot:false, repairBotAuto:false, repairBotHealRate:0.02, repairBotDelay:15},
      radar:RADAR_RANGE,
      droneOrbit:0,
      secondsSinceDamage:999,
      repairBotActive:false,
      repairBotTickTimer:0,
      isDead:false,
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
    bullets = []; particles = []; impactEffects = []; damageTexts = []; missileSalvos.clear(); beams.clear(); cargo.clear(); selectedEnemy = null; moveTarget = null;
    actions.cleanCombatActionSlots();
    actions.reset();
    panels.reset();
    hudT = 0; rewards.reset();
    if(typeof entry === "string" && entry.startsWith("portal:")) loadPortalArena(entry.split(":")[1] || "blue");
    else loadMap(0, MAPS[0].spawn.x, MAPS[0].spawn.y);
    actions.renderGameActionBar();
    actions.renderCombatQuickPanel();
    updateHud();
    frameLoop.start();
  }

  function stop(save=true){
    if(!running) return;
    running = false;
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("combatQuickPanel").classList.add("hidden");
    setDeathPanelVisible(false);
    clearPoison();
    panels.closeUtilityPanel();
    panels.closeSpawnPanel();
    if(gameMode === "portal" && activePortal && !portalCompleted && portalLives > 0){
      if(!store.state.portalRuns) store.state.portalRuns = {};
      store.state.portalRuns[activePortal.id] = {lives:portalLives, status:player?.isDead ? "dead" : "active"};
    }
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
      handlePlayerDeath();
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
    if(!live){
      selectedEnemy = null;
      actions.setActiveLaserSlot(null);
      actions.updateGameActionBar();
    }else selectedEnemy = live;
    return selectedEnemy;
  }

  function clearSelectedEnemy(){
    selectedEnemy = null;
    actions.setActiveLaserSlot(null);
    lastTargetLaserSlot = null;
    actions.updateGameActionBar();
    updateHud();
  }

  function rememberActiveLaserSlot(){
    const slot = actions.getActiveLaserSlot();
    if(slot === null || slot === undefined) return;
    const ammo = getAmmo((store.state.actionSlots || [])[slot]);
    if(ammo?.weaponClass === "laser"){
      lastTargetLaserSlot = slot;
      actions.rememberLaserAmmo?.(ammo);
    }
  }

  function attackSelectedWithActiveLaser(){
    if(!selectedEnemy) return false;
    const slot = actions.getLaserSlotForAttack?.() ?? lastTargetLaserSlot;
    if(slot === null || slot === undefined) return false;
    const ammo = getAmmo((store.state.actionSlots || [])[slot]);
    if(ammo?.weaponClass !== "laser") return false;
    if(getAmmoCount(ammo.id) <= 0){
      showToast(`${ammo.name} : stock vide.`);
      return false;
    }
    lastTargetLaserSlot = slot;
    actions.rememberLaserAmmo?.(ammo);
    actions.setActiveLaserSlot(slot);
    actions.updateGameActionBar();
    return true;
  }

  function findCargoBoxAt(world){
    return cargo.findCargoBoxAt(world);
  }

  function findGroundMaterialAt(world){
    return cargo.findGroundMaterialAt(world);
  }

  function setCargoDestination(box){
    moveTarget = cargo.setCargoDestination(box);
    return true;
  }

  function setGroundMaterialDestination(node){
    moveTarget = cargo.setGroundMaterialDestination(node);
    return true;
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

  function getLaserVolley(){
    return weapons.getLaserVolley();
  }


  function getEnemyHitChance(enemy){
    return Math.max(0.05, (ENEMY_HIT_CHANCE[enemy?.kind] || 0.88) - Math.max(0, Number(player?.evasionChance || 0)));
  }

  function getBulletTarget(bullet){
    if(bullet.owner === "enemy") return {x:player.x, y:player.y, entity:player};
    const enemy = enemies.find(e=>e.id === bullet.targetId && e.hp > 0);
    return enemy ? {x:enemy.x, y:enemy.y, entity:enemy} : null;
  }

  function pushDamageText({x, y, value, color, shadowColor}){
    const isMiss = value === "MISS";
    damageTexts.push({
      x,
      y,
      value,
      life:.82,
      max:.82,
      vx:(Math.random() - .5) * (isMiss ? 18 : 34),
      vy:isMiss ? -30 : -48 - Math.random() * 18,
      wobble:Math.random() * Math.PI * 2,
      color,
      shadowColor
    });
  }

  function rollBetween(min, max){
    const low = Number(min ?? max ?? 0);
    const high = Number(max ?? min ?? low);
    if(high <= low) return low;
    return low + Math.random() * (high - low);
  }

  function damageEnemy(enemy, amount){
    const incoming = Math.max(0, Number(amount || 0));
    enemy.recentHitTimer = 4;
    const maxShield = Number(enemy.maxShield || 0);
    if(maxShield > 0 && enemy.shield > 0){
      const absorbRatio = Math.max(0, Math.min(1, Number(enemy.shieldAbsorbRatio ?? 0.8)));
      const shieldPart = incoming * absorbRatio;
      let hullPart = incoming - shieldPart;
      const absorbed = Math.min(enemy.shield, shieldPart);
      enemy.shield -= absorbed;
      hullPart += shieldPart - absorbed;
      if(hullPart > 0) enemy.hp -= hullPart;
      return;
    }
    enemy.hp -= incoming;
  }

  function applyPlayerPoison(effect){
    if(effect?.type !== "poison") return;
    const duration = Number(effect.duration || 0);
    player.poisonEffect = {
      damage:Number(effect.damage || 0),
      interval:Number(effect.interval || 1),
      duration,
      remaining:duration,
      tick:Number(effect.interval || 1),
      pulseT:0
    };
    updatePoisonStatus(player.poisonEffect);
  }

  function updatePlayerPoison(dt){
    const effect = player.poisonEffect;
    if(!effect?.remaining){
      updatePoisonStatus(null);
      return;
    }
    effect.remaining -= dt;
    effect.tick -= dt;
    effect.pulseT = (effect.pulseT || 0) - dt;
    if(effect.pulseT <= 0){
      effect.pulseT = .12;
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 28;
      particles.push({
        x:player.x + Math.cos(angle) * radius,
        y:player.y + Math.sin(angle) * radius,
        vx:Math.cos(angle) * 12,
        vy:Math.sin(angle) * 12,
        life:.48,
        max:.48,
        size:4 + Math.random() * 5,
        color:"rgba(74,222,128,.62)"
      });
    }
    while(effect.tick <= 0 && effect.remaining > 0){
      effect.tick += effect.interval;
      const dealt = Math.max(0, Math.round(effect.damage || 0));
      if(dealt > 0){
        player.hp -= dealt;
        player.secondsSinceDamage = 0;
        pushDamageText({x:player.x, y:player.y-68, value:`-${dealt}`, color:"rgba(74,222,128,", shadowColor:"rgba(34,197,94,.78)"});
        if(player.hp <= 0){
          handlePlayerDeath();
          return;
        }
      }
    }
    if(effect.remaining <= 0) player.poisonEffect = null;
    updatePoisonStatus(player.poisonEffect);
  }

  function makeImpactSparks({count, color, speedMin, speedMax, lengthMin, lengthMax, width = 1.2, arc = Math.PI * 2, angle = 0}){
    return Array.from({length:count}, (_, index)=>{
      const spread = count <= 1 ? 0 : (index / count) * arc;
      const jitter = (Math.random() - .5) * (arc / Math.max(2, count)) * .9;
      return {
        angle:angle - arc / 2 + spread + jitter,
        speed:speedMin + Math.random() * (speedMax - speedMin),
        length:lengthMin + Math.random() * (lengthMax - lengthMin),
        width:width * (.75 + Math.random() * .55),
        alpha:.55 + Math.random() * .4,
        color
      };
    });
  }

  function makeImpactSmoke(count){
    return Array.from({length:count}, ()=>({
      angle:Math.random() * Math.PI * 2,
      speed:14 + Math.random() * 34,
      size:12 + Math.random() * 22,
      alpha:.24 + Math.random() * .18
    }));
  }

  function spawnImpactEffect(kind, {x, y, color, angle = 0, visualOnly = false, delay = 0} = {}){
    if(!impactEffects) impactEffects = [];
    const baseColor = color || (kind === "rocket" ? "rgba(251,146,60,.95)" : kind === "missile" ? "rgba(125,211,252,.95)" : "rgba(250,204,21,.92)");
    if(kind === "laser"){
      impactEffects.push({
        kind,
        x,
        y,
        color:baseColor,
        core:"rgba(255,255,255,.98)",
        life:.14,
        max:.14,
        delay,
        radius:16,
        rotation:Math.random() * Math.PI * 2,
        sparks:makeImpactSparks({count:3, color:baseColor, speedMin:18, speedMax:36, lengthMin:5, lengthMax:11, width:.9, arc:Math.PI * 1.15, angle:angle + Math.PI})
      });
      return;
    }
    if(kind === "missile"){
      impactEffects.push({
        kind,
        x,
        y,
        color:baseColor,
        core:"rgba(248,250,252,.98)",
        life:visualOnly ? .30 : .46,
        max:visualOnly ? .30 : .46,
        delay,
        radius:visualOnly ? 36 : 72,
        rotation:Math.random() * Math.PI * 2,
        sparks:makeImpactSparks({count:visualOnly ? 3 : 6, color:baseColor, speedMin:22, speedMax:visualOnly ? 58 : 92, lengthMin:7, lengthMax:visualOnly ? 16 : 26, width:1.15}),
        smoke:makeImpactSmoke(visualOnly ? 0 : 2)
      });
      return;
    }
    impactEffects.push({
      kind:"rocket",
      x,
      y,
      color:baseColor,
      core:"rgba(255,251,235,.98)",
      life:.46,
      max:.46,
      delay,
      radius:48,
      rotation:Math.random() * Math.PI * 2,
      sparks:makeImpactSparks({count:5, color:baseColor, speedMin:24, speedMax:76, lengthMin:7, lengthMax:20, width:1.15}),
      smoke:makeImpactSmoke(1)
    });
  }

  function resolvePlayerMissileDamage(bullet, target){
    const enemy = target.entity;
    if(!enemy || enemy.hp <= 0 || bullet.visualOnly) return;
    const hitChance = bullet.hitChance ?? PLAYER_HIT_CHANCE;
    const hit = Math.random() <= hitChance;
    const dealt = hit ? Math.round(bullet.damage) : 0;
    const salvoId = bullet.salvoId;
    const salvoSize = Math.max(1, Math.round(Number(bullet.salvoSize || 1)));

    if(salvoId && salvoSize > 1){
      const salvo = missileSalvos.get(salvoId) || {
        targetId:enemy.id,
        total:salvoSize,
        impacts:0,
        damage:0,
        hits:0,
        misses:0
      };
      salvo.impacts += 1;
      if(hit){
        salvo.damage += dealt;
        salvo.hits += 1;
      }else{
        salvo.misses += 1;
      }
      missileSalvos.set(salvoId, salvo);
      if(salvo.impacts < salvo.total) return;

      missileSalvos.delete(salvoId);
      const finalEnemy = enemies.find(e=>e.id === salvo.targetId && e.hp > 0) || enemy;
      if(!finalEnemy || finalEnemy.hp <= 0) return;
      if(salvo.damage > 0){
        damageEnemy(finalEnemy, salvo.damage);
        finalEnemy.aggro = true;
        pushDamageText({x:finalEnemy.x, y:finalEnemy.y-finalEnemy.radius-16, value:salvo.damage});
        if(finalEnemy.hp <= 0) rewardEnemy(finalEnemy);
      }else{
        pushDamageText({x:finalEnemy.x, y:finalEnemy.y-finalEnemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
      }
      return;
    }

    if(hit){
      damageEnemy(enemy, dealt);
      enemy.aggro = true;
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
      if(enemy.hp <= 0) rewardEnemy(enemy);
    }else{
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
    }
  }

  function resolveBulletImpact(bullet){
    const target = getBulletTarget(bullet);
    if(!target) return;
    if(bullet.owner === "player" && bullet.kind === "missile"){
      const baseAngle = bullet.angle || Math.random() * Math.PI * 2;
      const count = bullet.visualOnly ? 1 : 2;
      for(let i = 0; i < count; i++){
        const angle = baseAngle + (i - 1) * 1.9 + (Math.random() - .5) * .55;
        const distance = (bullet.visualOnly ? 10 : 0) + i * 11 + Math.random() * 9;
        spawnImpactEffect("missile", {
          x:bullet.x + Math.cos(angle) * distance,
          y:bullet.y + Math.sin(angle) * distance,
          color:bullet.particle || bullet.color,
          visualOnly:bullet.visualOnly || i > 0,
          delay:i * .055 + (bullet.visualOnly ? .035 : 0)
        });
      }
      resolvePlayerMissileDamage(bullet, target);
      return;
    }else if(bullet.owner === "player" && bullet.kind === "rocket"){
      spawnImpactEffect("rocket", {x:bullet.x, y:bullet.y, color:bullet.particle || bullet.color, visualOnly:bullet.visualOnly});
    }else{
      particles.push({x:bullet.x, y:bullet.y, life:.22, max:.22, size:12, color:bullet.particle || "rgba(125,211,252,.8)"});
    }
    const hitChance = bullet.hitChance ?? (bullet.owner === "enemy" ? 0.88 : PLAYER_HIT_CHANCE);
    const hit = Math.random() <= hitChance;

    if(bullet.owner === "enemy"){
      if(hit){
        const dealt = Math.round(bullet.damage);
        damagePlayer(dealt);
        applyPlayerPoison(bullet.onHitEffect);
        pushDamageText({x:player.x, y:player.y-58, value:dealt, color:"rgba(248,113,113,", shadowColor:"rgba(248,113,113,.78)"});
      }else{
        pushDamageText({x:player.x, y:player.y-58, value:"MISS", color:"rgba(226,232,240,", shadowColor:"rgba(148,163,184,.78)"});
      }
      return;
    }

    const enemy = target.entity;
    if(!enemy || enemy.hp <= 0) return;
    if(bullet.visualOnly) return;
    if(hit){
      const dealt = Math.round(bullet.damage);
      damageEnemy(enemy, dealt);
      enemy.aggro = true;
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
      if(enemy.hp <= 0) rewardEnemy(enemy);
    }else{
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(191,219,254,", shadowColor:"rgba(96,165,250,.78)"});
    }
  }

  function resolveLaserHit(enemy, damage, hitChance = PLAYER_HIT_CHANCE, ammo = null){
    if(!enemy || enemy.hp <= 0) return false;
    const hit = Math.random() <= hitChance;
    if(hit){
      const dealt = Math.round(damage);
      damageEnemy(enemy, dealt);
      enemy.aggro = true;
      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const laserColor = player.blueLaserBeams && ammo?.id !== "ammo_x4" ? "rgba(56,189,248,.9)" : ammo?.particle || ammo?.color || "rgba(250,204,21,.88)";
      spawnImpactEffect("laser", {x:enemy.x, y:enemy.y, color:laserColor, angle});
      pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:dealt});
      if(enemy.hp <= 0) rewardEnemy(enemy);
      return true;
    }
    pushDamageText({x:enemy.x, y:enemy.y-enemy.radius-16, value:"MISS", color:"rgba(255,236,179,", shadowColor:"rgba(250,204,21,.78)"});
    return false;
  }

  function shootAt(enemy, ammo, slotIndex){
    return weapons.shootAt(enemy, ammo, slotIndex);
  }

  function fireManualRocket(index, ammo){
    return weapons.fireManualRocket(index, ammo);
  }

  function fireManualMissile(ammo, count){
    return weapons.fireManualMissile(ammo, count);
  }

  function damagePlayer(amount){
    lifecycle.damage(amount);
  }

  function rewardEnemy(enemy){
    scheduleEnemyRespawn(enemy);
    if(selectedEnemy?.id === enemy.id){
      selectedEnemy = null;
      actions.setActiveLaserSlot(null);
      actions.updateGameActionBar();
    }
    rewards.rewardEnemy(enemy);
  }

  function scheduleEnemyRespawn(enemy){
    if(gameMode !== "open" || !enemy || enemy.respawnScheduled) return;
    const mapState = getMapState(currentMap);
    mapState.respawnQueue = mapState.respawnQueue || [];
    mapState.respawnQueue.push({remaining:5});
    enemy.respawnScheduled = true;
  }

  function updateMapRespawns(dt){
    if(gameMode !== "open") return;
    const mapState = getMapState(currentMap);
    const queue = mapState.respawnQueue || [];
    if(!queue.length) return;
    const maxEnemies = currentMap.enemyCount || 0;
    for(const entry of queue) entry.remaining -= dt;
    for(let i = queue.length - 1; i >= 0; i--){
      if(queue[i].remaining > 0) continue;
      if(enemies.length >= maxEnemies) continue;
      const enemy = createMapEnemy({map:currentMap, id:enemySeq++, player});
      enemies.push(enemy);
      mapState.enemies = enemies;
      queue.splice(i, 1);
    }
    mapState.respawnQueue = queue;
  }

  function fireAutomaticRocket(enemy){
    return weapons.fireAutomaticRocket(enemy);
  }

  function updateWeapons(dt){
    return weapons.updateWeapons(dt);
  }

  function update(dt){
    if(store.state?.player){
      store.state.player.totalPlaySeconds = Math.max(0, Number(store.state.player.totalPlaySeconds || 0)) + Math.max(0, Number(dt || 0));
    }
    teleportLock = Math.max(0, teleportLock - dt);
    if(portalTransition){
      const completed = advanceMapPortalTransition(portalTransition, dt);
      player.vx = 0;
      player.vy = 0;
      player.enginePower = 0;
      moveTarget = null;
      bullets = bullets.filter(bullet=>bullet.owner !== "enemy");
      beams.clear();
      updateParticles(dt);
      updateCamera({camera, player, canvas, follow:1});
      if(completed){
        const target = portalTransition.portal;
        portalTransition = null;
        loadMap(target.targetMap, target.targetX, target.targetY, {safeNow:true});
      }else{
        updateHud();
      }
      return;
    }
    rewards.tick(dt);
    tickCombatBoosts(dt);
    updatePlayerPoison(dt);
    player.safeZoneLock = Math.max(0, Number(player.safeZoneLock || 0) - dt);
    updateLootPopup();
    if(player.isDead){
      updateCamera({camera, player, canvas, follow:1});
      updateHud();
      return;
    }

    if(isSafeModeActive()){
      bullets = bullets.filter(bullet=>bullet.owner !== "enemy");
      for(const enemy of enemies) enemy.aggro = false;
    }

    if(mouseMoveHeld && mouse) moveTarget = worldFromScreen(mouse.x, mouse.y);
    moveTarget = updatePlayerMovement({player, moveTarget, dt, map:currentMap, clampToMap:gameMode !== "open"});
    updateRadiation(dt);
    cargo.updatePending(player);

    if(gameMode === "portal"){
      if(!portalCompleted){
        if(portalWave < PORTAL_WAVE_TOTAL){
          portalDelay -= dt;
          if(enemies.length === 0 || portalDelay <= 0) spawnPortalWave(portalWave + 1);
        }else if(enemies.length === 0){
          completePortalRun();
        }
      }
    }

    const enemy = validSelectedEnemy();
    if(enemy && actions.getActiveLaserSlot() !== null) player.angle = Math.atan2(enemy.y-player.y, enemy.x-player.x)+Math.PI/2;
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
    updateMapRespawns(dt);
    beams.update(dt);
    updateParticles(dt);
    updateRepairBot(dt);

    if(player.maxShield > 0) player.shield = Math.min(player.maxShield, player.shield + (player.regen || 0)*dt);
    const targetZoom = isPlayerOutsideMap() ? 0.78 : 1;
    camera.zoom = (camera.zoom || 1) + (targetZoom - (camera.zoom || 1)) * Math.min(1, dt * 4.5);
    updateCamera({camera, player, canvas, follow:1});
    hudT -= dt;
    if(hudT <= 0){
      updateHud();
      actions.updateGameActionBar();
      hudT = .10;
    }
    const quickPanel = document.getElementById("combatQuickPanel");
    if(quickPanel && !quickPanel.classList.contains("hidden")){
      quickPanelRefreshT -= dt;
      if(quickPanelRefreshT <= 0){
        if(!quickPanel.matches(":hover") && !quickPanel.contains(document.activeElement)) actions.renderCombatQuickPanel();
        quickPanelRefreshT = 1;
      }
    }
    panels.tick(dt);
  }

  function updateEnemies(dt){
    for(const enemy of enemies) enemy.recentHitTimer = Math.max(0, Number(enemy.recentHitTimer || 0) - dt);
    updateEnemyAi({
      enemies,
      player,
      dt,
      map:currentMap,
      safeMode:isSafeModeActive(),
      aggroRange:AGGRO_RANGE,
      leashRange:gameMode === "portal" ? 999999 : LEASH_RANGE,
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
      damage:rollBetween(enemy.attackDamageMin, enemy.attackDamageMax) || enemy.attackDamage || 10,
      travelTime:Math.max(.11, Math.min(1.15, d/speed + .06)),
      radius:5,
      color:enemy.color || "rgba(248,113,113,.95)",
      particle:enemy.particle || "rgba(252,165,165,.75)",
      sourceId:enemy.id,
      onHitEffect:enemy.onHitEffect,
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
    for(const p of particles){
      p.life -= dt;
      if(p.followPlayer){
        p.offsetX = Number(p.offsetX || 0) + (p.vx || 0) * dt;
        p.offsetY = Number(p.offsetY || 0) + (p.vy || 0) * dt;
        p.x = player.x + p.offsetX;
        p.y = player.y + p.offsetY;
      }else{
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
      }
    }
    particles = particles.filter(p=>p.life>0);
    for(const effect of impactEffects){
      if(effect.delay > 0) effect.delay -= dt;
      else effect.life -= dt;
    }
    impactEffects = impactEffects.filter(effect=>effect.life > 0 || effect.delay > 0);
    for(const t of damageTexts){
      t.life -= dt;
      t.x += (t.vx || 0) * dt;
      t.y += (t.vy || -38) * dt;
      t.vy = (t.vy || -38) + 42 * dt;
    }
    damageTexts = damageTexts.filter(t=>t.life>0);
  }

  function drawBackground(){
    drawWorldLayer({ctx, canvas, cache, currentMap, camera, nebulae, stars, dust, asteroids, player, safeReady:isSafeModeActive(), stations:getSpawnStations(), graphicsQuality:getGraphicsQuality()});
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
    drawProjectiles({ctx, camera, cache, bullets});
    drawParticles({ctx, camera, particles, repairLayer:false});
    drawGroundMaterials({ctx, camera, cache, materials:cargo.getGroundMaterials()});
    drawCargoBoxes({ctx, camera, cache, cargoBoxes:cargo.getCargoBoxes()});
    drawEnemies({ctx, camera, cache, enemies, selectedEnemy});
    drawImpactEffects({ctx, camera, impactEffects});
    drawBeams({ctx, camera, beams:beams.getBeams()});
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
      pilotTitle:store.state.player.titleVisible === false ? "" : (PROFILE_TITLES[store.state.player.activeTitleId] || ""),
      getItemFromInventoryUid,
      droneFormation:store.state.activeDroneFormation,
      defaultProfile:DEFAULT_ENGINE_PROFILE,
      profiles:SHIP_ENGINE_PROFILES
    });
    drawParticles({ctx, camera, particles, repairLayer:true});
    drawDamageTexts();
    ctx.restore();
    canvas.__renderWidth = null;
    canvas.__renderHeight = null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRadiationOverlay();
    drawMiniMap();
    drawPortalTransitionOverlay({ctx, transition:portalTransition, maps:MAPS, viewW, viewH});
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
    drawMiniMapCanvas({ctx, canvas, currentMap, player, enemies, rect:miniMap.rect(), moveTarget, revealAllEnemies:gameMode === "portal"});
  }

  function updateHud(){
    const enemy = validSelectedEnemy();
    const rank = getCurrentRank();
    const repairState = canRepairBotActivate();
    const safeArea = getCurrentSafeArea();
    const safeLabel = safeArea ? ((player.safeZoneLock || 0) <= 0 ? ` · SAFE ${safeArea.type === "portal" ? "PORTAIL" : "SPAWN"}` : ` · SAFE DANS ${Math.ceil(player.safeZoneLock || 0)}S`) : "";
    document.getElementById("gameZoneName").textContent = gameMode === "portal" ? `PORTAIL : ${activePortal?.name || currentMap.name}${portalWave ? ` · VAGUE ${Math.min(portalWave, PORTAL_WAVE_TOTAL)}/${PORTAL_WAVE_TOTAL}` : " · PRÉPARATION"}` : `ZONE : ${currentMap.name}${safeLabel}`;
    const portalTimerHud = document.getElementById("portalTimerHud");
    if(portalTimerHud){
      const showPortalTimer = gameMode === "portal" && !portalCompleted && portalWave < PORTAL_WAVE_TOTAL;
      portalTimerHud.classList.toggle("hidden", !showPortalTimer);
      portalTimerHud.querySelector("strong").textContent = Math.max(0, Math.ceil(portalDelay || 0));
      portalTimerHud.querySelector("span").textContent = portalWave <= 0 ? "Premieres vagues" : "Vague suivante";
    }
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
    document.getElementById("gameRepairHud").textContent = !player.extraBonus?.repairBot ? "Drone réparation : non équipé" : player.repairBotActive ? "Drone réparation : actif" : repairState.ok ? (player.extraBonus?.repairBotAuto ? "Drone réparation : prêt (auto)" : "Drone réparation : prêt") : `Drone réparation : ${repairState.reason}`;
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

  function tryUseMapPortal(){
    if(portalTransition) return true;
    if(gameMode === "portal"){
      if(!portalCompleted) return false;
      const exitPortal = findMapPortalAt({map:currentMap, point:player, getMapPortals});
      if(!exitPortal) return false;
      const targetMap = MAPS.find(map=>map.id === exitPortal.targetMap) || getHomeMapForPlayer();
      loadMap(targetMap.id, exitPortal.targetX, exitPortal.targetY, {safeNow:true});
      showToast(`Retour vers ${targetMap.name}.`);
      return true;
    }
    if(gameMode !== "open") return false;
    const portal = findMapPortalAt({map:currentMap, point:player, getMapPortals});
    if(!portal) return false;
    if(teleportLock > 0) return true;
    const targetMap = MAPS.find(map=>map.id === portal.targetMap);
    if(targetMap) getMapState(targetMap);
    portalTransition = createMapPortalTransition(portal);
    player.vx = 0;
    player.vy = 0;
    moveTarget = null;
    selectedEnemy = null;
    actions.setActiveLaserSlot(null);
    actions.updateGameActionBar();
    showToast(`Transfert vers ${MAPS.find(map=>map.id === portal.targetMap)?.name || "secteur"}...`);
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
    saveUtilityPanelLayout:panels.saveUtilityPanelLayout,
    saveSpawnPanelLayout:panels.saveSpawnPanelLayout,
    getCurrentMap:()=>currentMap,
    getSpawnPanelMode:()=>panels.getSpawnPanelMode(),
    getCombatMetricModes:()=>combatMetricModes,
    getActionSlots:()=>store.state.actionSlots || [],
    getSlotKeybinds:()=>store.state.slotKeybinds,
    clearSelectedEnemy,
    hasSelectedEnemy:()=>!!selectedEnemy,
    tryUseMapPortal,
    selectActionSlot:actions.selectActionSlot,
    getStationAt,
    findEnemyAt,
    findCargoBoxAt,
    setCargoDestination,
    findGroundMaterialAt,
    setGroundMaterialDestination,
    setSelectedEnemy:enemy=>{
      rememberActiveLaserSlot();
      selectedEnemy = enemy;
      actions.setActiveLaserSlot(null);
      actions.updateGameActionBar();
    },
    attackSelectedWithActiveLaser,
    renderSpawnInteractionPanel:panels.renderSpawnInteractionPanel,
    openUtilityPanel:panels.openUtilityPanel,
    closeUtilityPanel:panels.closeUtilityPanel,
    inviteGroupMember:panels.inviteGroupMember,
    trackCombatQuest:panels.trackCombatQuest,
    claimCombatQuest:panels.claimCombatQuest,
    setCombatQuestDetailTab:panels.setCombatQuestDetailTab,
    selectQuestForPanel:panels.selectQuestForPanel,
    selectQuestCategoryForPanel:panels.selectQuestCategoryForPanel,
    setRefineryPanelTab:panels.setRefineryPanelTab,
    openShipRefineRecipe:panels.openShipRefineRecipe,
    closeShipRefineRecipe:panels.closeShipRefineRecipe,
    closeSpawnPanel:panels.closeSpawnPanel,
    updateHud,
    moveActionSlot:actions.moveActionSlot,
    clearActionSlot:actions.clearActionSlot,
    assignExtraToActionSlot:actions.assignExtraToActionSlot,
    assignDroneFormationToActionSlot:actions.assignDroneFormationToActionSlot,
    assignAmmoToActionSlot:actions.assignAmmoToActionSlot,
    selectMissileAmmo:actions.selectMissileAmmo,
    fireMissileLauncher:actions.fireMissileLauncher,
    assignMissileLauncherToActionSlot:actions.assignMissileLauncherToActionSlot,
    renderCombatQuickPanel:actions.renderCombatQuickPanel,
    setCombatPanelTab:actions.setCombatPanelTab,
    shiftCombatPanelTabs:actions.shiftCombatPanelTabs,
    buyCombatAmmo:actions.buyCombatAmmo,
    activateRepairBot,
    acceptQuest,
    claimQuest,
    startRefineryJob,
    claimRefineryJob,
    getShipRefineryRecipeData,
    refineShipCargoRecipe,
    depositCombatBoostMaterial,
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
