export function registerSocialHandlers(socket, context){
  const {guard, players, socialManager} = context;

  function player(){
    return players.get(socket.id);
  }

  function emitResult(result){
    if(!result?.ok) socket.emit("social:error", {message:result?.reason || "Action sociale impossible.", at:Date.now()});
  }

  socket.on("social:sync", ()=>{
    if(!guard("social:sync")) return;
    socialManager.emitSocialForPlayer(player());
  });
  socket.on("social:friend-request", payload=>{
    if(!guard("social:friend-request")) return;
    emitResult(socialManager.sendFriendRequest(player(), payload?.name));
  });
  socket.on("social:friend-response", payload=>{
    if(!guard("social:friend-response")) return;
    emitResult(socialManager.respondFriendRequest(player(), String(payload?.key || ""), Boolean(payload?.accept)));
  });
  socket.on("social:set-category", payload=>{
    if(!guard("social:set-category")) return;
    emitResult(socialManager.setCategory(player(), payload?.name, String(payload?.category || "")));
  });
  socket.on("social:remove", payload=>{
    if(!guard("social:remove")) return;
    emitResult(socialManager.removeRelation(player(), String(payload?.key || ""), String(payload?.category || "")));
  });
  socket.on("social:private-message", payload=>{
    if(!guard("social:private-message")) return;
    emitResult(socialManager.sendPrivateMessage(player(), String(payload?.key || ""), payload?.text));
  });
}
