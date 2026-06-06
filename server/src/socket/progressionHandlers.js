export function registerProgressionHandlers(socket, context){
  const {emitProfileSync, guard, players, profileManager} = context;

  socket.on("skill:upgrade", payload=>{
    if(!guard("skill:upgrade")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyProgressionAction({
      player,
      action:{kind:"skill-upgrade", id:payload?.id}
    });
    if(!result.ok){
      socket.emit("skill:error", {message:result.reason || "Competence impossible."});
      return;
    }
    socket.emit("skill:upgraded", {
      skill:result.skill || null,
      level:result.level,
      nodeIndex:result.nodeIndex,
      rank:result.rank,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("portal:unlock", payload=>{
    if(!guard("portal:unlock")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyProgressionAction({
      player,
      action:{kind:"portal-unlock", id:payload?.id, method:payload?.method}
    });
    if(!result.ok){
      socket.emit("portal:error", {message:result.reason || "Portail impossible."});
      return;
    }
    socket.emit("portal:unlocked", {
      portal:result.portal || null,
      method:result.method,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });

  socket.on("prestige:perform", ()=>{
    if(!guard("prestige:perform")) return;
    const player = players.get(socket.id);
    if(!player) return;
    const result = profileManager.applyProgressionAction({
      player,
      action:{kind:"prestige"}
    });
    if(!result.ok){
      socket.emit("prestige:error", {message:result.reason || "Prestige impossible."});
      return;
    }
    socket.emit("prestige:performed", {
      prestige:result.prestige,
      at:Date.now()
    });
    emitProfileSync(player, result.profile);
  });
}
