import assert from "node:assert/strict";
import test from "node:test";
import {createWorldAiManager} from "../src/world/ai.js";
import {markEnemyAttackedByPlayer} from "../src/world/aggro.js";
import {WORLD_MAPS} from "../src/world/definitions.js";
import {createWorldEnemy, publicEnemy} from "../src/world/spawn.js";
import {replaceServerEnemies} from "../../src/multiplayer/socketState.js";
import {syncServerControlledEnemies} from "../../src/multiplayer/enemies.js";
import {createCombatInteractionSystem} from "../../src/game/systems/combatInteractions.js";

const map = WORLD_MAPS["0"];
const start = 100000;
const dt = .05;

function createScenario(kind, positions){
  const player = {id:"pursuit-pilot",mapId:map.id,state:{mapId:map.id,hp:100000,x:1000,y:1000}};
  const enemies = positions.map((position,index)=>{
    const enemy = createWorldEnemy(map,index,()=>.5,kind,{level:10});
    Object.assign(enemy,position,{homeX:position.x,homeY:position.y,nextAttackAt:Infinity});
    markEnemyAttackedByPlayer(enemy,player.id,1,start);
    return enemy;
  });
  const manager = createWorldAiManager({
    players:new Map([[player.id,player]]),presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},isPlayerSafeOnMap:()=>false
  });
  return {player,enemies,manager};
}

function diameter(enemies){
  let result = 0;
  for(let i=0;i<enemies.length;i++){
    for(let j=i+1;j<enemies.length;j++){
      result = Math.max(result,Math.hypot(enemies[i].x-enemies[j].x,enemies[i].y-enemies[j].y));
    }
  }
  return result;
}

function assertSelectable(enemies){
  const interactions = createCombatInteractionSystem({getState:()=>({enemies})});
  for(const enemy of enemies){
    assert.equal(interactions.findEnemyAt({x:enemy.x,y:enemy.y})?.id,enemy.id,`cannot select ${enemy.id} at its center`);
  }
}

function circleThenStop(kind,count=12){
  const positions = Array.from({length:count},(_,i)=>{
    const angle = (i+.125)/count*Math.PI*2;
    return {x:1000+Math.cos(angle)*550,y:1000+Math.sin(angle)*550};
  });
  const scenario = createScenario(kind,positions);
  const {player,enemies,manager} = scenario;
  const packets = [];
  let maxMovingSpread = 0;
  for(let step=1;step<=840;step++){
    const time = step*dt;
    const angle = Math.min(time,24)*365/400;
    Object.assign(player.state,{
      x:1000+400*(Math.cos(angle)-1),y:1000+400*Math.sin(angle),
      vx:time<24 ? -365*Math.sin(angle) : 0,
      vy:time<24 ? 365*Math.cos(angle) : 0,moving:time<24
    });
    for(const enemy of enemies){
      const before = {x:enemy.x,y:enemy.y};
      manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
      assert.ok(Math.hypot(enemy.x-before.x,enemy.y-before.y)<=enemy.speed*dt+.000001,"pursuit must preserve configured speed");
    }
    if(step%2===0) packets.push({mapId:map.id,at:start+step*50,enemies:enemies.map(publicEnemy)});
    if(time>=18 && time<24) maxMovingSpread = Math.max(maxMovingSpread,diameter(enemies));
  }
  return {...scenario,packets,maxMovingSpread};
}

