// These encounters share Azuron's level-ten enemies and wave schedule. The
// difficulty multiplier is applied afterwards, never as a second level scaling.
export const WAVE_PORTAL_TIERS=Object.freeze({
  blue:Object.freeze({id:"blue",level:10,multiplier:1,color:"#51c7ff",filter:"none",entryLabel:"ENTRÉE DANS AZURON"}),
  violet:Object.freeze({id:"violet",level:15,multiplier:2,color:"#ffbd45",filter:"hue-rotate(190deg) saturate(1.35) brightness(1.15)",entryLabel:"ENTRÉE DANS VESPER"}),
  red:Object.freeze({id:"red",level:20,multiplier:3,color:"#ff5744",filter:"hue-rotate(150deg) saturate(2) brightness(1.03)",entryLabel:"ENTRÉE DANS KHARON"})
});

export function getWavePortalTier(value){
  const id=String(value?.portalId || value?.portal?.id || value?.id || value || "").replace(/^portal-/,"");
  return WAVE_PORTAL_TIERS[id] || null;
}

export const isWavePortal=value=>Boolean(getWavePortalTier(value));

export function getWavePortalCompletionReward(portalId){
  const tier=getWavePortalTier(portalId);
  if(!tier)return null;
  return Object.fromEntries(Object.entries({credits:1_000_000,xp:500_000,reputation:50_000,premium:10_000,ammoX4:10_000})
    .map(([key,value])=>[key,value*tier.multiplier]));
}
