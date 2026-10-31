function flash(time, startedAt, duration){
  const start=Number(startedAt || 0),age=time-start;
  return start>0 && age>=0 && age<duration ? 1-age/duration : 0;
}

export function sampleRickySaucerAnimation(entity = {}, time = performance.now()){
  const laser=flash(time,entity.clientLaserShotAt,220);
  const rocket=flash(time,entity.clientRocketShotAt,380);
  const casting=flash(time,entity.clientSpellAt,1800);
  return {
    hover:Math.sin(time / 680) * 1.4,
    laser,rocket,casting,
    recoil:Math.sin(laser * Math.PI) * 2 + Math.sin(rocket * Math.PI) * 4,
    spellProgress:casting>0 ? 1-casting : 0
  };
}

function glow(ctx,x,y,radius,rgb,alpha){
  const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,`rgba(${rgb},${alpha})`);
  gradient.addColorStop(.35,`rgba(${rgb},${alpha * .5})`);
  gradient.addColorStop(1,`rgba(${rgb},0)`);
  ctx.fillStyle=gradient;
  ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
}

// Purely visual: actual shots and casts are marked only by server-confirmed events.
export function drawRickySaucerEffects({ctx,x,y,angle=0,size=112,entity={},time=performance.now(),layer="over",beacon=null,portalEffects=true,muzzleFlashes=true,engineTrail=true}){
  const pose=sampleRickySaucerAnimation(entity,time);
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  if(layer === "under" && portalEffects && pose.casting>0 && beacon){
    const strength=Math.max(0,1-pose.spellProgress*2);
    if(strength>0){
      ctx.strokeStyle=`rgba(120,255,194,${strength * .8})`;
      ctx.lineWidth=2+strength*3;
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+beacon.x)/2,(y+beacon.y)/2-50,beacon.x,beacon.y);ctx.stroke();
    }
  }
  ctx.translate(x,y);ctx.rotate(angle);
  if(layer === "under"){
    const power=Math.max(0,Math.min(1,Number(entity.enginePower || 0)));
    if(engineTrail && power>.04){
      for(const side of [-1,1]){
        const px=-size*.45,py=side*size*.085;
        const length=14+power*42+(Math.sin(time/37+side)+1)*3;
        const width=2.2+power*3;
        glow(ctx,px,py,8+power*10,"55,195,255",.3+power*.35);
        const gradient=ctx.createLinearGradient(px,py,px-length,py);
        gradient.addColorStop(0,"rgba(231,251,255,.96)");
        gradient.addColorStop(.25,"rgba(70,210,255,.85)");
        gradient.addColorStop(1,"rgba(14,100,245,0)");
        ctx.fillStyle=gradient;
        ctx.beginPath();ctx.moveTo(px,py-width);ctx.quadraticCurveTo(px-length*.45,py-width*1.2,px-length,py);
        ctx.quadraticCurveTo(px-length*.45,py+width*1.2,px,py+width);ctx.closePath();ctx.fill();
      }
    }
    if(portalEffects && pose.casting>0){
      glow(ctx,size*.04,0,size*(.65+pose.spellProgress*.4),"74,222,148",pose.casting*.2);
      for(let index=0;index<3;index++){
        const phase=(pose.spellProgress+index/3)%1;
        ctx.strokeStyle=`rgba(110,245,178,${(1-phase)*pose.casting*.65})`;
        ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(size*.04,0,size*(.33+phase*.65),0,Math.PI*2);ctx.stroke();
      }
    }
  }else{
    const pulse=.5+Math.sin(time/260)*.5;
    if(portalEffects) glow(ctx,size*.045,0,size*.14,"38,193,245",.055+pulse*.035);
    if(portalEffects && pose.casting>0){
      glow(ctx,size*.045,0,size*.24,"137,255,205",pose.casting*.6);
      for(let index=0;index<8;index++){
        const turn=time/520+index*Math.PI/4;
        const radius=size*(.34+pose.spellProgress*.18);
        const px=Math.cos(turn)*radius,py=Math.sin(turn)*radius;
        ctx.fillStyle=`rgba(178,255,211,${pose.casting*.9})`;
        ctx.beginPath();ctx.arc(px,py,1.4+pose.casting,0,Math.PI*2);ctx.fill();
      }
    }
    for(const side of [-1,1]){
      const selected=side === Math.sign(Number(entity.clientMuzzleSide || 1));
      const light=(selected ? pose.laser : 0)+pose.rocket*.8;
      if(!muzzleFlashes || light<=0) continue;
      const px=size*.35,py=side*size*.13;
      glow(ctx,px,py,6+light*15,pose.rocket>0 ? "255,204,110" : "131,226,255",Math.min(1,light));
      ctx.strokeStyle=`rgba(235,252,255,${Math.min(1,light)})`;
      ctx.lineWidth=1.5+light*2;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+7+light*12,py);ctx.stroke();
    }
  }
  ctx.restore();
  return pose;
}
