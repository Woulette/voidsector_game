import { getMapDisplayName } from "../../data/firms.js";

export function applyMapDisplayNames(maps){
  for(const map of maps){
    map.displayName = getMapDisplayName(map);
    for(const portal of Array.isArray(map.portals) ? map.portals : map.portal ? [map.portal] : []){
      if(!portal?.label || !String(portal.label).startsWith("VERS ")) continue;
      const target = maps.find(entry=>String(entry.id) === String(portal.targetMap));
      if(target) portal.displayLabel = `VERS ${getMapDisplayName(target)}`;
    }
  }
}