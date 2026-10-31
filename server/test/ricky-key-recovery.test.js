import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { getFirmMapId } from "../../src/data/firms.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createProfileMutations } from "../src/players/profileMutations.js";
import { waitForProfileSave } from "../src/players/profilePersistenceResult.js";
import { createPlayerLifecycleManager } from "../src/players/playerLifecycle.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { getInstanceGroup, getPlayerInstanceGroup } from "../src/portals/portalSessions.js";
import { abandonServerQuest } from "../src/quests/questAbandon.js";
import { acceptServerQuest, getProfileFirmQuestId, getQuest, getQuestObjectives } from "../src/quests/questState.js";
import { canRecoverRickyQuestKey, recoverRickyQuestKey } from "../src/quests/rickyKeyRecovery.js";
import { createGameplayAccountGuard } from "../src/security/gameplayAccountGuard.js";
import { registerQuestHandlers } from "../src/socket/questHandlers.js";
import { WORLD_MAPS } from "../src/world/definitions.js";

function rescueProfile(firm = "astra"){
  const profile = createDefaultProfile();
  Object.assign(profile.player,{firmId:firm, firmSelected:true, level:10});
  profile.tutorial.status = "completed";
  const maintenanceId = getProfileFirmQuestId(profile,"quest_lv10_maintenance_impossible");
  const questId = getProfileFirmQuestId(profile,"quest_lv10_sauvons_deadly");
  profile.completedQuestClaims[maintenanceId] = true;
  assert.equal(acceptServerQuest(profile,questId).ok,true);
  const contact = getQuestObjectives(getQuest(questId)).find(objective=>objective.type === "talk_npc");
  return {profile,questId,maintenanceId,action:{type:"talk_npc",npcId:contact.npcId,zoneName:contact.zone}};
}

function fixture({firm = "astra",persist = ()=>Promise.resolve()} = {}){
  const initial = rescueProfile(firm);
  const key = "account:rescue-test";
  const profiles = new Map([[key,initial.profile]]);
  const map = WORLD_MAPS[String(getFirmMapId(firm,2))];
  const npc = map.questNpcs.find(entry=>entry.id === initial.action.npcId);
  const player = {id:"rescue-player", accountId:"rescue-test", account:{id:"rescue-test",firmId:firm}, mapId:String(map.id),
    state:{mapId:String(map.id),x:npc.x,y:npc.y,hp:15000,maxHp:15000,shield:0,maxShield:0,shipId:"orion"}};
  const players = new Map([[player.id,player]]);
  const getExistingProfile = ()=>({key,profile:profiles.get(key)});
  const mutations = createProfileMutations({profiles,persist,profileKeyForPlayer:()=>key,getExistingProfile});
  const actions = createProfileActions({profiles,persist,getExistingProfile});
  const profileManager = {...mutations,...actions,getProfileForPlayer:()=>profiles.get(key),profileKeyForPlayer:()=>key,saveWorldSession(){}};
  const events = [], handlers = new Map();
  const socket = {id:player.id,on:(name,handler)=>handlers.set(name,handler),emit:(event,payload)=>events.push({event,payload}),
    trigger:(event,payload)=>handlers.get(event)?.(payload)};
  const emitProfileSync = (target,profile)=>target && target.id === socket.id && socket.emit("profile:sync",{profile});
  function install(targetSocket,emitSync = emitProfileSync,guard = ()=>Boolean(player.accountId)){
    registerQuestHandlers(targetSocket,{
      players,profileManager,guard,emitProfileSync:emitSync,
      async progressProfileQuestAction(_socket,action){
        const result = profileManager.applyQuestAction({player,action:{kind:"progress",...action}});
        await waitForProfileSave(result);
        if(result.updates?.length || result.claimedQuests?.length) emitSync(player,result.profile);
        for(const claim of result.claimedQuests || []) targetSocket.emit("quest:claimed",claim);
        return result;
      }
    });
  }
  install(socket);
  return {...initial,player,players,profileManager,profiles,socket,events,install,map,npc,getProfile:()=>profiles.get(key),
    moveToNpc(){player.mapId=String(map.id);Object.assign(player.state,{mapId:String(map.id),x:npc.x,y:npc.y});}};
}

