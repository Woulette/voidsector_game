import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { craftResourceCatalog, rawMaterialCatalog } from "../../src/data/progression.js";
import { CRAFT_CATEGORY_TABS, getCraftRecipe, getCraftRecipeAvailability, getCraftRecipes, getVisibleCraftRecipes } from "../../src/data/craftingRecipes.js";
import { CRAFT_RESOURCE_RARITY_META, renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";
import { claimServerCraftingJob, startServerCraftingJob } from "../src/economy/crafting.js";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

function createCraftReadyProfile(){
  const profile = createDefaultProfile();
  profile.player.credits = 1_000_000_000;
  profile.player.premium = 1_000_000;
  profile.player.premiumActive = false;
  profile.player.premiumUntil = 0;
  profile.completedPortals.blue = 1;
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
    credits:0,
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
  assert.deepEqual(getCraftRecipe("craft_weapon_laser_mk4").costs, {
    materials:{bobine_supraconductrice:5, lentille_focalisation_dopee:4, micro_heatpipe_quantique:3, prisme_phase:2},
    credits:5_000_000,
    premium:5_000,
    currencyMode:"either"
  });
  const eliteMaterialCosts = {
    craft_weapon_laser_elite_green:{prisme_phase:8, tresse_optique_quantique:6, bobine_plasma_solaire:3, capsule_nanoreparation:3},
    craft_weapon_laser_elite_blue:{capsule_fluide_neutronique:8, micro_heatpipe_quantique:6, cristal_phase_encapsule:4, injecteur_vide:3},
    craft_weapon_laser_elite_red:{cartouche_plasma_condense:8, ruban_alliage_memoire:6, noyau_fusion_miniature:4, bobine_plasma_solaire:3}
  };
  for(const [recipeId, expectedMaterials] of Object.entries(eliteMaterialCosts)){
    const recipe = getCraftRecipe(recipeId);
    assert.ok(recipe);
    assert.equal(recipeIds.includes(recipeId), true);
    assert.deepEqual(recipe.costs.materials, expectedMaterials);
    assert.equal(recipe.costs.credits, 25_000_000);
    assert.equal(recipe.costs.premium, 25_000);
    assert.equal(recipe.costs.currencyMode, "either");
  }

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
  assert.deepEqual(getCraftRecipe("craft_extra_extra_auto_rocket").costs, {
    materials:{panneau_titane_nid_abeille:3, ruban_carbone_ceramique:2, micro_heatpipe_quantique:1, prisme_phase:1},
    credits:10_000_000,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_extra_extra_auto_missile").costs, {
    materials:{panneau_titane_nid_abeille:3, bobine_supraconductrice:3, tresse_optique_quantique:1, ruban_alliage_memoire:1},
    credits:10_000_000,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_extra_extra_rocket_accelerator").costs, {
    materials:{panneau_titane_nid_abeille:3, gyroscope_stabilise:2, ruban_alliage_memoire:1, prisme_phase:1},
    credits:10_000_000,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_extra_extra_repair_auto").costs, {
    materials:{panneau_titane_nid_abeille:3, ruban_carbone_ceramique:1, bobine_supraconductrice:3, prisme_phase:1},
    credits:7_500_000,
    premium:0
  });
  assert.deepEqual(getCraftRecipe("craft_extra_extra_repair_bot").costs, {
    materials:{bobine_supraconductrice:3, gyroscope_stabilise:2, ruban_carbone_ceramique:1, micro_heatpipe_quantique:1},
    credits:2_000_000,
    premium:0
  });

  assert.equal(getCraftRecipe("craft_ammo_ammo_x1").output.amount, 10_000);
  assert.equal(getCraftRecipe("craft_ammo_ammo_x4").costs.premium, 0);
  assert.equal(getCraftRecipe("craft_ammo_rocket_r1").output.amount, 100);
  assert.equal(getCraftRecipe("craft_ammo_missile_m2").output.amount, 100);
  assert.equal(getCraftRecipe("craft_ammo_missile_m2").costs.premium, 0);
  assert.equal(getCraftRecipe("craft_booster_booster_s1_damage").output.durationMs, 5 * 60 * 60 * 1000);
});

test("exclusive craft payments require one explicit valid currency choice", ()=>{
  const profile = createCraftReadyProfile();
  const recipe = getCraftRecipe("craft_weapon_laser_mk4");

  const missing = getCraftRecipeAvailability(recipe, profile, 1_000);
  assert.equal(missing.ok, false);
  assert.match(missing.reason, /choisis/i);
  assert.equal(getCraftRecipeAvailability(recipe, profile, 1_000, "premium").ok, true);
  assert.equal(getCraftRecipeAvailability(recipe, profile, 1_000, "credits").ok, true);
  assert.equal(getCraftRecipeAvailability(recipe, profile, 1_000, "invalid").ok, false);
});

