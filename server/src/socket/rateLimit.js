export function createSocketRateLimiter({
  limits,
  onLimit,
  now = ()=>Date.now(),
  pruneIntervalMs = 60000
} = {}){
  const rules = limits || {};
  const buckets = new Map();
  let nextPruneAt = 0;

  function ruleFor(eventName){
    return rules[eventName] || rules.default || {limit:120, windowMs:1000};
  }

  function prune(currentTime = now()){
    for(const [key, bucket] of buckets){
      if(currentTime >= Number(bucket.resetAt || 0)) buckets.delete(key);
    }
    nextPruneAt = currentTime + Math.max(1000, Number(pruneIntervalMs || 60000));
    return buckets.size;
  }

  function releaseSocket(socketOrId){
    const socketId = String(socketOrId?.id || socketOrId || "");
    if(!socketId) return 0;
    const prefix = `${socketId}:`;
    let removed = 0;
    for(const key of buckets.keys()){
      if(!key.startsWith(prefix)) continue;
      buckets.delete(key);
      removed += 1;
    }
    return removed;
  }

  function rateLimit(socket, eventName){
    const rule = ruleFor(eventName);
    const limit = Math.max(1, Number(rule.limit || 1));
    const windowMs = Math.max(100, Number(rule.windowMs || 1000));
    const key = `${socket.id}:${eventName}`;
    const currentTime = now();
    if(currentTime >= nextPruneAt) prune(currentTime);
    const bucket = buckets.get(key);
    if(!bucket || currentTime >= bucket.resetAt){
      buckets.set(key, {count:1, resetAt:currentTime + windowMs, warned:false});
      return true;
    }
    bucket.count += 1;
    if(bucket.count <= limit) return true;
    if(!bucket.warned){
      bucket.warned = true;
      if(typeof onLimit === "function") onLimit({socket, eventName, count:bucket.count, limit, windowMs});
    }
    return false;
  }

  rateLimit.prune = prune;
  rateLimit.releaseSocket = releaseSocket;
  rateLimit.size = ()=>buckets.size;
  return rateLimit;
}
