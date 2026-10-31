import {clamp,smooth} from "./vfxPrimitives.js";

export {ECLANITE_SOURCE,ECLANITE_SCALE} from "../combatData/eclaniteVisuals.js";

const rates=[.87,1.17,1.53,.71,1.29,.95];
const phases=[.3,2.6,5.1,1.4,4.2,3.7];

export function eclaniteAttack(age){
  return {charge:age>=-.26 && age<0 ? smooth((age+.26)/.26) : 0,
    flash:age>=0 && age<.46 ? Math.exp(-age*9) : 0};
}

// Small independent drifts. The geode itself has no rotation or scale pulse.
export function eclaniteCrystalPose(index,time,{charge=0,flash=0,power=0}={}){
  const p=phases[index],t=time;
  const activity=.45+.55*smooth((Math.sin(t*.37+p*1.4)+1)/2);
  const motion=clamp(power);
  return {
    orbit:(Math.sin(t*rates[index]+p)*(.095+motion*.15)*activity+Math.sin(t*.29+p*2)*.025),
    radial:Math.sin(t*(.61+index*.043)+p*1.7)*(.035+motion*.055)-charge*.035+flash*.060,
    twist:Math.sin(t*(.73+index*.113)+p*2.2)*(.065+motion*.115)+flash*(index%2 ? -.025 : .025),
    light:clamp(.5+.5*Math.sin(t*(1.21+index*.15)+p*3))
  };
}
