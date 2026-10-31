import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { createCombatServerEventSystem } from "../../src/game/systems/combatServerEvents.js";
import { createCombatHitResolutionSystem } from "../../src/game/systems/combatHitResolution.js";
import { drawDamageTexts } from "../../src/game/render/canvasHud.js";
import { createCombatDamageFeedback } from "../../src/game/systems/combatDamageFeedback.js";
import { createCombatStatusEffectSystem } from "../../src/game/systems/combatStatusEffects.js";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createEnemyHitHandler } from "../src/combat/enemyHits.js";
import { registerCombatHandlers } from "../src/socket/combatHandlers.js";

function fixture(){
  const state = {
    currentMap:{id:"0"},
    player:{x:0, y:0, hp:1000, maxHp:1000},
    enemies:[{id:"target", x:200, y:200, radius:30}],
    damageTexts:[], particles:[], impactEffects:[],
    store:{state:{activeShip:"orion", ammoInventory:{}}}
  };
  const multiplayer = {playerId:"pilot", combatEvents:[], combatShotEvents:[]};
  const resolution = createCombatHitResolutionSystem({getState:()=>state, setState:patch=>Object.assign(state, patch)});
  const events = createCombatServerEventSystem({
    multiplayer, getState:()=>state, setState:patch=>Object.assign(state, patch),
    pushDamageText:resolution.pushDamageText, beams:{add(){}, clear(){}},
    markAuthoritativeDamageReceived(){}, damagePlayer(){}
  });
  function hit({damage=3000, at=1000, travelTimeMs=0, attackerId="pilot", enemyId="target", ...rest} = {}){
    multiplayer.combatEvents.push({accepted:true, mapId:"0", damage, at, travelTimeMs, attackerId, enemyId, ...rest});
    events.applyCombatHitEvents();
  }
  return {state, multiplayer, events, hit};
}

function textContext(){
  const drawn = [];
  return {drawn, save(){}, restore(){},
    strokeText(){},
    fillText(label, x, y){ drawn.push({label, x, y, fill:this.fillStyle, blur:this.shadowBlur}); }
  };
}

test("outgoing laser, rocket and missile damage accumulates across rendering frames by launch time", ()=>{
  const f = fixture();
  f.hit({damage:3000, at:1000, weaponClass:"laser", shotId:"laser"});
  f.hit({damage:2000, at:1660, travelTimeMs:620, weaponClass:"rocket", shotId:"rocket"});
  f.hit({damage:10000, at:2080, travelTimeMs:1000, weaponClass:"missile", shotId:"missile"});
  assert.equal(f.state.damageTexts.length, 1);
  assert.equal(f.state.damageTexts[0].value, 15000);
});

test("shots launched apart remain separate even when their impacts arrive together", ()=>{
  const f = fixture();
  f.hit({damage:2000, at:2000, travelTimeMs:1000, weaponClass:"rocket"});
  f.hit({damage:3000, at:2000, travelTimeMs:0, weaponClass:"laser"});
  assert.deepEqual(f.state.damageTexts.map(text=>text.value), [2000,3000]);
});

test("the burst window has a fixed 160 ms boundary and never chains successive shots", ()=>{
  const f = fixture();
  f.hit({damage:1000, at:1000});
  f.hit({damage:2000, at:1160});
  f.hit({damage:4000, at:1161});
  f.hit({damage:8000, at:1320});
  assert.deepEqual(f.state.damageTexts.map(text=>text.value), [3000,12000]);
});

