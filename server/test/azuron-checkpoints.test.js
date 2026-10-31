import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileManager } from "../src/players/profiles.js";
import { sanitizeProfile,preserveProtectedOwnership } from "../src/players/profileSanitize.js";
import { createPortalInstanceManager } from "../src/portals/instances.js";
import { getPlayerInstanceGroup } from "../src/portals/portalSessions.js";
import { createGroupManager } from "../src/groups/groups.js";
import { createWorldRewardManager } from "../src/world/rewards.js";
import { createPlayerLifecycleManager } from "../src/players/playerLifecycle.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { unlockServerPortal } from "../src/players/progressionActions.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { AZURON_PORTAL_MAP,AZURON_SPAWN_RADIUS,AZURON_WAVE_INTERVAL_MS,getAzuronSpawnPositions } from "../../src/data/azuronPortal.js";

const clone=value=>structuredClone(value);

async function fixture(saved = null,portalId = "blue",bonusRandom = Math.random){
  const profile=saved || createDefaultProfile();
  if(!saved){Object.assign(profile.player,{level:portalId === "blue" ? 10 : portalId === "violet" ? 15 : 20,firmId:"astra",firmSelected:true});profile.unlockedPortals=[portalId];}
  const storage=new Map([["account:pilot",clone(profile)]]);
  const failure={enabled:false},events=[],timers=[];let now=Date.now();
  const profiles=createProfileManager({cleanName:value=>String(value || "Pilot"),logger:{warn(){}},
    loadProfileEntries:async()=>[...storage.entries()].map(([key,value])=>[key,sanitizeProfile(value)]),
    persistProfileEntries:async entries=>{
      if(failure.enabled) throw new Error("Injected persistence failure");
      for(const [key,value] of entries) storage.set(key,clone(value));
    },reservePilotIdentity:async()=>({ok:true})});
  await profiles.load();
  const player={id:"pilot-socket",accountId:"pilot",account:{id:"pilot",firmId:"astra"},name:"Pilot",connected:true,
    clientMode:"game",mapId:"0",state:{mapId:"0",shipId:"orion",x:0,y:0,hp:10000,maxHp:10000,shield:300,maxShield:300}};
  const players=new Map([[player.id,player]]),socket={id:player.id,emit:(event,payload)=>events.push({event,payload})};
  const io={sockets:{sockets:new Map([[socket.id,socket]])},to:target=>({emit:(event,payload)=>events.push({target,event,payload})})};
  const groups=createGroupManager({io,players,publicPlayer:value=>({id:value.id}),publicEnemy:value=>({...value}),emitPlayers(){}});
  const rewards=createWorldRewardManager({io,players,groups:groups.groups,profileManager:profiles,emitProfileSync(){}});
  const manager=createPortalInstanceManager({io,players,groups:groups.groups,profileManager:profiles,
    createGroup:groups.createGroup,emitInstance:groups.emitInstance,resetGroupInstance:groups.resetGroupInstance,
    random:bonusRandom,emitWorldReward:rewards.emitWorldReward,emitProfileSync(){},setPlayerMap(){},now:()=>now,
    setTimeoutFn(fn,delay){const timer={fn,at:now+delay};timers.push(timer);return timer;},
    clearTimeoutFn(timer){timer.cancelled=true;}});
  const life=createPlayerLifecycleManager({io,players,groups:groups.groups,profileManager:profiles,
    emitProfileSync(){},presence:{markCombat(){}},setPlayerMap(){},resetGroupInstance:groups.resetGroupInstance,logger:{warn(){}}});
  function advance(ms){
    const until=now+ms;
    for(;;){
      const timer=timers.filter(item=>!item.fired && !item.cancelled && item.at<=until).sort((a,b)=>a.at-b.at)[0];
      if(!timer) break;now=timer.at;timer.fired=true;timer.fn();
    }
    now=until;
  }
  const f={profiles,storage,failure,player,socket,events,players,manager,life,advance,groups:groups.groups,
    get group(){return getPlayerInstanceGroup(player,groups.groups);},
    get profile(){return profiles.getProfileForPlayer(player);},
    async enter(){
      if(!player.preparedPortal) await manager.preparePortalInstance(socket,portalId);
      assert.ok(player.preparedPortal);
      const gate=player.preparedPortal;
      player.mapId=String(gate.mapId);Object.assign(player.state,{mapId:player.mapId,x:gate.x,y:gate.y,hp:10000});
      await manager.startPortalInstance(socket,portalId);
      if(f.group?.instance){player.mapId=`portal-${portalId}`;Object.assign(player.state,{mapId:`portal-${portalId}`,x:0,y:0});}
      return f.group?.instance;
    },
    kill(enemy){enemy.hp=0;enemy.shield=0;manager.handlePortalEnemyDeath(f.group,enemy,player.id);},
    async clearBatch(){
      advance(60_000);
      for(const enemy of [...f.group.instance.enemies].filter(item=>item.hp>0)) f.kill(enemy);
      await f.group.instance.azuronCheckpointSave;
      await profiles.flushPersistence();
    },
    async gate(action){
      Object.assign(player.state,{x:action==="continue" ? -360 : 360,y:0});
      const interaction=manager.interactAzuronPortal(socket,action);
      if(action==="exit"){
        for(let i=0;i<20;i++) await Promise.resolve();
        advance(4000);
      }
      return interaction;
    }};
  return f;
}

