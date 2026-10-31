import { MAPS } from "../../../src/game/combatData/maps.js";
import { WORLD_MAPS } from "../world/definitions.js";

// Reuse the installed sector graph: decorative, closed and instance portals
// never become automatic-travel connections.
export function createSectorTravelRoutes({maps = MAPS, worldMaps = WORLD_MAPS} = {}){
  const sectors = new Map(maps
    .filter(map=>worldMaps[String(map.id)] && map.playable !== false)
    .map(map=>[String(map.id), map]));

  function leg(fromMapId, toMapId){
    const from = sectors.get(String(fromMapId));
    const to = sectors.get(String(toMapId));
    if(!from || !to) return null;
    const portals = Array.isArray(from.portals) ? from.portals : from.portal ? [from.portal] : [];
    const portal = portals.find(entry=>String(entry.targetMap) === String(toMapId)
      && !entry.closed && !entry.locked && !entry.damaged
      && !entry.dungeonPortal && !entry.portalId
      && [entry.x, entry.y, entry.targetX, entry.targetY].every(Number.isFinite));
    if(!portal) return null;
    return {
      fromMapId:String(from.id), toMapId:String(to.id),
      x:portal.x, y:portal.y, targetX:portal.targetX, targetY:portal.targetY,
      activationRadius:portal.activationRadius || Math.max(portal.safeRadius || 0, (portal.r || 90) * 3, 280)
    };
  }

  function find(fromMapId, toMapId){
    const from = String(fromMapId ?? "");
    const to = String(toMapId ?? "");
    if(!sectors.has(from) || !sectors.has(to)) return null;
    const queue = [[from]];
    const visited = new Set([from]);
    for(let index = 0; index < queue.length; index += 1){
      const route = queue[index];
      const current = route.at(-1);
      if(current === to) return route;
      for(const candidate of sectors.keys()){
        if(visited.has(candidate) || !leg(current, candidate)) continue;
        visited.add(candidate);
        queue.push([...route, candidate]);
      }
    }
    return null;
  }

  return {find, leg};
}
