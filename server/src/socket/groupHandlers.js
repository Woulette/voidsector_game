export function registerGroupHandlers(socket, context){
  const {
    acceptInvite,
    createCoopInstance,
    createGroup,
    declineInvite,
    emitPlayers,
    guard,
    groups,
    invitePlayer,
    io,
    kickMember,
    leaveCurrentGroup,
    players,
    promoteLeader,
    startPortalInstance,
    activateRickyHealBeacon
  } = context;

  socket.on("group:create", ()=>{
    if(!guard("group:create")) return;
    createGroup(socket);
  });

  socket.on("group:invite", payload=>{
    if(!guard("group:invite")) return;
    const targetId = String(payload?.targetId || "");
    const targetName = String(payload?.targetName || "").trim().toLowerCase();
    const target = players.get(targetId) || [...players.values()].find(player=>
      player.id !== socket.id
      && player.connected !== false
      && player.clientMode === "game"
      && String(player.name || "").trim().toLowerCase() === targetName
    );
    const result = invitePlayer(socket, target);
    if(!result?.ok) socket.emit("group:error", {message:result?.reason || "Invitation impossible."});
  });

  socket.on("group:accept", payload=>{
    if(!guard("group:accept")) return;
    acceptInvite(socket, String(payload?.groupId || ""));
  });

  socket.on("group:decline", payload=>{
    if(!guard("group:decline")) return;
    declineInvite(socket, String(payload?.groupId || ""));
  });

  socket.on("group:leave", ()=>{
    if(!guard("group:leave")) return;
    leaveCurrentGroup(socket);
    socket.emit("group:update", null);
    emitPlayers();
  });

  socket.on("group:kick", payload=>{
    if(!guard("group:kick")) return;
    kickMember(socket, String(payload?.targetId || ""));
  });

  socket.on("group:promote", payload=>{
    if(!guard("group:promote")) return;
    promoteLeader(socket, String(payload?.targetId || ""));
  });

  socket.on("coop:start-test", ()=>{
    if(!guard("coop:start-test")) return;
    createCoopInstance(socket);
  });

  socket.on("portal:start", payload=>{
    if(!guard("portal:start")) return;
    startPortalInstance(socket, payload?.portalId);
  });

  socket.on("portal:ricky-heal", ()=>{
    if(!guard("portal:ricky-heal")) return;
    activateRickyHealBeacon?.(socket);
  });
}
