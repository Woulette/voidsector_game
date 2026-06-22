import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { emitCombatHitToAudience } from "../src/combat/enemyHits.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerCombatHandlers } from "../src/socket/combatHandlers.js";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";

function createSocket(){
  const handlers = new Map();
  const emitted = [];
  return {
    handlers,
    emitted,
    on(eventName, handler){
      handlers.set(eventName, handler);
    },
    emit(eventName, payload){
      emitted.push({eventName, payload});
    }
  };
}

test("combat socket only accepts server-calculated fire and loot pickup", ()=>{
  const socket = createSocket();
  registerCombatHandlers(socket, {
    applyEnemyHit(){},
    applyPlayerHit(){},
    guard:()=>true,
    pickupLoot(){}
  });

  assert.deepEqual([...socket.handlers.keys()].sort(), ["combat:fire", "combat:fire-player", "loot:pickup", "ship:ability-use"]);
  assert.equal(socket.handlers.has("enemy:hit"), false);
  assert.equal(socket.handlers.has("coop:enemy-hit"), false);
});

test("ship ability socket forwards only the requested ability id", ()=>{
  const socket = createSocket();
  const requested = [];
  registerCombatHandlers(socket, {
    activateShipAbility:abilityId=>requested.push(abilityId),
    guard:()=>true
  });

  socket.handlers.get("ship:ability-use")({abilityId:"absorbing_fire", forgedDamage:999_999});
  assert.deepEqual(requested, ["absorbing_fire"]);
});

test("client combat command never sends a damage amount", ()=>{
  const emitted = [];
  const commands = createCombatCommands({
    multiplayer:{
      connected:true,
      auth:{account:{id:"account-1"}, profileReady:true},
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });

  commands.sendServerEnemyHit("enemy-1", {
    weaponClass:"laser",
    ammoId:"ammo_x1",
    count:1
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].eventName, "combat:fire");
  assert.equal(Object.hasOwn(emitted[0].payload, "amount"), false);
  assert.equal(Object.hasOwn(emitted[0].payload, "serverCalculated"), false);
});

test("client pvp combat command never sends a damage amount", ()=>{
  const emitted = [];
  const commands = createCombatCommands({
    multiplayer:{
      connected:true,
      auth:{account:{id:"account-1"}, profileReady:true},
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });

  commands.sendServerPlayerHit("player-2", {
    weaponClass:"laser",
    ammoId:"ammo_x1",
    count:1
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].eventName, "combat:fire-player");
  assert.equal(Object.hasOwn(emitted[0].payload, "amount"), false);
  assert.equal(Object.hasOwn(emitted[0].payload, "damage"), false);
});

test("client remote weapon effect keeps exact ammo and missile salvo geometry", ()=>{
  const emitted = [];
  const commands = createCombatCommands({
    multiplayer:{
      connected:true,
      auth:{account:{id:"account-1"}, profileReady:true},
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });
  const starts = [
    {x:10, y:20, curveSide:1, curveStrength:46},
    {x:10, y:50, curveSide:-1, curveStrength:54}
  ];
  commands.sendPlayerLaserEffect({
    kind:"missile",
    ammoId:"missile_m2",
    targetId:"enemy-1",
    starts,
    toX:500,
    toY:600,
    travelTime:.8
  });

  assert.equal(emitted[0].eventName, "player:laser");
  assert.equal(emitted[0].payload.ammoId, "missile_m2");
  assert.deepEqual(emitted[0].payload.starts, starts);
  assert.equal(Object.hasOwn(emitted[0].payload, "damage"), false);
});

test("client combat commands emit nothing before the account profile is ready", ()=>{
  const emitted = [];
  const commands = createCombatCommands({
    multiplayer:{
      connected:true,
      auth:{account:null, profileReady:false},
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });

  commands.sendServerEnemyHit("enemy-1", {weaponClass:"laser", ammoId:"ammo_x1"});
  commands.sendServerPlayerHit("player-2", {weaponClass:"laser", ammoId:"ammo_x1"});
  commands.sendPlayerLaserEffect({kind:"laser", ammoId:"ammo_x1"});

  assert.deepEqual(emitted, []);
});

test("combat:fire ignores a forged client damage amount", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  const player = {
    id:"security-test-forged-damage",
    state:{x:0, y:0, shipId:"orion"}
  };
  const enemy = {x:100, y:0};
  const ammoBefore = profile.ammoInventory.ammo_x1;

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy,
    payload:{
      weaponClass:"laser",
      ammoId:"ammo_x1",
      amount:999999999
    }
  });

  assert.equal(result.ok, true);
  assert.ok(result.damage === 0 || (result.damage >= 35 && result.damage <= 60));
  assert.notEqual(result.damage, 999999999);
  assert.equal(profile.ammoInventory.ammo_x1, ammoBefore - 1);
  assert.equal(profile.player.laserShotsFired, 1);
});

test("combat:fire rejects an out-of-range target without consuming ammo", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  const player = {
    id:"security-test-range",
    state:{x:0, y:0, shipId:"orion"}
  };
  const ammoBefore = profile.ammoInventory.ammo_x1;

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy:{x:5000, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"}
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /portee/i);
  assert.equal(profile.ammoInventory.ammo_x1, ammoBefore);
  assert.equal(profile.player.laserShotsFired, 0);
});

