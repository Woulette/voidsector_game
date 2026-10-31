import {VORAK_VISUAL_PROFILES,VORAK_THRUSTER_TEXTURE,isVorakKind} from "../combatData/vorakVisuals.js";
import {getCachedCombatImage} from "../combatAssets.js";
import {drawVorakRusher,setVorakArtwork} from "./vorakSprite.js";
import {vorakHeading} from "./vorakMotion.js";

const visualStates=new WeakMap();

// Keep cosmetics separate from the interpolated, authoritative entity.
export function stepVorakRuntime(state,enemy,time){
  const elapsed=state.lastAt===undefined ? 0 : Math.max(0,(time-state.lastAt)/1000);
  state.lastAt=time;
  if(elapsed>.25 && state.wake){
    state.wake.position={x:enemy.x,y:enemy.y,angle:vorakHeading(enemy)};
    state.wake.gap=0;state.wake.carry=0;state.wake.power=0;state.wake.turn=0;
  }
  const pulse=Math.max(0,Number(enemy.attackT || 0));
  if(pulse>0 && (state.shotAt===undefined || pulse>Number(state.previousPulse || 0)+.015)){
    state.shotAt=time/1000-Math.max(0,.22-pulse);
  }
  state.previousPulse=pulse;
  return {dt:Math.min(2,elapsed),shotAge:state.shotAt===undefined ? -10 : time/1000-state.shotAt};
}

export function drawAnimatedVorak({ctx,camera,cache,enemy,time,phase=0}){
  if(!isVorakKind(enemy.kind)) return false;
  const image=getCachedCombatImage(cache,VORAK_VISUAL_PROFILES[enemy.kind].sprite);
  const engines=getCachedCombatImage(cache,VORAK_THRUSTER_TEXTURE);
  // Do not flash the legacy body/idle effects while the approved art decodes.
  if(!image?.complete || !image.naturalWidth) return true;
  setVorakArtwork(enemy.kind,image,engines);
  let state=visualStates.get(enemy);
  if(!state){state={};visualStates.set(enemy,state);}
  const {dt,shotAge}=stepVorakRuntime(state,enemy,time);
  ctx.save();ctx.translate(-camera.x,-camera.y);
  drawVorakRusher(ctx,enemy,time/1000+phase*.013,shotAge,dt,state);
  ctx.restore();return true;
}
