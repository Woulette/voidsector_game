import {ORB_VISUAL_PROFILES,isOrbKind} from "../combatData/orbVisuals.js";
import {getCachedCombatImage} from "../combatAssets.js";
import {drawOrbSentinel} from "./orbSprite.js";

const visualStates=new WeakMap();

// Cosmetic state lives outside the interpolated, server-controlled enemy.
export function stepOrbRuntime(state,enemy,time){
  const elapsed=state.lastAt===undefined ? 0 : Math.max(0,(time-state.lastAt)/1000);
  state.lastAt=time;
  if(elapsed>.25 && state.wake) state.wake.position={x:enemy.x,y:enemy.y};
  const pulse=Math.max(0,Number(enemy.attackT||0));
  if(pulse>0 && (state.shotAt===undefined || pulse>Number(state.previousPulse||0)+.015)){
    state.shotAt=time/1000-Math.max(0,.22-pulse);
  }
  state.previousPulse=pulse;
  return {dt:Math.min(2,elapsed),shotAge:state.shotAt===undefined ? -10 : time/1000-state.shotAt};
}

export function drawAnimatedOrb({ctx,camera,cache,enemy,time,phase=0}){
  if(!isOrbKind(enemy.kind)) return false;
  const image=getCachedCombatImage(cache,ORB_VISUAL_PROFILES[enemy.kind].sprite);
  if(!image?.complete||!image.naturalWidth) return false;
  let state=visualStates.get(enemy);
  if(!state){state={};visualStates.set(enemy,state);}
  const {dt,shotAge}=stepOrbRuntime(state,enemy,time);
  ctx.save();ctx.translate(-camera.x,-camera.y);
  drawOrbSentinel(ctx,enemy,time/1000+phase*.013,shotAge,dt,state,image);
  ctx.restore();
  return true;
}
