import assert from "node:assert/strict";
import test from "node:test";
import { equipment } from "../../src/data/equipment.js";
import { REPAIR_DRONE_VISUALS, getRepairDroneVisual } from "../../src/data/repairDroneVisuals.js";
import { drawRepairDrone, getRepairDronePose } from "../../src/game/render/repairDrone.js";
import { createRepairBotSystem } from "../../src/game/systems/repairBot.js";
import { ships } from "../../src/data/ships.js";

const player = ()=>({x:300,y:250,angle:.4,hp:5000,maxHp:10000,repairBotActive:true,
  extraBonus:{repairBot:true,repairBotImg:REPAIR_DRONE_VISUALS.blue.body,repairBotHealRate:.01,repairBotDelay:5}});

function canvasRecorder(){
  let state={globalAlpha:1},stack=[];
  const calls=[];
  const ctx=new Proxy({}, {get:(_,key)=>{
    if(key in state)return state[key];
    if(key==="save")return ()=>stack.push({...state});
    if(key==="restore")return ()=>{assert.ok(stack.length);state=stack.pop();};
    return (...args)=>{for(const value of args)if(typeof value==="number")assert.ok(Number.isFinite(value),key);calls.push({method:key,args});};
  },set:(_,key,value)=>{state[key]=value;return true;}});
  return {ctx,calls,depth:()=>stack.length};
}

test("existing repair SKU, prices, rates and delay survive the new artwork",()=>{
  for(const [id,color,price,currency,rate] of [["extra_repair_starter","blue",100000,"credits",.01],
    ["extra_repair_yellow","yellow",850000,"credits",.015],["extra_repair_bot","red",7000,"premium",.02]]){
    const item=equipment.find(entry=>entry.id===id),visual=REPAIR_DRONE_VISUALS[color];
    assert.equal(item.price,price);assert.equal(item.priceType,currency);assert.equal(item.effect.repairBotHealRate,rate);
    assert.equal(item.effect.repairBotDelay,5);assert.equal(item.equipGroup,"repair-drone");
    assert.equal(item.img,visual.icon);assert.equal(item.effect.repairBotImg,visual.body);
  }
});

test("legacy snapshots and premium healing keep the actual equipped robot color",()=>{
  for(const [path,color] of [["drone_repair_starter.png","blue"],["drone_repair_yellow.png","yellow"],["drone_repair_red.png","red"]])
    assert.equal(getRepairDroneVisual({repairBotImg:"assets/equipment/"+path,repairBotHealRate:.04}).id,color);
  assert.equal(getRepairDroneVisual({repairBotImg:REPAIR_DRONE_VISUALS.blue.body,repairBotHealRate:.04}).id,"blue");
});

test("arms move continuously, keep welding tips on their joints and follow visual position corrections",()=>{
  const owner=player(),before=JSON.stringify(owner);
  const a=getRepairDronePose({player:owner,time:2}),b=getRepairDronePose({player:owner,time:2.3});
  assert.notDeepEqual(a.arms.map(arm=>arm.shoulderAngle),b.arms.map(arm=>arm.shoulderAngle));
  assert.notDeepEqual(a.arms.map(arm=>arm.elbowAngle),b.arms.map(arm=>arm.elbowAngle));
  const offset=getRepairDronePose({player:{...owner,visualCorrectionOffsetX:12,visualCorrectionOffsetY:-8},time:2});
  for(const key of ["drone","contact"]){assert.ok(Math.abs(offset[key].x-a[key].x-12)<1e-8);assert.ok(Math.abs(offset[key].y-a[key].y+8)<1e-8);}
  assert.equal(JSON.stringify(owner),before);
  assert.deepEqual(a,getRepairDronePose({player:owner,time:2}));
});

test("repair contacts stay fixed on the solid central hull through a whole robot orbit and ship turns",()=>{
  for(const source of ships){
    const ship={...source,renderAngleOffset:.37},owner=player();
    const width=ship.renderWidth||96,height=ship.renderHeight||96;
    for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/3]){
      owner.angle=angle;owner.x=312.3;owner.y=-98.7;
      owner.visualCorrectionOffsetX=17.2;owner.visualCorrectionOffsetY=-9.4;
      const initial=getRepairDronePose({player:owner,ship,time:0});
      for(let frame=0;frame<=240;frame++){
        const pose=getRepairDronePose({player:owner,ship,time:frame/12});
        for(const [index,arm] of pose.arms.entries()){
          assert.ok(Math.hypot(arm.contact.x-initial.arms[index].contact.x,arm.contact.y-initial.arms[index].contact.y)<1e-8,source.id+": orbit must not move the hull attachment");
          const dx=arm.contact.x-pose.center.x,dy=arm.contact.y-pose.center.y,rotation=angle+ship.renderAngleOffset;
          const u=(dx*Math.cos(rotation)+dy*Math.sin(rotation))/width;
          const v=(-dx*Math.sin(rotation)+dy*Math.cos(rotation))/height;
          assert.ok(Math.abs(u)<=.03&&v>=-.06&&v<=.04,source.id+": contacts must remain on the central spine, including narrow wings");
        }
      }
      assert.notDeepEqual(initial.drone,getRepairDronePose({player:owner,ship,time:10}).drone);
    }
  }
});

