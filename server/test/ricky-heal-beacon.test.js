import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { installWorldSocketListeners } from "../../src/multiplayer/worldSocketListeners.js";
import { sampleRickyHealBeacon } from "../../src/game/render/rickyHealBeacon.js";
import { createGroupManager } from "../src/groups/groups.js";
import { createRickyAlly } from "../src/portals/rickyPortalState.js";
import { createRickyPortalRuntime } from "../src/portals/rickyPortalRuntime.js";
import { registerGroupHandlers } from "../src/socket/groupHandlers.js";

function fixture(io=null){
  const events=[],saves=[];
  io ||= {to:room=>({emit:(event,payload)=>events.push({room,event,payload})})};
  const makePlayer=id=>({id,groupId:"healing-group",connected:true,clientMode:"game",mapId:"portal-ricky",state:{mapId:"portal-ricky",x:120,y:0,hp:30000,maxHp:30000}});
  const leader=makePlayer("leader"),member=makePlayer("member"),players=new Map([[leader.id,leader],[member.id,member]]);
  const groupManager=createGroupManager({io,players,publicPlayer:player=>({id:player.id}),publicEnemy:enemy=>({...enemy}),emitPlayers(){}});
  const ally={...createRickyAlly({},0),x:0,y:0};
  const instance={id:"healing-instance",type:"portal",portal:{id:"ricky"},joinedMemberIds:[leader.id,member.id],ally,enemies:[]};
  const group={id:"healing-group",leaderId:leader.id,members:[leader.id,member.id],instance};
  groupManager.groups.set(group.id,group);
  let emissions=0;
  const runtime=createRickyPortalRuntime({io,players,groups:groupManager.groups,
    profileManager:{saveWorldSession:entry=>saves.push(entry)},getInstanceMapId:()=>"portal-ricky",getJoinedMemberIds:entry=>entry.joinedMemberIds,
    emitInstance(entry){emissions++;groupManager.emitInstance(entry);}});
  return {events,saves,leader,member,players,group,instance,ally,runtime,groupManager,get emissions(){return emissions;}};
}

test("Ricky casts automatically at his own position when a nearby ally reaches 75 percent hull",()=>{
  const f=fixture();f.leader.state.hp=22501;
  f.runtime.updateRickyCompanions(.05,100000);assert.equal(f.instance.beacons.length,0);
  f.leader.state.hp=22500;f.runtime.updateRickyCompanions(.05,100050);
  const beacon=f.instance.beacons[0];assert(beacon);
  assert.equal(beacon.x,0);assert.equal(beacon.y,0);assert.notEqual(beacon.x,f.leader.state.x);
  assert.equal(beacon.sourceId,"ricky_companion");assert.equal(f.leader.state.hp,25500);
  assert.equal(beacon.expiresAt-beacon.createdAt,18000);assert.equal(beacon.pulseIntervalMs,2000);
  assert.equal(f.ally.healCooldownUntil,160050);
  assert.equal(f.events.filter(event=>event.event==="portal:ricky-heal").length,1);
  assert.equal(f.events.find(event=>event.event==="player:healed").payload.sourceId,"ricky_companion");
});

test("a healthy party does not waste the beacon, but Ricky can heal himself",()=>{
  const f=fixture();f.runtime.updateRickyCompanions(.05,100000);assert.equal(f.instance.beacons.length,0);
  f.ally.hp=70000;f.runtime.updateRickyCompanions(.05,100050);
  assert.equal(f.instance.beacons.length,1);assert.equal(f.ally.hp,73000);assert.equal(f.saves.length,0);
});

