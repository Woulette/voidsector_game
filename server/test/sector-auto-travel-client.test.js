import assert from "node:assert/strict";
import test from "node:test";
import { createSectorAutoTravel } from "../../src/game/systems/sectorAutoTravel.js";

function fixture(overrides = {}){
  let time = 1000;
  let connected = true;
  let premium = true;
  let manualTarget = null;
  const requests = [], cancellations = [], sessions = [], movements = [], changes = [], toasts = [];
  const world = {running:true, gameMode:"open", currentMap:{id:"0"},
    player:{shipId:"orion", hp:5000, isDead:false}, portalTransition:null, portgunChannel:null};
  const controller = createSectorAutoTravel({
    getState:()=>world, isConnected:()=>connected, hasPremium:()=>premium,
    requestStart:value=>{ requests.push(value); return true; },
    requestCancel:value=>{ cancellations.push(value); return true; },
    applySession:value=>{ sessions.push(value); world.currentMap = {id:value.mapId}; return true; },
    setMovement:(value,meta)=>{ manualTarget = value; movements.push({value,meta}); },
    onChange:value=>changes.push(value), showToast:value=>toasts.push(value), now:()=>time,
    ...overrides
  });
  function event(patch = {}){
    const request = requests.at(-1);
    return {id:"journey-1", requestId:request.requestId, status:"traveling", targetMapId:"2",
      route:["0","1","2"], index:0, currentMapId:"0", nextMapId:"1", moveTarget:{x:400,y:500},
      at:time, session:{mapId:"0", x:100,y:120,hp:5000}, ...patch};
  }
  return {controller,world,requests,cancellations,sessions,movements,changes,toasts,event,
    setTime:value=>{time=value;}, setConnected:value=>{connected=value;}, setPremium:value=>{premium=value;},
    manualMove:value=>{manualTarget=value;}, getTarget:()=>manualTarget};
}

test("auto travel waits for a canonical start and predicts only its portal movement", ()=>{
  const f = fixture();
  assert.equal(f.controller.start("2"),true);
  assert.equal(f.controller.getState().status,"requesting");
  assert.equal(f.getTarget(),null);
  f.controller.update(.1);
  assert.equal(f.sessions.length,0);
  assert.equal(f.controller.applyServerState(f.event()),true);
  assert.deepEqual(f.getTarget(),{x:400,y:500});
  assert.equal(f.sessions[0].source,"state-correction");
  assert.deepEqual(f.controller.getState().routeMapIds,["0","1","2"]);
});

test("server transfer freezes movement and reaching timer end never changes map locally", ()=>{
  const f = fixture();
  f.controller.start("2");
  f.controller.applyServerState(f.event({status:"transferring", moveTarget:null,
    transition:{startedAt:1000,completeAt:5000,durationMs:4000,elapsedMs:1500}}));
  assert.equal(f.getTarget(),null);
  assert.equal(f.controller.getState().transition.duration,4);
  assert.equal(f.controller.getState().transition.elapsed,1.5);
  const sessionCount = f.sessions.length;
  f.controller.update(10);
  assert.equal(f.controller.getState().transition.elapsed,4);
  assert.equal(f.world.currentMap.id,"0");
  assert.equal(f.sessions.length,sessionCount);
  f.setTime(5200);
  assert.equal(f.controller.applyServerState(f.event({index:1,currentMapId:"1",nextMapId:"2",
    session:{mapId:"1",x:-300,y:-500,hp:5000}})),true);
  assert.equal(f.sessions.at(-1).source,"auto-travel");
  assert.equal(f.world.currentMap.id,"1");
});

test("arrival applies the final canonical session once and stops at the destination", ()=>{
  const f = fixture();
  f.controller.start("2");
  assert.equal(f.controller.applyServerState(f.event({status:"arrived",index:2,currentMapId:"2",nextMapId:null,
    moveTarget:null,session:{mapId:"2",x:50,y:80,hp:5000}})),true);
  assert.equal(f.controller.getState().active,false);
  assert.equal(f.controller.getState().status,"arrived");
  assert.equal(f.world.currentMap.id,"2");
  assert.equal(f.getTarget(),null);
  assert.equal(f.cancellations.length,0);
  f.controller.update(.1);
  assert.equal(f.sessions.length,1);
});

