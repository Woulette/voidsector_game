import {clamp} from "./vfxPrimitives.js";

// A cosmetic envelope follows real movement and settles without a pose snap.
export function stepLocomotionPower(state,target,dt){
  state.locomotionPower??=0;
  if(dt>0)state.locomotionPower+=(clamp(target)-state.locomotionPower)*(1-Math.exp(-Math.min(dt,2)*7));
  return state.locomotionPower;
}
