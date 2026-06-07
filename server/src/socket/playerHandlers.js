import { validatePlayerState } from "../players/playerStateValidation.js";

export function registerPlayerHandlers(socket, context){
  const {
    cleanName,
    emitProfileSync,
    emitPlayers,
    groups,
    guard,
    logger,
    players,
    presence,
    profileManager,
    publicPlayer,
    resumeQuestTimers,
    setPlayerMap,
    syncPlayerStatusEffects,
    syncProfileForPlayer
  } = context;

  function cleanClientId(value){
    return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80);
  }

  function takeoverGuestSocket(player, clientId){
    if(!player || player.accountId || !clientId) return player;
    const existing = [...players.values()].find(candidate=>
      candidate.id !== player.id
      && !candidate.accountId
      && candidate.clientId === clientId
    );
    if(!existing) return player;
    const existingSocket = context.io?.sockets?.sockets?.get(existing.id);
    const nextPlayer = {
      ...existing,
      id:player.id,
      name:player.name,
      clientId,
      clientMode:player.clientMode,
      connected:true,
      disconnecting:false,
      logoutPending:null,
      gracefulLogout:false,
      removeAt:0,
      mapRoom:null,
      worldMapSent:false
    };
    if(existing.mapRoom) existingSocket?.leave(existing.mapRoom);
    players.delete(existing.id);
    players.set(player.id, nextPlayer);
    existingSocket?.disconnect(true);
    if(nextPlayer.mapId) setPlayerMap(socket, nextPlayer.mapId);
    return nextPlayer;
  }

  socket.on("player:hello", payload=>{
    if(!guard("player:hello")) return;
    let player = players.get(socket.id);
    if(!player) return;
    player.clientMode = payload?.clientMode === "game" ? "game" : "launcher";
    player.clientId = cleanClientId(payload?.clientId);
    if(!player.accountId) player.name = cleanName(payload?.name);
    player = takeoverGuestSocket(player, player.clientId);
    if(player.clientMode === "game") resumeQuestTimers?.(player);
    syncProfileForPlayer(socket);
    if(player.clientMode === "game") syncPlayerStatusEffects?.(player);
    emitPlayers();
  });

  socket.on("profile:save", payload=>{
    if(!guard("profile:save")) return;
    const player = players.get(socket.id);
    const saveResult = profileManager.saveFromPayload({player, payload});
    const incoming = saveResult?.profile || saveResult;
    if(incoming){
      if(saveResult?.claimedQuests?.length){
        for(const claim of saveResult.claimedQuests){
          socket.emit("quest:claimed", {
            id:claim.quest?.id,
            title:claim.quest?.title,
            reward:claim.reward || {},
            auto:true,
            at:Date.now()
          });
        }
      }
      socket.emit("profile:saved", {updatedAt:incoming.updatedAt});
      emitProfileSync?.(player, incoming);
    }
  });

  socket.on("player:state", payload=>{
    if(!guard("player:state")) return;
    const player = players.get(socket.id);
    if(!player) return;
    player.connected = true;
    player.disconnecting = false;
    player.removeAt = 0;
    if(player.shipSwitchLockUntil && Date.now() < Number(player.shipSwitchLockUntil || 0)){
      return;
    }
    player.shipSwitchLockUntil = 0;
    const validation = validatePlayerState({
      player,
      payload,
      profile:profileManager.getProfileForPlayer(player),
      groups
    });
    player.state = validation.state;
    const nextMapId = validation.state.mapId;
    if(validation.corrected){
      logger?.warn?.("Player state corrected", {
        playerId:player.id,
        accountId:player.accountId || null,
        reason:validation.reason
      });
      socket.emit("player:state-correction", {...validation.state, source:"state-correction"});
    }
    profileManager.saveWorldSession({player, state:player.state});
    presence.syncMovementLogoutState(player);
    setPlayerMap(socket, nextMapId);
    socket.broadcast.emit("player:state", publicPlayer(player));
  });

  socket.on("player:laser", payload=>{
    if(!guard("player:laser")) return;
    presence.markCombat(players.get(socket.id), "tir joueur");
    socket.broadcast.emit("player:laser", {
      sourceId:socket.id,
      fromX:Number(payload?.fromX || 0),
      fromY:Number(payload?.fromY || 0),
      toX:Number(payload?.toX || 0),
      toY:Number(payload?.toY || 0),
      mapId:String(payload?.mapId ?? players.get(socket.id)?.mapId ?? "0"),
      color:String(payload?.color || "rgba(56,189,248,.9)").slice(0, 48),
      life:Math.max(0.05, Math.min(0.35, Number(payload?.life || 0.16))),
      createdAt:Date.now()
    });
  });

  socket.on("session:logout-request", ()=>{
    if(!guard("session:logout-request")) return;
    presence.startLogout(socket);
  });
}
