import assert from "node:assert/strict";
import test from "node:test";
import { ammoTypes, ships } from "../../src/data/catalog.js";
import { getShipCombatStats } from "../../src/core/combatStatsStore.js";
import { normalizeState, store } from "../../src/core/store.js";
import { createWeaponSystem } from "../../src/game/systems/weapons.js";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import {
  depositServerCombatBoostMaterial,
  getServerCombatTimedBoostPercent
} from "../src/economy/combatBoosts.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getTrustedMovementSpeed } from "../src/players/playerStateValidation.js";

function addInventoryItem(profile, uid, itemId){
  profile.inventoryItems.push({uid, itemId});
  return uid;
}

test("server perfection deposit consumes ship cargo and persists a timed generator boost", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.shipCargo = {orion:{plaque_nickel_titane:10}};

  const result = depositServerCombatBoostMaterial(profile, {
    target:"Generateurs",
    materialId:"plaque_nickel_titane",
    amount:10,
    shipId:"orion",
    now:1000
  });

  assert.equal(result.ok, true);
  assert.equal(profile.shipCargo.orion.plaque_nickel_titane, 0);
  assert.equal(profile.combatBoosts.generator.plaque_nickel_titane.expiresAt, 601000);
  assert.equal(getServerCombatTimedBoostPercent(profile, "generator", 2000), 0.10);
});

test("server perfection rejects an incompatible material without consuming it", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.shipCargo = {orion:{alliage_cuivre_zinc:5}};

  const result = depositServerCombatBoostMaterial(profile, {
    target:"generator",
    materialId:"alliage_cuivre_zinc",
    amount:5,
    shipId:"orion"
  });

  assert.equal(result.ok, false);
  assert.equal(profile.shipCargo.orion.alliage_cuivre_zinc, 5);
});

test("generator boost multiplies total speed after base ship and generator speed", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "valkyrie";
  const generatorUids = Array.from({length:4}, (_, index)=>addInventoryItem(profile, `engine-${index}`, "engine_ion"));
  profile.shipLoadouts.valkyrie = {lasers:[], generators:generatorUids, extras:[]};
  profile.combatBoosts = {
    laser:{},
    rocket:{},
    generator:{plaque_nickel_titane:{materialId:"plaque_nickel_titane", percent:0.10, expiresAt:Date.now() + 60_000}},
    drone:{}
  };

  const baseSpeed = ships.find(ship=>ship.id === "valkyrie").stats.vitesse;
  assert.equal(getTrustedMovementSpeed(profile), (baseSpeed + 4 * 4) * 1.10);
});

test("client generator speed follows the same total-stat formula", ()=>{
  const previousState = store.state;
  try{
    store.state = normalizeState(null);
    store.state.activeShip = "valkyrie";
    store.state.inventoryItems.push(
      ...Array.from({length:4}, (_, index)=>({uid:`client-engine-${index}`, itemId:"engine_ion"}))
    );
    store.state.shipLoadouts.valkyrie = {
      lasers:[],
      generators:Array.from({length:4}, (_, index)=>`client-engine-${index}`),
      extras:[]
    };
    store.state.combatBoosts.generator.plaque_nickel_titane = {
      materialId:"plaque_nickel_titane",
      percent:0.10,
      seconds:60,
      charges:0
    };

    const stats = getShipCombatStats("valkyrie");
    assert.equal(stats.vitesse, (300 + 4 * 4) * 1.10);
    assert.equal(stats.vitesseReelle, 348);
  }finally{
    store.state = previousState;
  }
});

test("server laser damage applies laser, drone and faction boosts and consumes laser charges", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  addInventoryItem(profile, "drone-laser", "laser_mk1");
  profile.ownedDroneCount = 1;
  profile.droneLoadout = ["drone-laser"];
  profile.combatBoosts = {
    laser:{alliage_cuivre_zinc:{materialId:"alliage_cuivre_zinc", percent:0.10, charges:10}},
    rocket:{},
    generator:{},
    drone:{plaque_nickel_titane:{materialId:"plaque_nickel_titane", percent:0.10, expiresAt:Date.now() + 60_000}}
  };
  const result = resolveServerCombatFire({
    player:{id:"combat-boost-laser", state:{x:0, y:0, shipId:"orion"}},
    profile,
    enemy:{x:100, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"},
    firmDamageBonus:0.10,
    random:()=>0
  });

  assert.equal(result.ok, true);
  assert.equal(result.damage, 89);
  assert.equal(result.boostPercent, 0.10);
  assert.equal(result.droneBoostPercent, 0.10);
  assert.equal(result.firmDamageBonus, 0.10);
  assert.equal(profile.combatBoosts.laser.alliage_cuivre_zinc.charges, 8);
});

test("server rocket damage applies and consumes the rocket perfection boost", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  const launcherUid = addInventoryItem(profile, "rocket-launcher", "launcher_rocket_mk1");
  profile.shipLoadouts.orion.rocketLauncher = launcherUid;
  profile.ammoInventory.rocket_r1 = 1;
  profile.combatBoosts = {
    laser:{},
    rocket:{alliage_cuivre_zinc:{materialId:"alliage_cuivre_zinc", percent:0.10, charges:1}},
    generator:{},
    drone:{}
  };
  const rocket = ammoTypes.find(ammo=>ammo.id === "rocket_r1");
  const result = resolveServerCombatFire({
    player:{id:"combat-boost-rocket", state:{x:0, y:0, shipId:"orion"}},
    profile,
    enemy:{x:100, y:0},
    payload:{weaponClass:"rocket", ammoId:"rocket_r1"},
    random:()=>0
  });

  assert.equal(result.ok, true);
  assert.equal(result.damage, Math.round(rocket.damageMin * 1.10));
  assert.equal(result.boostPercent, 0.10);
  assert.equal(profile.combatBoosts.rocket.alliage_cuivre_zinc.charges, 0);
});

test("MMO-only weapon volley exposes geometry without local damage or boost consumption", ()=>{
  const consumedTargets = [];
  const system = createWeaponSystem({
    getPlayer:()=>({damageBonus:0, damageMultiplier:1}),
    getActiveShip:()=>"orion",
    getEquippedLasers:()=>[{id:"ship-laser", weapon:{minDamage:10, maxDamage:10, range:500}}],
    getEquippedDroneLasers:()=>[{id:"drone-laser", weapon:{minDamage:10, maxDamage:10, range:500}, droneDamageMultiplier:1}],
    getEquipmentUpgradeLevel:()=>0,
    consumeCombatBoostCharges:target=>{
      consumedTargets.push(target);
      return 0;
    },
    getCombatTimedBoostPercent:target=>target === "drone" ? 0.10 : 0
  });

  const volley = system.getLaserVolley();
  assert.equal(volley.count, 2);
  assert.equal(volley.rollDamage, undefined);
  assert.deepEqual(consumedTargets, []);
});

test("multiplayer perfection command sends a server action with the active ship cargo source", ()=>{
  const emitted = [];
  const commands = createSocketCommands({
    multiplayer:{
      connected:true,
      auth:{account:{id:"account-1"}, profileReady:true},
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });

  assert.equal(commands.depositServerCombatBoostMaterial({
    target:"Generateurs",
    materialId:"plaque_nickel_titane",
    amount:10,
    shipId:"valkyrie"
  }), true);
  assert.deepEqual(emitted, [{
    eventName:"refinery:combat-boost-deposit",
    payload:{
      target:"Generateurs",
      materialId:"plaque_nickel_titane",
      amount:10,
      shipId:"valkyrie"
    }
  }]);
});
