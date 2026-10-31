import { ships } from "../../src/data/ships.js";
import { drawPlayerLayer, drawRotatedImage } from "../../src/game/render/player.js";
import { drawShipModel3d, prepareShipModel3d, getShipModel3dStatus } from "../../src/game/render/ship3d.js";
import { DEFAULT_ENGINE_PROFILE, SHIP_ENGINE_PROFILES } from "../../src/game/combatData/engineProfiles.js";
import { HELION_ONE_ASSETS } from "../../src/game/combatData/helionOneVisuals.js";

const canvas = document.getElementById("flight");
const ctx = canvas.getContext("2d");
const originalShip = ships.find(ship=>ship.id === "asterion");
const cache = {};
const images = {};
const keys = new Set();
const player = {x:0,y:0,vx:0,vy:0,angle:0,engineAngle:0,enginePower:0,speed:330,hp:180000,maxHp:180000,shield:120000,maxShield:120000};
const camera = {x:0,y:0,zoom:1.6};
const status = document.getElementById("model-status");
let width = 0, height = 0, last = 0, frameCount = 0, fpsTime = 0;
let mode = "pilot", use3d = true, destination = null, laserUntil = 0;
let azimuth = .5, polar = .65, autoRotate = true, dragging = null;
const stars = Array.from({length:220}, (_, i)=>({x:(Math.sin(i * 91.73) * .5 + .5),y:(Math.sin(i * 127.13 + 8) * .5 + .5),size:.35 + (i % 5) * .22,depth:.035 + (i % 4) * .025}));

function loadImage(name, path){
  const img = new Image(); img.src = new URL("../../" + path, import.meta.url).href; images[name] = img;
}
loadImage("planet", HELION_ONE_ASSETS.planet);
loadImage("nebula", HELION_ONE_ASSETS.nebula);
loadImage("station", "assets/spawn/helion01-crown-v1/headquarters.webp");
loadImage("enemy", "assets/enemies/raider_astral.png");
loadImage("ship", originalShip.combatImg || originalShip.img);

function resize(){
  width = window.innerWidth; height = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  canvas.__dpr = dpr;
}
resize(); window.addEventListener("resize", resize);
prepareShipModel3d(originalShip);

function selectMode(next){
  mode = next; destination = null; keys.clear();
  document.getElementById("pilot").setAttribute("aria-selected", String(mode === "pilot"));
  document.getElementById("inspect").setAttribute("aria-selected", String(mode === "inspect"));
  document.getElementById("flight-help").hidden = mode !== "pilot";
  document.getElementById("inspect-help").hidden = mode !== "inspect";
  document.getElementById("hint").textContent = mode === "pilot" ? "CLIQUE POUR PILOTER" : "FAIS GLISSER POUR EXAMINER LA COQUE";
}
document.getElementById("pilot").onclick = ()=>selectMode("pilot");
document.getElementById("inspect").onclick = ()=>selectMode("inspect");
function select3d(value){
  use3d = value;
  document.getElementById("mode3d").setAttribute("aria-pressed", String(value));
  document.getElementById("mode2d").setAttribute("aria-pressed", String(!value));
}
document.getElementById("mode3d").onclick = ()=>select3d(true);
document.getElementById("mode2d").onclick = ()=>select3d(false);
document.getElementById("zoom").oninput = event=>{camera.zoom = Number(event.target.value);};
document.getElementById("reset").onclick = ()=>{
  player.x = player.y = player.vx = player.vy = player.enginePower = 0;
  player.angle = player.engineAngle = 0; destination = null; azimuth = .5; polar = .65;
};
document.getElementById("view-top").onclick = ()=>{polar = .03;azimuth = Math.PI;autoRotate = false;updateRotationButton();};
document.getElementById("view-angle").onclick = ()=>{polar = .8;azimuth = .65;};
function updateRotationButton(){document.getElementById("rotate").setAttribute("aria-pressed", String(autoRotate));}
document.getElementById("rotate").onclick = ()=>{autoRotate = !autoRotate;updateRotationButton();};
canvas.addEventListener("pointerdown", event=>{
  canvas.focus();
  if(mode === "inspect"){
    dragging = {x:event.clientX,y:event.clientY}; autoRotate = false;updateRotationButton();canvas.setPointerCapture(event.pointerId);
  }else destination = {x:event.clientX / camera.zoom + camera.x,y:event.clientY / camera.zoom + camera.y};
});
canvas.addEventListener("pointermove", event=>{
  if(!dragging) return;
  azimuth -= (event.clientX - dragging.x) * .008;
  polar = Math.max(.02, Math.min(Math.PI - .02, polar + (event.clientY - dragging.y) * .008));
  dragging = {x:event.clientX,y:event.clientY};
});
canvas.addEventListener("pointerup", ()=>{dragging = null;});
canvas.addEventListener("pointercancel", ()=>{dragging = null;});
window.addEventListener("blur", ()=>{keys.clear();destination = null;dragging = null;});
window.addEventListener("keydown", event=>{
  if(event.target.closest("button,input,a")) return;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","w","a","s","d","z","q"].includes(event.key)){
    event.preventDefault();keys.add(event.key.toLowerCase());
    if(event.key === " ") laserUntil = performance.now() + 180;
  }
});
window.addEventListener("keyup", event=>keys.delete(event.key.toLowerCase()));

