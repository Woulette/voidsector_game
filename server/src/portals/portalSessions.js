// Personal runs share the combat runtime interface, never social group membership.
const personalGroups = new WeakMap();

function registry(groups){
  if(!groups || typeof groups !== "object") return null;
  if(!personalGroups.has(groups)) personalGroups.set(groups,new Map());
  return personalGroups.get(groups);
}

function ownerKey(player){
  const accountId = String(player?.accountId || player?.account?.id || "");
  return accountId ? `solo:account:${accountId}` : player?.id ? `solo:player:${player.id}` : "";
}

export function getPersonalPortalGroup(player, groups, {create = false} = {}){
  const key = ownerKey(player), sessions = registry(groups);
  if(!key || !sessions) return null;
  if(create && !sessions.has(key)){
    sessions.set(key,{id:key,personalPortal:true,leaderId:player.id,members:[player.id],instance:null});
  }
  return sessions.get(key) || null;
}

export function getPlayerInstanceGroup(player, groups){
  const personal = getPersonalPortalGroup(player,groups);
  const instance = personal?.instance;
  const mapId = String(player?.state?.mapId ?? player?.mapId ?? "");
  if(instance && (!instance.completed || mapId === `portal-${instance.portal?.id}`)
    && instance.joinedMemberIds?.includes(player?.id)
    && !instance.abandonedMemberIds?.includes(player?.id)) return personal;
  return player?.groupId ? groups?.get(player.groupId) || null : null;
}

export function getInstanceGroup(groups,id){
  return groups?.get(id) || registry(groups)?.get(id) || null;
}

export function getInstanceGroups(groups){
  return [...(groups?.values() || []),...(registry(groups)?.values() || [])];
}

export function releasePersonalPortalGroup(groups,group){
  if(!group?.personalPortal) return false;
  group.instance = null;
  return registry(groups)?.delete(group.id) || false;
}
