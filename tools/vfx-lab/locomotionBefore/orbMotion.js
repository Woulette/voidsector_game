import {clamp,smooth} from "../../../src/game/render/vfxPrimitives.js";

export const ORB_CYCLE=6.8;
export const ORB_BURST_START=2.55;
export const ORB_BURST_DURATION=1.05;
export const ORB_BURST_ANGLE=Math.PI*.95;
const TAU=Math.PI*2;

export function orbRotation(time){
  const t=Math.max(0,time),cycle=Math.floor(t/ORB_CYCLE),within=t-cycle*ORB_CYCLE;
  const p=clamp((within-ORB_BURST_START)/ORB_BURST_DURATION);
  const angle=t*.15+(cycle+smooth(p))*ORB_BURST_ANGLE;
  const speed=.15+(p>0 && p<1 ? 6*p*(1-p)*ORB_BURST_ANGLE/ORB_BURST_DURATION : 0);
  return {angle,speed,burst:p>0&&p<1,phase:p>0&&p<1 ? "Relance des branches" : "Rotation lente"};
}

export function orbPose(time,shotAge,branchCount=8){
  const rotation=orbRotation(time);
  const charge=shotAge>=-.38&&shotAge<0 ? smooth((shotAge+.38)/.38) : 0;
  const flash=shotAge>=0&&shotAge<.46 ? Math.exp(-shotAge*10) : 0;
  const expansion=charge*.035+flash*.022;
  return {...rotation,charge,flash,
    branches:Array.from({length:branchCount},(_,i)=>({
      // Small bounded offsets retain separate silhouettes through a spin.
      rotation:rotation.angle+Math.sin(time*1.2+i*TAU/branchCount)*.035,
      extension:1+expansion+Math.sin(time*1.6+i*1.1)*.008
    }))};
}
