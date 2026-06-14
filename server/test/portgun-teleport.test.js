import assert from "node:assert/strict";
import test from "node:test";
import { addInventoryItemAmount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import {
  PORTGUN_NORMAL_DURATION_MS,
  PORTGUN_PREMIUM_DURATION_MS,
  getPortgunMapLevelRequirement,
  getPortgunTeleportDurationMs,
  getRandomPortgunDestination,
  hasEquippedPortgun,
  hasPortgunTeleportMoved,
  validatePortgunTeleport
} from "../src/players/portgunTeleport.js";
import { WORLD_MAPS } from "../src/world/definitions.js";

function makeProfileWithPortgun(){
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.player.level = 10;
  profile.inventoryItems.push({uid:"inv_pistou_portgun_test", itemId:"pistou_portgun"});
  profile.shipLoadouts.orion.extras[1] = "inv_pistou_portgun_test";
  addInventoryItemAmount(profile, "teleportation_fluid", 2);
  return profile;
}

test("Portgun requirements follow map numbers and leave CORE unrestricted", ()=>{
  assert.equal(getPortgunMapLevelRequirement(WORLD_MAPS["2"]), 5);
  assert.equal(getPortgunMapLevelRequirement(WORLD_MAPS["3"]), 10);
  assert.equal(getPortgunMapLevelRequirement(WORLD_MAPS["4"]), 15);
  assert.equal(getPortgunMapLevelRequirement(WORLD_MAPS["50"]), 0);
});

test("Portgun validation requires an equipped extra, fluid and destination level", ()=>{
  const player = {state:{mapId:"0", x:0, y:0, hp:100, isDead:false}};
  const profile = makeProfileWithPortgun();

  let result = validatePortgunTeleport({player, profile, targetMapId:"3", now:1000});
  assert.equal(result.ok, true);
  assert.equal(result.durationMs, PORTGUN_NORMAL_DURATION_MS);

  profile.player.level = 9;
  result = validatePortgunTeleport({player, profile, targetMapId:"3", now:1000});
  assert.equal(result.ok, false);
  assert.equal(result.requirement, 10);

  profile.player.level = 10;
  profile.shipLoadouts.orion.extras[1] = null;
  assert.equal(hasEquippedPortgun(profile), false);
  result = validatePortgunTeleport({player, profile, targetMapId:"3", now:1000});
  assert.equal(result.ok, false);
});

test("Portgun cannot be started from a portal instance", ()=>{
  const player = {state:{mapId:"portal-ricky", x:0, y:0, hp:100, isDead:false}};
  const profile = makeProfileWithPortgun();

  const result = validatePortgunTeleport({player, profile, targetMapId:"50", now:1000});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Le Portgun est instable dans cette instance.");
});

test("Portgun duration uses premium flags and movement tolerance cancels countdown", ()=>{
  const profile = makeProfileWithPortgun();
  assert.equal(getPortgunTeleportDurationMs(profile, 1000), PORTGUN_NORMAL_DURATION_MS);
  profile.premiumUntil = 2000;
  assert.equal(getPortgunTeleportDurationMs(profile, 1000), PORTGUN_PREMIUM_DURATION_MS);

  const pending = {startMapId:"0", startX:100, startY:100};
  assert.equal(hasPortgunTeleportMoved(pending, {mapId:"0", x:110, y:110}), false);
  assert.equal(hasPortgunTeleportMoved(pending, {mapId:"0", x:140, y:100}), true);
  assert.equal(hasPortgunTeleportMoved(pending, {mapId:"1", x:100, y:100}), true);
});

test("Portgun destination is random inside map bounds", ()=>{
  const map = WORLD_MAPS["0"];
  const first = getRandomPortgunDestination(map, {random:()=>0});
  const second = getRandomPortgunDestination(map, {random:()=>1});

  assert.notDeepEqual(first, second);
  for(const point of [first, second]){
    assert.ok(point.x > -map.width / 2);
    assert.ok(point.x < map.width / 2);
    assert.ok(point.y > -map.height / 2);
    assert.ok(point.y < map.height / 2);
  }
});