test("Premium NOVA discount stays identical in craft UI validation and server debit", ()=>{
  const profile = createCraftReadyProfile();
  const recipe = getCraftRecipe("craft_weapon_laser_mk4");
  profile.player.premiumActive = true;
  profile.player.premium = 4_750;

  assert.equal(getCraftRecipeAvailability(recipe, profile, 1_000, "premium").ok, true);
  const panel = renderSpawnPanelContent({
    mode:"crafting",
    materials:craftResourceCatalog,
    profile,
    selectedCraftCategory:"weapon",
    selectedCraftRecipeId:recipe.id,
    selectedCraftPaymentType:"premium",
    selectedCraftTabPage:0,
    formatDuration:()=> "1:00"
  });
  assert.match(panel.html, /title="4.750"/);
  assert.doesNotMatch(panel.html, /title="5.000"/);

  const formationPanel = renderSpawnPanelContent({
    mode:"crafting",
    materials:craftResourceCatalog,
    profile,
    selectedCraftCategory:"drone",
    selectedCraftRecipeId:"craft_formation_cuirasse",
    selectedCraftTabPage:0,
    formatDuration:()=> "1:00"
  });
  assert.match(formationPanel.html, /title="3.800"/);
  assert.doesNotMatch(formationPanel.html, /title="4.000"/);

  const started = startServerCraftingJob(profile, {
    recipeId:recipe.id,
    paymentType:"premium",
    now:1_000
  });
  assert.equal(started.ok, true);
  assert.equal(started.costs.premium, 4_750);
  assert.equal(profile.player.premium, 0);
});

test("Razorion crafting keeps its materials but charges no credits or NOVA", ()=>{
  const profile = createCraftReadyProfile();
  const recipe = getCraftRecipe("craft_ship_razorion");
  const creditsBefore = profile.player.credits;
  const premiumBefore = profile.player.premium;
  const materialsBefore = Object.fromEntries(Object.keys(recipe.costs.materials).map(id=>[id, profile.cargoHold[id]]));

  const started = startServerCraftingJob(profile, {recipeId:recipe.id, now:1_000});
  assert.equal(started.ok, true);
  assert.equal(started.costs.credits, 0);
  assert.equal(started.costs.premium, 0);
  assert.equal(profile.player.credits, creditsBefore);
  assert.equal(profile.player.premium, premiumBefore);
  for(const [id, amount] of Object.entries(recipe.costs.materials)){
    assert.equal(profile.cargoHold[id], materialsBefore[id] - amount);
  }
});

test("server craft spends only the chosen NOVA or credits and always consumes materials", ()=>{
  const recipe = getCraftRecipe("craft_weapon_laser_mk4");

  const novaProfile = createCraftReadyProfile();
  const novaCreditsBefore = novaProfile.player.credits;
  const novaBefore = novaProfile.player.premium;
  const novaMaterialsBefore = Object.fromEntries(Object.keys(recipe.costs.materials).map(id=>[id, novaProfile.cargoHold[id]]));
  const paidWithNova = startServerCraftingJob(novaProfile, {
    recipeId:recipe.id,
    paymentType:"premium",
    now:1_000
  });
  assert.equal(paidWithNova.ok, true);
  assert.equal(paidWithNova.costs.paymentType, "premium");
  assert.equal(paidWithNova.costs.credits, 0);
  assert.equal(paidWithNova.costs.premium, 5_000);
  assert.equal(novaProfile.player.credits, novaCreditsBefore);
  assert.equal(novaProfile.player.premium, novaBefore - 5_000);
  for(const [id, amount] of Object.entries(recipe.costs.materials)){
    assert.equal(novaProfile.cargoHold[id], novaMaterialsBefore[id] - amount);
  }

  const creditProfile = createCraftReadyProfile();
  const creditBefore = creditProfile.player.credits;
  const premiumBefore = creditProfile.player.premium;
  const paidWithCredits = startServerCraftingJob(creditProfile, {
    recipeId:recipe.id,
    paymentType:"credits",
    now:2_000
  });
  assert.equal(paidWithCredits.ok, true);
  assert.equal(paidWithCredits.costs.paymentType, "credits");
  assert.equal(paidWithCredits.costs.credits, 5_000_000);
  assert.equal(paidWithCredits.costs.premium, 0);
  assert.equal(creditProfile.player.credits, creditBefore - 5_000_000);
  assert.equal(creditProfile.player.premium, premiumBefore);
});

