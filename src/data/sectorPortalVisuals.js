export const SECTOR_PORTAL_VISUAL_ASSETS = Object.freeze({
  rim:"assets/portals/sector-travel/gate-rim-v1.png",
  energy:"assets/portals/sector-travel/energy-core-v1.png"
});
export const SECTOR_PORTAL_UPRIGHT_ANGLE = -.045;
export function isSectorTravelPortal(portal){
  return Boolean(portal && !portal.prepared && !portal.closed && !portal.damaged && !portal.rickyPortal
    && portal.targetMap != null && portal.targetMap !== ""
    && Number.isInteger(Number(portal.targetMap)) && Number(portal.targetMap) >= 0);
}
export function getSectorPortalAssetPaths(map){
  const portals=Array.isArray(map?.portals)?map.portals:map?.portal?[map.portal]:[];
  return portals.some(isSectorTravelPortal)?Object.values(SECTOR_PORTAL_VISUAL_ASSETS):[];
}
