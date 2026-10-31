// Frozen animation before independent tentacle motion. Local comparison only.
import {clamp,glow} from "../drawing.js";
import {PARASITE_CENTER,parasiteAttack,parasiteVertex} from "./beforeMotion.js";
import {parasiteProfile,parasiteSize} from "../../../src/game/combatData/parasiteVisuals.js";
import {advanceParasiteWake,drawParasiteWake} from "../../../src/game/render/parasiteWake.js";
import {bossArmSector,parasiteBossPose,parasiteBossVertex} from "./beforeBossMotion.js";
import {prepareBossCrown,drawBossCrownCore} from "../../../src/game/render/parasiteBossCrown.js";

const SIZE=512,STRIPS=10,cache=new WeakMap();
const artworks=new Map();
export function setParasiteArtwork(kind,image){artworks.set(kind,image);}
function canvas(){const c=document.createElement("canvas");c.width=c.height=SIZE;return c;}

function armPath(ctx,arm,profile){
  const angle=-Math.PI/2+arm*Math.PI/3,cx=SIZE*PARASITE_CENTER.x,cy=SIZE*PARASITE_CENTER.y;
  const sector=profile.motion === "brood" ? bossArmSector(arm) : {start:angle-Math.PI/6,end:angle+Math.PI/6};
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,SIZE*(profile.motion === "brood" ? .75 : .66),sector.start,sector.end);ctx.closePath();
}

function shellPath(ctx,shape,radius){
  ctx.beginPath();
  if(shape)ctx.ellipse(SIZE*PARASITE_CENTER.x,SIZE*PARASITE_CENTER.y,SIZE*shape.x,SIZE*shape.y,0,0,Math.PI*2);
  else ctx.arc(SIZE*.5,SIZE*.52,SIZE*radius,0,Math.PI*2);
}

function prepare(image,profile){
  if(cache.has(image))return cache.get(image);
  const source=canvas(),sc=source.getContext("2d",{willReadFrequently:true});sc.drawImage(image,0,0,SIZE,SIZE);
  const pixels=sc.getImageData(0,0,SIZE,SIZE),emission=canvas(),ec=emission.getContext("2d");
  const mask=ec.createImageData(SIZE,SIZE);
  for(let i=0;i<pixels.data.length;i+=4){
    const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
    mask.data[i]=r;mask.data[i+1]=g;mask.data[i+2]=b;
    mask.data[i+3]=pixels.data[i+3]*clamp((g-Math.max(r*.65,b))/65)*clamp((g-90)/100);
  }
  ec.putImageData(mask,0,0);
  const core=[source,emission].map(layer=>{
    const c=canvas(),ctx=c.getContext("2d");shellPath(ctx,profile.coreShape,profile.core);ctx.clip();ctx.drawImage(layer,0,0);return c;
  });
  const arms=Array.from({length:6},(_,arm)=>[source,emission].map(layer=>{
    const c=canvas(),ctx=c.getContext("2d");armPath(ctx,arm,profile);ctx.clip();ctx.drawImage(layer,0,0);
    ctx.globalCompositeOperation="destination-out";shellPath(ctx,profile.rootShape,profile.root);ctx.fill();return c;
  }));
  const result={core,arms,posed:[canvas(),canvas()],crown:profile.crown ? prepareBossCrown(core) : null};
  cache.set(image,result);return result;
}

function triangle(ctx,image,a,b,c){
  const su=b.u-a.u,sv=b.v-a.v,tu=c.u-a.u,tv=c.v-a.v,det=su*tv-sv*tu;
  const ax=((b.x-a.x)*tv-(c.x-a.x)*sv)/det,ay=((b.y-a.y)*tv-(c.y-a.y)*sv)/det;
  const bx=((c.x-a.x)*su-(b.x-a.x)*tu)/det,by=((c.y-a.y)*su-(b.y-a.y)*tu)/det;
  const cx=(a.x+b.x+c.x)/3,cy=(a.y+b.y+c.y)/3;
  ctx.save();ctx.beginPath();
  [a,b,c].forEach((p,i)=>{
    const dx=p.x-cx,dy=p.y-cy,length=Math.hypot(dx,dy)||1;
    const x=p.x*SIZE+dx/length*.38,y=p.y*SIZE+dy/length*.38;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  });
  ctx.closePath();ctx.clip();ctx.transform(ax,ay,bx,by,(a.x-ax*a.u-bx*a.v)*SIZE,(a.y-ay*a.u-by*a.v)*SIZE);
  ctx.drawImage(image,0,0);ctx.restore();
}

