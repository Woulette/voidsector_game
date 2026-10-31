import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { MAPS } from "../../src/game/combatData/maps.js";
import { createCombatSessionController } from "../../src/game/systems/combatSession.js";
import { createCombatFrameUpdateSystem } from "../../src/game/systems/combatFrameUpdate.js";
import { updatePlayerMovement } from "../../src/game/systems/playerMovement.js";
import { createSectorAutoTravel } from "../../src/game/systems/sectorAutoTravel.js";
import { createSectorTravelConnection } from "../../src/multiplayer/sectorTravel.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getTrustedMovementSpeed, validatePlayerState } from "../src/players/playerStateValidation.js";
import { registerTravelHandlers } from "../src/socket/travelHandlers.js";
import { createSectorTravelManager } from "../src/travel/sectorTravel.js";
import { createSectorTravelRoutes } from "../src/travel/sectorTravelRoutes.js";

// A duplex transport exercises the real commands/listeners and server handlers
// without a browser or a live account. Both navigation graphs use the real maps.
function fixture({premium = true, clientPremium = true, delayStates = false} = {}){
  let clock = 1000;
  let journeySequence = 0;
  let deferred = delayStates;
  let cachedPremium = clientPremium;
  const clientEvents = new EventEmitter(), serverEvents = new EventEmitter();
  const emitted = [], requests = [], delayed = [], remoteSnapshots = [], transfers = [], loads = [], saves = [], toasts = [];
  const profile = createDefaultProfile();
  profile.player.premiumUntil = premium ? 1_000_000 : 0;
  profile.player.premiumActive = false;
  const routes = createSectorTravelRoutes();
  const firstPortal = routes.leg("0", "1");
  assert.ok(firstPortal);
  const player = {id:"integration-pilot",accountId:"integration-account",clientMode:"game",connected:true,
    mapId:"0",mapRoom:"map:0",state:{mapId:"0",shipId:"orion",x:firstPortal.x,y:firstPortal.y,
      hp:5000,maxHp:5000,shield:0,maxShield:0,vx:0,vy:0,angle:0,enginePower:0,moveTarget:null,updatedAt:clock}};
  const world = {running:true,gameMode:"open",currentMap:MAPS.find(map=>map.id === 0),
    player:{...player.state,speed:getTrustedMovementSpeed(profile),isDead:false},moveTarget:null,
    mouseMoveHeld:false,portalTransition:null,portgunChannel:null};
  const clientSocket = {id:player.id,connected:true,
    on:(name,fn)=>clientEvents.on(name,fn),off:(name,fn)=>clientEvents.off(name,fn),
    emit:(name,payload)=>{requests.push({name,payload:structuredClone(payload)});serverEvents.emit(name,payload);}};
  const serverSocket = {id:player.id,on:(name,fn)=>serverEvents.on(name,fn),
    emit:(name,payload)=>{
      const event = {name,payload:structuredClone(payload)};
      emitted.push(event);
      if(deferred && name === "travel:state") delayed.push(event);
      else clientEvents.emit(name,event.payload);
    }};
  const multiplayer = {connected:true,socket:clientSocket,auth:{account:{id:player.accountId},profileReady:true}};
  const players = new Map([[player.id,player]]);
  const manager = createSectorTravelManager({
    players,routes,now:()=>clock,makeId:()=>`integration-${++journeySequence}`,
    io:{sockets:{sockets:new Map([[player.id,serverSocket]])},
      to:room=>({emit:(name,payload)=>room === player.id
        ? serverSocket.emit(name,payload) : remoteSnapshots.push({name,payload:structuredClone(payload)})})},
    profileManager:{getProfileSnapshotForPlayer:()=>profile,
      saveWorldSession:entry=>saves.push(structuredClone(entry.state))},
    setPlayerMap:(_socket,id)=>{transfers.push({id,at:clock});player.mapRoom=`map:${id}`;},
    publicPlayer:value=>({id:value.id,state:value.state})
  });
  registerTravelHandlers(serverSocket,{guard:()=>true,players,travelManager:manager,now:()=>clock});
  const session = createCombatSessionController({
    store:{state:{activeShip:"orion"}},getRunning:()=>world.running,getState:()=>world,
    loadMap:(id,x,y)=>{
      assert.equal(String(id),player.state.mapId,"the client only loads the server's committed sector");
      world.currentMap=MAPS.find(map=>String(map.id) === String(id));
      assert.ok(world.currentMap);
      Object.assign(world.player,{x,y,vx:0,vy:0});
      world.moveTarget=null;
      loads.push({id:String(id),at:clock});
    },updateHud:()=>{},showToast:value=>toasts.push(value)
  });
  let controller;
  const connection = createSectorTravelConnection({multiplayer,
    onState:event=>controller.applyServerState(event),onError:event=>controller.applyServerError(event),
    onDisconnect:()=>controller.cancel("disconnected")});
  controller = createSectorAutoTravel({
    getState:()=>world,isConnected:connection.isConnected,hasPremium:()=>cachedPremium,
    requestStart:connection.start,requestCancel:connection.cancel,now:()=>clock,
    applySession:value=>session.resumeWorldSession({...value,source:"state-correction"}),
    setMovement:(target,meta)=>{
      world.moveTarget=target;
      world.mouseMoveHeld=false;
      if(!target || meta.status === "transferring") Object.assign(world.player,{vx:0,vy:0,enginePower:0});
    },showToast:value=>toasts.push(value)
  });
  function tick(ms = 50){
    clock+=ms;
    manager.update(ms / 1000,clock);
    controller.update(ms / 1000);
    if(!controller.getTransition()){
      world.moveTarget=updatePlayerMovement({player:world.player,moveTarget:world.moveTarget,
        dt:ms / 1000,map:world.currentMap,clampToMap:false});
    }
  }
  function until(predicate,limit = 4000){
    for(let index=0;index < limit && !predicate();index+=1) tick();
    assert.ok(predicate(),"travel reaches the expected state within the simulated flight time");
  }
  function flush(){
    deferred=false;
    for(const event of delayed.splice(0)) clientEvents.emit(event.name,event.payload);
  }
  return {controller,connection,manager,player,world,profile,routes,emitted,requests,loads,transfers,saves,toasts,
    remoteSnapshots,clientEvents,delayed,tick,until,flush,now:()=>clock,
    setClientPremium:value=>{cachedPremium=value;},
    last:()=>emitted.filter(event=>event.name === "travel:state").at(-1)?.payload};
}

