import {clamp,glow} from "../../../src/game/render/vfxPrimitives.js";
import {vorakSize,vorakHeading,vorakPose} from "./vorakMotion.js";
import {advanceVorakWake,drawVorakWake} from "../../../src/game/render/vorakWake.js";
import {VORAK_VISUAL_PROFILES} from "../../../src/game/combatData/vorakVisuals.js";

export const VORAK_SPRITE_PATHS=Object.values(VORAK_VISUAL_PROFILES).map(profile=>profile.sprite);
const SIZE=384,cache=new WeakMap();
const artwork=new Map();
let jet,jetSource;
function canvas(){const c=document.createElement("canvas");c.width=c.height=SIZE;return c;}

export function setVorakArtwork(kind,image,engineAtlas){
  artwork.set(kind,image);
  if(!engineAtlas?.naturalWidth || jetSource===engineAtlas) return;
  jetSource=engineAtlas;
  jet=document.createElement("canvas");jet.width=engineAtlas.naturalWidth;jet.height=engineAtlas.naturalHeight;
  const ctx=jet.getContext("2d",{willReadFrequently:true});ctx.drawImage(engineAtlas,0,0);
  const data=ctx.getImageData(0,0,jet.width,jet.height);
  for(let i=0;i<data.data.length;i+=4){
    const value=(data.data[i]*.2126+data.data[i+1]*.7152+data.data[i+2]*.0722)/255;
    const hot=clamp((value-.35)/.5);
    data.data[i]=255;data.data[i+1]=70+hot*177;data.data[i+2]=35+hot*193;
  }
  ctx.putImageData(data,0,0);
}

function wingPath(ctx,side){
  const points=[[0,.37],[.32,.37],[.32,.49],[.385,.515],[.385,.60],[.344,.64],[.328,.82],[0,.94]];
  ctx.beginPath();points.forEach(([x,y],i)=>{
    const px=(side<0 ? x : 1-x)*SIZE;
    if(i)ctx.lineTo(px,y*SIZE);else ctx.moveTo(px,y*SIZE);
  });ctx.closePath();
}

function prepare(image){
  if(cache.has(image)) return cache.get(image);
  const source=canvas(),sc=source.getContext("2d");sc.drawImage(image,0,0,SIZE,SIZE);
  const body=canvas(),bc=body.getContext("2d");bc.drawImage(source,0,0);
  const wings=[-1,1].map(side=>{
    const c=canvas(),ctx=c.getContext("2d");wingPath(ctx,side);ctx.clip();ctx.drawImage(source,0,0);
    bc.save();bc.globalCompositeOperation="destination-out";wingPath(bc,side);bc.fill();bc.restore();return c;
  });
  // Emission is confined to the actual forward weapon slit, not the armor.
  const emission=canvas(),ec=emission.getContext("2d");
  ec.beginPath();ec.ellipse(SIZE*.5,SIZE*.169,SIZE*.024,SIZE*.063,0,0,Math.PI*2);ec.clip();ec.drawImage(source,0,0);
  const result={body,wings,emission};cache.set(image,result);return result;
}

function drawEngines(ctx,time,power,size,turn,profile){
  if(!jet || power<.015) return;
  const frame=Math.floor(time*24)%8,fw=jet.width/4,fh=jet.height/2;
  for(const mount of profile.nozzles){
    const x=mount.x*size,y=mount.y*size;
    const length=size*(.12+.11*power)*(1+Math.sin(time*33+mount.x*9)*.055);
    const width=size*.061;
    glow(ctx,x,y,width*1.9,"rgba(255,100,52,1)",power*.62);
    ctx.save();ctx.translate(x,y);ctx.rotate(clamp(-turn*.075,-.17,.17));
    ctx.globalCompositeOperation="lighter";ctx.globalAlpha=power*.9;
    ctx.drawImage(jet,frame%4*fw,Math.floor(frame/4)*fh,fw,fh,-width/2,-1,width,length);ctx.restore();
  }
}

