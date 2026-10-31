import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { installWorldSocketListeners } from "../../src/multiplayer/worldSocketListeners.js";
import { createGroupManager } from "../src/groups/groups.js";
import { createRickyAlly } from "../src/portals/rickyPortalState.js";
import { createRickyPortalRuntime } from "../src/portals/rickyPortalRuntime.js";
import { updateRickyCompanionNavigation } from "../src/portals/rickyCompanionAi.js";

const makeAlly = (patch = {})=>({...createRickyAlly({}, 0),x:0,y:0,nextLaserAt:0,nextRocketAt:0,...patch});
const makePlayer = (id = "pilot", patch = {})=>({id,connected:true,clientMode:"game",mapId:"portal-ricky",state:{x:0,y:0,hp:100000,mapId:"portal-ricky",...patch}});
const makeEnemy = (id, x, y = 0)=>({id,x,y,hp:100000,maxHp:100000,shield:0,maxShield:0,noReward:true});

function fixture(io = null){
  const events = [];
  io ||= {to:room=>({emit:(event,payload)=>events.push({room,event,payload})})};
  const leader=makePlayer(),member=makePlayer("member");
  const players=new Map([[leader.id,leader],[member.id,member]]);
  const groupManager=createGroupManager({io,players,publicPlayer:player=>({id:player.id}),publicEnemy:enemy=>({...enemy}),emitPlayers(){}});
  const group={id:"ai-group",leaderId:leader.id,members:[leader.id,member.id],instance:{id:"ai-instance",type:"portal",portal:{id:"ricky"},joinedMemberIds:[leader.id,member.id],ally:makeAlly(),enemies:[]}};
  leader.groupId=group.id;member.groupId=group.id;groupManager.groups.set(group.id,group);
  const runtime=createRickyPortalRuntime({io,players,groups:groupManager.groups,profileManager:{},emitInstance:groupManager.emitInstance,getInstanceMapId:()=>"portal-ricky",getJoinedMemberIds:instance=>instance.joinedMemberIds});
  return {io,events,leader,member,players,groupManager,group,instance:group.instance,ally:group.instance.ally,runtime};
}

test("idle companion acquires spawned monsters independently and keeps a living target",()=>{
  const ally=makeAlly(),player=makePlayer();
  assert.equal(updateRickyCompanionNavigation(ally,player,[],.05),null);
  const own=makeEnemy("own",150),selected=makeEnemy("player-choice",350);
  player.state.attackTargetId=selected.id;
  assert.equal(updateRickyCompanionNavigation(ally,player,[selected,own],.05),own);
  const newcomer=makeEnemy("newcomer",20);
  assert.equal(updateRickyCompanionNavigation(ally,player,[newcomer,selected,own],.05),own);
  own.hp=0;
  assert.equal(updateRickyCompanionNavigation(ally,player,[own,selected,newcomer],.05),newcomer);
});

for(const [x,y] of [[2010,0],[-2010,0],[0,2010],[0,-2010]]){
  test(`companion abandons combat at 201 mini-map coordinates on player axis (${x},${y})`,()=>{
    const f=fixture();
    const enemy=makeEnemy("nearby",20);
    f.instance.enemies=[enemy];f.runtime.updateRickyCompanions(.05,1000);
    assert(enemy.hp<enemy.maxHp);
    Object.assign(f.leader.state,{x,y});
    const before={hp:enemy.hp,laser:f.ally.nextLaserAt,rocket:f.ally.nextRocketAt};
    f.runtime.updateRickyCompanions(.1,10000);
    assert.equal(enemy.hp,before.hp);
    assert.equal(f.ally.nextLaserAt,before.laser);assert.equal(f.ally.nextRocketAt,before.rocket);
    assert.equal(f.ally.aiTargetId,"");assert.equal(f.ally.regrouping,true);
    assert(Math.hypot(x-f.ally.x,y-f.ally.y)<Math.hypot(x,y));
  });
}

test("200 mini-map coordinates on both axes is allowed even though the diagonal exceeds 200",()=>{
  const f=fixture();Object.assign(f.ally,{x:2000,y:-2000});
  const enemy=makeEnemy("corner",2020,-2000);f.instance.enemies=[enemy];
  f.runtime.updateRickyCompanions(.05,1000);
  assert(enemy.hp<enemy.maxHp);assert.notEqual(f.ally.regrouping,true);
});