test("real Helion portals deliver Premium auto travel through two sectors at normal speed", ()=>{
  const f=fixture();
  assert.equal(f.controller.start(2),true);
  assert.deepEqual(f.controller.getState().routeMapIds,["0","1","2"]);
  assert.equal(f.controller.getState().status,"traveling");
  f.tick();
  assert.equal(f.controller.getState().status,"transferring");
  const firstTransfer = f.last().transition;
  while(f.now() < firstTransfer.completeAt - 50) f.tick();
  assert.equal(f.player.state.mapId,"0");
  assert.equal(f.world.currentMap.id,0);
  assert.deepEqual(f.loads,[]);
  f.tick();
  assert.equal(f.player.state.mapId,"1");
  assert.equal(f.world.currentMap.id,1);
  const start = {x:f.player.state.x,y:f.player.state.y};
  f.tick();
  const moved = Math.hypot(f.player.state.x-start.x,f.player.state.y-start.y);
  assert.ok(Math.abs(moved-getTrustedMovementSpeed(f.profile) * .05) < 1e-8);
  f.until(()=>f.controller.getState().status === "arrived");
  assert.equal(f.manager.isActive(f.player),false);
  assert.equal(f.controller.getState().active,false);
  assert.deepEqual(f.transfers.map(entry=>entry.id),["1","2"]);
  assert.deepEqual(f.loads.map(entry=>entry.id),["1","2"]);
  assert.equal(f.world.currentMap.id,2);
  assert.equal(f.world.moveTarget,null);
  assert.equal(f.player.state.moveTarget,null);
  assert.equal(f.world.player.x,f.player.state.x);
  assert.equal(f.world.player.y,f.player.state.y);
  assert.ok(f.saves.some(value=>value.mapId === "1"));
  assert.ok(f.saves.some(value=>value.mapId === "2"));
  assert.ok(f.remoteSnapshots.some(event=>event.name === "player:state" && event.payload.state.mapId === "1"));
  assert.deepEqual(f.toasts,["Destination atteinte."]);
});

test("manual cancellation inside a transfer survives delayed states and resumes normal snapshots", ()=>{
  const f=fixture();
  f.controller.start(2);
  f.tick();
  const oldTransfer=structuredClone(f.last());
  assert.equal(f.controller.getState().status,"transferring");
  assert.equal(f.controller.cancel("manual"),true);
  const manualTarget={x:f.player.state.x-700,y:f.player.state.y-200};
  f.world.moveTarget=manualTarget;
  const cancellation=f.last();
  f.clientEvents.emit("travel:state",oldTransfer);
  f.clientEvents.emit("travel:state",cancellation);
  assert.equal(f.world.moveTarget,manualTarget);
  assert.equal(f.manager.isActive(f.player),false);
  assert.equal(f.controller.getTransition(),null);
  f.tick(50);
  assert.ok(Math.hypot(f.world.player.x-f.player.state.x,f.world.player.y-f.player.state.y) > 0);
  const normalSnapshot={mapId:"0",x:f.world.player.x,y:f.world.player.y,moveTarget:f.world.moveTarget,sourceSeq:42};
  assert.equal(f.manager.preparePlayerState(f.player,normalSnapshot,f.now()),normalSnapshot);
  f.tick(5000);
  assert.equal(f.player.state.mapId,"0");
  assert.equal(f.world.currentMap.id,0);
  assert.deepEqual(f.loads,[]);
  assert.deepEqual(f.transfers,[]);
});

