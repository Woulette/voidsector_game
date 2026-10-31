import assert from "node:assert/strict";
import test from "node:test";
import { createGroupManager } from "../src/groups/groups.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { getInstanceGroups, getPersonalPortalGroup, getPlayerInstanceGroup } from "../src/portals/portalSessions.js";
import { createPlayerLifecycleManager } from "../src/players/playerLifecycle.js";
import { getPlayerMapRoom, canSharePlayerState } from "../src/players/visibility.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileManager } from "../src/players/profiles.js";
import { addInventoryItemAmount, getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { getFirmMapId } from "../../src/data/firms.js";
import { createEnemyHitHandler } from "../src/combat/enemyHits.js";

const SOLO_IDS = ["blue","violet","red","ionis","emerald","void","prismatic","ancient"];

async function fixture(){
  const events=[],players=new Map(),sockets=new Map(),stored=new Map(),storage={};
  const io={sockets:{sockets},to:target=>({emit:(event,payload)=>events.push({target,event,payload})})};
  const profiles=createProfileManager({cleanName:String,logger:{warn(){}},
    loadProfileEntries:async()=>[],persistProfileEntries:async entries=>{
      if(storage.wait) await storage.wait;
      if(storage.fail) throw new Error("test storage unavailable");
      for(const [key,p] of entries)stored.set(key,structuredClone(p));
    }});
  await profiles.load();
  let lifecycle;
  const groups=createGroupManager({io,players,publicPlayer:p=>({id:p.id}),publicEnemy:e=>e,emitPlayers(){},
    onPortalMemberLeave:(p,g)=>lifecycle.leaveGroupPortal(p,g)});
  function setMap(socket,mapId){
    const p=players.get(socket.id); p.mapId=String(mapId); p.state.mapId=String(mapId);
    p.mapRoom=getPlayerMapRoom(p,mapId,groups.groups);
  }
  lifecycle=createPlayerLifecycleManager({io,players,groups:groups.groups,profileManager:profiles,
    presence:{markCombat(){},isActiveForWorld:()=>true},setPlayerMap:setMap,resetGroupInstance:groups.resetGroupInstance,logger:{warn(){}}});
  const portals=createPortalInstanceManager({io,players,groups:groups.groups,profileManager:profiles,
    createGroup:groups.createGroup,emitInstance:groups.emitInstance,resetGroupInstance:groups.resetGroupInstance,
    setPlayerMap:setMap,setTimeoutFn:()=>0,clearTimeoutFn(){},portalWaveTotal:5});
  async function add(id,firmId="astra"){
    const mapId=String(getFirmMapId(firmId,1)),spawn=WORLD_MAPS[mapId].spawn;
    const player={id,accountId:`account-${id}`,account:{id:`account-${id}`,firmId},name:id,clientMode:"game",connected:true,groupId:null,mapId,
      state:{mapId,x:spawn.x,y:spawn.y,hp:5000,maxHp:5000,shield:0,maxShield:0,shipId:"orion",speed:300}};
    const socket={id,join(){},leave(){},emit:(event,payload)=>events.push({target:id,event,payload})};
    players.set(id,player);sockets.set(id,socket);
    const updated=profiles.updateProfileForPlayer({player,update:p=>{
      const ready=createDefaultProfile(); Object.assign(p,ready);
      p.player={...p.player,name:id,firmId,firmSelected:true,level:50};p.tutorial.status="completed";p.unlockedPortals=[...SOLO_IDS];
      const suffix={astra:"",cyan:"_cyan",jaune:"_jaune",verte:"_verte"}[firmId];
      p.completedQuestClaims[`quest_lv10_maintenance_impossible${suffix}`]=true;
      addInventoryItemAmount(p,"portal_anchor_key",3);return {ok:true};
    }}); await updated.save;
    return {player,socket};
  }
  function approach(p){const profile=profiles.getProfileForPlayer(p),mapId=String(getFirmMapId(profile.player.firmId,2)),gate=WORLD_MAPS[mapId].closedPortals[0]; Object.assign(p.state,{mapId,x:gate.x,y:gate.y});setMap(sockets.get(p.id),mapId);}
  async function solo(member,id="blue"){
    await portals.preparePortalInstance(member.socket,id);
    const gate=member.player.preparedPortal; assert.ok(gate);
    Object.assign(member.player.state,{mapId:gate.mapId,x:gate.x,y:gate.y});setMap(member.socket,gate.mapId);
    await portals.startPortalInstance(member.socket,id);
    const group=getPersonalPortalGroup(member.player,groups.groups); assert.ok(group?.instance);
    const mapId=`portal-${id}`;Object.assign(member.player.state,{mapId,...group.instance.spawn});setMap(member.socket,mapId);
    return group;
  }
  async function deadly(member){approach(member.player);await portals.startPortalInstance(member.socket,"ricky");
    const group=getPlayerInstanceGroup(member.player,groups.groups);
    if(group?.instance?.joinedMemberIds.includes(member.player.id))setMap(member.socket,"portal-ricky");
    return group;
  }
  const keys=p=>getInventoryItemCount(profiles.getProfileForPlayer(p),"portal_anchor_key");
  return {io,events,players,sockets,profiles,groups,lifecycle,portals,add,solo,deadly,keys,approach,setMap,stored,storage};
}

for(const id of SOLO_IDS) test(`${id}: a non-leader starts a private run without replacing the social group`,async()=>{
  const f=await fixture(),leader=await f.add("leader"),member=await f.add("member");
  const social=f.groups.createGroup(leader.socket);social.members.push(member.player.id);member.player.groupId=social.id;
  const personal=await f.solo(member,id);
  assert.notEqual(personal,social);assert.equal(social.instance,undefined);
  assert.equal(member.player.groupId,social.id);assert.equal(social.leaderId,leader.player.id);
  assert.equal(f.groups.groups.size,1);assert.equal(personal.instance.privateOwner,true);
  assert.deepEqual(personal.instance.joinedMemberIds,[member.player.id]);
  assert.equal(member.player.mapRoom,`instance:${personal.instance.id}`);
});

test("two grouped owners in the same solo map have distinct rooms and cannot see each other",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b");
  const social=f.groups.createGroup(a.socket);social.members.push(b.player.id);b.player.groupId=social.id;
  const first=await f.solo(a),second=await f.solo(b);
  assert.notEqual(first.instance.id,second.instance.id);assert.notEqual(a.player.mapRoom,b.player.mapRoom);
  assert.equal(canSharePlayerState(a.player,b.player),false);
  assert.equal(canSharePlayerState({...a.player,mapRoom:"map:portal-blue"},{...b.player,mapRoom:"map:portal-blue"}),false);
  assert.equal(getInstanceGroups(f.groups.groups).filter(g=>g.instance).length,2);
  f.groups.leaveCurrentGroup(b.socket);
  assert.equal(getPlayerInstanceGroup(b.player,f.groups.groups),second);
  assert.equal(getPlayerMapRoom(b.player,"portal-blue",f.groups.groups),b.player.mapRoom);
  f.groups.createGroup(b.socket);
  assert.equal(getPlayerInstanceGroup(b.player,f.groups.groups),second);
  assert.equal(first.instance.completed,false);assert.equal(second.instance.completed,false);
});

