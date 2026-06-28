import assert from "node:assert/strict";
import test from "node:test";
import { ships } from "../../src/data/ships.js";
import { getShipAbilityStatuses } from "../../src/shared/shipAbilities.js";
import { activateServerShipAbility, applyServerLaserDoubleStrike } from "../src/combat/shipAbilities.js";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { getShipPurchase } from "../src/economy/shop.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";

test("Asterion exposes the requested premium stats and violet portal gate", ()=>{
  const ship = ships.find(entry=>entry.id === "asterion");
  assert.ok(ship);
  assert.equal(ship.name, "Asterion");
  assert.equal(ship.priceType, "premium");
  assert.equal(ship.price, 150_000);
  assert.equal(ship.requiresCompletedPortal, "violet");
  assert.equal(ship.abilityId, "spectral_double_shot");
  assert.equal(ship.renderWidth, 122);
  assert.equal(ship.renderHeight, 132);
  assert.deepEqual(ship.stats, {
    vie:180_000,
    vitesse:330,
    cargo:2_000,
    maxLasers:10,
    maxGenerators:14,
    maxExtras:8,
    maxRocketLaunchers:1,
    maxMissileLaunchers:1
  });
});

test("server refuses Asterion before the violet portal and charges it only once", ()=>{
  const purchase = getShipPurchase("asterion");
  const profile = createDefaultProfile();
  profile.player.premium = 200_000;
  const profiles = new Map([["account:asterion-shop", profile]]);
  const player = {id:"socket-asterion-shop", accountId:"asterion-shop"};
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:asterion-shop", profile:profiles.get("account:asterion-shop")})
  });

  const locked = actions.addShipPurchase({player, purchase});
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /violet/i);
  assert.equal(profiles.get("account:asterion-shop").player.premium, 200_000);

  profiles.get("account:asterion-shop").completedPortals.violet = 1;
  const bought = actions.addShipPurchase({player, purchase});
  assert.equal(bought.ok, true);
  assert.equal(bought.profile.player.premium, 50_000);
  assert.equal(bought.profile.ownedShips.includes("asterion"), true);

  const duplicate = actions.addShipPurchase({player, purchase});
  assert.equal(duplicate.ok, false);
  assert.equal(profiles.get("account:asterion-shop").player.premium, 50_000);
});

test("Asterion spectral volley activates for 30 seconds and cools down for 3 minutes", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("asterion");
  profile.activeShip = "asterion";
  const player = {
    id:"socket-asterion-ability",
    state:{shipId:"asterion", hp:180_000, maxHp:180_000}
  };

  const activation = activateServerShipAbility({player, profile, abilityId:"spectral_double_shot", now:1_000});
  assert.equal(activation.ok, true);
  assert.equal(activation.status.activeUntil, 31_000);
  assert.equal(activation.status.cooldownUntil, 181_000);

  const states = getShipAbilityStatuses("asterion", profile.shipAbilityStates.asterion, 1_500);
  assert.equal(states.length, 1);
  assert.equal(states[0].effectType, "laser_double_strike");
  assert.equal(states[0].chargeMs, 3_000);
  assert.equal(states[0].chargeSegments, 3);
  assert.equal(states[0].chargeStartedAt, 1_000);
  assert.equal(states[0].chargeReadyAt, 4_000);
  assert.equal(states[0].chargeReady, false);
  assert.equal(states[0].icon, "assets/icons/spectral_double_shot.svg");

  const blocked = activateServerShipAbility({player, profile, abilityId:"spectral_double_shot", now:180_999});
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /recharge/i);
});

test("Asterion spectral volley stores a 3 second charge consumed by the next laser attack", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("asterion");
  profile.activeShip = "asterion";
  const player = {
    id:"socket-asterion-sequence",
    state:{shipId:"asterion", hp:180_000, maxHp:180_000}
  };
  assert.equal(activateServerShipAbility({player, profile, abilityId:"spectral_double_shot", now:1_000}).ok, true);

  const first = applyServerLaserDoubleStrike({player, profile, weaponClass:"laser", hit:true, damage:5_000, now:2_000});
  assert.equal(first.triggered, false);
  assert.equal(first.bonusDamage, 0);
  assert.equal(first.chargeReady, false);
  assert.equal(first.chargeReadyAt, 4_000);

  const ready = getShipAbilityStatuses("asterion", profile.shipAbilityStates.asterion, 4_000)[0];
  assert.equal(ready.chargeReady, true);
  assert.equal(ready.chargeProgressMs, 3_000);

  const consumed = applyServerLaserDoubleStrike({player, profile, weaponClass:"laser", hit:true, damage:5_000, now:4_000});
  assert.equal(consumed.triggered, true);
  assert.equal(consumed.bonusDamage, 5_000);
  assert.equal(consumed.chargeStartedAt, 4_000);
  assert.equal(consumed.chargeReadyAt, 7_000);

  const recharging = applyServerLaserDoubleStrike({player, profile, weaponClass:"laser", hit:true, damage:5_000, now:5_000});
  assert.equal(recharging.triggered, false);
  assert.equal(recharging.bonusDamage, 0);
  assert.equal(recharging.chargeReadyAt, 7_000);

  const secondCharge = applyServerLaserDoubleStrike({player, profile, weaponClass:"laser", hit:true, damage:5_000, now:7_000});
  assert.equal(secondCharge.triggered, true);
  assert.equal(secondCharge.bonusDamage, 5_000);
  assert.equal(secondCharge.chargeReadyAt, 10_000);

  const rocket = applyServerLaserDoubleStrike({player, profile, weaponClass:"rocket", hit:true, damage:5_000, now:5_000});
  assert.equal(rocket.triggered, false);

  const expired = applyServerLaserDoubleStrike({player, profile, weaponClass:"laser", hit:true, damage:5_000, now:32_000});
  assert.equal(expired.triggered, false);
});