test("the first pulse occurs once, subsequent pulses are spaced by two seconds, and hull is capped",()=>{
  const f=fixture();f.leader.state.hp=22000;f.runtime.updateRickyCompanions(.05,100000);
  assert.equal(f.leader.state.hp,25000);
  f.runtime.updateRickyCompanions(.02,100020);assert.equal(f.leader.state.hp,25000);
  f.runtime.updateRickyCompanions(.05,101999);assert.equal(f.leader.state.hp,25000);
  f.runtime.updateRickyCompanions(.05,102000);assert.equal(f.leader.state.hp,28000);
  assert.equal(f.instance.beacons[0].lastPulseAt,102000);
  f.runtime.updateRickyCompanions(.05,104000);assert.equal(f.leader.state.hp,30000);
  f.leader.state.hp=1000;f.runtime.updateRickyCompanions(.05,118000);
  assert.equal(f.leader.state.hp,1000);assert.equal(f.instance.beacons.length,0);
  f.runtime.updateRickyCompanions(.05,159999);assert.equal(f.instance.beacons.length,0);
  f.runtime.updateRickyCompanions(.05,160000);assert.equal(f.instance.beacons.length,1);assert.equal(f.leader.state.hp,4000);
});

for(const reason of ["outside-radius","foreign-map","unjoined","abandoned","dead","disconnected","launcher"]){
  test(`an ineligible ${reason} player cannot trigger or receive Ricky's heal`,()=>{
    const f=fixture();f.member.state.hp=1000;
    if(reason==="outside-radius")f.member.state.x=251;
    if(reason==="foreign-map")f.member.state.mapId="0";
    if(reason==="unjoined")f.instance.joinedMemberIds=[f.leader.id];
    if(reason==="abandoned")f.instance.abandonedMemberIds=[f.member.id];
    if(reason==="dead")f.member.state.hp=0;
    if(reason==="disconnected")f.member.connected=false;
    if(reason==="launcher")f.member.clientMode="launcher";
    f.runtime.updateRickyCompanions(.05,100000);assert.equal(f.instance.beacons.length,0);
    f.ally.hp=70000;f.runtime.updateRickyCompanions(.05,100050);
    assert.equal(f.instance.beacons.length,1);assert.equal(f.member.state.hp,reason==="dead"?0:1000);
  });
}

test("manual requests never create a beacon or spend its cooldown",()=>{
  const f=fixture(),socket={emit:(event,payload)=>f.events.push({event,payload})};
  f.leader.state.hp=1000;
  for(let index=0;index<5;index++)assert.equal(f.runtime.activateRickyHealBeacon(socket),false);
  assert.equal(f.instance.beacons,undefined);assert.equal(f.ally.healCooldownUntil,0);
  f.runtime.updateRickyCompanions(.05,100000);assert.equal(f.instance.beacons.length,1);
  f.runtime.activateRickyHealBeacon(socket);assert.equal(f.instance.beacons.length,1);assert.equal(f.ally.healCooldownUntil,160000);
});

test("a dead Ricky or completed encounter cannot deploy a new beacon",()=>{
  for(const change of [f=>{f.ally.hp=0;},f=>{f.ally.alive=false;},f=>{f.instance.completed=true;}]){
    const f=fixture();f.leader.state.hp=1000;change(f);f.runtime.updateRickyCompanions(.05,100000);
    assert.equal((f.instance.beacons || []).length,0);assert.equal(f.leader.state.hp,1000);
  }
});

test("the beacon remains where Ricky deployed it when he pursues a monster",()=>{
  const f=fixture();f.ally.hp=70000;
  f.instance.enemies=[{id:"monster",x:700,y:0,hp:1000000,maxHp:1000000,shield:0,maxShield:0}];
  f.runtime.updateRickyCompanions(.05,100000);const beacon=f.instance.beacons[0];
  for(let index=1;index<20;index++)f.runtime.updateRickyCompanions(.05,100000+index*50);
  assert(f.ally.x>100);assert.equal(beacon.x,0);assert.equal(beacon.y,0);
});

