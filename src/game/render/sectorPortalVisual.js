import { getCachedCombatImage } from "../combatAssets.js?v=20261024-sector-portals1";
import { SECTOR_PORTAL_VISUAL_ASSETS, SECTOR_PORTAL_UPRIGHT_ANGLE, isSectorTravelPortal } from "../../data/sectorPortalVisuals.js?v=20261024-sector-portals1";
import { getPortalActivationRadius, MAP_PORTAL_TRANSFER_DURATION } from "../systems/mapPortalTransfer.js";
const TAU=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));
const rearTextures=new WeakMap();
function disc(ctx,x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
function rearOf(image){
  if(!image?.naturalWidth || typeof document === "undefined")return null;
  if(rearTextures.has(image))return rearTextures.get(image);
  const rearTexture=document.createElement("canvas");
  rearTexture.width=image.naturalWidth;rearTexture.height=image.naturalHeight;
  const ctx=rearTexture.getContext("2d");
  ctx.drawImage(image,0,0);ctx.globalCompositeOperation="source-atop";
  ctx.fillStyle="rgba(2,12,20,.72)";ctx.fillRect(0,0,rearTexture.width,rearTexture.height);
  rearTextures.set(image,rearTexture);return rearTexture;
}
function drawField(ctx,image,r,t,flow,charge,proximity,simplified,vortex){
  const base=ctx.createRadialGradient(0,0,0,0,0,r);
  base.addColorStop(0,"#01050b");base.addColorStop(.72,"#02101c");base.addColorStop(1,"#07415a");
  disc(ctx,0,0,r,base);
  if(image?.naturalWidth){
    ctx.save();ctx.rotate(vortex ? flow*1.9 : t*.025);
    ctx.globalAlpha=vortex ? .78+charge*.18 : .14+proximity*.07;
    if(vortex)ctx.drawImage(image,-r,-r,r*2,r*2);
    else ctx.drawImage(image,image.naturalWidth*.22,image.naturalHeight*.22,image.naturalWidth*.56,image.naturalHeight*.56,-r,-r,r*2,r*2);
    ctx.restore();
  }
  const focus={x:r*.075,y:-r*.09};
  ctx.globalCompositeOperation="screen";
  const count=simplified?0:charge>0?104:35;
  for(let i=0;i<count;i++){
    const seed=Math.sin(i*127.1+311.7)*43758.5453;
    const position=1-(((seed-Math.floor(seed))+flow)%1);
    const angle=i*2.399963+Math.sin(i*7.23)*.14;
    const distance=r*(.08+.9*position);
    const tailDistance=Math.min(r*.99,distance+r*(.014+charge*.14)*position);
    const x=focus.x+Math.cos(angle)*distance,y=focus.y+Math.sin(angle)*distance;
    const tx=focus.x+Math.cos(angle)*tailDistance,ty=focus.y+Math.sin(angle)*tailDistance;
    const alpha=(.12+charge*.74)*(1-position*.55);
    ctx.lineWidth=.5+(i%3)*.4+charge*.6;
    ctx.strokeStyle="rgba(74,205,255,"+alpha+")";
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(x,y);ctx.stroke();
    disc(ctx,x,y,.55+(i%3)*.35,"rgba(144,233,255,"+(alpha*.85)+")");
  }
  drawActivationFocus(ctx,r,t,charge,simplified);
  ctx.globalCompositeOperation="source-over";
}
function drawActivationFocus(ctx,r,t,charge,simplified){
  const focus={x:r*.075,y:-r*.09};
  // Keep the opening dark: activation converges on a compact white-blue focus.
  if(charge>0){
    const strength=Math.pow(charge,.55),radius=r*(.15+strength*.36);
    const glow=ctx.createRadialGradient(focus.x,focus.y,0,focus.x,focus.y,radius);
    glow.addColorStop(0,"rgba(222,253,255,"+(.9*strength)+")");
    glow.addColorStop(.12,"rgba(66,215,255,"+(.8*strength)+")");
    glow.addColorStop(.4,"rgba(9,144,255,"+(.25*strength)+")");glow.addColorStop(1,"rgba(8,123,255,0)");
    disc(ctx,focus.x,focus.y,radius,glow);
    ctx.save();ctx.translate(focus.x,focus.y);ctx.lineCap="round";
    for(let ray=0;ray<(simplified?0:19);ray++){
      const angle=ray*2.399963+.06*Math.sin(t*1.1+ray);
      const length=r*(.12+strength*(.12+((ray*17)%11)/25));
      const rayGradient=ctx.createLinearGradient(0,0,Math.cos(angle)*length,Math.sin(angle)*length);
      rayGradient.addColorStop(0,"rgba(234,255,255,"+(.92*strength)+")");
      rayGradient.addColorStop(.2,"rgba(88,224,255,"+(.8*strength)+")");rayGradient.addColorStop(1,"rgba(18,152,255,0)");
      ctx.lineWidth=ray%4===0?2.1:1;ctx.strokeStyle=rayGradient;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(angle)*length,Math.sin(angle)*length);ctx.stroke();
    }
    const core=2+strength*3.8;
    disc(ctx,0,0,core*2,"rgba(90,225,255,"+(.4*strength)+")");
    disc(ctx,0,0,core,"rgba(233,255,255,"+strength+")");disc(ctx,0,0,core*.5,"rgba(255,255,255,"+strength+")");
    ctx.restore();
  }

}
function drawGate({ctx,x,y,size,time,rim,energy,proximity=0,charge=0,arrival=0,flowTime=0,angle=SECTOR_PORTAL_UPRIGHT_ANGLE,simplified=false,vortex=false,energyRenderer=null}){
  const power=clamp(.08+proximity*.2+charge*.7),r=size*.314;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(.74,1.04);
  ctx.globalCompositeOperation="screen";
  const halo=ctx.createRadialGradient(0,0,r*.7,0,0,size*.63);
  halo.addColorStop(0,"rgba(23,141,221,"+(.025+power*.08)+")");halo.addColorStop(1,"rgba(13,110,190,0)");
  disc(ctx,0,0,size*.63,halo);ctx.globalCompositeOperation="source-over";
  const rear=rearOf(rim),depth=size*.035;
  if(rear){
    for(let slice=5;slice>=1;slice--){const offset=depth*slice/5;ctx.drawImage(rear,-size/2+offset,-size/2-offset*.12,size,size);}
  }
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.clip();
  if(energyRenderer)energyRenderer({ctx,image:energy,r,time,flow:flowTime,charge,proximity,simplified});
  else drawField(ctx,energy,r,time,flowTime,charge,proximity,simplified,vortex);
  ctx.restore();
  if(rim?.naturalWidth)ctx.drawImage(rim,-size/2,-size/2,size,size);
  ctx.globalCompositeOperation="screen";
  for(let i=0;i<4;i++){
    const a=-Math.PI/2+i*Math.PI/2,ex=Math.cos(a)*size*.419,ey=Math.sin(a)*size*.419;
    const glow=ctx.createRadialGradient(ex,ey,0,ex,ey,size*.072);
    glow.addColorStop(0,"rgba(151,235,255,"+(.08+power*.52)+")");glow.addColorStop(1,"rgba(35,164,255,0)");
    disc(ctx,ex,ey,size*.072,glow);
  }
  if(arrival>0){
    ctx.globalAlpha=arrival;
    const glow=ctx.createRadialGradient(r*.075,-r*.09,0,r*.075,-r*.09,r*.75);
    glow.addColorStop(0,"rgba(231,253,255,.85)");glow.addColorStop(.22,"rgba(74,215,255,.5)");glow.addColorStop(1,"rgba(45,170,255,0)");
    disc(ctx,r*.075,-r*.09,r*.75,glow);ctx.globalAlpha=1;
  }
  ctx.restore();
}

