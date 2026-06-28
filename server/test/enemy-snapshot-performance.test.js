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
  const serverEnemies = multiplayer.serverEnemies;
  const serverEnemy = serverEnemies.get("enemy-1");
  replaceServerEnemies(multiplayer, {
    mapId:"0",
    delta:true,
    enemies:[{id:"enemy-1", x:55, y:80, hp:75, shield:12, angle:.5, vx:20, vy:0, moving:true}]
  }, "world");

  assert.equal(multiplayer.serverEnemies, serverEnemies);
  const enemy = multiplayer.serverEnemies.get("enemy-1");
  assert.equal(enemy, serverEnemy);
  assert.equal(enemy.kind, "drone_pirate");
  assert.equal(enemy.img, "drone.png");
  assert.equal(enemy.maxHp, 100);
  assert.equal(enemy.hp, 75);
  assert.equal(enemy.x, 55);
  assert.equal(enemy.samples.length, 2);
});

test("enemy delta snapshots remove missing enemies without replacing the map", ()=>{
  const multiplayer = {serverEnemies:new Map(), serverEnemyDefinitions:new Map()};
  replaceServerEnemies(multiplayer, {
    mapId:"0",
    full:true,
    enemies:[makeEnemy(1, 10), makeEnemy(2, 20)]
  }, "world");
  const serverEnemies = multiplayer.serverEnemies;

  replaceServerEnemies(multiplayer, {
    mapId:"0",
    delta:true,
    enemies:[{id:"enemy-1", x:55, y:80, hp:75, angle:.5, vx:20, vy:0, moving:true}]
  }, "world");

  assert.equal(multiplayer.serverEnemies, serverEnemies);
  assert.equal(multiplayer.serverEnemies.has("enemy-1"), true);
  assert.equal(multiplayer.serverEnemies.has("enemy-2"), false);
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

test("server enemy sync caps visual correction instead of snapping mid-combat", ()=>{
  const serverEnemy = {
    id:"enemy-jump",
    kind:"drone_pirate",
    type:"Drone",
    img:"drone.png",
    x:400,
    y:0,
    angle:0,
    vx:0,
    vy:0,
    moving:false,
    hp:100,
    maxHp:100
  };
  const existing = {
    ...serverEnemy,
    serverControlled:true,
    serverId:"enemy-jump",
    x:0,
    y:0,
    lastServerVisualAt:1000
  };
  const synced = syncServerControlledEnemies({
    enemies:[existing],
    multiplayerState:{serverEnemies:new Map([["enemy-jump", serverEnemy]])},
    selectedEnemy:null,
    now:1016
  });

  assert.equal(synced.enemies[0], existing);
  assert.equal(existing.serverX, 400);
  assert.ok(Math.abs(existing.x - 11.52) < 0.001);
});

test("server enemy sync scales visual correction with frame time", ()=>{
  const serverEnemy = {
    id:"enemy-high-refresh",
    kind:"drone_pirate",
    type:"Drone",
    img:"drone.png",
    x:400,
    y:0,
    angle:0,
    vx:0,
    vy:0,
    moving:false,
    hp:100,
    maxHp:100
  };
  const existing = {
    ...serverEnemy,
    serverControlled:true,
    serverId:"enemy-high-refresh",
    x:0,
    y:0,
    lastServerVisualAt:1000
  };
  syncServerControlledEnemies({
    enemies:[existing],
    multiplayerState:{serverEnemies:new Map([["enemy-high-refresh", serverEnemy]])},
    selectedEnemy:null,
    now:1004
  });

  assert.equal(existing.serverX, 400);
  assert.ok(Math.abs(existing.x - 3) < 0.001);
});

test("server enemy sync keeps near-threshold corrections smooth instead of jumping to the cap", ()=>{
  const serverEnemy = {
    id:"enemy-soft-threshold",
    kind:"drone_pirate",
    type:"Drone",
    img:"drone.png",
    x:5.1,
    y:0,
    angle:0,
    vx:0,
    vy:0,
    moving:false,
    hp:100,
    maxHp:100
  };
  const existing = {
    ...serverEnemy,
    serverControlled:true,
    serverId:"enemy-soft-threshold",
    x:0,
    y:0,
    lastServerVisualAt:1000
  };
  syncServerControlledEnemies({
    enemies:[existing],
    multiplayerState:{serverEnemies:new Map([["enemy-soft-threshold", serverEnemy]])},
    selectedEnemy:null,
    now:1004
  });

  assert.ok(Math.abs(existing.x - 0.918) < 0.001);
});

test("crowded enemy sync uses a softer visual correction factor", ()=>{
  const serverEnemies = new Map();
  const enemies = [];
  for(let index = 0; index < 40; index += 1){
    const id = `enemy-crowded-${index}`;
    const serverEnemy = {
      id,
      kind:"drone_pirate",
      type:"Drone",
      img:"drone.png",
      x:5,
      y:0,
      angle:0,
      vx:0,
      vy:0,
      moving:false,
      hp:100,
      maxHp:100
    };
    serverEnemies.set(id, serverEnemy);
    enemies.push({
      ...serverEnemy,
      serverControlled:true,
      serverId:id,
      x:0,
      y:0,
      lastServerVisualAt:1000
    });
  }

  syncServerControlledEnemies({
    enemies,
    multiplayerState:{serverEnemies},
    selectedEnemy:null,
    now:1004
  });

  assert.ok(Math.abs(enemies[0].x - 0.6) < 0.001);
});