test("server combat resolution reports the Asterion double strike when the charge is ready", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("asterion");
  profile.activeShip = "asterion";
  profile.inventoryItems.push({uid:"asterion_laser_1", itemId:"laser_mk1"});
  profile.shipLoadouts.asterion = {
    lasers:["asterion_laser_1"],
    missileLauncher:null,
    rocketLauncher:null,
    generators:[],
    extras:[]
  };
  profile.ammoInventory.ammo_x1 = 100;
  const enemy = {id:"dummy", x:100, y:0, hp:500_000, shield:0, maxShield:0, radius:30};
  assert.equal(activateServerShipAbility({
    player:{id:"ability-player", state:{shipId:"asterion", x:0, y:0, hp:180_000, maxHp:180_000}},
    profile,
    abilityId:"spectral_double_shot",
    now:1_000
  }).ok, true);

  const payload = {weaponClass:"laser", ammoId:"ammo_x1"};
  const first = resolveServerCombatFire({player:{id:"fire-1", state:{shipId:"asterion", x:0, y:0}}, profile, enemy, payload, random:()=>0, now:2_000});
  const charged = resolveServerCombatFire({player:{id:"fire-2", state:{shipId:"asterion", x:0, y:0}}, profile, enemy, payload, random:()=>0, now:4_000});
  const recharging = resolveServerCombatFire({player:{id:"fire-3", state:{shipId:"asterion", x:0, y:0}}, profile, enemy, payload, random:()=>0, now:5_000});

  assert.equal(first.ok, true);
  assert.equal(first.doubleStrike, null);
  assert.equal(first.shipAbilityState.abilityId, "spectral_double_shot");
  assert.equal(first.shipAbilityState.chargeStartedAt, 1_000);
  assert.equal(first.shipAbilityState.chargeReadyAt, 4_000);
  assert.equal(first.shipAbilityState.chargeReady, false);
  assert.equal(charged.ok, true);
  assert.equal(charged.doubleStrike.abilityId, "spectral_double_shot");
  assert.equal(charged.doubleStrike.bonusDamage, charged.doubleStrike.baseDamage);
  assert.equal(charged.doubleStrike.chargeStartedAt, 4_000);
  assert.equal(charged.doubleStrike.chargeReadyAt, 7_000);
  assert.equal(charged.shipAbilityState.chargeStartedAt, 4_000);
  assert.equal(charged.shipAbilityState.chargeReadyAt, 7_000);
  assert.equal(charged.damage, charged.doubleStrike.baseDamage * 2);
  assert.equal(recharging.ok, true);
  assert.equal(recharging.doubleStrike, null);
  assert.equal(recharging.shipAbilityState.chargeStartedAt, 4_000);
  assert.equal(recharging.shipAbilityState.chargeReadyAt, 7_000);
});

test("Asterion double strike stacks with elite red laser burst damage", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("asterion");
  profile.activeShip = "asterion";
  const laserUids = Array.from({length:10}, (_,index)=>{
    const uid = `asterion_elite_red_${index + 1}`;
    profile.inventoryItems.push({uid, itemId:"laser_elite_red"});
    return uid;
  });
  profile.shipLoadouts.asterion = {
    lasers:laserUids,
    missileLauncher:null,
    rocketLauncher:null,
    generators:[],
    extras:[]
  };
  profile.ammoInventory.ammo_x1 = 100;
  profile.eliteLaserStates = {
    current:{
      lastLaserAt:3_000,
      green:{charge:0},
      blue:{charge:0, phase:"charge"},
      red:{charge:4}
    }
  };
  const enemy = {id:"dummy", x:100, y:0, hp:500_000, shield:0, maxShield:0, radius:30};
  assert.equal(activateServerShipAbility({
    player:{id:"ability-player-red", state:{shipId:"asterion", x:0, y:0, hp:180_000, maxHp:180_000}},
    profile,
    abilityId:"spectral_double_shot",
    now:1_000
  }).ok, true);

  const result = resolveServerCombatFire({
    player:{id:"fire-red-boost", state:{shipId:"asterion", x:0, y:0}},
    profile,
    enemy,
    payload:{weaponClass:"laser", ammoId:"ammo_x1"},
    random:()=>0,
    now:4_000
  });

  assert.equal(result.ok, true);
  assert.equal(result.eliteLaser.red.triggered, true);
  assert.equal(result.eliteLaser.red.damageBonus, 0.10);
  assert.equal(result.doubleStrike.abilityId, "spectral_double_shot");
  assert.equal(result.doubleStrike.baseDamage, 2310);
  assert.equal(result.doubleStrike.bonusDamage, 2310);
  assert.equal(result.damage, 4620);
});
