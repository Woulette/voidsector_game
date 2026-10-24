import {MAPS, getMapPortals, getClosedMapPortals} from "/src/game/combatData/maps.js";
import {ships} from "/src/data/ships.js";
import {getFirmBadgeAsset} from "/src/data/firms.js";
import {getCombatMapAssetPaths, getCachedCombatImage} from "/src/game/combatAssets.js";
import {buildMapState} from "/src/game/systems/mapState.js";
import {drawWorldLayer} from "/src/game/render/world.js";
import {drawRotatedImage} from "/src/game/render/player.js";
import {drawEnemies} from "/src/game/render/entities.js";
import {drawMiniMap} from "/src/game/render/canvasHud.js";
import {getMiniMapLayout} from "/src/game/systems/miniMapLayout.js";
import {createHelionThreeVisualMaps, HELION_THREE_PARAMETERS} from "/src/game/combatData/helionThreeVisuals.js";
import {createMiniMapSceneryRenderer} from "/src/game/render/miniMapScenery.js";
import {getMiniMapVisualDefinition} from "/src/game/combatData/miniMapVisuals.js";

const base = MAPS.find(map=>map.id === 2);
const proposed = createHelionThreeVisualMaps(MAPS).find(map=>map.id === 2);
const overview = proposed;
const currentOverview = {...base, id:"helion03-before", parallaxScene:{...base.parallaxScene}};
const generated = buildMapState(base).state;
const ship = ships.find(entry=>entry.id === "orion");
const shipSource = ship.combatImg || ship.img;
const canvas = document.querySelector("canvas"), ctx = canvas.getContext("2d"), cache = {};
const parameters = new URLSearchParams(location.search);
const captureMode=parameters.has("capture");
document.getElementById("captureAtlas").hidden=!captureMode;
const views = {cataclysm:{x:3500,y:-1800},centre:{x:0,y:0},entry:{x:-4300,y:3300},north:{x:4300,y:-3300},
  east:{x:4300,y:3300},dark:{x:-2600,y:-1800},edge:{x:0,y:3900},outside:{x:-5700,y:0}};
const player = {x:0,y:0,angle:0,radar:950,radius:48,safeZoneLock:0};
const controls = Object.fromEntries(["view","zoom","silhouettes","rocks","details","status"].map(id=>[id,document.getElementById(id)]));
let active = parameters.get("variant") === "current" ? "current" : "proposed";
let map = active === "current" ? base : proposed;
let zoom = Number(parameters.get("zoom")) || .8, ready = false, target = null, drag = null;
let miniRect = null, previousTime = 0, lastStatus = 0, currentView = parameters.get("view") || "cataclysm";
const keys = new Set(), costs = [], imageErrors = [];
const silhouettes = generated.enemies.filter((enemy,index,list)=>list.findIndex(value=>value.kind === enemy.kind) === index).slice(0,3);
const offsets = [{x:-260,y:-80},{x:240,y:-150},{x:280,y:210}];
const combatSamples = silhouettes.map((enemy,index)=>({...enemy,...offsets[index],homeX:offsets[index].x,homeY:offsets[index].y,
  angle:index*.8,hitT:0,aggro:false,serverControlled:true,visualCorrectionOffsetX:0,visualCorrectionOffsetY:0}));

