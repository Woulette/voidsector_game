import {ECLANITE_SOURCE,isEclaniteKind} from "../combatData/eclaniteVisuals.js";
import {getCachedCombatImage} from "../combatAssets.js";
import {drawEclanite,setEclaniteArtwork} from "./eclaniteSprite.js";

const visualStates=new WeakMap();

// Received shots drive the flash; authoritative enemy objects stay untouched.
export function stepEclaniteRuntime(state,enemy,time){
  const elapsed=state.lastAt===undefined ? 0 : Math.max(0,(time-state.lastAt)/1000);
  state.lastAt=time;
  if(elapsed>.25 && state.wake){
    state.wake.position={x:enemy.x,y:enemy.y};
    state.wake.gap=0;state.wake.carry=0;state.wake.power=0;state.wake.vx=state.wake.vy=0;
  }
  const pulse=Math.max(0,Number(enemy.attackT || 0));
  if(pulse>0 && (state.shotAt===undefined || pulse>Number(state.previousPulse || 0)+.015)){
    state.shotAt=time/1000-Math.max(0,.22-pulse);
  }
  state.previousPulse=pulse;
  return {dt:Math.min(2,elapsed),shotAge:state.shotAt===undefined ? -10 : time/1000-state.shotAt};
}

export function drawAnimatedEclanite({ctx,camera,cache,enemy,time,phase=0}){
  if(!isEclaniteKind(enemy.kind))return false;
  const image=getCachedCombatImage(cache,ECLANITE_SOURCE);
  if(!image?.complete || !image.naturalWidth)return true;
  setEclaniteArtwork(image);
  let state=visualStates.get(enemy);
  if(!state){state={};visualStates.set(enemy,state);}
  const {dt,shotAge}=stepEclaniteRuntime(state,enemy,time);
  ctx.save();ctx.translate(-camera.x,-camera.y);
  drawEclanite(ctx,enemy,time/1000+phase*.013,shotAge,dt,state);
  ctx.restore();return true;
}