test("server rejects a missing, invalid, or unaffordable craft payment without fallback", ()=>{
  const recipe = getCraftRecipe("craft_weapon_laser_mk4");
  for(const paymentType of ["", "invalid"]){
    const profile = createCraftReadyProfile();
    const before = {
      credits:profile.player.credits,
      premium:profile.player.premium,
      materials:Object.fromEntries(Object.keys(recipe.costs.materials).map(id=>[id, profile.cargoHold[id]]))
    };
    const result = startServerCraftingJob(profile, {recipeId:recipe.id, paymentType, now:1_000});
    assert.equal(result.ok, false);
    assert.equal(profile.craftingJob, null);
    assert.equal(profile.player.credits, before.credits);
    assert.equal(profile.player.premium, before.premium);
    for(const [id, amount] of Object.entries(before.materials)) assert.equal(profile.cargoHold[id], amount);
  }

  const noCredits = createCraftReadyProfile();
  noCredits.player.credits = 0;
  const premiumBefore = noCredits.player.premium;
  const materialBefore = noCredits.cargoHold.bobine_supraconductrice;
  const refused = startServerCraftingJob(noCredits, {
    recipeId:recipe.id,
    paymentType:"credits",
    now:1_000
  });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /credits insuffisants/i);
  assert.equal(noCredits.player.premium, premiumBefore);
  assert.equal(noCredits.cargoHold.bobine_supraconductrice, materialBefore);
  assert.equal(noCredits.craftingJob, null);
});

test("crafting UI exposes an exclusive NOVA or credits selector", ()=>{
  const profile = createCraftReadyProfile();
  const recipe = getCraftRecipe("craft_weapon_laser_mk4");
  const unselected = renderSpawnPanelContent({
    mode:"crafting",
    materials:craftResourceCatalog,
    profile,
    selectedCraftCategory:"weapon",
    selectedCraftRecipeId:recipe.id,
    selectedCraftPaymentType:"",
    selectedCraftTabPage:0,
    formatDuration:()=> "1:00"
  });
  assert.match(unselected.html, /data-craft-payment="premium"/);
  assert.match(unselected.html, /data-craft-payment="credits"/);
  assert.match(unselected.html, />OU</);
  assert.match(unselected.html, /Choisis NOVA ou credits/);
  assert.match(unselected.html, /data-craft-payment-type="" disabled/);

  const selected = renderSpawnPanelContent({
    mode:"crafting",
    materials:craftResourceCatalog,
    profile,
    selectedCraftCategory:"weapon",
    selectedCraftRecipeId:recipe.id,
    selectedCraftPaymentType:"premium",
    selectedCraftTabPage:0,
    formatDuration:()=> "1:00"
  });
  assert.equal((selected.html.match(/aria-checked="true"/g) || []).length, 1);
  assert.match(selected.html, /data-craft-payment-type="premium"/);
  assert.doesNotMatch(selected.html, /data-craft-payment-type="premium" disabled/);
});