test("Azuron is enlarged and all waves spawn exactly 2000 from the fixed centre at fifteen-second intervals",()=>{
  assert.deepEqual([AZURON_PORTAL_MAP.width,AZURON_PORTAL_MAP.height],[7800,5400]);
  assert.equal(AZURON_SPAWN_RADIUS,2000);assert.equal(AZURON_WAVE_INTERVAL_MS,15000);
  for(let wave=1;wave<=30;wave++){
    const points=getAzuronSpawnPositions(wave,{x:3500,y:2200});
    assert.deepEqual(points,getAzuronSpawnPositions(wave,{x:-3500,y:-2200}));
    assert.equal(points.length,wave<=20 ? 10 : 5);
    for(const point of points){assert.ok(Math.abs(Math.hypot(point.x,point.y)-2000)<.0001);assert.ok(Math.abs(point.y)<2700);}
    assert.equal(new Set(points.map(point=>`${point.x}:${point.y}`)).size,points.length);
  }
});

test("the last survivor opens two central gates and no elapsed time can start the next batch",async()=>{
  const f=await fixture();await f.enter();const instance=f.group.instance;
  f.advance(14_999);assert.equal(instance.wave,1);f.advance(1);assert.equal(instance.wave,2);
  f.advance(45_000);assert.equal(instance.wave,5);assert.equal(instance.enemies.filter(enemy=>enemy.hp>0).length,50);
  for(const enemy of instance.enemies.slice(1)) f.kill(enemy);
  assert.equal(instance.waveState,"clear_batch");assert.deepEqual(instance.objective.gates,[]);
  f.kill(instance.enemies[0]);await instance.azuronCheckpointSave;
  assert.equal(instance.waveState,"batch_ready");assert.equal(instance.nextWaveAt,0);
  assert.deepEqual(instance.objective.gates.map(gate=>[gate.action,gate.x,gate.y]),[["continue",-360,0],["exit",360,0]]);
  f.advance(300_000);assert.equal(instance.wave,5);
  assert.equal(await f.manager.interactAzuronPortal(f.socket,"continue"),false);
  Object.assign(f.player.state,{x:-360,y:0});
  const results=await Promise.all([f.manager.interactAzuronPortal(f.socket,"continue"),f.manager.interactAzuronPortal(f.socket,"continue")]);
  assert.deepEqual(results,[true,false]);assert.equal(instance.wave,6);assert.equal(instance.enemies.length,10);
  assert.deepEqual(instance.objective.gates,[]);assert.equal(f.profile.azuronProgress.nextWave,6);
  await f.profiles.flushPersistence();
});

test("exit parks the run without healing, and a fresh server resumes the saved batch and lives",async()=>{
  const f=await fixture();await f.enter();await f.clearBatch();
  f.group.instance.playerLives[f.player.id]=2;
  f.player.state.hp=7654;f.player.state.shield=123;
  const credits=f.profile.player.credits;
  assert.equal(await f.gate("exit"),true);
  assert.equal(f.group,null);assert.equal(f.player.mapId,"0");
  assert.equal(f.player.state.hp,7654);assert.equal(f.player.state.shield,123);
  assert.equal(f.profile.azuronProgress.phase,"parked");assert.equal(f.profile.azuronProgress.nextWave,6);
  assert.equal(f.profile.azuronProgress.lives,2);assert.equal(f.profile.preparedPortal.portalId,"blue");
  await f.profiles.flushPersistence();
  const resumed=await fixture(clone(f.storage.get("account:pilot")));
  await resumed.enter();
  assert.equal(resumed.group.instance.wave,6);assert.equal(resumed.group.instance.playerLives[resumed.player.id],2);
  assert.equal(resumed.group.instance.enemies.length,10);assert.equal(resumed.profile.player.credits,credits);
  assert.ok(!resumed.events.some(event=>event.event==="portal:complete"));
  await resumed.profiles.flushPersistence();
});