test("regrouping continues after reentering 200 mini-map coordinates and attacks resume after rejoining",()=>{
  const f=fixture(),enemy=makeEnemy("nearby",120),spawn=makeEnemy("spawn",1830);f.instance.enemies=[enemy,spawn];f.leader.state.x=2010;
  f.runtime.updateRickyCompanions(.1,1000);
  assert.equal(f.ally.x,50);assert.equal(enemy.hp,enemy.maxHp);
  f.runtime.updateRickyCompanions(10,1100);
  assert.equal(f.ally.x,1890);assert.equal(enemy.hp,enemy.maxHp);assert.equal(spawn.hp,spawn.maxHp);
  f.runtime.updateRickyCompanions(.05,1200);
  assert.equal(f.ally.regrouping,false);assert(spawn.hp<spawn.maxHp);assert.equal(enemy.hp,enemy.maxHp);
});

test("autonomous pursuit cannot pull the companion out of its 200 mini-map coordinate escort area",()=>{
  const ally=makeAlly({x:1700}),player=makePlayer(),enemy=makeEnemy("edge",2600);
  const samples=[];
  for(let index=0;index<120;index++){
    assert.equal(updateRickyCompanionNavigation(ally,player,[enemy],.05),enemy);
    assert(Math.abs(ally.x-player.state.x)<=2000 && Math.abs(ally.y-player.state.y)<=2000);
    assert(Math.hypot(ally.vx,ally.vy)<=ally.speed+1e-6);
    assert.notEqual(ally.regrouping,true);samples.push(ally.x);
  }
  assert.equal(ally.x,2000);assert.equal(ally.vx,0);
  assert(samples.every((x,index)=>index===0 || x>=samples[index-1]));
  enemy.x=3000;
  assert.equal(updateRickyCompanionNavigation(ally,player,[enemy],.05),null);
});

test("an idle companion settles close without orbiting and stops if its player disappears",()=>{
  const ally=makeAlly({x:-170,y:90}),player=makePlayer();
  for(let index=0;index<60;index++)updateRickyCompanionNavigation(ally,player,[],.05);
  assert(Math.abs(Math.hypot(ally.x,ally.y)-120)<1e-6);assert.equal(ally.vx,0);assert.equal(ally.vy,0);
  const settled={x:ally.x,y:ally.y};
  for(let index=0;index<60;index++)updateRickyCompanionNavigation(ally,player,[],.05);
  assert.equal(ally.x,settled.x);assert.equal(ally.y,settled.y);
  updateRickyCompanionNavigation(ally,null,[],.05);
  assert.equal(ally.aiTargetId,"");assert.equal(ally.vx,0);assert.equal(ally.following,false);
});

for(const [axis,direction] of [["x",1],["x",-1],["y",1],["y",-1]]){
  test(`peaceful follow on ${axis} ${direction}: departure gap, moving spacing, close arrival and restart`,()=>{
    const ally=makeAlly(),player=makePlayer();
    updateRickyCompanionNavigation(ally,player,[],.05);
    for(let distance=20;distance<=300;distance+=20){
      player.state[axis]=direction*distance;updateRickyCompanionNavigation(ally,player,[],.05);
      assert.equal(ally[axis],0);assert.equal(ally.following,false);
    }
    player.state[axis]=direction*320;updateRickyCompanionNavigation(ally,player,[],.05);
    assert.equal(ally[axis],direction*25);assert.equal(ally.following,true);
    for(let index=0;index<80;index++){
      player.state[axis]+=direction*15;updateRickyCompanionNavigation(ally,player,[],.05);
      assert(Math.hypot(ally.vx,ally.vy)>0);
      assert(Math.hypot(ally.vx,ally.vy)<=ally.speed+1e-6);
    }
    assert(Math.abs(Math.abs(player.state[axis]-ally[axis])-240)<1e-6);
    for(let index=0;index<30;index++)updateRickyCompanionNavigation(ally,player,[],.05);
    assert(Math.abs(Math.abs(player.state[axis]-ally[axis])-120)<1e-6);
    assert.equal(ally.following,false);assert.equal(ally.vx,0);assert.equal(ally.vy,0);
    const settled=ally[axis];
    for(let index=0;index<9;index++){
      player.state[axis]+=direction*20;updateRickyCompanionNavigation(ally,player,[],.05);
      assert.equal(ally[axis],settled);
    }
    player.state[axis]+=direction*20;updateRickyCompanionNavigation(ally,player,[],.05);
    assert(Math.abs(ally[axis]-settled)>0);
  });
}

