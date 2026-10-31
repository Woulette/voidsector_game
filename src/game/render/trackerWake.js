// World-space cosmetic wake: cold dust based on actual positions, independent of body heading.
import {clamp} from "./vfxPrimitives.js";
import {TRACKER_DRAW_SCALE} from "../combatData/trackerVisuals.js";
const trackerSize=enemy=>Math.min(enemy.width,enemy.height)*TRACKER_DRAW_SCALE;

export const TRACKER_WAKE_LIMIT=68;
const noise=n=>{const value=Math.sin(n*127.1+311.7)*43758.5453;return value-Math.floor(value);};
let texture;

export function advanceTrackerWake(state,enemy,dt){
  state.particles??=[];state.serial??=0;state.carry??=0;state.power??=0;state.vx??=0;state.vy??=0;
  if(!(dt>0))return;
  for(const p of state.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  state.particles=state.particles.filter(p=>p.age<p.life);
  state.gap=(state.gap || 0)+dt;
  const previous=state.position;state.position={x:enemy.x,y:enemy.y};
  if(!previous){state.gap=0;return;}
  const dx=enemy.x-previous.x,dy=enemy.y-previous.y,distance=Math.hypot(dx,dy);
  if(distance>180){state.particles=[];state.carry=0;state.gap=0;state.power=0;state.vx=state.vy=0;return;}
  if(distance<1e-6){
    if(state.gap>.09){const fade=Math.exp(-dt*13);state.power*=fade;state.vx*=fade;state.vy*=fade;}
    if(state.gap>.25)state.carry=0;
    return;
  }
  const motionDt=state.gap>.25 ? dt : state.gap;state.gap=0;
  const speed=distance/motionDt;state.vx=dx/motionDt;state.vy=dy/motionDt;state.power=clamp(speed/80);
  if(speed<5){state.carry=0;state.power=0;return;}
  const ux=dx/distance,uy=dy/distance,rate=19,size=trackerSize(enemy);
  const oldCarry=state.carry,total=oldCarry+motionDt*rate,count=Math.min(8,Math.floor(total));
  state.carry=total-Math.floor(total);
  for(let n=0;n<count;n++){
    const at=clamp((n+1-oldCarry)/(motionDt*rate));
    for(const side of [-1,1]){
      const id=state.serial++,drift=8+noise(id+7)*9,spread=(noise(id)-.5)*6;
      const vx=-ux*drift-uy*spread,vy=-uy*drift+ux*spread,age=motionDt*(1-at);
      const x=previous.x+dx*at-ux*size*.2-uy*side*size*.10;
      const y=previous.y+dy*at-uy*size*.2+ux*side*size*.10;
      state.particles.push({x:x+vx*age,y:y+vy*age,vx,vy,age,life:1.2+noise(id+13)*.5,
        size:2.6+noise(id+19)*2.1,power:state.power,ice:id%7===0});
    }
  }
  if(state.particles.length>TRACKER_WAKE_LIMIT)state.particles.splice(0,state.particles.length-TRACKER_WAKE_LIMIT);
}

function cloud(){
  if(texture)return texture;
  texture=document.createElement("canvas");texture.width=texture.height=64;
  const ctx=texture.getContext("2d"),g=ctx.createRadialGradient(32,32,0,32,32,31);
  g.addColorStop(0,"rgba(160,208,230,.7)");g.addColorStop(.32,"rgba(87,131,157,.4)");g.addColorStop(1,"rgba(39,74,94,0)");
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return texture;
}

export function drawTrackerWake(ctx,state){
  if(!state.particles?.length)return;
  const image=cloud();ctx.save();
  for(const p of state.particles){
    const t=p.age/p.life,size=p.size*(1.35+t*4.5),fade=Math.sin(Math.min(1,p.age/.09)*Math.PI/2)*(1-t)**1.35;
    ctx.globalCompositeOperation="source-over";ctx.globalAlpha=fade*(.42+p.power*.22);
    ctx.drawImage(image,p.x-size,p.y-size*.82,size*2,size*1.64);
    if(p.ice){
      ctx.globalCompositeOperation="lighter";ctx.globalAlpha=fade*.28;
      ctx.fillStyle="#b9efff";ctx.beginPath();ctx.arc(p.x,p.y,.55+t*.4,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();
}