test("reward receipts survive restart and previously killed mobs cannot grant currency or XP twice",async()=>{
  const f=await fixture();await f.enter();await f.clearBatch();await f.gate("continue");
  const killed=f.group.instance.enemies.slice(0,3).map(enemy=>{f.kill(enemy);return clone(enemy);});
  const before=clone(f.profile.player);assert.equal(f.profile.azuronProgress.defeated.length,3);
  await f.profiles.flushPersistence();
  const resumed=await fixture(clone(f.storage.get("account:pilot")));await resumed.enter();
  assert.equal(resumed.group.instance.wave,6);assert.equal(resumed.group.instance.enemies.length,7);
  assert.ok(resumed.group.instance.enemies.every(enemy=>!killed.some(old=>old.azuronIndex===enemy.azuronIndex)));
  const duplicate={...killed[0],rewardGranted:false,noReward:false,hp:0};
  resumed.manager.handlePortalEnemyDeath(resumed.group,duplicate,resumed.player.id);
  assert.equal(duplicate.noReward,true);
  assert.deepEqual([resumed.profile.player.credits,resumed.profile.player.xp,resumed.profile.player.premium],
    [before.credits,before.xp,before.premium]);
  await resumed.profiles.flushPersistence();
});

test("manual gates span all thirty waves, final rewards are unique and the next run starts fresh",async()=>{
  const f=await fixture();await f.enter();const firstRun=f.profile.azuronProgress.runId;
  const initial=clone(f.profile);let killed=0;
  for(let batch=0;batch<6;batch++){
    f.advance(60_000);
    for(const enemy of [...f.group.instance.enemies].filter(item=>item.hp>0)){f.kill(enemy);killed++;}
    await f.group.instance.azuronCheckpointSave;
    if(batch<5) assert.equal(await f.gate("continue"),true);
  }
  const instance=f.group.instance;
  assert.equal(killed,250);assert.equal(instance.completed,true);assert.equal(f.profile.azuronProgress,null);
  assert.deepEqual(instance.objective.gates.map(gate=>gate.action),["exit"]);
  assert.equal(f.profile.completedPortals.blue,1);
  assert.equal(getInventoryItemCount(f.profile,"laser_mk4"),getInventoryItemCount(initial,"laser_mk4")+1);
  assert.equal(f.events.filter(event=>event.event==="portal:complete").length,1);
  f.manager.emitPortalComplete(f.group);assert.equal(f.profile.completedPortals.blue,1);
  assert.equal(await f.gate("exit"),true);
  assert.equal(f.profile.preparedPortal,null);assert.equal(f.profile.portalAttempt,null);
  assert.equal(f.profile.unlockedPortals.includes("blue"),false);
  await f.profiles.updateProfileForPlayer({player:f.player,update:profile=>{profile.unlockedPortals.push("blue");return {ok:true};}}).save;
  await f.enter();
  assert.equal(f.group.instance.wave,1);assert.notEqual(f.profile.azuronProgress.runId,firstRun);
  await f.profiles.flushPersistence();
});

test("a failed checkpoint write keeps the pilot inside and permits a safe retry",async()=>{
  const f=await fixture();await f.enter();await f.clearBatch();f.failure.enabled=true;
  assert.equal(await f.gate("exit"),false);
  assert.equal(f.player.mapId,"portal-blue");assert.equal(f.group.instance.waveState,"batch_ready");
  assert.equal(f.events.filter(event=>event.event==="portal:paused").length,0);
  f.failure.enabled=false;assert.equal(await f.gate("exit"),true);await f.profiles.flushPersistence();
});

