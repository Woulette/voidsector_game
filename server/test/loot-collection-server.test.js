import assert from "node:assert/strict";
import test from "node:test";
import { createLootCollectionManager } from "../src/world/lootCollection.js";
import { createWorldLootManager } from "../src/world/loot.js";
import { getLootCollectionHoverPoint } from "../../src/shared/lootCollection.js";

function fixture(kind = "material"){
  let clock = Date.now();
  const initial = clock;
  const drop = {id:"loot-one", kind, ownerId:"p1", mapId:"0", x:100, y:200, expiresAt:clock + 60000};
  const drops = new Map([[drop.id, drop]]), events = [], rewards = [];
  const player = {id:"p1", mapId:"0", connected:true, clientMode:"game", state:{mapId:"0", hp:100, ...getLootCollectionHoverPoint(drop)}};
  const players = new Map([[player.id, player]]);
  const socket = {id:player.id, connected:true, emit:(event, payload)=>events.push({event, payload})};
  const manager = createLootCollectionManager({players, getDrop:id=>drops.get(id), now:()=>clock,
    complete:(s, p, item)=>{ drops.delete(item.id); rewards.push({socket:s.id, player:p.id, drop:item.id}); }});
  return {manager, player, players, socket, drop, drops, events, rewards,
    at:offset=>clock = initial + offset,
    send:(phase, id = drop.id)=>manager.handle(socket, phase === undefined ? {id} : {id, phase})};
}

test("legacy pickup starts a channel and an early finish cannot award before the server's 700 ms", ()=>{
  const f = fixture();
  f.send();
  assert.deepEqual(f.events[0].payload, {id:f.drop.id, status:"started", durationMs:700,
    startedAt:f.drop.expiresAt - 60000, endsAt:f.drop.expiresAt - 59300});
  assert.equal(f.rewards.length, 0);
  f.send("finish");
  f.manager.tick(f.at(699));
  assert.equal(f.rewards.length, 0);
  f.manager.tick(f.at(700));
  assert.equal(f.rewards.length, 1);
  f.send("finish");f.send("start");f.manager.tick(f.at(1400));
  assert.equal(f.rewards.length, 1);
  assert.equal(f.events.at(-1).payload.id, f.drop.id);
});

test("a started channel waits for an explicit finish even after 700 ms, and start retries keep the deadline", ()=>{
  const f = fixture();f.send("start");
  f.at(300);f.send("start");
  assert.equal(f.events[0].payload.endsAt, f.events[1].payload.endsAt);
  f.manager.tick(f.at(900));assert.equal(f.rewards.length, 0);
  f.send("finish");assert.equal(f.rewards.length, 1);
});

test("cancel plus return cannot finish the old channel; restarting requires another full 700 ms", ()=>{
  const f = fixture();f.send("start");f.at(350);f.send("cancel");
  f.at(900);f.send("finish");f.manager.tick();assert.equal(f.rewards.length, 0);
  assert.equal(f.drops.has(f.drop.id), true);
  f.send("start");f.send("finish");f.manager.tick(f.at(1599));assert.equal(f.rewards.length, 0);
  f.manager.tick(f.at(1600));assert.equal(f.rewards.length, 1);
});

test("a stale cancellation for another loot ID cannot interrupt the current collection", ()=>{
  const f = fixture();f.send("start");f.send("cancel", "older-loot");f.send("finish");
  f.manager.tick(f.at(700));assert.equal(f.rewards.length, 1);
  assert.equal(f.events.some(event=>event.payload.status === "cancelled"), false);
});

test("selecting another item replaces the old channel and stale finish cannot reward either one early", ()=>{
  const f = fixture();const second = {...f.drop,id:"loot-two"};f.drops.set(second.id,second);
  f.send("start");f.at(100);f.send("start",second.id);
  assert.equal(f.events[1].payload.status,"cancelled");assert.equal(f.events[1].payload.id,f.drop.id);
  f.send("finish",f.drop.id);f.send("cancel",f.drop.id);f.send("finish",second.id);
  f.manager.tick(f.at(799));assert.equal(f.rewards.length,0);
  f.manager.tick(f.at(800));assert.deepEqual(f.rewards.map(entry=>entry.drop),[second.id]);
  assert.equal(f.drops.has(f.drop.id),true);
});

