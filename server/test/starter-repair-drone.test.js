import assert from "node:assert/strict";
import test from "node:test";
import { equipInventoryUid, unequipShipLoadout, unequipSlot } from "../src/economy/equipment.js";
import { createDefaultProfile, ensureStarterRepairDrone } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

function countStarterRepair(profile){
  return profile.inventoryItems.filter(entry=>entry.itemId === "extra_repair_starter").length;
}

test("starter repair drone is created once and equipped only on Orion", ()=>{
  const profile = createDefaultProfile();

  assert.equal(countStarterRepair(profile), 1);
  assert.equal(profile.shipLoadouts.orion.extras[0], "inv_repair_starter_2");
  assert.equal(profile.shipLoadouts.test_runner, undefined);
  assert.equal(profile.starterRepairGranted, true);
});

test("starter repair drone can be unequipped from Orion without being forced back", ()=>{
  const profile = createDefaultProfile();

  const result = unequipSlot(profile, {type:"extra", index:0, shipId:"orion"});
  assert.equal(result.ok, true);
  assert.equal(profile.shipLoadouts.orion.extras[0], null);

  ensureStarterRepairDrone(profile);

  assert.equal(countStarterRepair(profile), 1);
  assert.equal(profile.shipLoadouts.orion.extras[0], null);
});

test("moving starter repair drone to another ship does not duplicate it", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("velox");
  profile.shipLoadouts.velox = {lasers:[], generators:[], extras:[null, null, null]};

  const result = equipInventoryUid(profile, {
    type:"extra",
    index:0,
    inventoryUid:"inv_repair_starter_2",
    shipId:"velox"
  });

  assert.equal(result.ok, true);
  assert.equal(profile.shipLoadouts.orion.extras[0], null);
  assert.equal(profile.shipLoadouts.velox.extras[0], "inv_repair_starter_2");
  assert.equal(countStarterRepair(profile), 1);
});

test("repair drone variants replace each other in the same extra slot", ()=>{
  const profile = createDefaultProfile();
  profile.shipLoadouts.test_runner = {
    lasers:[],
    missileLauncher:null,
    rocketLauncher:null,
    generators:[],
    extras:["inv_repair_starter_2", null, null, null, null]
  };
  profile.shipLoadouts.orion.extras[0] = null;
  profile.inventoryItems.push(
    {uid:"inv_repair_red_test", itemId:"extra_repair_bot"},
    {uid:"inv_repair_blue_test", itemId:"extra_repair_starter"}
  );

  const red = equipInventoryUid(profile, {
    type:"extra",
    index:2,
    inventoryUid:"inv_repair_red_test",
    shipId:"test_runner"
  });
  assert.equal(red.ok, true);
  assert.equal(red.target.index, 0);
  assert.deepEqual(profile.shipLoadouts.test_runner.extras.slice(0, 3), ["inv_repair_red_test", null, null]);

  const blue = equipInventoryUid(profile, {
    type:"extra",
    index:2,
    inventoryUid:"inv_repair_blue_test",
    shipId:"test_runner"
  });
  assert.equal(blue.ok, true);
  assert.equal(blue.target.index, 0);
  assert.deepEqual(profile.shipLoadouts.test_runner.extras.slice(0, 3), ["inv_repair_blue_test", null, null]);
});

test("a second copy of an extra replaces the equipped copy while different extras coexist", ()=>{
  const profile = createDefaultProfile();
  profile.inventoryItems.push(
    {uid:"inv_auto_rocket_a", itemId:"extra_auto_rocket"},
    {uid:"inv_auto_rocket_b", itemId:"extra_auto_rocket"},
    {uid:"inv_auto_missile", itemId:"extra_auto_missile"}
  );
  profile.shipLoadouts.test_runner = {
    lasers:[],
    missileLauncher:null,
    rocketLauncher:null,
    generators:[],
    extras:["inv_auto_rocket_a", "inv_auto_missile", "inv_repair_starter_2", null, null]
  };
  profile.shipLoadouts.orion.extras[0] = null;

  const result = equipInventoryUid(profile, {
    type:"extra",
    index:2,
    inventoryUid:"inv_auto_rocket_b",
    shipId:"test_runner"
  });

  assert.equal(result.ok, true);
  assert.equal(result.target.index, 0);
  assert.deepEqual(
    profile.shipLoadouts.test_runner.extras,
    ["inv_auto_rocket_b", "inv_auto_missile", "inv_repair_starter_2", null, null]
  );
});

