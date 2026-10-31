import test from "node:test";
import assert from "node:assert/strict";
import { createSpawnStationHover } from "../../src/game/ui/spawnStationHover.js";
import { worldFromScreen } from "../../src/game/systems/playerMovement.js";
import { createCombatWorldStateSystem } from "../../src/game/systems/combatWorldState.js";
import { MAPS } from "../../src/game/combatData/maps.js";

function fixture(){
  const canvas = new EventTarget(), documentRef = new EventTarget(), windowRef = new EventTarget();
  const rect = {left:70, top:40, width:1000, height:700};
  const camera = {x:-5320, y:2310, zoom:1};
  const state = {gameMode:"open",currentMap:MAPS.find(map=>map.id === 0)};
  const world = createCombatWorldStateSystem({getState:()=>state,mapList:MAPS,
    store:{state:{player:{firmId:"astra"}}}});
  const flags = {enabled:true,overlay:false,minimap:false};
  canvas.style = {cursor:"crosshair"};
  canvas.getBoundingClientRect = ()=>rect;
  documentRef.elementFromPoint = ()=>flags.overlay ? {} : canvas;
  const hover = createSpawnStationHover({canvas,documentRef,windowRef,
    worldFromScreen:(sx,sy)=>worldFromScreen({sx,sy,camera}),
    getStationAt:world.getStationAt,isEnabled:()=>flags.enabled,
    miniMapHitTest:()=>flags.minimap ? {type:"map"} : null});
  function point(x,y,type="pointermove",pointerType="mouse"){
    const event = new Event(type);
    Object.assign(event,{clientX:x+rect.left,clientY:y+rect.top,pointerType});
    canvas.dispatchEvent(event);
  }
  return {canvas,documentRef,windowRef,camera,state,flags,hover,point,world};
}

test("station hover follows the real click target through camera motion and zoom", ()=>{
  const f = fixture();
  f.point(400,300);
  assert.equal(f.hover.getHoveredStation()?.id,"commerce");
  assert.equal(f.canvas.style.cursor,"pointer");
  f.camera.x += 900;
  assert.equal(f.hover.getHoveredStation(),null);
  assert.equal(f.canvas.style.cursor,"crosshair");
  f.camera.x = -5320;
  f.camera.zoom = 1.5;
  f.point(600,450);
  assert.equal(f.hover.getHoveredStation(),f.world.getStationAt({x:-4920,y:2610}));
});

test("a panel appearing under a stationary pointer and the minimap suppress hover", ()=>{
  const f = fixture();
  f.point(400,300);
  assert.ok(f.hover.getHoveredStation());
  f.flags.overlay = true;
  assert.equal(f.hover.getHoveredStation(),null);
  assert.equal(f.canvas.style.cursor,"crosshair");
  f.flags.overlay = false;
  f.flags.minimap = true;
  assert.equal(f.hover.getHoveredStation(),null);
  f.flags.minimap = false;
  assert.ok(f.hover.getHoveredStation());
});

test("leave, focus loss, tab visibility and disposal restore the original cursor", ()=>{
  const f = fixture();
  for(const [target,type] of [[f.canvas,"pointerleave"],[f.canvas,"pointercancel"],
    [f.windowRef,"blur"],[f.documentRef,"visibilitychange"]]){
    f.point(400,300);
    assert.ok(f.hover.getHoveredStation());
    target.dispatchEvent(new Event(type));
    assert.equal(f.hover.getHoveredStation(),null);
    assert.equal(f.canvas.style.cursor,"crosshair");
  }
  f.point(400,300);
  f.hover.getHoveredStation();
  f.hover.dispose();
  f.point(400,300);
  assert.equal(f.hover.getHoveredStation(),null);
});

test("locked gameplay, touch contact, another map and empty space never highlight a service", ()=>{
  const f = fixture();
  f.point(400,300,"pointermove","touch");
  assert.equal(f.hover.getHoveredStation(),null);
  f.point(400,300);
  f.flags.enabled = false;
  assert.equal(f.hover.getHoveredStation(),null);
  f.flags.enabled = true;
  f.state.currentMap = MAPS.find(map=>map.id === 1);
  assert.equal(f.hover.getHoveredStation(),null);
  f.state.currentMap = MAPS.find(map=>map.id === 0);
  f.point(950,650);
  assert.equal(f.hover.getHoveredStation(),null);
  assert.equal(f.canvas.style.cursor,"crosshair");
});