test("server laser range uses the shortest equipped ship laser", ()=>{
  const profile = createDefaultProfile();
  profile.inventoryItems.push({uid:"inv_test_laser_mk3", itemId:"laser_mk3"});
  profile.shipLoadouts.orion.lasers = ["inv_laser_mk1_1", "inv_test_laser_mk3"];
  const player = {id:"security-test-shortest-range", state:{x:0, y:0, shipId:"orion"}};

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy:{x:700, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"}
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /portee/i);
});

test("server drone lasers do not reduce an equipped ship laser range", ()=>{
  const profile = createDefaultProfile();
  profile.inventoryItems.push(
    {uid:"inv_test_laser_mk3", itemId:"laser_mk3"},
    {uid:"inv_test_drone_laser_mk1", itemId:"laser_mk1"}
  );
  profile.shipLoadouts.orion.lasers = ["inv_test_laser_mk3"];
  profile.droneLoadout = ["inv_test_drone_laser_mk1"];
  const player = {id:"security-test-drone-range", state:{x:0, y:0, shipId:"orion"}};

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy:{x:700, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"},
    random:()=>0
  });

  assert.equal(result.ok, true);
  assert.equal(result.range, 550);
});

test("server uses the shortest drone laser range when the ship has no laser", ()=>{
  const profile = createDefaultProfile();
  profile.inventoryItems.push(
    {uid:"inv_test_drone_laser_mk1", itemId:"laser_mk1"},
    {uid:"inv_test_drone_laser_mk3", itemId:"laser_mk3"}
  );
  profile.shipLoadouts.orion.lasers = [];
  profile.droneLoadout = ["inv_test_drone_laser_mk1", "inv_test_drone_laser_mk3"];
  const player = {id:"security-test-drone-only-range", state:{x:0, y:0, shipId:"orion"}};

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy:{x:700, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"}
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /portee/i);
});

test("server combat hit is broadcast to players in the same map room", ()=>{
  const roomEvents = [];
  const socketEvents = [];
  emitCombatHitToAudience({
    io:{to:room=>({emit:(eventName, payload)=>roomEvents.push({room, eventName, payload})})},
    socket:{emit:(eventName, payload)=>socketEvents.push({eventName, payload})},
    player:{mapRoom:"map:0"},
    group:null,
    payload:{enemyId:"enemy-1", damage:42}
  });

  assert.deepEqual(roomEvents, [{
    room:"map:0",
    eventName:"combat:hit",
    payload:{enemyId:"enemy-1", damage:42}
  }]);
  assert.equal(socketEvents.length, 0);
});

test("instance combat hit uses the isolated instance room instead of the group room", ()=>{
  const roomEvents = [];
  emitCombatHitToAudience({
    io:{to:room=>({emit:(eventName, payload)=>roomEvents.push({room, eventName, payload})})},
    socket:{emit(){}},
    player:{mapRoom:"instance:portal-1"},
    group:{id:"group-1"},
    payload:{enemyId:"enemy-1", damage:42}
  });

  assert.equal(roomEvents[0].room, "instance:portal-1");
});
