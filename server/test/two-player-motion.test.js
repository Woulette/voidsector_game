import test from "node:test";
import assert from "node:assert/strict";
import { registerPlayerHandlers } from "../src/socket/playerHandlers.js";
import { createSocketRateLimiter } from "../src/socket/rateLimit.js";
import { config } from "../src/config.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { emitAuthoritativePlayerStateToMapRoom } from "../src/players/playerStateStream.js";
import { upsertRemotePlayer } from "../../src/multiplayer/socketState.js";
import { sampleBufferedState, updateRemoteRenderState } from "../../src/multiplayer/remoteInterpolation.js";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";

export function createMotionHarness({now, broadcast, correction = ()=>{}}){
  const players = new Map();
  const publicPlayer = player=>({id:player.id,state:{...player.state}});
  const io = {to:room=>({emit:(event,payload)=>broadcast(null,room,event,structuredClone(payload))})};
  const limiter=createSocketRateLimiter({limits:config.socketRateLimits,now});
  const add=(id, transportSocket = null)=>{
    const handlers=new Map();
    const socket=transportSocket || {id,on:(event,fn)=>handlers.set(event,fn),emit:(event,payload)=>correction(id,event,payload),
      to:room=>{
        const emitter={emit:(event,payload)=>broadcast(id,room,event,structuredClone(payload))};
        emitter.volatile=emitter; return emitter;
      }};
    const profile=createDefaultProfile();
    const player={id,connected:true,clientMode:"game",mapId:"0",mapRoom:"map:0",
      state:{x:0,y:0,vx:0,vy:0,angle:0,hp:5000,maxHp:5000,shield:0,maxShield:0,shipId:"orion",mapId:"0",updatedAt:now()}};
    players.set(id,player);
    registerPlayerHandlers(socket,{players,io,groups:new Map(),guard:event=>limiter(socket,event),publicPlayer,
      logger:{warn(){}},presence:{markActivity(){},syncMovementLogoutState(){}},
      profileManager:{getProfileSnapshotForPlayer:()=>profile,saveWorldSession(){}},
      setPlayerMap:(_,map)=>{player.mapId=map;player.mapRoom=`map:${map}`;}});
    return {player,send:payload=>handlers.get("player:state")(payload)};
  };
  return {add,players,io,publicPlayer};
}

function path(t,side){
  const v=300*side;
  if(t<2000)return {x:v*t/1000,y:0,vx:v,vy:0};
  if(t<3000)return {x:v*2,y:0,vx:0,vy:0};
  if(t<5000)return {x:v*2,y:v*(t-3000)/1000,vx:0,vy:v};
  if(t<7000)return {x:v*(2-(t-5000)/1000),y:v*2,vx:-v,vy:0};
  return {x:0,y:v*2,vx:0,vy:0};
}

test("two peers through real player handlers converge after stops, turns, loss and uplink/downlink bursts", t=>{
  const originalNow=Date.now;
  let clock=100000;
  Date.now=()=>clock;
  try{
    for(const fps of [30,60,144]) for(const degraded of [false,true]){
      clock=100000;
      const clients=new Map([['a',{playerId:'a',remotePlayers:new Map()}],['b',{playerId:'b',remotePlayers:new Map()}]]);
      const deliveries=[];const lastDown=new Map();let out=0,corrections=0;
      const harness=createMotionHarness({now:()=>clock,correction:()=>corrections++,broadcast:(from,room,event,payload)=>{
        if(event!=="player:state")return;
        for(const [id] of clients){if(id===from||id===payload.id)continue;
          if(degraded&&++out%17===0)continue;
          const latency=degraded?[40,200,100,40][out%4]:40;
          const at=Math.max(clock+latency,lastDown.get(id)||0);lastDown.set(id,at);
          deliveries.push({id,payload,at});
        }
      }});
      const peers=[harness.add('a'),harness.add('b')];const uploads=[];
      for(let i=0;i<2;i++){
        let lastAt=0;
        for(let t=0,seq=1;t<=10000;t+=50,seq++){
          if(degraded&&seq%23===0)continue;
          const latency=degraded?(t>=3600&&t<4500?4500-t+40:[40,180,40,90][seq%4]):40;
          const at=Math.max(100000+t+latency,lastAt+.01);lastAt=at;
          uploads.push({i,at,payload:{...peers[i].player.state,...path(t,i===0?1:-1),sourceSeq:seq,sourceAt:t,
            enginePower:t<2000||(t>=3000&&t<7000)?1:0}});
        }
      }
      uploads.sort((a,b)=>a.at-b.at);let index=0;const prev=new Map();let maxStep=0;
      for(let t=0;t<=11200;t+=1000/fps){
        const frameAt=100000+t;
        while(index<uploads.length&&uploads[index].at<=frameAt){const p=uploads[index++];clock=p.at;peers[p.i].send(p.payload);}
        clock=frameAt;
        deliveries.sort((a,b)=>a.at-b.at);
        while(deliveries.length&&deliveries[0].at<=clock){const p=deliveries.shift();upsertRemotePlayer(clients.get(p.id),p.payload,{now:p.at,epochNow:p.at});}
        for(const [id,c] of clients){const remote=c.remotePlayers.values().next().value;if(!remote)continue;
          remote.interpolationState||={};remote.sampledState||={};
          const s=sampleBufferedState(remote.stateSamples,{now:clock,timing:remote.interpolationState,target:remote.sampledState,diagnostics:remote.networkDiagnostics});
          const r=updateRemoteRenderState(remote,s,clock);const old=prev.get(id);
          if(old&&t>500)maxStep=Math.max(maxStep,Math.hypot(r.x-old.x,r.y-old.y));
          prev.set(id,{x:r.x,y:r.y});
        }
      }
      for(const [id,c] of clients){
        const remote=c.remotePlayers.values().next().value;
        const expected=path(10000,id==='a'?-1:1);
        assert.ok(Math.hypot(remote.renderState.x-expected.x,remote.renderState.y-expected.y)<1);
        assert.equal(remote.networkDiagnostics.discontinuityResets,0);
      }
      assert.equal(corrections,0);
      assert.ok(maxStep<600/fps,`visible jump ${maxStep} px/frame (degraded=${degraded}, fps=${fps})`);
      t.diagnostic(`${fps} FPS, degraded=${degraded}: largest step ${maxStep.toFixed(2)} px`);
    }
  }finally{Date.now=originalNow;}
});

