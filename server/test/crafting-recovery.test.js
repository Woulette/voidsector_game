import assert from "node:assert/strict";
import test from "node:test";
import { getCraftRecipe } from "../../src/data/craftingRecipes.js";
import { rawMaterialCatalog } from "../../src/data/progression.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { startServerCraftingJob, claimServerCraftingJob } from "../src/economy/crafting.js";
import { refundRedundantCraftingJob } from "../src/economy/craftingRecovery.js";
import { getShipPurchase } from "../src/economy/shop.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createProfileManager } from "../src/players/profiles.js";

function ready(){
  const profile = createDefaultProfile();
  profile.tutorial.status = "completed";
  profile.player.level = 22;
  profile.player.credits = 1_000_000_000;
  profile.player.premium = 1_000_000;
  profile.completedPortals = {blue:1, red:1, emerald:1};
  profile.cargoHold = Object.fromEntries(rawMaterialCatalog.map(m=>[m.id, 1000]));
  return sanitizeProfile(profile);
}
function fixture(profile, persist = ()=>{}){
  const key = "account:craft-recovery";
  const profiles = new Map([[key, profile]]);
  const actions = createProfileActions({profiles, persist, getExistingProfile:()=>({key, profile:profiles.get(key)})});
  return {actions, profiles, key, player:{id:"socket", accountId:"craft-recovery", name:"Craft QA"}};
}

for(const firmId of ["astra", "cyan", "jaune", "verte"]){
  test(`${firmId}: buying a ship during its craft refunds materials once and frees the next craft`, async()=>{
    const profile = ready(); profile.player.firmId = firmId;
    const beforeMaterials = structuredClone(profile.cargoHold);
    const {actions, profiles, key, player} = fixture(profile);
    const started = actions.applyEconomyAction({player, action:{kind:"craft-start", recipeId:"craft_ship_valkyrie", now:1000}});
    assert.equal(started.ok, true); await started.save;
    assert.ok(started.profile.craftingJob.id);
    assert.deepEqual(started.profile.craftingJob.paidCosts.materials, started.costs.materials);
    const purchase = getShipPurchase("valkyrie"); assert.ok(purchase);
    const bought = actions.addShipPurchase({player, purchase});
    assert.equal(bought.ok, true); await bought.save;
    const spent = structuredClone(bought.profile.player);
    const refunded = actions.applyEconomyAction({player, action:{kind:"craft-claim", now:1001}});
    assert.equal(refunded.ok, true); await refunded.save;
    assert.equal(refunded.action, "job-refund");
    assert.equal(refunded.profile.craftingJob, null);
    assert.deepEqual(refunded.profile.cargoHold, beforeMaterials);
    assert.equal(refunded.profile.ownedShips.filter(id=>id === "valkyrie").length, 1);
    assert.deepEqual(refunded.profile.player, spent);
    assert.equal(refunded.profile.activityLog.filter(e=>e.type === "craft_refund").length, 1);
    const once = structuredClone(profiles.get(key));
    assert.equal(actions.applyEconomyAction({player, action:{kind:"craft-claim"}}).ok, false);
    assert.deepEqual(profiles.get(key), once);
    assert.equal(actions.applyEconomyAction({player, action:{kind:"craft-start", recipeId:"craft_weapon_laser_mk2"}}).ok, true);
  });
}

test("a discounted formation refunds its actual NOVA after Premium expires and profile reloads", ()=>{
  let profile = ready(); profile.player.premiumActive = true;
  const materials = structuredClone(profile.cargoHold), nova = profile.player.premium;
  const started = startServerCraftingJob(profile, {recipeId:"craft_formation_cuirasse", now:1000});
  assert.equal(started.ok, true); assert.equal(started.costs.premium, 3800);
  profile.ownedDroneFormations.push("cuirasse");
  profile.player.premiumActive = false;
  profile = sanitizeProfile(JSON.parse(JSON.stringify(profile)));
  assert.equal(profile.craftingJob.paidCosts.premium, 3800);
  const result = claimServerCraftingJob(profile, {now:1001});
  assert.equal(result.ok, true); assert.equal(result.refund.premium, 3800);
  assert.equal(result.refund.source, "paid-costs");
  assert.equal(profile.player.premium, nova);
  assert.deepEqual(profile.cargoHold, materials);
});

