import assert from "node:assert/strict";
import test from "node:test";
import { createCombatBeamSystem } from "../../src/game/systems/combatBeams.js";
import { createWorldStatusEffectManager } from "../src/world/statusEffects.js";
import { getSlowedMovementSpeed } from "../../src/shared/movementSlow.js";
import { updatePlayerMovement } from "../../src/game/systems/playerMovement.js";
import { createCombatStatusEffectSystem } from "../../src/game/systems/combatStatusEffects.js";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { WORLD_ENEMY_TYPES } from "../src/world/definitions.js";
import { ENEMY_TYPES } from "../../src/game/combatData/enemies.js";
import { getEnemyRenderRotation } from "../../src/data/enemyVisuals.js";
import { getEnemyLifeScale, getEnemyLifeTheme } from "../../src/game/render/enemyLife.js";
import { advanceEngineWake } from "../../src/game/render/shipEngineWake.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { createPlayerActivityManager } from "../src/world/playerActivity.js";

test("one M6 salvo creates four readable visual passes at front and side muzzles", ()=>{
  const system = createCombatBeamSystem({getTargetById:()=>null});
  system.add({ammoId:"ammo_x6", fromX:45, fromY:0, toX:500, toY:0, targetId:"enemy"});
  const pulses = system.getBeams();
  assert.equal(pulses.length, 4);
  assert.deepEqual(pulses.map(b=>Math.round(-b.age * 1000)), [0,90,180,270]);
  assert.deepEqual(pulses.map(b=>[b.fromX,b.fromY]), [[45,0],[39,-11],[39,11],[45,0]]);
  assert(pulses.every(b=>b.monochrome && !b.canReplay && b.duration === .12));
  assert.deepEqual(pulses.map(b=>b.passIndex), [0,1,2,3]);
  system.update(.13);
  assert.equal(system.getBeams().length, 3);
  system.update(.27);
  assert.equal(system.getBeams().length, 0);
});

test("normal laser retains two passes", ()=>{
  const system = createCombatBeamSystem({getTargetById:()=>({x:500,y:0,hp:1})});
  system.add({ammoId:"ammo_x1", fromX:45, fromY:0, toX:500, toY:0, targetId:"enemy"});
  system.update(.29);
  assert.equal(system.getBeams().length, 1);
  assert.equal(system.getBeams()[0].canReplay, false);
  system.update(.29);
  assert.equal(system.getBeams().length, 0);
});

test("X1 through X4 retain the original 200 ms travel and 130 length", ()=>{
  for(const ammoId of ["ammo_x1","ammo_x2","ammo_x3","ammo_x4"]){
    const system=createCombatBeamSystem({getTargetById:()=>({x:500,y:0,hp:1})});
    system.add({ammoId,fromX:45,fromY:0,toX:500,toY:0,targetId:"enemy"});
    assert.equal(system.getBeams()[0].duration,.2);
    assert.equal(system.getBeams()[0].beamLength,130);
    system.update(.2);
    assert.equal(system.getBeams().length,1);
    assert.equal(system.getBeams()[0].canReplay,false);
    system.update(.2);
    assert.equal(system.getBeams().length,0);
  }
});

test("M6 consumes one real salvo and enforces three seconds even with blue elite cadence", t=>{
  let now = 100_000;
  t.mock.method(Date, "now", ()=>now);
  const profile = createDefaultProfile();
  profile.inventoryItems = [{uid:"vfx-blue", itemId:"laser_elite_blue"}];
  profile.shipLoadouts.orion.lasers = ["vfx-blue"];
  profile.ammoInventory.ammo_x6 = 100;
  profile.eliteLaserStates = {current:{lastLaserAt:99_000,green:{charge:0},blue:{charge:5,phase:"active",activeUntil:200_000},red:{charge:0}}};
  const player = {id:"vfx-m6-cadence",state:{shipId:"orion",x:0,y:0,hp:1000,maxHp:1000}};
  const fire = ()=>resolveServerCombatFire({player, profile,
    enemy:{id:"dummy",x:100,y:0,hp:1_000_000,shield:0,maxShield:0,radius:30},
    payload:{enemyId:"dummy",ammoId:"ammo_x6",weaponClass:"laser"},random:()=>0,now});
  const first = fire();
  assert.equal(first.ok, true);
  assert.equal(first.cooldownMs, 3000);
  assert.equal(first.consumed, 1);
  assert.equal(profile.ammoInventory.ammo_x6, 99);
  now += 2999;
  assert.equal(fire().ok, false);
  assert.equal(profile.ammoInventory.ammo_x6, 99);
  now += 1;
  assert.equal(fire().ok, true);
  assert.equal(profile.ammoInventory.ammo_x6, 98);
});

function slowFixture(){
  const make = (id,x,mapId="2",hp=1000)=>({id,mapId,state:{x,y:0,hp,speed:300},statusEffects:{}});
  const list = [make("near",0),make("edge",100),make("far",100.001),make("other",0,"3"),make("dead",0,"2",0)];
  const players = new Map(list.map(p=>[p.id,p]));
  const events = [];
  const manager = createWorldStatusEffectManager({players,io:{to:id=>({emit:(name,event)=>events.push({id,name,event})})},presence:{},profileManager:{}});
  const bomb = id=>({id,x:0,y:0,deathEffect:{type:"slow",ratio:.5,duration:5,radius:100}});
  return {players,events,manager,bomb};
}

