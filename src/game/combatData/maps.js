import { MAPS } from "./mapDefinitions.js";
import { applyMapDisplayNames } from "./mapDisplayNames.js";
import { getRickyUnlockedPortal, installFirmRickyPortals, isRickyPortalUnlocked } from "./rickyPortalClient.js";
import { installSectorGraph } from "./sectorGraph.js";

export { MAPS, isRickyPortalUnlocked };

installSectorGraph(MAPS);
installFirmRickyPortals(MAPS);
applyMapDisplayNames(MAPS);

function getBaseMapPortals(map){
  if(!map) return [];
  if(Array.isArray(map.portals)) return map.portals;
  return map.portal ? [map.portal] : [];
}

export function getMapPortals(map, options = {}){
  const base = getBaseMapPortals(map);
  if(!isRickyPortalUnlocked(map, options.completedQuestClaims, options.questProgress)) return base;
  const rickyPortal = getRickyUnlockedPortal(map);
  if(!rickyPortal) return base;
  if(base.some(portal=>(portal.rickyPortal || portal.portalId === rickyPortal.portalId)
    && Number(portal.x) === Number(rickyPortal.x)
    && Number(portal.y) === Number(rickyPortal.y))){
    return base;
  }
  return [...base, rickyPortal];
}

export function getClosedMapPortals(map, options = {}){
  const closed = Array.isArray(map?.closedPortals) ? map.closedPortals : [];
  if(!closed.length) return [];
  return isRickyPortalUnlocked(map, options.completedQuestClaims, options.questProgress) ? [] : closed;
}