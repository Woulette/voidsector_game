import { validatePlayerState } from "../players/playerStateValidation.js";

export function registerPlayerHandlers(socket, context){
  const {
    cleanName,
    buildFirmSpawnSession,
    emitProfileSync,
    emitPlayers,
    groups,
    guard,
    logger,
    players,
    presence,
    profileManager,
    publicPlayer,
    replaceGroupMemberId,
    resumeQuestTimers,
    setPlayerMap,
    syncPlayerStatusEffects,
    syncProfileForPlayer
  } = context;

  function cleanClientId(value){
    return String(value || "").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 80);
  }

  function isLocalDebugSocket(){
    if(String(process.env.NODE_ENV || "").toLowerCase() === "production") return false;
    const address = String(socket.handshake?.address || socket.conn?.remoteAddress || "");
    return address === "::1" || address === "127.0.0.1" || address.endsWith(":127.0.0.1");
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
    if(nextPlayer.groupId) socket.join(nextPlayer.groupId);
    replaceGroupMemberId?.(existing.id, player.id);
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

  socket.on("profile:setup", payload=>{
    if(!guard("profile:setup")) return;
    const player = players.get(socket.id);
    if(!player?.accountId){
      socket.emit("profile:setup-error", {message:"Connecte ton compte avant de choisir ta firme."});
      return;
    }
    const result = profileManager.setupProfileForPlayer({
      player,
      name:payload?.name,
      firmId:payload?.firmId
    });
    if(!result.ok){
      socket.emit("profile:setup-error", {message:result.reason || "Configuration du profil impossible."});
      return;
    }
    if(result.firmChanged){
      const accountPlayers = [...players.values()].filter(candidate=>candidate.accountId === player.accountId);
      let syncedProfile = result.profile;
      for(const accountPlayer of accountPlayers){
        accountPlayer.account = accountPlayer.account ? {...accountPlayer.account, firmId:result.firm?.id} : accountPlayer.account;
        accountPlayer.mapId = String(result.firm?.baseMapId ?? "0");
        if(accountPlayer.clientMode !== "game") continue;
        const spawnSession = {
          ...buildFirmSpawnSession({
            shipId:result.profile?.activeShip,
            firmId:result.firm?.id,
            state:accountPlayer.state
          }),
          source:"firm-change"
        };
        accountPlayer.state = {...spawnSession};
        accountPlayer.mapId = spawnSession.mapId;
        const accountSocket = context.io?.sockets?.sockets?.get(accountPlayer.id);
        if(accountSocket){
          setPlayerMap(accountSocket, spawnSession.mapId);
          accountSocket.emit("player:resume", spawnSession);
        }
        syncedProfile = profileManager.saveWorldSession({
          player:accountPlayer,
          state:accountPlayer.state,
          force:true
        }) || syncedProfile;
      }
      result.profile = syncedProfile;
    }
    socket.emit("profile:setup-complete", {
      name:result.profile?.player?.name,
      firmId:result.profile?.player?.firmId,
      firmLabel:result.firm?.label,
      homeMap:result.firm?.homeMapName,
      at:Date.now()
    });
    emitProfileSync?.(player, result.profile);
    emitPlayers();
  });

  socket.on("profile:debug-reset-firm", ()=>{
    if(!guard("profile:debug-reset-firm")) return;
    const player = players.get(socket.id);
    if(!isLocalDebugSocket()){
      socket.emit("profile:setup-error", {message:"Commande debug firme refusee hors serveur local."});
      return;
    }
    if(!player?.accountId){
      socket.emit("profile:setup-error", {message:"Connecte un compte avant de reinitialiser la firme."});
      return;
    }
    const result = profileManager.updateProfileForPlayer({
      player,
      update:profile=>{
        profile.player = {...profile.player, firmSelected:false};
        profile.worldSession = null;
        profile.shipWorldSessions = {};
        return {ok:true};
      }
    });
    if(!result.ok){
      socket.emit("profile:setup-error", {message:result.reason || "Reinitialisation firme impossible."});
      return;
    }
    player.state = null;
    socket.emit("profile:debug-firm-reset", {firmId:result.profile?.player?.firmId, at:Date.now()});
    emitProfileSync?.(player, result.profile);
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
    const player = players.get(socket.id);
    presence.markCombat(player, "tir joueur");
    const kind = ["laser", "rocket", "missile"].includes(payload?.kind) ? payload.kind : "laser";
    const starts = (Array.isArray(payload?.starts) ? payload.starts : [{
      x:payload?.fromX,
      y:payload?.fromY,
      curveSide:payload?.curveSide,
      curveStrength:payload?.curveStrength
    }]).slice(0, 12).map(start=>({
      x:Number(start?.x || 0),
      y:Number(start?.y || 0),
      curveSide:Math.max(-1, Math.min(1, Number(start?.curveSide || 0))),
      curveStrength:Math.max(0, Math.min(160, Number(start?.curveStrength || 0)))
    }));
    socket.broadcast.emit("player:laser", {
      sourceId:socket.id,
      kind,
      ammoId:String(payload?.ammoId || "ammo_x1").slice(0, 40),
      targetId:String(payload?.targetId || "").slice(0, 100),
      starts,
      fromX:Number(starts[0]?.x || payload?.fromX || 0),
      fromY:Number(starts[0]?.y || payload?.fromY || 0),
      toX:Number(payload?.toX || 0),
      toY:Number(payload?.toY || 0),
      blueLaser:Boolean(payload?.blueLaser),
      travelTime:Math.max(.1, Math.min(2, Number(payload?.travelTime || .2))),
      mapId:String(player?.mapId ?? payload?.mapId ?? "0"),
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