test("a new attempt on the same item ignores the previous attempt's late finish and cancel", ()=>{
  const f = fixture();
  const send = (phase, attemptId)=>f.manager.handle(f.socket,{id:f.drop.id,phase,attemptId});
  send("start","old-attempt");f.at(250);send("start","new-attempt");
  assert.equal(f.events[1].payload.status,"cancelled");assert.equal(f.events[1].payload.attemptId,"old-attempt");
  assert.equal(f.events[2].payload.status,"started");assert.equal(f.events[2].payload.attemptId,"new-attempt");
  const endsAt = f.events[2].payload.endsAt;
  f.at(400);send("start","new-attempt");assert.equal(f.events.at(-1).payload.endsAt,endsAt);
  send("cancel","old-attempt");send("finish","old-attempt");send("finish",undefined);
  f.manager.tick(f.at(950));assert.equal(f.rewards.length,0,"a correlated start requires the matching finish");
  send("finish","new-attempt");assert.equal(f.rewards.length,1);
});

for(const [label, invalidate, expected] of [
  ["movement beyond the initial anchor", f=>f.player.state.x += 19, "movement"],
  ["another map", f=>f.player.mapId = "1", "map"],
  ["a stale state from another map", f=>f.player.state.mapId = "1", "map"],
  ["death", f=>f.player.state.hp = 0, "dead"],
  ["disconnect", f=>f.player.connected = false, "disconnected"],
  ["a removed player", f=>f.players.delete(f.player.id), "missing"],
  ["drop expiration", f=>f.drop.expiresAt = f.at(400), "expired"],
  ["another move target", f=>f.player.state.moveTarget = {x:900, y:900}, "movement"],
  ["replacement of the same loot ID", f=>f.drops.set(f.drop.id, {...f.drop}), "replaced"]
]){
  test(`world tick cancels collection on ${label} without deleting the ground item`, ()=>{
    const f = fixture();f.send("start");f.send("finish");invalidate(f);f.manager.tick(f.at(500));
    assert.equal(f.rewards.length, 0);
    assert.equal(f.events.at(-1).payload.status, "cancelled");
    assert.equal(f.events.at(-1).payload.reason, expected);
    assert.equal(f.drops.has(f.drop.id), true);
    f.manager.tick(f.at(900));assert.equal(f.rewards.length, 0);
  });
}

test("observed movement cancels permanently even after the pilot returns to the original point", ()=>{
  const f = fixture();f.send("start");
  const x = f.player.state.x;f.player.state.x += 19;f.manager.tick(f.at(100));
  f.player.state.x = x;f.at(700);f.send("finish");f.manager.tick();
  assert.equal(f.rewards.length, 0);
});

test("the last approach target at the hover point does not falsely cancel a stationary pilot", ()=>{
  const f = fixture();f.player.state.moveTarget = getLootCollectionHoverPoint(f.drop);
  f.send("start");f.send("finish");f.manager.tick(f.at(700));assert.equal(f.rewards.length, 1);
});

test("server collection uses the shared hover point clamped inside a map border", ()=>{
  const map = {width:10000,height:8000}, at = Date.now();
  const drop = {id:"edge-loot",ownerId:"p1",mapId:"0",x:100,y:-3990,expiresAt:at+60000};
  const player = {id:"p1",mapId:"0",state:{hp:100,mapId:"0",...getLootCollectionHoverPoint(drop,map)}};
  let completed = 0;
  const manager = createLootCollectionManager({players:new Map([[player.id,player]]),getDrop:()=>drop,
    getMap:()=>map,now:()=>at,complete:()=>completed++});
  const socket = {id:player.id,emit(){}};
  manager.handle(socket,{id:drop.id,phase:"start"});manager.handle(socket,{id:drop.id,phase:"finish"});
  manager.tick(at+700);assert.equal(completed,1);
});

test("unfinished channels time out after four seconds and do not award later", ()=>{
  const f = fixture();f.send("start");f.manager.tick(f.at(4000));
  assert.equal(f.events.at(-1).payload.reason, "timeout");
  f.send("finish");assert.equal(f.rewards.length, 0);
});

for(const kind of ["material", "item", "questItem", "portalPiece", "ammo"]){
  test(`${kind} private loot verifies ownership, hover proximity and alive state before starting`, ()=>{
    for(const mutate of [
      f=>f.drop.ownerId = "someone-else", f=>f.player.state.x += 57,
      f=>f.player.state.hp = 0, f=>f.player.state = null,
      f=>f.player.clientMode = "hangar", f=>f.socket.connected = false
    ]){
      const f = fixture(kind);mutate(f);f.send("start");f.at(700);f.send("finish");f.manager.tick();
      assert.equal(f.rewards.length, 0);
      assert.equal(f.events[0].event, "loot:error");assert.equal(f.events[0].payload.id, f.drop.id);
    }
  });
}

test("forged finish and malformed phases cannot start a reward channel", ()=>{
  const f = fixture();f.send("finish");f.send("instant");f.manager.tick(f.at(1000));
  assert.equal(f.rewards.length, 0);assert.equal(f.events.length, 2);
  assert.ok(f.events.every(event=>event.event === "loot:error" && event.payload.id === f.drop.id));
});

