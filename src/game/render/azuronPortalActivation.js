const TAU=Math.PI*2;
const clamp=value=>Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;

export function getAzuronActivationVisual(charge){
  const progress=clamp(charge);
  return {
    progress,
    // Integrate a cubic acceleration over the four-second charge. Using progress
    // keeps the spin consistent when a frame is skipped or a descriptor is cloned.
    rotation:28*Math.pow(progress,4),
    coreRadius:.68*Math.pow(progress,1.6),
    glowRadius:progress>0?.2+.8*Math.pow(progress,.85):0,
  };
}

function disc(ctx,r,fill){
  ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
}

export function drawAzuronActivationCore({ctx,r,charge,opacity=1}){
  const visual=getAzuronActivationVisual(charge),p=visual.progress;
  if(p<=0)return;
  ctx.save();ctx.globalCompositeOperation="screen";
  const glowRadius=r*visual.glowRadius;
  const glow=ctx.createRadialGradient(0,0,0,0,0,glowRadius);
  glow.addColorStop(0,`rgba(209,251,255,${opacity*p*.85})`);
  glow.addColorStop(.4,`rgba(47,190,255,${opacity*p*.55})`);
  glow.addColorStop(1,"rgba(16,107,255,0)");
  disc(ctx,glowRadius,glow);
  const coreRadius=Math.max(.01,r*visual.coreRadius);
  const core=ctx.createRadialGradient(0,0,0,0,0,coreRadius);
  core.addColorStop(0,`rgba(255,255,255,${opacity*Math.min(1,p*2.5)})`);
  core.addColorStop(.45,`rgba(228,254,255,${opacity*Math.min(1,p*1.8)})`);
  core.addColorStop(.8,`rgba(102,224,255,${opacity*p*.9})`);
  core.addColorStop(1,"rgba(53,181,255,0)");
  disc(ctx,coreRadius,core);ctx.restore();
}

export function drawAzuronEnergyField({ctx,image,r,flow,charge,simplified}){
  const {progress:p,rotation}=getAzuronActivationVisual(charge);
  disc(ctx,r,"#020b1b");
  if(image?.naturalWidth){
    ctx.save();ctx.rotate(flow*1.9+rotation);ctx.globalAlpha=.88+p*.12;
    ctx.drawImage(image,-r,-r,r*2,r*2);ctx.restore();
  }
  // Curved streaks follow the vortex rather than the sector gate's radial rays.
  if(p>0&&!simplified){
    ctx.save();ctx.globalCompositeOperation="screen";
    for(let i=0;i<12;i++){
      const radius=r*(.28+(i%4)*.17),angle=i*2.399963+rotation;
      ctx.lineWidth=.65+p*1.6;ctx.strokeStyle=`rgba(130,236,255,${.08+p*.42})`;
      ctx.beginPath();ctx.arc(0,0,radius,angle,angle+.06+p*p*.85);ctx.stroke();
    }
    ctx.restore();
  }
  drawAzuronActivationCore({ctx,r,charge});
}
