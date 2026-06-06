export function registerDisconnectHandlers(socket, context){
  const {leaveCurrentGroup, players, presence, profileManager} = context;

  socket.on("disconnect", ()=>{
    const player = players.get(socket.id);
    if(player?.state) profileManager.saveWorldSession({player, state:player.state, force:true});
    presence.handleDisconnect(socket, {leaveCurrentGroup});
  });
}
