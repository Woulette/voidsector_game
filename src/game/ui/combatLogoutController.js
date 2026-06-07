export function createCombatLogoutController({
  multiplayer,
  requestServerLogout,
  disconnectMultiplayer,
  getRunning,
  setRunning,
  getPlayer,
  getPortalTransition,
  getTeleportLock,
  getMouseMoveHeld,
  getMoveTarget,
  getSelectedEnemy,
  getEnemies,
  saveState,
  closeNpcDialogue,
  clearPoison,
  closeUtilityPanel,
  closeSpawnPanel,
  showToast
}){
  let logoutRequest = null;

  function getLogoutButton(){
    return document.getElementById("returnDashboardBtn");
  }

  function setButtonLabel(label, pending = false){
    const button = getLogoutButton();
    if(!button) return;
    button.textContent = label;
    button.classList.toggle("danger", pending);
  }

  function getBlockReason(){
    const player = getPlayer();
    if(!player || player.isDead) return "vaisseau detruit";
    if(getPortalTransition() || getTeleportLock() > 0) return "transfert en cours";
    if(getMouseMoveHeld() || getMoveTarget()) return "deplacement en cours";
    if(Math.hypot(Number(player.vx || 0), Number(player.vy || 0)) > 8) return "vaisseau en mouvement";
    if(Number(player.secondsSinceDamage || 999) < 15) return "degats recents";
    if(Number(player.lastAggression || 0) > 0 && performance.now() - Number(player.lastAggression || 0) < 15000) return "combat recent";
    const selectedEnemy = getSelectedEnemy();
    if(selectedEnemy && selectedEnemy.hp > 0) return "cible verrouillee";
    const nearbyAggro = (getEnemies() || []).some(enemy=>enemy?.hp > 0 && enemy.aggro && Math.hypot(enemy.x - player.x, enemy.y - player.y) < 900);
    if(nearbyAggro) return "ennemi engage";
    return "";
  }

  function reset(){
    logoutRequest = null;
    setButtonLabel("DECONNEXION");
  }

  function cancel(reason = "deconnexion annulee"){
    if(!logoutRequest) return;
    reset();
    showToast(`Deconnexion annulee : ${reason}.`);
  }

  function complete(){
    reset();
    saveState();
    disconnectMultiplayer();
    setRunning(false);
    document.getElementById("gameScreen").classList.add("hidden");
    document.getElementById("combatQuickPanel").classList.add("hidden");
    closeNpcDialogue();
    clearPoison();
    closeUtilityPanel({persist:false});
    closeSpawnPanel({persist:false});
    showToast("Session de jeu deconnectee.");
    setTimeout(()=>{
      window.close();
      document.body.innerHTML = `<section class="dashboard"><div class="panel frame" style="max-width:520px;margin:16vh auto;padding:24px"><div class="panel-head"><div><span class="tiny">SESSION</span><h2>Deconnecte</h2></div></div><p class="settings-help">Tu peux fermer cet onglet. Le launcher reste ouvert.</p></div></section>`;
    }, 250);
  }

  function request(){
    if(!getRunning()) return;
    const reason = getBlockReason();
    if(reason){
      showToast(`Deconnexion impossible : ${reason}.`);
      return;
    }
    if(multiplayer.connected && requestServerLogout()){
      showToast("Demande de deconnexion envoyee au serveur.");
      return;
    }
    logoutRequest = {remaining:15, completeAt:Date.now() + 15000, server:false};
    setButtonLabel("DECO 15S", true);
    showToast("Deconnexion dans 15 secondes. Reste immobile et hors combat.");
  }

  function handleServerChange(event){
    const reason = String(event.detail?.reason || "");
    const payload = event.detail?.payload || {};
    if(!getRunning() && reason !== "logout:complete") return;
    if(reason === "logout:started"){
      const remainingMs = Math.max(0, Number(payload.delayMs || 15000));
      logoutRequest = {
        remaining:remainingMs / 1000,
        completeAt:Date.now() + remainingMs,
        server:true
      };
      setButtonLabel(`DECO ${Math.ceil(logoutRequest.remaining)}S`, true);
      showToast("Deconnexion serveur dans 15 secondes. Reste immobile et hors combat.");
      return;
    }
    if(reason === "logout:rejected"){
      reset();
      showToast(`Deconnexion refusee par le serveur : ${payload.reason || "condition invalide"}.`);
      return;
    }
    if(reason === "logout:cancelled"){
      cancel(payload.reason || "serveur");
      return;
    }
    if(reason === "logout:complete") complete();
  }

  function update(dt){
    if(!logoutRequest) return;
    const reason = getBlockReason();
    if(reason){
      cancel(reason);
      return;
    }
    if(Number(logoutRequest.completeAt || 0) > 0){
      logoutRequest.remaining = Math.max(0, (Number(logoutRequest.completeAt) - Date.now()) / 1000);
    }else{
      logoutRequest.remaining = Math.max(0, Number(logoutRequest.remaining || 0) - dt);
    }
    setButtonLabel(`DECO ${Math.ceil(logoutRequest.remaining)}S`, true);
    if(logoutRequest.remaining <= 0 && !logoutRequest.server) complete();
  }

  return {
    cancel,
    handleServerChange,
    request,
    reset,
    update
  };
}
