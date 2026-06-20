const PUBLIC_SOCKET_EVENTS = new Set([
  "auth:register",
  "auth:login",
  "auth:session",
  "auth:logout",
  "player:hello",
  "leaderboard:sync"
]);

const AUTH_REQUIRED_NOTICE_INTERVAL_MS = 2000;

export function isPublicSocketEvent(eventName){
  return PUBLIC_SOCKET_EVENTS.has(String(eventName || ""));
}

export function createGameplayAccountGuard({players, logger, now = Date.now} = {}){
  const lastNoticeBySocket = new WeakMap();

  return function requireGameplayAccount(socket, eventName){
    const cleanEventName = String(eventName || "");
    if(isPublicSocketEvent(cleanEventName)) return true;
    const player = players?.get?.(socket?.id);
    if(player?.accountId) return true;

    const currentTime = Number(now());
    const lastNoticeAt = Number(lastNoticeBySocket.get(socket) || 0);
    if(!lastNoticeAt || currentTime - lastNoticeAt >= AUTH_REQUIRED_NOTICE_INTERVAL_MS){
      lastNoticeBySocket.set(socket, currentTime);
      logger?.warn?.("Unauthenticated gameplay event rejected", {
        socketId:socket?.id || null,
        eventName:cleanEventName
      });
      socket?.emit?.("auth:required", {
        eventName:cleanEventName,
        message:"Compte MMO requis pour jouer.",
        at:currentTime
      });
    }
    return false;
  };
}