test("a paid ship refunds credits without giving XP, quest rewards or another ship", ()=>{
  const profile = ready(), before = structuredClone(profile);
  const started = startServerCraftingJob(profile, {recipeId:"craft_ship_vesperion", now:1000});
  assert.equal(started.ok, true); assert.equal(started.costs.credits, 100_000_000);
  profile.ownedShips.push("vesperion");
  const result = claimServerCraftingJob(profile, {now:1001});
  assert.equal(result.ok, true); assert.equal(result.refund.credits, 100_000_000);
  assert.deepEqual(profile.player, before.player);
  assert.deepEqual(profile.cargoHold, before.cargoHold);
  assert.deepEqual(profile.completedQuestClaims, before.completedQuestClaims);
});

test("hitting the drone cap refunds the craft without removing owned drones", ()=>{
  const profile = ready(); profile.ownedDroneCount = 7;
  const before = structuredClone(profile);
  assert.equal(startServerCraftingJob(profile, {recipeId:"craft_drone_combat_drone", now:1000}).ok, true);
  profile.ownedDroneCount = 8;
  assert.equal(claimServerCraftingJob(profile, {now:1001}).action, "job-refund");
  assert.equal(profile.ownedDroneCount, 8);
  assert.deepEqual(profile.player, before.player);
  assert.deepEqual(profile.cargoHold, before.cargoHold);
});

test("repeatable equipment is delivered normally even when another copy is owned", ()=>{
  const profile = ready();
  const started = startServerCraftingJob(profile, {recipeId:"craft_weapon_laser_mk2", now:1000});
  profile.inventoryItems.push({uid:"other-laser", itemId:"laser_mk2"});
  const before = structuredClone(profile);
  assert.equal(refundRedundantCraftingJob(profile).code, "CRAFT_NOT_REDUNDANT");
  assert.deepEqual(profile, before);
  assert.equal(claimServerCraftingJob(profile, {now:1001}).ok, false);
  const claimed = claimServerCraftingJob(profile, {now:started.job.endsAt});
  assert.equal(claimed.action, "job-claim");
  assert.equal(profile.inventoryItems.filter(e=>e.itemId === "laser_mk2").length, 2);
  assert.equal(profile.activityLog.some(e=>e.type === "craft_refund"), false);
});

test("legacy fixed-payment jobs are compensated once, preserving unrelated state", ()=>{
  const profile = ready();
  const recipe = getCraftRecipe("craft_ship_valkyrie");
  profile.craftingJob = {recipeId:recipe.id, startedAt:1000, endsAt:61000, durationMs:60000};
  profile.ownedShips.push("valkyrie");
  const before = structuredClone(profile);
  const result = refundRedundantCraftingJob(profile);
  assert.equal(result.ok, true); assert.equal(result.refund.source, "legacy-recipe");
  for(const [id, amount] of Object.entries(recipe.costs.materials)) assert.equal(profile.cargoHold[id], before.cargoHold[id] + amount);
  for(const field of ["player", "ownedShips", "inventoryItems", "tutorial", "questProgress", "completedQuestClaims", "shipCargo"]){
    assert.deepEqual(profile[field], before[field]);
  }
  const once = structuredClone(profile);
  assert.equal(refundRedundantCraftingJob(profile).ok, false);
  assert.deepEqual(profile, once);
});

test("invalid paid receipts never fall back to guessing a refund", ()=>{
  for(const paidCosts of [null, {version:1, credits:Infinity}, {version:1, credits:-1, premium:0, paymentType:"all", materials:{}}]){
    let profile = ready();
    profile.ownedShips.push("valkyrie");
    profile.craftingJob = {recipeId:"craft_ship_valkyrie", startedAt:1000, endsAt:61000, paidCosts};
    profile = sanitizeProfile(profile);
    const before = structuredClone(profile);
    assert.equal(claimServerCraftingJob(profile).code, "CRAFT_REFUND_UNVERIFIED");
    assert.deepEqual(profile, before);
  }
});

