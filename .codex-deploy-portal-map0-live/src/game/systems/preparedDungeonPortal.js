export function getPreparedDungeonPortalForMap(prepared, map){
  if(!prepared || !map) return null;
  if(String(prepared.mapId ?? "") !== String(map.id ?? "")) return null;
  const portalId = String(prepared.portalId || prepared.portal?.id || "");
  if(!portalId) return null;
  return {
    ...prepared,
    portalId,
    dungeonPortal:true,
    prepared:true,
    r:Number(prepared.r || 115),
    safeRadius:Number(prepared.safeRadius || 280),
    activationRadius:Number(prepared.activationRadius || 430),
    label:prepared.label || prepared.portal?.name || "PORTAIL PREPARE",
    displayLabel:prepared.displayLabel || prepared.portal?.name || "PORTAIL PREPARE"
  };
}
