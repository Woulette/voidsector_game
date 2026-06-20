import { isPremiumActive, PREMIUM_LOGOUT_DELAY_MS } from "../../../src/data/premium.js";
import { cancelPendingPortgunTeleport } from "./portgunTeleport.js";

export function createPresenceManager({io, players, emitPlayers, config, onPlayerRemove = null, getProfileForPlayer = null}){
  const logoutDelayMs = Number(config.logoutDelayMs || 15000);
  const combatRecentMs = Number(config.combatRecentMs || 15000);
  const disconnectCombatGraceMs = Number(config.disconnectCombatGraceMs || combatRecentMs);
  const logoutMoveSpeed = Number(config.logoutMoveSpeed || 8);
  const afkAfterMs = Math.max(1000, Number(config.afkAfterMs || 5 * 60 * 1000));
  const afkDisconnectMs = Math.max(afkAfterMs, Number(config.afkDisconnectMs || 10 * 60 * 1000));

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
      lastActivityAt:Date.now(),
      lastActivityReason:"connexion",
      afk:false,
      afkSince:0,
      afkDisconnecting:false,
      removeAt:0
    };
  }

  function markActivity(player, reason = "action", now = Date.now()){
    if(!player) return false;
    const wasAfk = player.afk === true;
    player.lastActivityAt = now;
    player.lastActivityReason = String(reason || "action").slice(0, 80);
    player.afk = false;
    player.afkSince = 0;
    player.afkDisconnecting = false;
    if(wasAfk){
      if(player.connected !== false) io.to(player.id).emit("session:afk-status", {afk:false, at:now});
      emitPlayers();
    }
    return wasAfk;
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
    if(!player?.state) return false;
    if(player.connected !== false) return true;
    return Number(player.removeAt || 0) > now;
  }

  function markDamage(player, now = Date.now()){
    if(!player) return;
    player.lastServerDamageAt = now;
    cancelPendingPortgunTeleport(player, {
      io,
      reason:"damaged",
      message:"Teleportation annulee : ton vaisseau a subi une attaque.",
      now
    });
    if(player.connected === false && Number(player.removeAt || 0) > 0){
      player.removeAt = now + disconnectCombatGraceMs;
    }
  }

  function getLogoutBlockReason(player, now = Date.now()){
    if(!player?.state) return "aucun vaisseau actif";
    if(Number(player.state.hp || 0) <= 0) return "vaisseau detruit";
    if(isRecentlyInCombat(player, now)) return "combat recent";
    const speed = Math.hypot(Number(player.state.vx || 0), Number(player.state.vy || 0));
    if(speed > logoutMoveSpeed || Math.abs(Number(player.state.enginePower || 0)) > 0.05) return "vaisseau en mouvement";
    return "";
  }

  function getLogoutDelayMs(player){
    const profile = typeof getProfileForPlayer === "function" ? getProfileForPlayer(player) : null;
    return isPremiumActive(profile?.player) ? PREMIUM_LOGOUT_DELAY_MS : logoutDelayMs;
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
    const delayMs = getLogoutDelayMs(player);
    player.logoutPending = {
      startedAt:now,
      completeAt:now + delayMs
    };
    socket.emit("session:logout-started", {
      delayMs,
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

  function applyDamageToPlayerState(player, amount, now = Date.now()){
    if(!player?.state) return 0;
    let incoming = Math.max(0, Number(amount || 0));
    if(incoming > 0){
      markDamage(player, now);
      player.state.repairBotActive = false;
      player.serverRepairBotTick = 0;
    }
    const hpBeforeDamage = Number(player.state.hp || 0);
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
    player.state.updatedAt = now;
    return Math.max(0, hpBeforeDamage - Number(player.state.hp || 0));
  }

  function syncMovementLogoutState(player){
    if(!player?.logoutPending) return;
    const reason = getLogoutBlockReason(player);
    if(reason) cancelLogout(player, reason);
  }

  function tick(now = Date.now()){
    for(const player of players.values()){
      if(player.clientMode === "game" && player.connected !== false && player.state){
        const lastActivityAt = Number(player.lastActivityAt || player.connectedAt || now);
        const idleMs = Math.max(0, now - lastActivityAt);
        if(!player.afk && idleMs >= afkAfterMs){
          player.afk = true;
          player.afkSince = lastActivityAt + afkAfterMs;
          io.to(player.id).emit("session:afk-status", {
            afk:true,
            idleMs,
            disconnectAt:lastActivityAt + afkDisconnectMs,
            at:now
          });
          emitPlayers();
        }
        if(!player.afkDisconnecting && idleMs >= afkDisconnectMs){
          player.afkDisconnecting = true;
          io.to(player.id).emit("session:afk-disconnect", {
            reason:"inactivity",
            idleMs,
            at:now
          });
          const liveSocket = io.sockets.sockets.get(player.id);
          if(liveSocket) liveSocket.disconnect(true);
        }
      }
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
        removePlayer(player.id);
      }
    }
  }

  function handleDisconnect(socket){
    const player = players.get(socket.id);
    if(!player) return;
    if(player.mapRoom) socket.leave(player.mapRoom);
    player.logoutPending = null;
    if(player.gracefulLogout || player.clientMode !== "game" || !player.state){
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
    markActivity,
    markCombat,
    markDamage,
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
