export function createSocketSessionManager({io, players, groups, profileManager, cleanName, emitPlayers, emitGroup, setPlayerMap}){
  function publicAuthPayload({account, session = null}){
    return {
      account,
      token:session?.token || null,
      expiresAt:session?.expiresAt || null
    };
  }

  function attachAccountToSocket(socket, account, session = null){
    const player = players.get(socket.id);
    if(!player || !account) return;
    player.accountId = account.id;
    player.account = account;
    player.name = cleanName(account.username || player.name);
    player.sessionExpiresAt = session?.expiresAt || player.sessionExpiresAt || null;
    emitPlayers();
  }

  function replaceGroupMemberId(oldId, nextId){
    for(const group of groups.values()){
      let changed = false;
      group.members = group.members.map(memberId=>{
        if(memberId !== oldId) return memberId;
        changed = true;
        return nextId;
      });
      group.members = [...new Set(group.members)];
      if(group.leaderId === oldId){
        group.leaderId = nextId;
        changed = true;
      }
      if(changed) emitGroup(group.id);
    }
  }

  function buildResumeSessionFromState(state, source = "live"){
    if(!state || Number(state.hp || 0) <= 0) return null;
    return {
      source,
      mapId:String(state.mapId ?? "0"),
      x:Number(state.x || 0),
      y:Number(state.y || 0),
      angle:Number(state.angle || 0),
      hp:Math.max(0, Number(state.hp || 0)),
      maxHp:Math.max(0, Number(state.maxHp || state.hp || 0)),
      shield:Math.max(0, Number(state.shield || 0)),
      maxShield:Math.max(0, Number(state.maxShield || state.shield || 0)),
      shipId:String(state.shipId || "unknown"),
      shipImg:String(state.shipImg || ""),
      updatedAt:Math.max(0, Number(state.updatedAt || Date.now()))
    };
  }

  function attachOrResumeAccountSocket(socket, account, session = null){
    const current = players.get(socket.id);
    if(!current || !account) return null;
    let resumeSession = null;
    const isGameClient = current.clientMode === "game";
    const duplicates = [...players.values()].filter(player=>player.id !== socket.id && player.accountId === account.id);
    const existing = duplicates.find(player=>player.state) || duplicates[0] || null;
    const transfersExistingState = Boolean(isGameClient && existing?.state);
    if(transfersExistingState){
      resumeSession = buildResumeSessionFromState(existing.state, existing.connected === false ? "reconnect" : "takeover");
      const existingSocket = io.sockets.sockets.get(existing.id);
      const nextPlayer = {
        ...existing,
        id:socket.id,
        accountId:account.id,
        account,
        name:cleanName(account.username || existing.name),
        sessionExpiresAt:session?.expiresAt || existing.sessionExpiresAt || null,
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
      players.set(socket.id, nextPlayer);
      replaceGroupMemberId(existing.id, socket.id);
      existingSocket?.disconnect(true);
      if(nextPlayer.mapId) setPlayerMap(socket, nextPlayer.mapId);
    }else{
      attachAccountToSocket(socket, account, session);
    }
    const duplicatesToRemove = isGameClient ? duplicates : duplicates.filter(duplicate=>duplicate.clientMode !== "game");
    for(const duplicate of duplicatesToRemove){
      if(transfersExistingState && duplicate.id === existing?.id) continue;
      const duplicateSocket = io.sockets.sockets.get(duplicate.id);
      if(duplicate.mapRoom) duplicateSocket?.leave(duplicate.mapRoom);
      replaceGroupMemberId(duplicate.id, socket.id);
      players.delete(duplicate.id);
      duplicateSocket?.disconnect(true);
    }
    const player = players.get(socket.id);
    if(isGameClient && !resumeSession){
      resumeSession = buildResumeSessionFromState(profileManager.getWorldSessionForPlayer(player), "profile");
    }
    if(resumeSession){
      setPlayerMap(socket, resumeSession.mapId);
      socket.emit("player:resume", resumeSession);
    }
    return resumeSession;
  }

  function syncProfileForPlayer(socket){
    const player = players.get(socket.id);
    profileManager.syncForSocket(socket, player);
  }

  return {
    attachOrResumeAccountSocket,
    publicAuthPayload,
    syncProfileForPlayer
  };
}
