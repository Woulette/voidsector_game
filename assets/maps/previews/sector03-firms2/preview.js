import {MAPS as BASE_MAPS, getMapPortals, getClosedMapPortals} from "/src/game/combatData/maps.js";
import {createHelionThreeVisualMaps} from "/src/game/combatData/helionThreeVisuals.js";
import {createFirmSectorThreeVisualMaps, getFirmSectorThreeTheme} from "/src/game/combatData/firmSectorThreeVisuals.js";
import {getFirmHomeMapTheme} from "/src/shared/firmHomeMapThemes.js";
import {getCombatMapAssetPaths, getCachedCombatImage} from "/src/game/combatAssets.js";
import {getMiniMapVisualDefinition} from "/src/game/combatData/miniMapVisuals.js";
import {buildMapState} from "/src/game/systems/mapState.js";
import {drawWorldLayer} from "/src/game/render/world.js";
import {drawMiniMap} from "/src/game/render/canvasHud.js";
import {createMiniMapSceneryRenderer} from "/src/game/render/miniMapScenery.js";
import {projectMapSceneryLayer} from "/src/game/render/mapSceneryProjection.js";
import {getMiniMapLayout} from "/src/game/systems/miniMapLayout.js";
import {ships} from "/src/data/ships.js";

const maps=createFirmSectorThreeVisualMaps(createHelionThreeVisualMaps(BASE_MAPS));
const canvas=document.querySelector("canvas"),ctx=canvas.getContext("2d");
const parameters=new URLSearchParams(location.search),captureMode=parameters.has("capture");
const player={x:0,y:0,radar:950,angle:0,radius:48,safeZoneLock:0};
const ship=ships.find(entry=>entry.id==="orion"),shipSrc=ship.combatImg||ship.img;
const controls=Object.fromEntries(["sector","view","zoom","rocks","status","metrics"].map(id=>[id,document.getElementById(id)]));
const views={centre:{x:0,y:0},nebula:{x:3500,y:-1800},ruin:{x:-2200,y:-700},
  entry:{x:-4300,y:3300},north:{x:4300,y:-3300},edge:{x:0,y:3900},outside:{x:-7000,y:0}};
let map,theme,generated,cache={},ready=false,zoom=.8,drag=null,target=null,lastTime=0,lastMetrics=0,miniRect=null,costs=[],sequence=0;

