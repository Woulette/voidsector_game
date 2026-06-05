export function createSocketRateLimiter({limits, onLimit} = {}){
  const rules = limits || {};
  const buckets = new Map();

  function ruleFor(eventName){
    return rules[eventName] || rules.default || {limit:120, windowMs:1000};
  }

  return function rateLimit(socket, eventName){
    const rule = ruleFor(eventName);
    const limit = Math.max(1, Number(rule.limit || 1));
    const windowMs = Math.max(100, Number(rule.windowMs || 1000));
    const key = `${socket.id}:${eventName}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if(!bucket || now >= bucket.resetAt){
      buckets.set(key, {count:1, resetAt:now + windowMs, warned:false});
      return true;
    }
    bucket.count += 1;
    if(bucket.count <= limit) return true;
    if(!bucket.warned){
      bucket.warned = true;
      if(typeof onLimit === "function") onLimit({socket, eventName, count:bucket.count, limit, windowMs});
    }
    return false;
  };
}