test("cancelling a pending start sends its request token and rejects every delayed response", ()=>{
  const f=fixture({delayStates:true});
  f.controller.start(2);
  assert.equal(f.controller.getState().pending,true);
  assert.equal(f.manager.isActive(f.player),true);
  const requestId=f.controller.getState().requestId;
  f.controller.cancel("manual");
  assert.deepEqual(f.requests.at(-1),{name:"travel:cancel",payload:{requestId}});
  assert.equal(f.manager.isActive(f.player),false);
  const manualTarget={x:0,y:0};
  f.world.moveTarget=manualTarget;
  f.flush();
  assert.equal(f.world.moveTarget,manualTarget);
  assert.equal(f.controller.getState().active,false);
  assert.deepEqual(f.loads,[]);
});

test("the canonical subscription can refuse a stale Premium UI before any movement", ()=>{
  const f=fixture({premium:false,clientPremium:true});
  f.controller.start(2);
  assert.equal(f.controller.getState().status,"error");
  assert.equal(f.controller.getState().reason,"premium-required");
  assert.equal(f.manager.isActive(f.player),false);
  assert.equal(f.world.moveTarget,null);
  assert.deepEqual(f.transfers,[]);
  assert.ok(f.toasts[0].includes("Premium"));
});

test("canonical Premium expiration cancels a portal timer despite a stale client profile", ()=>{
  const f=fixture();
  f.controller.start(2);
  f.tick();
  assert.equal(f.controller.getState().status,"transferring");
  f.profile.player.premiumUntil=f.now()+1;
  f.tick();
  assert.equal(f.controller.getState().status,"cancelled");
  assert.equal(f.controller.getState().reason,"premium-required");
  assert.equal(f.manager.isActive(f.player),false);
  assert.equal(f.controller.getTransition(),null);
  f.tick(5000);
  assert.equal(f.world.currentMap.id,0);
  assert.deepEqual(f.transfers,[]);
});

test("local Premium expiration immediately sends cancellation before a manual destination", ()=>{
  const f=fixture();
  f.controller.start(2);
  f.setClientPremium(false);
  f.controller.update(.05);
  assert.equal(f.controller.getState().reason,"premium-expired");
  assert.equal(f.manager.isActive(f.player),false);
  assert.equal(f.requests.at(-1).name,"travel:cancel");
  assert.equal(f.world.moveTarget,null);
});

test("a canonical transfer refresh does not repeat forced snapshots or unlock a local jump", ()=>{
  const f=fixture();
  f.controller.start(2);
  f.tick();
  const snapshots=[];
  let cleanups=0,manualAdvances=0,manualLoads=0;
  Object.assign(f.world,{camera:{x:0,y:0},bullets:[],particles:[],store:{state:{player:{level:1}}},teleportLock:0});
  const frame=createCombatFrameUpdateSystem({
    multiplayer:{},getState:()=>({...f.world,autoTravelTransition:f.controller.getTransition()}),
    setState:patch=>Object.assign(f.world,patch),
    advancePortalTransition:()=>{manualAdvances+=1;return true;},loadMap:()=>{manualLoads+=1;},
    updateParticles:()=>{},updateCamera:()=>{},getCanvas:()=>({width:1000,height:700}),
    beams:{clear:()=>{cleanups+=1;}},sendPlayerSnapshot:(_factory,options)=>snapshots.push(options),
    updateHud:()=>{}
  });
  frame.update(.05);
  assert.equal(snapshots.at(-1).force,true);
  assert.equal(cleanups,1);
  const event=structuredClone(f.last());
  event.revision+=1;
  event.at+=200;
  event.transition.elapsedMs+=200;
  assert.equal(f.controller.applyServerState(event),true);
  f.controller.update(10);
  frame.update(.05);
  assert.equal(snapshots.at(-1).force,false);
  assert.equal(cleanups,1);
  assert.equal(manualAdvances,0);
  assert.equal(manualLoads,0);
  assert.equal(f.controller.getTransition().elapsed,4);
  assert.equal(f.world.currentMap.id,0);
});

test("an in-flight source-map snapshot cannot reverse a committed automatic arrival", ()=>{
  const f=fixture();
  f.controller.start(2);
  f.until(()=>f.controller.getState().status === "transferring" && f.controller.getState().index === 1);
  const pendingSnapshot={...structuredClone(f.player.state),portalTransfer:true,sourceSeq:51,sourceAt:f.now()};
  f.until(()=>f.controller.getState().status === "arrived");
  assert.equal(f.player.state.mapId,"2");
  const payload=f.manager.preparePlayerState(f.player,pendingSnapshot,f.now());
  const validated=validatePlayerState({player:f.player,profile:f.profile,payload,groups:new Map(),now:f.now()});
  assert.equal(validated.state.mapId,"2","an older source-map snapshot must not undo the server's portal commit");
});