function resize(){
  const dpr=Math.min(2,devicePixelRatio||1);
  canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
  canvas.__dpr=dpr;canvas.__renderWidth=innerWidth/zoom;canvas.__renderHeight=innerHeight/zoom;
}
function locate(){Object.assign(player,views[controls.view.value]||views.centre);target=null;costs=[];lastMetrics=0;}
async function load(){
  const request=++sequence;ready=false;document.body.dataset.ready="false";
  controls.status.textContent="Préparation des textures…";
  map=maps.find(entry=>String(entry.id)===controls.sector.value);
  theme=getFirmSectorThreeTheme(map)||getFirmHomeMapTheme({id:0,name:"Helion-01"});
  const atlas=getMiniMapVisualDefinition(map).image;
  const paths=[...new Set([...getCombatMapAssetPaths(map),shipSrc])].filter(src=>!captureMode||src!==atlas);
  // A preview loads one sector at a time; only its native texture set is retained.
  const sources={};
  await Promise.all(paths.map(src=>new Promise(resolve=>{
    const image=getCachedCombatImage(sources,src);
    if(image?.complete)return resolve();
    image.addEventListener("load",resolve,{once:true});image.addEventListener("error",resolve,{once:true});
  })));
  if(request!==sequence)return;
  const missing=paths.filter(src=>!sources[src]?.naturalWidth);if(missing.length)throw Error("Textures manquantes : "+missing.join(", "));
  cache=sources;generated=buildMapState(map).state;ready=true;costs=[];lastMetrics=0;
  document.body.dataset.ready=String(map.id);document.body.style.setProperty("--accent",`rgb(${theme.hubColor})`);
  document.querySelector("h1").textContent=map.name.toUpperCase();
  document.querySelector("#description").textContent={cyan:"Bleu profond · cœur d’Éclanite violet",jaune:"Or et lumière dorée · cœur d’Éclanite violet",verte:"Vert émeraude · cœur d’Éclanite violet",astra:"Rouge et cuivre · composition de référence"}[theme.palette];
  for(const button of document.querySelectorAll("[data-sector]")){
    button.setAttribute("aria-pressed",String(button.dataset.sector===String(map.id)));
  }
  controls.status.textContent="Aperçu prêt · décor et mini-carte du jeu";
}
function move(dt){
  if(!target)return;
  const dx=target.x-player.x,dy=target.y-player.y,distance=Math.hypot(dx,dy),step=Math.min(distance,1500*dt);
  if(distance<1){target=null;return;}
  player.x+=dx/distance*step;player.y+=dy/distance*step;player.angle=Math.atan2(dy,dx)+Math.PI/2;
}
function draw(now){
  const dt=Math.min(.04,(now-lastTime)/1000||0);lastTime=now;if(!ready)return;move(dt);
  const start=performance.now(),w=canvas.__renderWidth,h=canvas.__renderHeight,dpr=canvas.__dpr;
  const camera={x:player.x-w/2,y:player.y-h/2,zoom};
  ctx.setTransform(dpr*zoom,0,0,dpr*zoom,0,0);
  drawWorldLayer({ctx,canvas,cache,currentMap:map,camera,...generated,player,stations:[],nebulae:[],
    safeReady:false,spawnProtected:false,getMapPortals,getClosedMapPortals,
    graphicsQuality:"high",graphicsEffects:{nebulae:true,cosmicClouds:true,starGlow:true,backgroundAsteroids:controls.rocks.checked}});
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(player.angle);ctx.drawImage(cache[shipSrc],-46,-46,92,92);ctx.restore();
  ctx.fillStyle="#63e9ac";ctx.fillRect(w/2-26,h/2-61,52,3);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const mw=Math.min(410,Math.max(280,innerWidth*.31)),mh=Math.round((mw-16)*.45)+64;
  miniRect={x:innerWidth-mw-20,y:innerHeight-mh-20,w:mw,h:mh};
  drawMiniMap({ctx,canvas,cache,currentMap:map,stations:[],player,enemies:[],
    rect:miniRect,moveTarget:target,
    closedPortals:getClosedMapPortals(map),getMapPortals});
  costs.push(performance.now()-start);if(costs.length>120)costs.shift();
  if(now-lastMetrics>250){
    lastMetrics=now;
    const sorted=[...costs].sort((a,b)=>a-b),planet=map.parallaxScene.images.find(layer=>layer.kind==="planet");
    const point=projectMapSceneryLayer({layer:planet,camera,viewWidth:w,viewHeight:h});
    controls.metrics.textContent=`X ${Math.round(player.x/10)} · Y ${Math.round(player.y/10)} · zoom ${Math.round(zoom*100)} % · planète ${point.x.toFixed(1)} / ${point.y.toFixed(1)} · médiane CPU ${sorted[Math.floor(sorted.length*.5)].toFixed(2)} ms`;
    document.body.dataset.frames=String(Number(document.body.dataset.frames||0)+1);
  }
}
function frame(now){try{draw(now);requestAnimationFrame(frame);}catch(error){showError(error);}}
function showError(error){document.body.dataset.error="true";controls.status.textContent=error.message;console.error(error);}

