export class GameCapacityError extends Error{
  constructor(capacity){
    super(`Serveur complet (${capacity.current}/${capacity.max} joueurs). Reviens dans quelques minutes.`);
    this.name = "GameCapacityError";
    this.code = "SERVER_FULL";
    this.capacity = capacity;
  }
}

function cleanAccountId(value){
  return String(value || "").trim();
}

export function isLiveGamePlayer(player){
  return player
    && player.clientMode === "game"
    && Boolean(player.accountId)
    && (player.connected !== false || Boolean(player.state));
}

export function countLiveGameAccounts(players, {excludeSocketId = ""} = {}){
  const accounts = new Set();
  for(const player of players?.values?.() || []){
    if(String(player?.id || "") === String(excludeSocketId || "")) continue;
    if(!isLiveGamePlayer(player)) continue;
    accounts.add(cleanAccountId(player.accountId));
  }
  return accounts.size;
}

export function hasLiveGameAccount(players, accountId, {excludeSocketId = ""} = {}){
  const cleanId = cleanAccountId(accountId);
  if(!cleanId) return false;
  for(const player of players?.values?.() || []){
    if(String(player?.id || "") === String(excludeSocketId || "")) continue;
    if(!isLiveGamePlayer(player)) continue;
    if(cleanAccountId(player.accountId) === cleanId) return true;
  }
  return false;
}

export function checkGameCapacity({
  players,
  accountId,
  socketId,
  maxConcurrentGamePlayers = 0
} = {}){
  const max = Math.max(0, Math.floor(Number(maxConcurrentGamePlayers || 0)));
  const current = countLiveGameAccounts(players, {excludeSocketId:socketId});
  if(max <= 0){
    return {ok:true, current, max, limited:false};
  }
  if(hasLiveGameAccount(players, accountId, {excludeSocketId:socketId})){
    return {ok:true, current, max, limited:true, existingAccount:true};
  }
  if(current >= max){
    return {
      ok:false,
      current,
      max,
      limited:true,
      code:"SERVER_FULL",
      message:`Serveur complet (${current}/${max} joueurs). Reviens dans quelques minutes.`
    };
  }
  return {ok:true, current, max, limited:true};
}

export function assertGameCapacity(options = {}){
  const capacity = checkGameCapacity(options);
  if(!capacity.ok) throw new GameCapacityError(capacity);
  return capacity;
}

export function publicGameCapacity(capacity = {}){
  return {
    code:capacity.code || "SERVER_FULL",
    message:capacity.message || `Serveur complet (${capacity.current || 0}/${capacity.max || 0} joueurs).`,
    current:Math.max(0, Math.floor(Number(capacity.current || 0))),
    max:Math.max(0, Math.floor(Number(capacity.max || 0))),
    at:Date.now()
  };
}
