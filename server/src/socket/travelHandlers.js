export function registerTravelHandlers(socket, {guard, players, travelManager, now = ()=>Date.now()}){
  socket.on("travel:start", payload=>{
    if(!guard("travel:start")) return;
    const result = travelManager.start(players.get(socket.id), payload);
    if(!result.ok) socket.emit("travel:error", {...result, at:now()});
  });

  socket.on("travel:cancel", payload=>{
    const player = players.get(socket.id);
    // Rate limiting must never trap an authenticated pilot in automatic flight.
    // The guard still records rejected traffic; cancellation affects this socket
    // only and becomes a no-op as soon as its in-memory journey is gone.
    if(!guard("travel:cancel") && !player?.accountId) return;
    travelManager.cancel(player, {
      journeyId:payload?.journeyId, requestId:payload?.requestId
    });
  });

  socket.on("disconnect", ()=>{
    travelManager.cancel(players.get(socket.id), {reason:"disconnected", message:"Voyage interrompu : session deconnectee."});
  });
}