test("repeated canonical transfer updates preserve the renderer's one-time cleanup", ()=>{
  const f=fixture();
  f.controller.start("2");
  const transition={startedAt:1000,completeAt:5000,durationMs:4000,elapsedMs:0};
  f.controller.applyServerState(f.event({status:"transferring",moveTarget:null,transition}));
  f.controller.getTransition().cleanupDone=true;
  f.controller.applyServerState(f.event({at:1200,status:"transferring",moveTarget:null,
    transition:{...transition,elapsedMs:200}}));
  assert.equal(f.controller.getTransition().cleanupDone,true);
  f.controller.applyServerState(f.event({at:1400,status:"transferring",moveTarget:null,
    transition:{...transition,startedAt:1400,completeAt:5400}}));
  assert.equal(f.controller.getTransition().cleanupDone,undefined);
});

test("a manual destination survives late start, state, terminal and error events", ()=>{
  const f = fixture();
  f.controller.start("2");
  const initial = f.event();
  assert.equal(f.controller.cancel(),true);
  assert.deepEqual(f.cancellations,[{requestId:initial.requestId}]);
  const manual = {x:12,y:-90};
  f.manualMove(manual);
  const movements = f.movements.length;
  assert.equal(f.controller.applyServerState(initial),false);
  assert.equal(f.controller.applyServerState({...initial,status:"cancelled",moveTarget:null}),false);
  assert.equal(f.controller.applyServerState({...initial,status:"arrived",index:2,currentMapId:"2",nextMapId:null,
    session:{mapId:"2",x:0,y:0}}),false);
  assert.equal(f.controller.applyServerError({requestId:initial.requestId,code:"late"}),false);
  f.controller.update(1);
  assert.equal(f.getTarget(),manual);
  assert.equal(f.movements.length,movements);
  assert.equal(f.sessions.length,0);
});

test("cancellation invalidates intent before transport invokes a synchronous late event", ()=>{
  let f;
  f = fixture({requestCancel:()=>f.controller.applyServerState(f.event())});
  f.controller.start("2");
  f.controller.cancel();
  assert.equal(f.sessions.length,0);
  assert.equal(f.controller.getState().active,false);
});

test("a new journey ignores the replaced journey's updates and errors", ()=>{
  const f = fixture();
  f.controller.start("2");
  const oldEvent = f.event();
  f.controller.applyServerState(oldEvent);
  assert.equal(f.controller.start("3"),true);
  assert.deepEqual(f.cancellations,[{requestId:oldEvent.requestId,journeyId:oldEvent.id}]);
  assert.equal(f.controller.applyServerState(oldEvent),false);
  assert.equal(f.controller.applyServerError({requestId:oldEvent.requestId,message:"old"}),false);
  assert.equal(f.controller.getState().targetMapId,"3");
  assert.equal(f.controller.getState().status,"requesting");
});

for(const [name,change,reason] of [
  ["disconnect",f=>f.setConnected(false),"disconnected"],
  ["Premium expiration",f=>f.setPremium(false),"premium-expired"],
  ["death",f=>{f.world.player.isDead=true;},"death"],
  ["game stop",f=>{f.world.running=false;},"stopped"],
  ["unexpected map",f=>{f.world.currentMap={id:"99"};},"map-changed"],
  ["ship change",f=>{f.world.player.shipId="other";},"ship-changed"],
  ["manual portal",f=>{f.world.portalTransition={};},"interrupted"],
  ["Portgun",f=>{f.world.portgunChannel={};},"interrupted"]
]) test(`${name} ends automatic movement without restarting`, ()=>{
  const f = fixture();
  f.controller.start("2");
  const initial = f.event();
  f.controller.applyServerState(initial);
  change(f);
  f.controller.update(.1);
  assert.equal(f.controller.getState().active,false);
  assert.equal(f.controller.getState().reason,reason);
  assert.equal(f.getTarget(),null);
  assert.equal(f.controller.applyServerState({...initial,at:2000}),false);
});