test("profile sanitization removes legacy duplicate extra families", ()=>{
  const profile = sanitizeProfile({
    starterRepairGranted:true,
    ownedShips:["orion", "test_runner"],
    inventoryItems:[
      {uid:"inv_repair_blue", itemId:"extra_repair_starter"},
      {uid:"inv_repair_red", itemId:"extra_repair_bot"},
      {uid:"inv_auto_missile", itemId:"extra_auto_missile"}
    ],
    shipLoadouts:{
      test_runner:{
        lasers:[],
        generators:[],
        extras:["inv_repair_blue", "inv_repair_red", "inv_auto_missile"]
      }
    }
  });

  assert.deepEqual(
    profile.shipLoadouts.test_runner.extras,
    ["inv_repair_blue", null, "inv_auto_missile"]
  );
});

test("duplicate equipped starter uid from old profiles is kept only once", ()=>{
  const profile = sanitizeProfile({
    starterRepairGranted:true,
    inventoryItems:[{uid:"inv_laser_mk1_1", itemId:"laser_mk1"}, {uid:"inv_repair_starter_2", itemId:"extra_repair_starter"}],
    shipLoadouts:{
      orion:{lasers:["inv_laser_mk1_1"], generators:[], extras:["inv_repair_starter_2", null, null]},
      velox:{lasers:[], generators:[], extras:["inv_repair_starter_2", null, null]}
    }
  });

  assert.equal(profile.shipLoadouts.orion.extras[0], "inv_repair_starter_2");
  assert.equal(profile.shipLoadouts.velox.extras[0], null);
  assert.equal(countStarterRepair(profile), 1);
});

test("invalid per-ship action bars sanitize to empty slots instead of starter slots", ()=>{
  const profile = sanitizeProfile({
    starterRepairGranted:true,
    actionSlots:["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"],
    actionSlotsByShip:{
      orion:["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"],
      razorion:null
    },
    inventoryItems:[{uid:"inv_repair_starter_2", itemId:"extra_repair_starter"}]
  });

  assert.deepEqual(profile.actionSlotsByShip.razorion, [null, null, null, null, null, null, null, null, null]);
  assert.deepEqual(profile.actionSlotsByShip.orion, ["ammo_x1", null, null, null, null, null, null, null, "extra_repair_starter"]);
});

test("unequip ship loadout clears every ship slot without deleting inventory items", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("velox");
  profile.inventoryItems.push(
    {uid:"inv_laser_test", itemId:"laser_mk2"},
    {uid:"inv_generator_test", itemId:"shield_gen"},
    {uid:"inv_missile_launcher_test", itemId:"launcher_missile_mk1"},
    {uid:"inv_rocket_launcher_test", itemId:"launcher_rocket_mk1"},
    {uid:"inv_extra_test", itemId:"extra_auto_rocket"}
  );
  profile.shipLoadouts.velox = {
    lasers:["inv_laser_test", null, null],
    missileLauncher:"inv_missile_launcher_test",
    rocketLauncher:"inv_rocket_launcher_test",
    generators:["inv_generator_test", null, null],
    extras:["inv_extra_test", null]
  };

  const result = unequipShipLoadout(profile, {shipId:"velox"});

  assert.equal(result.ok, true);
  assert.equal(result.count, 5);
  assert.deepEqual(profile.shipLoadouts.velox.lasers, [null, null, null]);
  assert.equal(profile.shipLoadouts.velox.missileLauncher, null);
  assert.equal(profile.shipLoadouts.velox.rocketLauncher, null);
  assert.deepEqual(profile.shipLoadouts.velox.generators, [null, null, null]);
  assert.deepEqual(profile.shipLoadouts.velox.extras, [null, null]);
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "inv_laser_test"), true);
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "inv_extra_test"), true);
});
