import { clamp, glow, line } from "./drawing.js";

// Archived artistic candidates. The active lab and game now share variant B
// from src/game/render/weaponVfx.js (20261024-shield-x6b1).
export const X6_VARIANT_SPEC = Object.freeze({
  cooldown:3, duration:.12, offsets:Object.freeze([0,.09,.18,.27])
});
export const X6_VARIANTS = Object.freeze([
  {id:"lance",name:"A · Lances polarisées",note:"Quatre pointes noires bordées de blanc, avec une queue courte et effilée."},
  {id:"filament",name:"B · Filaments croisés",note:"Deux filaments blancs autour d’un canal sombre ; impulsions souples et rapides."},
  {id:"rings",name:"C · Anneaux de phase",note:"Des anneaux blancs au centre noir, projetés en quatre paquets compacts."}
]);

function spear(ctx,length,halfWidth,color){
  const shoulder=length*.65;
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.bezierCurveTo(length*.28,-halfWidth*.15,length*.42,-halfWidth,shoulder,-halfWidth);
  ctx.quadraticCurveTo(length*.85,-halfWidth*.7,length,0);
  ctx.quadraticCurveTo(length*.85,halfWidth*.7,shoulder,halfWidth);
  ctx.bezierCurveTo(length*.42,halfWidth,length*.28,halfWidth*.15,0,0);
  ctx.fill();
}

export function drawX6Variant(ctx,shot){
  const progress=clamp(shot.age/shot.duration);
  if(shot.age<0 || progress>=1) return;
  const dx=shot.toX-shot.fromX,dy=shot.toY-shot.fromY,distance=Math.hypot(dx,dy)||1;
  const head=distance*progress;
  const wanted=shot.x6Variant === "filament" ? 88 : shot.x6Variant === "rings" ? 48 : 94;
  const length=Math.min(wanted,head),tail=head-length;
  const fade=Math.min(1,progress/.1)*Math.min(1,(1-progress)/.13);
  ctx.save(); ctx.globalCompositeOperation="source-over"; ctx.globalAlpha*=fade;
  ctx.translate(shot.fromX+dx/distance*tail,shot.fromY+dy/distance*tail);
  ctx.rotate(Math.atan2(dy,dx));
  if(shot.x6Variant === "filament"){
    const points=Array.from({length:15},(_,i)=>{
      const p=i/14;
      return [length*p,Math.sin(p*Math.PI*2.2+shot.passIndex*.8)*Math.sin(p*Math.PI)*4.5];
    });
    for(const side of [-1,1]){
      const strand=points.map(([x,y])=>[x,y*side]);
      line(ctx,strand,"rgba(0,0,0,.96)",4.2);
      line(ctx,strand,"rgba(255,255,255,.98)",1.35);
    }
    glow(ctx,length,0,4.5,"rgba(255,255,255,1)",.75);
  }else if(shot.x6Variant === "rings"){
    for(let i=3;i>=0;i--){
      const x=length-i*10;
      if(x<0) continue;
      const r=6.5-i*.8;
      ctx.globalAlpha=fade*(1-i*.16);
      ctx.fillStyle="rgba(0,0,0,.96)";
      ctx.strokeStyle="rgba(255,255,255,.98)"; ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.ellipse(x,0,r*.38,r,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }
  }else{
    ctx.shadowBlur=5; ctx.shadowColor="rgba(255,255,255,.55)";
    spear(ctx,length,3.4,"rgba(255,255,255,.95)");
    ctx.shadowBlur=0;
    spear(ctx,length,2,"rgba(0,0,0,1)");
    line(ctx,[[length*.72,0],[length,0]],"rgba(255,255,255,.95)",.65);
  }
  ctx.restore();
  if(progress<.3) glow(ctx,shot.fromX,shot.fromY,7,"rgba(255,255,255,1)",(1-progress/.3)*.4);
}

export function drawX6VariantImpact(ctx,shot,surface){
  const age=shot.age-shot.duration;
  if(age<0 || age>.32) return;
  const p=age/.32,fade=(1-p)**1.6;
  ctx.save(); ctx.globalCompositeOperation="source-over";
  ctx.translate(shot.toX,shot.toY);
  ctx.rotate(Math.atan2(shot.toY-shot.fromY,shot.toX-shot.fromX));
  glow(ctx,0,0,8+p*9,"rgba(255,255,255,1)",fade*.65);
  if(shot.x6Variant === "rings"){
    ctx.lineWidth=2;ctx.strokeStyle=`rgba(0,0,0,${fade})`;
    ctx.beginPath();ctx.ellipse(0,0,3+p*7,7+p*10,0,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=.85;ctx.strokeStyle=`rgba(255,255,255,${fade})`;ctx.stroke();
  }else{
    for(let i=0;i<5;i++){
      const a=i*2.399+shot.passIndex*.5;
      const r=p*(11+i%2*9),x=Math.cos(a)*r,y=Math.sin(a)*r;
      const points=[[x,y],[x+Math.cos(a)*5*fade,y+Math.sin(a)*5*fade]];
      line(ctx,points,"rgba(0,0,0,1)",2.6,fade);
      line(ctx,points,"rgba(255,255,255,1)",1.05,fade);
    }
  }
  if(surface === "shield"){
    ctx.strokeStyle=`rgba(255,255,255,${fade*.5})`;ctx.lineWidth=.8;
    ctx.beginPath();ctx.ellipse(0,0,2+p*3,7+p*15,0,-1.25,1.25);ctx.stroke();
  }
  ctx.restore();
}
