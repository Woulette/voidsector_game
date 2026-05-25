export const MAP_PORTAL_TRANSFER_DURATION = 4;

export function getPortalActivationRadius(portal){
  if(!portal) return 0;
  return portal.activationRadius || Math.max(portal.safeRadius || 0, (portal.r || 90) * 3.0, 280);
}

export function findMapPortalAt({map, point, getMapPortals}){
  if(!map || !point || !getMapPortals) return null;
  return getMapPortals(map).find(portal=>{
    const radius = getPortalActivationRadius(portal);
    return Math.hypot(point.x - portal.x, point.y - portal.y) <= radius;
  }) || null;
}

export function createMapPortalTransition(portal){
  return {portal, elapsed:0, duration:MAP_PORTAL_TRANSFER_DURATION};
}

export function advanceMapPortalTransition(transition, dt){
  if(!transition) return false;
  transition.elapsed += dt;
  return transition.elapsed >= transition.duration;
}
