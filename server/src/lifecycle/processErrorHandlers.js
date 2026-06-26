function errorText(error){
  return error?.stack || error?.message || String(error);
}

function recordProcessError({eventName, error, logger, onError, now = ()=>Date.now()} = {}){
  const payload = {
    source:"process",
    eventName:String(eventName || ""),
    error:errorText(error),
    at:now()
  };
  logger?.error?.(`[process] ${payload.eventName}`, payload);
  try{
    onError?.(payload);
  }catch(logError){
    logger?.warn?.("[process] error log failed", {
      eventName:payload.eventName,
      error:errorText(logError),
      at:now()
    });
  }
  return payload;
}

function withTimeout(promise, {
  timeoutMs,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
} = {}){
  const delayMs = Math.max(0, Number(timeoutMs || 0));
  if(!delayMs) return Promise.resolve(promise);
  let timer = null;
  const timeout = new Promise((_, reject)=>{
    timer = setTimeoutFn(()=>reject(new Error(`Fatal shutdown timed out after ${delayMs} ms.`)), delayMs);
    timer?.unref?.();
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(()=>{
    if(timer) clearTimeoutFn(timer);
  });
}

export function createProcessErrorHandlers({
  logger,
  onError,
  shutdown,
  exit = code=>process.exit(code),
  now = ()=>Date.now(),
  fatalShutdownTimeoutMs = 8000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
} = {}){
  let fatalShutdownStarted = false;
  let exited = false;

  function exitOnce(code = 1){
    if(exited) return;
    exited = true;
    exit(code);
  }

  function handleUnhandledRejection(reason){
    recordProcessError({
      eventName:"unhandledRejection",
      error:reason,
      logger,
      onError,
      now
    });
  }

  async function handleUncaughtException(error){
    recordProcessError({
      eventName:"uncaughtException",
      error,
      logger,
      onError,
      now
    });
    if(fatalShutdownStarted){
      exitOnce(1);
      return;
    }
    fatalShutdownStarted = true;
    try{
      await withTimeout(shutdown?.("uncaughtException"), {
        timeoutMs:fatalShutdownTimeoutMs,
        setTimeoutFn,
        clearTimeoutFn
      });
    }catch(shutdownError){
      recordProcessError({
        eventName:"fatalShutdown",
        error:shutdownError,
        logger,
        onError,
        now
      });
    }finally{
      exitOnce(1);
    }
  }

  return {
    handleUnhandledRejection,
    handleUncaughtException
  };
}

export function installProcessErrorHandlers({
  processObject = process,
  ...options
} = {}){
  const handlers = createProcessErrorHandlers(options);
  processObject.on("unhandledRejection", handlers.handleUnhandledRejection);
  processObject.on("uncaughtException", handlers.handleUncaughtException);
  return ()=>{
    processObject.off?.("unhandledRejection", handlers.handleUnhandledRejection);
    processObject.off?.("uncaughtException", handlers.handleUncaughtException);
  };
}
