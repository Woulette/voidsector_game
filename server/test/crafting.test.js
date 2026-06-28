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
  assert.equal(CRAFT_CATEGORY_TABS.some(tab=>tab.id === "formation"), false);
  assert.equal(getCraftRecipe("craft_generator_shield_gen")?.category, "generator");
  assert.equal(getCraftRecipe("craft_generator_engine_ion")?.category, "generator");
  assert.equal(getCraftRecipe("craft_extra_extra_auto_rocket")?.category, "extra");
  assert.equal(getCraftRecipe("craft_formation_cuirasse")?.category, "drone");
});

test("crafting applies requested recipe balance and exclusions", ()=>{
  const recipes = getCraftRecipes();
  const recipeIds = recipes.map(recipe=>recipe.id);

  assert.equal(getCraftRecipe("craft_ship_orion"), null);
  assert.equal(getCraftRecipe("craft_ship_velox"), null);
  assert.equal(recipeIds.indexOf("craft_ship_helion_titan") < recipeIds.indexOf("craft_ship_astralis"), true);

  assert.deepEqual(getCraftRecipe("craft_ship_valkyrie").costs, {
    materials:{plaques_acier:3, cables_cuivre:2, micro_pompe_cryogenique:1, ruban_carbone_ceramique:1},
    credits:0,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_ship_razorion").costs, {
    materials:{polymere_isolant:5, bobine_supraconductrice:3, gyroscope_stabilise:2},
    credits:2_500_000,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_ship_astralis").costs, {
    materials:{gyroscope_stabilise:4, ruban_carbone_ceramique:3, diaphragme_gravitonique:1, micro_heatpipe_quantique:2},
    credits:0,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_ship_helion_titan").costs, {
    materials:{panneau_titane_nid_abeille:4, ruban_carbone_ceramique:3, bobine_supraconductrice:3, ruban_alliage_memoire:1},
    credits:0,
    premium:0
  });
  assert.equal(getCraftRecipe("craft_ship_vesperion").costs.credits, 100_000_000);
  assert.equal(getCraftRecipe("craft_ship_vesperion").costs.premium, 0);
  assert.deepEqual(getCraftRecipe("craft_ship_asterion").costs.materials, {
    micro_heatpipe_quantique:20,
    diaphragme_gravitonique:12,
    bobine_plasma_solaire:4,
    roulement_magnetique:6
  });

  assert.equal(getCraftRecipe("craft_weapon_launcher_missile_mk1"), null);
  assert.equal(getCraftRecipe("craft_weapon_launcher_rocket_mk1"), null);
  assert.equal(getCraftRecipe("craft_extra_extra_repair_starter"), null);
  assert.equal(getCraftRecipe("craft_extra_teleportation_fluid"), null);
  assert.ok(getCraftRecipe("craft_weapon_laser_mk4"));
  assert.ok(getCraftRecipe("craft_weapon_laser_elite_green"));

  assert.deepEqual(getCraftRecipe("craft_weapon_laser_mk1").costs.materials, {
    lentilles_optiques:1,
    cables_cuivre:1,
    plaques_acier:1
  });
  assert.deepEqual(getCraftRecipe("craft_generator_reactor_ion").costs.materials, {
    poudre_propulsive:5,
    circuits_imprimes:3,
    bobine_supraconductrice:1,
    micro_pompe_cryogenique:1
  });

  assert.equal(getCraftRecipe("craft_ammo_ammo_x1").output.amount, 10_000);
  assert.equal(getCraftRecipe("craft_ammo_ammo_x4").costs.premium, 0);
  assert.equal(getCraftRecipe("craft_ammo_rocket_r1").output.amount, 100);
  assert.equal(getCraftRecipe("craft_ammo_missile_m2").output.amount, 100);
  assert.equal(getCraftRecipe("craft_ammo_missile_m2").costs.premium, 0);
  assert.equal(getCraftRecipe("craft_booster_booster_s1_damage").output.durationMs, 5 * 60 * 60 * 1000);
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
  assert.match(panel.html, /craft-detail-rarity rarity-rare/);
  assert.match(panel.html, /Stock actuel/);
  assert.match(panel.html, /Taux de drop/);
  assert.match(panel.html, /Map X-1 \/ X-2 \/ X-3/);
  assert.match(panel.html, /craft-drop-line low/);
  assert.match(panel.html, /rarity-/);
  assert.match(panel.html, /<span class="craft-material-copy"><strong title="Câbles de cuivre">Câbles de cuivre<\/strong><\/span>/);
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
  shipProfile.ownedShips.push("valkyrie");
  const ownedShip = startServerCraftingJob(shipProfile, {recipeId:"craft_ship_valkyrie", now:10});
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