test("an older server position cannot replace a newer target", ()=>{
  const f = fixture();
  f.controller.start("2");
  f.controller.applyServerState(f.event({at:2000,moveTarget:{x:700,y:900}}));
  assert.equal(f.controller.applyServerState(f.event({at:1500})),false);
  assert.deepEqual(f.getTarget(),{x:700,y:900});
  assert.equal(f.sessions.length,1);
});

test("journey revisions reject duplicate states and survive a server clock adjustment", ()=>{
  const f = fixture();
  f.controller.start("2");
  f.controller.applyServerState(f.event({revision:1,at:2000}));
  assert.equal(f.controller.applyServerState(f.event({revision:1,at:2100})),false);
  assert.equal(f.controller.applyServerState(f.event({revision:2,at:1900,moveTarget:{x:900,y:800}})),true);
  assert.equal(f.controller.getState().revision,2);
  assert.deepEqual(f.getTarget(),{x:900,y:800});
});

test("Helion's numeric zero remains a valid next map and final destination", ()=>{
  const f = fixture();
  f.world.currentMap = {id:1};
  assert.equal(f.controller.start(0),true);
  assert.equal(f.controller.applyServerState(f.event({targetMapId:0,route:[1,0],index:0,currentMapId:1,
    nextMapId:0,status:"transferring",moveTarget:null,session:{mapId:1,x:100,y:100,hp:5000},
    transition:{durationMs:4000,elapsedMs:500}})),true);
  assert.equal(f.controller.getTransition().portal.targetMap,"0");
  assert.equal(f.controller.applyServerState(f.event({targetMapId:0,route:[1,0],index:1,currentMapId:0,
    nextMapId:null,status:"arrived",moveTarget:null,session:{mapId:0,x:0,y:0,hp:5000}})),true);
  assert.equal(f.controller.getState().status,"arrived");
});

test("missing start confirmation and missing flight updates both time out safely", ()=>{
  const f = fixture();
  f.controller.start("2");
  f.setTime(11001);
  f.controller.update(.1);
  assert.equal(f.controller.getState().reason,"timeout");
  assert.equal(f.cancellations.length,1);
  f.setTime(20000);
  f.controller.start("2");
  f.controller.applyServerState(f.event());
  f.setTime(35001);
  f.controller.update(.1);
  assert.equal(f.controller.getState().reason,"timeout");
  assert.equal(f.cancellations.length,2);
});

test("a malformed canonical route never produces a movement order", ()=>{
  const f = fixture();
  f.controller.start("2");
  assert.equal(f.controller.applyServerState(f.event({route:["0","99","2"]})),false);
  assert.equal(f.controller.getState().reason,"invalid-state");
  assert.equal(f.sessions.length,0);
  assert.equal(f.getTarget(),null);
});

test("Premium and authenticated connection are required before creating a journey", ()=>{
  const f = fixture();
  f.setPremium(false);
  assert.equal(f.controller.start("2"),false);
  f.setPremium(true);
  f.setConnected(false);
  assert.equal(f.controller.start("2"),false);
  f.setConnected(true);
  assert.equal(f.controller.start("0"),false);
  assert.equal(f.requests.length,0);
});

test("exposed snapshots cannot mutate the controller's route or prediction", ()=>{
  const f = fixture();
  f.controller.start("2");
  f.controller.applyServerState(f.event());
  const view = f.controller.getState();
  view.routeMapIds.push("99");
  view.moveTarget.x = -999;
  f.controller.update(.1);
  assert.deepEqual(f.getTarget(),{x:400,y:500});
  assert.deepEqual(f.controller.getState().routeMapIds,["0","1","2"]);
});