function resize(){
  const dpr = Math.min(2,devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth*dpr); canvas.height = Math.round(innerHeight*dpr);
  canvas.__dpr = dpr; canvas.__renderWidth = innerWidth/zoom; canvas.__renderHeight = innerHeight/zoom;
}
function locate(name){
  currentView = views[name] ? name : "centre";Object.assign(player,views[currentView]);
  controls.view.value = currentView;target = null;
}
function setVariant(value){
  active = value; map = value === "current" ? base : proposed;
  for(const id of ["proposed","current"])document.getElementById(id).classList.toggle("active",id === value);
  document.querySelector("h1").textContent = value === "current" ? "HELION-03 · ACTUELLE" : "SILLON ÉCARLATE";
}
function setZoom(value){
  zoom = Math.max(.55,Math.min(1.3,value));
  const matching = [...controls.zoom.options].find(option=>Math.abs(Number(option.value)-zoom)<.01);
  controls.zoom.value = matching?.value || "";resize();
}
function pointFromScreen(x,y){return {x:player.x+(x-innerWidth/2)/zoom,y:player.y+(y-innerHeight/2)/zoom};}
function inside(point,rect){return rect && point.x>=rect.x && point.x<=rect.x+rect.w && point.y>=rect.y && point.y<=rect.y+rect.h;}
function setDestination(point){
  target = {x:Math.max(-5700,Math.min(5700,point.x)),y:Math.max(-4700,Math.min(4700,point.y))};
}
function move(dt){
  const speed = keys.has("shift") ? 3000 : 1300;
  let dx = (keys.has("d")||keys.has("arrowright")?1:0)-(keys.has("q")||keys.has("a")||keys.has("arrowleft")?1:0);
  let dy = (keys.has("s")||keys.has("arrowdown")?1:0)-(keys.has("z")||keys.has("w")||keys.has("arrowup")?1:0);
  let moving = dx || dy;
  if(moving){target=null;const length=Math.hypot(dx,dy);dx=dx/length*speed*dt;dy=dy/length*speed*dt;}
  else if(target){
    const x=target.x-player.x,y=target.y-player.y,distance=Math.hypot(x,y),step=Math.min(distance,speed*dt);
    if(distance<1)target=null;
    else{dx=x/distance*step;dy=y/distance*step;moving=true;}
  }
  if(moving){player.x+=dx;player.y+=dy;player.angle=Math.atan2(dy,dx)+Math.PI/2;}
}
function drawDestination(camera){
  if(!target)return;
  ctx.save();ctx.strokeStyle="rgba(122,223,239,.65)";ctx.lineWidth=1.3;ctx.beginPath();
  ctx.arc(target.x-camera.x,target.y-camera.y,14,0,Math.PI*2);ctx.stroke();ctx.restore();
}
function draw(now){
  if(!ready)return;
  const dt=Math.min(.04,(now-previousTime)/1000||0);previousTime=now;move(dt);
  const start=performance.now(),w=canvas.__renderWidth,h=canvas.__renderHeight,dpr=canvas.__dpr;
  const camera={x:player.x-w/2,y:player.y-h/2,zoom};
  ctx.setTransform(dpr*zoom,0,0,dpr*zoom,0,0);
  drawWorldLayer({ctx,canvas,cache,currentMap:map,camera,...generated,nebulae:[],player,stations:[],
    safeReady:false,spawnProtected:false,getMapPortals,getClosedMapPortals,
    graphicsQuality:"high",graphicsEffects:{nebulae:true,cosmicClouds:true,starGlow:true,backgroundAsteroids:controls.rocks.checked}});
  if(controls.silhouettes.checked)drawEnemies({ctx,camera,cache,enemies:combatSamples,selectedEnemy:null});
  drawDestination(camera);
  drawRotatedImage({ctx,camera,img:cache[shipSource],x:player.x,y:player.y,w:92,h:92,angle:player.angle});
  ctx.fillStyle="#3ee697";ctx.fillRect(w/2-26,h/2-61,52,3);
  ctx.font="600 13px Segoe UI";ctx.textAlign="center";ctx.fillStyle="#e3f3ff";ctx.shadowColor="#02050a";ctx.shadowBlur=4;
  ctx.fillText("Exploration",w/2,h/2+67);ctx.shadowBlur=0;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const mw=Math.min(410,Math.max(280,innerWidth*.31)),mh=Math.round((mw-16)*.45)+64;
  miniRect={x:innerWidth-mw-20,y:innerHeight-mh-20,w:mw,h:mh};
  drawMiniMap({ctx,canvas,cache,currentMap:active === "current" ? currentOverview : overview,stations:[],player,
    enemies:controls.silhouettes.checked?combatSamples:[],rect:miniRect,moveTarget:target,
    closedPortals:getClosedMapPortals(map),getMapPortals});
  costs.push(performance.now()-start);if(costs.length>120)costs.shift();
  if(now-lastStatus>300){
    lastStatus=now;controls.details.textContent=`X ${Math.round(player.x/10)} · Y ${Math.round(player.y/10)} · zoom ${Math.round(zoom*100)} %`;
    document.body.dataset.frames=String(Number(document.body.dataset.frames||0)+1);
  }
}
function frame(now){
  try{draw(now);requestAnimationFrame(frame);}catch(error){showError(error);}
}
function showError(error){
  document.body.dataset.error="true";const pane=document.getElementById("failure");pane.style.display="block";
  pane.textContent="L’aperçu n’a pas pu se charger.\n"+String(error?.stack||error);console.error(error);
}

