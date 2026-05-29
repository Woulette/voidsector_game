export function createCombatDeathRespawnSystem({
  mapList,
  store,
  canAfford,
  spend,
  saveState,
  getState,
  setState,
  clearPoison,
  getNearestPortal,
  loadMap,
  setTeleportLock,
  showToast,
  updateHud,
  portalStartingLives
}){
  function renderPanelContent(){
    const {deathState, portalLives} = getState();
    const panel = document.getElementById("deathRespawnPanel");
    if(!panel) return;
    const head = panel.querySelector(".death-respawn-head");
    const actions = panel.querySelector(".death-respawn-actions");
    if(!head || !actions) return;
    if(deathState?.gameMode === "portal"){
      head.innerHTML = `<span>Vie de portail perdue</span><strong>${Math.max(0, portalLives)} / ${portalStartingLives} vies restantes</strong>`;
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

  function setPanelVisible(visible){
    if(visible) renderPanelContent();
    document.getElementById("deathRespawnPanel")?.classList.toggle("hidden", !visible);
  }

  function resetCombatPosition({x, y, hpRatio}){
    const {player, activePortal, portalLives, missileSalvos, beams, cargo} = getState();
    player.x = x;
    player.y = y;
    player.vx = 0;
    player.vy = 0;
    player.isDead = false;
    clearPoison();
    player.hp = Math.max(1, Math.round(player.maxHp * hpRatio));
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    missileSalvos.clear();
    beams.clear();
    cargo.clear();
    setTeleportLock(1.6);
    if(activePortal){
      if(!store.state.portalRuns) store.state.portalRuns = {};
      store.state.portalRuns[activePortal.id] = {lives:portalLives, status:"active"};
    }
    setState({
      moveTarget:null,
      selectedEnemy:null,
      bullets:[],
      impactEffects:[],
      deathState:null
    });
    setPanelVisible(false);
  }

  function finishRespawn({mapId, x, y, message}){
    const {currentMap, gameMode} = getState();
    const map = mapList.find(entry=>entry.id === mapId) || mapList[0];
    if(currentMap.id !== map.id || gameMode !== "open") loadMap(map.id, x, y);
    else resetCombatPosition({x, y, hpRatio:.2});
    const {player} = getState();
    player.isDead = false;
    clearPoison();
    player.hp = Math.max(1, Math.round(player.maxHp * 0.2));
    player.shield = player.maxShield;
    player.secondsSinceDamage = 999;
    player.repairBotActive = false;
    player.repairBotTickTimer = 0;
    setState({deathState:null});
    setPanelVisible(false);
    showToast(message);
    updateHud();
  }

  function finishPortalRespawn(){
    const {deathState, player} = getState();
    if(!deathState || deathState.gameMode !== "portal") return;
    resetCombatPosition({x:deathState.x, y:deathState.y, hpRatio:.5});
    showToast("Retour dans le portail.");
    updateHud();
  }

  function failPortalRun(){
    const {activePortal, player} = getState();
    const failedName = activePortal?.name || "Portail";
    const failedId = activePortal?.id;
    setState({
      deathState:null,
      activePortal:null,
      portalWave:0,
      portalDelay:0,
      portalCompleted:false,
      portalLives:0
    });
    setPanelVisible(false);
    if(failedId && store.state.portalRuns) delete store.state.portalRuns[failedId];
    player.isDead = false;
    clearPoison();
    const map = mapList[0];
    loadMap(map.id, map.spawn.x, map.spawn.y);
    player.hp = Math.max(1, Math.round(player.maxHp * 0.2));
    player.shield = player.maxShield;
    showToast(`${failedName} ferme : 3 vies perdues.`);
    updateHud();
  }

  function handlePlayerDeath(){
    const state = getState();
    const {player, gameMode, activePortal, currentMap} = state;
    if(!player || player.isDead) return;
    let portalLives = state.portalLives;
    if(gameMode === "portal") portalLives = Math.max(0, Number(portalLives ?? portalStartingLives) - 1);
    if(gameMode === "portal" && activePortal){
      if(!store.state.portalRuns) store.state.portalRuns = {};
      store.state.portalRuns[activePortal.id] = {lives:portalLives, status:"dead"};
      saveState();
    }
    const portal = getNearestPortal();
    player.isDead = true;
    player.hp = 0;
    player.vx = 0;
    player.vy = 0;
    clearPoison();
    setState({
      portalLives,
      deathState:{
        mapId:gameMode === "open" ? currentMap.id : 0,
        gameMode,
        x:player.x,
        y:player.y,
        portal:portal ? {x:portal.x, y:portal.y} : null
      },
      moveTarget:null,
      mouseMoveHeld:false,
      bullets:state.bullets.filter(bullet=>bullet.owner !== "enemy")
    });
    if(gameMode === "portal" && portalLives <= 0){
      failPortalRun();
      return;
    }
    setPanelVisible(true);
    showToast("Vaisseau détruit.");
    saveState();
    updateHud();
  }

  function chooseRespawn(choice){
    const {deathState, player} = getState();
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
      const map = mapList.find(entry=>entry.id === deathState.mapId) || mapList[0];
      const point = deathState.portal || map.spawn;
      finishRespawn({mapId:map.id, x:point.x, y:point.y, message:"Respawn au portail le plus proche."});
    }else if(choice === "death"){
      if(!canAfford("premium", 200)) return showToast("Pas assez de NOVA.");
      spend("premium", 200);
      finishRespawn({mapId:deathState.mapId, x:deathState.x, y:deathState.y, message:"Respawn à la position de destruction."});
    }else{
      const map = mapList[0];
      finishRespawn({mapId:map.id, x:map.spawn.x, y:map.spawn.y, message:"Respawn gratuit sur ASTRA-01."});
    }
    saveState();
  }

  return {
    setPanelVisible,
    handlePlayerDeath,
    chooseRespawn,
    failPortalRun
  };
}