test("Azuron death ejects automatically without a revival choice and preserves the protected paid attempt",async()=>{
  const f=await fixture();await f.enter();
  f.player.state.hp=0;assert.equal(f.life.markPlayerDead(f.player),true);
  assert.equal(f.profile.azuronProgress.lives,2);
  const existing=clone(f.profile),incoming=sanitizeProfile({...existing,azuronProgress:{...existing.azuronProgress,lives:3,nextWave:26,defeated:[]}});
  preserveProtectedOwnership(existing,incoming);assert.deepEqual(incoming.azuronProgress,existing.azuronProgress);
  assert.deepEqual(f.events.findLast(event=>event.event==="player:death").payload.choices,[]);
  assert.equal(f.player.deathState,null);assert.equal(f.group,null);
  assert.equal(f.events.findLast(event=>event.event==="player:respawned").payload.portalAbandoned,true);
  assert.equal(f.life.markPlayerDead(f.player),false,"the same death cannot consume another life");
  assert.equal(f.profile.azuronProgress.lives,2);assert.equal(f.profile.portalAttempt.lives,2);
  assert.equal(f.profile.portalAttempt.phase,"parked");assert.equal(f.player.mapId,"0");
  assert.equal(f.profile.azuronProgress.phase,"parked");
  await f.profiles.flushPersistence();
});

for(const {batchStart,deathWave} of [{batchStart:1,deathWave:3},{batchStart:6,deathWave:7},{batchStart:16,deathWave:16}]){
  test(`death at wave ${deathWave} restarts batch ${batchStart} with empty-wave timers and only surviving enemies`,async()=>{
    const f=await fixture();await f.enter();
    for(let start=1;start<batchStart;start+=5){await f.clearBatch();await f.gate("continue");}
    const attemptId=f.profile.portalAttempt.id,runId=f.profile.azuronProgress.runId;
    for(let wave=batchStart;wave<deathWave;wave++){
      for(const enemy of f.group.instance.enemies.filter(item=>item.hp>0)) f.kill(enemy);
      f.advance(15_000);
    }
    const killed=f.group.instance.enemies.filter(enemy=>enemy.hp>0).slice(0,4);
    for(const enemy of killed) f.kill(enemy);
    const earned=clone(f.profile.player),oldGroup=f.group,oldInstance=f.group.instance;
    f.player.state.hp=0;f.life.markPlayerDead(f.player);
    assert.equal(f.player.mapId,"0");assert.equal(f.player.deathState,null);
    assert.equal(oldGroup.instance,null);assert.equal(f.profile.portalAttempt.id,attemptId);
    assert.equal(f.profile.azuronProgress.nextWave,batchStart);
    assert.equal(f.profile.azuronProgress.lives,2);
    await f.profiles.flushPersistence();
    // A new manager proves this is a persisted checkpoint, not the old instance kept alive.
    const resumed=await fixture(clone(f.storage.get("account:pilot")));await resumed.enter();
    const instance=resumed.group.instance;
    assert.equal(resumed.profile.portalAttempt.id,attemptId);assert.equal(instance.azuronRunId,runId);
    assert.equal(instance.playerLives[resumed.player.id],2);assert.equal(instance.wave,batchStart);
    for(let wave=batchStart;wave<deathWave;wave++){
      assert.equal(instance.wave,wave);assert.equal(instance.enemies.length,0);
      assert.equal(instance.waveState,"wave_countdown");assert.equal(instance.objective.batchReady,false);
      resumed.advance(14_999);assert.equal(instance.wave,wave);assert.equal(instance.enemies.length,0);
      resumed.advance(1);
    }
    assert.equal(instance.wave,deathWave);assert.equal(instance.enemies.length,6);
    assert.deepEqual(instance.enemies.map(enemy=>enemy.azuronIndex),[5,6,7,8,9,10]);
    assert.ok(instance.enemies.every(enemy=>enemy.azuronWave===deathWave));
    assert.deepEqual([resumed.profile.player.credits,resumed.profile.player.totalXp,resumed.profile.player.premium],
      [earned.credits,earned.totalXp,earned.premium],"replaying empty waves gives no rewards");
    // The abandoned timers cannot spawn enemies or reopen the old run after returning.
    f.advance(120_000);assert.equal(oldInstance.enemies.filter(enemy=>enemy.hp>0).length,6);
    assert.equal(oldGroup.instance,null);
    await resumed.profiles.flushPersistence();
  });
}

test("an interrupted batch remembers nonconsecutive kills while preserving survivors from earlier waves",async()=>{
  const f=await fixture();await f.enter();
  for(const enemy of f.group.instance.enemies) f.kill(enemy);
  f.advance(30_000);
  for(const enemy of f.group.instance.enemies.filter(item=>item.azuronWave===3).slice(0,4)) f.kill(enemy);
  f.player.state.hp=0;f.life.markPlayerDead(f.player);await f.enter();
  const instance=f.group.instance;assert.equal(instance.wave,1);assert.equal(instance.enemies.length,0);
  f.advance(15_000);assert.equal(instance.wave,2);assert.equal(instance.enemies.length,10);
  f.advance(15_000);assert.equal(instance.wave,3);assert.equal(instance.enemies.length,16);
  assert.equal(instance.enemies.filter(enemy=>enemy.azuronWave===2).length,10);
  assert.equal(instance.enemies.filter(enemy=>enemy.azuronWave===3).length,6);
  await f.profiles.flushPersistence();
});

