import {clamp,glow} from "./vfxPrimitives.js";
import {orbPose} from "./orbMotion.js";
import {advanceOrbWake,drawOrbWake} from "./orbWake.js";
import {ORB_VISUAL_PROFILES} from "../combatData/orbVisuals.js";
import {stepLocomotionPower} from "./enemyLocomotion.js";

export const ORB_SPRITE_PATHS=Object.values(ORB_VISUAL_PROFILES).map(profile=>profile.sprite);
const artwork=new Map();
const cache=new WeakMap(),SIZE=384,CENTER=.5*SIZE;
export function setOrbSprite(kind,image){artwork.set(kind,image);}
function layer(){const c=document.createElement("canvas");c.width=c.height=SIZE;return c;}

function prepare(image,profile){
  if(cache.has(image)) return cache.get(image);
  const source=layer(),sourceCtx=source.getContext("2d");
  // Normalize each illustration's padding while keeping its reactor centered.
  const span=SIZE*profile.sourceScale;
  sourceCtx.drawImage(image,CENTER-span*.5,CENTER-span*profile.centerY,span,span);
  const core=layer(),coreCtx=core.getContext("2d"),inner=SIZE*.191;
  coreCtx.beginPath();coreCtx.arc(CENTER,CENTER,inner,0,Math.PI*2);coreCtx.clip();coreCtx.drawImage(source,0,0);
  const emission=layer(),emissionCtx=emission.getContext("2d");
  emissionCtx.beginPath();emissionCtx.arc(CENTER,CENTER,SIZE*.107,0,Math.PI*2);emissionCtx.clip();emissionCtx.drawImage(source,0,0);
  const branches=Array.from({length:profile.branches},(_,i)=>{
    const canvas=layer(),ctx=canvas.getContext("2d"),a=profile.offset+i*Math.PI*2/profile.branches,half=Math.PI/profile.branches;
    ctx.beginPath();ctx.moveTo(CENTER,CENTER);
    ctx.arc(CENTER,CENTER,SIZE*.6,a-half,a+half);ctx.closePath();ctx.clip();ctx.drawImage(source,0,0);
    ctx.globalCompositeOperation="destination-out";
    ctx.beginPath();ctx.arc(CENTER,CENTER,inner-.35,0,Math.PI*2);ctx.fill();return canvas;
  });
  const result={core,emission,branches};cache.set(image,result);return result;
}

export function drawOrbSentinel(ctx,enemy,time,shotAge,dt,state,image){
  const profile=ORB_VISUAL_PROFILES[enemy.kind],art=image||artwork.get(enemy.kind);
  if(!profile) return;
  if(!art?.complete||!art.naturalWidth) return;
  state.wake??={};
  if(state.time!==time){advanceOrbWake(state.wake,enemy,dt);state.time=time;}
  drawOrbWake(ctx,state.wake);
  const motion=stepLocomotionPower(state,state.wake.power || 0,dt);
  const pose=orbPose(time,shotAge,profile.branches,motion),texture=prepare(art,profile),size=Math.min(enemy.width,enemy.height)*profile.size;
  const charge=pose.charge*profile.light,flash=pose.flash*profile.light;
  ctx.save();ctx.translate(enemy.x,enemy.y);
  // Core and bearings stay in place; only the separated branch layers rotate.
  glow(ctx,0,0,size*.28,"rgba(40,158,238,1)",.12*profile.light+charge*.25+flash*.35);
  ctx.fillStyle="#081724";ctx.beginPath();ctx.arc(0,0,size*.198,0,Math.PI*2);ctx.fill();
  for(let i=0;i<profile.branches;i++){
    const branch=pose.branches[i];ctx.save();ctx.rotate(branch.rotation);ctx.scale(branch.extension,branch.extension);
    ctx.drawImage(texture.branches[i],-size/2,-size/2,size,size);ctx.restore();
  }
  ctx.drawImage(texture.core,-size/2,-size/2,size,size);
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=clamp(.06*profile.light+charge*.50+flash*.96);
  ctx.drawImage(texture.emission,-size/2,-size/2,size,size);ctx.restore();
  glow(ctx,0,0,size*(.105+pose.charge*.045),"rgba(106,235,255,1)",charge*.5+flash*.9);
  glow(ctx,0,0,size*.052,"rgba(244,255,255,1)",flash*.72);
  if(pose.flash>.08){
    const radius=size*(.11+(1-pose.flash)*.08);
    ctx.strokeStyle=`rgba(119,230,255,${flash*.6})`;ctx.lineWidth=.7;
    ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore();
  return pose;
}
