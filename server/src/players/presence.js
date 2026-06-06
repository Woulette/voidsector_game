export function createPresenceManager({io, players, emitPlayers, config, onPlayerRemove = null}){
  const logoutDelayMs = Number(config.logoutDelayMs || 15000);
  const combatRecentMs = Number(config.combatRecentMs || 15000);
  const disconnectCombatGraceMs = Number(config.disconnectCombatGraceMs || combatRecentMs);
  const logoutMoveSpeed = Number(config.logoutMoveSpeed || 8);

  function createPlayer(socketId){
    return {
      id:socketId,
      name:"Pilote",
      accountId:null,
      account:null,
      clientId:null,
      clientMode:"launcher",
      sessionExpiresAt:null,
      groupId:null,
      mapId:"0",
      mapRoom:null,
      state:null,
      connectedAt:Date.now(),
      connected:true,
      disconnecting:false,
      logoutPending:null,
      gracefulLogout:false,
      lastCombatAt:0,
      lastCombatReason:"",
      removeAt:0
    };
  }

  function markCombat(player, reason = "combat"){
    if(!player) return;
    player.lastCombatAt = Date.now();
    player.lastCombatReason = reason;
    cancelLogout(player, reason);
  }

  function isRecentlyInCombat(player, now = Date.now()){
    return Number(player?.lastCombatAt || 0) > 0 && now - Number(player.lastCombatAt || 0) < combatRecentMs;
  }

  function isActiveForWorld(player, now = Date.now()){
    return Boolean(player?.state) && (player.connected !== false || isRecentlyInCombat(player, now));
  }

  function getLogoutBlockReason(player, now = Date.now()){
    if(!player?.state) return "aucun vaisseau actif";
    if(Number(player.state.hp || 0) <= 0) return "vaisseau detruit";
    if(isRecentlyInCombat(player, now)) return "combat recent";
    const speed = Math.hypot(Number(player.state.vx || 0), Number(player.state.vy || 0));
    if(speed > logoutMoveSpeed || Math.abs(Number(player.state.enginePower || 0)) > 0.05) return "vaisseau en mouvement";
    return "";
  }

  function startLogout(socket){
    const player = players.get(socket.id);
    if(!player) return;
    const now = Date.now();
    const reason = getLogoutBlockReason(player, now);
    if(reason){
      socket.emit("session:logout-rejected", {reason, at:now});
      return;
    }
    player.logoutPending = {
      startedAt:now,
      completeAt:now + logoutDelayMs
    };
    socket.emit("session:logout-started", {
      delayMs:logoutDelayMs,
      completeAt:player.logoutPending.completeAt,
      at:now
    });
    emitPlayers();
  }

  function cancelLogout(player, reason = "annulee"){
    if(!player?.logoutPending) return;
    player.logoutPending = null;
    if(player.connected !== false) io.to(player.id).emit("session:logout-cancelled", {reason, at:Date.now()});
    emitPlayers();
  }

  function removePlayer(playerId){
    const player = players.get(playerId);
    if(!player) return;
    if(typeof onPlayerRemove === "function") onPlayerRemove(player);
    if(player.mapRoom) io.sockets.sockets.get(playerId)?.leave(player.mapRoom);
    players.delete(playerId);
    emitPlayers();
  }

  function applyDamageToPlayerState(player, amount){
    if(!player?.state) return;
    let incoming = Math.max(0, Number(amount || 0));
    const maxShield = Math.max(0, Number(player.state.maxShield || 0));
    if(maxShield > 0 && Number(player.state.shield || 0) > 0){
      const shieldPart = incoming * 0.8;
      let hullPart = incoming - shieldPart;
      const absorbed = Math.min(Number(player.state.shield || 0), shieldPart);
      player.state.shield = Math.max(0, Number(player.state.shield || 0) - absorbed);
      hullPart += shieldPart - absorbed;
      incoming = hullPart;
    }
    if(incoming > 0) player.state.hp = Math.max(0, Number(player.state.hp || 0) - incoming);
    player.state.updatedAt = Date.now();
  }

  function syncMovementLogoutState(player){
    if(!player?.logoutPending) return;
    const reason = getLogoutBlockReason(player);
    if(reason) cancelLogout(player, reason);
  }

  function tick(now = Date.now()){
    for(const player of players.values()){
      if(player.logoutPending){
        const reason = getLogoutBlockReason(player, now);
        if(reason) cancelLogout(player, reason);
        else if(now >= Number(player.logoutPending.completeAt || 0)){
          player.gracefulLogout = true;
          io.to(player.id).emit("session:logout-complete", {at:now});
          const liveSocket = io.sockets.sockets.get(player.id);
          if(liveSocket) liveSocket.disconnect(true);
          else removePlayer(player.id);
        }
      }
      if(player.connected === false && Number(player.removeAt || 0) > 0 && now >= Number(player.removeAt || 0)){
        if(Number(player.state?.hp || 0) <= 0){
          removePlayer(player.id);
        }else if(isRecentlyInCombat(player, now)){
          player.removeAt = now + disconnectCombatGraceMs;
        }else{
          removePlayer(player.id);
        }
      }
    }
  }

  function handleDisconnect(socket, {leaveCurrentGroup} = {}){
    if(typeof leaveCurrentGroup === "function") leaveCurrentGroup(socket);
    const player = players.get(socket.id);
    if(!player) return;
    if(player.mapRoom) socket.leave(player.mapRoom);
    player.logoutPending = null;
    if(player.gracefulLogout || !isRecentlyInCombat(player)){
      players.delete(socket.id);
      emitPlayers();
      return;
    }
    player.connected = false;
    player.disconnecting = true;
    player.disconnectedAt = Date.now();
    player.removeAt = player.disconnectedAt + disconnectCombatGraceMs;
    emitPlayers();
  }

  return {
    createPlayer,
    markCombat,
    isActiveForWorld,
    applyDamageToPlayerState,
    startLogout,
    cancelLogout,
    syncMovementLogoutState,
    tick,
    handleDisconnect,
    getLogoutBlockReason,
    isRecentlyInCombat
  };
}