test("beacon opening, server pulse and expiration are visual only",()=>{
  const beacon={x:10,y:20,radius:250,createdAt:100000,lastPulseAt:100000,expiresAt:118000};
  const before=JSON.stringify(beacon);
  assert.equal(sampleRickyHealBeacon(beacon,100000).opening,0);
  assert.equal(sampleRickyHealBeacon(beacon,100700).opening,1);
  assert.equal(sampleRickyHealBeacon(beacon,101500).pulseStrength,0);
  assert.equal(sampleRickyHealBeacon(beacon,117500).opacity,.5);
  assert.equal(sampleRickyHealBeacon(beacon,118000).opacity,0);
  assert.equal(JSON.stringify(beacon),before);
  const afterPulse=sampleRickyHealBeacon({...beacon,lastPulseAt:102000},102010);
  assert(afterPulse.pulseStrength>.9);
});

function nextEvent(socket,name){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{socket.off(name,receive);reject(new Error("Missing "+name));},5000);
    function receive(payload){clearTimeout(timer);resolve(payload);}
    socket.once(name,receive);
  });
}

for(const transport of ["websocket","polling"]){
  test(`real ${transport}: two clients see Ricky deploy automatically, retain pulse data and reject manual placement`,{timeout:15000},async t=>{
    const server=http.createServer(),io=new Server(server,{serveClient:false}),serverSockets=[];
    io.on("connection",socket=>serverSockets.push(socket));
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const clients=[0,1].map(()=>connect(`http://127.0.0.1:${server.address().port}`,{transports:[transport],reconnection:false}));
    t.after(async()=>{clients.forEach(client=>client.disconnect());await new Promise(resolve=>io.close(resolve));});
    await Promise.all(clients.map(client=>nextEvent(client,"connect")));
    const f=fixture(io),states=[],players=[f.leader,f.member];f.players.clear();
    for(let index=0;index<2;index++){
      players[index].id=clients[index].id;f.players.set(players[index].id,players[index]);
      await serverSockets[index].join("instance:"+f.instance.id);
      const state={playerId:clients[index].id,rickyHealEvents:[],playerHealEvents:[]};states.push(state);
      installWorldSocketListeners({socket:clients[index],multiplayer:state,replaceServerEnemies(){},emitChange(){},toast(){}});
      registerGroupHandlers(serverSockets[index],{guard:()=>true,activateRickyHealBeacon:f.runtime.activateRickyHealBeacon});
    }
    f.group.leaderId=f.leader.id;f.group.members=players.map(player=>player.id);f.instance.joinedMemberIds=[...f.group.members];
    const initial=clients.map(client=>nextEvent(client,"coop:enemies"));f.groupManager.emitInstance(f.group);await Promise.all(initial);
    const rejected=nextEvent(clients[0],"portal:error");clients[0].emit("portal:ricky-heal",{x:9999,y:9999});
    assert.match((await rejected).message,/automatiquement/);assert.equal(f.instance.beacons,undefined);
    f.leader.state.hp=22000;
    const cast=clients.map(client=>nextEvent(client,"portal:ricky-heal"));
    const snapshots=clients.map(client=>nextEvent(client,"coop:enemies"));
    const now=Date.now();f.runtime.updateRickyCompanions(.05,now);
    const events=await Promise.all(cast);await Promise.all(snapshots);
    for(let index=0;index<2;index++){
      assert.equal(events[index].sourceId,"ricky_companion");assert.equal(events[index].beacon.x,0);
      assert.equal(states[index].portalBeacons[0].createdAt,now);assert.equal(states[index].portalBeacons[0].pulseIntervalMs,2000);
      assert(states[index].portalAlly.clientSpellAt>0);
    }
    const next=clients.map(client=>nextEvent(client,"coop:enemies"));
    f.runtime.updateRickyCompanions(.05,now+2000);f.groupManager.emitInstance(f.group);await Promise.all(next);
    assert(states.every(state=>state.portalBeacons[0].lastPulseAt===now+2000));
    assert.equal(f.leader.state.hp,28000);
  });
}
