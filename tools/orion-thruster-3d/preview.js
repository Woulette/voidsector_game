import * as THREE from "../../vendor/three-r187/three.module.js";
import { RoomEnvironment } from "../../vendor/three-r187/RoomEnvironment.js";
import { loadShipModel3d } from "../../src/game/render/ship3dAssets.js";
import { getShipModel3d } from "../../src/data/shipModels3d.js";
import { getShipFlightPose,advanceShipFlightMotion } from "../../src/game/render/ship3dProjection.js";
import { configureWorld3dCamera,worldPointToScene } from "../../src/game/render/world3dProjection.js";
import { createShipThruster3dSystem } from "../../src/game/render/shipThruster3d.js";

const viewport=document.getElementById("viewport"),stats=document.getElementById("stats"),measurement=document.getElementById("measurement");
const fleet=document.getElementById("fleet"),view=document.getElementById("view"),power=document.getElementById("power");
const turning=document.getElementById("turn"),engines=document.getElementById("engines");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
viewport.append(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,30000);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
scene.environment=environment.texture;scene.environmentIntensity=.85;room.dispose();pmrem.dispose();
const key=new THREE.DirectionalLight(0xffebdb,1.8);key.position.set(-3000,5000,-2000);
const fill=new THREE.DirectionalLight(0x7fcfff,.9);fill.position.set(3000,2000,3000);
scene.add(key,fill,new THREE.HemisphereLight(0xcbdfff,0x20151f,.7));
const thrusters=createShipThruster3dSystem(scene),actors=[];
let width=1,height=1,lastTime=0,frames=0,samples=[],measuringUntil=0,warmUntil=0;
function resize(){
  width=viewport.clientWidth;height=viewport.clientHeight;
  const dpr=Math.min(2,Math.max(1.5,devicePixelRatio||1));renderer.setSize(Math.round(width*dpr),Math.round(height*dpr),false);
}
new ResizeObserver(resize).observe(viewport);resize();
const template=await loadShipModel3d(getShipModel3d({id:"orion"}));
for(let i=0;i<30;i++){
  const object=template.yaw.clone(true);object.scale.setScalar(96);scene.add(object);
  actors.push({object,motion:{},key:{}});
}
document.getElementById("loading").remove();
document.getElementById("measure").onclick=()=>{
  samples=[];warmUntil=performance.now()+1000;measuringUntil=warmUntil+5000;measurement.textContent="Préparation de la mesure…";
};
function frame(milliseconds){
  const started=performance.now(),time=milliseconds/1000,dt=lastTime ? milliseconds-lastTime : 0;lastTime=milliseconds;
  const count=Number(fleet.value),zoom=view.value==="rear" ? 4 : Number(view.value),columns=count===1 ? 1 : count===10 ? 5 : 10;
  const rows=Math.ceil(count/columns);
  configureWorld3dCamera(camera,{x:-width/(2*zoom),y:-height/(2*zoom),zoom,width,height});
  if(view.value==="rear"){camera.position.set(0,140,600);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);}
  thrusters.begin(time);
  for(let i=0;i<actors.length;i++){
    const actor=actors[i];actor.object.visible=i<count;if(i>=count) continue;
    const phase=time*.55+i*.13,orbit=count===1 ? 45 : 12;
    const x=(i%columns-(columns-1)/2)*110+(turning.checked ? Math.sin(phase)*orbit : 0);
    const y=(Math.floor(i/columns)-(rows-1)/2)*115+(turning.checked ? Math.cos(phase)*orbit*.42 : 0);
    const position=worldPointToScene({x,y});actor.object.position.set(position.x,position.y,position.z);
    const angle=turning.checked ? Math.atan2(-Math.sin(phase)*.42,Math.cos(phase))+Math.PI/2 : 0;
    advanceShipFlightMotion(actor.motion,angle,time);const pose=getShipFlightPose({angle:actor.motion.angle,roll:actor.motion.roll});
    actor.object.rotation.y=pose.yaw;actor.object.children[0].rotation.set(pose.pitch,0,pose.roll);
    if(engines.checked) thrusters.enqueue({key:actor.key,object:actor.object,power:Number(power.value),angle:pose.angle});
  }
  thrusters.finish();const updateMs=performance.now()-started;
  renderer.render(scene,camera);const renderMs=performance.now()-started;
  if(measuringUntil){
    if(milliseconds>=warmUntil){samples.push({updateMs,renderMs,frameMs:dt});measurement.textContent="Mesure en cours…";}
    if(milliseconds>=measuringUntil){
      measuringUntil=0;
      const percentile=(key,p)=>samples.map(s=>s[key]).sort((a,b)=>a-b)[Math.min(samples.length-1,Math.floor(samples.length*p))];
      const result={ships:count,zoom,engines:engines.checked,samples:samples.length,
        updateMedianMs:percentile("updateMs",.5),renderMedianMs:percentile("renderMs",.5),frameP95Ms:percentile("frameMs",.95),
        textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,thruster:thrusters.getStats()};
      measurement.dataset.result=JSON.stringify(result);
      measurement.textContent=`Dernière mesure : ${count} Orion · préparation médiane ${result.updateMedianMs.toFixed(2)} ms · rendu CPU médian ${result.renderMedianMs.toFixed(2)} ms · image p95 ${result.frameP95Ms.toFixed(1)} ms`;
    }
  }
  if(++frames%20===0){
    const data=thrusters.getStats();
    stats.textContent=`${count} Orion · ${data.wakePoints} éléments de traînée · ${(data.arrayBytes/1024).toFixed(0)} Ko de tableaux pour les réacteurs · aucune texture de réacteur · ${renderer.info.render.calls} appels de rendu au total`;
    stats.dataset.thruster=JSON.stringify(data);stats.dataset.textures=String(renderer.info.memory.textures);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
