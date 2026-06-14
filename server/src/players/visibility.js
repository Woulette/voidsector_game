export function getPlayerMapRoom(player, mapId, groups){
  const cleanMapId = String(mapId ?? "0");
  const defaultRoom = `map:${cleanMapId}`;
  const group = player?.groupId ? groups?.get(player.groupId) : null;
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
  if(recipient.groupId && recipient.groupId === candidate.groupId) return true;
  return Boolean(recipient.mapRoom && recipient.mapRoom === candidate.mapRoom);
}