test("repair flight approaches and retreats, circles faster and changes direction without jumping",()=>{
  const owner=player(),ship=ships.find(ship=>ship.id==="razorion");
  let previous=getRepairDronePose({player:owner,ship,time:0}),distanceMin=Infinity,distanceMax=0;
  let angularTravel=0,reversals=0,previousDirection=0,approaching=false,retreating=false;
  let previousDistance=Math.hypot(previous.drone.x-previous.center.x,previous.drone.y-previous.center.y);
  for(let frame=1;frame<=720;frame++){
    const pose=getRepairDronePose({player:owner,ship,time:frame/60});
    const x=pose.drone.x-pose.center.x,y=pose.drone.y-pose.center.y;
    const oldX=previous.drone.x-previous.center.x,oldY=previous.drone.y-previous.center.y;
    const delta=Math.atan2(oldX*y-oldY*x,oldX*x+oldY*y),distance=Math.hypot(x,y);
    angularTravel+=delta;
    if(Math.abs(delta)>.0001){const direction=Math.sign(delta);if(previousDirection&&direction!==previousDirection)reversals++;previousDirection=direction;}
    approaching ||= distance<previousDistance-.05;retreating ||= distance>previousDistance+.05;
    distanceMin=Math.min(distanceMin,distance);distanceMax=Math.max(distanceMax,distance);
    assert.ok(Math.hypot(pose.drone.x-previous.drone.x,pose.drone.y-previous.drone.y)<5,"No position jump when changing side");
    for(const [index,arm] of pose.arms.entries())assert.deepEqual(arm.contact,previous.arms[index].contact);
    previous=pose;previousDistance=distance;
  }
  assert.ok(distanceMax-distanceMin>=20,"Approach and retreat must be visible");
  assert.ok(approaching&&retreating);
  assert.ok(angularTravel>6,"Circling must be faster than the previous 20-second orbit");
  assert.ok(reversals>=2,"The robot must change its approach direction smoothly");
  assert.equal(getRepairDronePose({player:owner,ship,time:0,elapsed:.24}).opacity,1,"Deployment should be responsive");
});

test("rendering has bounded sprite work, restores canvas state and never changes gameplay",()=>{
  const owner=player(),before=JSON.stringify(owner),record=canvasRecorder();
  const cache={[REPAIR_DRONE_VISUALS.blue.body]:{complete:true,naturalWidth:512}};
  for(const time of [0, .016, .1, 1, 10])assert.equal(drawRepairDrone({ctx:record.ctx,camera:{x:150,y:100},cache,player:owner,time}),true);
  assert.equal(record.depth(),0);assert.equal(record.ctx.globalAlpha,1);assert.equal(JSON.stringify(owner),before);
  assert.ok(record.calls.filter(call=>call.method==="drawImage").length<=5*8);
  for(const change of [{repairBotActive:false},{hp:0},{hp:10000},{isDead:true},{extraBonus:{repairBot:false}}]){
    const count=record.calls.length;
    assert.equal(drawRepairDrone({ctx:record.ctx,cache,player:{...owner,...change},time:11}),false);
    assert.equal(record.calls.length,count);
  }
});

test("heal ticks and damage interruption remain intact without spawning floating crosses",()=>{
  for(const rate of [.01,.015,.02]){
    const owner={...player(),repairBotActive:false,secondsSinceDamage:4},particles=[],texts=[];
    owner.extraBonus.repairBotHealRate=rate;
    const system=createRepairBotSystem({getPlayer:()=>owner,getParticles:()=>particles,pushDamageText:text=>texts.push(text),showToast:()=>{}});
    assert.equal(system.activate(),false);system.update(1);assert.equal(system.activate(),true);
    system.update(1);assert.equal(owner.hp,5000+10000*rate);assert.equal(texts.length,1);assert.equal(particles.length,0);
    owner.secondsSinceDamage=0;system.update(.1);assert.equal(owner.repairBotActive,false);
  }
});
