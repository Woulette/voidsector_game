import {clamp} from "./vfxPrimitives.js";

export const ORB_WAKE_LIMIT=88;
const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
let cloudTexture;
function cloud(){
  if(cloudTexture) return cloudTexture;
  const canvas=document.createElement("canvas");canvas.width=canvas.height=64;
  const ctx=canvas.getContext("2d"),g=ctx.createRadialGradient(32,32,0,32,32,30);
  g.addColorStop(0,"rgba(157,215,236,.78)");g.addColorStop(.32,"rgba(102,156,183,.46)");
  g.addColorStop(1,"rgba(45,78,103,0)");ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  cloudTexture=canvas;return canvas;
}

export function advanceOrbWake(state,enemy,dt){
  state.particles??=[];state.serial??=0;state.carry??=0;
  if(!(dt>0)) return state.particles;
  for(const p of state.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  state.particles=state.particles.filter(p=>p.age<p.life);
  state.motionGap=(state.motionGap||0)+dt;
  const previous=state.position||{x:enemy.x,y:enemy.y};
  const dx=enemy.x-previous.x,dy=enemy.y-previous.y,distance=Math.hypot(dx,dy);
  state.position={x:enemy.x,y:enemy.y};
  if(distance>180){state.particles=[];state.carry=0;state.motionGap=0;return state.particles;}
  // Rendering can run faster than the 60 Hz simulation. Preserve fractional
  // emission through frames that reuse a position, and time the whole move.
  if(distance<.000001){
    if(state.motionGap>.25) state.carry=0;
    return state.particles;
  }
  const motionDt=state.motionGap>.25 ? dt : state.motionGap;
  state.motionGap=0;
  const speed=distance/motionDt;
  if(speed<5){state.carry=0;return state.particles;}
  const power=clamp(speed/80),rate=12+power*15;
  const oldCarry=state.carry,total=oldCarry+motionDt*rate,count=Math.min(8,Math.floor(total));
  state.carry=total-Math.floor(total);
  const ux=dx/distance,uy=dy/distance,size=Math.min(enemy.width,enemy.height)*.75;
  for(let n=0;n<count;n++){
    const at=clamp((n+1-oldCarry)/(motionDt*rate));
    for(const side of [-1,1]){
      const id=state.serial++,spread=(noise(id)-.5)*7;
      const age=motionDt*(1-at),vx=-ux*(10+noise(id+7)*12)-uy*spread,vy=-uy*(10+noise(id+7)*12)+ux*spread;
      const x=previous.x+dx*at-ux*size*.20-uy*side*size*.12;
      const y=previous.y+dy*at-uy*size*.20+ux*side*size*.12;
      state.particles.push({x:x+vx*age,y:y+vy*age,vx,vy,age,life:1.15+noise(id+19)*.65,
        size:2.2+noise(id+11)*2.2,rotation:noise(id+23)*Math.PI,power});
    }
  }
  if(state.particles.length>ORB_WAKE_LIMIT) state.particles.splice(0,state.particles.length-ORB_WAKE_LIMIT);
  return state.particles;
}

export function drawOrbWake(ctx,state){
  if(!state.particles?.length) return;
  const texture=cloud();ctx.save();ctx.globalCompositeOperation="source-over";
  for(const p of state.particles){
    const t=p.age/p.life,fade=Math.sin(Math.min(1,p.age/.10)*Math.PI/2)*(1-t)**1.4;
    const size=p.size*(1.35+t*5.0);
    ctx.globalAlpha=fade*(.39+p.power*.20);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation+t*.25);
    ctx.drawImage(texture,-size,-size*.8,size*2,size*1.6);ctx.restore();
    if(p.age<.14){
      ctx.globalCompositeOperation="lighter";ctx.globalAlpha=(1-p.age/.14)*.30*p.power;
      ctx.fillStyle="#c9faff";ctx.beginPath();ctx.arc(p.x,p.y,1.2,0,Math.PI*2);ctx.fill();
      ctx.globalCompositeOperation="source-over";
    }
  }
  ctx.restore();
}
