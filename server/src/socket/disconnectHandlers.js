export function registerDisconnectHandlers(socket, context){
  const {pauseQuestTimers, players, presence, profileManager} = context;

  socket.on("disconnect", ()=>{
    const player = players.get(socket.id);
    if(player?.state) profileManager.saveWorldSession({player, state:player.state, force:true});
    if(player?.clientMode === "game") pauseQuestTimers?.(player);
    presence.handleDisconnect(socket);
  });
}
