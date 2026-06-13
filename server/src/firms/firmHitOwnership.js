export const FIRM_HIT_OWNERSHIP_MS = 15000;

export function getFirmHitOwnerKey(player){
  if(player?.accountId) return `account:${String(player.accountId)}`;
  if(player?.clientId) return `guest:${String(player.clientId)}`;
  return player?.id ? `socket:${String(player.id)}` : "";
}

export function markFirmHitOwner(target, player, now = Date.now()){
  if(!target || !player) return "";
  const key = getFirmHitOwnerKey(player);
  if(!key) return "";
  const currentKey = String(target.firmHitOwnerKey || "");
  const lastAt = Number(target.firmHitOwnerLastAt || 0);
  if(!currentKey || currentKey === key || now - lastAt >= FIRM_HIT_OWNERSHIP_MS){
    target.firmHitOwnerKey = key;
    target.firmHitOwnerLastAt = now;
  }
  return String(target.firmHitOwnerKey || "");
}

export function getFirmHitOwner(target, players, now = Date.now()){
  const key = String(target?.firmHitOwnerKey || "");
  if(!key || now - Number(target?.firmHitOwnerLastAt || 0) >= FIRM_HIT_OWNERSHIP_MS) return null;
  return [...(players?.values?.() || [])].find(player=>getFirmHitOwnerKey(player) === key) || null;
}
