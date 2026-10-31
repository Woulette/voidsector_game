import assert from "node:assert/strict";
import test from "node:test";
import {getEnemyWeaponContact} from "../../src/game/combatData/enemyWeaponContact.js";
import {createCombatEnemyImpactSystem, createEnemyImpactEffect} from "../../src/game/systems/combatEnemyImpacts.js";
import {drawEnemyWeaponImpact} from "../../src/game/render/enemyWeaponImpact.js";
import {createCombatBeamSystem} from "../../src/game/systems/combatBeams.js";
import {createCombatStatusEffectSystem} from "../../src/game/systems/combatStatusEffects.js";
import {drawImpactEffects} from "../../src/game/render/entities.js";
import {createCombatServerEventSystem} from "../../src/game/systems/combatServerEvents.js";

function fixture(){
  let at = 0;
  const enemy = {id:"orb",x:200,y:100,width:82,height:82,radius:16,hp:70,maxHp:100,shield:0,maxShield:100};
  const state = {currentMap:{id:"0"},impactEffects:[],enemies:[enemy],player:{},particles:[],damageTexts:[]};
  const system = createCombatEnemyImpactSystem({getState:()=>state,now:()=>at});
  const event = {accepted:true,hit:true,damage:20,weaponClass:"laser",ammoId:"ammo_x1",attackerId:"pilot",
    shotId:"shot-1",enemyId:enemy.id,mapId:"0",fromX:0,fromY:100,x:200,y:100,shieldBefore:100};
  return {enemy,state,system,event,setTime:value=>{at=value;}};
}

test("the shield-breaking hit uses server shield-before state; the following hit reaches the body", ()=>{
  const {enemy,state,system,event} = fixture();
  system.observeShot(event);
  system.addHit(event,enemy);
  assert.equal(state.impactEffects.length,2);
  assert(state.impactEffects.every(effect=>effect.surface === "shield"));
  assert.deepEqual(state.impactEffects.map(e=>e.delay),[.2,.4]);
  system.addHit({...event,shotId:"shot-2",shieldBefore:0},enemy);
  assert(state.impactEffects.slice(2).every(effect=>effect.surface === "hull"));
  assert.equal(enemy.hp,70); assert.equal(enemy.shield,0);
  assert(state.impactEffects[0].x < state.impactEffects[2].x,"shield contact is in front of the body");
});

test("a received X6 hit creates four timed contacts and duplicate packets cannot replay them", ()=>{
  const {enemy,state,system,event,setTime} = fixture();
  const x6={...event,ammoId:"ammo_x6"};
  system.observeShot(x6); setTime(20); system.addHit(x6,enemy); system.addHit(x6,enemy);
  assert.equal(state.impactEffects.length,4);
  assert.deepEqual(state.impactEffects.map(e=>Math.round(e.delay*1000)),[100,190,280,370]);
  assert(state.impactEffects.every(e=>e.monochrome));
  assert.notEqual(state.impactEffects[1].angle,state.impactEffects[2].angle);
});

test("the real server-event processor sends an accepted monster hit into the transient impact pool", ()=>{
  const {enemy,state,event} = fixture();
  const multiplayer={playerId:"spectator",combatShotEvents:[{...event,targetId:"orb",kind:"laser",toX:200,toY:100}],
    combatEvents:[event],remoteEffects:[]};
  const system=createCombatServerEventSystem({multiplayer,getState:()=>state,pushDamageText(){}});
  system.applyCombatShotEvents();
  system.applyCombatHitEvents();
  assert.equal(state.impactEffects.length,2);
  assert.equal(state.impactEffects[0].surface,"shield");
  assert.equal(enemy.hp,70); assert.equal(enemy.shield,0);
});

test("misses, rejected shots, old packets, foreign maps and PvP never create monster shields", ()=>{
  const {enemy,state,system,event} = fixture();
  for(const patch of [{hit:false},{damage:0},{accepted:false},{outcome:"rejected"},{mapId:"1"},
    {targetPlayerId:"remote"},{enemyId:"player:remote"},{at:Date.now()-2100}]){
    system.addHit({...event,...patch},enemy);
  }
  assert.deepEqual(state.impactEffects,[]);
  assert.equal(getEnemyWeaponContact({target:{...enemy,isPlayerTarget:true}}),null);
  assert.equal(createEnemyImpactEffect({target:{...enemy,shipId:"orion"}}),null);
});