test("Azuron final rewards add the exact credits, XP and reputation once and consume the invoked attempt",async()=>{
  const f=await fixture();await f.enter();const initial=clone(f.profile.player);
  f.manager.emitPortalComplete(f.group);await f.profiles.flushPersistence();
  assert.equal(f.profile.player.credits,initial.credits+1_000_000);
  assert.equal(f.profile.player.totalXp,initial.totalXp+500_000);
  assert.equal(f.profile.player.reputation,initial.reputation+50_000);
  assert.equal(f.profile.portalAttempt,null);assert.equal(f.profile.preparedPortal,null);
  const event=f.events.find(entry=>entry.event==="portal:complete").payload;
  assert.equal(event.rewardDisplayDelayMs,7000);assert.equal(event.reward.reputation,50000);
  f.manager.emitPortalComplete(f.group);assert.equal(f.profile.player.credits,initial.credits+1_000_000);
  const attempt=validatePlayerState({player:f.player,profile:f.profile,groups:f.groups,
    payload:{...f.player.state,mapId:"0",x:4300,y:-3300}});
  assert.equal(attempt.state.mapId,"portal-blue","a client snapshot cannot bypass the four-second final exit");
  await f.profiles.updateProfileForPlayer({player:f.player,update:profile=>{profile.unlockedPortals.push("blue");return {ok:true};}}).save;
  await f.manager.preparePortalInstance(f.socket,"blue");
  const nextAttempt=f.profile.portalAttempt.id;
  f.player.state.hp=0;f.life.markPlayerDead(f.player);
  assert.equal(f.profile.portalAttempt.id,nextAttempt);assert.equal(f.profile.portalAttempt.lives,3);
  await f.profiles.flushPersistence();
});

test("the authoritative exit stays inside for four seconds and cancels if the pilot leaves the gate",async()=>{
  const f=await fixture();await f.enter();await f.clearBatch();Object.assign(f.player.state,{x:360,y:0});
  const exit=f.manager.interactAzuronPortal(f.socket,"exit");
  for(let i=0;i<20;i++) await Promise.resolve();
  assert.equal(f.events.find(entry=>entry.event==="portal:azuron-transfer").payload.durationMs,4000);
  f.advance(3999);assert.equal(f.player.mapId,"portal-blue");f.advance(1);assert.equal(await exit,true);
  assert.equal(f.player.mapId,"0");await f.enter();await f.clearBatch();
  Object.assign(f.player.state,{x:360,y:0});const cancelled=f.manager.interactAzuronPortal(f.socket,"exit");
  for(let i=0;i<20;i++) await Promise.resolve();
  f.player.state.x=2000;f.advance(4000);assert.equal(await cancelled,false);
  assert.equal(f.player.mapId,"portal-blue");assert.equal(f.profile.portalAttempt.portalId,"blue");
  await f.profiles.flushPersistence();
});

test("three deaths close the invoked portal and a queued paid attempt can then be invoked once",async()=>{
  const f=await fixture();await f.enter();const first=f.profile.portalAttempt.id;
  await f.profiles.updateProfileForPlayer({player:f.player,update:profile=>{
    profile.portalPieces.blue=15;return unlockServerPortal(profile,{id:"blue"});
  }}).save;
  assert.equal(f.profile.portalPieces.blue,0);assert.equal(f.profile.unlockedPortals.includes("blue"),true);
  for(let death=1;death<=3;death++){
    f.player.state.hp=0;assert.equal(f.life.markPlayerDead(f.player),true);
    assert.equal(f.player.mapId,"0");assert.equal(f.player.deathState,null);assert.equal(f.group,null);
    assert.deepEqual(f.events.findLast(event=>event.event==="player:death").payload.choices,[]);
    if(death<3){assert.equal(f.profile.portalAttempt.lives,3-death);await f.enter();}
  }
  assert.equal(f.profile.portalAttempt,null);assert.equal(f.profile.preparedPortal,null);assert.equal(f.group,null);
  assert.equal(f.profile.unlockedPortals.includes("blue"),true);
  await f.enter();assert.notEqual(f.profile.portalAttempt.id,first);
  assert.equal(f.profile.unlockedPortals.includes("blue"),false);assert.equal(f.profile.portalAttempt.lives,3);
  await f.profiles.flushPersistence();
});

