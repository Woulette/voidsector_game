export function registerGroupHandlers(socket, context){
  const {
    acceptInvite,
    createCoopInstance,
    createGroup,
    emitPlayers,
    guard,
    groups,
    io,
    leaveCurrentGroup,
    players,
    startPortalInstance
  } = context;

  socket.on("group:create", ()=>{
    if(!guard("group:create")) return;
    createGroup(socket);
  });

  socket.on("group:invite", payload=>{
    if(!guard("group:invite")) return;
    const targetId = String(payload?.targetId || "");
    const target = players.get(targetId);
    const inviter = players.get(socket.id);
    if(!target || !inviter) return;
    let group = inviter.groupId ? groups.get(inviter.groupId) : null;
    if(!group) group = createGroup(socket);
    if(!group) return;
    io.to(targetId).emit("group:invite", {
      groupId:group.id,
      fromId:socket.id,
      fromName:inviter.name
    });
  });

  socket.on("group:accept", payload=>{
    if(!guard("group:accept")) return;
    acceptInvite(socket, String(payload?.groupId || ""));
  });

  socket.on("group:decline", payload=>{
    if(!guard("group:decline")) return;
    const group = groups.get(String(payload?.groupId || ""));
    if(!group) return;
    const leader = players.get(group.leaderId);
    if(leader) io.to(group.leaderId).emit("group:declined", {playerId:socket.id, playerName:players.get(socket.id)?.name || "Pilote"});
  });

  socket.on("group:leave", ()=>{
    if(!guard("group:leave")) return;
    leaveCurrentGroup(socket);
    socket.emit("group:update", null);
    emitPlayers();
  });

  socket.on("coop:start-test", ()=>{
    if(!guard("coop:start-test")) return;
    createCoopInstance(socket);
  });

  socket.on("portal:start", payload=>{
    if(!guard("portal:start")) return;
    startPortalInstance(socket, payload?.portalId);
  });
}
