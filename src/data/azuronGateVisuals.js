import { FIRMS } from "./firms.js";
import { isWavePortal } from "./wavePortalTiers.js";

export const AZURON_GATE_VISUAL_ASSETS = Object.freeze({
  rim:"assets/portals/azuron-v2/gate-rim.png",
  energy:"assets/portals/azuron-v2/vortex.png"
});

export function isAnimatedAzuronPortal(portal){
  return Boolean(portal && !portal.closed && !portal.damaged && (
    (portal.azuronGate && portal.action === "continue")
    || (portal.prepared && isWavePortal(portal))
  ));
}

export function getAzuronGateAssetPaths(map){
  return map && (isWavePortal(map) || FIRMS.some(firm=>String(firm.baseMapId) === String(map.id)))
    ? Object.values(AZURON_GATE_VISUAL_ASSETS) : [];
}
