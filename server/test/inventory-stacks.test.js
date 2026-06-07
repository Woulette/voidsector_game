import assert from "node:assert/strict";
import test from "node:test";
import { addInventoryItemAmount, consumeInventoryItemAmount, getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

test("teleportation fluids are merged into one inventory stack", ()=>{
  const profile = sanitizeProfile({
    inventoryItems:Array.from({length:10}, (_, index)=>({
      uid:`inv_teleportation_fluid_${index + 1}`,
      itemId:"teleportation_fluid"
    }))
  });

  assert.equal(profile.inventoryItems.length, 1);
  assert.equal(profile.inventoryItems[0].quantity, 10);
  assert.equal(getInventoryItemCount(profile, "teleportation_fluid"), 10);
});

test("stack purchases increment and delivery consumes the requested amount", ()=>{
  const profile = {inventoryItems:[], nextInventoryUid:1};
  addInventoryItemAmount(profile, "teleportation_fluid", 10);
  addInventoryItemAmount(profile, "teleportation_fluid", 1);

  assert.equal(profile.inventoryItems.length, 1);
  assert.equal(getInventoryItemCount(profile, "teleportation_fluid"), 11);
  assert.equal(consumeInventoryItemAmount(profile, "teleportation_fluid", 10), true);
  assert.equal(getInventoryItemCount(profile, "teleportation_fluid"), 1);
});

test("repair drones stay as separate inventory items", ()=>{
  const profile = {inventoryItems:[], nextInventoryUid:1};
  addInventoryItemAmount(profile, "extra_repair_starter", 1);
  addInventoryItemAmount(profile, "extra_repair_starter", 1);

  assert.equal(profile.inventoryItems.length, 2);
  assert.equal(profile.inventoryItems[0].quantity, undefined);
  assert.equal(profile.inventoryItems[1].quantity, undefined);
  assert.equal(getInventoryItemCount(profile, "extra_repair_starter"), 2);
});
