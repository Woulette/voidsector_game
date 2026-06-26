function cleanText(value, fallback = "", maxLength = 500){
  const clean = String(value ?? fallback);
  return clean.length > maxLength ? clean.slice(0, maxLength) : clean;
}

function playerForSocket(players, socket){
  return players?.get?.(socket?.id) || null;
}

function socketMeta(socket, players){
  const player = playerForSocket(players, socket);
  return {
    socketId:cleanText(socket?.id || "", "", 120),
    accountId:cleanText(player?.accountId || player?.account?.id || "", "", 120),
    playerId:cleanText(player?.id || socket?.id || "", "", 120),
    mapId:cleanText(player?.state?.mapId ?? player?.mapId ?? "", "", 80)
  };
}

export function buildSocketRateLimitWarning({
  socket,
  eventName,
  count,
  limit,
  windowMs,
  players,
  now = ()=>Date.now()
} = {}){
  return {
    source:"socket-rate-limit",
    severity:"warning",
    eventName:cleanText(eventName, "", 120),
    ...socketMeta(socket, players),
    error:`Socket event rate limit exceeded: ${cleanText(eventName, "unknown", 120)}.`,
    context:{
      count:Number(count || 0),
      limit:Number(limit || 0),
      windowMs:Number(windowMs || 0)
    },
    at:now()
  };
}

export function buildAccountActionLimitWarning({
  socket,
  eventName,
  accountKey,
  count,
  limit,
  windowMs,
  retryAfterMs,
  players,
  now = ()=>Date.now()
} = {}){
  return {
    source:"account-action-lock",
    severity:"warning",
    eventName:cleanText(eventName, "", 120),
    ...socketMeta(socket, players),
    error:`Account action limited: ${cleanText(eventName, "unknown", 120)}.`,
    context:{
      accountKey:cleanText(accountKey, "", 160),
      count:Number(count || 0),
      limit:Number(limit || 0),
      windowMs:Number(windowMs || 0),
      retryAfterMs:Number(retryAfterMs || 0)
    },
    at:now()
  };
}

export function buildAuthRequiredWarning({
  socket,
  eventName,
  players,
  now = ()=>Date.now()
} = {}){
  return {
    source:"auth-required",
    severity:"warning",
    eventName:cleanText(eventName, "", 120),
    ...socketMeta(socket, players),
    error:`Unauthenticated gameplay event rejected: ${cleanText(eventName, "unknown", 120)}.`,
    context:{},
    at:now()
  };
}