function poseArms(texture,time,options,profile){
  const contexts=texture.posed.map(c=>c.getContext("2d"));
  const strips=profile.strips || STRIPS,start=profile.meshStart ?? options.root,end=profile.meshEnd ?? .50;
  const vertex=profile.motion === "brood" ? parasiteBossVertex : parasiteVertex;
  for(const ctx of contexts)ctx.clearRect(0,0,SIZE,SIZE);
  for(let arm=0;arm<6;arm++)for(let row=0;row<strips;row++){
    const r0=start+row*(end-start)/strips,r1=start+(row+1)*(end-start)/strips;
    const a=vertex(arm,r0,-.275,time,options),b=vertex(arm,r1,-.275,time,options);
    const c=vertex(arm,r0,.275,time,options),d=vertex(arm,r1,.275,time,options);
    for(let layer=0;layer<2;layer++){
      triangle(contexts[layer],texture.arms[arm][layer],a,b,c);
      triangle(contexts[layer],texture.arms[arm][layer],b,d,c);
    }
  }
}

export function drawParasite(ctx,enemy,time,shotAge,dt,state){
  const artwork=artworks.get(enemy.kind),profile=parasiteProfile(enemy.kind);
  if(!artwork?.complete || !artwork.naturalWidth)return;
  state.wake??={};if(state.time!==time){advanceParasiteWake(state.wake,enemy,dt);state.time=time;}
  const attack=profile.motion === "brood" ? parasiteBossPose(time,shotAge) : parasiteAttack(shotAge);
  const power=state.wake.power || 0,angle=Number(enemy.angle || 0);
  const vx=state.wake.vx || 0,vy=state.wake.vy || 0,speed=Math.hypot(vx,vy)||1;
  const texture=prepare(artwork,profile),size=parasiteSize(enemy);
  poseArms(texture,time,{...attack,power,root:profile.root,flex:profile.flex,rootShape:profile.rootShape,
    lagX:(vx*Math.cos(angle)+vy*Math.sin(angle))/speed,
    lagY:(-vx*Math.sin(angle)+vy*Math.cos(angle))/speed},profile);
  drawParasiteWake(ctx,state.wake);
  ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(angle);
  const x=-size*PARASITE_CENTER.x,y=-size*PARASITE_CENTER.y;
  ctx.drawImage(texture.posed[0],x,y,size,size);
  drawCore(ctx,texture,0,x,y,size,attack);
  ctx.save();ctx.globalCompositeOperation="lighter";
  ctx.globalAlpha=clamp((.07+attack.charge*.23+attack.flash*.78)*profile.light);
  ctx.drawImage(texture.posed[1],x,y,size,size);
  ctx.globalAlpha=clamp((.055+Math.sin(time*1.9)*.018+attack.charge*.31+attack.flash*.89)*profile.light);
  drawCore(ctx,texture,1,x,y,size,attack);ctx.restore();
  glow(ctx,0,0,size*.17,"rgba(160,255,35,1)",attack.charge*.2+attack.flash*.64);
  glow(ctx,0,0,size*.036,"rgba(246,255,194,1)",attack.flash*.82);
  ctx.restore();return attack;
}

function drawCore(ctx,texture,layer,x,y,size,pose){
  if(pose.sx===undefined){ctx.drawImage(texture.core[layer],x,y,size,size);return;}
  ctx.save();ctx.scale(pose.sx,pose.sy);
  if(texture.crown)drawBossCrownCore(ctx,texture,layer,x,y,size,pose);
  else ctx.drawImage(texture.core[layer],x,y,size,size);
  ctx.restore();
}