function drawBackdrop(time){
  ctx.fillStyle = "#05070d";ctx.fillRect(0,0,width,height);
  const nebula = images.nebula;
  if(nebula.complete && nebula.naturalWidth){
    ctx.globalAlpha = mode === "inspect" ? .14 : .32;
    ctx.drawImage(nebula, width * .24 - player.x * .045, -height * .1 - player.y * .045, width * 1.05, height * 1.2);
    ctx.globalAlpha = 1;
  }
  for(const star of stars){
    const x = ((star.x * width - player.x * star.depth) % width + width) % width;
    const y = ((star.y * height - player.y * star.depth) % height + height) % height;
    ctx.fillStyle = `rgba(191,212,238,${.22 + star.size * .23})`;
    ctx.fillRect(x,y,star.size,star.size);
  }
  if(mode === "pilot"){
    const planet = images.planet;
    if(planet.complete && planet.naturalWidth){
      const size = Math.max(680, width * .57);
      ctx.drawImage(planet,-size * .38 - player.x * .035,height - size * .52 - player.y * .035,size,size);
    }
    const station = images.station;
    if(station.complete && station.naturalWidth){
      const sx = width * .48 + (-player.x - 270) * .32;
      const sy = height * .32 - player.y * .32;
      const size = Math.min(width * .36, 460);
      ctx.globalAlpha = .78;ctx.drawImage(station,sx-size/2,sy-size/2,size,size);ctx.globalAlpha = 1;
    }
  }
  const vignette = ctx.createRadialGradient(width*.65,height*.5,height*.1,width*.55,height*.5,width*.8);
  vignette.addColorStop(0,"rgba(2,4,10,0)");vignette.addColorStop(1,"rgba(2,4,10,.8)");ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
}

function move(dt){
  const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("q") || keys.has("arrowleft") ? 1 : 0);
  const dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("z") || keys.has("arrowup") ? 1 : 0);
  let tx = dx, ty = dy;
  if(dx || dy) destination = null;
  else if(destination){
    tx = destination.x - player.x;ty = destination.y - player.y;
    if(Math.hypot(tx,ty) < 7){destination = null;tx = ty = 0;}
  }
  const distance = Math.hypot(tx,ty);
  const power = distance > 0 ? 1 : 0;
  player.enginePower += (power - player.enginePower) * Math.min(1,dt*7);
  const targetVx = distance ? tx / distance * player.speed : 0;
  const targetVy = distance ? ty / distance * player.speed : 0;
  player.vx += (targetVx - player.vx) * Math.min(1,dt*9);
  player.vy += (targetVy - player.vy) * Math.min(1,dt*9);
  player.x += player.vx * dt;player.y += player.vy * dt;
  if(distance){
    const targetAngle = Math.atan2(tx,-ty);
    const turn = Math.atan2(Math.sin(targetAngle-player.angle),Math.cos(targetAngle-player.angle));
    player.engineAngle = player.angle;player.angle += turn * Math.min(1,dt*5);
  }else player.engineAngle = player.angle;
}

