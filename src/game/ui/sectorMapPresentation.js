// Presentation coordinates for the stellar overview. Routes are always read
// from the supplied maps, never inferred from this visual arrangement.
const STELLAR_CELL_POSITIONS = [[12,15], [22,28], [18,42], [36,23], [37,42]];

export function getStellarMapPosition(mapName){
  const name = String(mapName || "").toUpperCase();
  if(name === "CORE") return {x:50, y:50};
  const match = name.match(/^(HELION|NEREID|AUREON|SYLVA)-0?([1-5])$/);
  if(!match) return null;
  const [left, top] = STELLAR_CELL_POSITIONS[Number(match[2]) - 1];
  const right = match[1] === "AUREON" || match[1] === "SYLVA";
  const bottom = match[1] === "HELION" || match[1] === "SYLVA";
  return {x:right ? 100 - left : left, y:bottom ? 100 - top : top};
}

export function getSectorMapPortals(map){
  return Array.isArray(map?.portals) ? map.portals : map?.portal ? [map.portal] : [];
}

export function getStellarMapConnections(maps){
  const byId = new Map(maps.filter(map=>map?.id != null && getStellarMapPosition(map.name)).map(map=>[String(map.id), map]));
  const seen = new Set();
  const connections = [];
  for(const from of byId.values()){
    for(const portal of getSectorMapPortals(from)){
      if(portal?.targetMap == null) continue;
      const to = byId.get(String(portal.targetMap));
      if(!to || to === from) continue;
      const key = [String(from.id), String(to.id)].sort().join(":");
      if(seen.has(key)) continue;
      seen.add(key);
      connections.push({from, to});
    }
  }
  return connections;
}

export function getStellarTravelRoute(travelState){
  if(!travelState?.active) return [];
  const route = travelState.routeMapIds || travelState.route || [];
  return Array.isArray(route) ? route.map(entry=>String(entry?.mapId ?? entry?.id ?? entry)) : [];
}
