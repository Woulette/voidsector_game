import assert from "node:assert/strict";
import test from "node:test";
import { installCombatInputHandlers } from "../../src/game/ui/inputBindings.js";
import { createCombatFrameUpdateSystem } from "../../src/game/systems/combatFrameUpdate.js";

function element(){
  const handlers = new Map();
  return {handlers, dataset:{}, style:{},
    addEventListener(type, callback){
      if(!handlers.has(type)) handlers.set(type, []);
      handlers.get(type).push(callback);
    },
    querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    classList:{contains:()=>false, add(){}, remove(){}, toggle(){}},
    getBoundingClientRect:()=>({left:0, top:0, width:1000, height:700})};
}

function fixture(){
  const calls = [], nodes = new Map(), windowRef = element(), canvas = element(), panel = element();
  panel.dataset.utilityMode = "map";
  const documentRef = {...element(), body:null,
    getElementById(id){ if(!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); },
    querySelector:()=>element(),
    querySelectorAll:selector=>selector === ".combat-utility-panel" ? [panel] : []};
  const flags = {hit:null, cargo:null};
  const mouse = {x:0,y:0};
  installCombatInputHandlers({windowRef, documentRef, canvas,
    isRunning:()=>true, isMovementLocked:()=>false,
    getMouse:()=>mouse, worldFromScreen:(x,y)=>({x,y}), worldFromMiniMap:()=>({x:980,y:450}),
    miniMapHitTest:()=>flags.hit, resizeMiniMap:()=>calls.push("resize"),
    setMoveTarget:target=>calls.push(["move",target]),
    setMouseMoveHeld(){}, onManualNavigation:()=>calls.push("cancel"),
    getStationAt:()=>null, findQuestNpcAt:()=>null, findEnemyAt:()=>null,
    findRemotePlayerAt:()=>null, getSpawnPanelMode:()=>null,
    findCargoBoxAt:()=>flags.cargo,
    setCargoDestination:box=>{calls.push(["cargo",box.id]);return true;},
    selectSectorMap:id=>calls.push(["select",id]),
    startSectorMapTravel:id=>calls.push(["start",id]),
    cancelSectorMapTravel:()=>calls.push("cancel-panel"),
    getActionSlots:()=>[], getSlotKeybinds:()=>[], updateHud(){}
  });
  function clickCanvas(){
    canvas.handlers.get("mousedown")[0]({button:0,clientX:140,clientY:220,preventDefault(){}});
  }
  function clickPanel(selector, dataset){
    const target = {dataset,closest:query=>query===selector ? target : null};
    panel.handlers.get("click")[0]({target,preventDefault(){}});
  }
  return {calls, flags, clickCanvas, clickPanel};
}

test("a world movement click cancels automatic travel before setting its manual destination", ()=>{
  const f=fixture();f.clickCanvas();
  assert.deepEqual(f.calls,["cancel",["move",{x:140,y:220}]]);
});

test("a minimap destination cancels travel but resizing the minimap does not", ()=>{
  const f=fixture();f.flags.hit={type:"map"};f.clickCanvas();
  assert.deepEqual(f.calls,["cancel",["move",{x:980,y:450}]]);
  f.calls.length=0;f.flags.hit={type:"resize",delta:28};f.clickCanvas();
  assert.deepEqual(f.calls,["resize"]);
});

test("a manual loot destination interrupts travel before the collection order", ()=>{
  const f=fixture();f.flags.cargo={id:"loot"};f.clickCanvas();
  assert.deepEqual(f.calls,["cancel",["cargo","loot"]]);
});

test("stellar map actions dispatch selection, travel and cancellation independently", ()=>{
  const f=fixture();
  f.clickPanel("[data-sector-map-select]",{sectorMapSelect:"0"});
  f.clickPanel("[data-sector-travel-target-map]",{sectorTravelTargetMap:"2"});
  f.clickPanel("[data-sector-travel-cancel]",{});
  assert.deepEqual(f.calls,[["select","0"],["start","2"],"cancel-panel"]);
});

test("automatic warp sends a stop but never advances or commits a portal locally", t=>{
  const previousDocument=globalThis.document;
  globalThis.document={hidden:false};
  t.after(()=>{globalThis.document=previousDocument;});
  const snapshots=[], loads=[], advances=[];
  const transition={elapsed:3.9,duration:4,portal:{targetMap:1}};
  const state={player:{x:20,y:40,vx:100,vy:0,hp:100},camera:{x:0,y:0},
    teleportLock:0,portalTransition:null,autoTravelTransition:transition,
    currentMap:{id:0},bullets:[],moveTarget:{x:500,y:500},mouseMoveHeld:true,
    store:{state:{player:{},droneLoadout:[]}}};
  const system=createCombatFrameUpdateSystem({
    getState:()=>state,setState:patch=>Object.assign(state,patch),
    advancePortalTransition:(...args)=>{advances.push(args);return true;},
    loadMap:(...args)=>loads.push(args),beams:{clear(){}},
    updateParticles(){},updateCamera(){},getCanvas:()=>({}),updateHud(){},
    getCurrentRank:()=>({}),getActiveShip:()=>({id:"orion"}),getRankAssetPath:()=>"",
    sendPlayerSnapshot:read=>snapshots.push(read())
  });
  system.update(20);
  assert.deepEqual(loads,[]);
  assert.deepEqual(advances,[]);
  assert.equal(state.currentMap.id,0);
  assert.equal(state.moveTarget,null);
  assert.equal(state.player.vx,0);
  assert.equal(snapshots.at(-1).portalTransfer,true);
  assert.equal(transition.elapsed,3.9);
});
