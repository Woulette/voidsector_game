import { MAPS as BASE_MAPS } from "/src/game/combatData/maps.js?v=20261023-firm-homes1";
import { createHelionOneVisualMaps } from "/src/game/combatData/helionOneVisuals.js?v=20261023-firm-homes1";
import { getFirmHomeMapTheme } from "/src/shared/firmHomeMapThemes.js";
import { createCombatMapAssetCache, getCombatMapAssetPaths } from "/src/game/combatAssets.js?v=20261023-firm-homes1";
import { buildMapState } from "/src/game/systems/mapState.js";
import { drawWorldLayer } from "/src/game/render/world.js";
import { createCombatWorldStateSystem } from "/src/game/systems/combatWorldState.js?v=20261023-firm-homes1";
import { projectMapSceneryLayer } from "/src/game/render/mapSceneryProjection.js";
import { drawMiniMap } from "/src/game/render/canvasHud.js?v=20261023-map-consistency1";

const maps=createHelionOneVisualMaps(BASE_MAPS),canvas=document.querySelector("canvas"),ctx=canvas.getContext("2d");
const cache={},assets=createCombatMapAssetCache({cache,maxMaps:3}),status=document.querySelector("#status");
const store={state:{player:{firmId:"astra"}}},state={gameMode:"open",running:true,player:{safeZoneLock:0},firmId:"astra"};
const world=createCombatWorldStateSystem({store,mapList:maps,getState:()=>state});
const ship=new Image();ship.src="assets/ships/Velox.png";
let currentMap,theme,generated,center={x:0,y:0},camera,hoveredStation=null,ready=false,costs=[],largeMiniMap=false;
const zoom=.78;
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;canvas.__renderWidth=innerWidth/zoom;canvas.__renderHeight=innerHeight/zoom;}
resize();addEventListener("resize",resize);
function setView(){
  const sx=theme.mirrorX,sy=theme.mirrorY,spawn=currentMap.spawn;
  const views={hub:{x:spawn.x+260*sx,y:spawn.y-300*sy},approach:{x:spawn.x+1100*sx,y:spawn.y-700*sy},
    relay:currentMap.spawnStations.find(station=>station.id==="quests"),refinery:currentMap.spawnStations.find(station=>station.id==="commerce"),center:{x:0,y:0},
    top:{x:0,y:-3900},bottom:{x:0,y:3900},left:{x:-4900,y:0},right:{x:4900,y:0},outside:{x:-5700*sx,y:0}};
  center={...views[document.querySelector("#view").value]};
}
async function loadMap(id){
  ready=false;status.textContent="Chargement des éléments séparés…";
  currentMap=maps.find(map=>String(map.id)===String(id) && getFirmHomeMapTheme(map)) || maps.find(map=>map.id===0);
  document.querySelector("#sector").value=String(currentMap.id);theme=getFirmHomeMapTheme(currentMap);
  state.currentMap=currentMap;setVisitor();
  Object.assign(state.player,{x:currentMap.spawn.x,y:currentMap.spawn.y,hp:35000,maxHp:35000,radar:950,angle:0,radius:48});
  const start=performance.now();assets.activate(currentMap);
  const paths=getCombatMapAssetPaths(currentMap);
  await Promise.all(paths.map(src=>new Promise(resolve=>{
    const image=cache[src];
    if(image?.complete && image.naturalWidth) return resolve();
    if(!image?.addEventListener) return resolve();
    image.addEventListener("load",resolve,{once:true});image.addEventListener("error",resolve,{once:true});
  })));
  const errors=paths.filter(src=>!cache[src]?.complete || !cache[src].naturalWidth);
  if(errors.length) throw Error("Assets manquants : "+errors.join(", "));
  generated=buildMapState(currentMap).state;setView();costs=[];hoveredStation=null;ready=true;
  document.querySelector("#title").textContent=currentMap.name.toUpperCase()+" · "+({astra:"ASTRA",cyan:"CYGNUS",jaune:"SOLARYS",verte:"VERDANTIS"})[theme.palette];
  document.body.style.setProperty("--accent",`rgb(${theme.hubColor})`);
  const prepared=paths.filter(src=>src.includes("mapPalette=") && !(cache[src] instanceof HTMLImageElement)).length;
  document.body.dataset.mapReady=String(id);
  document.body.dataset.loadMilliseconds=(performance.now()-start).toFixed(1);
  status.textContent=`${paths.length} textures · ${prepared} préparées · prêtes`;
  draw();
}
function setVisitor(){
  state.firmId=document.querySelector("#visitor").value || theme.palette;
  store.state.player.firmId=state.firmId;
  hoveredStation=null;
}
function draw(){
  if(!ready)return;
  const start=performance.now(),w=canvas.__renderWidth,h=canvas.__renderHeight;
  camera={x:center.x-w/2,y:center.y-h/2,zoom};
  state.camera=camera;
  ctx.setTransform(zoom,0,0,zoom,0,0);
  drawWorldLayer({ctx,canvas,cache,currentMap,camera,...generated,player:state.player,stations:world.getVisibleSpawnStations(),
    hoveredStation,safeReady:true,spawnProtected:true,graphicsQuality:"high"});
  const px=state.player.x-camera.x,py=state.player.y-camera.y;
  if(ship.complete&&ship.naturalWidth){ctx.save();ctx.translate(px,py);ctx.rotate(.4);ctx.drawImage(ship,-43,-43,86,86);ctx.restore();}
  ctx.fillStyle="#36de7a";ctx.fillRect(px-27,py-63,54,4);
  ctx.font="600 14px Segoe UI";ctx.textAlign="center";ctx.fillStyle="#e3f3ff";ctx.fillText("Pilote · repère de taille",px,py+66);
  ctx.setTransform(1,0,0,1,0,0);
  const miniWidth=Math.min(largeMiniMap?900:460,innerWidth-40),miniHeight=Math.round((miniWidth-16)*.45)+64;
  drawMiniMap({ctx,canvas,cache,currentMap,stations:world.getVisibleSpawnStations(),player:state.player,enemies:[],
    rect:{x:innerWidth-miniWidth-20,y:innerHeight-miniHeight-20,w:miniWidth,h:miniHeight},moveTarget:null});
  costs.push(performance.now()-start);if(costs.length>120)costs.shift();
  const planet=currentMap.parallaxScene.images.find(layer=>layer.kind==="planet");
  const point=projectMapSceneryLayer({layer:planet,camera,viewWidth:w,viewHeight:h});
  document.querySelector("#metrics").textContent=`Caméra ${Math.round(center.x)} / ${Math.round(center.y)} · planète ${point.x.toFixed(1)} / ${point.y.toFixed(1)} · p=${planet.p}\nPilote ${state.firmId} · ${world.getVisibleSpawnStations().length} services visibles · ${world.getSpawnStations().length} accessibles\nRendu CPU (moyenne 120 images) : ${(costs.reduce((a,b)=>a+b,0)/costs.length).toFixed(2)} ms · ${assets.getRetainedMapKeys().length}/3 secteurs en cache`;
}
function frame(){draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
document.querySelector("#sector").onchange=event=>loadMap(event.target.value).catch(error=>{status.textContent=error.message;console.error(error);});
document.querySelector("#view").onchange=()=>{setView();draw();};
document.querySelector("#visitor").onchange=()=>{setVisitor();draw();};
document.querySelector("#miniSize").onclick=()=>{largeMiniMap=!largeMiniMap;draw();};
document.querySelector("#travel").onclick=()=>{center.x+=1000*theme.mirrorX;draw();};
document.querySelector("#clean").onclick=()=>document.body.classList.add("clean");
addEventListener("keydown",event=>{if(event.key==="Escape")document.body.classList.remove("clean");});
let dragging=null;
canvas.addEventListener("pointerdown",event=>{dragging={x:event.clientX,y:event.clientY,cx:center.x,cy:center.y};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener("pointermove",event=>{
  if(!ready)return;
  if(dragging){center={x:dragging.cx-(event.clientX-dragging.x)/zoom,y:dragging.cy-(event.clientY-dragging.y)/zoom};return;}
  hoveredStation=world.getStationAt({x:event.clientX/zoom+camera.x,y:event.clientY/zoom+camera.y});
  canvas.style.cursor=hoveredStation?"pointer":"grab";
});
canvas.addEventListener("pointerup",()=>{dragging=null;});
canvas.addEventListener("click",event=>{
  const point={x:event.clientX/zoom+camera.x,y:event.clientY/zoom+camera.y};
  const hit=world.getStationAt(point);
  if(hit)status.textContent="Clic reconnu : "+hit.title;
  else if(world.getVisibleSpawnStations().some(station=>Math.hypot(point.x-station.x,point.y-station.y)<station.radius)){
    status.textContent="Interaction indisponible · autre firme";
  }
});
document.querySelector("#auditButton").onclick=async()=>{
  const output=document.querySelector("#audit");output.textContent="";
  for(const id of [0,20,30,40]){
    document.querySelector("#sector").value=String(id);await loadMap(id);
    for(let i=0;i<20;i++)draw();costs=[];
    for(let i=0;i<60;i++)draw();
    const sorted=[...costs].sort((a,b)=>a-b),paths=getCombatMapAssetPaths(currentMap);
    output.textContent+=`${currentMap.name} : ${paths.length} textures chargées ; médiane ${sorted[30].toFixed(2)} ms ; P95 ${sorted[57].toFixed(2)} ms ; 0 filtre par image\n`;
  }
  document.body.dataset.auditComplete="true";
};
await loadMap(new URLSearchParams(location.search).get("map")||0);