const portalAnimations=new WeakMap();
export function getSectorPortalState(portal,{player,transition}={}){
  const other=transition?.portal;
  const active=Boolean(other && Number(other.targetMap)===Number(portal.targetMap)
    && Math.abs(Number(other.x)-Number(portal.x))<.1 && Math.abs(Number(other.y)-Number(portal.y))<.1);
  const duration=Number(transition?.duration)>0?Number(transition.duration):MAP_PORTAL_TRANSFER_DURATION;
  const elapsed=Number(transition?.elapsed)||0;
  const charge=active?clamp(elapsed/duration):0;
  const distance=Math.hypot(Number(player?.x)-Number(portal.x),Number(player?.y)-Number(portal.y));
  const proximity=Number.isFinite(distance)?clamp(1-distance/getPortalActivationRadius(portal)):0;
  return {active,charge,proximity};
}
export function drawSectorTravelPortal({ctx,cache,portal,player,transition,now=performance.now(),simplified=false,visualAssets=SECTOR_PORTAL_VISUAL_ASSETS,vortex=false,energyRenderer=null}){
  if(!isSectorTravelPortal(portal))return false;
  const rim=getCachedCombatImage(cache,visualAssets.rim);
  const energy=getCachedCombatImage(cache,visualAssets.energy);
  if(!rim?.complete || !rim.naturalWidth || !energy?.complete || !energy.naturalWidth)return false;
  const state=getSectorPortalState(portal,{player,transition});
  let animation=portalAnimations.get(portal);
  if(!animation){animation={last:now,flow:Math.abs(Number(portal.x)*.004371+Number(portal.y)*.006713)%1};portalAnimations.set(portal,animation);}
  const dt=Math.max(0,Math.min(.05,(now-animation.last)/1000));animation.last=now;
  animation.flow+=dt*(.06+state.charge*.3);
  drawGate({ctx,x:portal.x,y:portal.y,size:(Number(portal.r)||95)*3.25,time:simplified?0:now/1000,
    rim,energy,...state,flowTime:simplified?0:animation.flow,simplified,vortex,energyRenderer,
    arrival:simplified||energyRenderer?0:Math.max(0,(state.charge-.94)/.06)*.35});
  return true;
}
export function drawSectorPortalTransferFocus({ctx,camera,transition,now=performance.now()}){
  const portal=transition?.portal;
  if(!isSectorTravelPortal(portal))return;
  const {charge}=getSectorPortalState(portal,{transition});
  if(charge<=0)return;
  const size=(Number(portal.r)||95)*3.25;
  ctx.save();
  ctx.translate(Number(portal.x)-Number(camera.x),Number(portal.y)-Number(camera.y));
  ctx.rotate(SECTOR_PORTAL_UPRIGHT_ANGLE);ctx.scale(.74,1.04);
  ctx.globalCompositeOperation="screen";ctx.globalAlpha=.75;
  drawActivationFocus(ctx,size*.314,now/1000,charge,false);
  ctx.restore();
}
