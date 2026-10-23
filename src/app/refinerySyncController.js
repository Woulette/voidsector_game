const POLL_INTERVAL_MS = 1000;
const REFRESH_INTERVAL_MS = 10000;
// The server limits this read to one request per account every two seconds.
const MIN_REQUEST_INTERVAL_MS = 2000;

export function createRefinerySyncController({
  appMode,
  getCurrentView,
  multiplayer,
  documentRef = globalThis.document,
  now = Date.now,
  setIntervalRef = setInterval,
  clearIntervalRef = clearInterval
}){
  let timer = null;
  let wasEligible = false;
  let entryPending = false;
  let lastRequestAt = null;

  function eligible(){
    return Boolean(appMode === "launcher"
      && getCurrentView?.() === "refinery"
      && documentRef && documentRef.hidden !== true
      && (!documentRef.visibilityState || documentRef.visibilityState === "visible")
      && multiplayer?.connected
      && typeof multiplayer?.socket?.emit === "function"
      && multiplayer?.auth?.account?.id
      && multiplayer?.auth?.profileReady === true);
  }

  function tick(){
    if(!eligible()){
      wasEligible = false;
      return;
    }
    if(!wasEligible){ entryPending = true; wasEligible = true; }
    const currentTime = Number(now());
    if(!Number.isFinite(currentTime)) return;
    const elapsed = lastRequestAt === null ? Infinity : Math.max(0,currentTime-lastRequestAt);
    if(elapsed < MIN_REQUEST_INTERVAL_MS || (!entryPending && elapsed < REFRESH_INTERVAL_MS)) return;
    lastRequestAt = currentTime;
    try{
      // Only the canonical server response updates stock and production.
      multiplayer.socket.emit("profile:refresh");
      entryPending = false;
    }catch{
      entryPending = true;
    }
  }

  function init(){
    if(timer !== null) return;
    tick();
    timer = setIntervalRef(tick,POLL_INTERVAL_MS);
  }

  function destroy(){
    if(timer !== null) clearIntervalRef(timer);
    timer = null;
    wasEligible = false;
    entryPending = false;
  }

  return {init,destroy};
}
