import { WORLD_MAPS } from "../world/definitions.js";
import { getFirmMapId } from "../../../src/data/firms.js";

export const PREPARED_PORTAL_RADIUS = 115;
export const PREPARED_PORTAL_SAFE_RADIUS = 280;
export const PREPARED_PORTAL_INTERACTION_RADIUS = 430;
export const PREPARED_PORTAL_SPAWN_OFFSET = 520;

function getPortalDisplayName(portal){
  return String(portal?.name || "Portail");
}

export function getPreparedPortalPlacement(firmId){
  const mapId = String(getFirmMapId(firmId, 1));
  const map = WORLD_MAPS[mapId] || WORLD_MAPS["0"];
  const spawn = map?.spawn || {x:0, y:0};
  const spawnX = Number(spawn.x || 0);
  const spawnY = Number(spawn.y || 0);
  const towardCenterX = spawnX < 0 ? 1 : -1;
  const towardCenterY = spawnY < 0 ? 1 : -1;
  return {
    mapId,
    mapName:String(map?.name || mapId),
    x:spawnX + towardCenterX * PREPARED_PORTAL_SPAWN_OFFSET,
    y:spawnY + towardCenterY * PREPARED_PORTAL_SPAWN_OFFSET
  };
}

export function publicPreparedPortal(preparedPortal){
  if(!preparedPortal) return null;
  const portalName = getPortalDisplayName(preparedPortal.portal);
  return {
    id:String(preparedPortal.id || ""),
    portalId:String(preparedPortal.portalId || preparedPortal.portal?.id || ""),
    portal:preparedPortal.portal || null,
    mapId:String(preparedPortal.mapId || ""),
    mapName:String(preparedPortal.mapName || ""),
    x:Number(preparedPortal.x || 0),
    y:Number(preparedPortal.y || 0),
    r:Number(preparedPortal.r || PREPARED_PORTAL_RADIUS),
    safeRadius:Number(preparedPortal.safeRadius || PREPARED_PORTAL_SAFE_RADIUS),
    activationRadius:Number(preparedPortal.activationRadius || PREPARED_PORTAL_INTERACTION_RADIUS),
    label:portalName.toUpperCase(),
    displayLabel:portalName.toUpperCase(),
    dungeonPortal:true,
    prepared:true,
    preparedAt:Number(preparedPortal.preparedAt || 0)
  };
}

export function isPlayerAtPreparedPortal(player, preparedPortal){
  if(!player?.state || !preparedPortal) return false;
  if(String(player.state.mapId || player.mapId || "") !== String(preparedPortal.mapId || "")) return false;
  const distance = Math.hypot(
    Number(player.state.x || 0) - Number(preparedPortal.x || 0),
    Number(player.state.y || 0) - Number(preparedPortal.y || 0)
  );
  return distance <= Math.max(PREPARED_PORTAL_INTERACTION_RADIUS, Number(preparedPortal.activationRadius || 0));
}
