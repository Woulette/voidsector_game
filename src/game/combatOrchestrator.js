import { ammoTypes, droneFormations, equipment, portals, ships } from "../data/catalog.js";
import { getCraftRecipe } from "../data/craftingRecipes.js";
import { fmt } from "../core/utils.js";
import {
  canAfford,
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
  getGraphicsEffects,
  getGameSettings,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLevel,
  getEquippedLasers,
  getInventoryCount,
  getItem,
  getItemFromInventoryUid,
  getMaterialCount,
  getRankAssetPath,
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
  recordQuestMissionControl,
  recordQuestNpcTalk,
  saveState,
  setActionSlot,
  store,
  tickCombatBoosts
} from "../core/store.js";

import {
  DEFAULT_ENGINE_PROFILE,
  ENEMY_TYPES,
  MAPS,
  getClosedMapPortals,
  getMapPortals,
  PLAYER_HIT_CHANCE,
  RADAR_RANGE,
  SAFE_ZONE_DELAY,
  SHIP_ENGINE_PROFILES
} from "./combatData.js?v=engine-trail-41";
import { createCombatMapAssetCache, preloadCombatAssets } from "./combatAssets.js";
import { COMBAT_PROFILE_TITLES } from "./combatProfileTitles.js";
import { warmCombatHudTextRendering } from "./render/canvasHud.js?v=action-slots-save-1-fps-burst-1";
import { spawnPlayerEngineParticles as emitPlayerEngineParticles } from "./render/player.js?v=elite-lasers-1";
import { createCombatSceneRenderer } from "./render/combatScene.js?v=action-slots-save-1-fps-burst-1";
import { createCombatLoop } from "./systems/combatLoop.js?v=action-slots-save-1-fps-burst-1";
import { createCombatBeamSystem } from "./systems/combatBeams.js?v=ship-charge-1";
import { createCombatCargoSystem } from "./systems/combatCargo.js";
import { installCombatDebugCommands } from "./systems/combatDebug.js";
import { createCombatDeathRespawnSystem } from "./systems/combatDeathRespawn.js";
import { createCombatFrameUpdateSystem } from "./systems/combatFrameUpdate.js?v=action-slots-save-1-fps-burst-1";
import { createCombatHitResolutionSystem } from "./systems/combatHitResolution.js?v=action-slots-save-1-fps-burst-1";
import { createCombatEnemyRuntime } from "./systems/combatEnemyRuntime.js?v=action-slots-save-1-fps-burst-1";
import { createCombatEnemyDamageSystem } from "./systems/combatEnemyDamage.js";
import { createCombatRemoteTargetResolver } from "./systems/combatRemoteTargets.js";
import { createCombatInteractionSystem } from "./systems/combatInteractions.js";
import { createCombatMapAssetStreamingSystem } from "./systems/combatMapAssetStreaming.js";
import { createCombatMultiplayerSyncSystem } from "./systems/combatMultiplayerSync.js";
import { createCombatServerEventSystem } from "./systems/combatServerEvents.js?v=elite-lasers-1";
import { createCombatServerActions } from "./systems/combatServerActions.js";
import { createCombatPortalRunSystem } from "./systems/combatPortalRun.js";
import { createCombatPortalNavigationSystem } from "./systems/combatPortalNavigation.js";
import { applyCombatStatFields } from "./systems/combatPlayerStats.js";
import { createCombatQuestProgressSystem } from "./systems/combatQuestProgress.js";
import { createCombatSessionController } from "./systems/combatSession.js?v=action-slots-save-1-fps-burst-1";
import { createCombatStatusEffectSystem } from "./systems/combatStatusEffects.js";
import { createCombatWorldStateSystem } from "./systems/combatWorldState.js";
import { createCombatPerfSystem } from "./systems/combatPerf.js";
import { timeCombatProfiler } from "./systems/combatFrameProfiler.js?v=action-slots-save-1-fps-burst-1";
import { createCombatSettingsRuntime } from "./systems/combatSettingsRuntime.js";
import { advanceMapPortalTransition, createMapPortalTransition, findMapPortalAt } from "./systems/mapPortalTransfer.js";
import { createMiniMapState } from "./systems/minimapState.js";
import { createPlayerLifecycle } from "./systems/playerLifecycle.js";
import { clampPlayerToMap as clampPlayerToMapSystem, tickPlayerVisualCorrection, updateCamera, updatePlayerMovement, worldFromScreen as screenToWorld } from "./systems/playerMovement.js?v=action-slots-save-1-fps-burst-1";
import { createRepairBotSystem } from "./systems/repairBot.js";
import { createRewardSystem } from "./systems/rewards.js";
import { createWeaponSystem } from "./systems/weapons.js?v=action-slots-save-1-fps-burst-1";
import { updatePoisonStatus, updateSlowStatus } from "./ui/hud.js";
import { createCombatHudController } from "./ui/combatHudController.js";
import { createCombatChat } from "./ui/combatChat.js";
import { createCombatLogoutController } from "./ui/combatLogoutController.js";
import { installCombatInputHandlers } from "./ui/inputBindings.js?v=crafting-1";
import { createQuestNpcDialogue } from "./ui/questNpcDialogue.js";
import { createCombatActions } from "./ui/combatActions.js?v=action-slots-save-1-fps-burst-1";
import { createCombatPanels } from "./ui/combatPanels.js?v=crafting-1";
import { createCombatSettingsPanel } from "./ui/combatSettingsPanel.js?v=ship-abilities-1";
import { acceptServerQuest, activateRickyHealBeacon as activateServerRickyHealBeacon, activateShipAbility as activateServerShipAbility, activateRickyPortalLever, buyServerAmmo, buyServerDroneFormation, claimServerCraft, claimServerQuest, claimServerRefineryJob, depositServerCombatBoostMaterial, disconnectMultiplayer, getGroupRemotePlayers, multiplayer, progressServerQuest, refineServerShipCargo, requestPlayerRespawn, requestServerLootPickup, requestServerLogout, sellServerMaterial, sendChatMessage, sendPlayerLaserEffect, sendPrivateMessage, sendPlayerSnapshot, sendServerEnemyHit, sendServerPlayerHit, startServerCraft, startServerPortal as startMultiplayerPortal, startServerRefineryJob, syncMultiplayerProfile, trackServerQuest, upgradeServerEquipment } from "../multiplayer/client.js?v=crafting-1";
import { MMO_REQUIRED_MESSAGE, isMmoConnected } from "../app/mmoGate.js";
import { getShipAbilityStatuses } from "../shared/shipAbilities.js?v=ship-charge-1";
import {
  getServerEnemyId,
  hasServerControlledEnemies,
  isServerControlledEnemy,
  syncServerControlledEnemies as syncMultiplayerEnemies
} from "../multiplayer/enemies.js?v=action-slots-save-1-fps-burst-1";
export function createCombatGame({renderAll, showToast}){
  const PORTAL_STARTING_LIVES = 3;
  const PORTAL_WAVE_DELAY = 30;
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const cache = {};
  const mapAssetCache = createCombatMapAssetCache({cache, maxMaps:3});
  let running = false;
  let last = 0;
  let hudT = 0;
  let quickPanelRefreshT = 0;
  let enemySeq = 1;
  let currentMap = MAPS[0];
  let teleportLock = 0;
  let player, camera, mouse, bullets, enemies, particles, impactEffects, damageTexts, stars, dust, nebulae, asteroids, moveTarget, selectedEnemy;
  let gameMode, activePortal, portalWave, portalDelay, portalCompleted, portalLives, portalAlly, portalBeacons, portalObjective, portalCinematic, portgunChannel;
  let portalTransition = null;
  const missileSalvos = new Map();
  let radiationWarned = false;
  let mouseMoveHeld = false;
  let combatCargoExpanded = false;
  let deathState = null;
  const combatMetricModes = {hp:"bar", shield:"bar", xp:"bar"};
  function getCombatState(){
    return {store, player, camera, mouse, bullets, enemies, particles, impactEffects, damageTexts, stars, dust, nebulae, asteroids, moveTarget, selectedEnemy, gameMode, activePortal, portalWave, portalDelay, portalCompleted, portalLives, portalAlly, portalBeacons, portalObjective, portalCinematic, portgunChannel, portalTransition, missileSalvos, radiationWarned, mouseMoveHeld, combatCargoExpanded, deathState, currentMap, beams, cargo, enemySeq, teleportLock, hudT, quickPanelRefreshT};
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
    if(Object.hasOwn(patch, "portalAlly")) portalAlly = patch.portalAlly;
    if(Object.hasOwn(patch, "portalBeacons")) portalBeacons = patch.portalBeacons;
    if(Object.hasOwn(patch, "portalObjective")) portalObjective = patch.portalObjective;
    if(Object.hasOwn(patch, "portalCinematic")) portalCinematic = patch.portalCinematic;
    if(Object.hasOwn(patch, "portgunChannel")) portgunChannel = patch.portgunChannel;
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
  const remoteTargets = createCombatRemoteTargetResolver({
    store,
    multiplayer,
    getCurrentMap:()=>currentMap
  });
  const beams = createCombatBeamSystem({
    getTargetById:id=>String(id || "").startsWith("player:")
      ? findRemotePlayerTargetById(String(id).slice("player:".length))
      : enemies.find(enemy=>enemy.id === id && enemy.hp > 0) || null
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
    markCombatActivity,
    addLaserBeam:beam=>beams.add(beam),
    sendPlayerWeaponEffect:sendPlayerLaserEffect,
    getNetworkTargetId:enemy=>enemy?.isPlayerTarget ? `player:${enemy.playerId}` : getServerEnemyId(enemy),
    resolveLaserHit,
    saveState,
    refreshActionBar:()=>actions.updateGameActionBar(),
    refreshQuickPanel:()=>actions.renderCombatQuickPanel(),
    showToast,
    isServerControlledEnemy,
    playerHitChance:PLAYER_HIT_CHANCE
  });
  const repairBot = createRepairBotSystem({
    getPlayer:()=>player,
    getParticles:()=>particles,
    pushDamageText,
    showToast
  });
  const enemyDamage = createCombatEnemyDamageSystem({
    isServerControlledEnemy,
    getServerEnemyId,
    sendServerEnemyHit,
    sendServerPlayerHit
  });
  const hitResolution = createCombatHitResolutionSystem({
    getState:getCombatState,
    setState:setCombatState,
    isServerControlledEnemy,
    damageEnemy:enemyDamage.damage,
    damagePlayer,
    rewardEnemy,
    applyPlayerPoison
  });
  const enemyRuntime = createCombatEnemyRuntime({
    multiplayer,
    getState:getCombatState,
    setState:setCombatState,
    getMapState,
    findRemotePlayerTargetById,
    damagePlayer,
    rollBetween,
    resolveBulletImpact,
    isSafeModeActive
  });
  const statusEffects = createCombatStatusEffectSystem({
    getState:getCombatState,
    setState:setCombatState,
    updatePoisonStatus,
    updateSlowStatus,
    pushDamageText,
    handlePlayerDeath,
    onPlayerHpLost:amount=>questProgress.recordHpLoss(amount)
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
    applyCombatStatFields(player, stats);
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
    multiplayer,
    buyServerAmmo,
    buyServerDroneFormation,
    canAfford,
    saveState,
    syncProfile:()=>syncMultiplayerProfile(store.state),
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
    fireManualMissile,
    openPortgunMap:()=>window.dispatchEvent(new CustomEvent("voidsector:portgun-open-map")),
    getNpcAbilityStates:()=>{
      const available = gameMode === "portal"
        && activePortal?.id === "ricky"
        && portalAlly
        && portalAlly.alive !== false
        && Number(portalAlly.hp || 0) > 0;
      if(!available) return [];
      return [{
        abilityId:"ricky_heal_beacon",
        ownerName:"Ricky",
        name:"Balise de soin",
        shortName:"BALISE",
        description:"Ricky déploie une balise qui restaure la coque.",
        icon:"assets/icons/medical_cross.svg",
        activeRemainingMs:0,
        cooldownRemainingMs:Math.max(0, Number(portalAlly?.healCooldown || 0)) * 1000,
        cooldownMs:Math.max(0, Number(portalAlly?.healCooldownTotal || 60)) * 1000
      }];
    },
    activateNpcAbility:abilityId=>{
      if(abilityId !== "ricky_heal_beacon") return false;
      if(gameMode !== "portal" || activePortal?.id !== "ricky") return false;
      if(!portalAlly || portalAlly.alive === false || Number(portalAlly.hp || 0) <= 0){
        showToast("Ricky n'est plus disponible.");
        return false;
      }
      if(Number(portalAlly.healCooldown || 0) > 0){
        showToast(`Balise Ricky en recharge : ${Math.ceil(Number(portalAlly.healCooldown || 0))}s.`);
        return false;
      }
      if(activateServerRickyHealBeacon()) return true;
      showToast(MMO_REQUIRED_MESSAGE);
      return false;
    },
    getShipAbilityStates:()=>{
      const shipId = String(store.state.activeShip || "");
      const storedState = store.state.shipAbilityStates?.[shipId] || {};
      const liveState = multiplayer.shipAbilityState;
      let stateValue = storedState;
      if(String(liveState?.shipId || "") === shipId && liveState?.abilityId){
        const nestedState = storedState && typeof storedState === "object"
          && !Object.hasOwn(storedState, "activeUntil")
          && !Object.hasOwn(storedState, "cooldownUntil")
          ? storedState
          : {};
        stateValue = {...nestedState, [liveState.abilityId]:liveState};
      }
      return getShipAbilityStatuses(shipId, stateValue, Date.now());
    },
    activateShipAbility:abilityId=>activateServerShipAbility(abilityId)
  });

  const {
    acceptQuestAction,
    claimQuestAction,
    refineShipCargoRecipeAction,
    upgradeEquipmentAction
  } = createCombatServerActions({
    multiplayer,
    getActiveShipId:()=>store.state.activeShip,
    getAllQuests,
    getRefineryRecipes,
    getEquipmentUpgradeLevel,
    acceptServerQuest,
    claimServerQuest,
    refineServerShipCargo,
    upgradeServerEquipment
  });

  let settingsController = null;
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
    claimQuest:claimQuestAction,
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
    graphicsQualityPresets:GRAPHICS_QUALITY_PRESETS,
    getGraphicsQuality,
    renderSettingsContent:()=>settingsController?.renderContent?.() || ""
  });
  const chat = createCombatChat({
    store,
    saveState,
    multiplayer,
    sendChatMessage,
    sendPrivateMessage,
    fmt,
    showToast
  });
  const settingsRuntime = createCombatSettingsRuntime({store, resize, chat, saveState});
  settingsController = createCombatSettingsPanel({
    store,
    saveState,
    applySettings:options=>settingsRuntime.applySettings(options),
    runtime:settingsRuntime,
    chat,
    closePanel:()=>panels.openUtilityPanel("settings"),
    refreshActionBar:()=>actions.updateGameActionBar(),
    showToast
  });
  settingsRuntime.applySettings({syncChat:true});
  let cargo;
  const rewards = createRewardSystem({
    onLootChanged:()=>updateLootPopup()
  });
  window.addEventListener("voidsector:multiplayer-change", event=>{
    const reason = String(event.detail?.reason || "");
    if(reason === "firm:snapshot" || reason === "firm:ranking"){
      if(running && player){
        refreshPlayerStatsFromLoadout();
        updateHud();
      }
      return;
    }
    if(reason !== "group:invite") return;
    const invite = event.detail?.payload || {};
    rewards.showLootNotice({
      message:`${invite.fromName || "Un joueur"} vous invite en groupe`,
      duration:15
    });
  });
  window.addEventListener("voidsector:profile-applied", event=>{
    if(!event.detail?.profile?.boosters || !running || !player) return;
    refreshPlayerStatsFromLoadout();
    updateHud();
  });
  cargo = createCombatCargoSystem({
    rewards,
    requestServerLootPickup,
    showToast,
    onCargoChanged:()=>updateHud(),
    particles:()=>particles
  });
  const worldState = createCombatWorldStateSystem({
    store,
    mapList:MAPS,
    getState:getCombatState,
    setState:setCombatState,
    cargo,
    beams,
    panels,
    showToast,
    updateHud,
    clampPlayerToMap
  });
  const mapAssetStreaming = createCombatMapAssetStreamingSystem({
    mapList:MAPS,
    getState:getCombatState,
    getMapPortals:getAccessibleMapPortals,
    preloadMapAssets:map=>mapAssetCache.preload(map, {defer:true})
  });
  const interactions = createCombatInteractionSystem({
    store,
    getState:getCombatState,
    setState:setCombatState,
    actions,
    cargo,
    getAmmo,
    getAmmoCount,
    findRemotePlayerTargetById,
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
    getGraphicsEffects,
    getSpawnStations:()=>worldState.getSpawnStations(),
    getSafeAreas:()=>worldState.getSafeAreas(),
    isSafeModeActive,
    isPlayerOutsideMap,
    getMapPortals:getAccessibleMapPortals,
    getClosedMapPortals:getLockedMapPortals,
    getCanvasViewWidth,
    getCanvasViewHeight,
    getActiveShip,
    getCurrentRank,
    getRankAssetPath,
    getDroneLoadout,
    getItemFromInventoryUid,
    getDronePermanentUpgrade,
    getPlayerTitle:()=>store.state.player.titleVisible === false ? "" : (COMBAT_PROFILE_TITLES[store.state.player.activeTitleId] || ""),
    getLocalPlayerRole:()=>multiplayer.auth?.account?.role || "",
    getGroupRemotePlayers,
    getGroupPingTarget:()=>multiplayer.groupPing,
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
    getState:getCombatState,
    setState:setCombatState,
    clearPoison,
    getNearestPortal:worldState.getNearestPortal,
    loadMap,
    setTeleportLock:value=>{ teleportLock = value; },
    showToast,
    updateHud,
    portalStartingLives:PORTAL_STARTING_LIVES,
    multiplayer,
    requestServerRespawn:requestPlayerRespawn
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
    portalStartingLives:PORTAL_STARTING_LIVES,
    isMultiplayerConnected:()=>multiplayer.authoritativeSession
  });
  const portalNavigation = createCombatPortalNavigationSystem({
    mapList:MAPS,
    getState:getCombatState,
    setState:setCombatState,
    actions,
    getMapPortals:getAccessibleMapPortals,
    findMapPortalAt,
    createMapPortalTransition,
    getMapState,
    getHomeMapForPlayer,
    loadMap,
    startServerPortal:portalId=>{
      if(!startMultiplayerPortal(portalId)) return false;
      showToast("Activation du portail...");
      return true;
    },
    showToast
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
    applyPlayerPoison,
    applyPlayerSlow,
    clearPoison:()=>statusEffects.clearPoison(),
    clearSlow:()=>statusEffects.clearSlow(),
    pushDamageText,
    spawnPortalExit,
    showToast,
    updateHud,
    updateLootPopup,
    portalStartingLives:PORTAL_STARTING_LIVES,
    onPortalMapLoaded:map=>{
      mapAssetCache.activate(map);
      mapAssetStreaming.reset();
    },
    applyServerDeath:event=>deathRespawn.applyServerDeath(event),
    applyServerRespawn:event=>deathRespawn.applyServerRespawn(event),
    markAuthoritativeDamageReceived
  });
  const multiplayerSync = createCombatMultiplayerSyncSystem({
    multiplayer,
    getState:getCombatState,
    setState:setCombatState,
    actions,
    beams,
    hasServerControlledEnemies,
    syncServerControlledEnemies:syncMultiplayerEnemies,
    showToast
  });
  const frameUpdate = createCombatFrameUpdateSystem({
    multiplayer,
    getState:getCombatState,
    setState:setCombatState,
    advancePortalTransition:advanceMapPortalTransition,
    loadMap,
    updatePlayerMovement,
    updateCamera,
    tickPlayerVisualCorrection,
    updateRadiation,
    updatePlayerPoison,
    updatePlayerSlow,
    updateLootPopup,
    tickCombatBoosts,
    isSafeModeActive,
    isPlayerOutsideMap,
    emitPlayerEngineParticles:args=>{
      if(getGraphicsEffects().shipEngineTrail !== false) emitPlayerEngineParticles(args);
    },
    updateHud,
    syncServerControlledEnemies:multiplayerSync.syncEnemies,
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
    onFrameMetrics:perf.recordFrameMetrics,
    getFpsLimit:()=>getGameSettings().graphics.fpsLimit
  });
  const questNpcDialogue = createQuestNpcDialogue({
    canvas,
    multiplayer,
    getCamera:()=>camera,
    getCurrentMap:()=>currentMap,
    getPlayer:()=>player,
    stopPlayerMovement:()=>{
      player.vx = 0;
      player.vy = 0;
      moveTarget = null;
      mouseMoveHeld = false;
    },
    getActiveQuests,
    getQuestObjectiveProgress,
    getInventoryCount,
    progressServerQuest,
    recordQuestNpcTalk,
    saveState,
    getSpawnPanelMode:()=>panels.getSpawnPanelMode?.(),
    renderSpawnInteractionPanel:mode=>panels.renderSpawnInteractionPanel?.(mode),
    updateHud,
    showToast
  });
  const logout = createCombatLogoutController({
    multiplayer,
    requestServerLogout,
    disconnectMultiplayer,
    getRunning:()=>running,
    setRunning:value=>{ running = value; },
    getPlayer:()=>player,
    getPortalTransition:()=>portalTransition,
    getTeleportLock:()=>teleportLock,
    getMouseMoveHeld:()=>mouseMoveHeld,
    getMoveTarget:()=>moveTarget,
    getSelectedEnemy:()=>selectedEnemy,
    getEnemies:()=>enemies,
    saveState,
    closeNpcDialogue:questNpcDialogue.close,
    clearPoison,
    closeUtilityPanel:options=>panels.closeUtilityPanel(options),
    closeSpawnPanel:options=>panels.closeSpawnPanel(options),
    showToast
  });
  const questProgress = createCombatQuestProgressSystem({
    multiplayer,
    getPlayer:()=>player,
    getCurrentMap:()=>currentMap,
    progressServerQuest
  });
  const session = createCombatSessionController({
    store,
    mapList:MAPS,
    radarRange:RADAR_RANGE,
    getRunning:()=>running,
    setRunning:value=>{ running = value; },
    getState:getCombatState,
    setState:setCombatState,
    getShipCombatStats,
    getCanvasViewWidth,
    getCanvasViewHeight,
    preload,
    resize,
    resetPerfMetrics,
    applyMiniMapLayout:layout=>miniMap.applyLayout(layout, false),
    installDebugCommands,
    logout,
    deathRespawn,
    chooseDeathRespawn,
    actions,
    panels,
    rewards,
    beams,
    cargo,
    loadMap,
    loadPortalArena,
    updateHud,
    frameLoop,
    closeQuestNpcDialogue:questNpcDialogue.close,
    clearPoison,
    saveState,
    renderAll,
    showToast
  });
  function preload(){
    preloadCombatAssets({cache, ships:[getActiveShip()], ranks:[getCurrentRank()], getRankAssetPath});
    warmCombatHudTextRendering();
  }
  function resetPerfMetrics(){
    perf.reset();
  }

  function getMapState(map){ return worldState.getMapState(map); }

  function getCanvasViewWidth(){ return canvas.__viewWidth || canvas.clientWidth || canvas.width; }
  function getCanvasViewHeight(){ return canvas.__viewHeight || canvas.clientHeight || canvas.height; }
  function resize(){
    const quality = getGraphicsQuality();
    const maxDpr = quality === "high" ? 1.5 : quality === "medium" ? 1.25 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || window.innerWidth || canvas.clientWidth || 1));
    const height = Math.max(1, Math.floor(rect.height || window.innerHeight || canvas.clientHeight || 1));
    canvas.__viewWidth = width; canvas.__viewHeight = height; canvas.__dpr = dpr;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function getActiveShip(){ return ships.find(ship=>ship.id === store.state.activeShip) || ships[0]; }
  function clampPlayerToMap(){ clampPlayerToMapSystem({player, map:currentMap}); }
  function isPlayerOutsideMap(){ return worldState.isPlayerOutsideMap(); }
  function updateRadiation(dt, handleDeath){ worldState.updateRadiation(dt, handleDeath); }
  function isSafeModeActive(){ return worldState.isSafeModeActive(); }
  function getCompletedQuestClaims(){ return store.state.completedQuestClaims || {}; }
  function getQuestProgressState(){ return store.state.questProgress || {}; }
  function getPreparedDungeonPortal(map = currentMap){
    const prepared = multiplayer.preparedPortal;
    if(!prepared || !map || String(prepared.mapId || "") !== String(map.id || "")) return null;
    const portalId = String(prepared.portalId || prepared.portal?.id || "");
    if(!portalId) return null;
    return {
      ...prepared,
      portalId,
      dungeonPortal:true,
      prepared:true,
      r:Number(prepared.r || 115),
      safeRadius:Number(prepared.safeRadius || 280),
      activationRadius:Number(prepared.activationRadius || 430),
      label:prepared.label || prepared.portal?.name || "PORTAIL PREPARE",
      displayLabel:prepared.displayLabel || prepared.portal?.name || "PORTAIL PREPARE"
    };
  }

  function getAccessibleMapPortals(map = currentMap){
    const base = getMapPortals(map, {completedQuestClaims:getCompletedQuestClaims(), questProgress:getQuestProgressState()});
    const prepared = getPreparedDungeonPortal(map);
    if(!prepared) return base;
    if(base.some(portal=>
      String(portal.portalId || "") === String(prepared.portalId || "")
      && Math.hypot(Number(portal.x || 0) - Number(prepared.x || 0), Number(portal.y || 0) - Number(prepared.y || 0)) <= 4
    )) return base;
    return [...base, prepared];
  }
  function getLockedMapPortals(map){ return getClosedMapPortals(map, {completedQuestClaims:getCompletedQuestClaims(), questProgress:getQuestProgressState()}); }

  function clearPoison(){
    statusEffects.clearPoison();
    statusEffects.clearSlow();
  }
  function handlePlayerDeath(){
    if(multiplayer.authoritativeSession) return;
    questProgress.recordDeath();
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

  function progressMissionControl(station){
    if(String(station?.id || "") !== "quests" || !currentMap) return false;
    const payload = {type:"mission_control", stationId:"quests", zoneName:currentMap.name};
    if(isMmoConnected(multiplayer)) return progressServerQuest(payload);
    showToast(MMO_REQUIRED_MESSAGE);
    return false;
  }

  function getTutorialSnapshot(target = {}){
    if(!running || !player || !camera || !currentMap) return null;
    const type = String(target.type || "player");
    let point = null;
    if(type === "station"){
      point = worldState.getSpawnStations().find(station=>station.id === target.id) || null;
    }else if(type === "hq"){
      point = currentMap.spawn || null;
    }else if(type === "enemy"){
      const kinds = new Set((target.kinds || []).map(String));
      point = enemies
        .filter(enemy=>enemy.hp > 0 && (!kinds.size || kinds.has(String(enemy.kind || ""))))
        .sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0] || null;
    }else if(type === "map2"){
      const currentMapName = String(currentMap.name || "");
      const currentPrefix = currentMapName.replace(/-\d{2}$/,"");
      const targetMapName = currentPrefix && currentPrefix !== currentMapName ? `${currentPrefix}-02` : "";
      const targetMap = MAPS.find(map=>String(map.name || "") === targetMapName)
        || MAPS.find(map=>String(map.name || "").endsWith("-02"));
      const mapPortals = Array.isArray(currentMap.portals) ? currentMap.portals : currentMap.portal ? [currentMap.portal] : [];
      point = getAccessibleMapPortals().find(portal=>Number(portal.targetMap) === Number(targetMap?.id))
        || mapPortals.find(portal=>Number(portal.targetMap) === Number(targetMap?.id))
        || null;
    }else{
      point = player;
    }
    if(!point) return {mapName:currentMap.name, player:{x:player.x,y:player.y,repairBotActive:Boolean(player.repairBotActive)}, target:null};
    const canvasRect = canvas.getBoundingClientRect();
    const zoom = Number(camera.zoom || 1);
    const playerScreenX = canvasRect.left + (Number(player.x || 0) - camera.x) * zoom;
    const playerScreenY = canvasRect.top + (Number(player.y || 0) - camera.y) * zoom;
    const screenX = canvasRect.left + (Number(point.x || 0) - camera.x) * zoom;
    const screenY = canvasRect.top + (Number(point.y || 0) - camera.y) * zoom;
    return {
      mapName:currentMap.name,
      player:{x:player.x,y:player.y,screenX:playerScreenX,screenY:playerScreenY,repairBotActive:Boolean(player.repairBotActive)},
      target:{
        x:Number(point.x || 0),
        y:Number(point.y || 0),
        screenX,
        screenY,
        distance:Math.hypot(Number(point.x || 0)-player.x, Number(point.y || 0)-player.y),
        kind:String(point.kind || point.id || type)
      },
      canvas:{left:canvasRect.left,top:canvasRect.top,right:canvasRect.right,bottom:canvasRect.bottom}
    };
  }

  function previewTutorialTarget(target = {}, durationMs = 2600){
    const snapshot = getTutorialSnapshot(target);
    if(!snapshot?.target) return false;
    portalCinematic = {
      target:{x:snapshot.target.x, y:snapshot.target.y},
      message:"",
      durationMs:Math.max(1200, Number(durationMs || 2600)),
      startedAt:performance.now()
    };
    return true;
  }

  function formatDuration(ms){
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function loadMap(mapId, x, y, options = {}){
    worldState.loadMap(mapId, x, y, options);
    mapAssetCache.activate(currentMap);
    mapAssetStreaming.reset();
    questProgress.recordMapVisit(currentMap?.name);
  }

  function installDebugCommands(){
    installCombatDebugCommands({
      mapList:MAPS,
      getMapPortals:getAccessibleMapPortals,
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

  function loadPortalArena(portalId, sessionState = null){
    const instance = multiplayer.portalInstance;
    const portal = portals.find(entry=>entry.id === portalId)
      || (instance?.portal?.id === portalId ? instance.portal : null);
    if(!portal) return false;
    const resumeX = Number(sessionState?.x);
    const resumeY = Number(sessionState?.y);
    serverEvents.loadPortalArena({
      portal,
      spawn:{
        ...(multiplayer.coopSpawn || {}),
        ...(Number.isFinite(resumeX) ? {x:resumeX} : {}),
        ...(Number.isFinite(resumeY) ? {y:resumeY} : {})
      },
      wave:Math.max(1, Number(instance?.wave || 1)),
      objective:multiplayer.portalObjective || instance?.objective || null,
      resumed:Boolean(sessionState)
    });
    return true;
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

  function findPortalObjectiveAt(world){
    if(gameMode !== "portal" || activePortal?.id !== "ricky") return null;
    return (portalObjective?.levers || []).find(lever=>
      !lever.active && Math.hypot(Number(lever.x || 0) - world.x, Number(lever.y || 0) - world.y) <= 125
    ) || null;
  }

  function interactPortalObjective(lever){
    if(!lever?.id) return false;
    moveTarget = {x:Number(lever.x || 0), y:Number(lever.y || 0)};
    activateRickyPortalLever(lever.id);
    showToast(`${lever.label || "Balise"} : approche et reste immobile pendant 10 secondes.`);
    return true;
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

  function applyPlayerPoison(effect){
    statusEffects.applyPlayerPoison(effect);
  }

  function applyPlayerSlow(effect){
    statusEffects.applyPlayerSlow(effect);
  }

  function updatePlayerPoison(dt){
    statusEffects.updatePlayerPoison(dt);
  }

  function updatePlayerSlow(dt){
    statusEffects.updatePlayerSlow(dt);
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

  function findRemotePlayerTargetById(playerId){
    return remoteTargets.findRemotePlayerTargetById(playerId);
  }

  function findRemotePlayerAt(world){
    return remoteTargets.findRemotePlayerAt(world);
  }

  function damagePlayer(amount, options = {}){
    if(multiplayer.authoritativeSession && options.serverAuthoritative !== true) return 0;
    logout.cancel("degats recus");
    const hpLost = lifecycle.damage(amount, options);
    if(options.recordQuestHpLoss !== false) questProgress.recordHpLoss(hpLost);
    return hpLost;
  }

  function markAuthoritativeDamageReceived(){
    logout.cancel("degats recus");
    if(!player) return;
    player.secondsSinceDamage = 0;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
  }
  function rewardEnemy(enemy){
    if(multiplayer.authoritativeSession || isServerControlledEnemy(enemy)) return;
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
    mapAssetStreaming.update(dt);
    logout.update(dt);
    questNpcDialogue.update(dt);
    questProgress.update(dt);
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
    timeCombatProfiler("render.scene", ()=>sceneRenderer.draw());
  }
  function updateHud(){
    timeCombatProfiler("hud.updateHud", ()=>hudController.updateHud());
  }

  function updateLootPopup(){
    hudController.updateLootPopup();
  }

  installCombatInputHandlers({
    canvas,
    isRunning:()=>running,
    isMovementLocked:()=>cargo.isMovementLocked?.() || Boolean(portalCinematic),
    isSettingsOpen:()=>settingsController?.isOpen?.() || false,
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
    getAbilityKeybinds:()=>store.state.abilityKeybinds,
    clearSelectedEnemy,
    hasSelectedEnemy:()=>!!selectedEnemy,
    tryUseMapPortal:portalNavigation.tryUseMapPortal,
    selectActionSlot:actions.selectActionSlot,
    getStationAt,
    progressMissionControl,
    findEnemyAt,
    findPortalObjectiveAt,
    interactPortalObjective,
    findRemotePlayerAt,
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
    findQuestNpcAt:questNpcDialogue.findAt,
    interactQuestNpc:questNpcDialogue.interact,
    attackSelectedWithActiveLaser,
    renderSpawnInteractionPanel:panels.renderSpawnInteractionPanel,
    openUtilityPanel:panels.openUtilityPanel,
    toggleBoosterDetail:panels.toggleBoosterDetail,
    selectPortgunMapTarget:panels.selectPortgunMapTarget,
    closeUtilityPanel:panels.closeUtilityPanel,
    inviteGroupMember:panels.inviteGroupMember,
    handleSocialAction:panels.handleSocialAction,
    handleGroupAction:panels.handleGroupAction,
    togglePerfPanelVisibility:panels.togglePerfPanelVisibility,
    selectSocialTab:panels.selectSocialTab,
    selectSocialContact:panels.selectSocialContact,
    selectFirmPanelTab:panels.selectFirmPanelTab,
    fillSocialPlayerName:panels.fillSocialPlayerName,
    trackCombatQuest:panels.trackCombatQuest,
    claimCombatQuest:panels.claimCombatQuest,
    setCombatQuestDetailTab:panels.setCombatQuestDetailTab,
    selectQuestForPanel:panels.selectQuestForPanel,
    selectQuestCategoryForPanel:panels.selectQuestCategoryForPanel,
    selectQuestTypeForPanel:panels.selectQuestTypeForPanel,
    toggleLockedQuestsForPanel:panels.toggleLockedQuestsForPanel,
    selectCraftCategory:panels.selectCraftCategory,
    selectCraftRecipe:panels.selectCraftRecipe,
    setRefineryPanelTab:panels.setRefineryPanelTab,
    openShipRefineRecipe:panels.openShipRefineRecipe,
    closeShipRefineRecipe:panels.closeShipRefineRecipe,
    closeSpawnPanel:panels.closeSpawnPanel,
    updateHud,
    moveActionSlot:actions.moveActionSlot,
    clearActionSlot:actions.clearActionSlot,
    assignExtraToActionSlot:actions.assignExtraToActionSlot,
    assignDroneFormationToActionSlot:actions.assignDroneFormationToActionSlot,
    getDroneFormation,
    activateDroneFormation:actions.activateDroneFormation,
    assignAmmoToActionSlot:actions.assignAmmoToActionSlot,
    selectMissileAmmo:actions.selectMissileAmmo,
    fireMissileLauncher:actions.fireMissileLauncher,
    assignMissileLauncherToActionSlot:actions.assignMissileLauncherToActionSlot,
    renderCombatQuickPanel:actions.renderCombatQuickPanel,
    useCombatExtra:actions.useCombatExtra,
    setCombatPanelTab:actions.setCombatPanelTab,
    shiftCombatPanelTabs:actions.shiftCombatPanelTabs,
    buyCombatAmmo:actions.buyCombatAmmo,
    activateRepairBot,
    useNpcAbility:actions.useNpcAbility,
    useShipAbility:actions.useShipAbility,
    acceptQuest:acceptQuestAction,
    claimQuest:claimQuestAction,
    startCraft:recipeId=>{
      if(isMmoConnected(multiplayer) && startServerCraft?.(recipeId)){
        const recipe = getCraftRecipe(recipeId) || {id:recipeId, name:"recette serveur"};
        return {ok:true, recipe, serverPending:true};
      }
      return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    },
    claimCraft:()=>{
      if(isMmoConnected(multiplayer) && claimServerCraft?.()){
        return {ok:true, serverPending:true};
      }
      return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    },
    startRefineryJob:recipeId=>{
      if(isMmoConnected(multiplayer) && startServerRefineryJob?.(recipeId)){
        const recipe = getRefineryRecipes().find(entry=>entry.id === recipeId) || {id:recipeId, name:"recette serveur"};
        return {ok:true, recipe, serverPending:true};
      }
      return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    },
    claimRefineryJob:()=>{
      if(isMmoConnected(multiplayer) && claimServerRefineryJob?.()){
        return {ok:true, recipe:{name:"raffinage serveur", outputId:"materiau", outputAmount:0}, serverPending:true};
      }
      return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    },
    getShipRefineryRecipeData,
    refineShipCargoRecipe:refineShipCargoRecipeAction,
    depositCombatBoostMaterial:(target, materialId, amount)=>{
      if(isMmoConnected(multiplayer)){
        const sent = depositServerCombatBoostMaterial({target, materialId, amount, shipId:store.state.activeShip});
        return sent ? {ok:true, serverPending:true} : {ok:false, reason:"Connexion serveur indisponible."};
      }
      return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    },
    sellCommerceMaterial:({materialId = "", amount = 0, all = false} = {})=>{
      if(isMmoConnected(multiplayer)){
        const sent = sellServerMaterial({materialId, amount, all, shipId:store.state.activeShip});
        return sent ? {ok:true, serverPending:true} : {ok:false, reason:"Connexion serveur indisponible."};
      }
      return {ok:false, reason:MMO_REQUIRED_MESSAGE};
    },
    upgradeEquipment:upgradeEquipmentAction,
    showToast
  });

  document.getElementById("gameCargoToggle")?.addEventListener("click", e=>{
    e.preventDefault();
    e.stopPropagation();
    if(!running) return;
    combatCargoExpanded = !combatCargoExpanded;
    updateHud();
  });
  window.addEventListener("voidsector:multiplayer-change", logout.handleServerChange);
  window.addEventListener("voidsector:inventory-updated", ()=>{
    if(!running) return;
    actions.updateGameActionBar();
    actions.renderCombatQuickPanel();
    updateHud();
  });
  window.addEventListener("voidsector:profile-applied", event=>{
    if(!running) return;
    if(event.detail?.uiChanges?.actionBarChanged !== false){
      actions.updateGameActionBar();
      actions.renderCombatQuickPanel();
    }
    if(event.detail?.uiChanges?.panelsChanged && panels.getSpawnPanelMode()){
      panels.renderSpawnInteractionPanel(panels.getSpawnPanelMode());
    }
    updateHud();
  });
  document.addEventListener("visibilitychange", ()=>{
    if(document.visibilityState === "hidden" && running && player) update(0.001);
    if(document.visibilityState === "visible") logout.update(0);
  });

  return {
    start:(...args)=>{
      settingsRuntime.applySettings({syncChat:true});
      return session.start(...args);
    },
    stop:session.stop,
    requestLogout:logout.request,
    resumeWorldSession:session.resumeWorldSession,
    refreshActiveLoadout:session.refreshActiveLoadout,
    getTutorialSnapshot,
    previewTutorialTarget,
    closeTutorialInteractionPanel:()=>panels.closeSpawnPanel(),
    updateHud,
    get running(){return running;}
  };
}