for(const kind of ["drone_pirate","raider_astral","chasseur_spectral","cuirasse_nebulaire"]){
  test(`${kind}: pursuers group while circling and occupy distinct firing positions after stopping`, t=>{
    const {player,enemies,maxMovingSpread} = circleThenStop(kind);
    const spread = diameter(enemies);
    const ringDistance = Math.min(200,enemies[0].attackRange*.7);
    assert.ok(maxMovingSpread<150,`moving group dispersed over ${maxMovingSpread} units`);
    assert.ok(spread>ringDistance*1.7,"stationary monsters must surround the player instead of overlapping");
    assert.ok(enemies.every(enemy=>enemy.lockedPlayerId===player.id));
    assert.ok(enemies.every(enemy=>!enemy.moving && enemy.vx===0 && enemy.vy===0));
    assert.ok(enemies.every(enemy=>Math.abs(Math.hypot(enemy.x-player.state.x,enemy.y-player.state.y)-ringDistance)<=10));
    for(let i=0;i<enemies.length;i++){
      for(let j=i+1;j<enemies.length;j++) assert.ok(Math.hypot(enemies[i].x-enemies[j].x,enemies[i].y-enemies[j].y)>45);
    }
    assertSelectable(enemies);
    t.diagnostic(`Moving group ${maxMovingSpread.toFixed(1)} units; stationary ring ${ringDistance} units, all targets selectable`);
  });
}

for(const offsetY of [0,1,60]){
  test(`a continuous player pass reverses pursuit without drifting away (offset ${offsetY})`, ()=>{
    const {player,enemies:[enemy],manager} = createScenario("raider_astral",[{x:1000,y:1000}]);
    for(let step=1;step<=200;step++){
      player.state.x = Math.max(200,1600-step*dt*365);
      player.state.y = 1000+offsetY;
      manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
      const dx = enemy.pursuitPoint.x-enemy.x;
      const dy = enemy.pursuitPoint.y-enemy.y;
      assert.ok(enemy.vx*dx+enemy.vy*dy>=-.000001,"enemy moved away from its sampled destination");
    }
    assert.ok(Math.abs(Math.hypot(enemy.x-player.state.x,enemy.y-player.state.y)-140)<=10);
    assert.equal(enemy.moving,false);
  });
}

test("pursuit reaches a target at both zero coordinates without crossing past it", ()=>{
  const {player,enemies:[enemy],manager} = createScenario("raider_astral",[{x:200,y:200}]);
  player.state.x = 0;
  player.state.y = 0;
  for(let step=1;step<=100;step++){
    manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
    assert.ok(enemy.x>=0 && enemy.y>=0,"the chase overshot the target");
  }
  assert.ok(Math.abs(Math.hypot(enemy.x,enemy.y)-140)<=10);
  assert.equal(enemy.moving,false);
});

test("a threat target change releases the previous close hold immediately", ()=>{
  const {player,enemies:[enemy]} = createScenario("raider_astral",[{x:1148,y:1000}]);
  const other = {id:"other-pilot",mapId:map.id,state:{x:1600,y:1000,hp:10000,mapId:map.id}};
  const manager = createWorldAiManager({
    players:new Map([[player.id,player],[other.id,other]]),presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},isPlayerSafeOnMap:()=>false
  });
  manager.updateWorldEnemy(enemy,map,[player,other],dt,start);
  assert.equal(enemy.moving,false);
  markEnemyAttackedByPlayer(enemy,other.id,100,start+10000);
  manager.updateWorldEnemy(enemy,map,[player,other],dt,start+10000);
  assert.equal(enemy.lockedPlayerId,other.id);
  assert.ok(enemy.vx>0 && enemy.x>1148);
});

test("a newly safe target stops pursuit before the next target-selection scan", ()=>{
  const player = {id:"safe-pilot",mapId:map.id,state:{mapId:map.id,x:1000,y:1000,hp:10000}};
  const enemy = createWorldEnemy(map,0,()=>.5,"chasseur_spectral",{level:10});
  Object.assign(enemy,{x:1500,y:1000,homeX:1500,homeY:1000,nextAttackAt:Infinity});
  let safe = false;
  const manager = createWorldAiManager({
    players:new Map([[player.id,player]]),presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},isPlayerSafeOnMap:()=>safe
  });
  manager.updateWorldEnemy(enemy,map,[player],dt,start);
  assert.equal(enemy.moving,true);
  const position = {x:enemy.x,y:enemy.y};
  safe = true;
  manager.updateWorldEnemy(enemy,map,[player],dt,start+50);
  assert.equal(enemy.aiDecisionIndex,1);
  assert.equal(enemy.moving,false);
  assert.deepEqual({x:enemy.x,y:enemy.y},position);
});

