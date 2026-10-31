import assert from "node:assert/strict";
import test from "node:test";
import { getCraftRecipe, getVisibleCraftRecipes } from "../../src/data/craftingRecipes.js";
import { claimServerCraftingJob, startServerCraftingJob } from "../src/economy/crafting.js";
import { getAmmoPurchase } from "../src/economy/shop.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

const recipeId = "craft_ammo_ammo_x6";
const materials = {filament_cosmique:2, fragment_noyau_stellaire:1, cristal_phase_encapsule:4};

function readyProfile(){
  const profile = createDefaultProfile();
  profile.player.premium = 15_000;
  profile.player.premiumActive = false;
  profile.player.premiumUntil = 0;
  profile.cargoHold = {...materials};
  profile.ammoInventory.ammo_x6 = 7;
  return profile;
}

test("M6 can be crafted without a portal prerequisite and cannot be bought", ()=>{
  const profile = readyProfile();
  assert(getVisibleCraftRecipes(profile).some(recipe=>recipe.id === recipeId));
  assert.equal(getAmmoPurchase("ammo_x6"), null);
  assert.deepEqual(getCraftRecipe(recipeId).costs, {materials, credits:0, premium:15_000});
});

test("M6 craft charges the canonical recipe once and delivers after one minute across profile reload", ()=>{
  const profile = readyProfile();
  const credits = profile.player.credits;
  const started = startServerCraftingJob(profile, {recipeId, paymentType:"credits", now:10_000});
  assert.equal(started.ok, true);
  assert.equal(profile.player.premium, 0);
  assert.equal(profile.player.credits, credits);
  assert.deepEqual(profile.cargoHold, {filament_cosmique:0, fragment_noyau_stellaire:0, cristal_phase_encapsule:0});
  assert.deepEqual(profile.craftingJob.paidCosts.materials, materials);
  assert.equal(profile.craftingJob.paidCosts.premium, 15_000);
  assert.equal(profile.craftingJob.endsAt, 70_000);
  assert.equal(profile.ammoInventory.ammo_x6, 7);
  const before = JSON.stringify(profile);
  assert.equal(startServerCraftingJob(profile, {recipeId, now:10_001}).ok, false);
  assert.equal(claimServerCraftingJob(profile, {now:69_999}).ok, false);
  assert.equal(JSON.stringify(profile), before);
  const reloaded = JSON.parse(JSON.stringify(profile));
  assert.equal(claimServerCraftingJob(reloaded, {now:70_000}).ok, true);
  assert.equal(reloaded.ammoInventory.ammo_x6, 10_007);
  assert.equal(reloaded.craftingJob, null);
  assert.equal(claimServerCraftingJob(reloaded, {now:70_001}).ok, false);
  assert.equal(reloaded.ammoInventory.ammo_x6, 10_007);
});

for(const missing of ["premium", ...Object.keys(materials)]){
  test(`M6 craft with insufficient ${missing} cannot spend or create a job`, ()=>{
    const profile = readyProfile();
    if(missing === "premium") profile.player.premium = 14_999;
    else profile.cargoHold[missing] -= 1;
    const before = JSON.stringify(profile);
    assert.equal(startServerCraftingJob(profile, {recipeId, now:10_000}).ok, false);
    assert.equal(JSON.stringify(profile), before);
  });
}

test("M6 craft keeps the existing Premium discount and does not apply the reputation shop surcharge", ()=>{
  const profile = readyProfile();
  profile.player.premiumActive = true;
  profile.player.premiumUntil = Date.now() + 86_400_000;
  profile.player.reputation = -500_000;
  assert.equal(startServerCraftingJob(profile, {recipeId, now:Date.now()}).ok, true);
  assert.equal(profile.player.premium, 750);
  assert.equal(profile.craftingJob.paidCosts.premium, 14_250);
});
