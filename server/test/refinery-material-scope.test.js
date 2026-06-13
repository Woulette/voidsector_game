import assert from "node:assert/strict";
import test from "node:test";
import { rawMaterialCatalog, refineryMaterialCatalog } from "../../src/data/catalog.js";
import { startServerRefineryShipment } from "../src/economy/refineryShipments.js";
import { getRawMaterial } from "../src/economy/refineryProfile.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

test("firm crafting resources stay out of the refinery material set", ()=>{
  assert.equal(rawMaterialCatalog.some(material=>material.id === "cables_cuivre" && material.rarity === "common"), true);
  assert.equal(refineryMaterialCatalog.some(material=>material.id === "cables_cuivre"), false);
  assert.equal(refineryMaterialCatalog.some(material=>material.rarity), false);
  assert.equal(getRawMaterial("cables_cuivre"), null);
  assert.ok(getRawMaterial("cuivre_orbital"));
});

test("server refinery shipment rejects firm crafting resources", ()=>{
  const profile = createDefaultProfile();
  profile.player.credits = 1_000_000;
  profile.refineryModules = {storage:20, transport:20};
  profile.cargoHold = {
    cables_cuivre:20,
    cuivre_orbital:20
  };

  const rejected = startServerRefineryShipment(profile, {
    materialId:"cables_cuivre",
    amount:1,
    shipId:"orion"
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "Materiau non expeditionnable.");

  const accepted = startServerRefineryShipment(profile, {
    materialId:"cuivre_orbital",
    amount:1,
    shipId:"orion"
  });
  assert.equal(accepted.ok, true);
});
