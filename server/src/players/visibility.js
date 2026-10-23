import { getPlayerInstanceGroup } from "../portals/portalSessions.js";
export function getPlayerMapRoom(player, mapId, groups){
  const cleanMapId = String(mapId ?? "0");
  const defaultRoom = `map:${cleanMapId}`;
  const group = getPlayerInstanceGroup(player, groups);
  const instance = group?.instance;
  if(!instance?.id) return defaultRoom;
  if(instance.abandonedMemberIds?.includes(player?.id)) return defaultRoom;
  if(Array.isArray(instance.joinedMemberIds) && !instance.joinedMemberIds.includes(player?.id)) return defaultRoom;
  if(cleanMapId.startsWith("portal-")){
    return instance.type === "portal" && `portal-${instance.portal?.id}` === cleanMapId
      ? `instance:${instance.id}`
      : defaultRoom;
  }
  if(cleanMapId === "coop-test" && instance.type !== "portal") return `instance:${instance.id}`;
  return defaultRoom;
}

export function canSharePlayerState(recipient, candidate){
  if(!recipient || !candidate) return false;
  if(recipient.id === candidate.id) return true;
  if(recipient.mapRoom && recipient.mapRoom === candidate.mapRoom){
    const portalMap = [recipient,candidate].some(p=>String(p.state?.mapId ?? p.mapId ?? "").startsWith("portal-"));
    return !portalMap || String(recipient.mapRoom).startsWith("instance:");
  }
  if(!recipient.groupId || recipient.groupId !== candidate.groupId) return false;
  const recipientMapId = String(recipient.state?.mapId ?? recipient.mapId ?? "");
  const candidateMapId = String(candidate.state?.mapId ?? candidate.mapId ?? "");
  if(recipientMapId.startsWith("portal-") || candidateMapId.startsWith("portal-")) return false;
  return Boolean(recipientMapId && candidateMapId && recipientMapId === candidateMapId);
}
