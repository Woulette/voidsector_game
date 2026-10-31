import assert from "node:assert/strict";
import test from "node:test";
import {queuePlayerShieldImpact} from "../../src/game/systems/combatPlayerShieldImpacts.js";
import {drawPlayerShieldImpacts} from "../../src/game/render/playerShieldImpacts.js";
import {drawShieldSurface} from "../../src/game/render/shieldSurfaces.js";
import {createCombatServerEventSystem} from "../../src/game/systems/combatServerEvents.js";

function fixture(){
  const player={x:200,y:100,hp:80,maxHp:100,shield:0,maxShield:100};
  const event={enemyId:"orb",mapId:"0",amount:30,hp:80,shield:0,shieldBefore:10,fromX:0,fromY:100,at:Date.now()};
  return {player,event};
}
function context(){
  const ops=[];
  const ctx={globalAlpha:1,save(){},restore(){},createRadialGradient(){return {addColorStop(){}};}};
  for(const key of ["translate","rotate","beginPath","arc","closePath","fill","stroke","moveTo","lineTo","fillRect"])
    ctx[key]=(...args)=>ops.push([key,...args]);
  return {ctx,ops};
}

test("the player's last shield hit reacts even when the authoritative shield is already empty", ()=>{
  const {player,event}=fixture();
  assert.equal(queuePlayerShieldImpact(player,event,1000),true);
  assert.equal(player.shieldHitVisuals.length,1); assert.equal(player.shieldHitVisuals[0].angle,Math.PI);
  assert.equal(queuePlayerShieldImpact(player,event,1001),false,"duplicate event is not rendered twice");
  assert.equal(player.hp,80); assert.equal(player.shield,0);
});

test("hull-only, poison, bypass, stale and fatal player hits do not create a hex shield", ()=>{
  for(const patch of [{shieldBefore:0},{damageType:"poison"},{bypassShield:true},{at:Date.now()-3000},{hp:0},{amount:0}]){
    const {player,event}=fixture(); assert.equal(queuePlayerShieldImpact(player,{...event,...patch},1000),false);
    assert.equal(player.shieldHitVisuals,undefined);
  }
});

test("incoming bursts stay bounded and the player's mesh follows the ship then fully expires", ()=>{
  const {player,event}=fixture();
  for(let i=0;i<30;i++) queuePlayerShieldImpact(player,{...event,shotId:String(i)},1000+i);
  assert.equal(player.shieldHitVisuals.length,6);
  const {ctx,ops}=context();player.x=260;
  drawPlayerShieldImpacts({ctx,camera:{x:10,y:0},player,ship:{renderWidth:120,renderHeight:96},now:1100});
  assert(ops.some(op=>op[0]==="translate" && op[1]===250));
  assert(ops.some(op=>op[0]==="closePath"),"hexagonal cells are actually drawn");
  ops.length=0;
  drawPlayerShieldImpacts({ctx,camera:{x:0,y:0},player,ship:{},now:2000});
  assert.equal(ops.length,0); assert.equal(player.shieldHitVisuals.length,0);
});

test("player death clears pending grid reactions", ()=>{
  const {player,event}=fixture();queuePlayerShieldImpact(player,event,1000);player.hp=0;
  drawPlayerShieldImpacts({ctx:{},camera:{x:0,y:0},player,ship:{},now:1100});
  assert.deepEqual(player.shieldHitVisuals,[]);
});

test("the real incoming damage processor queues hex feedback while keeping authoritative vitals", ()=>{
  const {player,event}=fixture();
  const state={player,currentMap:{id:"0"}};
  const system=createCombatServerEventSystem({multiplayer:{playerDamageEvents:[event]},getState:()=>state,
    markAuthoritativeDamageReceived(){},pushDamageText(){}});
  system.applyDamageEvents();
  assert.equal(player.shieldHitVisuals.length,1);assert.equal(player.hp,80);assert.equal(player.shield,0);
});

test("the two approved surfaces are distinct and both are absent outside their impact lifetime", ()=>{
  for(const style of ["hex","membrane"]){
    const {ctx,ops}=context();
    drawShieldSurface(ctx,{x:200,y:100,radius:52,angle:Math.PI,progress:.2,style});
    const polygons=ops.filter(op=>op[0]==="closePath").length;
    assert(style==="hex" ? polygons>1 : polygons===1);
    ops.length=0;drawShieldSurface(ctx,{x:200,y:100,radius:52,angle:Math.PI,progress:1,style});
    assert.equal(ops.length,0);
  }
});
