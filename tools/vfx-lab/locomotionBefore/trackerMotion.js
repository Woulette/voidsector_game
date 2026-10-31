import {clamp,smooth} from "../../../src/game/render/vfxPrimitives.js";
import {getEnemyRenderRotation} from "../../../src/data/enemyVisuals.js";

// The common source already faces up. Its catalogue asset offset is zero;
// the native species still keeps its fixed heading.
export const trackerHeading=(kind,angle)=>getEnemyRenderRotation(kind,angle);

export function trackerAttack(age){
  return {charge:age>=-.28 && age<0 ? smooth((age+.28)/.28) : 0,
    flash:age>=0 && age<.38 ? Math.exp(-age*10) : 0};
}

export function trackerVertex(u,v,{time,power=0,attack={charge:0,flash:0}}){
  const side=u<.5 ? -1 : 1,span=Math.abs(u-.5);
  const arm=v<.43 ? 0 : span>.235 || v<.59 ? 1 : 2;
  const rootX=.5+side*[.145,.165,.14][arm],rootY=[.36,.50,.62][arm];
  const dx=u-rootX,dy=v-rootY;
  const weight=smooth((span-.12)/.10)*smooth((Math.hypot(dx,dy)-.015)/.17);
  if(!weight)return {x:u,y:v};
  const phase=time*(1.5+clamp(power)*1.5)+arm*1.9+side*1.25;
  const theta=side*(Math.sin(phase)*(.025+clamp(power)*.055)
    -attack.charge*.065+attack.flash*.045)*weight;
  return {x:rootX+dx*Math.cos(theta)-dy*Math.sin(theta),
    y:rootY+dx*Math.sin(theta)+dy*Math.cos(theta)};
}