function lamp(ctx,x,y,length,rotation,size,level){
  ctx.save();ctx.translate(x*size,y*size);ctx.rotate(rotation);
  glow(ctx,0,0,size*.043,"rgba(255,72,44,1)",level*.65);
  ctx.globalCompositeOperation="lighter";ctx.globalAlpha=clamp(level);ctx.lineCap="round";
  ctx.strokeStyle="#ff4934";ctx.lineWidth=Math.max(.8,size*.016);
  ctx.beginPath();ctx.moveTo(-length*size/2,0);ctx.lineTo(length*size/2,0);ctx.stroke();
  ctx.strokeStyle="#fff2db";ctx.lineWidth=Math.max(.36,size*.006);
  ctx.beginPath();ctx.moveTo(-length*size*.36,0);ctx.lineTo(length*size*.36,0);ctx.stroke();
  ctx.restore();
}

function wingLamps(ctx,side,time,size,pose,profile){
  const light=(.8+Math.sin(time*1.8+side)*.055+pose.charge*.12+pose.flash*.10)*profile.light;
  // These lamps sit on the red wing plates and use the same hinge transform.
  lamp(ctx,side*.348,.191,.047,side<0 ? -.94 : .94,size,light);
  lamp(ctx,side*.20,-.04,.009,0,size,light*.88);
}

function hullLamps(ctx,time,size,pose,profile){
  const light=(.77+Math.sin(time*2.1)*.045+pose.charge*.16+pose.flash*.16)*profile.light;
  for(const side of [-1,1]) lamp(ctx,side*.058,-.118,.032,Math.PI/2-side*.2,size,light);
  lamp(ctx,0,.12,.028,Math.PI/2,size,light*.83);
  if(profile.fixedHeading) for(const side of [-1,1]) lamp(ctx,side*.117,-.042,.031,Math.PI/2+side*.24,size,light*.87);
}

export function drawVorakRusher(ctx,enemy,time,shotAge,dt,state){
  const profile=VORAK_VISUAL_PROFILES[enemy.kind],image=artwork.get(enemy.kind);
  if(!profile || !image?.complete || !image.naturalWidth) return;
  state.wake??={};
  if(state.time!==time){advanceVorakWake(state.wake,enemy,dt);state.time=time;}
  const power=state.wake.power || 0,turn=state.wake.turn || 0;
  const pose=vorakPose(time,shotAge,power,turn,enemy.kind),texture=prepare(image);
  const size=vorakSize(enemy);
  drawVorakWake(ctx,state.wake);
  ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(vorakHeading(enemy));
  drawEngines(ctx,time,power,size,turn,profile);
  ctx.translate(0,pose.recoil*size);
  for(let i=0;i<2;i++){
    const side=i===0 ? -1 : 1,hx=side*.14*size,hy=.056*size;
    // Dark hinge backing avoids a bright seam when the small panels articulate.
    ctx.fillStyle="#24272a";ctx.beginPath();ctx.arc(hx,hy,size*.025,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(hx,hy);ctx.rotate(pose.wings[i]);
    ctx.drawImage(texture.wings[i],-size/2-hx,-size/2-hy,size,size);
    ctx.translate(-hx,-hy);wingLamps(ctx,side,time,size,pose,profile);ctx.restore();
  }
  ctx.drawImage(texture.body,-size/2,-size/2,size,size);
  hullLamps(ctx,time,size,pose,profile);
  ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=clamp((pose.charge*.42+pose.flash*.9)*profile.light);
  ctx.drawImage(texture.emission,-size/2,-size/2,size,size);ctx.restore();
  glow(ctx,0,-size*.338,size*.075,"rgba(255,86,48,1)",(pose.charge*.25+pose.flash*.72)*profile.light);
  glow(ctx,0,-size*.346,size*.025,"rgba(255,240,221,1)",pose.flash*.8);
  ctx.restore();return pose;
}
