import { isAuthenticatedGameplaySession } from "./gameplaySession.js";

// Bind independently from the multiplayer composition so reconnecting sockets
// cannot accumulate travel listeners or replay another journey's events.
export function createSectorTravelConnection({multiplayer, onState = ()=>{}, onError = ()=>{}, onDisconnect = ()=>{}}){
  let boundSocket = null;
  let lastState = null;
  let disposed = false;

  const receiveState = event=>{
    if(!event || typeof event !== "object") return;
    lastState = {...event};
    onState(event);
  };
  const receiveError = event=>{
    if(event && typeof event === "object") onError(event);
  };
  const disconnect = ()=>{
    lastState = null;
    onDisconnect();
  };

  function unbind(){
    if(!boundSocket) return;
    boundSocket.off("travel:state", receiveState);
    boundSocket.off("travel:error", receiveError);
    boundSocket.off("disconnect", disconnect);
    boundSocket = null;
  }

  function updateSocketBinding(){
    if(disposed) return false;
    const next = multiplayer?.socket || null;
    if(next === boundSocket) return Boolean(next);
    const hadSocket = Boolean(boundSocket);
    unbind();
    lastState = null;
    boundSocket = next;
    if(boundSocket){
      boundSocket.on("travel:state", receiveState);
      boundSocket.on("travel:error", receiveError);
      boundSocket.on("disconnect", disconnect);
    }
    if(hadSocket) onDisconnect();
    return Boolean(boundSocket);
  }

  function isConnected(){
    updateSocketBinding();
    return !disposed && isAuthenticatedGameplaySession(multiplayer)
      && multiplayer.socket.connected !== false;
  }

  function start(payload){
    updateSocketBinding();
    if(!isConnected()) return false;
    multiplayer.socket.emit("travel:start", {targetMapId:payload.targetMapId, requestId:payload.requestId});
    return true;
  }

  function cancel(payload = {}){
    updateSocketBinding();
    if(!isConnected()) return false;
    multiplayer.socket.emit("travel:cancel", {
      ...(payload.journeyId ? {journeyId:payload.journeyId} : {}),
      ...(payload.requestId ? {requestId:payload.requestId} : {})
    });
    return true;
  }

  return {updateSocketBinding, start, cancel, isConnected, getState:()=>lastState ? {...lastState} : null,
    dispose(){ disposed = true; unbind(); lastState = null; }};
}
