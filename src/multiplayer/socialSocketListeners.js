function pushPrivateMessage(multiplayer, message){
  if(!Array.isArray(multiplayer.chatMessages)) multiplayer.chatMessages = [];
  multiplayer.chatMessages.push({...message, receivedAt:performance.now()});
  if(multiplayer.chatMessages.length > 120) multiplayer.chatMessages.splice(0, multiplayer.chatMessages.length - 120);
}

export function installSocialSocketListeners({socket, multiplayer, emitChange, toast}){
  socket.on("social:update", social=>{
    multiplayer.social = social || {friends:[], incoming:[], outgoing:[], enemies:[], ignored:[], firmMembers:[]};
    emitChange("social:update", social);
  });
  socket.on("social:error", payload=>{
    toast(payload?.message || "Action sociale impossible.");
    emitChange("social:error", payload);
  });
  socket.on("social:private-message", message=>{
    pushPrivateMessage(multiplayer, message);
    toast(`Message prive : ${message?.author?.name || "Pilote"}`);
    emitChange("social:private-message", message);
  });
  socket.on("firm:ranking", payload=>{
    multiplayer.firmRanking = payload || null;
    emitChange("firm:ranking", payload);
  });
}
