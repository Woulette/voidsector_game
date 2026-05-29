import { ammoTypes, droneFormations, equipment, portals, ships } from "../data/catalog.js";
import { fmt } from "../core/utils.js";
import {
  addAmmo,
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
  getDronePermanentUpgrade,
  getEquippedDroneLasers,
  getEquippedLauncher,
  getEquippedExtras,
  getGraphicsQuality,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getEquippedLasers,
  getInventoryCount,
  getItem,
  getItemFromInventoryUid,
  getMaterialCount,
  getRankAssetPath,
  RANK_TABLE,
  GRAPHICS_QUALITY_PRESETS,
  getQuestObjectiveProgress,
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
  recordWeaponUse,
  recordQuestCoordinateVisit,
  recordQuestDeath,
  recordQuestHpLoss,
  recordQuestItemPickup,
  recordQuestKill,
  recordQuestMapVisit,
  recordQuestNpcTalk,
  recordQuestTimeElapsed,
  rollQuestItemDropFromKill,
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
  DEFAULT_ENGINE_PROFILE,
  ENEMY_TYPES,
  MAPS,
  getMapPortals,
  PLAYER_HIT_CHANCE,
  RADAR_RANGE,
  SAFE_ZONE_DELAY,
  SHIP_ENGINE_PROFILES
} from "./combatData.js";
import { preloadCombatAssets } from "./combatAssets.js";
import { spawnPlayerEngineParticles as emitPlayerEngineParticles } from "./render/player.js";
import { createCombatSceneRenderer } from "./render/combatScene.js";
import { createCombatLoop } from "./systems/combatLoop.js";
import { createCombatBeamSystem } from "./systems/combatBeams.js";
import { createCombatCargoSystem } from "./systems/combatCargo.js";
import { installCombatDebugCommands } from "./systems/combatDebug.js";
import { createCombatDeathRespawnSystem } from "./systems/combatDeathRespawn.js";
import { createCombatFrameUpdateSystem } from "./systems/combatFrameUpdate.js";
import { createCombatHitResolutionSystem } from "./systems/combatHitResolution.js";
import { createCombatEnemyRuntime } from "./systems/combatEnemyRuntime.js";
import { createCombatInteractionSystem } from "./systems/combatInteractions.js";
import { createCombatServerEventSystem } from "./systems/combatServerEvents.js";
import { createCombatPortalRunSystem } from "./systems/combatPortalRun.js";
import { createCombatStatusEffectSystem } from "./systems/combatStatusEffects.js";
import { createCombatWorldStateSystem } from "./systems/combatWorldState.js";
import { createCombatPerfSystem } from "./systems/combatPerf.js";
import { advanceMapPortalTransition, createMapPortalTransition, findMapPortalAt } from "./systems/mapPortalTransfer.js";
import { createMiniMapState } from "./systems/minimapState.js";
import { createPlayerLifecycle } from "./systems/playerLifecycle.js";
import { clampPlayerToMap as clampPlayerToMapSystem, updateCamera, updatePlayerMovement, worldFromScreen as screenToWorld } from "./systems/playerMovement.js";
import { createRepairBotSystem } from "./systems/repairBot.js";
import { createRewardSystem } from "./systems/rewards.js";
import { createWeaponSystem } from "./systems/weapons.js";
import { updatePoisonStatus } from "./ui/hud.js";
import { createCombatHudController } from "./ui/combatHudController.js";
import { installCombatInputHandlers } from "./ui/inputBindings.js";
import { createCombatActions } from "./ui/combatActions.js";
import { createCombatPanels } from "./ui/combatPanels.js";
import { getGroupRemotePlayers, multiplayer, sendPlayerSnapshot, sendServerEnemyHit } from "../multiplayer/client.js";
import {
  getServerEnemyId,
  hasServerControlledEnemies,
  isServerControlledEnemy,
  syncServerControlledEnemies as syncMultiplayerEnemies
} from "../multiplayer/enemies.js";
export function createCombatGame({renderAll, showToast}){
  const PORTAL_STARTING_LIVES = 3;
  const PORTAL_WAVE_DELAY = 30;
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const cache = {};
  const PROFILE_TITLES = {
    first_contact:"Premier sang",
    hunter_100:"Traqueur spatial",
    veteran_25:"Vétéran d'Astra",
    portal_mastery:"Nettoyeur d'Astra",
    quest_5:"Mercenaire fiable",
    inventory_30:"Ingénieur de bord",
    skill_15:"Spécialiste",
    drone_5:"Chef d'escadron",
    hunter_500:"Chasseur abyssal",
    laser_100k:"Canonnier laser",
    laser_1m:"Deluge photonique",
    laser_10m:"Architecte de faisceaux",
    laser_100m:"Tempete laser",
    laser_1b:"Legende photonique",
    rocket_25k:"Artilleur orbital",
    rocket_250k:"Maitre roquettes",
    rocket_25m:"Barrage orbital",
    missile_10k:"Artilleur guide",
    missile_1m:"Commandant missile",
    missile_100m:"Doctrine orbitale"
  };

  let running = false;
  let last = 0;
  let hudT = 0;
  let quickPanelRefreshT = 0;
  let coordinateQuestCheckT = 0;
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
  let npcDialogue = null;
  let deathRespawnHandlersInstalled = false;
  const combatMetricModes = {hp:"bar", shield:"bar", xp:"bar"};
  function getCombatState(){
    return {store, player, camera, mouse, bullets, enemies, particles, impactEffects, damageTexts, stars, dust, nebulae, asteroids, moveTarget, selectedEnemy, gameMode, activePortal, portalWave, portalDelay, portalCompleted, portalLives, portalTransition, missileSalvos, radiationWarned, mouseMoveHeld, combatCargoExpanded, deathState, currentMap, beams, cargo, enemySeq, teleportLock, hudT, quickPanelRefreshT};
  }
  function setCombatState(patch){
    if(Object.hasOwn(patch, "player")) player = patch.player;
    if(Object.hasOwn(patch, "camera")) camera = patch.camera;
    if(Object.hasOwn(patch, "mouse")) mouse = patch.mouse;
    if(Object.hasOwn(patch, "bullets")) bullets = patch.bullets;
    if(Object.hasOwn(patch, "enemies")) enemies = patch.enemies;
    if(Object.hasOwn(patch, "particles")) particles = patch.particles;
    if(Object.hasOwn(patch, "impactEffects")) impactEffects = patch.impactEffects;
    if(Object.hasOwn(patch, "damageTexts")) damageTexts = patch.damageTexts;
    if(Object.hasOwn(patch, "stars")) stars = patch.stars;
    if(Object.hasOwn(patch, "dust")) dust = patch.dust;
    if(Object.hasOwn(patch, "nebulae")) nebulae = patch.nebulae;
    if(Object.hasOwn(patch, "asteroids")) asteroids = patch.asteroids;
    if(Object.hasOwn(patch, "moveTarget")) moveTarget = patch.moveTarget;
    if(Object.hasOwn(patch, "selectedEnemy")) selectedEnemy = patch.selectedEnemy;
    if(Object.hasOwn(patch, "gameMode")) gameMode = patch.gameMode;
    if(Object.hasOwn(patch, "activePortal")) activePortal = patch.activePortal;
    if(Object.hasOwn(patch, "portalWave")) portalWave = patch.portalWave;
    if(Object.hasOwn(patch, "portalDelay")) portalDelay = patch.portalDelay;
    if(Object.hasOwn(patch, "portalCompleted")) portalCompleted = patch.portalCompleted;
    if(Object.hasOwn(patch, "portalLives")) portalLives = patch.portalLives;
    if(Object.hasOwn(patch, "portalTransition")) portalTransition = patch.portalTransition;
    if(Object.hasOwn(patch, "teleportLock")) teleportLock = patch.teleportLock;
    if(Object.hasOwn(patch, "radiationWarned")) radiationWarned = patch.radiationWarned;
    if(Object.hasOwn(patch, "mouseMoveHeld")) mouseMoveHeld = patch.mouseMoveHeld;
    if(Object.hasOwn(patch, "combatCargoExpanded")) combatCargoExpanded = patch.combatCargoExpanded;
    if(Object.hasOwn(patch, "deathState")) deathState = patch.deathState;
    if(Object.hasOwn(patch, "currentMap")) currentMap = patch.currentMap;
    if(Object.hasOwn(patch, "enemySeq")) enemySeq = patch.enemySeq;
    if(Object.hasOwn(patch, "hudT")) hudT = patch.hudT;
    if(Object.hasOwn(patch, "quickPanelRefreshT")) quickPanelRefreshT = patch.quickPanelRefreshT;
  }
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
    recordWeaponUse,
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
  const hitResolution = createCombatHitResolutionSystem({
    getState:getCombatState,
    setState:setCombatState,
    damageEnemy,
    damagePlayer,
    rewardEnemy,
    applyPlayerPoison
  });
  const enemyRuntime = createCombatEnemyRuntime({
    multiplayer,
    getState:getCombatState,
    setState:setCombatState,
    getMapState,
    damagePlayer,
    rollBetween,
    resolveBulletImpact,
    isSafeModeActive
  });
  const statusEffects = createCombatStatusEffectSystem({
    getState:getCombatState,
    setState:setCombatState,
    updatePoisonStatus,
    pushDamageText,
    handlePlayerDeath,
    onPlayerHpLost:handleQuestHpLoss
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
    getQuestObjectiveProgress,
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
    getCurrentMap:()=>currentMap,
    getGameMode:()=>gameMode,
    getSkillBonus,
    registerKill,
    recordQuestKill,
    rollQuestItemDropFromKill,
    addXP,
    spawnPortalPieceDrop:(enemy, portal)=>cargo.spawnPortalPieceDrop(enemy, portal),
    spawnQuestItemDrop:(enemy, item)=>cargo.spawnQuestItemDrop(enemy, item),
    getSelectedEnemy:()=>selectedEnemy,
    clearSelectedEnemy,
    getParticles:()=>particles,
    saveState,
    showToast,
    onLootChanged:()=>updateLootPopup()
  });
  cargo = createCombatCargoSystem({
    addPortalPiece,
    addShipCargoMaterial,
    recordQuestItemPickup,
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
  const worldState = createCombatWorldStateSystem({
    mapList:MAPS,
    getState:getCombatState,
    setState:setCombatState,
    getAllRawMaterials,
    cargo,
    beams,
    panels,
    saveState,
    showToast,
    updateHud,
    clampPlayerToMap,
  });
  const interactions = createCombatInteractionSystem({
    store,
    getState:getCombatState,
    setState:setCombatState,
    actions,
    cargo,
    getAmmo,
    getAmmoCount,
    showToast,
    updateHud
  });
  const hudController = createCombatHudController({
    store,
    rewards,
    combatMetricModes,
    getPlayer:()=>player,
    getGameMode:()=>gameMode,
    getActivePortal:()=>activePortal,
    getCurrentMap:()=>currentMap,
    getPortalWave:()=>portalWave,
    getPortalDelay:()=>portalDelay,
    getPortalCompleted:()=>portalCompleted,
    getCombatCargoExpanded:()=>combatCargoExpanded,
    getCurrentRank,
    getRankAssetPath,
    getShipCargoUsed,
    getShipCargoCapacity,
    getSafeArea:()=>worldState.getCurrentSafeArea(),
    isPlayerOutsideMap,
    isRepairBotReady:canRepairBotActivate,
    validSelectedEnemy
  });
  const sceneRenderer = createCombatSceneRenderer({
    ctx,
    canvas,
    cache,
    mapList:MAPS,
    shipList:ships,
    store,
    getState:getCombatState,
    getGraphicsQuality,
    getSpawnStations:()=>worldState.getSpawnStations(),
    isSafeModeActive,
    isPlayerOutsideMap,
    getCanvasViewWidth,
    getCanvasViewHeight,
    getActiveShip,
    getCurrentRank,
    getRankAssetPath,
    getDroneLoadout,
    getItemFromInventoryUid,
    getDronePermanentUpgrade,
    getPlayerTitle:()=>store.state.player.titleVisible === false ? "" : (PROFILE_TITLES[store.state.player.activeTitleId] || ""),
    getGroupRemotePlayers,
    miniMap,
    defaultEngineProfile:DEFAULT_ENGINE_PROFILE,
    engineProfiles:SHIP_ENGINE_PROFILES
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
  const deathRespawn = createCombatDeathRespawnSystem({
    mapList:MAPS,
    store,
    canAfford,
    spend,
    saveState,
    getState:getCombatState,
    setState:setCombatState,
    clearPoison,
    getNearestPortal:worldState.getNearestPortal,
    loadMap,
    setTeleportLock:value=>{ teleportLock = value; },
    showToast,
    updateHud,
    portalStartingLives:PORTAL_STARTING_LIVES
  });
  const portalRun = createCombatPortalRunSystem({
    mapList:MAPS,
    getState:getCombatState,
    setState:setCombatState,
    cargo,
    beams,
    rewards,
    panels,
    clampPlayerToMap,
    showToast,
    updateHud,
    portalWaveDelay:PORTAL_WAVE_DELAY,
    portalStartingLives:PORTAL_STARTING_LIVES
  });
  const serverEvents = createCombatServerEventSystem({
    multiplayer,
    getState:getCombatState,
    setState:setCombatState,
    cargo,
    beams,
    rewards,
    panels,
    damagePlayer,
    pushDamageText,
    spawnPortalExit,
    showToast,
    updateHud,
    updateLootPopup,
    portalStartingLives:PORTAL_STARTING_LIVES
  });
  const frameUpdate = createCombatFrameUpdateSystem({
    multiplayer,
    getState:getCombatState,
    setState:setCombatState,
    advancePortalTransition:advanceMapPortalTransition,
    loadMap,
    updatePlayerMovement,
    updateCamera,
    updateRadiation,
    updatePlayerPoison,
    updateLootPopup,
    tickCombatBoosts,
    isSafeModeActive,
    isPlayerOutsideMap,
    emitPlayerEngineParticles,
    updateHud,
    syncServerControlledEnemies,
    sendPlayerSnapshot,
    getCurrentRank,
    getActiveShip,
    getRankAssetPath,
    serverEvents,
    updateEnemies,
    updateWeapons,
    updateBullets,
    updateMapRespawns,
    updateParticles,
    updateRepairBot,
    spawnPortalWave,
    completePortalRun,
    validSelectedEnemy,
    getCanvas:()=>canvas,
    getActiveLaserSlot:()=>actions.getActiveLaserSlot(),
    actions,
    panels,
    rewards,
    cargo,
    beams,
    worldFromScreen,
    defaultEngineProfile:DEFAULT_ENGINE_PROFILE,
    engineProfiles:SHIP_ENGINE_PROFILES
  });
  const perf = createCombatPerfSystem({
    getState:getCombatState,
    update,
    draw
  });
  const frameLoop = createCombatLoop({
    isRunning:()=>running,
    update:perf.measuredUpdate,
    draw:perf.measuredDraw,
    getLastTime:()=>last,
    setLastTime:value=>{ last = value; },
    onFrameMetrics:perf.recordFrameMetrics
  });

  function preload(){
    preloadCombatAssets({cache, ships, equipment:[...equipment, ...getAllRawMaterials(), ...portals, {img:"assets/materials/cargo_box.svg"}, {img:"assets/quest_items/contaminated_sample.png"}, {img:"assets/quest_items/teleportation_fluid.png"}], ammoTypes, enemyTypes:ENEMY_TYPES, maps:MAPS, ranks:RANK_TABLE, getRankAssetPath});
  }
  function resetPerfMetrics(){
    perf.reset();
  }

  function getMapState(map){ return worldState.getMapState(map); }

  function getCanvasViewWidth(){ return canvas.__viewWidth || canvas.clientWidth || canvas.width; }
  function getCanvasViewHeight(){ return canvas.__viewHeight || canvas.clientHeight || canvas.height; }
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || window.innerWidth || canvas.clientWidth || 1));
    const height = Math.max(1, Math.floor(rect.height || window.innerHeight || canvas.clientHeight || 1));
    canvas.__viewWidth = width; canvas.__viewHeight = height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function getActiveShip(){ return ships.find(ship=>ship.id === store.state.activeShip) || ships[0]; }
  function clampPlayerToMap(){ clampPlayerToMapSystem({player, map:currentMap}); }
  function isPlayerOutsideMap(){ return worldState.isPlayerOutsideMap(); }
  function updateRadiation(dt, handleDeath){ worldState.updateRadiation(dt, handleDeath); }
  function isSafeModeActive(){ return worldState.isSafeModeActive(); }

  function clearPoison(){ statusEffects.clearPoison(); }
  function handlePlayerDeath(){
    handleQuestFailures(recordQuestDeath(), "mort du pilote");
    deathRespawn.handlePlayerDeath();
  }
  function chooseDeathRespawn(choice){ deathRespawn.chooseRespawn(choice); }
  function markCombatActivity(reason = "combat"){
    if(reason === "outgoing"){
      player.safeZoneLock = SAFE_ZONE_DELAY;
      player.lastAggression = performance.now();
    }
  }

  function getStationAt(world){ return worldState.getStationAt(world); }

  function findQuestNpcAt(world){
    const npcs = Array.isArray(currentMap?.questNpcs) ? currentMap.questNpcs : [];
    return npcs.find(npc=>Math.hypot(world.x - npc.x, world.y - npc.y) <= (npc.radius || 90)) || null;
  }

  function getQuestObjectiveState(quest, objectiveId){
    const objective = quest?.objectives?.find(entry=>entry.id === objectiveId);
    if(!quest || !objective) return {progress:0, target:0};
    const index = quest.objectives.indexOf(objective);
    const key = objective.id || `${objective.type || "objective"}:${objective.target || objective.module || objective.map || objective.zone || index}:${index}`;
    return {
      progress:getQuestObjectiveProgress(quest.id, key),
      target:Number(objective.count || 0)
    };
  }

  function isQuestObjectiveDone(quest, objectiveId){
    const state = getQuestObjectiveState(quest, objectiveId);
    return state.target > 0 && state.progress >= state.target;
  }

  function getRickyQuest(){
    return getActiveQuests().find(quest=>quest.id === "quest_lv5_call_for_help") || null;
  }

  function getQuestNpcDialogue(npc){
    if(npc.id !== "astra02_portal_mechanic") return {lines:[`${npc.name || "PNJ"} n'a rien a te demander pour le moment.`], progress:false};
    const quest = getRickyQuest();
    if(!quest) return {lines:["Signal bloque. Passe par le relais de quetes avant de revenir."], progress:false};
    if(!isQuestObjectiveDone(quest, "portal_coord")) return {lines:["Approche du portail ferme, je capte mal ton signal."], progress:false};
    if(!isQuestObjectiveDone(quest, "talk_start")){
      return {
        lines:[
          "Mon petit fils !!",
          "J'ai merder mon petit fils et coincé à l'intérieur avec mon pistou portgun.",
          "Arh c'est pas le moment ! ont se fait attaquer."
        ],
        progress:true
      };
    }
    const combatDone = ["traqueurs", "parasites", "vorak", "orbes"].every(id=>isQuestObjectiveDone(quest, id));
    if(combatDone && !isQuestObjectiveDone(quest, "talk_return")){
      return {
        lines:[
          "Belle bête tu les as bien remis à leur place.",
          "Il faudrait me trouver du fluide de téléportation mais ici il n'y en as pas essaye de voir en magasin."
        ],
        progress:true
      };
    }
    if(!combatDone) return {lines:["Nettoie la zone d'abord ! 2 traqueurs abyssaux, 6 parasites, 8 Vorak et 15 orbes, puis reviens me voir."], progress:false};
    if(!isQuestObjectiveDone(quest, "fluides")){
      const fluides = getInventoryCount("teleportation_fluid");
      if(fluides >= 10){
        return {lines:["Ahah impréssionant. Retourne a ta station reviens me voir une fois plus aguéris j'aurais encore besoin de toi"], progress:true};
      }
      return {lines:[`Il me faut 10 fluides de téléportation. Tu en as ${fluides}/10. Regarde dans les extras du magasin.`], progress:false};
    }
    return {lines:["Le portail ne bougera pas sans pieces. On aura encore du boulot."], progress:false};
  }

  function getNpcDialoguePanel(){
    let panel = document.getElementById("npcDialoguePanel");
    if(panel) return panel;
    panel = document.createElement("div");
    panel.id = "npcDialoguePanel";
    panel.className = "npc-dialogue hidden";
    panel.innerHTML = `
      <div class="npc-dialogue-box">
        <div class="npc-dialogue-head"><span data-npc-name></span><button type="button" class="npc-dialogue-close" aria-label="Fermer le dialogue">×</button></div>
        <p><span data-npc-line></span><i class="npc-dialogue-cursor"></i></p>
      </div>`;
    document.getElementById("gameScreen")?.appendChild(panel);
    panel.addEventListener("click", e=>{
      e.preventDefault();
      if(e.target.closest(".npc-dialogue-close")){
        closeNpcDialogue();
        return;
      }
      advanceNpcDialogue();
    });
    return panel;
  }

  function positionNpcDialogue(){
    if(!npcDialogue?.npc) return false;
    const panel = getNpcDialoguePanel();
    if(panel.classList.contains("hidden")) return false;
    const rect = canvas.getBoundingClientRect();
    const zoom = Number(camera.zoom || 1);
    const npc = npcDialogue.npc;
    const npcSize = Number(npc.size || 120);
    const rawX = rect.left + (Number(npc.x || 0) - camera.x) * zoom;
    const rawY = rect.top + (Number(npc.y || 0) - camera.y - npcSize * .68) * zoom;
    const offscreenMargin = 90;
    if(rawX < -offscreenMargin || rawX > window.innerWidth + offscreenMargin || rawY < -offscreenMargin || rawY > window.innerHeight + offscreenMargin){
      closeNpcDialogue();
      return false;
    }
    const width = Math.min(440, Math.max(300, window.innerWidth - 32));
    const margin = 14;
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rawX - width / 2));
    const top = Math.max(82, Math.min(window.innerHeight - 190, rawY - 132));
    const arrowX = Math.max(28, Math.min(width - 28, rawX - left));
    panel.style.width = `${width}px`;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.setProperty("--npc-arrow-x", `${arrowX}px`);
    return true;
  }

  function renderNpcDialogue(){
    const panel = getNpcDialoguePanel();
    const line = npcDialogue?.lines?.[npcDialogue.index] || "";
    panel.querySelector("[data-npc-name]").textContent = npcDialogue?.npc?.name || "PNJ";
    npcDialogue.lineText = line;
    npcDialogue.visibleText = "";
    npcDialogue.charIndex = 0;
    npcDialogue.typeTimer = 0;
    panel.querySelector("[data-npc-line]").textContent = "";
    panel.classList.remove("hidden");
    panel.classList.remove("visible", "line-swap");
    positionNpcDialogue();
    requestAnimationFrame(()=>{
      panel.classList.add("visible", "line-swap");
      window.setTimeout(()=>panel.classList.remove("line-swap"), 220);
    });
  }

  function closeNpcDialogue(){
    const panel = document.getElementById("npcDialoguePanel");
    panel?.classList.remove("visible", "line-swap");
    panel?.classList.add("hidden");
    npcDialogue = null;
  }

  function advanceNpcDialogue(){
    if(!npcDialogue) return;
    if((npcDialogue.charIndex || 0) < String(npcDialogue.lineText || "").length){
      npcDialogue.charIndex = String(npcDialogue.lineText || "").length;
      npcDialogue.visibleText = npcDialogue.lineText || "";
      document.getElementById("npcDialoguePanel")?.querySelector("[data-npc-line]")?.replaceChildren(document.createTextNode(npcDialogue.visibleText));
      return;
    }
    npcDialogue.index += 1;
    if(npcDialogue.index < npcDialogue.lines.length){
      renderNpcDialogue();
      return;
    }
    const npc = npcDialogue.npc;
    const shouldProgress = npcDialogue.progress;
    closeNpcDialogue();
    if(shouldProgress && recordQuestNpcTalk(npc.id, currentMap.name)){
      saveState();
      const panelMode = panels.getSpawnPanelMode?.();
      if(panelMode) panels.renderSpawnInteractionPanel?.(panelMode);
      updateHud();
      showToast("Objectif mis a jour.");
    }
  }

  function interactQuestNpc(npc){
    const dialogue = getQuestNpcDialogue(npc);
    npcDialogue = {npc, lines:dialogue.lines, progress:dialogue.progress, index:0};
    player.vx = 0;
    player.vy = 0;
    moveTarget = null;
    mouseMoveHeld = false;
    renderNpcDialogue();
  }

  function updateNpcDialogueTyping(dt){
    if(!npcDialogue) return;
    const line = String(npcDialogue.lineText || "");
    if((npcDialogue.charIndex || 0) >= line.length) return;
    npcDialogue.typeTimer = Number(npcDialogue.typeTimer || 0) + dt * 42;
    const nextIndex = Math.min(line.length, Math.floor(npcDialogue.typeTimer));
    if(nextIndex <= (npcDialogue.charIndex || 0)) return;
    npcDialogue.charIndex = nextIndex;
    npcDialogue.visibleText = line.slice(0, nextIndex);
    const target = document.getElementById("npcDialoguePanel")?.querySelector("[data-npc-line]");
    if(target) target.textContent = npcDialogue.visibleText;
  }

  function formatDuration(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function loadMap(mapId, x, y, options = {}){
    worldState.loadMap(mapId, x, y, options);
    if(recordQuestMapVisit(currentMap?.name)){
      saveState();
      const panelMode = panels.getSpawnPanelMode?.();
      if(panelMode) panels.renderSpawnInteractionPanel?.(panelMode);
    }
  }

  function installDebugCommands(){
    installCombatDebugCommands({
      mapList:MAPS,
      getMapPortals,
      isRunning:()=>running,
      getPlayer:()=>player,
      loadMap,
      showToast
    });
  }

  function spawnPortalExit(){
    portalRun.spawnExit();
  }

  function getHomeMapForPlayer(){
    return portalRun.getHomeMapForPlayer();
  }

  function spawnPortalWave(wave){
    portalRun.spawnWave(wave);
  }

  function completePortalRun(){
    portalRun.completeRun();
  }

  function loadPortalArena(portalId){
    portalRun.loadArena(portalId);
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
    deathRespawn.setPanelVisible(false);
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
    deathRespawn.setPanelVisible(false);
    closeNpcDialogue();
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

  function findEnemyAt(world){
    return interactions.findEnemyAt(world);
  }

  function validSelectedEnemy(){
    return interactions.validSelectedEnemy();
  }

  function clearSelectedEnemy(){
    interactions.clearSelectedEnemy();
  }

  function rememberActiveLaserSlot(){
    interactions.rememberActiveLaserSlot();
  }

  function attackSelectedWithActiveLaser(){
    return interactions.attackSelectedWithActiveLaser();
  }

  function findCargoBoxAt(world){
    return interactions.findCargoBoxAt(world);
  }

  function findGroundMaterialAt(world){
    return interactions.findGroundMaterialAt(world);
  }

  function setCargoDestination(box){
    return interactions.setCargoDestination(box);
  }

  function setGroundMaterialDestination(node){
    return interactions.setGroundMaterialDestination(node);
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


  function getBulletTarget(bullet){
    return enemyRuntime.getBulletTarget(bullet);
  }

  function pushDamageText(payload){
    hitResolution.pushDamageText(payload);
  }

  function rollBetween(min, max){
    return hitResolution.rollBetween(min, max);
  }

  function damageEnemy(enemy, amount){
    const incoming = Math.max(0, Number(amount || 0));
    enemy.recentHitTimer = 4;
    if(isServerControlledEnemy(enemy)){
      sendServerEnemyHit(getServerEnemyId(enemy), incoming);
      return;
    }
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

  function syncServerControlledEnemies(){
    syncCoopInstanceSpawn();
    const synced = syncMultiplayerEnemies({
      enemies,
      multiplayerState:multiplayer,
      selectedEnemy,
      onSelectionLost:()=>{
        actions.setActiveLaserSlot(null);
        actions.updateGameActionBar();
      }
    });
    enemies = synced.enemies;
    selectedEnemy = synced.selectedEnemy;
  }

  function syncCoopInstanceSpawn(){
    if(multiplayer.portalInstance?.portal) return;
    const spawn = multiplayer.coopSpawn;
    if(!spawn || spawn.applied) return;
    if(!hasServerControlledEnemies(multiplayer)) return;
    player.x = Number(spawn.x || player.x);
    player.y = Number(spawn.y || player.y);
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    moveTarget = null;
    selectedEnemy = null;
    bullets = [];
    missileSalvos.clear();
    beams.clear();
    impactEffects = [];
    multiplayer.coopSpawn = {...spawn, applied:true};
    showToast("Instance coop test synchronisee.");
  }

  function applyPlayerPoison(effect){
    statusEffects.applyPlayerPoison(effect);
  }

  function updatePlayerPoison(dt){
    statusEffects.updatePlayerPoison(dt);
  }

  function resolveBulletImpact(bullet){
    hitResolution.resolveBulletImpact(bullet, getBulletTarget(bullet));
  }

  function resolveLaserHit(enemy, damage, hitChance = PLAYER_HIT_CHANCE, ammo = null){
    return hitResolution.resolveLaserHit(enemy, damage, hitChance, ammo);
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
    handleQuestHpLoss(lifecycle.damage(amount));
  }
  function handleQuestHpLoss(amount){
    handleQuestFailures(recordQuestHpLoss(amount), "limite de vie depassee");
  }
  function handleQuestFailures(failedQuests, reason){
    if(!failedQuests.length) return;
    saveState();
    failedQuests.forEach(quest=>showToast(`${quest.title} : ${reason}, progression remise a zero.`));
    const panelMode = panels.getSpawnPanelMode?.();
    if(panelMode) panels.renderSpawnInteractionPanel?.(panelMode);
  }
  function rewardEnemy(enemy){
    if(isServerControlledEnemy(enemy)) return;
    scheduleEnemyRespawn(enemy);
    if(selectedEnemy?.id === enemy.id){
      selectedEnemy = null;
      actions.setActiveLaserSlot(null);
      actions.updateGameActionBar();
    }
    rewards.rewardEnemy(enemy);
  }

  function scheduleEnemyRespawn(enemy){
    enemyRuntime.scheduleRespawn(enemy);
  }

  function updateMapRespawns(dt){
    enemyRuntime.updateMapRespawns(dt);
  }

  function fireAutomaticRocket(enemy){
    return weapons.fireAutomaticRocket(enemy);
  }

  function updateWeapons(dt){
    return weapons.updateWeapons(dt);
  }

  function update(dt){
    frameUpdate.update(dt);
    if(npcDialogue){
      if(positionNpcDialogue()) updateNpcDialogueTyping(dt);
    }
    handleQuestFailures(recordQuestTimeElapsed(dt), "temps depasse");
    coordinateQuestCheckT -= dt;
    if(coordinateQuestCheckT <= 0 && player && currentMap){
      coordinateQuestCheckT = .25;
      if(recordQuestCoordinateVisit({x:player.x, y:player.y}, currentMap.name)){
        saveState();
        const panelMode = panels.getSpawnPanelMode?.();
        if(panelMode) panels.renderSpawnInteractionPanel?.(panelMode);
      }
    }
  }

  function updateEnemies(dt){
    enemyRuntime.updateEnemies(dt);
  }

  function updateBullets(dt){
    enemyRuntime.updateBullets(dt);
  }

  function updateParticles(dt){
    statusEffects.updateParticles(dt);
  }

  function draw(){
    sceneRenderer.draw();
  }
  function updateHud(){
    hudController.updateHud();
  }

  function updateLootPopup(){
    hudController.updateLootPopup();
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
      interactions.selectEnemy(enemy);
      actions.setActiveLaserSlot(null);
      actions.updateGameActionBar();
    },
    findQuestNpcAt,
    interactQuestNpc,
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
    selectQuestTypeForPanel:panels.selectQuestTypeForPanel,
    toggleLockedQuestsForPanel:panels.toggleLockedQuestsForPanel,
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
