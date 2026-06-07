export function createAccountActionLocks({rules, players, logger, onLimit} = {}){
  const entries = new Map();

  function ruleFor(eventName){
    return rules?.[eventName] || null;
  }

  function accountKey(socket){
    const player = players?.get(socket.id);
    if(player?.accountId) return `account:${player.accountId}`;
    if(player?.clientId) return `guest:${player.clientId}`;
    return `socket:${socket.id}`;
  }

  function prune(now){
    if(entries.size < 5000) return;
    for(const [key, entry] of entries){
      if(now - Number(entry.lastSeenAt || 0) > 120000) entries.delete(key);
    }
  }

  return function allowAccountAction(socket, eventName){
    const rule = ruleFor(eventName);
    if(!rule) return true;
    const now = Date.now();
    const key = `${accountKey(socket)}:${eventName}`;
    const minIntervalMs = Math.max(0, Number(rule.minIntervalMs || 0));
    const windowMs = Math.max(100, Number(rule.windowMs || 10000));
    const limit = Math.max(1, Number(rule.limit || 1));
    let entry = entries.get(key);

    if(!entry || now >= Number(entry.resetAt || 0)){
      entry = {
        count:0,
        resetAt:now + windowMs,
        nextAllowedAt:0,
        warned:false,
        lastSeenAt:now
      };
      entries.set(key, entry);
    }

    entry.lastSeenAt = now;
    prune(now);

    const tooSoon = minIntervalMs > 0 && now < Number(entry.nextAllowedAt || 0);
    entry.count += 1;
    const overLimit = entry.count > limit;
    if(!tooSoon && !overLimit){
      entry.nextAllowedAt = now + minIntervalMs;
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
        retryAfterMs:Math.max(0, Number(entry.nextAllowedAt || now) - now)
      };
      logger?.warn?.("Account action limited", payload);
      if(typeof onLimit === "function") onLimit({socket, ...payload});
    }
    return false;
  };
}