test("a short peaceful move below the departure threshold still ends close after the player stops",()=>{
  const ally=makeAlly(),player=makePlayer();updateRickyCompanionNavigation(ally,player,[],.05);
  for(let index=0;index<10;index++){
    player.state.x+=20;updateRickyCompanionNavigation(ally,player,[],.05);assert.equal(ally.x,0);
  }
  for(let index=0;index<20;index++)updateRickyCompanionNavigation(ally,player,[],.05);
  assert.equal(ally.x,80);assert.equal(ally.following,false);
});

test("combat keeps its target below 200 coordinates, then peaceful following resumes when monsters disappear",()=>{
  const f=fixture(),enemy=makeEnemy("nearby",20);f.instance.enemies=[enemy];
  for(let index=0;index<50;index++){
    f.leader.state.x+=20;f.runtime.updateRickyCompanions(.05,1000+index*50);
    assert.equal(f.ally.x,0);assert.equal(f.ally.aiTargetId,enemy.id);assert.equal(f.ally.following,false);
  }
  const hp=enemy.hp;enemy.hp=0;
  f.leader.state.x+=20;f.runtime.updateRickyCompanions(.05,4000);
  assert.equal(f.ally.x,25);assert.equal(f.ally.following,true);assert.equal(f.ally.aiTargetId,"");assert(hp>0);
  const newcomer=makeEnemy("newcomer",f.ally.x+20);f.instance.enemies=[newcomer];
  f.leader.state.x+=20;f.runtime.updateRickyCompanions(.05,5000);
  assert.equal(f.ally.x,25);assert.equal(f.ally.aiTargetId,newcomer.id);assert.equal(f.ally.following,false);
  assert(newcomer.hp<newcomer.maxHp);
});

test("peaceful follow handles diagonal movement and resets the departure gap for a new player",()=>{
  const ally=makeAlly(),player=makePlayer();updateRickyCompanionNavigation(ally,player,[],.05);
  player.state.x=220;player.state.y=220;updateRickyCompanionNavigation(ally,player,[],.1);
  assert(ally.x>0 && ally.y>0);assert(Math.abs(ally.x-ally.y)<1e-6);assert.equal(ally.following,true);
  const other=makePlayer("other",{x:ally.x+180,y:ally.y});
  const before={x:ally.x,y:ally.y};updateRickyCompanionNavigation(ally,other,[],.05);
  assert.equal(ally.x,before.x);assert.equal(ally.y,before.y);assert.equal(ally.following,false);
});

test("no absent or dead player can keep the companion attacking, and a living member can take over",()=>{
  const f=fixture(),enemy=makeEnemy("nearby",10);f.instance.enemies=[enemy];
  f.leader.connected=false;f.member.state.hp=0;
  f.runtime.updateRickyCompanions(.05,1000);assert.equal(enemy.hp,enemy.maxHp);
  f.member.state.hp=100000;f.member.state.x=2010;
  f.runtime.updateRickyCompanions(.1,2000);
  assert.equal(enemy.hp,enemy.maxHp);assert.equal(f.ally.followTargetId,f.member.id);assert(f.ally.x>0);
  f.instance.completed=true;const x=f.ally.x;
  f.runtime.updateRickyCompanions(.1,3000);assert.equal(f.ally.x,x);assert.equal(enemy.hp,enemy.maxHp);
});

test("zero or negative time steps do not move the companion or create invalid velocities",()=>{
  const ally=makeAlly(),player=makePlayer("pilot",{x:4000});
  for(const dt of [0,-1])updateRickyCompanionNavigation(ally,player,[],dt);
  assert.equal(ally.x,0);assert.equal(ally.y,0);assert.equal(ally.vx,0);assert.equal(ally.vy,0);
});

function nextEvent(socket,name){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{socket.off(name,receive);reject(new Error("Missing "+name));},5000);
    function receive(payload){clearTimeout(timer);resolve(payload);}
    socket.once(name,receive);
  });
}

