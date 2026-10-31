import {PARASITE_CENTER} from "./parasiteVisuals.js";
import {parasiteCrownPose} from "./parasiteBossMotion.js";

const SIZE=512,INNER=.112,OUTER=.193;
const makeCanvas=()=>{const c=document.createElement("canvas");c.width=c.height=SIZE;return c;};

function ring(ctx,start=0,end=Math.PI*2){
  const x=SIZE*PARASITE_CENTER.x,y=SIZE*PARASITE_CENTER.y;
  ctx.beginPath();ctx.arc(x,y,SIZE*OUTER,start,end);
  ctx.arc(x,y,SIZE*INNER,end,start,true);ctx.closePath();
}

// Split the actual painted collar into six shutters, once per sprite.
// A recessed membrane fills the small gaps as the shutters open.
export function prepareBossCrown(core){
  const pieces=Array.from({length:6},(_,index)=>core.map(layer=>{
    const c=makeCanvas(),ctx=c.getContext("2d"),angle=-Math.PI*2/3+index*Math.PI/3;
    ring(ctx,angle-Math.PI/6,angle+Math.PI/6);ctx.clip();ctx.drawImage(layer,0,0);return c;
  }));
  for(const layer of core){
    const ctx=layer.getContext("2d");ctx.save();ctx.globalCompositeOperation="destination-out";
    ring(ctx);ctx.fill();ctx.restore();
  }
  const bed=makeCanvas(),ctx=bed.getContext("2d"),x=SIZE*PARASITE_CENTER.x,y=SIZE*PARASITE_CENTER.y;
  const gradient=ctx.createRadialGradient(x,y,SIZE*.10,x,y,SIZE*.196);
  gradient.addColorStop(0,"#446a16");gradient.addColorStop(1,"#102616");
  ctx.beginPath();ctx.arc(x,y,SIZE*.196,0,Math.PI*2);ctx.clip();ctx.fillStyle=gradient;ctx.fillRect(0,0,SIZE,SIZE);
  return {pieces,bed};
}

export function drawBossCrownCore(ctx,texture,layer,x,y,size,pose){
  if(layer===0)ctx.drawImage(texture.crown.bed,x,y,size,size);
  ctx.drawImage(texture.core[layer],x,y,size,size);
  for(let index=0;index<6;index++){
    const {angle,offset,twist}=parasiteCrownPose(pose,index);
    ctx.save();ctx.translate(Math.cos(angle)*offset*size,Math.sin(angle)*offset*size);ctx.rotate(twist);
    ctx.drawImage(texture.crown.pieces[index][layer],x,y,size,size);ctx.restore();
  }
}
