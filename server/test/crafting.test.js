import test from "node:test";
import assert from "node:assert/strict";

import { craftResourceCatalog, rawMaterialCatalog } from "../../src/data/progression.js";
import { CRAFT_CATEGORY_TABS, getCraftRecipe, getCraftRecipes, getVisibleCraftRecipes } from "../../src/data/craftingRecipes.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { claimServerCraftingJob, startServerCraftingJob } from "../src/economy/crafting.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

function createCraftReadyProfile(){
  const profile = createDefaultProfile();
  profile.player.credits = 1_000_000_000;
  profile.player.premium = 1_000_000;
  profile.cargoHold = Object.fromEntries(rawMaterialCatalog.map(material=>[material.id, 1_000]));
  return profile;
}

test("server crafting starts one job, consumes craft resources, and claims output after duration", ()=>{
  const profile = createCraftReadyProfile();
  const recipe = getCraftRecipe("craft_weapon_laser_mk2");
  assert.ok(recipe);
  const beforeCount = getInventoryItemCount(profile, "laser_mk2");
  const beforeMaterials = Object.fromEntries(Object.keys(recipe.costs.materials).map(id=>[id, profile.cargoHold[id]]));

  const started = startServerCraftingJob(profile, {recipeId:recipe.id, now:1_000});
  assert.equal(started.ok, true);
  assert.equal(profile.craftingJob.recipeId, recipe.id);
  assert.equal(profile.craftingJob.endsAt, 1_000 + recipe.durationMs);
  for(const [id, amount] of Object.entries(recipe.costs.materials)){
    assert.equal(profile.cargoHold[id], beforeMaterials[id] - amount);
  }
  assert.equal(profile.player.credits, 1_000_000_000);
  assert.equal(profile.player.premium, 1_000_000);

  const early = claimServerCraftingJob(profile, {now:profile.craftingJob.endsAt - 1});
  assert.equal(early.ok, false);
  assert.equal(profile.craftingJob.recipeId, recipe.id);

  const claimed = claimServerCraftingJob(profile, {now:profile.craftingJob.endsAt});
  assert.equal(claimed.ok, true);
  assert.equal(profile.craftingJob, null);
  assert.equal(getInventoryItemCount(profile, "laser_mk2"), beforeCount + 1);
});

test("crafting recipes only reference known craft resources", ()=>{
  const knownCraftResources = new Set(craftResourceCatalog.map(material=>material.id));
  for(const recipe of getCraftRecipes()){
    for(const id of Object.keys(recipe.costs?.materials || {})){
      assert.notEqual(id, "undefined", `${recipe.id} references an undefined material id`);
      assert.equal(knownCraftResources.has(id), true, `${recipe.id} references unknown material ${id}`);
    }
  }
});

test("crafting separates generators from extras in recipe categories", ()=>{
  assert.equal(CRAFT_CATEGORY_TABS.some(tab=>tab.id === "generator" && tab.label === "Générateurs"), true);
  assert.equal(getCraftRecipe("craft_generator_shield_gen")?.category, "generator");
  assert.equal(getCraftRecipe("craft_generator_engine_ion")?.category, "generator");
  assert.equal(getCraftRecipe("craft_extra_extra_repair_starter")?.category, "extra");
});

test("crafting resource rows expose rarity badges and hover details", ()=>{
  const profile = createCraftReadyProfile();
  const recipe = getCraftRecipe("craft_weapon_laser_mk2");
  const panel = renderSpawnPanelContent({
    mode:"crafting",
    materials:craftResourceCatalog,
    profile,
    selectedCraftCategory:"weapon",
    selectedCraftRecipeId:recipe.id,
    selectedCraftTabPage:0,
    formatDuration:()=> "1:00"
  });

  assert.match(panel.html, /craft-material-rarity/);
  assert.match(panel.html, /craft-material-tooltip/);
  assert.match(panel.html, /Stock actuel/);
  assert.match(panel.html, /Taux de drop/);
  assert.match(panel.html, /rarity-/);
  assert.doesNotMatch(panel.html, /craft-material-copy"><strong[\s\S]*?<\/strong><small/);
});

test("server crafting rejects queues and owned ship or formation duplicates", ()=>{
  const profile = createCraftReadyProfile();
  const laserRecipe = getCraftRecipe("craft_weapon_laser_mk2");
  const otherRecipe = getCraftRecipe("craft_weapon_laser_mk3");
  assert.equal(startServerCraftingJob(profile, {recipeId:laserRecipe.id, now:10}).ok, true);
  const queued = startServerCraftingJob(profile, {recipeId:otherRecipe.id, now:20});
  assert.equal(queued.ok, false);
  assert.match(queued.reason, /deja en cours/i);

  const shipProfile = createCraftReadyProfile();
  const ownedShip = startServerCraftingJob(shipProfile, {recipeId:"craft_ship_orion", now:10});
  assert.equal(ownedShip.ok, false);
  assert.match(ownedShip.reason, /deja possede/i);

  const formationProfile = createCraftReadyProfile();
  const ownedFormation = startServerCraftingJob(formationProfile, {recipeId:"craft_formation_base", now:10});
  assert.equal(ownedFormation.ok, false);
  assert.match(ownedFormation.reason, /deja possedee/i);
});

test("drone craft stays visible at max count but server refuses the eleventh drone", ()=>{
  const profile = createCraftReadyProfile();
  profile.ownedDroneCount = 10;
  const visibleIds = getVisibleCraftRecipes(profile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_drone_combat_drone"), true);

  const result = startServerCraftingJob(profile, {recipeId:"craft_drone_combat_drone", now:10});
  assert.equal(result.ok, false);
  assert.match(result.reason, /limite de drones/i);
});

test("visible crafting recipes hide owned ships and owned drone formations", ()=>{
  const profile = createCraftReadyProfile();
  const visibleIds = getVisibleCraftRecipes(profile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_ship_orion"), false);
  assert.equal(visibleIds.includes("craft_formation_base"), false);
});
