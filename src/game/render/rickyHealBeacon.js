const TAU=Math.PI*2;
const clamp=value=>Math.max(0,Math.min(1,value));

export function sampleRickyHealBeacon(beacon,now=Date.now()){
  const expiresAt=Number(beacon.expiresAt || 0);
  const createdAt=Number(beacon.createdAt ?? expiresAt-18000);
  const age=now-createdAt;
  const interval=Math.max(1,Number(beacon.pulseIntervalMs || 2000));
  const lastPulse=Number(beacon.lastPulseAt ?? createdAt+Math.floor(Math.max(0,age)/interval)*interval);
  const pulseAge=now-lastPulse;
  const progress=clamp(pulseAge/1350);
  const alive=age>=0 && now<expiresAt;
  return {
    opacity:alive ? clamp((expiresAt-now)/1000) : 0,
    opening:1-Math.pow(1-clamp(age/700),3),
    pulseProgress:progress,
    pulseStrength:alive && pulseAge>=0 && pulseAge<1350 ? Math.pow(1-progress,1.3) : 0,
    rotation:Math.max(0,age)/11000,
    radius:Math.max(20,Number(beacon.radius || 250))
  };
}

function cross(ctx,x,y,size){
  ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x+size,y);ctx.moveTo(x,y-size);ctx.lineTo(x,y+size);ctx.stroke();
}

function glow(ctx,x,y,radius,alpha){
  const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
  gradient.addColorStop(0,`rgba(112,255,193,${alpha})`);
  gradient.addColorStop(.4,`rgba(40,203,145,${alpha*.35})`);
  gradient.addColorStop(1,"rgba(26,170,119,0)");
  ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.fill();
}

export function drawRickyHealBeacons({ctx,camera,beacons=[],now=Date.now(),effects=true}){
  for(const beacon of beacons){
    const phase=sampleRickyHealBeacon(beacon,now);
    if(!phase.opacity) continue;
    const x=Number(beacon.x || 0)-camera.x,y=Number(beacon.y || 0)-camera.y;
    const radius=phase.radius*(effects ? phase.opening : 1);
    if(radius<1) continue;
    ctx.save();ctx.translate(x,y);ctx.globalAlpha*=phase.opacity;
    ctx.globalCompositeOperation="lighter";
    if(effects)glow(ctx,0,0,radius,.085+phase.pulseStrength*.025);
    ctx.lineWidth=1;
    ctx.strokeStyle="rgba(82,227,166,.22)";
    ctx.beginPath();ctx.arc(0,0,radius,0,TAU);ctx.stroke();
    for(let index=0;index<8;index++){
      const angle=index*TAU/8;
      ctx.strokeStyle="rgba(119,248,193,.53)";ctx.lineWidth=1.6;
      ctx.beginPath();ctx.arc(0,0,radius,angle+.04,angle+.28);ctx.stroke();
      ctx.strokeStyle="rgba(84,201,171,.28)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(Math.cos(angle)*(radius-5),Math.sin(angle)*(radius-5));
      ctx.lineTo(Math.cos(angle)*(radius+4),Math.sin(angle)*(radius+4));ctx.stroke();
    }
    if(effects && phase.pulseStrength>0){
      const wave=22+(radius-22)*phase.pulseProgress;
      ctx.strokeStyle=`rgba(158,255,213,${phase.pulseStrength*.68})`;ctx.lineWidth=2.4;
      ctx.beginPath();ctx.arc(0,0,wave,0,TAU);ctx.stroke();
      ctx.strokeStyle=`rgba(63,217,164,${phase.pulseStrength*.28})`;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(0,0,wave*.88,0,TAU);ctx.stroke();
      for(let index=0;index<4;index++){
        const angle=Math.PI/4+index*TAU/4;
        const distance=55+phase.pulseProgress*(radius-60);
        ctx.strokeStyle=`rgba(139,255,202,${phase.pulseStrength*.6})`;ctx.lineWidth=1.6;
        cross(ctx,Math.cos(angle)*distance,Math.sin(angle)*distance,3);
      }
    }
    // The emitter remains fixed where Ricky deployed it, even after he moves.
    ctx.globalCompositeOperation="source-over";
    for(let index=0;index<3;index++){
      const angle=index*TAU/3-Math.PI/2;
      ctx.save();ctx.rotate(angle);
      ctx.fillStyle="#142d39";ctx.strokeStyle="#36636d";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(9,-5);ctx.lineTo(28,-4);ctx.lineTo(32,0);ctx.lineTo(28,4);ctx.lineTo(9,5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle="#66e0ad";ctx.beginPath();ctx.moveTo(23,0);ctx.lineTo(28,0);ctx.stroke();ctx.restore();
    }
    ctx.fillStyle="#0c2730";ctx.strokeStyle="#52918d";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,16,0,TAU);ctx.fill();ctx.stroke();
    ctx.strokeStyle="#82f0c2";ctx.lineWidth=1.5;
    for(let index=0;index<3;index++){
      const angle=index*TAU/3+(effects ? phase.rotation : 0);
      ctx.beginPath();ctx.arc(0,0,21,angle,angle+.7);ctx.stroke();
    }
    if(effects){ctx.globalCompositeOperation="lighter";glow(ctx,0,0,28,.35+phase.pulseStrength*.4);}
    ctx.strokeStyle="#c9ffe5";ctx.lineWidth=3;ctx.lineCap="round";cross(ctx,0,0,5);
    ctx.restore();
  }
}
