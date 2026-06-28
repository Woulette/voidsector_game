import test from "node:test";
import assert from "node:assert/strict";
import { normalizeState } from "../../src/core/store.js";

test("state normalizer preserves local action-slot preference timestamp", ()=>{
  const normalized = normalizeState({
    activeShip:"orion",
    ownedShips:["orion"],
    actionSlots:["ammo_x2", null, null, null, null, null, null, null, "extra_repair_starter"],
    actionSlotsByShip:{
      orion:["ammo_x2", null, null, null, null, null, null, null, "extra_repair_starter"]
    },
    mmoProfileUpdatedAt:424242
  });

  assert.equal(normalized.mmoProfileUpdatedAt, 424242);
  assert.equal(normalized.actionSlotsUpdatedAt, 424242);
  assert.deepEqual(normalized.actionSlotsByShip.orion, [
    "ammo_x2",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "extra_repair_starter"
  ]);
});