test("anchored enemies retain their fixed position when the target changes direction", ()=>{
  const {player,enemies:[enemy],manager} = createScenario("cuirasse_nebulaire",[{x:1200,y:1000}]);
  enemy.anchored = true;
  for(let step=1;step<=40;step++){
    player.state.y = 1000+Math.sin(step)*100;
    manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
    assert.equal(enemy.x,1200);
    assert.equal(enemy.y,1000);
    assert.equal(enemy.moving,false);
  }
});

test("pursuit stays inside map bounds when its target enters the irradiated area", ()=>{
  const {player,enemies:[enemy],manager} = createScenario("raider_astral",[{x:4800,y:1000}]);
  player.state.x = 5400;
  for(let step=1;step<=100;step++){
    manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
    assert.ok(enemy.x<=map.width/2-70);
  }
  assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y));
});

test("a stationary firing ring stays selectable through the real client snapshot and interpolation pipeline", t=>{
  const {enemies:serverEnemies,packets} = circleThenStop("raider_astral",32);
  const delays = [40,120,80,180];
  let lastArrival = -Infinity;
  const incoming = packets.map((payload,index)=>{
    const arrival = Math.max(payload.at+delays[index%delays.length],lastArrival+.01);
    lastArrival = arrival;
    return {payload,arrival};
  });
  const originalPerformance = globalThis.performance;
  let clock = start;
  globalThis.performance = {now:()=>clock};
  try{
    for(const fps of [30,60,144]){
      const multiplayer = {serverEnemies:new Map()};
      let enemies = [];
      let packetIndex = 0;
      for(let now=start;now<=start+43000;now+=1000/fps){
        while(packetIndex<incoming.length && incoming[packetIndex].arrival<=now){
          const packet = incoming[packetIndex++];
          clock = packet.arrival;
          replaceServerEnemies(multiplayer,packet.payload,"world");
        }
        clock = now;
        enemies = syncServerControlledEnemies({enemies,multiplayerState:multiplayer,now}).enemies;
      }
      assert.equal(enemies.length,serverEnemies.length);
      assert.ok(enemies.every(enemy=>enemy.serverControlled));
      assert.ok(diameter(enemies)>serverEnemies[0].attackRange*.7*1.7,`${fps} FPS collapsed the firing ring`);
      assertSelectable(enemies);
      for(const enemy of enemies){
        const expected = serverEnemies.find(value=>value.id===enemy.id);
        assert.ok(Math.hypot(enemy.x-expected.x,enemy.y-expected.y)<1);
      }
      t.diagnostic(`${fps} FPS, delayed snapshots: 32 distinct selectable targets around the player`);
    }
  }finally{
    globalThis.performance = originalPerformance;
  }
});

test("each monster samples pursuit positions at intervals between 800 and 1500 ms", ()=>{
  const positions = Array.from({length:32},(_,i)=>({x:500+i,y:1000}));
  const {player,enemies,manager} = createScenario("raider_astral",positions);
  const delays = new Set();
  for(const enemy of enemies){
    manager.updateWorldEnemy(enemy,map,[player],dt,start);
    const interval = enemy.nextPursuitAt-start;
    assert.ok(interval>=800 && interval<=1500,`invalid pursuit interval ${interval}`);
    delays.add(interval);
  }
  assert.ok(delays.size>1,"monsters should react on staggered schedules");
});

