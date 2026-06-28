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

test("tutorial selection step blocks buying the laser before the card is selected", ()=>{
  const purchase = getItemPurchase("laser_mk1", 1);
  const profile = createDefaultProfile();
  profile.player.credits = 100_000;
  profile.tutorial = {...profile.tutorial, status:"active", step:"launcher_select_laser"};
  const profiles = new Map([["account:tutorial-shop", profile]]);
  const player = {id:"socket-tutorial-shop", accountId:"tutorial-shop"};
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:tutorial-shop", profile:profiles.get("account:tutorial-shop")})
  });
  const before = getInventoryItemCount(profile, "laser_mk1");

  const blocked = actions.addItemPurchase({player, purchase});
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /Tutoriel actif/);
  assert.equal(getInventoryItemCount(profile, "laser_mk1"), before);

  profile.tutorial.step = "launcher_buy_laser";
  const allowed = actions.addItemPurchase({player, purchase});
  assert.equal(allowed.ok, true);
  assert.equal(getInventoryItemCount(allowed.profile, "laser_mk1"), before + 1);
});

test("rapid equipment actions are no longer blocked by the old 180 ms delay", ()=>{
  assert.ok(config.accountActionLocks["equipment:equip"].minIntervalMs <= 35);
  assert.ok(config.accountActionLocks["equipment:unequip-slot"].minIntervalMs <= 35);
  assert.ok(config.accountActionLocks["equipment:unequip-inventory"].minIntervalMs <= 35);
});
