import test from "node:test";
import assert from "node:assert/strict";
import { applyCameraWheelZoom,updateCombatCameraZoom,installCombatWheelZoom,CAMERA_ZOOM_MIN,CAMERA_ZOOM_MAX } from "../../src/game/systems/cameraZoom.js";
import { worldFromScreen,updateCamera } from "../../src/game/systems/playerMovement.js";

test("wheel zoom is reversible and consistent for pixel and line wheel events",()=>{
  const a={zoom:1},b={zoom:1};
  applyCameraWheelZoom(a,{deltaY:-120,deltaMode:0});
  applyCameraWheelZoom(b,{deltaY:-3,deltaMode:1});
  assert(a.userZoom>1);assert.equal(a.userZoom,b.userZoom);
  applyCameraWheelZoom(a,{deltaY:120,deltaMode:0});
  assert(Math.abs(a.userZoom-1)<1e-12);
  for(let i=0;i<100;i++) applyCameraWheelZoom(a,{deltaY:800});
  assert.equal(a.userZoom,CAMERA_ZOOM_MIN);
  for(let i=0;i<100;i++) applyCameraWheelZoom(a,{deltaY:-800});
  assert.equal(a.userZoom,CAMERA_ZOOM_MAX);
});

test("manual zoom survives camera updates and outside-map widening",()=>{
  const camera={zoom:1,userZoom:1.5};
  for(let i=0;i<200;i++) updateCombatCameraZoom(camera,1/60,false);
  assert(Math.abs(camera.zoom-1.5)<1e-5);
  for(let i=0;i<200;i++) updateCombatCameraZoom(camera,1/60,true);
  assert(Math.abs(camera.zoom-1.5*.78)<1e-5);
  assert.equal(camera.userZoom,1.5);
  updateCombatCameraZoom(camera,.25,false);
  assert.equal(camera.zoom,1.5);
});

test("zooming out never reveals more than the original normal or radiation view",()=>{
  const camera={zoom:1};
  for(let i=0;i<100;i++) applyCameraWheelZoom(camera,{deltaY:1000});
  updateCombatCameraZoom(camera,1,false);assert.equal(camera.zoom,1);
  updateCombatCameraZoom(camera,1,true);assert.equal(camera.zoom,.78);
  camera.userZoom=.5;updateCombatCameraZoom(camera,1,false);
  assert.equal(camera.zoom,1,"an older wider preference must also be clamped");
});

test("zoom keeps the pilot centered and click conversion aligned at both limits",()=>{
  const player={x:-4300,y:3300},canvas={width:1200,height:800};
  for(const zoom of [CAMERA_ZOOM_MIN,1,CAMERA_ZOOM_MAX]){
    const camera={x:0,y:0,zoom};
    updateCamera({camera,player,canvas});
    const point=worldFromScreen({sx:600,sy:400,camera});
    assert.deepEqual(point,{x:player.x,y:player.y});
  }
});

test("game wheel input leaves the minimap, settings and browser shortcuts alone",()=>{
  const handlers={},camera={zoom:1},flags={running:true,settings:false,hit:null};
  const canvas={addEventListener:(name,handler,options)=>{handlers[name]=handler;assert.equal(options.passive,false);},getBoundingClientRect:()=>({left:10,top:20})};
  installCombatWheelZoom({canvas,getCamera:()=>camera,isRunning:()=>flags.running,isSettingsOpen:()=>flags.settings,miniMapHitTest:(x,y)=>{assert.equal(x,30);assert.equal(y,40);return flags.hit;}});
  let prevented=0;const event={clientX:40,clientY:60,deltaY:-120,preventDefault:()=>prevented++};
  handlers.wheel(event);assert(camera.userZoom>1);assert.equal(prevented,1);
  const value=camera.userZoom;
  for(const state of [{running:false},{running:true,settings:true},{settings:false,hit:{type:"map"}},{hit:{type:"resize"}}]){
    Object.assign(flags,state);handlers.wheel(event);assert.equal(camera.userZoom,value);
  }
  flags.hit=null;handlers.wheel({...event,ctrlKey:true});handlers.wheel({...event,metaKey:true});
  assert.equal(prevented,1);
});