test("the world reward path preserves material, key and portal-piece results behind the collection deadline", ()=>{
  const previousRandom = Math.random;Math.random = ()=>0;
  try{
    for(const kind of ["material", "item", "portalPiece"]){
      let clock = Date.now();
      const events = [], socketEvents = [], profile = {cargoHold:{}, portalPieces:{}, inventoryItems:[], nextInventoryUid:1};
      const player = {id:"p1", mapId:"0", connected:true, clientMode:"game", state:{mapId:"0", hp:100, x:100, y:152}};
      let mutations = 0;
      const manager = createWorldLootManager({players:new Map([[player.id, player]]), now:()=>clock,
        io:{to:id=>({emit:(event, payload)=>events.push({id,event,payload})})},
        profileManager:{updateProfileForPlayer:({update})=>{ mutations++;return {...update(profile),profile}; }}});
      const emit = kind === "item" ? manager.emitPrivatePortalAnchorKeyDrop : kind === "portalPiece" ? manager.emitPrivatePortalPieceDrop : manager.emitPrivateResourceDrops;
      emit({ownerId:"p1", mapId:"0", enemy:{x:100, y:200, level:1}});
      const drop = events.find(event=>event.event === "loot:drop")?.payload;assert.ok(drop);
      Object.assign(player.state, getLootCollectionHoverPoint(drop));
      const socket = {id:player.id, emit:(event,payload)=>socketEvents.push({event,payload})};
      const attemptId = `attempt-${kind}`;
      manager.pickupLoot(socket,{id:drop.id,phase:"start",attemptId});manager.pickupLoot(socket,{id:drop.id,phase:"finish",attemptId});
      assert.equal(mutations,0);clock += 699;manager.cleanupExpiredLootDrops(clock);assert.equal(mutations,0);
      clock++;manager.cleanupExpiredLootDrops(clock);assert.equal(mutations,1);
      assert.equal(socketEvents.filter(event=>event.event === "loot:picked").length,1);
      assert.equal(socketEvents.find(event=>event.event === "loot:picked").payload.attemptId,attemptId);
      manager.pickupLoot(socket,{id:drop.id,phase:"finish"});assert.equal(mutations,1);
      if(kind === "material")assert.equal(profile.cargoHold[drop.materialId],1);
      if(kind === "item")assert.equal(profile.inventoryItems[0].itemId,"portal_anchor_key");
      if(kind === "portalPiece")assert.equal(profile.portalPieces[drop.portalId],1);
    }
  }finally{Math.random = previousRandom;}
});

test("a rejected profile mutation restores the item and requires a new full channel before retrying", ()=>{
  const random = Math.random;Math.random = ()=>0;
  try{
    let clock = Date.now(), rejected = true, successful = 0;
    const events = [], profile = {inventoryItems:[],nextInventoryUid:1};
    const player = {id:"p1",mapId:"0",connected:true,clientMode:"game",state:{mapId:"0",hp:100,x:0,y:0}};
    const manager = createWorldLootManager({players:new Map([[player.id,player]]),now:()=>clock,
      io:{to:id=>({emit:(event,payload)=>events.push({id,event,payload})})},
      profileManager:{updateProfileForPlayer:({update})=>{
        if(rejected)return {ok:false,reason:"profile unavailable"};
        successful++;return {...update(profile),profile};
      }}});
    manager.emitPrivatePortalAnchorKeyDrop({ownerId:player.id,mapId:"0",enemy:{x:100,y:200}});
    const drop = events.find(entry=>entry.event === "loot:drop").payload;
    Object.assign(player.state,getLootCollectionHoverPoint(drop));
    const socket = {id:player.id,emit:(event,payload)=>events.push({id:player.id,event,payload})};
    const command = phase=>manager.pickupLoot(socket,{id:drop.id,phase});
    command("start");command("finish");clock+=700;manager.cleanupExpiredLootDrops(clock);
    assert.equal(events.at(-1).event,"loot:error");assert.equal(events.at(-1).payload.id,drop.id);
    assert.equal(profile.inventoryItems.length,0);rejected = false;
    command("finish");assert.equal(successful,0);
    command("start");command("finish");clock+=699;manager.cleanupExpiredLootDrops(clock);assert.equal(successful,0);
    clock++;manager.cleanupExpiredLootDrops(clock);assert.equal(successful,1);assert.equal(profile.inventoryItems[0].itemId,"portal_anchor_key");
    command("finish");assert.equal(successful,1);
  }finally{Math.random = random;}
});
