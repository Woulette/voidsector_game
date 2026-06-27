import assert from "node:assert/strict";
import test from "node:test";
import { syncServerControlledEnemies } from "../../src/multiplayer/enemies.js";
import { replaceServerEnemies } from "../../src/multiplayer/socketState.js";
import { installWorldSocketListeners } from "../../src/multiplayer/worldSocketListeners.js";

function makeEnemy(id, x = 0){
  return {id:`enemy-${id}`, kind:"drone_pirate", type:"Drone", img:"drone.png", x, y:id, angle:0, vx:10, vy:0, moving:true, hp:100, maxHp:100};
}

test("enemy snapshot history stays bounded during sustained MMO updates", ()=>{
  const multiplayer = {serverEnemies:new Map()};
  for(let tick = 0; tick < 30; tick += 1){
    replaceServerEnemies(multiplayer, {enemies:[makeEnemy(1, tick * 10)]}, "world");
  }

  assert.equal(multiplayer.serverEnemies.get("enemy-1").samples.length, 6);
});

test("enemy delta snapshots reuse the last full enemy definition", ()=>{
  const multiplayer = {serverEnemies:new Map(), serverEnemyDefinitions:new Map()};
  replaceServerEnemies(multiplayer, {
    mapId:"0",
    full:true,
    enemies:[makeEnemy(1, 10)]
  }, "world");
  replaceServerEnemies(multiplayer, {
    mapId:"0",
    delta:true,
    enemies:[{id:"enemy-1", x:55, y:80, hp:75, shield:12, angle:.5, vx:20, vy:0, moving:true}]
  }, "world");

  const enemy = multiplayer.serverEnemies.get("enemy-1");
  assert.equal(enemy.kind, "drone_pirate");
  assert.equal(enemy.img, "drone.png");
  assert.equal(enemy.maxHp, 100);
  assert.equal(enemy.hp, 75);
  assert.equal(enemy.x, 55);
  assert.equal(enemy.samples.length, 2);
});

test("high-frequency enemy snapshots bypass the global application event bus", ()=>{
  const handlers = new Map();
  const socket = {on:(event, handler)=>handlers.set(event, handler)};
  const multiplayer = {
    serverEnemies:new Map(),
    coopInstanceId:null,
    portalInstance:null,
    portalAlly:null,
    portalBeacons:[],
    portalObjective:null,
    outgoingGroupInvites:[],
    invites:[]
  };
  const changes = [];
  installWorldSocketListeners({
    socket,
    multiplayer,
    replaceServerEnemies:(payload, scope)=>replaceServerEnemies(multiplayer, payload, scope),
    emitChange:(...args)=>changes.push(args),
    toast:()=>{}
  });

  handlers.get("coop:enemies")({
    instanceId:"P-1",
    portal:{id:"ricky"},
    objective:{stage:"route_1"},
    enemies:[makeEnemy(1)]
  });

  assert.equal(multiplayer.coopInstanceId, "P-1");
  assert.equal(multiplayer.serverEnemies.has("enemy-1"), true);
  assert.equal(changes.length, 0);
});

test("normal world enemies resume after a portal instance is cleared", ()=>{
  const handlers = new Map();
  const socket = {on:(event, handler)=>handlers.set(event, handler)};
  const multiplayer = {
    serverEnemies:new Map(),
    coopInstanceId:null,
    portalInstance:null,
    portalAlly:null,
    portalBeacons:[],
    portalObjective:null,
    outgoingGroupInvites:[],
    invites:[]
  };
  installWorldSocketListeners({
    socket,
    multiplayer,
    replaceServerEnemies:(payload, scope)=>replaceServerEnemies(multiplayer, payload, scope),
    emitChange:()=>{},
    toast:()=>{}
  });

  handlers.get("coop:enemies")({
    instanceId:"P-deadly",
    portal:{id:"ricky"},
    enemies:[makeEnemy("deadly")]
  });
  handlers.get("world:enemies")({enemies:[makeEnemy("blocked")]});
  assert.equal(multiplayer.serverEnemies.has("enemy-blocked"), false);

  handlers.get("coop:enemies")({instanceId:null, portal:null, enemies:[]});
  handlers.get("world:enemies")({enemies:[makeEnemy("normal")]});

  assert.equal(multiplayer.coopInstanceId, null);
  assert.equal(multiplayer.portalInstance, null);
  assert.equal(multiplayer.serverEnemyScope, "world");
  assert.equal(multiplayer.serverEnemies.has("enemy-normal"), true);
});

test("large server enemy sets preserve runtime objects during linear synchronization", ()=>{
  const serverEnemies = new Map();
  const enemies = [];
  for(let index = 0; index < 100; index += 1){
    const source = {...makeEnemy(index, index * 25), samples:[]};
    serverEnemies.set(source.id, source);
    enemies.push({...source, serverControlled:true, serverId:source.id});
  }
  const previous = [...enemies];
  const selectedEnemy = enemies[50];
  const synced = syncServerControlledEnemies({
    enemies,
    multiplayerState:{serverEnemies},
    selectedEnemy
  });

  assert.equal(synced.enemies.length, 100);
  assert.equal(synced.selectedEnemy, selectedEnemy);
  for(let index = 0; index < previous.length; index += 1){
    assert.equal(synced.enemies[index], previous[index]);
  }
});
