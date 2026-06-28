export function createGameConnectionRecoveryController({
  appMode,
  multiplayer,
  isGameRunning,
  suspendGame,
  resumeGame,
  reconnect,
  getAuthToken,
  disconnect,
  windowRef = window,
  networkGraceMs = 750,
  setTimeoutRef = setTimeout,
  clearTimeoutRef = clearTimeout
}){
  const root = document.getElementById("gameDisconnectOverlay");
  const status = document.getElementById("gameDisconnectStatus");
  const reconnectButton = document.getElementById("gameReconnectBtn");
  const closeButton = document.getElementById("gameCloseBtn");
  let active = false;
  let closing = false;
  let pageUnloading = false;
  let pendingNetworkTimer = null;

  function cancelPendingNetworkRecovery(){
    if(pendingNetworkTimer === null) return;
    clearTimeoutRef(pendingNetworkTimer);
    pendingNetworkTimer = null;
  }

  function markPageUnloading(){
    pageUnloading = true;
    cancelPendingNetworkRecovery();
  }

  windowRef.addEventListener("beforeunload", markPageUnloading, {capture:true});
  windowRef.addEventListener("pagehide", markPageUnloading, {capture:true});
  windowRef.addEventListener("pageshow", ()=>{
    pageUnloading = false;
  });

  function setStatus(message, tone = ""){
    if(!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function hasToken(){
    return Boolean(String(getAuthToken?.() || ""));
  }

  function refreshReconnectState(){
    if(!active || closing || !reconnectButton) return;
    const available = hasToken();
    reconnectButton.disabled = !available;
    reconnectButton.textContent = available ? "RECONNECTER" : "CONNEXION REQUISE";
    setStatus(
      available
        ? "Une session est disponible. Reconnecte-toi pour reprendre exactement le même vaisseau."
        : "Reconnecte ton compte dans le launcher, puis reviens ici.",
      available ? "ready" : "warning"
    );
  }

  function show(source = "network"){
    if(appMode !== "game" || !root || closing || pageUnloading) return;
    cancelPendingNetworkRecovery();
    active = true;
    document.body.classList.remove("app-booting");
    document.body.classList.add("game-disconnect-active");
    suspendGame?.();
    root.classList.remove("hidden");
    root.setAttribute("aria-hidden", "false");
    root.dataset.source = source;
    refreshReconnectState();
  }

  function hide(){
    document.body.classList.remove("game-disconnect-active");
    if(!root) return;
    cancelPendingNetworkRecovery();
    active = false;
    root.classList.add("hidden");
    root.setAttribute("aria-hidden", "true");
    reconnectButton?.removeAttribute("disabled");
  }

  function scheduleNetworkRecovery(message = "Connexion au serveur impossible. Réessaie dans quelques instants."){
    if(appMode !== "game" || closing || pageUnloading) return;
    if(active){
      setStatus(message, "error");
      return;
    }
    if(!isGameRunning?.() || pendingNetworkTimer !== null) return;
    pendingNetworkTimer = setTimeoutRef(()=>{
      pendingNetworkTimer = null;
      if(closing || pageUnloading || multiplayer.connected || !isGameRunning?.()) return;
      show("network");
      if(active) setStatus(message, "error");
    }, Math.max(0, Number(networkGraceMs) || 0));
  }

  function handleChange(event){
    if(appMode !== "game" || pageUnloading) return;
    const reason = String(event.detail?.reason || "");
    const intent = String(event.detail?.payload?.intent || "");
    if(!isGameRunning?.() && !active && hasToken()){
      if(reason === "auth:error" || reason === "auth:required" || reason === "auth:logout" || reason === "auth:external-logout" || reason === "auth:replaced" || reason === "auth:banned" || reason === "connection:error" || reason === "connection:disconnect"){
        return;
      }
    }
    if(reason === "connection" || reason === "server:ready"){
      cancelPendingNetworkRecovery();
      return;
    }
    if(reason === "auth:external-token"){
      refreshReconnectState();
      return;
    }
    if(reason === "auth:replaced"){
      show("account");
      setStatus("Ce compte a ete connecte ailleurs. Cette session de jeu a ete fermee.", "warning");
      return;
    }
    if(reason === "auth:banned"){
      show("account");
      setStatus("Compte banni temporairement. Reconnexion impossible avec ce token.", "error");
      return;
    }
    if(reason === "auth:logout" || reason === "auth:external-logout"){
      show("account");
      return;
    }
    if(reason === "session:afk-disconnect"){
      show("afk");
      setStatus("Déconnecté après 10 minutes d’inactivité. Tu peux reprendre immédiatement avec le même vaisseau.", "warning");
      return;
    }
    if(reason === "connection:disconnect"){
      if(["game-logout", "close-game-tab", "afk-timeout", "session-replaced"].includes(intent)) return;
      if(intent.includes("logout")) show("account");
      else scheduleNetworkRecovery();
      return;
    }
    if(reason === "auth:required" && hasToken() && !multiplayer.auth?.profileReady){
      return;
    }
    if(reason === "auth:error" || reason === "auth:required"){
      if(!active) show("account");
      setStatus(multiplayer.auth?.error || "Reconnexion impossible. Vérifie le launcher et réessaie.", "error");
      if(reconnectButton) reconnectButton.disabled = !hasToken();
      return;
    }
    if(reason === "connection:error"){
      scheduleNetworkRecovery();
      return;
    }else if(reason === "auth:success"){
      cancelPendingNetworkRecovery();
      setStatus("Compte reconnu. Récupération du vaisseau en cours…", "pending");
    }
  }

  function handleProfileSync(){
    cancelPendingNetworkRecovery();
    if(!active || !multiplayer.auth?.account || !multiplayer.auth?.profileReady) return;
    setStatus("Session récupérée.", "ready");
    setTimeout(()=>{
      resumeGame?.();
      hide();
    }, 0);
  }

  reconnectButton?.addEventListener("click", ()=>{
    if(closing) return;
    if(!hasToken()){
      refreshReconnectState();
      return;
    }
    reconnectButton.disabled = true;
    setStatus("Reconnexion au serveur et récupération du vaisseau…", "pending");
    if(!reconnect?.()) refreshReconnectState();
  });

  closeButton?.addEventListener("click", ()=>{
    if(closing) return;
    closing = true;
    reconnectButton?.setAttribute("disabled", "");
    closeButton.setAttribute("disabled", "");
    setStatus("Fermeture de l’onglet…", "pending");
    disconnect?.("close-game-tab");
    windowRef.close();
    setTimeout(()=>{
      if(windowRef.closed) return;
      setStatus("Le navigateur a bloqué la fermeture automatique. Tu peux fermer cet onglet.", "warning");
    }, 250);
  });

  return {
    handleChange,
    handleProfileSync,
    hide,
    isActive:()=>active,
    show
  };
}