test("craft command sends only the recipe id and selected payment type", ()=>{
  const emitted = [];
  const commands = createSocketCommands({
    multiplayer:{
      connected:true,
      auth:{account:{id:"account-1"}, profileReady:true},
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });
  assert.equal(commands.startServerCraft("craft_weapon_laser_mk4", "credits"), true);
  assert.deepEqual(emitted, [{
    eventName:"craft:start",
    payload:{recipeId:"craft_weapon_laser_mk4", paymentType:"credits"}
  }]);
});

test("crafting micro-labels use integer sharp text metrics without locked-row opacity", ()=>{
  const css = readFileSync(new URL("../../src/styles/quests.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.craft-recipe-strip\.locked\{[^}]*opacity/);
  assert.doesNotMatch(css, /\.craft-recipe-strip>b\{[^}]*7\.5px/);
  assert.match(css, /\.craft-recipe-strip>b\{[^}]*font:900 9px\/1/);
  assert.match(css, /\.craft-material-tooltip-drops > span > b\{[^}]*font:900 12px\/1/);
  assert.match(css, /\.craft-material-tooltip\{[^}]*transform:none/);
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
  assert.match(panel.html, /Maps? X-1 \/ X-2 \/ X-3/);
  assert.doesNotMatch(panel.html, /Map X-[6-9]|Map X-10/);
  assert.match(panel.html, /craft-drop-line low/);
  assert.match(panel.html, /rarity-/);
  assert.match(panel.html, /<span class="craft-material-copy"><strong title="Câbles de cuivre">Câbles de cuivre<\/strong><\/span>/);
});

test("crafting resource help mirrors the authoritative drop bands", ()=>{
  assert.deepEqual(
    CRAFT_RESOURCE_RARITY_META.common.drops.map(drop=>[drop.maps, drop.chance]),
    [["Maps X-1 / X-2 / X-3", "5%"]]
  );
  assert.deepEqual(
    CRAFT_RESOURCE_RARITY_META.rare.drops.map(drop=>[drop.maps, drop.chance]),
    [
      ["Maps X-1 / X-2 / X-3", "1%"],
      ["Maps X-4 / X-5", "5%"],
      ["Map CORE", "5%"],
      ["Futures zones LV 35-50", "5%"]
    ]
  );
  assert.deepEqual(
    CRAFT_RESOURCE_RARITY_META.veryRare.drops.map(drop=>[drop.maps, drop.chance]),
    [
      ["Maps X-4 / X-5", "1%"],
      ["Map CORE", "1%"],
      ["Futures zones LV 35-50", "5%"]
    ]
  );
  assert.deepEqual(
    CRAFT_RESOURCE_RARITY_META.elite.drops.map(drop=>[drop.maps, drop.chance]),
    [
      ["Map CORE", "0,1%"],
      ["Futures zones LV 35-50", "1%"]
    ]
  );
  assert.deepEqual(
    CRAFT_RESOURCE_RARITY_META.mythic.drops.map(drop=>[drop.maps, drop.chance]),
    [["Futures zones LV 35-50", "0,1%"]]
  );
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

test("drone craft stays visible at max standard count but server refuses the ninth standard drone", ()=>{
  const profile = createCraftReadyProfile();
  profile.ownedDroneCount = 8;
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

test("Azuron unlocks the MK-IV recipe while Eclanite unlocks the three elite laser recipes", ()=>{
  const profile = createCraftReadyProfile();
  let visibleIds = getVisibleCraftRecipes(profile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_weapon_laser_mk4"), true);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_green"), false);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_blue"), false);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_red"), false);

  const directEliteAttempt = startServerCraftingJob(profile, {
    recipeId:"craft_weapon_laser_elite_green",
    paymentType:"credits",
    now:10
  });
  assert.equal(directEliteAttempt.ok, false);
  assert.match(directEliteAttempt.reason, /Éclanite/i);

  const beforeAzuron = createCraftReadyProfile();
  beforeAzuron.completedPortals.blue = 0;
  visibleIds = getVisibleCraftRecipes(beforeAzuron).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_weapon_laser_mk4"), false);
  const directMk4Attempt = startServerCraftingJob(beforeAzuron, {
    recipeId:"craft_weapon_laser_mk4",
    paymentType:"credits",
    now:10
  });
  assert.equal(directMk4Attempt.ok, false);
  assert.match(directMk4Attempt.reason, /Seuil d.Azuron/i);

  profile.completedPortals.prismatic = 1;
  visibleIds = getVisibleCraftRecipes(profile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_green"), false);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_blue"), false);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_red"), false);

  profile.completedPortals.emerald = 1;
  visibleIds = getVisibleCraftRecipes(profile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_green"), true);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_blue"), true);
  assert.equal(visibleIds.includes("craft_weapon_laser_elite_red"), true);
  const unlockedElite = startServerCraftingJob(profile, {
    recipeId:"craft_weapon_laser_elite_green",
    paymentType:"credits",
    now:20
  });
  assert.equal(unlockedElite.ok, true);
});

test("Kharon gates elite ship recipes and Eclanite is rechecked when a laser craft is claimed", ()=>{
  const shipProfile = createCraftReadyProfile();
  let visibleIds = getVisibleCraftRecipes(shipProfile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_ship_vesperion"), false);
  const lockedShip = startServerCraftingJob(shipProfile, {recipeId:"craft_ship_vesperion", now:10});
  assert.equal(lockedShip.ok, false);
  assert.match(lockedShip.reason, /Kharon/i);

  shipProfile.completedPortals.red = 1;
  visibleIds = getVisibleCraftRecipes(shipProfile).map(recipe=>recipe.id);
  assert.equal(visibleIds.includes("craft_ship_vesperion"), true);
  assert.equal(startServerCraftingJob(shipProfile, {recipeId:"craft_ship_vesperion", now:20}).ok, true);

  const laserProfile = createCraftReadyProfile();
  laserProfile.completedPortals.emerald = 1;
  const started = startServerCraftingJob(laserProfile, {
    recipeId:"craft_weapon_laser_elite_blue",
    paymentType:"credits",
    now:100
  });
  assert.equal(started.ok, true);
  delete laserProfile.completedPortals.emerald;
  const claimed = claimServerCraftingJob(laserProfile, {now:started.job.endsAt});
  assert.equal(claimed.ok, false);
  assert.match(claimed.reason, /Éclanite/i);
  assert.equal(laserProfile.craftingJob.recipeId, "craft_weapon_laser_elite_blue");
});
