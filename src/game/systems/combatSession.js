import { applyCombatStatFields, createCombatPlayer, DEFAULT_COMBAT_EXTRA_BONUS } from "./combatPlayerStats.js";
import { getFirmHomeMapName } from "../../data/firms.js";

export function createCombatSessionController({
  store,
  mapList,
  radarRange,
  getRunning,
  setRunning,
  getState,
  setState,
  getShipCombatStats,
  getCanvasViewWidth,
  getCanvasViewHeight,
  preload,
  resize,
  resetPerfMetrics,
  applyMiniMapLayout,
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
  closeQuestNpcDialogue,
  clearPoison,
  saveState,
  renderAll,
  showToast
}){
  let deathRespawnHandlersInstalled = false;

  function installDeathRespawnHandlers(){
    if(deathRespawnHandlersInstalled) return;
    document.getElementById("deathRespawnPanel")?.addEventListener("click", event=>{
      const button = event.target.closest("[data-respawn-choice]");
      if(button) chooseDeathRespawn(button.dataset.respawnChoice);
    });
    deathRespawnHandlersInstalled = true;
  }

  function resumeWorldSession(session = {}){
    if(!getRunning() || !session) return false;
    const rawMapId = session.mapId ?? 0;
    const mapId = Number.isFinite(Number(rawMapId)) ? Number(rawMapId) : rawMapId;
    const portalId = String(rawMapId).startsWith("portal-")
      ? String(rawMapId).slice("portal-".length)
      : "";
    const x = Number(session.x);
    const y = Number(session.y);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const stateBeforeCorrection = getState();
    const isSameMapCorrection = String(session.source || "") === "state-correction"
      && String(stateBeforeCorrection.currentMap?.id ?? "") === String(mapId);
    if(isSameMapCorrection){
      stateBeforeCorrection.player.x = x;
      stateBeforeCorrection.player.y = y;
      stateBeforeCorrection.player.vx = Number(session.vx || 0);
      stateBeforeCorrection.player.vy = Number(session.vy || 0);
    }else if(portalId){
      if(loadPortalArena(portalId, {...session, x, y}) === false) return false;
    }else{
      loadMap(mapId, x, y, {safeNow:true});
    }
    const {player} = getState();
    const sessionShipId = String(session.shipId || store.state.activeShip || player.shipId || "");
    player.angle = Number(session.angle || player.angle || 0);
    const shipChanged = String(session.source || "") === "ship-change";
    if(shipChanged && sessionShipId){
      store.state.activeShip = sessionShipId;
      store.state.selectedShip = sessionShipId;
    }
    const stats = shipChanged ? getShipCombatStats(sessionShipId || store.state.activeShip) : null;
    const maxHp = Math.max(1, Number(shipChanged ? stats?.vie : (session.maxHp || player.maxHp || 1)));
    const maxShield = Math.max(0, Number(shipChanged ? stats?.bouclier : (session.maxShield || player.maxShield || 0)));
    player.shipId = sessionShipId;
    player.maxHp = maxHp;
    player.hp = Math.max(isSameMapCorrection ? 0 : 1, Math.min(maxHp, Number(session.hp ?? maxHp)));
    player.maxShield = maxShield;
    player.shield = Math.max(0, Math.min(maxShield, Number(session.shield ?? maxShield)));
    if("repairBotActive" in session) player.repairBotActive = Boolean(session.repairBotActive);
    if(shipChanged && stats) applyCombatStatFields(player, stats);
    if(!isSameMapCorrection){
      player.isDead = false;
      player.secondsSinceDamage = 999;
    }
    updateHud();
    if(String(session.source || "") !== "state-correction") showToast("Position de jeu reprise depuis le serveur.");
    return true;
  }

  function refreshActiveLoadout(){
    const {player} = getState();
    if(!getRunning() || !player) return false;
    const activeShipId = String(store.state.activeShip || "");
    const savedSession = store.state.shipWorldSessions?.[activeShipId]
      || (String(store.state.worldSession?.shipId || "") === String(activeShipId) ? store.state.worldSession : null);
    const sameShip = String(player.shipId || "") === activeShipId;
    const stats = getShipCombatStats(store.state.activeShip);
    player.maxHp = Math.max(1, Number(stats.vie || player.maxHp || 1));
    player.maxShield = Math.max(0, Number(stats.bouclier || 0));
    if(sameShip){
      player.hp = Math.max(0, Math.min(player.maxHp, Number(player.hp || 0)));
      player.shield = Math.max(0, Math.min(player.maxShield, Number(player.shield || 0)));
    }else{
      player.hp = Math.max(0, Math.min(player.maxHp, Number(savedSession?.hp ?? player.maxHp)));
      player.shield = Math.max(0, Math.min(player.maxShield, Number(savedSession?.shield ?? player.maxShield)));
    }
    player.shipId = activeShipId;
    applyCombatStatFields(player, stats, DEFAULT_COMBAT_EXTRA_BONUS);
    if(!player.extraBonus.repairBot){
      player.repairBotActive = false;
      player.repairBotTickTimer = 0;
    }
    if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
    if(!Array.isArray(store.state.actionSlotsByShip[activeShipId])) store.state.actionSlotsByShip[activeShipId] = Array(9).fill(null);
    store.state.actionSlots = Array.from({length:9}, (_,index)=>store.state.actionSlotsByShip[activeShipId][index] || null);
    actions.cleanCombatActionSlots();
    actions.renderGameActionBar();
    actions.renderCombatQuickPanel();
    updateHud();
    return true;
  }

  function start(entry = "open"){
    if(getRunning()) return;
    preload();
    resize();
    resetPerfMetrics();
    applyMiniMapLayout(store.state?.uiLayout?.miniMap);
    setRunning(true);
    logout.reset();
    installDebugCommands();
    document.getElementById("dashboard").classList.add("hidden");
    document.getElementById("gameScreen").classList.remove("hidden");
    deathRespawn.setPanelVisible(false);
    installDeathRespawnHandlers();
    const stats = getShipCombatStats(store.state.activeShip);
    if(!Array.isArray(store.state.actionSlots)) store.state.actionSlots = Array(9).fill(null);
    const activeShipId = String(store.state.activeShip || "");
    if(!store.state.actionSlotsByShip || typeof store.state.actionSlotsByShip !== "object") store.state.actionSlotsByShip = {};
    if(!Array.isArray(store.state.actionSlotsByShip[activeShipId])) store.state.actionSlotsByShip[activeShipId] = Array(9).fill(null);
    store.state.actionSlots = Array.from({length:9}, (_,index)=>store.state.actionSlotsByShip[activeShipId][index] || null);
    const player = createCombatPlayer(stats, radarRange);
    player.shipId = String(store.state.activeShip || "");
    const camera = {x:-getCanvasViewWidth()/2, y:-getCanvasViewHeight()/2, zoom:1};
    const mouse = {x:getCanvasViewWidth()/2, y:getCanvasViewHeight()/2};
    getState().missileSalvos.clear();
    beams.clear();
    cargo.clear();
    setState({
      player,
      camera,
      mouse,
      bullets:[],
      particles:[],
      impactEffects:[],
      damageTexts:[],
      selectedEnemy:null,
      moveTarget:null,
      hudT:0
    });
    actions.cleanCombatActionSlots();
    actions.reset();
    panels.reset();
    rewards.reset();
    if(typeof entry === "string" && entry.startsWith("portal:")) loadPortalArena(entry.split(":")[1] || "blue");
    else{
      const homeMapName = getFirmHomeMapName(store.state.player?.firmId || "astra");
      const homeMap = mapList.find(map=>String(map.name || "").toUpperCase() === String(homeMapName || "").toUpperCase()) || mapList[0];
      loadMap(homeMap.id, homeMap.spawn.x, homeMap.spawn.y);
    }
    actions.renderGameActionBar();
    actions.renderCombatQuickPanel();
    updateHud();
    frameLoop.start();
  }

  function stop(save = true){
    if(!getRunning()) return;
    setRunning(false);
    logout.reset();
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("combatQuickPanel").classList.add("hidden");
    deathRespawn.setPanelVisible(false);
    closeQuestNpcDialogue();
    clearPoison();
    panels.closeUtilityPanel({persist:false});
    panels.closeSpawnPanel({persist:false});
    const {gameMode, activePortal, portalCompleted, portalLives, player} = getState();
    if(gameMode === "portal" && activePortal && !portalCompleted && portalLives > 0){
      if(!store.state.portalRuns) store.state.portalRuns = {};
      store.state.portalRuns[activePortal.id] = {lives:portalLives, status:player?.isDead ? "dead" : "active"};
    }
    if(save){
      saveState();
      renderAll();
      showToast("Retour launcher.");
    }
  }

  return {start, stop, resumeWorldSession, refreshActiveLoadout};
}