for(const button of document.querySelectorAll("[data-sector]"))button.onclick=()=>{
  controls.sector.value=button.dataset.sector;load().catch(showError);
};
controls.sector.onchange=()=>load().catch(showError);
controls.view.onchange=locate;
controls.zoom.onchange=()=>{zoom=Number(controls.zoom.value);resize();costs=[];};
document.querySelector("#clean").onclick=()=>document.body.classList.add("clean");
document.querySelector("#travel").onclick=()=>{player.x+=1000;target=null;lastMetrics=0;};
addEventListener("keydown",event=>{if(event.key==="Escape"){document.body.classList.remove("clean");target=null;}});
addEventListener("resize",resize);
canvas.addEventListener("contextmenu",event=>event.preventDefault());
canvas.addEventListener("pointerdown",event=>{
  if(event.button===2){drag={x:event.clientX,y:event.clientY,px:player.x,py:player.y};target=null;canvas.setPointerCapture(event.pointerId);}
  else if(event.button===0){
    const x=event.clientX,y=event.clientY,inside=rect=>rect&&x>=rect.x&&x<=rect.x+rect.w&&y>=rect.y&&y<=rect.y+rect.h;
    if(inside(miniRect)){
      const layout=getMiniMapLayout(miniRect);
      if(inside(layout.minus)||inside(layout.plus)){
        zoom=Math.max(.55,Math.min(1.3,zoom+(inside(layout.plus)?.1:-.1)));controls.zoom.value=String(zoom);resize();
      }else if(inside(layout.content))target={x:((x-layout.content.x)/layout.content.w-.5)*map.width,y:((y-layout.content.y)/layout.content.h-.5)*map.height};
      return;
    }
    target={x:player.x+(x-innerWidth/2)/zoom,y:player.y+(y-innerHeight/2)/zoom};
  }
});
canvas.addEventListener("pointermove",event=>{if(drag){player.x=drag.px-(event.clientX-drag.x)/zoom;player.y=drag.py-(event.clientY-drag.y)/zoom;}});
canvas.addEventListener("pointerup",()=>drag=null);canvas.addEventListener("pointercancel",()=>drag=null);
document.querySelector("#captureAtlas").hidden=!captureMode;
document.querySelector("#captureAtlas").onclick=()=>{
  const surface=document.createElement("canvas");surface.width=1200;surface.height=540;
  const bare={...map,spawn:null,spawnStations:[],questStations:[],questNpcs:[],portal:null,portals:[],closedPortals:[]};
  const sources={...cache};delete sources[getMiniMapVisualDefinition(map).image];
  createMiniMapSceneryRenderer()({ctx:surface.getContext("2d"),currentMap:bare,cache:sources,rect:{x:0,y:0,w:1200,h:540},stations:[],pixelRatio:1});
  document.querySelector("#atlas").src=surface.toDataURL("image/png");
  document.querySelector("#atlasName").textContent=getMiniMapVisualDefinition(map).image;
  document.querySelector("#exportDialog").showModal();
};
document.querySelector("#closeExport").onclick=()=>document.querySelector("#exportDialog").close();
document.querySelector("#auditMaterials").hidden=!captureMode;
document.querySelector("#auditMaterials").onclick=async()=>{
  const button=document.querySelector("#auditMaterials");button.disabled=true;
  controls.status.textContent="Vérification des silhouettes pixel par pixel…";
  try{
    const {auditSectorMaterials}=await import("./material-audit.js?v=aligned1");
    document.querySelector("#auditReport").textContent=JSON.stringify(await auditSectorMaterials(maps),null,2);
    document.querySelector("#auditDialog").showModal();
    controls.status.textContent="Contrôle terminé";
  }catch(error){showError(error);}finally{button.disabled=false;}
};
document.querySelector("#closeAudit").onclick=()=>document.querySelector("#auditDialog").close();
controls.sector.value=maps.some(entry=>String(entry.id)===parameters.get("sector")&&[2,22,32,42].includes(entry.id))?parameters.get("sector"):"22";
controls.view.value=views[parameters.get("view")]?parameters.get("view"):"centre";
zoom=Number(parameters.get("zoom"))||.8;controls.zoom.value=String(zoom);
locate();resize();requestAnimationFrame(frame);await load().catch(showError);