for(const id of ["current","proposed"])document.getElementById(id).onclick=()=>setVariant(id);
controls.view.onchange=()=>locate(controls.view.value);
controls.zoom.onchange=()=>setZoom(Number(controls.zoom.value));
document.getElementById("clean").onclick=()=>document.body.classList.add("clean");
addEventListener("resize",resize);
addEventListener("keydown",event=>{
  if(event.key === "Escape"){document.body.classList.remove("clean");target=null;return;}
  if(event.target.matches("select,input,button"))return;
  const key=event.key.toLowerCase();if(["z","q","s","d","w","a","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(key)){event.preventDefault();keys.add(key);}
});
addEventListener("keyup",event=>keys.delete(event.key.toLowerCase()));
addEventListener("blur",()=>keys.clear());
canvas.addEventListener("contextmenu",event=>event.preventDefault());
canvas.addEventListener("pointerdown",event=>{
  if(event.button === 2){drag={x:event.clientX,y:event.clientY,px:player.x,py:player.y};target=null;canvas.setPointerCapture(event.pointerId);return;}
  if(event.button !== 0)return;
  const point={x:event.clientX,y:event.clientY};
  if(inside(point,miniRect)){
    const layout=getMiniMapLayout(miniRect);
    if(inside(point,layout.minus)){setZoom(zoom-.1);return;}if(inside(point,layout.plus)){setZoom(zoom+.1);return;}
    if(inside(point,layout.content)){setDestination({x:(point.x-layout.content.x)/layout.content.w*map.width-map.width/2,
      y:(point.y-layout.content.y)/layout.content.h*map.height-map.height/2});return;}
    return;
  }
  setDestination(pointFromScreen(event.clientX,event.clientY));
});
canvas.addEventListener("pointermove",event=>{if(drag){player.x=drag.px-(event.clientX-drag.x)/zoom;player.y=drag.py-(event.clientY-drag.y)/zoom;}});
canvas.addEventListener("pointerup",()=>drag=null);canvas.addEventListener("pointercancel",()=>drag=null);
canvas.addEventListener("wheel",event=>{event.preventDefault();setZoom(zoom+(event.deltaY<0?.05:-.05));},{passive:false});

async function load(){
  const assets=[...new Set([...getCombatMapAssetPaths(base),...getCombatMapAssetPaths(proposed),shipSource,
    getFirmBadgeAsset("astra"),...combatSamples.map(enemy=>enemy.img)])].filter(src=>src && (!captureMode || src!==getMiniMapVisualDefinition(proposed)?.image));
  await Promise.all(assets.map(src=>new Promise(resolve=>{
    const image=getCachedCombatImage(cache,src);if(image?.complete){if(!image.naturalWidth)imageErrors.push(src);return resolve();}
    image?.addEventListener("load",resolve,{once:true});image?.addEventListener("error",()=>{imageErrors.push(src);resolve();},{once:true});
  })));
  if(imageErrors.length)throw Error("Textures indisponibles : "+imageErrors.join(", "));
  ready=true;document.body.dataset.ready="true";controls.status.textContent="Aperçu prêt · mini-carte fixe · silhouettes statiques";
  window.helionThreePreview={
    getState:()=>({active,player:{x:player.x,y:player.y},zoom,ready,assets:assets.length,imageErrors:[...imageErrors],
      nebulaParallax:HELION_THREE_PARAMETERS.p,cpuMedianMs:[...costs].sort((a,b)=>a-b)[Math.floor(costs.length/2)]}),
    setView:locate,setVariant,setPosition:(x,y)=>{Object.assign(player,{x,y});target=null;},setZoom,
    get map(){return map;},get overview(){return overview;},get cache(){return cache;}
  };
}
locate(currentView);setVariant(active);setZoom(zoom);
if(parameters.get("clean") === "1")document.body.classList.add("clean");
document.getElementById("captureAtlas").onclick=()=>{
  const output=document.createElement("canvas");output.width=1200;output.height=540;
  const sources={...cache};delete sources[getMiniMapVisualDefinition(proposed).image];
  const bare={...proposed,spawn:null,spawnStations:[],questStations:[],questNpcs:[],portal:null,portals:[],closedPortals:[]};
  createMiniMapSceneryRenderer()({ctx:output.getContext("2d"),currentMap:bare,cache:sources,rect:{x:0,y:0,w:1200,h:540},stations:[],pixelRatio:1});
  document.getElementById("atlas").src=output.toDataURL("image/png");document.getElementById("exportDialog").showModal();
};
document.getElementById("closeExport").onclick=()=>document.getElementById("exportDialog").close();
requestAnimationFrame(frame);await load().catch(showError);
