import { clamp, glow, mix } from "./drawing.js";

let jetTexture;
const jetAtlases = new Map();
export function setCreatureJetTexture(image){ jetTexture=image; jetAtlases.clear(); }

function coloredJet(profile){
  if(jetAtlases.has(profile.rgb)) return jetAtlases.get(profile.rgb);
  const atlas=document.createElement("canvas");
  atlas.width=jetTexture.naturalWidth; atlas.height=jetTexture.naturalHeight;
  const ctx=atlas.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(jetTexture,0,0);
  const pixels=ctx.getImageData(0,0,atlas.width,atlas.height);
  const color=profile.rgb.split(",").map(Number);
  for(let i=0;i<pixels.data.length;i+=4){
    const luminance=(pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722)/255;
    const hot=clamp((luminance-.3)/.5);
    for(let c=0;c<3;c++) pixels.data[i+c]=mix(color[c],255,hot*.85)*(.6+luminance*.45);
  }
  ctx.putImageData(pixels,0,0); jetAtlases.set(profile.rgb,atlas);
  return atlas;
}

function emitters(enemy,profile,angle){
  const c=Math.cos(angle),s=Math.sin(angle);
  if(profile.nozzles) return profile.nozzles.map(point=>{
    const x=(point.x-.5)*enemy.width,y=(point.y-.5)*enemy.height;
    return {x:enemy.x+x*c-y*s,y:enemy.y+x*s+y*c,dx:-s*point.dy,dy:c*point.dy};
  });
  const speed=Math.hypot(enemy.vx || 0,enemy.vy || 0)||1;
  const dx=-(enemy.vx || 0)/speed,dy=-(enemy.vy || 0)/speed;
  return [-1,1].map(side=>({
    x:enemy.x+dx*enemy.width*profile.radius-dy*side*enemy.width*.105,
    y:enemy.y+dy*enemy.height*profile.radius+dx*side*enemy.width*.105,dx,dy
  }));
}

// Samples stay in scene coordinates: turns never rotate material already
// emitted, and stopping lets it finish fading. State is bounded per mob.
export function advanceCreatureWake(state,{enemy,profile,angle,time,power,dt}){
  state.tracks ??= [[],[]];
  const jumped=state.lastPosition && Math.hypot(enemy.x-state.lastPosition.x,enemy.y-state.lastPosition.y)>enemy.width*2;
  if(jumped || (state.lastTime !== undefined && (time<state.lastTime || time-state.lastTime>.25))){
    state.tracks=[[],[]]; state.nextSample=time;
  }
  state.lastTime=time;
  state.lastPosition={x:enemy.x,y:enemy.y};
  for(const track of state.tracks) while(track.length && time-track[0].time>profile.life) track.shift();
  const mounts=emitters(enemy,profile,angle);
  if(power>.02 && dt>0 && time>=(state.nextSample ?? 0)){
    mounts.forEach((p,i)=>{
      state.tracks[i].push({...p,time,power,seed:Math.sin(time*19+i*5)});
      if(state.tracks[i].length>64) state.tracks[i].shift();
    });
    state.nextSample=time+1/35;
  }
  return mounts;
}

function pointAt(sample,time,profile){
  const age=Math.max(0,time-sample.time),life=clamp(age/profile.life);
  const drift=profile.style === "organic" ? 10 : profile.style === "jet" ? 22 : 14;
  const spread=Math.sin(sample.time*10)*age*(profile.style === "organic" ? 5 : 1.5);
  return {x:sample.x+sample.dx*age*drift-sample.dy*spread,
    y:sample.y+sample.dy*age*drift+sample.dx*spread,age,life,
    alpha:(1-life)**1.65*sample.power};
}

function drawRibbon(ctx,track,time,profile){
  if(track.length<2) return;
  const points=track.map(p=>pointAt(p,time,profile));
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  ctx.lineCap="round"; ctx.lineJoin="round";
  if(profile.style === "organic"){
    // Disconnected translucent clouds, not two solid luminous tubes.
    for(let i=0;i<points.length;i+=2){
      const p=points[i],spread=Math.sin(track[i].time*17)*p.life*9;
      glow(ctx,p.x+spread,p.y-spread*.6,profile.width*(.75+p.life*.65),
        `rgba(${profile.rgb},1)`,p.alpha*.075);
      if(i%6===0){
        ctx.fillStyle=`rgba(${profile.rgb},${p.alpha*.35})`;
        ctx.beginPath(); ctx.arc(p.x+spread,p.y,.45+p.life*.55,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore(); return;
  }
  for(let layer=0;layer<2;layer++) for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],opacity=(a.alpha+b.alpha)*.5;
    if(opacity<.008) continue;
    ctx.strokeStyle=`rgba(${profile.rgb},${opacity*(layer ? .08 : .016)})`;
    ctx.lineWidth=profile.width*(layer ? .24 : 1+mix(b.life,a.life,.5)*1.5);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }
  for(let i=0;i<points.length;i+=4){
    const p=points[i];
    if(i%8===0){
      ctx.fillStyle=`rgba(${profile.rgb},${p.alpha*.55})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,.6+p.life*.8,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawJet(ctx,mount,profile,time,power,width){
  const length=(profile.channel === "amber" ? 27 : 21)*(.35+.65*power)*(1+Math.sin(time*37)*.06);
  glow(ctx,mount.x,mount.y,width*1.3,`rgba(${profile.rgb},1)`,power*.45);
  if(!jetTexture?.naturalWidth) return;
  const atlas=coloredJet(profile);
  const frame=Math.floor(time*24)%8,fw=atlas.width/4,fh=atlas.height/2;
  ctx.save();
  ctx.translate(mount.x,mount.y);
  ctx.rotate(Math.atan2(mount.dy,mount.dx)-Math.PI/2);
  ctx.globalCompositeOperation="lighter";
  ctx.globalAlpha=power*.85;
  ctx.drawImage(atlas,frame%4*fw,Math.floor(frame/4)*fh,fw,fh,-width/2,0,width,length);
  ctx.restore();
}

export function drawCreatureWake(ctx,options){
  const {enemy,profile,angle,time,power,state,dt}=options;
  const mounts=advanceCreatureWake(state,{enemy,profile,angle,time,power,dt});
  state.tracks.forEach(track=>drawRibbon(ctx,track,time,profile));
  if(power<.02) return;
  for(const mount of mounts){
    if(profile.style === "jet") drawJet(ctx,mount,profile,time,power,profile.width*.8);
    else glow(ctx,mount.x,mount.y,profile.width*1.15,`rgba(${profile.rgb},1)`,power*.18);
  }
  if(profile.style === "electric"){
    ctx.save(); ctx.strokeStyle=`rgba(${profile.rgb},${power*.5})`; ctx.lineWidth=.75;
    for(let i=0;i<2;i++){
      const p=mounts[i],flicker=Math.sin(time*19+i*4);
      if(flicker<.15) continue;
      ctx.beginPath(); ctx.moveTo(p.x,p.y);
      ctx.lineTo(p.x+p.dx*7-p.dy*flicker*3,p.y+p.dy*7+p.dx*flicker*3);
      ctx.lineTo(p.x+p.dx*16,p.y+p.dy*16); ctx.stroke();
    }
    ctx.restore();
  }
}