test("two actual Socket.IO clients exchange movement and reliable stops through production handlers", {timeout:10000}, async()=>{
  const http=createServer();
  const server=new Server(http);
  const harness=createMotionHarness({now:()=>Date.now(),broadcast(){}});
  server.on('connection',async socket=>{
    harness.add(socket.id,socket);
    await socket.join('map:0');
    socket.emit('test:ready');
  });
  await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
  const clients=[];
  try{
    for(let i=0;i<2;i++){
      const socket=connect(`http://127.0.0.1:${http.address().port}`,{transports:['websocket'],autoConnect:false,reconnection:false});
      clients.push({socket,remotePlayers:new Map(),connected:true,auth:{account:{id:`test-${i}`},profileReady:true},corrections:[]});
      const c=clients.at(-1);
      socket.on('player:state',payload=>upsertRemotePlayer(c,payload));
      socket.on('player:state-correction',payload=>c.corrections.push(payload));
      const ready=new Promise((resolve,reject)=>{socket.once('test:ready',resolve);socket.once('connect_error',reject);});
      socket.connect();await ready;c.playerId=socket.id;c.commands=createCombatCommands({multiplayer:c});
    }
    for(let frame=0;frame<=20;frame++){
      for(let i=0;i<2;i++){
        const direction=i===0?1:-1;
        clients[i].commands.sendPlayerSnapshot({x:direction*frame*15,y:0,vx:frame<20?direction*300:0,vy:0,
          enginePower:frame<20?1:0,mapId:'0',shipId:'orion',hp:5000,maxHp:5000,shield:0,maxShield:0},{active:true});
      }
      await delay(55);
    }
    for(let i=0;i<2;i++){
      const remote=clients[i].remotePlayers.get(clients[1-i].playerId);
      assert.ok(remote.stateSamples.length>5);
      assert.equal(remote.state.x,i===0?-300:300);
      assert.equal(remote.state.vx,0);
      assert.equal(remote.networkDiagnostics.discontinuityResets,0);
      assert.equal(clients[i].corrections.length,0);
      assert.equal(clients[i].socket.io.engine.transport.name,'websocket');
    }
  }finally{
    clients.forEach(c=>c.socket.disconnect());
    await new Promise(resolve=>server.close(resolve));
  }
});

test("combat fanout refreshes hp without fabricating a stationary motion sample", ()=>{
  const remoteState={playerId:'b',remotePlayers:new Map()};
  const player={id:'a',mapRoom:'map:0',lastStateStreamAt:1000,stateStreamSeq:1,
    state:{x:10,y:0,vx:300,vy:0,sourceAt:0,streamSeq:1,sourceSeq:1,mapId:'0',hp:500}};
  upsertRemotePlayer(remoteState,{id:player.id,state:{...player.state}},{now:1040});
  player.state.hp=400;
  emitAuthoritativePlayerStateToMapRoom({player,now:1045,publicPlayer:p=>({id:p.id,state:{...p.state}}),
    io:{to:()=>({emit:(_,payload)=>upsertRemotePlayer(remoteState,payload,{now:1085})})}});
  const remote=remoteState.remotePlayers.get('a');
  assert.equal(remote.stateSamples.length,1);
  assert.equal(remote.stateSamples[0].hp,400);
  assert.equal(remote.stateSamples[0].sourceAt,0);
  assert.equal(remote.stateSamples[0].receivedAt,1040);
});

test("movement limiter allows a delayed 20 Hz backlog but still bounds sustained spam", ()=>{
  let now=0;
  const limiter=createSocketRateLimiter({limits:config.socketRateLimits,now:()=>now});
  const socket={id:'test'};
  for(let i=0;i<40;i++)assert.equal(limiter(socket,'player:state'),true);
  let accepted=0;
  for(let i=0;i<1000;i++)accepted+=Number(limiter(socket,'player:state'));
  assert.ok(accepted<=20);
  now=1000;
  let refilled=0;for(let i=0;i<100;i++)refilled+=Number(limiter(socket,'player:state'));
  assert.equal(refilled,30);
});
