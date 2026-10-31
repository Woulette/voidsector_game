import { drawSectorTravelPortal } from "./sectorPortalVisual.js?v=20261024-sector-portals1";

// Stage objectives recreate their descriptors each frame. Keep one visual object
// so the existing travel gate retains its particle flow and charging animation.
const exitVisual = {};

export function drawAzuronGate({ctx,cache,portal,now,simplified = false,player,portalTransition}){
  if(!portal?.azuronGate || portal.action !== "exit") return false;
  const targetMap=portalTransition?.portal?.id === portal.id ? portalTransition.portal.targetMap : 0;
  Object.assign(exitVisual,portal,{targetMap});
  return drawSectorTravelPortal({ctx,cache,portal:exitVisual,now,simplified,player,transition:portalTransition});
}
