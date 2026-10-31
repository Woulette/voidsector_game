import {clamp} from "./vfxPrimitives.js";
import {vorakMounts,vorakHeading} from "./vorakMotion.js";

export const VORAK_WAKE_LIMIT = 76;
const noise = n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
let texture;

export function advanceVorakWake(state, enemy, dt){
  state.particles??=[]; state.serial??=0; state.carry??=0; state.power??=0; state.turn??=0;
  if(!(dt>0)) return;
  for(const p of state.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  state.particles=state.particles.filter(p=>p.age<p.life);
  state.gap=(state.gap || 0)+dt;
  const previous=state.position;
  state.position={x:enemy.x,y:enemy.y,angle:vorakHeading(enemy),width:enemy.width,height:enemy.height};
  if(!previous){state.gap=0;return;}
  const dx=enemy.x-previous.x,dy=enemy.y-previous.y,distance=Math.hypot(dx,dy);
  if(distance>180){
    state.particles=[];state.carry=0;state.gap=0;state.power=0;state.turn=0;return;
  }
  if(distance<.000001){
    // Keep fractional emission between repeated simulation positions at
    // 120/144/240 Hz. A genuine stop lets the existing material evaporate.
    if(state.gap>.09){state.power*=Math.exp(-dt*18);state.turn*=Math.exp(-dt*12);}
    if(state.gap>.25) state.carry=0;
    return;
  }
  const motionDt=state.gap>.25 ? dt : state.gap;
  state.gap=0;
  const speed=distance/motionDt;
  state.power=clamp(speed/85);
  let da=vorakHeading(enemy)-previous.angle;
  da=Math.atan2(Math.sin(da),Math.cos(da));
  state.turn=clamp(da/motionDt,-2,2);
  if(speed<5){state.carry=0;state.power=0;return;}
  // A steady sampling rate avoids density changes when one simulation tick
  // spans alternating two/three render frames (notably a 144 Hz display).
  const ux=dx/distance,uy=dy/distance,rate=27;
  const before=state.carry,total=before+motionDt*rate,count=Math.min(8,Math.floor(total));
  state.carry=total-Math.floor(total);
  for(let n=0;n<count;n++){
    const at=clamp((n+1-before)/(motionDt*rate));
    const sample={...enemy,x:previous.x+dx*at,y:previous.y+dy*at,angle:previous.angle+da*at};
    for(const mount of vorakMounts(sample)){
      const id=state.serial++,drift=15+noise(id+7)*13,spread=(noise(id)-.5)*8;
      const vx=mount.dx*drift*.7-ux*drift*.3-uy*spread;
      const vy=mount.dy*drift*.7-uy*drift*.3+ux*spread;
      const age=motionDt*(1-at);
      state.particles.push({x:mount.x+vx*age,y:mount.y+vy*age,vx,vy,age,
        life:1.05+noise(id+13)*.55,size:2.0+noise(id+19)*1.8,power:state.power});
    }
  }
  if(state.particles.length>VORAK_WAKE_LIMIT) state.particles.splice(0,state.particles.length-VORAK_WAKE_LIMIT);
}

function cloud(){
  if(texture) return texture;
  texture=document.createElement("canvas");texture.width=texture.height=64;
  const ctx=texture.getContext("2d"),gradient=ctx.createRadialGradient(32,32,0,32,32,31);
  gradient.addColorStop(0,"rgba(210,168,151,.77)");
  gradient.addColorStop(.3,"rgba(160,128,120,.45)");
  gradient.addColorStop(1,"rgba(75,70,80,0)");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return texture;
}

export function drawVorakWake(ctx,state){
  if(!state.particles?.length) return;
  const image=cloud();ctx.save();ctx.globalCompositeOperation="source-over";
  for(const p of state.particles){
    const t=p.age/p.life,size=p.size*(1.35+t*4.6);
    ctx.globalAlpha=Math.sin(Math.min(1,p.age/.07)*Math.PI/2)*(1-t)**1.4*(.37+p.power*.25);
    ctx.drawImage(image,p.x-size,p.y-size*.8,size*2,size*1.6);
    if(p.age<.10){
      ctx.globalCompositeOperation="lighter";ctx.globalAlpha=(1-p.age/.1)*.28*p.power;
      ctx.fillStyle="#ffb79b";ctx.beginPath();ctx.arc(p.x,p.y,.8,0,Math.PI*2);ctx.fill();
      ctx.globalCompositeOperation="source-over";
    }
  }
  ctx.restore();
}
