import { MAPS as BASE_MAPS } from "/src/game/combatData/maps.js";
import { createHelionOneVisualMaps } from "/src/game/combatData/helionOneVisuals.js";
import { createHelionTwoVisualMaps } from "/src/game/combatData/helionTwoVisuals.js";
import { createFirmSectorTwoVisualMaps, getFirmSectorTwoTheme } from "/src/game/combatData/firmSectorTwoVisuals.js";
import { getFirmHomeMapTheme } from "/src/shared/firmHomeMapThemes.js";
import { getCombatMapAssetPaths, getCachedCombatImage } from "/src/game/combatAssets.js";
import { getMiniMapVisualDefinition } from "/src/game/combatData/miniMapVisuals.js";
import { buildMapState } from "/src/game/systems/mapState.js";
import { drawWorldLayer } from "/src/game/render/world.js";
import { drawMiniMap } from "/src/game/render/canvasHud.js";
import { createMiniMapSceneryRenderer } from "/src/game/render/miniMapScenery.js";
import { projectMapSceneryLayer } from "/src/game/render/mapSceneryProjection.js";

const maps=createFirmSectorTwoVisualMaps(createHelionTwoVisualMaps(createHelionOneVisualMaps(BASE_MAPS)));
const canvas=document.querySelector("canvas"),ctx=canvas.getContext("2d"),cache={};
const player={x:0,y:0,radar:950,angle:0,radius:48,safeZoneLock:0};
const captureMode=new URLSearchParams(location.search).has("capture");
const ship=new Image();ship.src="assets/ships/Velox.png";
let map,theme,generated,center={x:0,y:0},zoom=.8,ready=false,costs=[],dragging=null,loadSequence=0;
function resize(){zoom=Number(document.querySelector("#zoom").value);canvas.width=innerWidth;canvas.height=innerHeight;canvas.__renderWidth=innerWidth/zoom;canvas.__renderHeight=innerHeight/zoom;}
function setView(){
  const sx=theme.mirrorX,sy=theme.mirrorY;
  const views={overview:{x:-1250,y:-500},entry:{x:-4300,y:3300},station:{x:-1750,y:-250},planet:{x:3200,y:-2200},wreck:{x:-4000,y:2700},ricky:{x:4470,y:-3180},center:{x:0,y:0},edge:{x:-5400,y:0}};
  const point=views[document.querySelector("#view").value];center={x:point.x*sx,y:point.y*sy};costs=[];
}
async function load(){
  const sequence=++loadSequence;ready=false;document.querySelector("#status").textContent="Préparation des textures…";
  const id=Number(document.querySelector("#sector").value),current=maps.find(entry=>entry.id===id);
  theme=getFirmSectorTwoTheme(current)||getFirmHomeMapTheme({id:0,name:"Helion-01"});
  const legacy=document.querySelector("#variant").value==="legacy";
  map=legacy?{...BASE_MAPS.find(entry=>entry.id===id),id:`legacy-${id}`} : current;
  const atlasPath=getMiniMapVisualDefinition(map)?.image;
  const paths=getCombatMapAssetPaths(map).filter(src=>!captureMode||src!==atlasPath);
  await Promise.all(paths.map(src=>new Promise(resolve=>{
    const image=getCachedCombatImage(cache,src);if(image?.complete)return resolve();
    image?.addEventListener("load",resolve,{once:true});image?.addEventListener("error",resolve,{once:true});
  })));
  if(sequence!==loadSequence)return;
  const missing=paths.filter(src=>!cache[src]?.naturalWidth);if(missing.length)throw Error("Textures manquantes : "+missing.join(", "));
  generated=buildMapState(map).state;setView();ready=true;
  document.querySelector("#title").textContent=current.name.toUpperCase()+" · FRONTIÈRE INDUSTRIELLE";
  document.querySelector("#description").textContent={cyan:"Bleu profond, lumière froide et métaux préservés",jaune:"Or sombre, éclats ambrés et profondeur lointaine",verte:"Vert émeraude, lumière diffuse et espaces ouverts",astra:"Composition approuvée · référence des secteurs 02"}[theme.palette];
  document.body.style.setProperty("--accent",`rgb(${theme.hubColor})`);
  document.querySelector("#status").textContent=`${paths.length} textures prêtes · aperçu isolé`;
  document.body.dataset.ready=String(id);document.body.dataset.variant=legacy?"legacy":"new";draw();
}
function draw(){
  if(!ready)return;
  const start=performance.now(),w=canvas.__renderWidth,h=canvas.__renderHeight,camera={x:center.x-w/2,y:center.y-h/2,zoom};Object.assign(player,center);
  ctx.setTransform(zoom,0,0,zoom,0,0);
  drawWorldLayer({ctx,canvas,cache,currentMap:map,camera,...generated,player,stations:[],graphicsQuality:"high",graphicsEffects:{nebulae:document.querySelector("#clouds").checked,backgroundAsteroids:document.querySelector("#rocks").checked}});
  if(ship.complete&&ship.naturalWidth){ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-.32);ctx.drawImage(ship,-43,-43,86,86);ctx.restore();}
  ctx.fillStyle="#63e9ac";ctx.fillRect(w/2-25,h/2-55,50,3);
  ctx.setTransform(1,0,0,1,0,0);
  const mw=Math.min(444,innerWidth-36),mh=Math.round((mw-16)*.45)+64;
  drawMiniMap({ctx,canvas,cache,currentMap:map,stations:[],player,enemies:[],rect:{x:innerWidth-mw-22,y:innerHeight-mh-22,w:mw,h:mh},moveTarget:null});
  costs.push(performance.now()-start);if(costs.length>120)costs.shift();
  const sorted=[...costs].sort((a,b)=>a-b),planet=map.parallaxScene.images.find(layer=>layer.kind==="planet"||layer.src?.includes("planet"));
  const position=planet?projectMapSceneryLayer({layer:planet,camera,viewWidth:w,viewHeight:h,defaultParallax:.35}):{x:0,y:0};
  document.querySelector("#metrics").textContent=`Caméra ${Math.round(center.x)} / ${Math.round(center.y)} · planète ${position.x.toFixed(1)} / ${position.y.toFixed(1)} · p=${planet?.p}\nDécor + mini-carte, soumission CPU : médiane ${sorted[Math.floor(sorted.length*.5)].toFixed(2)} ms / P95 ${sorted[Math.floor(sorted.length*.95)].toFixed(2)} ms · ${map.closeStarCount} étoiles proches`;
}
function frame(){draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
resize();addEventListener("resize",resize);
for(const id of ["sector","variant"]){document.querySelector("#"+id).onchange=()=>load().catch(showError);}
for(const id of ["view","zoom","clouds","rocks"]){document.querySelector("#"+id).onchange=()=>{if(id==="view")setView();else costs=[];resize();draw();};}
document.querySelector("#travel").onclick=()=>{center.x+=1000;costs=[];draw();};
document.querySelector("#clean").onclick=()=>document.body.classList.add("clean");
addEventListener("keydown",event=>{if(event.key==="Escape")document.body.classList.remove("clean");});
canvas.addEventListener("pointerdown",event=>{dragging={px:event.clientX,py:event.clientY,cx:center.x,cy:center.y};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener("pointermove",event=>{if(dragging){center={x:dragging.cx-(event.clientX-dragging.px)/zoom,y:dragging.cy-(event.clientY-dragging.py)/zoom};costs=[];}});
canvas.addEventListener("pointerup",()=>{dragging=null;});
document.querySelector("#captureAtlas").onclick=()=>{
  const output=document.createElement("canvas");output.width=1200;output.height=540;
  const current=maps.find(entry=>entry.id===Number(document.querySelector("#sector").value));
  const bare={...current,spawn:null,spawnStations:[],questStations:[],questNpcs:[],portal:null,portals:[],closedPortals:[]};
  const sources={...cache};delete sources[getMiniMapVisualDefinition(current).image];
  createMiniMapSceneryRenderer()({ctx:output.getContext("2d"),currentMap:bare,cache:sources,rect:{x:0,y:0,w:1200,h:540},stations:[],pixelRatio:1});
  document.querySelector("#atlas").src=output.toDataURL("image/png");document.querySelector("#atlasName").textContent=getMiniMapVisualDefinition(current).image;document.querySelector("#exportDialog").showModal();
};
document.querySelector("#closeExport").onclick=()=>document.querySelector("#exportDialog").close();
function showError(error){document.querySelector("#status").textContent=error.message;console.error(error);}
await load().catch(showError);
