import {clamp,line} from "../../../src/game/render/vfxPrimitives.js";
import {trackerVertex} from "./trackerMotion.js";

const connections=[
  [[.344,.31],[.164,.54]],[[.656,.31],[.836,.54]],
  [[.155,.65],[.294,.77]],[[.845,.65],[.706,.77]],
  [[.39,.52],[.31,.72]],[[.61,.52],[.69,.72]]
];
const noise=n=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);};
export function trackerElectricSeed(id){
  let value=17;for(const char of String(id || "tracker"))value=(value*31+char.charCodeAt(0))>>>0;
  return value%10007;
}

export function trackerElectricArcs(time,{power=0,attack={charge:0,flash:0},seed=0}={}){
  if(!Number.isFinite(time))return [];
  const bursts=[];
  for(let lane=0;lane<2;lane++){
    const period=lane ? 1.29 : .91,clock=time+noise(seed+lane*71)*period;
    const cycle=Math.floor(clock/period),key=cycle*7+seed+lane*137;
    const start=.08+noise(key+5)*(period-.42),duration=.17+noise(key+13)*.12;
    const age=clock-cycle*period-start;
    if(age>=0 && age<duration)bursts.push({key,pair:Math.floor(noise(key+29)*connections.length),
      alpha:Math.sin(age/duration*Math.PI)*(.62+clamp(power)*.16)});
  }
  if(attack.flash>.12){
    const key=Math.floor(time*.7)+seed+503;
    bursts.push({key,pair:Math.floor(noise(key+31)*connections.length),alpha:attack.flash*.96});
  }
  const used=new Set(),selected=bursts.sort((a,b)=>b.alpha-a.alpha).filter(b=>{
    if(used.has(b.pair))return false;used.add(b.pair);return true;
  }).slice(0,2);
  return selected.map(burst=>{
    const [a,b]=connections[burst.pair].map(([u,v])=>trackerVertex(u,v,{time,power,attack}));
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
    const frame=Math.floor(time*38),points=[];
    for(let step=0;step<=7;step++){
      const t=step/7,jitter=step && step<7 ? (noise(burst.key+step*17+frame*11)-.5)*.035 : 0;
      points.push([a.x+dx*t+nx*jitter-.5,a.y+dy*t+ny*jitter-.5]);
    }
    const forkStart=points[4],forkEnd=points[6];
    return {points,alpha:burst.alpha,
      fork:[forkStart,[forkStart[0]+nx*.026,forkStart[1]+ny*.026],
        [forkEnd[0]+nx*.045,forkEnd[1]+ny*.045]]};
  });
}

export function drawTrackerElectricity(ctx,size,arcs){
  if(!arcs.length)return;
  ctx.save();ctx.globalCompositeOperation="lighter";
  for(const arc of arcs){
    const points=arc.points.map(([x,y])=>[x*size,y*size]);
    line(ctx,points,"#178ce8",size*.035,arc.alpha*.18);
    line(ctx,points,"#42d6ff",size*.012,arc.alpha*.88);
    line(ctx,points,"#e5fbff",size*.0045,arc.alpha);
    line(ctx,arc.fork.map(([x,y])=>[x*size,y*size]),"#69ddff",size*.005,arc.alpha*.45);
  }
  ctx.restore();
}