test("kicking a solo owner and disconnecting their launcher preserve the run; a game reconnect keeps lives",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b");
  const social=f.groups.createGroup(a.socket);social.members.push(b.player.id);b.player.groupId=social.id;
  const run=await f.solo(b);run.instance.playerLives.b=2;
  assert.equal(f.groups.kickMember(a.socket,b.player.id),true);assert.ok(run.instance);
  f.players.set("launcher",{id:"launcher",accountId:b.player.accountId,clientMode:"launcher"});
  f.groups.removePlayerFromGroup("launcher",{disconnected:true});assert.ok(run.instance);
  const next={...b.player,id:"next-b"};f.players.set(next.id,next);f.groups.replaceGroupMemberId(b.player.id,next.id);
  assert.equal(getPlayerInstanceGroup(next,f.groups.groups),run);
  assert.equal(run.instance.playerLives[next.id],2);assert.deepEqual(run.instance.joinedMemberIds,[next.id]);
  f.groups.removePlayerFromGroup(next.id,{disconnected:true});assert.equal(run.instance,null);
});

test("Azuron deaths eject only their owner and preserve the same paid attempt until three lives are spent",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b"),second=await f.solo(b);
  let first=await f.solo(a);
  const attemptId=f.profiles.getProfileForPlayer(a.player).portalAttempt.id;
  for(let death=1;death<=3;death++){
    a.player.state.hp=0;assert.equal(f.lifecycle.markPlayerDead(a.player),true);
    assert.equal(first.instance,null);assert.equal(a.player.mapId,"0");assert.ok(second.instance);
    if(death<3){
      const saved=f.profiles.getProfileForPlayer(a.player);
      assert.equal(saved.portalAttempt.id,attemptId);assert.equal(saved.portalAttempt.lives,3-death);
      first=await f.solo(a);assert.equal(first.instance.playerLives.a,3-death);
    }
  }
  assert.equal(first.instance,null);assert.equal(a.player.mapId,"0");assert.ok(second.instance);
});