for(const firm of ["astra","cyan","jaune","verte"]){
  test(`${firm}: Ricky replaces a missing rescue key once and never stocks a second one`, async ()=>{
    const f = fixture({firm});
    await f.socket.trigger("quest:progress",{...f.action,zoneName:"forged",amount:999,itemId:"laser_mk4"});
    assert.equal(getInventoryItemCount(f.getProfile(),"portal_anchor_key"),1);
    assert.equal(getInventoryItemCount(f.getProfile(),"laser_mk4"),0);
    assert.equal(f.getProfile().questProgress[f.questId].portal || 0,0);
    assert.deepEqual(f.events.map(entry=>entry.event),["profile:sync","quest:key-recovered"]);
    await Promise.all(Array.from({length:10},()=>f.socket.trigger("quest:progress",f.action)));
    assert.equal(getInventoryItemCount(f.getProfile(),"portal_anchor_key"),1);
    assert.equal(f.events.filter(entry=>entry.event === "quest:key-recovered").length,1);
  });
}

test("recovery requires the active rescue, its prerequisite, the correct NPC and no completed portal objective", ()=>{
  const initial = rescueProfile();
  const rejected = [
    profile=>{profile.activeQuestIds=[];},
    profile=>{delete profile.completedQuestClaims[initial.maintenanceId];},
    profile=>{profile.completedQuestClaims[initial.questId]=true;},
    profile=>{profile.completedPortals.ricky=1;},
    profile=>{profile.questProgress[initial.questId].portal=1;}
  ];
  for(const modify of rejected){
    const profile=structuredClone(initial.profile);modify(profile);
    const before=JSON.stringify(profile);
    assert.equal(recoverRickyQuestKey(profile,initial.action).ok,false);
    assert.equal(JSON.stringify(profile),before);
  }
  for(const action of [{...initial.action,type:"deliver_item"},{...initial.action,npcId:"cyan02_portal_mechanic"},{...initial.action,zoneName:"Helion-01"}]){
    assert.equal(canRecoverRickyQuestKey(initial.profile,action),false);
  }
});

test("a first clear remains final after abandoning, accepting again and reloading the profile", ()=>{
  const {profile,questId,action}=rescueProfile();
  profile.completedPortals.ricky=1;
  assert.equal(abandonServerQuest(profile,questId).ok,true);
  assert.equal(acceptServerQuest(profile,questId).ok,true);
  assert.equal(canRecoverRickyQuestKey(JSON.parse(JSON.stringify(profile)),action),false);
});

test("remote, dead, foreign-map and unauthenticated requests cannot obtain a key", async ()=>{
  for(const change of [
    f=>{f.player.state.x=0;f.player.state.y=0;},
    f=>{f.player.state.mapId="0";},
    f=>{f.player.state.hp=0;},
    f=>{f.player.deathState={gameMode:"open"};},
    f=>{f.player.accountId="";}
  ]){
    const f=fixture();change(f);
    await f.socket.trigger("quest:progress",f.action);
    assert.equal(getInventoryItemCount(f.getProfile(),"portal_anchor_key"),0);
    assert.equal(f.events.some(entry=>entry.event === "quest:key-recovered"),false);
  }
});

test("key acknowledgement waits for persistence; repeated clicks do not defeat save rollback", async ()=>{
  let resolve;
  const saved=fixture({persist:()=>new Promise(done=>{resolve=done;})});
  const pending=saved.socket.trigger("quest:progress",saved.action);
  assert.equal(saved.events.length,0);
  resolve();await pending;
  assert.equal(saved.events.at(-1).event,"quest:key-recovered");

  let reject;
  const failed=fixture({persist:()=>new Promise((_done,fail)=>{reject=fail;})});
  const writing=failed.socket.trigger("quest:progress",failed.action);
  await failed.socket.trigger("quest:progress",failed.action);
  reject(new Error("storage unavailable"));await writing;
  assert.equal(getInventoryItemCount(failed.getProfile(),"portal_anchor_key"),0);
  assert.equal(failed.events.some(entry=>entry.event === "quest:key-recovered" || entry.event === "profile:sync"),false);
  assert.equal(failed.events.at(-1).event,"quest:error");
});

