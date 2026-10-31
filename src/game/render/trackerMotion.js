import {clamp,smooth} from "./vfxPrimitives.js";
import {getEnemyRenderRotation} from "../../data/enemyVisuals.js";

// The common source already faces up. Its catalogue asset offset is zero;
// the native species still keeps its fixed heading.
export const trackerHeading=(kind,angle)=>getEnemyRenderRotation(kind,angle);

export function trackerAttack(age){
  return {charge:age>=-.28 && age<0 ? smooth((age+.28)/.28) : 0,
    flash:age>=0 && age<.38 ? Math.exp(-age*10) : 0};
}

export function trackerVertex(u,v,{time,power=0,attack={charge:0,flash:0}}){
  const side=u<.5 ? -1 : 1,span=Math.abs(u-.5);
  const roots=[.145,.165,.14].map((x,i)=>({x:.5+side*x,y:[.36,.50,.62][i]}));
  const distance=Math.min(...roots.map(root=>Math.hypot(u-root.x,v-root.y)));
  const shoulder=smooth((span-.12)/.10);
  const hindLeg=smooth((v-.68)/.16)*smooth((span-.055)/.08);
  const weight=(1-(1-shoulder)*(1-hindLeg))*smooth((distance-.015)/.24);
  if(!weight)return {x:u,y:v};
  // Blend the three limb regions continuously: a hard row boundary would
  // tear or invert the mesh once the appendages have a larger excursion.
  const upper=1-smooth((v-.23)/.36);
  const lower=smooth((v-.59)/.28)*(1-smooth((span-.12)/.42));
  const influence=[upper,1-upper-lower,lower];
  let x=0,y=0;
  for(let arm=0;arm<3;arm++){
    const root=roots[arm],dx=u-root.x,dy=v-root.y;
    const phase=time*(1.65+arm*.13)+arm*1.9+side*1.25+Math.sin(time*.41+arm+side)*.45;
    const theta=side*(Math.sin(phase)*(.025+clamp(power)*.165)
      -attack.charge*.065+attack.flash*.045)*weight;
    x+=(root.x+dx*Math.cos(theta)-dy*Math.sin(theta))*influence[arm];
    y+=(root.y+dx*Math.sin(theta)+dy*Math.cos(theta))*influence[arm];
  }
  return {x,y};
}
