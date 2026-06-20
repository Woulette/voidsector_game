import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import {
  LOAD_TEST_ACCOUNT_DOMAIN,
  LOAD_TEST_AMMO_COUNT,
  LOAD_TEST_LASER_COUNT,
  isLoadTestAccount,
  provisionLoadTestBotProfile
} from "../src/loadtest/provisionBot.js";

test("load test accounts use a dedicated non-player domain", ()=>{
  assert.equal(isLoadTestAccount({email:`bot${LOAD_TEST_ACCOUNT_DOMAIN}`}), true);
  assert.equal(isLoadTestAccount({email:"player@example.com"}), false);
});

test("load test provisioning creates an idempotent Razorion eight-laser loadout", ()=>{
  const profile = createDefaultProfile();
  profile.player.firmSelected = true;
  const first = provisionLoadTestBotProfile(profile, {
    mapId:"22",
    x:1200,
    y:-900,
    now:1000
  });
  const second = provisionLoadTestBotProfile(profile, {
    mapId:"22",
    x:1200,
    y:-900,
    now:2000
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(profile.activeShip, "razorion");
  assert.ok(profile.ownedShips.includes("razorion"));
  assert.equal(profile.shipLoadouts.razorion.lasers.length, LOAD_TEST_LASER_COUNT);
  assert.equal(new Set(profile.shipLoadouts.razorion.lasers).size, LOAD_TEST_LASER_COUNT);
  assert.equal(
    profile.inventoryItems.filter(item=>item.itemId === "laser_mk3" && item.uid.startsWith("loadtest_")).length,
    LOAD_TEST_LASER_COUNT
  );
  assert.ok(profile.ammoInventory.ammo_x1 >= LOAD_TEST_AMMO_COUNT);
  assert.equal(profile.worldSession.mapId, "22");
  assert.equal(profile.worldSession.shipId, "razorion");
  assert.equal(profile.worldSession.hp, 35000);
});

test("load test provisioning rejects an unknown map", ()=>{
  const result = provisionLoadTestBotProfile(createDefaultProfile(), {mapId:"missing"});
  assert.equal(result.ok, false);
  assert.match(result.reason, /carte/i);
});