for(const transport of ["websocket","polling"]){
  test(`real ${transport}: both clients receive combat, recall, peaceful following, close arrival and restart`,{timeout:15000},async t=>{
    const server=http.createServer(),io=new Server(server,{serveClient:false});
    const serverSockets=[];io.on("connection",socket=>serverSockets.push(socket));
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const clients=[0,1].map(()=>connect(`http://127.0.0.1:${server.address().port}`,{transports:[transport],reconnection:false}));
    t.after(async()=>{clients.forEach(client=>client.disconnect());await new Promise(resolve=>io.close(resolve));});
    await Promise.all(clients.map(client=>nextEvent(client,"connect")));
    const f=fixture(io),players=[f.leader,f.member],hits=[[],[]],states=[];
    f.players.clear();
    for(let index=0;index<2;index++){
      players[index].id=clients[index].id;f.players.set(players[index].id,players[index]);
      await serverSockets[index].join("instance:"+f.instance.id);
      const state={playerId:clients[index].id,rickyHealEvents:[]};states.push(state);
      installWorldSocketListeners({socket:clients[index],multiplayer:state,replaceServerEnemies(){},emitChange(){},toast(){}});
      clients[index].on("combat:hit",event=>hits[index].push(event));
    }
    f.group.leaderId=f.leader.id;f.group.members=players.map(player=>player.id);f.instance.joinedMemberIds=[...f.group.members];
    const own=makeEnemy("independent",120),selected=makeEnemy("player-choice",350);
    f.instance.enemies=[selected,own];f.leader.state.attackTargetId=selected.id;f.member.state.lockedTargetId=selected.id;
    async function tick(dt,now){
      const incoming=clients.map(client=>nextEvent(client,"coop:enemies"));
      f.runtime.updateRickyCompanions(dt,now);f.groupManager.emitInstance(f.group);
      const snapshots=await Promise.all(incoming);
      for(let index=0;index<2;index++){
        assert.equal(states[index].portalAlly.x,f.ally.x);assert.equal(states[index].portalAlly.y,f.ally.y);
        assert.equal(snapshots[index].ally.hp,f.ally.hp);
      }
      return snapshots;
    }
    await tick(.05,1000);
    for(const events of hits){assert.equal(events.length,2);assert(events.every(event=>event.enemyId===own.id && event.attackerId==="ricky_companion"));}
    assert.equal(selected.hp,selected.maxHp);
    f.leader.state.x=2010;const hp=own.hp;
    const spawned=makeEnemy("spawned",1830);f.instance.enemies.push(spawned);
    await tick(.1,10000);assert.equal(own.hp,hp);assert.equal(f.ally.x,50);
    let now=10100;
    while(Math.hypot(f.leader.state.x-f.ally.x,f.leader.state.y-f.ally.y)>120+1e-6){
      await tick(.1,now);now+=100;assert.equal(own.hp,hp);assert.equal(spawned.hp,spawned.maxHp);
    }
    assert.equal(f.ally.x,1890);
    assert(hits.every(events=>events.length===2));
    await tick(.05,now);assert(spawned.hp<spawned.maxHp);assert(hits.every(events=>events.length===4));
    assert(hits.every(events=>events.at(-1).enemyId===spawned.id));
    assert.equal(selected.hp,selected.maxHp);
    assert.deepEqual(hits[0].map(event=>[event.enemyId,event.damage]),hits[1].map(event=>[event.enemyId,event.damage]));
    f.instance.enemies.forEach(enemy=>enemy.hp=0);
    const origin=f.ally.x;
    for(let index=0;index<4;index++){
      f.leader.state.x+=40;now+=100;await tick(.1,now);assert.equal(f.ally.x,origin);
    }
    f.leader.state.x+=40;now+=100;await tick(.1,now);assert(f.ally.x>origin);
    for(let index=0;index<20;index++){
      f.leader.state.x+=30;now+=100;await tick(.1,now);
      assert(f.ally.vx>0 && f.ally.vx<=f.ally.speed);
      if(index>=2)assert(Math.abs(f.ally.vx-300)<1e-6);
    }
    assert(Math.abs(f.leader.state.x-f.ally.x-240)<1e-6);
    for(let index=0;index<15;index++){now+=100;await tick(.1,now);}
    assert(Math.abs(f.leader.state.x-f.ally.x-120)<1e-6);assert.equal(f.ally.vx,0);
    const settled=f.ally.x;
    for(let index=0;index<9;index++){
      f.leader.state.x+=20;now+=100;await tick(.1,now);assert.equal(f.ally.x,settled);
    }
    f.leader.state.x+=20;now+=100;await tick(.1,now);assert(f.ally.x>settled);
    assert(hits.every(events=>events.length===4));
  });
}