function nextEvent(socket,name){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{socket.off(name,receive);reject(new Error("Missing event: "+name));},5000);
    function receive(payload){clearTimeout(timer);resolve(payload);}
    socket.once(name,receive);
  });
}

test("real Socket.IO: death, return to Ricky, another entry and the first successful portal", {timeout:15000}, async t=>{
  const f=fixture();
  const httpServer=http.createServer();
  const io=new Server(httpServer,{serveClient:false});
  const groups=new Map();
  let serverSocket;
  const emitSync=(player,profile)=>io.to(player.id).emit("profile:sync",{profile});
  const resetGroupInstance=id=>{const group=getInstanceGroup(groups,id);if(group) group.instance=null;};
  const portalManager=createPortalInstanceManager({
    io,players:f.players,groups,profileManager:f.profileManager,emitProfileSync:emitSync,
    createGroup(socket){const group={id:"rescue-group",leaderId:socket.id,members:[socket.id],instance:null};groups.set(group.id,group);f.player.groupId=group.id;return group;},
    emitInstance(){},resetGroupInstance,firmWarManager:null
  });
  const lifecycle=createPlayerLifecycleManager({io,players:f.players,groups,profileManager:f.profileManager,emitProfileSync:emitSync,
    presence:{markCombat(){}},setPlayerMap(){},resetGroupInstance,logger:{warn(){}}});
  io.on("connection",socket=>{
    serverSocket=socket;f.players.clear();f.player.id=socket.id;f.players.set(socket.id,f.player);
    const requireAccount=createGameplayAccountGuard({players:f.players});
    f.install(socket,emitSync,event=>requireAccount(socket,event));
  });
  await new Promise(resolve=>httpServer.listen(0,"127.0.0.1",resolve));
  const client=connect(`http://127.0.0.1:${httpServer.address().port}`,{transports:["websocket"],reconnection:false});
  t.after(async()=>{client.disconnect();await new Promise(resolve=>io.close(resolve));});
  await nextEvent(client,"connect");
  let replacements=0;client.on("quest:key-recovered",()=>{replacements+=1;});
  for(let attempt=0;attempt<2;attempt+=1){
    f.moveToNpc();
    const replacement=nextEvent(client,"quest:key-recovered");
    client.emit("quest:progress",f.action);await replacement;
    assert.equal(getInventoryItemCount(f.getProfile(),"portal_anchor_key"),1);
    Object.assign(f.player.state,WORLD_MAPS[String(f.map.id)].closedPortals[0]);
    await portalManager.startPortalInstance(serverSocket,"ricky");
    const group=getPlayerInstanceGroup(f.player,groups);
    assert.equal(group.instance.portal.id,"ricky");
    assert.equal(getInventoryItemCount(f.getProfile(),"portal_anchor_key"),0);
    f.player.mapId="portal-ricky";
    Object.assign(f.player.state,{mapId:"portal-ricky",x:group.instance.spawn.x,y:group.instance.spawn.y});
    if(attempt===0){
      f.player.state.hp=0;
      assert.equal(lifecycle.markPlayerDead(f.player),true);
      assert.equal(f.player.deathState.gameMode,"portal");
      assert.equal(lifecycle.respawnPlayer(serverSocket,"spawn"),true);
      assert.equal(group.instance,null);
      assert.equal(f.getProfile().completedPortals.ricky || 0,0);
    }else{
      portalManager.emitPortalComplete(group);
      assert.equal(f.getProfile().completedPortals.ricky,1);
      assert.equal(f.getProfile().questProgress[f.questId].portal,1);
      // The exit is the real instance runtime; quest turn-in is still pending.
      portalManager.updateRickyCompanions(.05,group.instance.objective.exitAt+1);
    }
  }
  f.moveToNpc();
  const claimed=nextEvent(client,"quest:claimed");
  client.emit("quest:progress",f.action);await claimed;
  assert.equal(f.getProfile().completedQuestClaims[f.questId],true);
  assert.equal(getInventoryItemCount(f.getProfile(),"portal_anchor_key"),0);
  assert.equal(replacements,2);
});