function drawFlight(time){
  const zoom = camera.zoom;
  const centerX = width < 800 ? width * .66 : (width + 300) / 2;
  const centerY = height * .55;
  camera.x = player.x - centerX / zoom;camera.y = player.y - centerY / zoom;
  canvas.__renderWidth = width / zoom;canvas.__renderHeight = height / zoom;
  ctx.save();ctx.scale(zoom,zoom);
  if(destination){
    ctx.strokeStyle = "rgba(137,224,238,.55)";ctx.lineWidth = 1/zoom;ctx.beginPath();ctx.arc(destination.x-camera.x,destination.y-camera.y,10,0,Math.PI*2);ctx.stroke();
  }
  const target = {x:player.x+220,y:player.y-150};
  const enemy = images.enemy;
  if(enemy.complete && enemy.naturalWidth){
    drawRotatedImage({ctx,camera,img:enemy,x:target.x,y:target.y,w:90,h:90,angle:Math.PI+.4});
    ctx.strokeStyle = "rgba(238,98,105,.6)";ctx.lineWidth = 1;ctx.beginPath();ctx.arc(target.x-camera.x,target.y-camera.y,52,0,Math.PI*2);ctx.stroke();
  }
  if(time < laserUntil){
    ctx.save();ctx.strokeStyle = "#ff6376";ctx.lineWidth = 2;ctx.shadowColor = "#ff3d5b";ctx.shadowBlur = 12;
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(player.x-camera.x+side*22,player.y-camera.y-15);ctx.lineTo(target.x-camera.x,target.y-camera.y);ctx.stroke();}ctx.restore();
  }
  drawPlayerLayer({ctx,camera,cache,player,ship:originalShip,drones:[],rank:{},rankAssetPath:"",pilotFirmAssetPath:"",pilotName:"ASTERION",pilotRole:"",getItemFromInventoryUid:()=>null,getDronePermanentUpgrade:()=>false,defaultProfile:DEFAULT_ENGINE_PROFILE,profiles:SHIP_ENGINE_PROFILES,graphicsEffects:{shipModels3d:use3d,combatDrones:false,repairDrone:false}});
  ctx.restore();canvas.__renderWidth = canvas.__renderHeight = null;
}

function drawInspection(dt){
  if(autoRotate) azimuth += dt * .25;
  const center = {x:width < 800 ? width*.64 : (width+310)/2,y:height*.5};
  const ship = {...originalShip,renderHeight:Math.min(height*.47,310)*camera.zoom/1.6};
  if(!use3d || !drawShipModel3d({ctx,camera:{x:0,y:0,zoom:1},player:{...player,angle:0,enginePower:0},ship,position:center,inspection:{azimuth,polar}})){
    drawRotatedImage({ctx,camera:{x:0,y:0},img:images.ship,x:center.x,y:center.y,w:ship.renderHeight*.925,h:ship.renderHeight,angle:0});
  }
}

function frame(time){
  if(time - last < 1000 / 60 - 1){requestAnimationFrame(frame);return;}
  const dt = Math.min(.05,Math.max(0,(time-last)/1000 || 0));last = time;
  if(mode === "pilot") move(dt);
  ctx.setTransform(canvas.__dpr,0,0,canvas.__dpr,0,0);
  drawBackdrop(time);
  if(mode === "pilot") drawFlight(time);else drawInspection(dt);
  const state = getShipModel3dStatus(originalShip);
  const message = !use3d ? "Image 2D d’origine" : state === "ready" ? "Coque 3D chargée · prête à voler" : state === "error" ? "Affichage 2D actif · modèle 3D indisponible" : "Chargement de la coque 3D…";
  if(status.textContent !== message) status.textContent = message;
  status.dataset.ready = String(use3d && state === "ready");
  canvas.dataset.modelStatus = state;canvas.dataset.mode = mode;
  document.getElementById("position").textContent = `X ${Math.round(player.x)} · Y ${Math.round(player.y)}`;
  frameCount++;
  if(time-fpsTime > 1000){document.getElementById("fps").textContent = `${Math.round(frameCount*1000/(time-fpsTime))} FPS`;frameCount = 0;fpsTime = time;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
