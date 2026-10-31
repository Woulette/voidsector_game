import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createGroupManager } from "../src/groups/groups.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { getPlayerInstanceGroup } from "../src/portals/portalSessions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { registerGroupHandlers } from "../src/socket/groupHandlers.js";
import { publicEnemy } from "../src/world/spawn.js";
import { installWorldSocketListeners } from "../../src/multiplayer/worldSocketListeners.js";
import { createPlayerLifecycleManager } from "../src/players/playerLifecycle.js";
import { recordAzuronEnemyReward } from "../../src/shared/azuronProgress.js";

function nextEvent(socket, name){
  return new Promise((resolve, reject)=>{
    const timeout = setTimeout(()=>{socket.off(name, receive);reject(new Error(`Missing ${name}`));}, 5000);
    function receive(payload){clearTimeout(timeout);resolve(payload);}
    socket.once(name, receive);
  });
}

for(const transport of ["websocket", "polling"]){
  test(`Azuron over real ${transport}: automatic death exit, surviving mobs, manual gates, all 30 waves and one completion`, {timeout:15000}, async t=>{
    const server = http.createServer(), io = new Server(server, {serveClient:false});
    const players = new Map(), profiles = new Map(), timers = [], rewarded = new Set();
    let clock = Date.now();
    const groupManager = createGroupManager({io, players, publicPlayer:player=>({id:player.id}), publicEnemy, emitPlayers(){}});
    // Accelerate game timers without changing the wall clock used by Engine.IO.
    function emitInstance(group, options){
      const instance = group?.instance, deadline = instance?.nextWaveAt;
      if(deadline) instance.nextWaveAt = Date.now() + Math.max(0, deadline - clock);
      try{return groupManager.emitInstance(group, options);}
      finally{if(instance) instance.nextWaveAt = deadline;}
    }
    const profileManager = {
      getProfileForPlayer:player=>structuredClone(profiles.get(player.id)),
      profileKeyForPlayer:player=>`account:${player.accountId}`,
      applyQuestAction:()=>({ok:true,changed:false}),
      saveWorldSession({player,state}){profiles.get(player.id).worldSession=structuredClone(state);},
      updateProfileForPlayer({player, update}){
        const profile = structuredClone(profiles.get(player.id));
        const result = update(profile);
        if(result?.ok === false) return result;
        profiles.set(player.id, profile);
        return {...result, ok:true, profile:structuredClone(profile)};
      }
    };
    const manager = createPortalInstanceManager({io, players, groups:groupManager.groups, profileManager,
      createGroup:groupManager.createGroup, emitInstance,
      resetGroupInstance:groupManager.resetGroupInstance, emitProfileSync(){},
      emitWorldReward({enemy, attackerId, recipientIds}){
        assert.deepEqual(recipientIds, [attackerId]);
        if(enemy.rewardGranted) return;
        assert.equal(recordAzuronEnemyReward(profiles.get(attackerId),enemy),true);
        enemy.rewardGranted = true;rewarded.add(enemy.id);
      },
      now:()=>clock,
      setTimeoutFn(fn, delay){const timer={fn, at:clock+delay};timers.push(timer);return timer;},
      clearTimeoutFn(timer){timer.cancelled=true;}
    });
    const lifecycle=createPlayerLifecycleManager({io,players,groups:groupManager.groups,profileManager,
      presence:{markCombat(){}},setPlayerMap(){},resetGroupInstance:groupManager.resetGroupInstance});
    io.on("connection", socket=>{
      const player = {id:socket.id, name:"Azuron QA", accountId:socket.id,
        account:{id:socket.id, firmId:"astra"}, connected:true, clientMode:"game",
        mapId:"0", state:{mapId:"0", hp:10000, x:0, y:0}};
      players.set(player.id, player);
      const profile = createDefaultProfile();
      Object.assign(profile.player, {level:10, firmId:"astra", firmSelected:true});
      profile.unlockedPortals=["blue"];profiles.set(player.id, profile);
      registerGroupHandlers(socket, {...groupManager, ...manager, io, players,
        guard:event=>Boolean(player.accountId) && ["portal:prepare", "portal:start", "portal:azuron-interact"].includes(event)});
      socket.on("qa:flush", ack=>ack(true));
    });
    await new Promise(resolve=>server.listen(0, "127.0.0.1", resolve));
    const clients = [0,1].map(()=>connect(`http://127.0.0.1:${server.address().port}`, {transports:[transport], reconnection:false}));
    t.after(async()=>{clients.forEach(client=>client.disconnect());await new Promise(resolve=>io.close(resolve));});
    await Promise.all(clients.map(client=>nextEvent(client, "connect")));
    const [owner, observer] = clients;
    let observerPackets=0, completionPackets=0;
    observer.on("coop:enemies", ()=>observerPackets++);
    observer.on("portal:complete", ()=>observerPackets++);
    owner.on("portal:complete", ()=>completionPackets++);
    const state = {portalStartEvents:[], portalCompleteEvents:[]};
    installWorldSocketListeners({socket:owner, multiplayer:state, replaceServerEnemies(){}, emitChange(){}, toast(){}});
    const initial = structuredClone(profiles.get(owner.id));
    const preparedEvent=nextEvent(owner, "portal:prepared");
    owner.emit("portal:prepare", {portalId:"blue"});await preparedEvent;
    const player=players.get(owner.id), prepared=player.preparedPortal;
    assert.ok(prepared);
    player.mapId=prepared.mapId;Object.assign(player.state, {mapId:prepared.mapId, x:prepared.x, y:prepared.y});
    const startEvent=nextEvent(owner, "portal:started"), firstSnapshot=nextEvent(owner, "coop:enemies");
    owner.emit("portal:start", {portalId:"blue"});
    const started=await startEvent;await firstSnapshot;
    assert.equal(started.waveTotal, 30);assert.equal(started.wave, 1);
    let group=getPlayerInstanceGroup(player, groupManager.groups), instance=group.instance;
    assert.equal(instance.privateOwner, true);
    player.mapId="portal-blue";Object.assign(player.state, {mapId:"portal-blue", x:300, y:-200});

    function advance(ms){
      const until=clock+ms;
      for(;;){
        const timer=timers.filter(entry=>!entry.fired && !entry.cancelled && entry.at<=until).sort((a,b)=>a.at-b.at)[0];
        if(!timer) break;
        clock=timer.at;timer.fired=true;timer.fn();
      }
      clock=until;
    }
    async function snapshot(){
      const event=nextEvent(owner, "coop:enemies");emitInstance(group);
      const payload=await event;
      assert.equal(payload.waveTotal, 30);assert.equal(state.portalInstance.wave, instance.wave);
      return payload;
    }
    advance(30_000);
    const killed=instance.enemies.filter(enemy=>enemy.azuronWave<3 || enemy.azuronIndex<=4);
    assert.equal(killed.length,24);
    for(const enemy of killed){enemy.hp=0;manager.handlePortalEnemyDeath(group,enemy,owner.id);}
    const runId=profiles.get(owner.id).azuronProgress.runId,attemptId=profiles.get(owner.id).portalAttempt.id;
    const death=nextEvent(owner,"player:death"),respawn=nextEvent(owner,"player:respawned"),reset=nextEvent(owner,"group:instance-reset");
    player.state.hp=0;assert.equal(lifecycle.markPlayerDead(player),true);
    assert.deepEqual((await death).choices,[]);
    const returned=await respawn;await reset;
    assert.equal(returned.portalAbandoned,true);assert.equal(returned.session.mapId,"0");
    assert.ok(returned.session.hp>0);assert.equal(player.deathState,null);
    assert.equal(state.portalInstance,null);assert.equal(state.portalObjective,null);assert.equal(state.coopInstanceId,null);
    const resumeGate=player.preparedPortal;
    Object.assign(player.state,{mapId:resumeGate.mapId,x:resumeGate.x,y:resumeGate.y});player.mapId=resumeGate.mapId;
    const resumed=nextEvent(owner,"portal:started");owner.emit("portal:start",{portalId:"blue"});
    assert.equal((await resumed).wave,1);
    group=getPlayerInstanceGroup(player,groupManager.groups);instance=group.instance;
    assert.equal(instance.enemies.length,0);assert.equal(instance.playerLives[owner.id],2);
    assert.equal(instance.azuronRunId,runId);assert.equal(profiles.get(owner.id).portalAttempt.id,attemptId);
    player.mapId="portal-blue";Object.assign(player.state,{mapId:"portal-blue",x:300,y:-200});
    for(let batch=0;batch<6;batch++){
      for(let offset=1;offset<5;offset++){
        const incoming=nextEvent(owner, "coop:enemies");advance(15_000);const packet=await incoming;
        assert.equal(packet.wave, batch*5+offset+1);
        const newest=instance.enemies.filter(enemy=>enemy.id.startsWith(`AZ-${packet.wave}-`));
        assert.ok(newest.every(enemy=>Math.abs(Math.hypot(enemy.x,enemy.y)-2000)<.001));
        if(batch===0 && offset===1) assert.equal(newest.length,0,"wave two remains timed even when empty");
        if(batch===0 && offset===2) assert.deepEqual(newest.map(enemy=>enemy.azuronIndex),[5,6,7,8,9,10]);
      }
      const packet=await snapshot();assert.equal(packet.waveState, "clear_batch");
      assert.equal(packet.enemies.length, batch===0 ? 26 : batch<4 ? 50 : 25);
      const dead=[...instance.enemies];
      const completed=batch===5 ? nextEvent(owner, "portal:complete") : null;
      for(const enemy of dead){enemy.hp=0;manager.handlePortalEnemyDeath(group, enemy, owner.id);}
      manager.handlePortalEnemyDeath(group, dead.at(-1), owner.id);
      if(completed){
        const result=await completed;
        assert.equal(result.rewardAppliedByServer,true);assert.equal(result.firstClear,true);
        assert.equal(result.rewardItemId,"laser_mk4");assert.equal(instance.completed,true);
      }else{
        const pause=await snapshot();
        assert.equal(pause.waveState,"batch_ready");assert.equal(pause.nextWaveDelayMs,0);
        assert.deepEqual(state.portalObjective.gates.map(gate=>gate.action),["continue","exit"]);
        advance(300_000);assert.equal(instance.wave,batch*5+5);
        if(batch===0){
          Object.assign(player.state,{x:360,y:0});
          const paused=nextEvent(owner,"portal:paused");
          const transfer=nextEvent(owner,"portal:azuron-transfer");
          owner.emit("portal:azuron-interact",{action:"exit"});
          assert.equal((await transfer).durationMs,4000);
          assert.equal(player.mapId,"portal-blue");advance(3999);assert.equal(player.mapId,"portal-blue");advance(1);
          const returned=await paused;
          assert.equal(returned.nextWave,6);assert.equal(state.portalInstance,null);
          assert.equal(profiles.get(owner.id).azuronProgress.phase,"parked");
          const gate=player.preparedPortal;
          Object.assign(player.state,{mapId:gate.mapId,x:gate.x,y:gate.y});player.mapId=gate.mapId;
          const resumed=nextEvent(owner,"portal:started");
          owner.emit("portal:start",{portalId:"blue"});
          assert.equal((await resumed).wave,6);
          group=getPlayerInstanceGroup(player,groupManager.groups);instance=group.instance;
          player.mapId="portal-blue";Object.assign(player.state,{mapId:"portal-blue",x:300,y:-200});
        }else{
          Object.assign(player.state,{x:-360,y:0});
          const incoming=nextEvent(owner,"coop:enemies");
          owner.emit("portal:azuron-interact",{action:"continue"});await incoming;
          assert.equal(instance.wave,batch*5+6);
        }
      }
    }
    manager.emitPortalComplete(group);advance(60_000);
    await owner.timeout(3000).emitWithAck("qa:flush");await observer.timeout(3000).emitWithAck("qa:flush");
    assert.equal(completionPackets,1);assert.equal(observerPackets,0);assert.equal(rewarded.size,250);
    const final=profiles.get(owner.id);
    assert.equal(final.completedPortals.blue,1);
    assert.equal(final.player.premium,initial.player.premium+10_000);
    assert.equal(final.ammoInventory.ammo_x4,Number(initial.ammoInventory.ammo_x4 || 0)+10_000);
    assert.equal(getInventoryItemCount(final,"laser_mk4"),getInventoryItemCount(initial,"laser_mk4")+1);
    assert.deepEqual(profiles.get(observer.id).completedPortals,initial.completedPortals);
  });
}
