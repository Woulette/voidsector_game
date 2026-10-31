import {clamp,glow} from "./vfxPrimitives.js";

const TAU = Math.PI * 2;
const hexCells = [];
for(let row=-6;row<=6;row++) for(let col=-6;col<=6;col++){
  const x=col*.24+(Math.abs(row)%2)*.12, y=row*.208;
  if(x*x+y*y<.89) hexCells.push({x,y});
}

function arc(ctx, r, start, end, color, width){
  ctx.strokeStyle=color;ctx.lineWidth=width;
  ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke();
}

function membrane(ctx,r,p,fade){
  const skin=ctx.createRadialGradient(-r,0,1,-r*.5,0,r*1.7);
  skin.addColorStop(0,`rgba(175,226,255,${fade*.32})`);
  skin.addColorStop(.18,`rgba(65,147,255,${fade*.12})`);
  skin.addColorStop(.58,`rgba(37,96,194,${fade*.035})`);
  skin.addColorStop(1,"rgba(20,75,160,0)");
  ctx.fillStyle=skin;ctx.beginPath();
  for(let i=0;i<=96;i++){
    const a=i/96*TAU;
    const near=Math.exp(-((Math.abs(a-Math.PI)/.65)**2));
    const wave=Math.sin(p*11-a*2)*Math.sin(Math.PI*p)*near*3;
    const rr=r+wave;
    i ? ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr) : ctx.moveTo(rr,0);
  }
  ctx.closePath();ctx.fill();
  arc(ctx,r,0,TAU,`rgba(80,145,223,${fade*.18})`,.7);
  const spread=.30+p*.65;
  arc(ctx,r,Math.PI-spread,Math.PI+spread,`rgba(80,162,255,${fade*.5})`,8*fade+1);
  arc(ctx,r-1,Math.PI-spread*.8,Math.PI+spread*.8,`rgba(219,245,255,${fade*.95})`,1.35);
  for(let i=0;i<2;i++){
    const d=p*1.65+i*.32;
    const opacity=fade*Math.max(0,1-d*.5)*.55;
    for(const side of [-1,1]){
      const a=Math.PI+side*d;
      arc(ctx,r-2-i*2,a-.10,a+.10,`rgba(130,206,255,${opacity})`,1.4);
    }
  }
  glow(ctx,-r+1,0,19,"rgba(184,227,255,1)",fade*.7);
}

function hexagon(ctx,x,y,size){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const px=x+Math.cos(a)*size,py=y+Math.sin(a)*size;
    i ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
  }
  ctx.closePath();
}

function hex(ctx,r,p,fade){
  for(const cell of hexCells){
    const x=cell.x*r,y=cell.y*r;
    const distance=Math.hypot(x+r,y)/r;
    const wave=Math.exp(-(((distance-p*2.2)/.27)**2));
    const hot=Math.exp(-((distance/.42)**2))*(1-p);
    const opacity=fade*(wave*.82+hot*.70);
    if(opacity<.018) continue;
    hexagon(ctx,x,y,r*.135);
    ctx.fillStyle=`rgba(35,170,218,${opacity*.14})`;ctx.fill();
    ctx.strokeStyle=`rgba(${hot>.4 ? "205,254,255" : "82,222,255"},${opacity})`;
    ctx.lineWidth=hot>.4 ? 1.3 : .8;ctx.stroke();
  }
  // A short rim joins the cells at the incoming side; no full outline.
  arc(ctx,r,Math.PI-.5-p*.4,Math.PI+.5+p*.4,`rgba(75,224,255,${fade*.6})`,1.2);
  glow(ctx,-r,0,14,"rgba(147,250,255,1)",fade*.85);
  for(const side of [-1,1]){
    const a=Math.PI+side*p*1.8;
    glow(ctx,Math.cos(a)*r*.91,Math.sin(a)*r*.91,4,"rgba(173,255,255,1)",fade*.75);
  }
}

export function drawShieldSurface(ctx,{x,y,radius,angle,progress,style="membrane"}){
  const p=clamp(progress),fade=Math.sin(Math.min(1,p/.065)*Math.PI/2)*(1-p)**1.35;
  if(p>=1 || fade<=0) return;
  ctx.save();ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.globalCompositeOperation="lighter";
  ctx.lineCap="round";ctx.lineJoin="round";ctx.translate(x,y);ctx.rotate(angle-Math.PI);
  if(style==="hex") hex(ctx,radius,p,fade);
  else membrane(ctx,radius,p,fade);
  glow(ctx,-radius,0,4,"rgba(246,254,255,1)",fade);
  ctx.restore();
}
