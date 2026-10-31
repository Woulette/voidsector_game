import {clamp,smooth} from "./vfxPrimitives.js";

import {PARASITE_CENTER,PARASITE_ROOT} from "../combatData/parasiteVisuals.js";
import {parasiteTentacleState,parasiteTentacleCurve} from "./parasiteTentacles.js";
export {PARASITE_SOURCE,PARASITE_SCALE,PARASITE_CENTER,PARASITE_ROOT} from "../combatData/parasiteVisuals.js";

export function parasiteAttack(age){
  const charge=age>=-.28 && age<0 ? smooth((age+.28)/.28) : 0;
  const flash=age>=0 && age<.4 ? Math.exp(-age*11) : 0;
  return {charge,flash};
}

// A stable nucleus and six flexible limbs; no autonomous hull rotation.
export function parasiteVertex(arm,r,side,time,{power=0,lagX=0,lagY=0,charge=0,flash=0,root=PARASITE_ROOT,flex=1,limb}={}){
  const angle=-Math.PI/2+arm*Math.PI/3,dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
  const progress=clamp((r-root)/.27),tip=smooth(progress);
  const motion=limb || parasiteTentacleState(arm,time,{power});
  const wave=parasiteTentacleCurve(motion,progress)*tip*flex;
  const retreat=(motion.reach-charge*.020*motion.reaction+flash*.011)*tip*flex;
  return {
    u:PARASITE_CENTER.x+dx*r+nx*side,v:PARASITE_CENTER.y+dy*r+ny*side,
    x:PARASITE_CENTER.x+dx*(r+retreat)+nx*(side+wave)-clamp(lagX,-1,1)*tip*motion.drag*power,
    y:PARASITE_CENTER.y+dy*(r+retreat)+ny*(side+wave)-clamp(lagY,-1,1)*tip*motion.drag*power
  };
}