test("a lethal hit never creates a shield reaction even after its target has disappeared", ()=>{
  for(const ammoId of ["ammo_x1","ammo_x4","ammo_x6"]){
    for(const target of [undefined,{x:200,y:100,hp:70},{x:200,y:100,hp:0}]){
      const {state,system,event}=fixture();
      system.addHit({...event,ammoId,targetDestroyed:true},target);
      assert.equal(state.impactEffects.length,0);
    }
  }
});

test("beam endpoints meet the same shield as its impact, including a moving target and the second pass", ()=>{
  const {enemy} = fixture();
  const beams = createCombatBeamSystem({getTargetById:()=>enemy});
  beams.add({ammoId:"ammo_x1",fromX:0,fromY:100,toX:200,toY:100,targetId:"orb",shieldBefore:100});
  const contact = getEnemyWeaponContact({target:enemy,fromX:0,fromY:100,shield:100});
  assert.equal(beams.getBeams()[0].toX,contact.x);
  enemy.x += 30; beams.update(.2);
  assert.equal(beams.getBeams().length,1);
  assert.equal(beams.getBeams()[0].toX,contact.x+30);
  assert.equal(beams.getBeams()[0].shieldBefore,100);
});

function context(){
  const ops=[],stack=[];
  const ctx={globalAlpha:1,canvas:{width:800,height:500},save(){stack.push({globalAlpha:this.globalAlpha});},
    restore(){Object.assign(this,stack.pop());},createRadialGradient(){return {addColorStop(){}};}};
  for(const method of ["translate","rotate","beginPath","arc","ellipse","closePath","fill","fillRect","moveTo","lineTo"])
    ctx[method]=(...args)=>ops.push([method,...args]);
  ctx.stroke=()=>ops.push(["stroke",ctx.strokeStyle,ctx.lineWidth]);
  return {ctx,ops};
}

test("shields draw only for a live impact; the normal update removes all effects without scars", ()=>{
  const {enemy,state} = fixture();
  const effect = createEnemyImpactEffect({target:enemy,fromX:0,fromY:100,shield:100,delay:.2});
  const {ctx,ops} = context();
  drawEnemyWeaponImpact(ctx,effect); assert.equal(ops.length,0,"invisible before arrival");
  effect.delay=0; effect.life=.30; drawEnemyWeaponImpact(ctx,effect);
  assert(ops.some(op=>op[0]==="translate" && op[1]===enemy.x && op[2]===enemy.y));
  assert(ops.some(op=>op[0]==="arc" && op[1]===0 && op[3]===effect.radius));
  ops.length=0; effect.life=0; drawEnemyWeaponImpact(ctx,effect); assert.equal(ops.length,0);
  effect.life=.2; enemy.hp=0; drawEnemyWeaponImpact(ctx,effect); assert.equal(ops.length,0,"pending shield effect disappears with the dead target");
  enemy.hp=70;
  state.impactEffects.push({...effect,life:.36,delay:.2});
  const status=createCombatStatusEffectSystem({getState:()=>state,setState:patch=>Object.assign(state,patch)});
  for(let i=0;i<90;i++) status.updateParticles(1/60);
  assert.deepEqual(state.impactEffects,[]);
  assert.equal(enemy.hp,70); assert.equal(enemy.shield,0);
});

test("shield renderer honors visibility, impact settings and the shared spark budget", ()=>{
  const {enemy} = fixture();
  const effect=createEnemyImpactEffect({target:enemy,fromX:0,fromY:100,shield:100});
  const {ctx,ops}=context();
  drawImpactEffects({ctx,camera:{x:0,y:0},impactEffects:[effect],showExplosions:false,showSparksSmoke:false});
  assert(!ops.some(op=>["arc","ellipse","lineTo","fillRect"].includes(op[0])));
  ops.length=0;
  drawImpactEffects({ctx,camera:{x:5000,y:0},impactEffects:[effect]});
  assert(!ops.some(op=>op[0]==="arc"));
  ops.length=0;
  drawImpactEffects({ctx,camera:{x:0,y:0},impactEffects:Array.from({length:20},()=>effect)});
  assert.equal(ops.filter(op=>op[0]==="stroke" && op[1]==="rgba(85,195,255,1)").length,28);
});