for(const [portalId,multiplier] of [["violet",2],["red",3]]){
  test(`${portalId}: kill receipts, automatic death exit and the next batch survive a real profile reload`,async()=>{
    const f=await fixture(null,portalId,()=>0);await f.enter();
    assert.equal(f.group.instance.enemies[0].hp,800*multiplier);
    const killed=f.group.instance.enemies.slice(0,4).map(enemy=>{f.kill(enemy);return clone(enemy);});
    const beforeDeath=clone(f.profile.player);
    f.player.state.hp=0;f.life.markPlayerDead(f.player);
    assert.equal(f.player.mapId,"0");assert.equal(f.player.deathState,null);
    assert.deepEqual(f.events.findLast(event=>event.event==="player:death").payload.choices,[]);
    assert.equal(f.profile.azuronProgress.portalId,portalId);assert.equal(f.profile.portalAttempt.lives,2);
    await f.profiles.flushPersistence();
    const resumed=await fixture(clone(f.storage.get("account:pilot")),portalId,()=>0);await resumed.enter();
    assert.equal(resumed.group.instance.enemies.length,6);assert.equal(resumed.group.instance.wave,1);
    assert.equal(resumed.group.instance.playerLives[resumed.player.id],2);
    resumed.manager.handlePortalEnemyDeath(resumed.group,{...killed[0],rewardGranted:false,noReward:false},resumed.player.id);
    assert.equal(resumed.profile.player.credits,beforeDeath.credits);
    await resumed.clearBatch();
    assert.equal(resumed.profile.azuronProgress.nextWave,6);
    assert.equal(resumed.group.instance.objective.gates[0].portalId,portalId);
    assert.equal(await resumed.gate("exit"),true);await resumed.profiles.flushPersistence();
    const second=await fixture(clone(resumed.storage.get("account:pilot")),portalId,()=>0);await second.enter();
    assert.equal(second.player.mapId,`portal-${portalId}`);assert.equal(second.group.instance.wave,6);
    assert.equal(second.profile.azuronProgress.portalId,portalId);
    const initial=clone(second.profile.player),ammo=second.profile.ammoInventory.ammo_x4 || 0;
    second.manager.emitPortalComplete(second.group);await second.profiles.flushPersistence();
    assert.equal(second.profile.player.credits,initial.credits+1_000_000*multiplier);
    assert.equal(second.profile.player.totalXp,initial.totalXp+500_000*multiplier);
    assert.equal(second.profile.player.reputation,initial.reputation+50_000*multiplier);
    assert.equal(second.profile.player.premium,initial.premium+10_000*multiplier);
    assert.equal(second.profile.ammoInventory.ammo_x4,ammo+10_000*multiplier);
    assert.equal(second.profile.completedPortals[portalId],1);
    assert.equal(second.profile.azuronProgress,null);assert.equal(second.profile.portalAttempt,null);
    const completion=second.events.find(event=>event.event==="portal:complete").payload;
    assert.equal(completion.rewardDisplayDelayMs,7000);
    assert.equal(completion.rewardItemId,portalId==="violet"?"drone_overdrive_chip":"laser_mk4");
    const credits=second.profile.player.credits;second.manager.emitPortalComplete(second.group);
    assert.equal(second.profile.player.credits,credits);
  });

  test(`${portalId}: the third automatic death closes both the attempt and its checkpoint`,async()=>{
    const f=await fixture(null,portalId);await f.enter();
    for(let death=1;death<=3;death++){
      f.player.state.hp=0;assert.equal(f.life.markPlayerDead(f.player),true);
      assert.equal(f.player.mapId,"0");assert.equal(f.player.deathState,null);
      if(death<3){assert.equal(f.profile.portalAttempt.lives,3-death);await f.enter();}
    }
    assert.equal(f.profile.portalAttempt,null);assert.equal(f.profile.azuronProgress,null);
    assert.equal(f.profile.preparedPortal,null);
    await f.manager.preparePortalInstance(f.socket,portalId);
    assert.equal(f.profile.preparedPortal,null,"a completed paid attempt must not become an infinite free invocation");
    await f.profiles.flushPersistence();
  });
}
