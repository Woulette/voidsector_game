import assert from "node:assert/strict";
import test from "node:test";
import { refineryRecipes } from "../../src/data/catalog.js";
import * as clientRules from "../../src/core/refineryRules.js";
import {
  REFINERY_RAW_UPGRADE_COSTS,
  getRawUpgradeMaterialAmount,
  getRefineryModuleUpgradeMaterials,
  getUpgradeDuration
} from "../src/economy/refineryRules.js";

test("client previews and server validation use the same shared refinery rules", ()=>{
  assert.equal(getRawUpgradeMaterialAmount, clientRules.getRawUpgradeMaterialAmount);
  assert.equal(getRefineryModuleUpgradeMaterials, clientRules.getRefineryModuleUpgradeMaterials);
  assert.equal(getUpgradeDuration, clientRules.getRefineryUpgradeDuration);
});

test("raw refinery first upgrade costs 50 without changing material associations", ()=>{
  assert.deepEqual(REFINERY_RAW_UPGRADE_COSTS, {
    cuivre_orbital:["cuivre_orbital", "zinc_spatial"],
    zinc_spatial:["cuivre_orbital", "nickel_brut"],
    nickel_brut:["zinc_spatial", "titane_fissure"],
    titane_fissure:["silice_conductrice", "nickel_brut"],
    silice_conductrice:["silice_conductrice", "titane_fissure"]
  });
  assert.equal(getRawUpgradeMaterialAmount(2), 50);
  assert.equal(getRawUpgradeMaterialAmount(3), 4203);
});

test("storage and transport first upgrades cost 50 of each base material", ()=>{
  assert.deepEqual(getRefineryModuleUpgradeMaterials("storage", 2), {
    titane_fissure:50,
    silice_conductrice:50
  });
  assert.deepEqual(getRefineryModuleUpgradeMaterials("transport", 2), {
    cuivre_orbital:50,
    zinc_spatial:50
  });
  assert.deepEqual(getRefineryModuleUpgradeMaterials("storage", 3), {
    titane_fissure:2901,
    silice_conductrice:2901
  });
  assert.deepEqual(getRefineryModuleUpgradeMaterials("transport", 3), {
    cuivre_orbital:2534,
    zinc_spatial:2534
  });
});

test("shared zinc and titanium recipe consumption is balanced at level 20", ()=>{
  const recipes = Object.fromEntries(refineryRecipes.map(recipe=>[recipe.id, recipe]));
  assert.deepEqual(recipes.refine_cuivre_zinc.costs, {cuivre_orbital:10, zinc_spatial:5});
  assert.deepEqual(recipes.refine_nickel_titane.costs, {titane_fissure:5, silice_conductrice:10});
  assert.deepEqual(recipes.refine_catalyseur.costs, {zinc_spatial:5, nickel_brut:10, titane_fissure:5});

  const transformedProductionPerHour = 14000;
  assert.equal(
    (recipes.refine_cuivre_zinc.costs.zinc_spatial + recipes.refine_catalyseur.costs.zinc_spatial)
      * transformedProductionPerHour,
    140000
  );
  assert.equal(
    (recipes.refine_nickel_titane.costs.titane_fissure + recipes.refine_catalyseur.costs.titane_fissure)
      * transformedProductionPerHour,
    140000
  );
});
