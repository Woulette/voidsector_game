const DEFAULT_UNPROTECTED_EVENTS = new Set();

function errorText(error){
  return error?.stack || error?.message || String(error);
}

function playerMeta(player){
  return {
    accountId:player?.accountId || player?.account?.id || null,
    playerId:player?.id || null,
    mapId:player?.state?.mapId ?? player?.mapId ?? null
  };
}

export function buildSocketHandlerErrorMeta({
  socket,
  eventName,
  error,
  getPlayer,
  now = ()=>Date.now()
} = {}){
  const player = typeof getPlayer === "function" ? getPlayer(socket) : null;
  return {
    eventName:String(eventName || ""),
    socketId:socket?.id || null,
    ...playerMeta(player),
    error:errorText(error),
    at:now()
  };
}

export function wrapSocketHandler(socket, eventName, handler, {
  logger,
  getPlayer,
  now = ()=>Date.now(),
  notifyClient = true,
  onError
} = {}){
  return async function safeSocketListener(...args){
    try{
      await handler(...args);
    }catch(error){
      const meta = buildSocketHandlerErrorMeta({
        socket,
        eventName,
        error,
        getPlayer,
        now
      });
      logger?.error?.("[socket] handler failed", meta);
      try{
        onError?.({source:"socket", ...meta});
      }catch(logError){
        logger?.warn?.("[socket] error log failed", {
          eventName:String(eventName || ""),
          error:logError?.message || String(logError)
        });
      }
      if(notifyClient && String(eventName || "") !== "disconnect"){
        socket?.emit?.("server:error", {
          eventName:String(eventName || ""),
          message:"Erreur serveur sur cette action.",
          at:now()
        });
      }
    }
  };
}

export function installSafeSocketHandlers(socket, {
  logger,
  getPlayer,
  now = ()=>Date.now(),
  unprotectedEvents = DEFAULT_UNPROTECTED_EVENTS,
  onError
} = {}){
  const originalOn = socket.on.bind(socket);
  socket.on = function safeOn(eventName, handler){
    if(typeof handler !== "function" || unprotectedEvents.has(String(eventName || ""))){
      return originalOn(eventName, handler);
    }
    return originalOn(eventName, wrapSocketHandler(socket, eventName, handler, {
      logger,
      getPlayer,
      now,
      onError
    }));
  };
  return ()=>{
    socket.on = originalOn;
  };
}
