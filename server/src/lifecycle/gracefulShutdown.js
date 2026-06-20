function closeSocketServer(io){
  if(!io?.close) return Promise.resolve();
  return new Promise((resolve, reject)=>{
    try{
      io.close(()=>resolve());
    }catch(error){
      reject(error);
    }
  });
}

export function createGracefulShutdown({
  io,
  tickHandle,
  players,
  profileManager,
  closeDatabase,
  logger,
  clearIntervalFn = clearInterval
} = {}){
  let shutdownPromise = null;

  return function shutdown(signal = "shutdown"){
    if(shutdownPromise) return shutdownPromise;
    shutdownPromise = (async()=>{
      logger?.info?.("Graceful shutdown started.", {signal});
      if(tickHandle) clearIntervalFn(tickHandle);
      await closeSocketServer(io);
      for(const player of players?.values?.() || []){
        if(!player?.state) continue;
        profileManager?.saveWorldSession?.({
          player,
          state:player.state,
          force:true
        });
      }
      await profileManager?.flushPersistence?.();
      await closeDatabase?.();
      logger?.info?.("Graceful shutdown complete.", {signal});
    })();
    return shutdownPromise;
  };
}