test("Deadly requires the leader first, consumes each entrant's own key once and preserves three individual lives",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b");
  const social=f.groups.createGroup(a.socket);social.members.push(b.player.id);b.player.groupId=social.id;
  f.approach(b.player);await f.portals.startPortalInstance(b.socket,"ricky");assert.equal(f.keys(b.player),3);assert.equal(social.instance,undefined);
  await f.deadly(a);assert.equal(f.keys(a.player),2);assert.deepEqual(social.instance.joinedMemberIds,["a"]);
  await f.deadly(b);assert.equal(f.keys(b.player),2);assert.deepEqual(social.instance.playerLives,{a:3,b:3});
  await f.portals.startPortalInstance(b.socket,"ricky");assert.equal(f.keys(b.player),2);
  for(let death=1;death<=3;death++){
    b.player.state.hp=0;f.lifecycle.markPlayerDead(b.player);
    if(death<3)assert.equal(f.lifecycle.respawnPlayer(b.socket,"portal-resume"),true);
  }
  assert.equal(b.player.mapId,"0");assert.equal(social.instance.playerLives.a,3);assert.equal(f.keys(b.player),2);
  f.approach(b.player);await f.portals.startPortalInstance(b.socket,"ricky");assert.equal(f.keys(b.player),2);
  assert.ok(f.events.some(e=>e.target==="b" && e.event==="portal:error" && /abandonnee/.test(e.payload.message)));
  const solo=await f.solo(b);assert.ok(solo.instance);
  f.groups.leaveCurrentGroup(a.socket);assert.equal(a.player.mapId,"0");assert.equal(social.instance,null);
  assert.equal(getPlayerInstanceGroup(b.player,f.groups.groups),solo);
  assert.equal(f.events.some(e=>e.target==="b" && e.event==="group:instance-reset"),false);
});

test("Deadly rejects missing keys and remote entry without admitting or charging the player",async()=>{
  const f=await fixture(),a=await f.add("a");
  await f.portals.startPortalInstance(a.socket,"ricky");assert.equal(f.keys(a.player),3);
  assert.equal(getPlayerInstanceGroup(a.player,f.groups.groups)?.instance,undefined);
  await f.profiles.updateProfileForPlayer({player:a.player,update:p=>{p.inventoryItems=p.inventoryItems.filter(i=>i.itemId!=="portal_anchor_key");return {ok:true};}}).save;
  f.approach(a.player);await f.portals.startPortalInstance(a.socket,"ricky");
  assert.equal(getPlayerInstanceGroup(a.player,f.groups.groups)?.instance,undefined);assert.equal(f.keys(a.player),0);
});

test("Deadly waits for the key save and a repeated pending entry cannot spend twice",async()=>{
  const f=await fixture(),a=await f.add("a");f.approach(a.player);
  let release;f.storage.wait=new Promise(resolve=>{release=resolve;});
  const pending=f.portals.startPortalInstance(a.socket,"ricky");
  assert.equal(f.keys(a.player),2);assert.equal(getPlayerInstanceGroup(a.player,f.groups.groups).instance,undefined);
  assert.equal(f.events.some(e=>e.event==="portal:started"),false);
  await f.portals.startPortalInstance(a.socket,"ricky");assert.equal(f.keys(a.player),2);
  release();await pending;
  assert.equal(f.events.filter(e=>e.event==="portal:started").length,1);
  assert.deepEqual(getPlayerInstanceGroup(a.player,f.groups.groups).instance.playerLives,{a:3});
});

test("a failed key save keeps the key and grants no admission",async()=>{
  const f=await fixture(),a=await f.add("a");f.approach(a.player);f.storage.fail=true;
  await f.portals.startPortalInstance(a.socket,"ricky");
  assert.equal(f.keys(a.player),3);assert.equal(getPlayerInstanceGroup(a.player,f.groups.groups).instance,undefined);
  assert.equal(f.events.some(e=>e.event==="portal:started"),false);
});