test("Traqueur death bomb affects living players through radius 100 for exactly five seconds", ()=>{
  const {players,events,manager,bomb} = slowFixture();
  const enemy = bomb("tracker");
  assert.deepEqual(manager.applyEnemyDeathEffect("2",enemy,1000),["near","edge"]);
  assert.equal(players.get("near").statusEffects.slow.ratio,.5);
  assert.equal(players.get("near").statusEffects.slow.expiresAt,6000);
  assert.equal(players.get("far").statusEffects.slow,undefined);
  assert.equal(players.get("other").statusEffects.slow,undefined);
  assert.equal(players.get("dead").statusEffects.slow,undefined);
  assert.deepEqual(manager.applyEnemyDeathEffect("2",enemy,1001),[]);
  assert.equal(events.filter(e=>e.name === "ship:ability-effect" && e.event.radius === 100).length,4);
  manager.updateStatusEffects(5999);
  assert(players.get("near").statusEffects.slow);
  manager.updateStatusEffects(6000);
  assert.equal(players.get("near").statusEffects.slow,undefined);
});

test("bombs refresh without stacking and remain isolated between portal instances", ()=>{
  const {players,manager,bomb} = slowFixture();
  manager.applyEnemyDeathEffect("2",bomb("one"),1000,{playerIds:["near"]});
  manager.applyEnemyDeathEffect("2",bomb("two"),2000,{playerIds:["near"]});
  const slow = players.get("near").statusEffects.slow;
  assert.equal(slow.ratio,.5);
  assert.equal(slow.expiresAt,7000);
  assert.equal(players.get("edge").statusEffects.slow,undefined);
  for(const base of [250,300,500,850]) assert.equal(getSlowedMovementSpeed(base,slow),base * .5);
});

test("client receives the percentage and moves at half speed until expiry", ()=>{
  const player = {x:0,y:0,speed:400};
  const system = createCombatStatusEffectSystem({getState:()=>({player,particles:[]}),updateSlowStatus(){}});
  system.applyPlayerSlow({type:"slow",ratio:.5,amount:0,duration:5,serverAuthoritative:true});
  updatePlayerMovement({player,moveTarget:{x:1000,y:0},dt:1,clampToMap:false});
  assert.equal(player.x,200);
  system.updatePlayerSlow(5);
  updatePlayerMovement({player,moveTarget:{x:1000,y:0},dt:1,clampToMap:false});
  assert.equal(player.x,600);
});

test("base and boss Traqueurs share the requested death effect", ()=>{
  for(const kind of ["cuirasse_nebulaire","boss_cuirasse_nebulaire"]){
    const expected = {type:"slow",ratio:.5,duration:5,radius:100};
    assert.deepEqual(WORLD_ENEMY_TYPES[kind].deathEffect,expected);
    assert.deepEqual(ENEMY_TYPES[kind].deathEffect,expected);
  }
});

test("server validates half speed and background movement never applies it twice", ()=>{
  const profile = createDefaultProfile();
  const player = {id:"vfx-background",mapId:"0",connected:true,clientPageHidden:true,lastClientStateAt:1000,
    state:{x:0,y:0,angle:0,hp:1000,maxHp:5000,shield:0,maxShield:0,shipId:"orion",mapId:"0",speed:300,updatedAt:1000},
    statusEffects:{slow:{ratio:.5,amount:0,expiresAt:6000}}};
  const result = validatePlayerState({player,profile,groups:new Map(),now:2000,payload:{...player.state}});
  assert.equal(result.state.baseMovementSpeed,300);
  assert.equal(result.state.speed,150);
  player.state={...result.state,moveTarget:{x:2000,y:0}};
  const manager = createPlayerActivityManager({players:new Map([[player.id,player]]),groups:new Map(),
    io:{to:()=>({emit(){}})},profileManager:{},publicPlayer:entry=>entry});
  manager.updatePlayerActivity(1,2500);
  assert.equal(player.state.x,150);
  manager.updatePlayerActivity(1,6000);
  assert.equal(player.state.x,450);
});

test("all monster families receive a life theme without changing fixed crystal orientation", ()=>{
  for(const kind of [...Object.keys(ENEMY_TYPES),"shared_orb","shared_crystal","deadly_eclaireur","unknown_boss"]){
    assert(getEnemyLifeTheme(kind).color);
    const enemy = Object.freeze({kind,x:10,y:20,angle:1.2});
    const scale = getEnemyLifeScale(enemy,10);
    assert(scale.x > .9 && scale.y > .9);
    assert.equal(enemy.angle,1.2);
  }
  for(const angle of [0,1,4,9]) assert.equal(getEnemyRenderRotation("eclanite",angle),0);
});

test("world-space engine wake retains its old direction and fully expires after shutoff", ()=>{
  const state={};
  for(let i=0;i<90;i++) advanceEngineWake(state,[{x:i*2,y:0,dx:-1,dy:0,width:12}],{x:0,y:0},1/60,.9,1.25);
  const retained = state.tracks[0][5], vx=retained.vx;
  advanceEngineWake(state,[{x:180,y:0,dx:0,dy:1,width:12}],{x:0,y:0},1/60,.9,1.25);
  assert.equal(retained.vx,vx);
  for(let i=0;i<120;i++) advanceEngineWake(state,[],{x:0,y:0},1/60,0,1.25);
  assert.equal(state.tracks[0].length,0);
});
