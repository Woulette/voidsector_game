function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

export function installWorldSocketListeners({socket, multiplayer, replaceServerEnemies, emitChange, toast}){
  socket.on("group:update", group=>{
    multiplayer.group = group || null;
    emitChange();
  });
  socket.on("coop:enemies", payload=>{
    multiplayer.coopInstanceId = payload?.instanceId || null;
    multiplayer.coopSpawn = payload?.spawn || null;
    multiplayer.portalInstance = payload?.portal ? {
      instanceId:payload?.instanceId || null,
      portal:payload.portal,
      wave:Number(payload.wave || 0),
      completed:Boolean(payload.completed)
    } : null;
    replaceServerEnemies(payload, "coop");
    emitChange();
  });
  socket.on("portal:started", event=>{
    multiplayer.portalInstance = {
      instanceId:event?.instanceId || null,
      portal:event?.portal || null,
      wave:Number(event?.wave || 0),
      completed:false
    };
    pushEvent(multiplayer.portalStartEvents, event, 10);
    emitChange();
  });
  socket.on("portal:complete", event=>{
    pushEvent(multiplayer.portalCompleteEvents, event, 10);
    if(multiplayer.portalInstance) multiplayer.portalInstance.completed = true;
    emitChange();
  });
  socket.on("world:enemies", payload=>{
    if(multiplayer.coopInstanceId) return;
    multiplayer.coopSpawn = null;
    replaceServerEnemies(payload, "world");
    emitChange();
  });
  socket.on("group:invite", invite=>{
    if(!invite?.groupId) return;
    multiplayer.invites = multiplayer.invites.filter(item=>item.groupId !== invite.groupId);
    multiplayer.invites.push(invite);
    toast(`${invite.fromName || "Un joueur"} t'invite en groupe.`);
    emitChange("group:invite", invite);
  });
  socket.on("group:declined", payload=>{
    toast(`${payload?.playerName || "Le joueur"} a refuse l'invitation.`);
  });
}
