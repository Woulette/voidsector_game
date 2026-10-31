import { AZURON_GATE_VISUAL_ASSETS, isAnimatedAzuronPortal } from "../../data/azuronGateVisuals.js";
import { drawSectorTravelPortal, getSectorPortalState } from "./sectorPortalVisual.js?v=20261024-sector-portals1";
import { SECTOR_PORTAL_UPRIGHT_ANGLE } from "../../data/sectorPortalVisuals.js?v=20261024-sector-portals1";
import { drawAzuronEnergyField, drawAzuronActivationCore } from "./azuronPortalActivation.js";
import { getWavePortalTier } from "../../data/wavePortalTiers.js";

// Navigation descriptors may be cloned every frame. Keep a stable render-only
// descriptor so particle flow survives, without changing any destination.
const visualPortal={};

function adaptTransition(portal,transition){
  const other=transition?.portal;
  return other && isAnimatedAzuronPortal(other)
    && getWavePortalTier(other)?.id === getWavePortalTier(portal)?.id
    && String(other.id || "") === String(portal.id || "")
    && Number(other.x) === Number(portal.x) && Number(other.y) === Number(portal.y)
    ? {...transition,portal:{...other,prepared:false,targetMap:0}} : null;
}

export function drawAzuronPortal({ctx,cache,portal,player,portalTransition,now,simplified=false}){
  if(!isAnimatedAzuronPortal(portal)) return false;
  const tier=getWavePortalTier(portal) || getWavePortalTier("blue");
  Object.assign(visualPortal,portal,{prepared:false,targetMap:0});
  ctx.save();ctx.filter=tier.filter;
  const drawn=drawSectorTravelPortal({ctx,cache,portal:visualPortal,player,
    transition:adaptTransition(portal,portalTransition),now,simplified,
    visualAssets:AZURON_GATE_VISUAL_ASSETS,energyRenderer:drawAzuronEnergyField});
  ctx.restore();return drawn;
}

export function drawAzuronPortalTransferFocus({ctx,camera,transition}){
  const portal=transition?.portal;
  if(!isAnimatedAzuronPortal(portal)) return;
  const adapted=adaptTransition(portal,transition);
  if(!adapted)return;
  const {charge}=getSectorPortalState(adapted.portal,{transition:adapted});
  if(charge<=0)return;
  const r=(Number(portal.r)||95)*3.25*.314;
  ctx.save();ctx.translate(Number(portal.x)-Number(camera.x),Number(portal.y)-Number(camera.y));
  ctx.filter=getWavePortalTier(portal)?.filter || "none";
  ctx.rotate(SECTOR_PORTAL_UPRIGHT_ANGLE);ctx.scale(.74,1.04);
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
  drawAzuronActivationCore({ctx,r,charge,opacity:.55});ctx.restore();
}
