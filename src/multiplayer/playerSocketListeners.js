function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

export function installPlayerSocketListeners({
  socket,
  multiplayer,
  upsertRemotePlayer,
  addRemoteEffect,
  emitChange,
  toast
}){
  socket.on("profile:sync", profile=>{
    multiplayer.auth.profileReady = true;
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
    const liveIds = new Set(multiplayer.players
      .filter(player=>player?.connected !== false)
      .map(player=>player?.id)
      .filter(Boolean));
    for(const id of multiplayer.remotePlayers.keys()){
      if(!liveIds.has(id)) multiplayer.remotePlayers.delete(id);
    }
    for(const player of multiplayer.players){
      if(player?.connected !== false && player?.id && player.id !== multiplayer.playerId && player.state) upsertRemotePlayer(player);
    }
    emitChange();
  });
  socket.on("player:state", upsertRemotePlayer);
  socket.on("player:laser", addRemoteEffect);
  socket.on("enemy:attack", effect=>pushEvent(multiplayer.enemyAttackEvents, effect, 80));
  socket.on("player:damage", event=>pushEvent(multiplayer.playerDamageEvents, event, 40));
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
