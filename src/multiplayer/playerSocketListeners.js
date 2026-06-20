function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

const SOCIAL_PROFILE_SYNC_INTERVAL_MS = 60 * 1000;

function requestSocialSyncFromProfile(socket, multiplayer){
  const now = Date.now();
  const last = Number(multiplayer.socialSync?.lastProfileSyncRequestedAt || 0);
  if(last && now - last < SOCIAL_PROFILE_SYNC_INTERVAL_MS) return;
  multiplayer.socialSync = {
    ...(multiplayer.socialSync || {}),
    lastProfileSyncRequestedAt:now
  };
  socket.emit("social:sync");
}

export function installPlayerSocketListeners({
  socket,
  multiplayer,
  requestLeaderboardSync,
  upsertRemotePlayer,
  addRemoteEffect,
  emitChange,
  toast
}){
  socket.on("auth:required", payload=>{
    multiplayer.auth.profileReady = false;
    toast(payload?.message || "Compte MMO requis pour jouer.");
    emitChange("auth:required", payload);
  });
  socket.on("profile:sync", profile=>{
    multiplayer.auth.profileReady = true;
    requestSocialSyncFromProfile(socket, multiplayer);
    requestLeaderboardSync?.();
    window.dispatchEvent(new CustomEvent("voidsector:profile-sync", {detail:{profile}}));
  });
  socket.on("profile:setup-complete", event=>{
    toast(event?.firmLabel ? `Profil pilote pret : ${event.firmLabel}.` : "Profil pilote pret.");
    emitChange("profile:setup-complete", event);
  });
  socket.on("profile:setup-error", payload=>{
    toast(payload?.message || "Configuration du profil impossible.");
    emitChange("profile:setup-error", payload);
  });
  socket.on("profile:debug-firm-reset", event=>{
    toast("Choix de firme reinitialise pour les tests locaux.");
    emitChange("profile:debug-firm-reset", event);
  });
  socket.on("player:resume", session=>{
    pushEvent(multiplayer.resumeEvents, session, 10);
    window.dispatchEvent(new CustomEvent("voidsector:player-resume", {detail:{session}}));
    emitChange("player:resume", session);
  });
  socket.on("player:state-correction", session=>{
    window.dispatchEvent(new CustomEvent("voidsector:player-resume", {detail:{session}}));
    emitChange("player:state-correction", session);
  });
  socket.on("players:list", players=>{
    multiplayer.players = Array.isArray(players) ? players : [];
    const visibleIds = new Set(multiplayer.players
      .filter(player=>Boolean(player?.state))
      .map(player=>player?.id)
      .filter(Boolean));
    for(const id of multiplayer.remotePlayers.keys()){
      if(!visibleIds.has(id)) multiplayer.remotePlayers.delete(id);
    }
    for(const player of multiplayer.players){
      if(player?.id && player.id !== multiplayer.playerId && player.state){
        upsertRemotePlayer(player);
      }else if(player?.id && player.id !== multiplayer.playerId){
        multiplayer.remotePlayers.delete(player.id);
      }
    }
    emitChange();
  });
  socket.on("leaderboard:ranking", payload=>{
    multiplayer.leaderboardRanking = payload || null;
    multiplayer.leaderboardSync = {
      ...(multiplayer.leaderboardSync || {}),
      lastReceivedAt:Date.now()
    };
    emitChange("leaderboard:ranking", payload);
  });
  socket.on("player:state", upsertRemotePlayer);
  socket.on("player:laser", addRemoteEffect);
  socket.on("enemy:attack", effect=>pushEvent(multiplayer.enemyAttackEvents, effect, 80));
  socket.on("player:damage", event=>pushEvent(multiplayer.playerDamageEvents, event, 40));
  socket.on("player:death", event=>pushEvent(multiplayer.playerDeathEvents, event, 10));
  socket.on("player:respawned", event=>pushEvent(multiplayer.playerRespawnEvents, event, 10));
  socket.on("portgun:started", event=>{
    pushEvent(multiplayer.portgunEvents, {type:"started", ...event}, 10);
    emitChange("portgun:started", event);
  });
  socket.on("portgun:cancelled", event=>{
    pushEvent(multiplayer.portgunEvents, {type:"cancelled", ...event}, 10);
    emitChange("portgun:cancelled", event);
  });
  socket.on("portgun:complete", event=>{
    pushEvent(multiplayer.portgunEvents, {type:"complete", ...event}, 10);
    emitChange("portgun:complete", event);
  });
  socket.on("portgun:error", payload=>{
    pushEvent(multiplayer.portgunEvents, {type:"error", ...payload}, 10);
    toast(payload?.message || "Teleportation Portgun impossible.");
    emitChange("portgun:error", payload);
  });
  socket.on("player:radiation", event=>pushEvent(multiplayer.playerRadiationEvents, event, 10));
  socket.on("player:respawn-error", payload=>{
    toast(payload?.message || "Respawn impossible.");
    emitChange("player:respawn-error", payload);
  });
  socket.on("player:status-effect", event=>pushEvent(multiplayer.playerStatusEffectEvents, event, 20));
  socket.on("player:reward", event=>pushEvent(multiplayer.playerRewardEvents, event, 40));
  socket.on("loot:drop", event=>pushEvent(multiplayer.lootDropEvents, event, 40));
  socket.on("loot:picked", event=>{
    pushEvent(multiplayer.lootPickupEvents, event, 40);
    emitChange("loot:picked", event);
  });
  socket.on("loot:error", payload=>{
    toast(payload?.message || "Ramassage impossible.");
    emitChange("loot:error", payload);
  });
}
