import { applyCombatStatFields, createCombatPlayer, DEFAULT_COMBAT_EXTRA_BONUS } from "./combatPlayerStats.js";

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
    const x = Number(session.x);
    const y = Number(session.y);
    if(!Number.isFinite(x) || !Number.isFinite(y)) return false;
    loadMap(mapId, x, y, {safeNow:true});
    const {player} = getState();
    player.angle = Number(session.angle || player.angle || 0);
    const shipChanged = String(session.source || "") === "ship-change";
    const stats = shipChanged ? getShipCombatStats(store.state.activeShip) : null;
    const maxHp = Math.max(1, Number(shipChanged ? stats?.vie : (session.maxHp || player.maxHp || 1)));
    const maxShield = Math.max(0, Number(shipChanged ? stats?.bouclier : (session.maxShield || player.maxShield || 0)));
    player.maxHp = maxHp;
    player.hp = Math.max(1, Math.min(maxHp, Number(shipChanged ? maxHp : (session.hp || maxHp))));
    player.maxShield = maxShield;
    player.shield = Math.max(0, Math.min(maxShield, Number(shipChanged ? maxShield : (session.shield || 0))));
    if(shipChanged && stats) applyCombatStatFields(player, stats);
    player.isDead = false;
    player.secondsSinceDamage = 999;
    updateHud();
    showToast("Position de jeu reprise depuis le serveur.");
    return true;
  }

  function refreshActiveLoadout(){
    const {player} = getState();
    if(!getRunning() || !player) return false;
    const stats = getShipCombatStats(store.state.activeShip);
    const previousHpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    const previousShieldRatio = player.maxShield > 0 ? player.shield / player.maxShield : 0;
    player.maxHp = Math.max(1, Number(stats.vie || player.maxHp || 1));
    player.hp = Math.max(1, Math.min(player.maxHp, Math.round(player.maxHp * previousHpRatio)));
    player.maxShield = Math.max(0, Number(stats.bouclier || 0));
    player.shield = Math.max(0, Math.min(player.maxShield, Math.round(player.maxShield * previousShieldRatio)));
    applyCombatStatFields(player, stats, DEFAULT_COMBAT_EXTRA_BONUS);
    if(!player.extraBonus.repairBot){
      player.repairBotActive = false;
      player.repairBotTickTimer = 0;
    }
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
    const player = createCombatPlayer(stats, radarRange);
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
    else loadMap(0, mapList[0].spawn.x, mapList[0].spawn.y);
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
    panels.closeUtilityPanel();
    panels.closeSpawnPanel();
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
