import { clamp, glow, line } from "../../src/game/render/vfxPrimitives.js";
import { getEnemyImpactCenter } from "../../src/game/render/enemyWeaponImpact.js";

// Approved: membrane for enemies, hex mesh for the local player. C remains local.
export const SHIELD_VARIANTS = Object.freeze([
  {id:"membrane",name:"A · Membrane réfractive",note:"Une peau d’énergie souple, un reflet blanc et des ondes qui glissent sur la surface."},
  {id:"hex",name:"B · Maillage hexagonal",note:"Les cellules proches du contact s’allument ; l’énergie se propage de cellule en cellule."},
  {id:"magnetic",name:"C · Champ magnétique",note:"Des lignes de force enveloppent la cible et dévient l’énergie vers les côtés."}
]);
export const SHIELD_PREVIEW_LIFE = .56;
import {drawShieldSurface} from "../../src/game/render/shieldSurfaces.js";

function arc(ctx,r,start,end,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke();}
function magnetic(ctx,r,p,fade){
  for(let i=0;i<5;i++){
    const offset=(i-2)*3.7, rr=r+offset;
    const spread=.38+p*1.55+i*.07;
    const strength=fade*(.42-Math.abs(i-2)*.07);
    arc(ctx,rr,Math.PI-spread,Math.PI+spread,`rgba(143,133,255,${strength})`,1.1);
    for(const side of [-1,1]){
      const a=Math.PI+side*spread;
      arc(ctx,rr,a-.12,a+.12,`rgba(225,223,255,${fade*.8})`,1.6);
    }
  }
  // The impact fans out along two curved lines of force around the body.
  for(const side of [-1,1]){
    ctx.beginPath();ctx.moveTo(-r,0);
    ctx.bezierCurveTo(-r*.94,side*r*.74,-r*.15,side*r*1.08,r*.36,side*r*.90);
    ctx.strokeStyle=`rgba(159,167,255,${fade*.38})`;ctx.lineWidth=3*fade;ctx.stroke();
    const a=Math.PI+side*(.12+p*1.85);
    const x=Math.cos(a)*(r+2),y=Math.sin(a)*(r+2);
    glow(ctx,x,y,8,"rgba(176,184,255,1)",fade*.75);
    line(ctx,[[x-2,y],[x+2,y]],"rgba(248,248,255,1)",1.2,fade);
  }
  glow(ctx,-r,0,18,"rgba(169,167,255,1)",fade*.7);
}

export function drawShieldVariant(ctx,effect,id){
  if(effect.delay>0 || effect.life<=0 || effect.life>effect.max || effect.surface!=="shield" || Number(effect.target?.hp)<=0) return false;
  const p=clamp(1-effect.life/effect.max),center=getEnemyImpactCenter(effect);
  if(id!=="magnetic"){
    drawShieldSurface(ctx,{...center,radius:effect.radius,angle:effect.angle,progress:p,style:id});
    return true;
  }
  const fade=Math.sin(Math.min(1,p/.065)*Math.PI/2)*(1-p)**1.35;
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation="lighter";
  ctx.translate(center.x,center.y);ctx.rotate(effect.angle-Math.PI);
  magnetic(ctx,effect.radius,p,fade);ctx.restore();return true;
}