test("repairing offline accounts is persisted and a second load cannot refund twice", async()=>{
  let stored = ready();
  assert.equal(startServerCraftingJob(stored, {recipeId:"craft_ship_valkyrie", now:1000}).ok, true);
  stored.ownedShips.push("valkyrie");
  let saves = 0;
  const makeManager = ()=>createProfileManager({cleanName:String, logger:{warn(){}},
    loadProfileEntries:async sanitize=>[["account:offline", sanitize(structuredClone(stored))]],
    persistProfileEntries:async entries=>{saves++; stored = structuredClone(entries[0][1]);}
  });
  await makeManager().load();
  assert.equal(saves, 1); assert.equal(stored.craftingJob, null);
  const once = structuredClone(stored);
  await makeManager().load();
  assert.equal(saves, 1); assert.deepEqual(stored, once);
});

test("a failed offline repair restores its balances and leaves later profiles unrepaired", async()=>{
  const originals = [ready(), ready()];
  for(const p of originals){
    startServerCraftingJob(p, {recipeId:"craft_ship_valkyrie", now:1000});
    p.ownedShips.push("valkyrie");
  }
  let saves = 0;
  const manager = createProfileManager({cleanName:String, logger:{warn(){}},
    loadProfileEntries:async sanitize=>originals.map((p,i)=>[`account:${i}`, sanitize(structuredClone(p))]),
    persistProfileEntries:async()=>{saves++;throw new Error("write unavailable");}
  });
  await manager.load();
  assert.equal(saves,1);
  for(let i=0;i<originals.length;i++){
    const actual = manager.getProfileEntry(`account:${i}`).profile;
    assert.deepEqual(actual.player,originals[i].player);
    assert.deepEqual(actual.craftingJob,originals[i].craftingJob);
    assert.deepEqual(actual.cargoHold,originals[i].cargoHold);
  }
});

test("failed refund persistence restores the craft and funds, and retry pays only once", async()=>{
  const profile = ready();
  startServerCraftingJob(profile, {recipeId:"craft_formation_cuirasse", now:1000});
  profile.ownedDroneFormations.push("cuirasse");
  const before = structuredClone(profile);
  let reject = true;
  const {actions, profiles, key, player} = fixture(profile, ()=>reject ? Promise.reject(new Error("disk unavailable")) : Promise.resolve());
  const failed = actions.applyEconomyAction({player, action:{kind:"craft-claim"}});
  await assert.rejects(failed.save, /disk unavailable/);
  assert.deepEqual(profiles.get(key), before);
  reject = false;
  const retry = actions.applyEconomyAction({player, action:{kind:"craft-claim"}});
  await retry.save;
  assert.equal(retry.profile.craftingJob, null);
  assert.equal(retry.profile.player.premium, before.player.premium + retry.refund.premium);
  assert.equal(actions.applyEconomyAction({player, action:{kind:"craft-claim"}}).ok, false);
});

test("a forged client preference save cannot change the receipt or introduce a refundable craft", async()=>{
  for(const hasJob of [false,true]){
    const original = ready();
    if(hasJob) startServerCraftingJob(original, {recipeId:"craft_ship_valkyrie", now:1000});
    const manager = createProfileManager({cleanName:String, logger:{warn(){}},
      loadProfileEntries:async sanitize=>[["account:forged", sanitize(original)]], persistProfileEntries:async()=>{}
    });
    await manager.load();
    const result = manager.saveFromPayload({player:{accountId:"forged", name:"QA"}, payload:{profile:{
      ...original, actionSlotsUpdatedAt:Date.now(), craftingJob:{recipeId:"craft_ship_valkyrie", startedAt:1000,
        paidCosts:{version:1, paymentType:"all", credits:999_999_999, premium:999999, materials:{plaques_acier:9999}}}
    }}});
    assert.deepEqual(result.profile.craftingJob, original.craftingJob);
  }
});

test("craft UI offers refund for a redundant unfinished job and keeps normal jobs locked", ()=>{
  const profile = ready();
  startServerCraftingJob(profile, {recipeId:"craft_ship_valkyrie", now:Date.now()});
  profile.ownedShips.push("valkyrie");
  let panel = renderSpawnPanelContent({mode:"crafting", profile, materials:rawMaterialCatalog});
  assert.match(panel.html, /data-claim-craft >Clôturer et rembourser/);
  assert.match(panel.html, /Vaisseau deja possede/);
  profile.ownedShips = ["orion"];
  panel = renderSpawnPanelContent({mode:"crafting", profile, materials:rawMaterialCatalog});
  assert.match(panel.html, /data-claim-craft disabled>En fabrication/);
});
