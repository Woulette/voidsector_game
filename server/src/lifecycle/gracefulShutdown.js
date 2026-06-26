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

function errorMessage(error){
  return error?.stack || error?.message || String(error);
}

function recordShutdownError({errors, logger, signal, step, error} = {}){
  errors.push(error);
  logger?.error?.("Graceful shutdown step failed.", {
    signal,
    step,
    error:errorMessage(error)
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
      const errors = [];
      if(tickHandle) clearIntervalFn(tickHandle);
      try{
        await closeSocketServer(io);
      }catch(error){
        recordShutdownError({errors, logger, signal, step:"socket-close", error});
      }
      for(const player of players?.values?.() || []){
        if(!player?.state) continue;
        try{
          await profileManager?.saveWorldSession?.({
            player,
            state:player.state,
            force:true
          });
        }catch(error){
          recordShutdownError({errors, logger, signal, step:`save-world-session:${player.id || "unknown"}`, error});
        }
      }
      try{
        await profileManager?.flushPersistence?.();
      }catch(error){
        recordShutdownError({errors, logger, signal, step:"flush-persistence", error});
      }
      try{
        await closeDatabase?.();
      }catch(error){
        recordShutdownError({errors, logger, signal, step:"database-close", error});
      }
      if(errors.length){
        logger?.error?.("Graceful shutdown completed with errors.", {
          signal,
          errorCount:errors.length
        });
        throw new AggregateError(errors, "Graceful shutdown failed.");
      }
      logger?.info?.("Graceful shutdown complete.", {signal});
    })();
    return shutdownPromise;
  };
}
