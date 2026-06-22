import assert from "node:assert/strict";
import test from "node:test";
import { ships } from "../../src/data/ships.js";
import { getShipPurchase } from "../src/economy/shop.js";
import { activateServerShipAbility, applyServerShipLifeSteal } from "../src/combat/shipAbilities.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

test("Vesperion exposes the requested premium stats and violet portal gate", ()=>{
  const ship = ships.find(entry=>entry.id === "vesperion");
  assert.ok(ship);
  assert.equal(ship.priceType, "premium");
  assert.equal(ship.price, 150_000);
  assert.equal(ship.renderWidth, 148);
  assert.equal(ship.renderHeight, 148);
  assert.equal(ship.requiresCompletedPortal, "violet");
  assert.deepEqual(ship.stats, {
    vie:230_000,
    vitesse:310,
    cargo:2_500,
    maxLasers:14,
    maxGenerators:14,
    maxExtras:8,
    maxRocketLaunchers:1,
    maxMissileLaunchers:1
  });
});

test("server refuses Vesperion before the violet portal and charges it only once", ()=>{
  const purchase = getShipPurchase("vesperion");
  const profile = createDefaultProfile();
  profile.player.premium = 200_000;
  const profiles = new Map([["account:vesperion-shop", profile]]);
  const player = {id:"socket-vesperion-shop", accountId:"vesperion-shop"};
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:vesperion-shop", profile:profiles.get("account:vesperion-shop")})
  });

  const locked = actions.addShipPurchase({player, purchase});
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /violet/i);
  assert.equal(profiles.get("account:vesperion-shop").player.premium, 200_000);

  profiles.get("account:vesperion-shop").completedPortals.violet = 1;
  const bought = actions.addShipPurchase({player, purchase});
  assert.equal(bought.ok, true);
  assert.equal(bought.profile.player.premium, 50_000);
  assert.equal(bought.profile.ownedShips.includes("vesperion"), true);

  const duplicate = actions.addShipPurchase({player, purchase});
  assert.equal(duplicate.ok, false);
  assert.equal(profiles.get("account:vesperion-shop").player.premium, 50_000);
});

test("Tir absorbant restores 50 percent of real damage for 20 seconds and cools down for 3 minutes", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("vesperion");
  profile.activeShip = "vesperion";
  const player = {
    id:"socket-vesperion-ability",
    state:{shipId:"vesperion", hp:1_000, maxHp:230_000}
  };

  const activation = activateServerShipAbility({player, profile, now:1_000});
  assert.equal(activation.ok, true);
  assert.equal(activation.status.activeUntil, 21_000);
  assert.equal(activation.status.cooldownUntil, 181_000);

  const rocketHeal = applyServerShipLifeSteal({player, profile, damageDealt:10_000, weaponClass:"rocket", now:1_500});
  assert.equal(rocketHeal.healed, 0);
  assert.equal(player.state.hp, 1_000);

  const heal = applyServerShipLifeSteal({player, profile, damageDealt:10_000, weaponClass:"laser", now:2_000});
  assert.equal(heal.healed, 5_000);
  assert.equal(player.state.hp, 6_000);

  const expired = applyServerShipLifeSteal({player, profile, damageDealt:10_000, weaponClass:"laser", now:22_000});
  assert.equal(expired.healed, 0);
  assert.equal(player.state.hp, 6_000);

  const blocked = activateServerShipAbility({player, profile, now:180_999});
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /recharge/i);

  const ready = activateServerShipAbility({player, profile, now:181_000});
  assert.equal(ready.ok, true);
});
