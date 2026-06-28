import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { emitCombatHitToAudience } from "../src/combat/enemyHits.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerCombatHandlers } from "../src/socket/combatHandlers.js";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";
import { ammoTypes, equipment } from "../../src/data/equipment.js";

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

test("combat:fire does not reserve cooldown when ammo is missing", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.ammoInventory.ammo_x1 = 0;
  const player = {
    id:"security-test-no-ammo-cooldown",
    state:{x:0, y:0, shipId:"orion"}
  };
  const enemy = {x:100, y:0};
  const payload = {weaponClass:"laser", ammoId:"ammo_x1"};

  const missingAmmo = resolveServerCombatFire({
    player,
    profile,
    enemy,
    payload,
    now:20_000
  });
  profile.ammoInventory.ammo_x1 = 10;
  const withAmmo = resolveServerCombatFire({
    player,
    profile,
    enemy,
    payload,
    random:()=>0,
    now:20_000
  });

  assert.equal(missingAmmo.ok, false);
  assert.match(missingAmmo.reason, /Munitions/i);
  assert.equal(withAmmo.ok, true);
  assert.equal(withAmmo.reason, undefined);
  assert.equal(profile.ammoInventory.ammo_x1, 9);
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

test("server missile salvo rolls accuracy independently per missile", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.inventoryItems.push({uid:"inv_test_missile_launcher", itemId:"launcher_missile_mk1"});
  profile.shipLoadouts.orion.missileLauncher = "inv_test_missile_launcher";
  profile.ammoInventory.missile_m1 = 10;
  const rolls = [
    0.10, 1.00,
    0.95,
    0.20, 1.00
  ];

  const result = resolveServerCombatFire({
    player:{id:"security-test-missile-salvo", state:{x:0, y:0, shipId:"orion"}},
    profile,
    enemy:{x:100, y:0},
    payload:{weaponClass:"missile", ammoId:"missile_m1", count:3},
    random:()=>rolls.shift() ?? 0
  });

  assert.equal(result.ok, true);
  assert.equal(result.hit, true);
  assert.equal(result.consumed, 3);
  assert.equal(result.missileHits, 2);
  assert.equal(result.missileMisses, 1);
  assert.equal(result.damage, 5000);
  assert.equal(profile.ammoInventory.missile_m1, 7);
  assert.equal(profile.player.missileShotsFired, 3);
});

test("server rocket range is owned by the launcher, not stale ammo metadata", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.inventoryItems.push({uid:"inv_test_rocket_launcher", itemId:"launcher_rocket_mk1"});
  profile.shipLoadouts.orion.rocketLauncher = "inv_test_rocket_launcher";
  profile.ammoInventory.rocket_r1 = 1;
  const rocket = ammoTypes.find(ammo=>ammo.id === "rocket_r1");
  const launcher = equipment.find(item=>item.id === "launcher_rocket_mk1");
  const originalAmmoRange = rocket.range;
  const originalLauncherRange = launcher.effect.rocketRange;
  try{
    rocket.range = 5000;
    launcher.effect.rocketRange = 200;
    const result = resolveServerCombatFire({
      player:{id:"security-test-rocket-range", state:{x:0, y:0, shipId:"orion"}},
      profile,
      enemy:{x:390, y:0},
      payload:{weaponClass:"rocket", ammoId:"rocket_r1"},
      random:()=>0
    });

    assert.equal(result.ok, false);
    assert.match(result.reason, /portee/i);
    assert.equal(profile.ammoInventory.rocket_r1, 1);
  }finally{
    if(originalAmmoRange === undefined) delete rocket.range;
    else rocket.range = originalAmmoRange;
    launcher.effect.rocketRange = originalLauncherRange;
  }
});

test("server missile damage applies drone formation missile multipliers", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.activeDroneFormation = "cuirasse";
  profile.inventoryItems.push({uid:"inv_test_missile_launcher", itemId:"launcher_missile_mk1"});
  profile.shipLoadouts.orion.missileLauncher = "inv_test_missile_launcher";
  profile.ammoInventory.missile_m1 = 1;

  const result = resolveServerCombatFire({
    player:{id:"security-test-missile-formation", state:{x:0, y:0, shipId:"orion"}},
    profile,
    enemy:{x:100, y:0},
    payload:{weaponClass:"missile", ammoId:"missile_m1", count:1},
    random:()=>0
  });

  assert.equal(result.ok, true);
  assert.equal(result.damage, 1350);
  assert.equal(result.missileHits, 1);
  assert.equal(profile.ammoInventory.missile_m1, 0);
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
