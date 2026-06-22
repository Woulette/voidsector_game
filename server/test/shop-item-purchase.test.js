import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../src/config.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { getItemPurchase } from "../src/economy/shop.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

test("teleportation fluid supports server-authoritative bulk purchases", ()=>{
  const purchase = getItemPurchase("teleportation_fluid", 1000);
  assert.equal(purchase.quantity, 1000);
  assert.equal(purchase.multiplier, 1000);
  assert.equal(purchase.totalPrice, 100_000);

  const profile = createDefaultProfile();
  profile.player.premium = 100_000;
  const profiles = new Map([["account:fluid-shop", profile]]);
  const player = {id:"socket-fluid-shop", accountId:"fluid-shop"};
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:fluid-shop", profile:profiles.get("account:fluid-shop")})
  });

  const result = actions.addItemPurchase({player, purchase});
  assert.equal(result.ok, true);
  assert.equal(result.profile.player.premium, 0);
  assert.equal(getInventoryItemCount(result.profile, "teleportation_fluid"), 1000);
  assert.equal(result.profile.inventoryItems.filter(entry=>entry.itemId === "teleportation_fluid").length, 1);
});

test("bulk multipliers cannot duplicate normal equipment", ()=>{
  const purchase = getItemPurchase("laser_mk1", 1000);
  assert.equal(purchase.quantity, 1);
  assert.equal(purchase.multiplier, 1);
  assert.equal(purchase.totalPrice, 25_000);
});

test("rapid equipment actions are no longer blocked by the old 180 ms delay", ()=>{
  assert.ok(config.accountActionLocks["equipment:equip"].minIntervalMs <= 35);
  assert.ok(config.accountActionLocks["equipment:unequip-slot"].minIntervalMs <= 35);
  assert.ok(config.accountActionLocks["equipment:unequip-inventory"].minIntervalMs <= 35);
});
