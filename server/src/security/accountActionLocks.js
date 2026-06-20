export function createAccountActionLocks({
  rules,
  players,
  logger,
  onLimit,
  now = ()=>Date.now(),
  staleAfterMs = 120000,
  pruneIntervalMs = 60000
} = {}){
  const entries = new Map();
  let nextPruneAt = 0;

  function ruleFor(eventName){
    return rules?.[eventName] || null;
  }

  function accountKey(socket){
    const player = players?.get(socket.id);
    if(player?.accountId) return `account:${player.accountId}`;
    if(player?.clientId) return `guest:${player.clientId}`;
    return `socket:${socket.id}`;
  }

  function prune(currentTime = now()){
    for(const [key, entry] of entries){
      if(currentTime - Number(entry.lastSeenAt || 0) > Math.max(1000, Number(staleAfterMs || 120000))){
        entries.delete(key);
      }
    }
    nextPruneAt = currentTime + Math.max(1000, Number(pruneIntervalMs || 60000));
    return entries.size;
  }

  function allowAccountAction(socket, eventName){
    const rule = ruleFor(eventName);
    if(!rule) return true;
    const currentTime = now();
    if(currentTime >= nextPruneAt) prune(currentTime);
    const key = `${accountKey(socket)}:${eventName}`;
    const minIntervalMs = Math.max(0, Number(rule.minIntervalMs || 0));
    const windowMs = Math.max(100, Number(rule.windowMs || 10000));
    const limit = Math.max(1, Number(rule.limit || 1));
    let entry = entries.get(key);

    if(!entry || currentTime >= Number(entry.resetAt || 0)){
      entry = {
        count:0,
        resetAt:currentTime + windowMs,
        nextAllowedAt:0,
        warned:false,
        lastSeenAt:currentTime
      };
      entries.set(key, entry);
    }

    entry.lastSeenAt = currentTime;

    const tooSoon = minIntervalMs > 0 && currentTime < Number(entry.nextAllowedAt || 0);
    entry.count += 1;
    const overLimit = entry.count > limit;
    if(!tooSoon && !overLimit){
      entry.nextAllowedAt = currentTime + minIntervalMs;
      return true;
    }

    if(!entry.warned || overLimit){
      entry.warned = true;
      const payload = {
        socketId:socket.id,
        accountKey:key.split(":").slice(0, 2).join(":"),
        eventName,
        count:entry.count,
        limit,
        windowMs,
        retryAfterMs:Math.max(0, Number(entry.nextAllowedAt || currentTime) - currentTime)
      };
      logger?.warn?.("Account action limited", payload);
      if(typeof onLimit === "function") onLimit({socket, ...payload});
    }
    return false;
  }

  allowAccountAction.prune = prune;
  allowAccountAction.size = ()=>entries.size;
  return allowAccountAction;
}
