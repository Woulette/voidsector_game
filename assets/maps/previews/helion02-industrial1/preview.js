import { MAPS as BASE_MAPS } from "/src/game/combatData/maps.js";
import { createHelionOneVisualMaps } from "/src/game/combatData/helionOneVisuals.js";
import { createHelionTwoVisualMaps } from "/src/game/combatData/helionTwoVisuals.js";
import { getCombatMapAssetPaths, getCachedCombatImage } from "/src/game/combatAssets.js";
import { getMiniMapVisualDefinition } from "/src/game/combatData/miniMapVisuals.js";
import { buildMapState } from "/src/game/systems/mapState.js";
import { drawWorldLayer } from "/src/game/render/world.js";
import { drawMiniMap } from "/src/game/render/canvasHud.js";
import { createMiniMapSceneryRenderer } from "/src/game/render/miniMapScenery.js";
import { projectMapSceneryLayer } from "/src/game/render/mapSceneryProjection.js";

const maps=createHelionTwoVisualMaps(createHelionOneVisualMaps(BASE_MAPS));
const baseline=BASE_MAPS.find(map=>map.id===1),updated=maps.find(map=>map.id===1);
const legacyMiniMap={...baseline,id:"helion-02-before"};
const canvas=document.querySelector("canvas"),ctx=canvas.getContext("2d"),cache={};
const player={x:0,y:0,radar:950,angle:0,radius:48,safeZoneLock:0};
const captureMode=new URLSearchParams(location.search).has("capture");
const ship=new Image();ship.src="assets/ships/Velox.png";
let map,generated,camera,center={x:0,y:0},zoom=1,ready=false,costs=[],dragging=null,frames=0;
function resetMeasurement(){costs=[];frames=0;document.body.dataset.settled="false";}
function resize(){
  zoom=Number(document.querySelector("#zoom").value);
  canvas.width=innerWidth;canvas.height=innerHeight;
  canvas.__renderWidth=innerWidth/zoom;canvas.__renderHeight=innerHeight/zoom;
}
function setView(){
  const views={industry:{x:0,y:0},entry:{x:-4300,y:3300},station:{x:-1750,y:-250},
    screenshot:{x:-3820,y:940},planet:{x:3200,y:-2200},wreck:{x:-4000,y:2700},ricky:{x:4470,y:-3180},
    top:{x:0,y:-3900},bottom:{x:0,y:3900},left:{x:-4900,y:0},right:{x:4900,y:0},outside:{x:-5900,y:0}};
  center={...views[document.querySelector("#view").value]};resetMeasurement();
}
async function load(){
  ready=false;
  map=document.querySelector("#variant").value==="legacy"?baseline:updated;
  const atlasPath=getMiniMapVisualDefinition(map)?.image;
  const paths=getCombatMapAssetPaths(map).filter(src=>!captureMode || src!==atlasPath);
  await Promise.all(paths.map(src=>new Promise(resolve=>{
    const image=getCachedCombatImage(cache,src);
    if(image?.complete)return resolve();
    image?.addEventListener("load",resolve,{once:true});image?.addEventListener("error",resolve,{once:true});
  })));
  const missing=paths.filter(src=>!cache[src]?.naturalWidth);
  if(missing.length)throw Error("Textures manquantes : "+missing.join(", "));
  generated=buildMapState(map).state;resetMeasurement();ready=true;
  document.querySelector("#status").textContent=paths.length+" textures prêtes · éléments séparés";
  document.body.dataset.ready=document.querySelector("#variant").value;draw();
}
function draw(){
  if(!ready)return;
  const start=performance.now(),w=canvas.__renderWidth,h=canvas.__renderHeight;
  camera={x:center.x-w/2,y:center.y-h/2,zoom};Object.assign(player,center);
  ctx.setTransform(zoom,0,0,zoom,0,0);
  drawWorldLayer({ctx,canvas,cache,currentMap:map,camera,...generated,player,stations:[],
    graphicsQuality:document.querySelector("#quality").value,
    graphicsEffects:{nebulae:document.querySelector("#clouds").checked,backgroundAsteroids:document.querySelector("#rocks").checked}});
  if(ship.complete&&ship.naturalWidth)ctx.drawImage(ship,w/2-43,h/2-43,86,86);
  ctx.fillStyle="#36de7a";ctx.fillRect(w/2-27,h/2-63,54,4);
  ctx.font="600 14px Segoe UI";ctx.textAlign="center";ctx.fillStyle="#e3f3ff";ctx.fillText("Pilote · repère de taille",w/2,h/2+66);
  ctx.setTransform(1,0,0,1,0,0);
  const mw=Math.min(460,innerWidth-36),mh=Math.round((mw-16)*.45)+64;
  const miniMap=document.querySelector("#variant").value==="legacy"?legacyMiniMap:map;
  drawMiniMap({ctx,canvas,cache,currentMap:miniMap,stations:[],player,enemies:[],
    rect:{x:innerWidth-mw-18,y:innerHeight-mh-18,w:mw,h:mh},moveTarget:null});
  costs.push(performance.now()-start);if(costs.length>120)costs.shift();
  if(++frames===240)document.body.dataset.settled="true";
  const sorted=[...costs].sort((a,b)=>a-b),planet=map.parallaxScene.images.find(layer=>layer.kind==="planet"||layer.src.includes("planet"));
  const point=projectMapSceneryLayer({layer:planet,camera,viewWidth:w,viewHeight:h,defaultParallax:.35});
  document.querySelector("#metrics").textContent=`Caméra ${Math.round(center.x)} / ${Math.round(center.y)} · planète ${point.x.toFixed(1)} / ${point.y.toFixed(1)} · p=${planet.p}\nSoumission CPU du décor et mini-carte : médiane ${sorted[Math.floor(sorted.length*.5)].toFixed(2)} ms · P95 ${sorted[Math.floor(sorted.length*.95)].toFixed(2)} ms\n${map.closeStarCount} étoiles de proximité définies · ${map.parallaxScene.images.length} couches d’images`;
}
function frame(){draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
resize();setView();addEventListener("resize",resize);
for(const id of ["view","zoom","quality","clouds","rocks"]){document.querySelector("#"+id).onchange=()=>{if(id==="view")setView();else resetMeasurement();resize();draw();};}
document.querySelector("#variant").onchange=()=>load().catch(showError);
document.querySelector("#travel").onclick=()=>{center.x+=1000;resetMeasurement();draw();};
document.querySelector("#clean").onclick=()=>document.body.classList.add("clean");
addEventListener("keydown",event=>{if(event.key==="Escape")document.body.classList.remove("clean");});
canvas.addEventListener("pointerdown",event=>{dragging={px:event.clientX,py:event.clientY,cx:center.x,cy:center.y};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener("pointermove",event=>{if(dragging)center={x:dragging.cx-(event.clientX-dragging.px)/zoom,y:dragging.cy-(event.clientY-dragging.py)/zoom};});
canvas.addEventListener("pointerup",()=>{dragging=null;});
document.querySelector("#captureAtlas").onclick=()=>{
  const output=document.createElement("canvas");output.width=1200;output.height=540;
  const bare={...updated,spawn:null,spawnStations:[],questStations:[],questNpcs:[],portal:null,portals:[],closedPortals:[]};
  const sources={...cache};delete sources[getMiniMapVisualDefinition(updated).image];
  createMiniMapSceneryRenderer()({ctx:output.getContext("2d"),currentMap:bare,cache:sources,
    rect:{x:0,y:0,w:1200,h:540},stations:[],pixelRatio:1});
  document.querySelector("#atlas").src=output.toDataURL("image/png");
  document.body.dataset.atlasReady="true";
};
function showError(error){document.querySelector("#status").textContent=error.message;console.error(error);}
await load().catch(showError);
