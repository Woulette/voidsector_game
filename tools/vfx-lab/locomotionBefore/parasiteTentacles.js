import {clamp,smooth,mix} from "../../../src/game/render/vfxPrimitives.js";

const rates=Object.freeze([1.17,1.83,.94,1.51,2.07,1.34]);
const phases=Object.freeze([.38,3.17,1.79,5.43,2.61,4.36]);
const hash=n=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);};
function drift(time,seed){
  const n=Math.floor(time),f=smooth(time-n);
  return mix(hash(n+seed),hash(n+1+seed),f);
}

// Each limb has its own changing activity and curvature, including soft
// rests. Evaluate six states per draw, then reuse them for every mesh strip.
export function parasiteTentacleState(arm,time,{power=0,boss=false}={}){
  const seed=arm*43.7+17.3,t=time*(boss ? .79 : 1),phase=phases[arm];
  const activity=.18+.82*smooth((drift(t*(.37+arm*.017)+phase,seed)-.22)/.57);
  const bendPhase=t*rates[arm]+phase+Math.sin(t*.31+phase)*.65;
  const strength=(boss ? 1.1 : 1)*(.82+clamp(power)*.25);
  return {
    sweep:(Math.sin(bendPhase)*.060+Math.sin(t*.67+phase*2.3)*.018)*activity*strength,
    curl:(drift(t*(.51+arm*.023)+phase*2,seed+91)-.5)*.090*strength,
    reach:(drift(t*.43+phase*3,seed+173)-.5)*.030*strength,
    ripplePhase:t*(2.5+arm*.173)+phase*1.7,
    ripple:(.006+clamp(power)*.005)*activity*strength,
    drag:.019+drift(t*.27+phase,seed+271)*.018,
    reaction:.76+arm*.065,
    activity
  };
}

export function parasiteTentacleCurve(limb,progress){
  const p=clamp(progress);
  return limb.sweep+limb.curl*p
    +Math.sin(limb.ripplePhase-p*6.4)*limb.ripple*p;
}
