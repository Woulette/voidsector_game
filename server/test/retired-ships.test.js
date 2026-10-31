import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { ships } from "../../src/data/ships.js";
import { getCraftRecipe } from "../../src/data/craftingRecipes.js";
import { getShipPurchase } from "../src/economy/shop.js";
import { startServerCraftingJob } from "../src/economy/crafting.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileManager } from "../src/players/profiles.js";
import { recoverRetiredShipProfile } from "../src/players/retiredShips.js";

function oldProfile(){
  const profile = createDefaultProfile();
  profile.ownedShips.push("imperial");
  profile.activeShip = "imperial";
  profile.selectedShip = "imperial";
  profile.shipLoadouts.imperial = {lasers:[profile.inventoryItems[0].uid]};
  profile.shipCargo.imperial = {cuivre_orbital:7};
  profile.shipWorldSessions.imperial = {shipId:"imperial"};
  profile.actionSlotsByShip.imperial = ["ammo_x1"];
  profile.worldSession = {shipId:"imperial"};
  return profile;
}

test("retired Imperial has no catalogue, purchase or crafting route for any role", ()=>{
  assert.equal(ships.some(ship=>ship.id === "imperial"), false);
  assert.equal(getShipPurchase("imperial"), null);
  assert.equal(getCraftRecipe("craft_ship_imperial"), null);
  const profile = createDefaultProfile();
  const before = JSON.stringify(profile);
  assert.equal(startServerCraftingJob(profile, {recipeId:"craft_ship_imperial"}).ok, false);
  assert.equal(JSON.stringify(profile), before);
  assert.equal(existsSync(new URL("../../assets/ships/Imperial.png", import.meta.url)), false);
  assert.equal(existsSync(new URL("../../assets/enemies/ancient/demon_king.png", import.meta.url)), true);
});

test("retirement preserves equipment and cargo, selects Orion, and is idempotent", ()=>{
  const raw = oldProfile();
  const original = JSON.stringify(raw);
  const {profile, changed} = recoverRetiredShipProfile(raw);
  assert.equal(changed, true);
  assert.equal(JSON.stringify(raw), original);
  assert.equal(profile.activeShip, "orion");
  assert.equal(profile.selectedShip, "orion");
  assert(!profile.ownedShips.includes("imperial"));
  assert.deepEqual(profile.inventoryItems, raw.inventoryItems);
  assert.equal(profile.cargoHold.cuivre_orbital, Number(raw.cargoHold.cuivre_orbital || 0) + 7);
  for(const field of ["shipLoadouts", "shipCargo", "shipWorldSessions", "actionSlotsByShip"]) assert(!Object.hasOwn(profile[field], "imperial"));
  assert.equal(profile.worldSession, null);
  assert.equal(recoverRetiredShipProfile(profile).changed, false);
});

test("retired craft refunds its actual receipt once before the recipe is discarded", ()=>{
  const raw = oldProfile();
  raw.craftingJob = {id:"retired-job", recipeId:"craft_ship_imperial", paidCosts:{version:1, credits:0, premium:950, paymentType:"premium", materials:{injecteur_vide:2}}};
  const beforeNova = raw.player.premium;
  const {profile} = recoverRetiredShipProfile(raw);
  assert.equal(profile.player.premium, beforeNova + 950);
  assert.equal(profile.cargoHold.injecteur_vide, Number(raw.cargoHold.injecteur_vide || 0) + 2);
  assert.equal(profile.craftingJob, null);
  assert.equal(recoverRetiredShipProfile(profile).profile.player.premium, profile.player.premium);
});

test("historical craft without a receipt uses the frozen legacy cost; invalid receipts never guess", ()=>{
  const raw = oldProfile();
  raw.craftingJob = {recipeId:"craft_ship_imperial"};
  const {profile} = recoverRetiredShipProfile(raw);
  for(const [id, amount] of Object.entries({injecteur_vide:15, plaque_matiere_noire:16, plaque_astrometallique:7, ampoule_condensat_vide:8})){
    assert.equal(profile.cargoHold[id], Number(raw.cargoHold[id] || 0) + amount);
  }
  raw.craftingJob.paidCosts = null;
  assert.throws(()=>recoverRetiredShipProfile(raw), error=>error.retiredShipRecovery === true);
});

test("offline retirement is persisted before loading profiles and is not repeated", async ()=>{
  let saved = oldProfile();
  let writes = 0;
  const manager = createProfileManager({cleanName:v=>String(v),
    loadProfileEntries:async sanitize=>[["account:retired", sanitize(saved)]],
    persistProfileEntries:async entries=>{writes++;saved = structuredClone(entries[0][1]);}});
  await manager.load();
  assert.equal(writes, 1);
  assert(!saved.ownedShips.includes("imperial"));
  await manager.load();
  assert.equal(writes, 1);
});

test("failed retirement persistence cannot expose a refunded profile or create replacement accounts", async ()=>{
  const raw = oldProfile();
  raw.craftingJob = {recipeId:"craft_ship_imperial"};
  const before = JSON.stringify(raw);
  const manager = createProfileManager({cleanName:v=>String(v),
    loadProfileEntries:async sanitize=>[["account:retired", sanitize(raw)]],
    persistProfileEntries:async ()=>{throw new Error("storage unavailable");}});
  await assert.rejects(manager.load(), /storage unavailable/);
  assert.equal(manager.listProfileEntries().length, 0);
  assert.equal(JSON.stringify(raw), before);
});
