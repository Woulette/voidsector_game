function pushFirmEvent(multiplayer, event){
  if(!Array.isArray(multiplayer.firmEvents)) multiplayer.firmEvents = [];
  multiplayer.firmEvents.push({...event, receivedAt:performance.now()});
  if(multiplayer.firmEvents.length > 40) multiplayer.firmEvents.splice(0, multiplayer.firmEvents.length - 40);
}

export function installFirmSocketListeners({socket, multiplayer, emitChange, toast}){
  socket.on("firm:snapshot", payload=>{
    multiplayer.firmSnapshot = payload || null;
    multiplayer.firmRanking = payload || null;
    emitChange("firm:snapshot", payload);
  });
  socket.on("firm:ranking", payload=>{
    multiplayer.firmRanking = payload || null;
    if(!multiplayer.firmSnapshot && payload?.personal?.key) multiplayer.firmSnapshot = payload || null;
    emitChange("firm:ranking", payload);
  });
  socket.on("firm:updated", event=>{
    pushFirmEvent(multiplayer, event || {});
    const messages = {
      "shop-buy":"Achat de firme valide.",
      "box-open":`Coffre ouvert : ${event?.reward?.label || "recompense obtenue"}.`,
      "reward-claim":"Recompenses de firme recuperees.",
      "quest-claim":"Prime de quete de firme recuperee.",
      "quest-accept":"Quete de firme acceptee."
    };
    if(messages[event?.action]) toast(messages[event.action]);
    emitChange("firm:updated", event);
  });
  socket.on("firm:error", payload=>{
    toast(payload?.message || "Action de firme impossible.");
    emitChange("firm:error", payload);
  });
}
