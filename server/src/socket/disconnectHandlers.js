export function registerDisconnectHandlers(socket, context){
  const {pauseQuestTimers, players, presence, profileManager, releaseSocketRateLimits} = context;

  socket.on("disconnect", ()=>{
    const player = players.get(socket.id);
    if(player?.state) profileManager.saveWorldSession({player, state:player.state, force:true});
    if(player?.clientMode === "game") pauseQuestTimers?.(player);
    releaseSocketRateLimits?.(socket);
    presence.handleDisconnect(socket);
  });
}
