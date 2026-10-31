import {enemyCatalog} from "./catalog.js?v=creatures-clean-1";
import {drawBeams} from "../../src/game/render/entities.js?v=shield-assigned-1";
import {background,glow,sprite,clamp} from "./drawing.js";
import {SHIELD_VARIANTS,SHIELD_PREVIEW_LIFE,drawShieldVariant} from "./shieldVariants.js?v=shield-assigned-1";
import {buildShieldPreviewFrame,SHIELD_PREVIEW_PERIOD,SHIELD_PREVIEW_START} from "./shieldPreviewScene.js?v=shield-proposals-1";

const byId=id=>document.getElementById(id);
const state={time:0,last:null,paused:matchMedia("(prefers-reduced-motion: reduce)").matches};
const images={};
const panes=SHIELD_VARIANTS.filter(style=>style.id!=="magnetic").map(style=>({...style,canvas:byId(style.id),ctx:byId(style.id).getContext("2d")}));
function update(){
  byId("pause").textContent=state.paused ? "Reprendre l’animation" : "Mettre en pause";
  byId("pause").setAttribute("aria-pressed",String(state.paused));
  byId("hint").textContent=byId("outcome").value==="lethal"
    ? "Coup fatal : le laser atteint le monstre, qui disparaît sans déclencher de réaction de bouclier."
    : "Ennemis : membrane réfractive. Votre vaisseau : maillage hexagonal. Les protections disparaissent entièrement après les coups.";
}
function render(){
  let phase="Préparation";
  for(const pane of panes){
    const {canvas,ctx}=pane;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    }
    canvas.__renderWidth=w;canvas.__renderHeight=h;ctx.setTransform(dpr,0,0,dpr,0,0);
    background(ctx,w,h,0,4);
    const size=Math.min(138,w*.34),target={x:w*.72,y:h*.50,width:size,height:size,radius:size*.20};
    const from={x:w*.135,y:target.y};
    const frame=buildShieldPreviewFrame({time:state.time%SHIELD_PREVIEW_PERIOD,ammoId:byId("ammo").value,
      target,from,lethal:byId("outcome").value==="lethal"});
    const enemy=enemyCatalog.find(entry=>entry.kind===byId("enemy").value);
    const ownShip=pane.id==="hex";
    sprite(ctx,images[ownShip ? enemy.img : "assets/ships/Orion.png"],from.x,from.y,76,76,ownShip ? 0 : Math.PI/2);
    ctx.save();ctx.globalAlpha=frame.targetAlpha;sprite(ctx,images[ownShip ? "assets/ships/Orion.png" : enemy.img],target.x,target.y,size,size,ownShip ? -Math.PI/2 : 0);ctx.restore();
    for(const impact of frame.effects){
      drawShieldVariant(ctx,{...impact,max:SHIELD_PREVIEW_LIFE,life:SHIELD_PREVIEW_LIFE-impact.visualAge},pane.id);
    }
    drawBeams({ctx,camera:{x:0,y:0},beams:frame.shots});
    if(frame.deathAge>=0 && frame.deathAge<.3){
      const p=frame.deathAge/.3,fade=(1-p)**2;
      glow(ctx,target.x,target.y,12+p*30,"rgba(192,231,255,1)",fade);
    }
    ctx.fillStyle="#71899f";ctx.font="11px Segoe UI";
    ctx.fillText(ownShip ? "ENNEMI" : "VOUS",Math.max(14,from.x-15),h-28);
    ctx.fillText(frame.targetAlpha>0 ? ownShip ? "VOUS" : "ENNEMI" : "DÉTRUIT",target.x-19,h-28);
    phase=frame.phase;
  }
  byId("phase").textContent=state.paused ? `Pause · ${phase}` : phase;
}
function reset(){state.time=0;state.last=null;update();render();}
for(const id of ["ammo","enemy","outcome"]) byId(id).addEventListener("change",reset);
byId("playback").addEventListener("change",()=>{state.last=null;});
byId("pause").addEventListener("click",()=>{state.paused=!state.paused;state.last=null;update();render();});
byId("replay").addEventListener("click",()=>{state.paused=false;reset();});
byId("impact").addEventListener("click",()=>{
  state.time=SHIELD_PREVIEW_START+(byId("ammo").value==="ammo_x6" ? .24 : .29);
  state.paused=true;state.last=null;update();render();
});
new ResizeObserver(()=>{if(document.body.dataset.ready==="true")render();}).observe(document.querySelector(".shield-comparison"));
function tick(now){
  const dt=state.last===null ? 0 : clamp((now-state.last)/1000,0,.05);state.last=now;
  if(!state.paused && !document.hidden){state.time+=dt*Number(byId("playback").value);render();}
  requestAnimationFrame(tick);
}
try{
  const paths=["assets/ships/Orion.png",...enemyCatalog.filter(e=>["drone_pirate","raider_astral","chasseur_spectral"].includes(e.kind)).map(e=>e.img)];
  await Promise.all([...new Set(paths)].map(path=>new Promise((resolve,reject)=>{
    const image=new Image();images[path]=image;image.onload=resolve;image.onerror=()=>reject(new Error(`Image introuvable : ${path}`));image.src=path;
  })));
  document.body.dataset.ready="true";update();render();requestAnimationFrame(tick);
}catch(error){byId("error").hidden=false;byId("error").textContent=error.message;document.body.dataset.ready="error";console.error(error);}
