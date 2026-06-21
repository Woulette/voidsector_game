import { getFirmHomeMapName } from "../../data/firms.js";
import { basePriceLabel, hasCurrencyDiscount, priceLabel } from "../../core/store.js";

export function getPortalRespawnActionCopy(deathState = {}){
  const isDeadly = String(deathState.mapId || "") === "portal-ricky";
  return {
    label:"Continuer",
    detail:isDeadly ? "Point d'entrée - 100% PV" : "Position de mort - 50% PV"
  };
}

export function createCombatDeathRespawnSystem({
  mapList,
  store,
  getState,
  setState,
  clearPoison,
  getNearestPortal,
  loadMap,
  setTeleportLock,
  showToast,
  updateHud,
  portalStartingLives,
  multiplayer = null,
  requestServerRespawn = null
}){
  function getHomeMap(){
    const homeMapName = getFirmHomeMapName(store.state.player?.firmId || "astra");
    return mapList.find(map=>String(map.name || "").toUpperCase() === String(homeMapName || "").toUpperCase()) || mapList[0];
  }

  function novaCostHtml(cost){
    const current = `<strong class="shop-price premium">${priceLabel("premium", cost)}</strong>`;
    if(!hasCurrencyDiscount("premium", cost)) return current;
    return `<span class="shop-price-discount"><s>${basePriceLabel("premium", cost)}</s>${current}</span>`;
  }

  function renderPanelContent(){
    const {deathState, portalLives} = getState();
    const panel = document.getElementById("deathRespawnPanel");
    if(!panel) return;
    const head = panel.querySelector(".death-respawn-head");
    const actions = panel.querySelector(".death-respawn-actions");
    if(!head || !actions) return;
    if(deathState?.gameMode === "portal"){
      const continueCopy = getPortalRespawnActionCopy(deathState);
      head.innerHTML = `<span>Vie de portail perdue</span><strong>${Math.max(0, portalLives)} / ${portalStartingLives} vies restantes</strong>`;
      actions.innerHTML = `
        <button data-respawn-choice="portal-resume" type="button">${continueCopy.label}<br><small>${continueCopy.detail}</small></button>
        <button data-respawn-choice="spawn" type="button">Abandonner<br><small>Retour ${getHomeMap().name}</small></button>
      `;
      return;
    }
    head.innerHTML = `<span>Vaisseau detruit</span><strong>Choisir un point de retour</strong>`;
    actions.innerHTML = `
      <button data-respawn-choice="spawn" type="button">${getHomeMap().name}<br><small>Gratuit - 20% PV</small></button>
      <button data-respawn-choice="portal" type="button">Portail proche<br><small>${novaCostHtml(100)}</small></button>
      <button data-respawn-choice="death" type="button">Position actuelle<br><small>${novaCostHtml(200)}</small></button>
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
    const map = getHomeMap();
    loadMap(map.id, map.spawn.x, map.spawn.y);
    player.hp = Math.max(1, Math.round(player.maxHp * 0.2));
    player.shield = player.maxShield;
    showToast(`${failedName} ferme : 3 vies perdues.`);
    updateHud();
  }

  function handlePlayerDeath(){
    return false;
  }

  function chooseRespawn(choice){
    const {deathState, player} = getState();
    if(!deathState || !player?.isDead) return;
    if(multiplayer?.authoritativeSession && deathState.serverAuthoritative){
      requestServerRespawn?.(choice);
      return;
    }
    showToast("Connexion serveur requise pour respawn.");
  }

  function applyServerDeath(event = {}){
    const state = getState();
    const {player} = state;
    if(!player) return false;
    player.isDead = true;
    player.hp = 0;
    player.vx = 0;
    player.vy = 0;
    player.enginePower = 0;
    clearPoison();
    setState({
      portalLives:Number.isFinite(Number(event.portalLives)) ? Math.max(0, Number(event.portalLives)) : state.portalLives,
      deathState:{...event, serverAuthoritative:true},
      moveTarget:null,
      mouseMoveHeld:false,
      selectedEnemy:null,
      bullets:state.bullets.filter(bullet=>bullet.owner !== "enemy")
    });
    setPanelVisible(Array.isArray(event.choices) && event.choices.length > 0);
    showToast(event.reason === "radiation" ? "Vaisseau detruit par la zone irradiee." : "Vaisseau detruit.");
    updateHud();
    return true;
  }

  function applyServerRespawn(event = {}){
    const session = event.session;
    const {player, currentMap, gameMode} = getState();
    if(!player || !session) return false;
    const rawMapId = session.mapId ?? currentMap?.id;
    const mapId = Number.isFinite(Number(rawMapId)) ? Number(rawMapId) : rawMapId;
    const samePortal = gameMode === "portal" && String(currentMap?.id ?? "") === String(rawMapId);
    if(samePortal){
      resetCombatPosition({x:Number(session.x || 0), y:Number(session.y || 0), hpRatio:.5});
    }else{
      loadMap(mapId, Number(session.x || 0), Number(session.y || 0), {safeNow:true});
    }
    const next = getState().player;
    next.maxHp = Math.max(1, Number(session.maxHp || next.maxHp || 1));
    next.hp = Math.max(1, Math.min(next.maxHp, Number(session.hp || next.hp || 1)));
    next.maxShield = Math.max(0, Number(session.maxShield || next.maxShield || 0));
    next.shield = Math.max(0, Math.min(next.maxShield, Number(session.shield ?? next.shield ?? 0)));
    next.isDead = false;
    setState({deathState:null});
    setPanelVisible(false);
    showToast(event.message || "Respawn valide par le serveur.");
    updateHud();
    return true;
  }

  return {
    setPanelVisible,
    handlePlayerDeath,
    chooseRespawn,
    failPortalRun,
    applyServerDeath,
    applyServerRespawn
  };
}
