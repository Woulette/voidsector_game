function pushEvent(target, event, limit){
  target.push({...event, receivedAt:performance.now()});
  if(target.length > limit) target.splice(0, target.length - limit);
}

function normalizePortalAlly(ally){
  return ally ? {...ally, receivedAt:performance.now()} : null;
}

export function installWorldSocketListeners({socket, multiplayer, replaceServerEnemies, emitChange, toast}){
  socket.on("group:update", group=>{
    multiplayer.group = group || null;
    if(group?.members?.length){
      const memberIds = new Set(group.members.map(member=>member.id));
      multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(invite=>!memberIds.has(invite.playerId));
    }
    emitChange("group:update", group);
  });
  socket.on("coop:enemies", payload=>{
    multiplayer.coopInstanceId = payload?.instanceId || null;
    multiplayer.coopSpawn = payload?.spawn || null;
    multiplayer.portalInstance = payload?.portal ? {
      instanceId:payload?.instanceId || null,
      portal:payload.portal,
      wave:Number(payload.wave || 0),
      completed:Boolean(payload.completed),
      objective:payload?.objective || null
    } : null;
    multiplayer.portalAlly = payload?.portal ? normalizePortalAlly(payload?.ally) : null;
    multiplayer.portalBeacons = payload?.portal ? Array.isArray(payload?.beacons) ? payload.beacons : [] : [];
    multiplayer.portalObjective = payload?.portal ? payload?.objective || null : null;
    replaceServerEnemies(payload, "coop");
    // Combat reads these snapshots directly. A global UI event here would rerender
    // authentication and utility panels ten times per second during an instance.
  });
  socket.on("portal:started", event=>{
    multiplayer.portalInstance = {
      instanceId:event?.instanceId || null,
      portal:event?.portal || null,
      wave:Number(event?.wave || 0),
      completed:false,
      objective:event?.objective || null
    };
    multiplayer.portalAlly = null;
    multiplayer.portalBeacons = [];
    multiplayer.portalObjective = event?.objective || null;
    multiplayer.rickyCinematicEvents = [];
    pushEvent(multiplayer.portalStartEvents, event, 10);
    emitChange();
  });
  socket.on("portal:complete", event=>{
    pushEvent(multiplayer.portalCompleteEvents, event, 10);
    if(multiplayer.portalInstance) multiplayer.portalInstance.completed = true;
    emitChange();
  });
  socket.on("portal:ricky-heal", event=>{
    if(event?.beacon){
      multiplayer.portalBeacons = [
        ...(Array.isArray(multiplayer.portalBeacons) ? multiplayer.portalBeacons.filter(beacon=>beacon.id !== event.beacon.id) : []),
        event.beacon
      ];
    }
    pushEvent(multiplayer.rickyHealEvents, event, 10);
    emitChange("portal:ricky-heal", event);
  });
  socket.on("portal:ricky-cinematic", event=>{
    pushEvent(multiplayer.rickyCinematicEvents, event, 5);
    emitChange("portal:ricky-cinematic", event);
  });
  socket.on("npc:damage", event=>{
    pushEvent(multiplayer.npcDamageEvents, event, 30);
    emitChange("npc:damage", event);
  });
  socket.on("player:healed", event=>{
    pushEvent(multiplayer.playerHealEvents, event, 30);
    emitChange("player:healed", event);
  });
  socket.on("world:enemies", payload=>{
    if(multiplayer.coopInstanceId) return;
    multiplayer.coopSpawn = null;
    replaceServerEnemies(payload, "world");
    // Keep high-frequency world snapshots out of the general application event bus.
  });
  socket.on("group:invite", invite=>{
    if(!invite?.groupId) return;
    multiplayer.invites = multiplayer.invites.filter(item=>item.groupId !== invite.groupId);
    multiplayer.invites.push(invite);
    toast(`${invite.fromName || "Un joueur"} t'invite en groupe.`);
    emitChange("group:invite", invite);
    setTimeout(()=>{
      multiplayer.invites = multiplayer.invites.filter(item=>item.groupId !== invite.groupId);
      emitChange("group:invite-expired", invite);
    }, Math.max(0, Number(invite.expiresAt || Date.now() + 30000) - Date.now()));
  });
  socket.on("group:declined", payload=>{
    toast(`${payload?.playerName || "Le joueur"} a refuse l'invitation.`);
  });
  socket.on("group:invite-sent", invite=>{
    multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(item=>item.playerId !== invite?.playerId);
    multiplayer.outgoingGroupInvites.push(invite);
    emitChange("group:invite-sent", invite);
    setTimeout(()=>{
      multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(item=>item.playerId !== invite?.playerId);
      emitChange("group:invite-expired", invite);
    }, Math.max(0, Number(invite?.expiresAt || Date.now() + 30000) - Date.now()));
  });
  socket.on("group:invite-resolved", payload=>{
    multiplayer.outgoingGroupInvites = multiplayer.outgoingGroupInvites.filter(item=>item.playerId !== payload?.playerId);
    if(payload?.accepted === false) toast(`${payload?.playerName || "Le joueur"} a refuse l'invitation.`);
    emitChange("group:invite-resolved", payload);
  });
  socket.on("group:kicked", payload=>{
    multiplayer.group = null;
    toast(`${payload?.byName || "Le chef"} t'a retire du groupe.`);
    emitChange("group:kicked", payload);
  });
  socket.on("group:error", payload=>toast(payload?.message || "Action de groupe impossible."));
}
