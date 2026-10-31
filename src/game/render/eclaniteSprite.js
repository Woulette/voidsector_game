import {clamp,glow} from "./vfxPrimitives.js";
import {ECLANITE_SCALE,eclaniteAttack,eclaniteCrystalPose} from "./eclaniteMotion.js";
import {advanceEclaniteWake,drawEclaniteWake} from "./eclaniteWake.js";
import {stepLocomotionPower} from "./enemyLocomotion.js";

const SIZE=512,cache=new WeakMap();
let artwork;
function canvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c;}

function prepare(image){
  if(cache.has(image))return cache.get(image);
  const source=canvas(SIZE,SIZE),ctx=source.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(image,0,0,SIZE,SIZE);
  const pixels=ctx.getImageData(0,0,SIZE,SIZE).data,seen=new Uint8Array(SIZE*SIZE),groups=[];
  // The art has seven detached mineral pieces. Connected alpha components
  // isolate their real outlines instead of cutting through a crystal face.
  for(let start=0;start<seen.length;start++){
    if(seen[start] || pixels[start*4+3]<=24)continue;
    const todo=[start],indices=[];seen[start]=1;
    let left=SIZE,top=SIZE,right=0,bottom=0;
    while(todo.length){
      const n=todo.pop(),x=n%SIZE,y=Math.floor(n/SIZE);indices.push(n);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const next of [x ? n-1 : -1,x<SIZE-1 ? n+1 : -1,y ? n-SIZE : -1,y<SIZE-1 ? n+SIZE : -1]){
        if(next<0 || seen[next] || pixels[next*4+3]<=24)continue;
        seen[next]=1;todo.push(next);
      }
    }
    if(indices.length>70)groups.push({indices,left,top,right,bottom,cx:(left+right+1)/2,cy:(top+bottom+1)/2});
  }
  groups.sort((a,b)=>b.indices.length-a.indices.length);
  const parts=groups.slice(0,7);
  if(parts.length!==7)throw new Error("L’Éclanite doit contenir un noyau et six fragments séparés.");
  const core=parts.reduce((a,b)=>Math.hypot(a.cx-SIZE*.5,a.cy-SIZE*.55)<Math.hypot(b.cx-SIZE*.5,b.cy-SIZE*.55) ? a : b);
  const center={x:core.cx,y:core.cy};
  const make=part=>{
    const w=part.right-part.left+1,h=part.bottom-part.top+1,body=canvas(w,h),light=canvas(w,h);
    const bc=body.getContext("2d"),lc=light.getContext("2d"),data=bc.createImageData(w,h),emission=lc.createImageData(w,h);
    for(const n of part.indices){
      const at=((Math.floor(n/SIZE)-part.top)*w+n%SIZE-part.left)*4,from=n*4;
      const r=pixels[from],g=pixels[from+1],b=pixels[from+2],a=pixels[from+3];
      data.data.set(pixels.subarray(from,from+4),at);
      emission.data.set([r,g,b,a*clamp((Math.min(r,b)-g)/100)*clamp((b-80)/150)],at);
    }
    bc.putImageData(data,0,0);lc.putImageData(emission,0,0);
    return {body,light,w:w/SIZE,h:h/SIZE,x:(part.cx-center.x)/SIZE,y:(part.cy-center.y)/SIZE};
  };
  const angle=part=>(Math.atan2(part.cy-center.y,part.cx-center.x)+Math.PI*2.5)%(Math.PI*2);
  const fragments=parts.filter(part=>part!==core).sort((a,b)=>angle(a)-angle(b)).map(make);
  const result={core:make(core),fragments};cache.set(image,result);return result;
}

export function setEclaniteArtwork(image){artwork=image;if(image?.naturalWidth)prepare(image);}

function mineral(ctx,part,size,light){
  ctx.drawImage(part.body,-part.w*size/2,-part.h*size/2,part.w*size,part.h*size);
  if(light>.005){
    ctx.save();ctx.globalCompositeOperation="lighter";ctx.globalAlpha=clamp(light);
    ctx.drawImage(part.light,-part.w*size/2,-part.h*size/2,part.w*size,part.h*size);ctx.restore();
  }
}

export function drawEclanite(ctx,enemy,time,shotAge,dt,state){
  if(!artwork?.complete || !artwork.naturalWidth)return;
  state.wake??={};advanceEclaniteWake(state.wake,enemy,dt);drawEclaniteWake(ctx,state.wake);
  const texture=prepare(artwork),size=Math.min(enemy.width,enemy.height)*ECLANITE_SCALE,attack=eclaniteAttack(shotAge);
  const motion=stepLocomotionPower(state,state.wake.power || 0,dt);
  ctx.save();ctx.translate(enemy.x,enemy.y);
  // Fixed world orientation, independent of the pursuit heading.
  glow(ctx,0,0,size*.25,"rgba(165,69,242,1)",.05+attack.charge*.16+attack.flash*.32);
  texture.fragments.forEach((part,index)=>{
    const pose=eclaniteCrystalPose(index,time,{...attack,power:motion}),c=Math.cos(pose.orbit),s=Math.sin(pose.orbit);
    const x=(part.x*c-part.y*s)*(1+pose.radial),y=(part.x*s+part.y*c)*(1+pose.radial);
    ctx.save();ctx.translate(x*size,y*size);ctx.rotate(pose.twist);
    mineral(ctx,part,size,.03+pose.light*.06+attack.charge*.15+attack.flash*.52);ctx.restore();
  });
  mineral(ctx,texture.core,size,.045+attack.charge*.25+attack.flash*.70);
  glow(ctx,0,0,size*.10,"rgba(244,174,255,1)",attack.charge*.25+attack.flash*.75);
  glow(ctx,0,0,size*.035,"rgba(255,244,255,1)",attack.flash*.75);
  ctx.restore();
}