test("movement and repeated hits cannot refresh the pursuit point before the reaction time", ()=>{
  const {player,enemies:[enemy],manager} = createScenario("raider_astral",[{x:1000,y:1000}]);
  player.state.x = 1600;
  manager.updateWorldEnemy(enemy,map,[player],dt,start);
  const firstReactionAt = enemy.nextPursuitAt;
  const originalPoint = {...enemy.pursuitPoint};
  Object.assign(player.state,{x:600,y:1400});
  for(let now=start+50;now<firstReactionAt;now+=50){
    markEnemyAttackedByPlayer(enemy,player.id,1,now);
    manager.updateWorldEnemy(enemy,map,[player],dt,now);
    assert.deepEqual(enemy.pursuitPoint,originalPoint);
    assert.equal(enemy.nextPursuitAt,firstReactionAt);
    assert.equal(enemy.vy,0,"the path reacted to the new Y coordinate too early");
  }
  manager.updateWorldEnemy(enemy,map,[player],dt,firstReactionAt);
  assert.deepEqual(enemy.pursuitPoint,{x:600,y:1400});
  assert.ok(enemy.vx<0 && enemy.vy>0,"the U-turn must work when the reaction becomes due");
  assert.ok(enemy.nextPursuitAt-firstReactionAt>=800 && enemy.nextPursuitAt-firstReactionAt<=1500);
});

test("an initially coincident pack separates without rearranging survivors when one respawns", ()=>{
  const {player,enemies,manager} = createScenario("raider_astral",Array.from({length:12},()=>({x:800,y:1000})));
  const run = (from,to)=>{
    for(let step=from;step<=to;step++){
      for(const enemy of enemies) manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
    }
  };
  run(1,200);
  assertSelectable(enemies);
  assert.ok(diameter(enemies)>enemies[0].attackRange*.7*1.7);
  const survivors = enemies.slice(1).map(enemy=>({id:enemy.id,x:enemy.x,y:enemy.y}));
  enemies[0].hp = 0;
  run(201,240);
  const replacement = createWorldEnemy(map,0,()=>.5,"raider_astral",{level:10});
  Object.assign(replacement,{x:800,y:1000,homeX:800,homeY:1000,nextAttackAt:Infinity});
  markEnemyAttackedByPlayer(replacement,player.id,1,start+12000);
  enemies[0] = replacement;
  run(241,440);
  assertSelectable(enemies);
  for(const before of survivors){
    const after = enemies.find(enemy=>enemy.id===before.id);
    assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.000001,"a survivor lost its stable place");
  }
});

test("formation positions at a map corner remain distinct, in bounds and in firing range", ()=>{
  const {player,enemies,manager} = createScenario("raider_astral",Array.from({length:12},()=>({x:4800,y:3800})));
  Object.assign(player.state,{x:map.width/2-70,y:map.height/2-70,vx:0,vy:0});
  for(let step=1;step<=200;step++){
    for(const enemy of enemies) manager.updateWorldEnemy(enemy,map,[player],dt,start+step*50);
  }
  assertSelectable(enemies);
  for(const enemy of enemies){
    assert.ok(enemy.x<=map.width/2-70 && enemy.y<=map.height/2-70);
    assert.ok(Math.hypot(enemy.x-player.state.x,enemy.y-player.state.y)<enemy.attackRange);
    assert.equal(enemy.moving,false);
  }
});

test("a validated stopped target switches to the firing ring at the next reaction", ()=>{
  const {player,enemies:[enemy],manager} = createScenario("raider_astral",[{x:1000,y:1000}]);
  Object.assign(player.state,{x:1600,y:1000,vx:365,vy:0});
  manager.updateWorldEnemy(enemy,map,[player],dt,start);
  assert.equal(enemy.pursuitMoving,true);
  const due = enemy.nextPursuitAt;
  Object.assign(player.state,{x:1700,vx:0,vy:0});
  manager.updateWorldEnemy(enemy,map,[player],dt,due);
  assert.equal(enemy.pursuitMoving,false);
  assert.ok(Math.abs(Math.hypot(enemy.pursuitPoint.x-player.state.x,enemy.pursuitPoint.y-player.state.y)-140)<.000001);
});
