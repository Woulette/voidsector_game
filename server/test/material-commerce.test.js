import assert from "node:assert/strict";
import test from "node:test";

import { MATERIAL_COMMERCE_PRICES } from "../../src/shared/materialCommerce.js";
import { sellServerCommerceMaterials } from "../src/economy/materialCommerce.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

function createCommerceProfile(shipCargo = {}){
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  profile.shipCargo = {orion:{...shipCargo}};
  return profile;
}

test("commerce material prices match the requested sale table", ()=>{
  assert.deepEqual(MATERIAL_COMMERCE_PRICES, {
    cuivre_orbital:5,
    zinc_spatial:5,
    nickel_brut:5,
    titane_fissure:5,
    silice_conductrice:5,
    alliage_cuivre_zinc:100,
    plaque_nickel_titane:100,
    conducteur_renforce:2500,
    blindage_composite:2500,
    noyau_astra:10000
  });
});

test("server commerce sells a custom material amount for credits", ()=>{
  const profile = createCommerceProfile({cuivre_orbital:1000});
  profile.player.credits = 100;
  profile.cargoHold.cuivre_orbital = 5000;

  const result = sellServerCommerceMaterials(profile, {materialId:"cuivre_orbital", amount:25, shipId:"orion"});

  assert.equal(result.ok, true);
  assert.equal(result.credits, 125);
  assert.equal(result.amount, 25);
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 975);
  assert.equal(profile.cargoHold.cuivre_orbital, 5000);
  assert.equal(profile.player.credits, 225);
});

test("server commerce sells all stock for one selected material", ()=>{
  const profile = createCommerceProfile({
    blindage_composite:2,
    conducteur_renforce:3
  });
  profile.player.credits = 0;

  const result = sellServerCommerceMaterials(profile, {materialId:"blindage_composite", all:true, shipId:"orion"});

  assert.equal(result.ok, true);
  assert.equal(result.credits, 5000);
  assert.equal(result.amount, 2);
  assert.equal(profile.shipCargo.orion.blindage_composite, 0);
  assert.equal(profile.shipCargo.orion.conducteur_renforce, 3);
  assert.equal(profile.player.credits, 5000);
});

test("server commerce sells every priced material and leaves unpriced refinery materials", ()=>{
  const profile = createCommerceProfile({
    cuivre_orbital:2,
    zinc_spatial:3,
    noyau_astra:1,
    catalyseur_quantique:99
  });
  profile.player.credits = 10;

  const result = sellServerCommerceMaterials(profile, {all:true, shipId:"orion"});

  assert.equal(result.ok, true);
  assert.equal(result.credits, 10025);
  assert.equal(result.amount, 6);
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 0);
  assert.equal(profile.shipCargo.orion.zinc_spatial, 0);
  assert.equal(profile.shipCargo.orion.noyau_astra, 0);
  assert.equal(profile.shipCargo.orion.catalyseur_quantique, 99);
  assert.equal(profile.player.credits, 10035);
});

test("server commerce rejects materials without a sale price", ()=>{
  const profile = createCommerceProfile({catalyseur_quantique:1});

  const result = sellServerCommerceMaterials(profile, {materialId:"catalyseur_quantique", amount:1, shipId:"orion"});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Materiau non vendu ici.");
  assert.equal(profile.shipCargo.orion.catalyseur_quantique, 1);
});

test("server commerce rejects hangar-only material stock", ()=>{
  const profile = createCommerceProfile({cuivre_orbital:0});
  profile.cargoHold.cuivre_orbital = 1000;

  const result = sellServerCommerceMaterials(profile, {materialId:"cuivre_orbital", amount:1, shipId:"orion"});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Stock insuffisant.");
  assert.equal(profile.cargoHold.cuivre_orbital, 1000);
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 0);
});

test("server commerce only sells the active ship cargo", ()=>{
  const profile = createCommerceProfile({cuivre_orbital:0});
  profile.shipCargo.velox = {cuivre_orbital:1000};

  const result = sellServerCommerceMaterials(profile, {materialId:"cuivre_orbital", amount:1, shipId:"velox"});

  assert.equal(result.ok, false);
  assert.equal(result.reason, "Soute du vaisseau actif uniquement.");
  assert.equal(profile.shipCargo.orion.cuivre_orbital, 0);
  assert.equal(profile.shipCargo.velox.cuivre_orbital, 1000);
});