test("a leadership change during the key save cancels admission and restores exactly one key",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b");
  const group=f.groups.createGroup(a.socket);group.members.push("b");b.player.groupId=group.id;f.approach(a.player);
  let release;f.storage.wait=new Promise(resolve=>{release=resolve;});
  const pending=f.portals.startPortalInstance(a.socket,"ricky");
  assert.equal(f.groups.promoteLeader(a.socket,"b"),true);release();await pending;
  assert.equal(f.keys(a.player),3);assert.equal(group.instance,undefined);
  assert.equal(f.events.some(e=>e.event==="portal:started"),false);
});

test("a completed Deadly run can be started again with a new key and three fresh lives",async()=>{
  const f=await fixture(),a=await f.add("a");const group=await f.deadly(a),previous=group.instance;
  previous.completed=true;await f.deadly(a);
  assert.notEqual(group.instance.id,previous.id);assert.equal(group.instance.completed,false);
  assert.equal(f.keys(a.player),1);assert.deepEqual(group.instance.playerLives,{a:3});
  assert.equal(f.events.filter(e=>e.event==="portal:started").length,2);
});

test("starting Deadly over a test instance still rechecks the leader after key persistence",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b");
  const group=f.groups.createGroup(a.socket);group.members.push("b");b.player.groupId=group.id;
  const previous={id:"coop",enemies:[]};group.instance=previous;f.approach(a.player);
  let release;f.storage.wait=new Promise(resolve=>{release=resolve;});
  const pending=f.portals.startPortalInstance(a.socket,"ricky");
  f.groups.promoteLeader(a.socket,"b");release();await pending;
  assert.equal(group.instance,previous);assert.equal(f.keys(a.player),3);
  assert.equal(f.events.some(e=>e.event==="portal:started"),false);
});

test("group test-instance snapshots cannot replace a member's active solo snapshot",async()=>{
  const f=await fixture(),a=await f.add("a"),b=await f.add("b");
  const group=f.groups.createGroup(a.socket);group.members.push("b");b.player.groupId=group.id;
  const personal=await f.solo(b);f.events.length=0;f.groups.createCoopInstance(a.socket);
  assert.equal(getPlayerInstanceGroup(b.player,f.groups.groups),personal);
  assert.equal(f.events.some(e=>e.event==="coop:enemies" && ["b",group.id].includes(e.target)),false);
});

test("solo laser combat still resolves after the owner leaves the social group",async()=>{
  const f=await fixture(),a=await f.add("a");f.groups.createGroup(a.socket);const personal=await f.solo(a);
  const enemy={id:"solo-target",kind:"shared_orb",x:a.player.state.x+100,y:a.player.state.y,hp:10000,maxHp:10000,shield:0,maxShield:0,radius:40};
  personal.instance.enemies=[enemy];const impacts=[];
  const handler=createEnemyHitHandler({io:f.io,players:f.players,groups:f.groups.groups,profileManager:f.profiles,
    presence:{markCombat(){}},findWorldEnemyForPlayer:()=>null,scheduleCombatImpact:callback=>impacts.push(callback),
    emitInstance:f.groups.emitInstance,handlePortalEnemyDeath:f.portals.handlePortalEnemyDeath});
  const ammo=f.profiles.getProfileForPlayer(a.player).ammoInventory.ammo_x1;
  f.groups.leaveCurrentGroup(a.socket);
  const shot=handler.applyEnemyHitForPlayer(a.player,{enemyId:enemy.id,weaponClass:"laser",ammoId:"ammo_x1",count:1});
  assert.equal(shot.ok,true);
  assert.equal(f.profiles.getProfileForPlayer(a.player).ammoInventory.ammo_x1,ammo-1);
  for(const impact of impacts) impact();
  assert.ok(f.events.some(e=>e.event==="combat:hit" && e.target===a.player.mapRoom));
});

for(const firmId of ["astra","cyan","jaune","verte"]) test(`${firmId}: Deadly accepts the firm's own map-two gate and returns to map one after three deaths`,async()=>{
  const f=await fixture(),a=await f.add("pilot",firmId);await f.deadly(a);
  const group=getPlayerInstanceGroup(a.player,f.groups.groups);assert.equal(group.instance.portal.id,"ricky");
  for(let death=1;death<=3;death++){
    a.player.state.hp=0;f.lifecycle.markPlayerDead(a.player);
    if(death<3) f.lifecycle.respawnPlayer(a.socket,"portal-resume");
  }
  assert.equal(a.player.mapId,String(getFirmMapId(firmId,1)));assert.equal(group.instance,null);
});
