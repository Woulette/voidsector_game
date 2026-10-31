import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { isVitalOnlyStateCorrection } from "../src/socket/stateCorrections.js";
import { createCombatSessionController } from "../../src/game/systems/combatSession.js";
import { sampleBufferedState } from "../../src/multiplayer/remoteInterpolation.js";
import { replaceServerEnemies } from "../../src/multiplayer/socketState.js";
import { syncServerControlledEnemies } from "../../src/multiplayer/enemies.js";

test("network arrival jitter does not change a validated ship's motion velocity", ()=>{
  const profile = createDefaultProfile();
  const previous = {x:0,y:0,vx:300,vy:0,hp:5000,maxHp:5000,shield:0,maxShield:0,mapId:"0",shipId:"orion",updatedAt:1000};
  for(const now of [1050,1200]){
    const result = validatePlayerState({player:{state:previous,mapId:"0"}, profile, groups:new Map(), now,
      payload:{...previous,x:15,vx:300,vy:0,enginePower:1,moveTarget:{x:1000,y:0}}});
    assert.equal(result.state.vx,300);
  }
});

test("a stopped ship has zero extrapolation velocity in its first stop snapshot", ()=>{
  const profile = createDefaultProfile();
  const previous = {x:0,y:0,vx:300,vy:0,hp:5000,maxHp:5000,shield:0,maxShield:0,mapId:"0",shipId:"orion",updatedAt:1000};
  const result=validatePlayerState({player:{state:previous,mapId:"0"},profile,groups:new Map(),now:1050,
    payload:{...previous,x:10,vx:0,vy:0,moveTarget:null,enginePower:0}});
  assert.equal(result.state.vx,0);
});

test("combat vitals correction does not rewind local movement or aim", ()=>{
  const player={x:150,y:30,vx:300,vy:0,angle:1,hp:500,maxHp:5000,shield:0,maxShield:0,shipId:"orion"};
  const state={player,currentMap:{id:"0"}};
  const controller=createCombatSessionController({store:{state:{activeShip:"orion"}},getRunning:()=>true,
    getState:()=>state,updateHud(){}});
  controller.resumeWorldSession({source:"state-correction",vitalsOnly:true,mapId:"0",shipId:"orion",
    x:100,y:20,vx:200,vy:0,angle:0,hp:400,maxHp:5000,shield:0,maxShield:0});
  assert.deepEqual([player.x,player.y,player.vx,player.angle],[150,30,300,1]);
  assert.equal(player.hp,400);
  assert.equal(controller.resumeWorldSession({source:"state-correction",vitalsOnly:true,mapId:"1",shipId:"orion",x:0,y:0,hp:5000}),false);
  assert.equal(player.hp,400);
});

test("a rejected movement with a simultaneous hp mismatch is not a vitals-only correction", ()=>{
  assert.equal(isVitalOnlyStateCorrection({corrected:true,positionCorrected:true,
    reason:"vitesse impossible",correctionDetails:[{field:"hp",client:500,server:400}]}),false);
});

test("a late stop eventually reconciles an extrapolated overshoot", ()=>{
  const timing={};
  const moving=[{x:100,y:0,vx:300,vy:0,sourceAt:1000,receivedAt:1040}];
  const overshot=sampleBufferedState(moving,{now:1300,timing}).x;
  assert.ok(overshot>110);
  const stopped=[...moving,{x:110,y:0,vx:0,vy:0,sourceAt:1050,receivedAt:1400}];
  let result;
  for(let now=1400;now<2500;now+=1000/60)result=sampleBufferedState(stopped,{now,timing});
  assert.ok(Math.abs(result.x-110)<.1,`stuck at ${result.x} instead of 110`);
});

test("enemy source time keeps uniform motion smooth under delayed bursts", t=>{
  const original=globalThis.performance;
  let clock=0;
  globalThis.performance={now:()=>clock};
  try{
    const m={serverEnemies:new Map()};
    const packets=[];
    let lastArrival=-1;
    const delays=[40,40,200,150,100,50];
    for(let at=0,i=0;at<=5000;at+=100,i++){
      const arrival=Math.max(at+delays[i%delays.length],lastArrival+.01); lastArrival=arrival;
      packets.push({at,arrival});
    }
    let index=0,enemies=[],lastX=null;
    const speeds=[];
    for(let now=0;now<=5000;now+=1000/60){
      while(index<packets.length&&packets[index].arrival<=now){
        const p=packets[index++];clock=p.arrival;
        replaceServerEnemies(m,{mapId:"0",at:p.at,enemies:[{id:"e",x:p.at*.3,y:0,vx:300,vy:0,hp:100,maxHp:100}]},"world");
      }
      clock=now;
      enemies=syncServerControlledEnemies({enemies,multiplayerState:m,now}).enemies;
      const x=enemies[0]?.x;
      if(x!==undefined){if(now>1500&&lastX!==null)speeds.push((x-lastX)*60);lastX=x;}
    }
    assert.ok(Math.min(...speeds)>240,`min speed ${Math.min(...speeds)}`);
    assert.ok(Math.max(...speeds)<360,`max speed ${Math.max(...speeds)}`);
    t.diagnostic(`Enemy 300 units/s: rendered ${Math.min(...speeds).toFixed(1)} to ${Math.max(...speeds).toFixed(1)} units/s`);
  }finally{globalThis.performance=original;}
});

test("enemy respawns reset motion history and an old snapshot cannot undo the respawn", ()=>{
  const m={serverEnemies:new Map()};
  const enemy={id:'e',x:0,y:0,vx:0,vy:0,hp:100};
  replaceServerEnemies(m,{mapId:'0',at:1000,enemies:[enemy]},'world');
  let enemies=syncServerControlledEnemies({enemies:[],multiplayerState:m,now:performance.now()}).enemies;
  replaceServerEnemies(m,{mapId:'0',at:1100,enemies:[{...enemy,x:2000}]},'world');
  enemies=syncServerControlledEnemies({enemies,multiplayerState:m,now:performance.now()+20}).enemies;
  assert.equal(enemies[0].x,2000);
  replaceServerEnemies(m,{mapId:'0',at:1050,enemies:[enemy]},'world');
  assert.equal(m.serverEnemies.get('e').x,2000);
  assert.equal(m.serverEnemies.get('e').samples.length,1);
});

test("motion velocity hints cannot bypass server speed and position limits", ()=>{
  const profile=createDefaultProfile();
  const previous={x:0,y:0,vx:0,vy:0,hp:5000,maxHp:5000,shield:0,maxShield:0,mapId:'0',shipId:'orion',updatedAt:1000};
  const result=validatePlayerState({player:{state:previous,mapId:'0'},profile,groups:new Map(),now:1050,
    payload:{...previous,x:4000,vx:1000000,vy:1000000,hp:100000}});
  assert.ok(result.state.x<500);
  assert.ok(Math.hypot(result.state.vx,result.state.vy)<=result.state.speed+.001);
  assert.equal(result.positionCorrected,true);
  assert.equal(isVitalOnlyStateCorrection(result),false);
});
