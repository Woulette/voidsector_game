const motionPreference=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");

// Animate only the rendered alpha; world anchors and the fixed minimap stay immutable.
export function getMapSceneryAlpha(layer,now=performance.now(),reducedMotion=motionPreference?.matches){
  const base=Number.isFinite(layer.alpha)?layer.alpha:1;
  const pulse=layer.lightPulse;
  if(!pulse || reducedMotion || !Number.isFinite(now) || !(pulse.period>0))return base;
  const amplitude=Number.isFinite(pulse.amplitude)?Math.max(0,Math.min(1,pulse.amplitude)):0;
  return Math.max(0,Math.min(1,base*(1+amplitude*Math.sin(now/1000*Math.PI*2/pulse.period))));
}
