function pushChatMessage(multiplayer, message, limit = 120){
  if(!Array.isArray(multiplayer.chatMessages)) multiplayer.chatMessages = [];
  multiplayer.chatMessages.push({...message, receivedAt:performance.now()});
  if(multiplayer.chatMessages.length > limit) multiplayer.chatMessages.splice(0, multiplayer.chatMessages.length - limit);
}

export function installChatSocketListeners({socket, multiplayer, emitChange, toast}){
  socket.on("chat:message", message=>{
    pushChatMessage(multiplayer, message);
    emitChange("chat:message", message);
  });

  socket.on("chat:error", payload=>{
    const message = payload?.message || "Message chat refuse.";
    toast?.(message);
    emitChange("chat:error", payload);
  });
}