test("outgoing damage numbers stay red for every weapon and group thousands", ()=>{
  const f = fixture();
  f.hit({damage:15000});
  const ctx = textContext();
  drawDamageTexts({ctx, camera:{x:0,y:0}, damageTexts:f.state.damageTexts});
  assert.equal(ctx.drawn[0].label, "-15 000");
  assert.match(ctx.drawn[0].fill, /^rgba\(255,\s*96,\s*96,/);
  assert.ok(ctx.drawn[0].blur <= 8, "readability should not rely on a strong glow");
});

test("incoming poison and direct damage both display red", ()=>{
  const f = fixture();
  f.multiplayer.playerDamageEvents = [
    {mapId:"0", amount:1200, hp:800, maxHp:1000, at:Date.now()},
    {mapId:"0", amount:250, hp:550, maxHp:1000, damageType:"poison", at:Date.now()}
  ];
  f.events.applyDamageEvents();
  const ctx = textContext();
  drawDamageTexts({ctx, camera:{x:0,y:0}, damageTexts:f.state.damageTexts});
  assert.equal(ctx.drawn.length, 2);
  assert.ok(ctx.drawn.every(text=>/^rgba\(255,\s*9[0-9],\s*9[0-9],/.test(text.fill)));
});

test("duplicate confirmations cannot count damage twice", ()=>{
  const f = fixture();
  f.hit({shotId:"one-shot", damage:1000});
  f.hit({shotId:"one-shot", damage:1000});
  assert.equal(f.state.damageTexts.length, 1);
  assert.equal(f.state.damageTexts[0].value, 1000);
});

test("bursts never combine different targets, attackers or poison ticks", ()=>{
  const f = fixture();
  f.state.enemies.push({id:"second-target",x:400,y:200,radius:30});
  f.hit({damage:1000});
  f.hit({damage:2000,attackerId:"other-pilot"});
  f.hit({damage:4000,enemyId:"second-target"});
  f.hit({damage:8000,damageType:"poison"});
  assert.deepEqual(f.state.damageTexts.map(text=>text.value), [1000,2000,4000,8000]);
});

test("an old map result cannot create damage text in the new map", ()=>{
  const f = fixture();
  f.hit({damage:1000,mapId:"old-map"});
  assert.equal(f.state.damageTexts.length, 0);
});

test("a late old burst impact never absorbs a newer laser salvo", ()=>{
  const f = fixture();
  f.hit({damage:3000,at:1000,shotId:"old-laser"});
  f.hit({damage:4000,at:2000,shotId:"new-laser"});
  f.hit({damage:10000,at:2100,travelTimeMs:1020,shotId:"old-missile"});
  assert.deepEqual(f.state.damageTexts.map(text=>text.value), [13000,4000]);
});

test("authoritative launch metadata overrides impact scheduling delay", ()=>{
  const f = fixture();
  f.multiplayer.combatShotEvents.push(
    {shotId:"s1",enemyId:"target",attackerId:"pilot",mapId:"0",at:1000,travelTimeMs:0},
    {shotId:"s2",enemyId:"target",attackerId:"pilot",mapId:"0",at:1160,travelTimeMs:1000}
  );
  f.events.applyCombatShotEvents();
  f.hit({shotId:"s1",at:1000,damage:3000});
  f.hit({shotId:"s2",at:2300,travelTimeMs:1000,damage:10000});
  assert.equal(f.state.damageTexts.length, 1);
  assert.equal(f.state.damageTexts[0].value, 13000);
});

test("a burst counter remains visible for an in-flight missile and expires if its hit never arrives", ()=>{
  let time = 0;
  const state = {currentMap:{id:"0"},damageTexts:[]};
  const feedback = createCombatDamageFeedback({getState:()=>state,now:()=>time,pushDamageText:text=>{state.damageTexts.push(text);return text;}});
  const base = {enemyId:"target",attackerId:"pilot",mapId:"0"};
  feedback.observeShot({...base,shotId:"laser",at:1000,travelTimeMs:0});
  feedback.observeShot({...base,shotId:"missile",at:1050,travelTimeMs:1600});
  feedback.addHit({...base,shotId:"laser",at:1000,damage:3000},{x:200,y:150});
  for(let frame=0;frame<100;frame++){
    time += 16;
    feedback.update();
    state.damageTexts[0].life -= .016;
    assert.ok(state.damageTexts[0].life > 0);
  }
  time = 2000;
  feedback.update();
  state.damageTexts[0].life -= 1;
  feedback.update();
  assert.ok(state.damageTexts[0].life <= 0, "a canceled projectile cannot pin a counter forever");
});

test("MISS is deferred while another projectile from the burst is still unresolved", ()=>{
  const f = fixture();
  for(const [shotId,at] of [["missed-laser",1000],["hit-rocket",1050]]){
    f.multiplayer.combatShotEvents.push({shotId,at,mapId:"0",enemyId:"target",attackerId:"pilot",travelTimeMs:500});
  }
  f.events.applyCombatShotEvents();
  f.hit({shotId:"missed-laser",at:1000,damage:0,hit:false,consumed:1});
  assert.equal(f.state.damageTexts.length, 0);
  f.hit({shotId:"hit-rocket",at:1550,damage:2000,hit:true,consumed:1});
  assert.equal(f.state.damageTexts.length, 1);
  assert.equal(f.state.damageTexts[0].value, 2000);
});

test("a completely missed burst displays one MISS", ()=>{
  const f = fixture();
  f.hit({shotId:"miss-laser",damage:0,hit:false,consumed:1});
  f.hit({shotId:"miss-rocket",at:1050,damage:0,hit:false,consumed:1});
  assert.equal(f.state.damageTexts.length, 1);
  assert.equal(f.state.damageTexts[0].value, "MISS");
  assert.equal(f.state.damageTexts[0].direction, "outgoing");
});

test("clearing combat effects resets old burst totals", ()=>{
  const f = fixture();
  f.hit({damage:3000});
  f.state.damageTexts = [];
  f.hit({damage:2000,at:1050});
  assert.equal(f.state.damageTexts[0].value, 2000);
});

test("a custom merge window can be tuned without changing server damage", ()=>{
  for(const windowMs of [80,160,240]){
    const texts = [];
    const feedback = createCombatDamageFeedback({getState:()=>({}),mergeWindowMs:windowMs,pushDamageText:text=>texts.push(text)});
    feedback.addHit({at:1000,damage:3000},{x:0,y:0});
    feedback.addHit({at:1160,damage:2000},{x:0,y:0});
    assert.equal(texts.length, windowMs < 160 ? 2 : 1);
    assert.equal(texts.reduce((sum,text)=>sum + text.value,0), 5000);
  }
});

test("damage animation keeps rising and preserves non-damage notifications", ()=>{
  const f = fixture();
  f.hit({damage:15000});
  const effects = createCombatStatusEffectSystem({getState:()=>f.state,setState:patch=>Object.assign(f.state,patch)});
  effects.updateParticles(.5);
  assert.ok(f.state.damageTexts[0].vy < 0);
  const ctx = textContext();
  drawDamageTexts({ctx,camera:{x:0,y:0},damageTexts:[{x:0,y:0,value:"+88 HP",life:.8,max:1,color:"rgba(134,239,172,"}]});
  assert.equal(ctx.drawn[0].label, "+88 HP");
  assert.match(ctx.drawn[0].fill, /134,239,172/);
});

test("real Socket.IO merges X6, X3, rocket and missile impacts into one counter without changing their damage or ammo", {timeout:8000}, async t=>{
  t.mock.method(Math, "random", ()=>0);
  const http = createServer(), io = new Server(http), players = new Map();
  const profile = createDefaultProfile();
  profile.inventoryItems.push(
    {uid:"feedback-rocket",itemId:"launcher_rocket_mk1"},
    {uid:"feedback-missile",itemId:"launcher_missile_mk1"}
  );
  profile.shipLoadouts.orion.rocketLauncher = "feedback-rocket";
  profile.shipLoadouts.orion.missileLauncher = "feedback-missile";
  Object.assign(profile.ammoInventory,{ammo_x6:100,ammo_x3:100,rocket_r1:100,missile_m1:100});
  const enemy = {id:"target",x:100,y:0,hp:1_000_000,maxShield:0,shield:0};
  const handler = createEnemyHitHandler({
    io,players,groups:new Map(),findWorldEnemyForPlayer:()=>enemy,
    presence:{markCombat(){}},updateLootOwner(){},
    profileManager:{updateCombatProfileForPlayer:({update})=>({...update(profile),profile})}
  });
  io.on("connection",socket=>{
    players.set(socket.id,{id:socket.id,accountId:`feedback-${socket.id}`,mapId:"0",mapRoom:"map:0",
      state:{mapId:"0",shipId:"orion",x:0,y:0,hp:1000,maxHp:1000}});
    socket.join("map:0");
    registerCombatHandlers(socket,{players,guard:()=>true,applyEnemyHit:handler.applyEnemyHit});
    socket.emit("test:ready");
  });
  await new Promise(resolve=>http.listen(0,"127.0.0.1",resolve));
  const client = connect(`http://127.0.0.1:${http.address().port}`,{transports:["websocket"],reconnection:false,autoConnect:false});
  const f = fixture();
  const rawHits = [], rawShots = [], displayedTotals = [];
  let complete;
  const impacts = new Promise(resolve=>{ complete = resolve; });
  client.on("combat:shot",event=>{
    rawShots.push(event);
    f.multiplayer.combatShotEvents.push(event);
    f.events.applyCombatShotEvents();
  });
  client.on("combat:hit",event=>{
    rawHits.push(event);
    f.multiplayer.combatEvents.push(event);
    f.events.applyCombatHitEvents();
    displayedTotals.push(f.state.damageTexts.reduce((sum,text)=>sum + Number(text.value || 0),0));
    if(rawHits.length === 4) complete();
  });
  const animation = createCombatStatusEffectSystem({getState:()=>f.state,setState:patch=>Object.assign(f.state,patch)});
  const ticker = setInterval(()=>{ f.events.applyCombatHitEvents(); animation.updateParticles(.016); },16);
  t.after(async()=>{ clearInterval(ticker); client.disconnect(); await new Promise(resolve=>io.close(resolve)); });
  const ready = new Promise(resolve=>client.once("test:ready",resolve));
  client.connect();
  await ready;
  f.multiplayer.playerId = client.id;
  const commands = createCombatCommands({multiplayer:{connected:true,socket:client,auth:{account:{id:"feedback-test"},profileReady:true}}});
  const acknowledgements = [
    ["laser","ammo_x6",1],["laser","ammo_x3",1],["rocket","rocket_r1",1],["missile","missile_m1",3]
  ].map(([weaponClass,ammoId,count])=>new Promise(resolve=>{
    assert.equal(commands.sendServerEnemyHit(enemy.id,{weaponClass,ammoId,count,shotId:`feedback-${ammoId}`},resolve),true);
  }));
  assert.ok((await Promise.all(acknowledgements)).every(response=>response.accepted));
  await impacts;
  const total = rawHits.reduce((sum,event)=>sum+event.damage,0);
  assert.ok(total > 0);
  assert.equal(f.state.damageTexts.length,1);
  assert.equal(f.state.damageTexts[0].value,total);
  assert.equal(rawShots.length,4);
  assert.equal(new Set(rawShots.map(event=>event.shotId)).size,4);
  assert.ok(Math.max(...rawShots.map(event=>event.at))-Math.min(...rawShots.map(event=>event.at)) <= 160);
  assert.deepEqual(displayedTotals,rawHits.map((_,index)=>rawHits.slice(0,index+1).reduce((sum,event)=>sum+event.damage,0)));
  assert.equal(enemy.hp,1_000_000-total);
  assert.equal(profile.ammoInventory.ammo_x6,99);
  assert.equal(profile.ammoInventory.ammo_x3,99);
  assert.equal(profile.ammoInventory.rocket_r1,99);
  assert.equal(profile.ammoInventory.missile_m1,97);
  assert.deepEqual(rawHits.map(event=>event.weaponClass).sort(),["laser","laser","missile","rocket"]);
  assert.deepEqual(rawHits.map(event=>event.ammoId).sort(),["ammo_x3","ammo_x6","missile_m1","rocket_r1"]);
  const ctx = textContext();
  drawDamageTexts({ctx,camera:{x:0,y:0},damageTexts:f.state.damageTexts});
  assert.equal(ctx.drawn.length,1);
  assert.match(ctx.drawn[0].fill,/^rgba\(255,96,96,/);
});
