import assert from "node:assert/strict";
import test from "node:test";
import { ships } from "../../src/data/ships.js";
import {
  getProgressionUnlockSnapshot,
  PROGRESSION_PORTAL_IDS,
  PROGRESSION_UNLOCKS
} from "../../src/shared/progressionUnlocks.js";
import {
  applyEquipmentUpgrade,
  getTrustedEquipmentUpgradeLevel
} from "../src/economy/equipment.js";
import { getShipPurchase } from "../src/economy/shop.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

function profileActionsFor(profile, accountId = "progression-unlocks"){
  const key = `account:${accountId}`;
  const profiles = new Map([[key, profile]]);
  return {
    actions:createProfileActions({
      profiles,
      persist(){},
      getExistingProfile:()=>({key, profile:profiles.get(key)})
    }),
    player:{id:`socket-${accountId}`, accountId},
    profiles,
    key
  };
}

test("the shared progression contract contains the nine named portal gates", ()=>{
  assert.deepEqual(PROGRESSION_PORTAL_IDS, [
    "blue",
    "violet",
    "red",
    "ionis",
    "emerald",
    "void",
    "prismatic",
    "ancient",
    "eternal"
  ]);
  assert.equal(PROGRESSION_UNLOCKS.eliteSkillShips.portalId, "red");
  assert.equal(PROGRESSION_UNLOCKS.equipmentUpgrades.portalId, "ionis");
  assert.equal(PROGRESSION_UNLOCKS.eliteLaserRecipes.portalId, "emerald");
  assert.equal(PROGRESSION_UNLOCKS.stellarSystemTitle.portalId, "eternal");
  assert.deepEqual(getProgressionUnlockSnapshot({completedPortals:{}}), {
    eliteSkillShips:false,
    equipmentUpgrades:false,
    eliteLaserRecipes:false,
    stellarSystemTitle:false,
    prestige:false
  });
});

test("all elite skill ships require Kharon even when purchase input is forged", ()=>{
  const eliteSkillShips = ships.filter(ship=>ship.skillShip || ship.abilityId);
  assert.deepEqual(eliteSkillShips.map(ship=>ship.id).sort(), ["asterion", "nyxaris", "vesperion"]);
  assert.equal(eliteSkillShips.every(ship=>ship.requiresCompletedPortal === "red"), true);

  const profile = createDefaultProfile();
  profile.player.premium = 1_000_000;
  const {actions, player} = profileActionsFor(profile, "forged-ship-purchase");
  const forgedPurchase = {
    ...getShipPurchase("vesperion"),
    requiresCompletedPortal:null,
    requiresCompletedPortalName:""
  };

  const result = actions.addShipPurchase({player, purchase:forgedPurchase});

  assert.equal(result.ok, false);
  assert.match(result.reason, /Kharon/i);
  assert.equal(profile.player.premium, 1_000_000);
});

test("an owned elite ship cannot be selected before Kharon and sanitizer falls back to Orion", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("vesperion");
  const {actions, player, profiles, key} = profileActionsFor(profile, "owned-locked-ship");

  const locked = actions.setActiveShipForPlayer({player, shipId:"vesperion"});
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /Kharon/i);
  assert.equal(profiles.get(key).activeShip, "orion");

  const forged = sanitizeProfile({
    ...profile,
    activeShip:"vesperion",
    selectedShip:"vesperion"
  });
  assert.equal(forged.ownedShips.includes("vesperion"), true);
  assert.equal(forged.activeShip, "orion");
  assert.equal(forged.selectedShip, "orion");

  profiles.get(key).completedPortals.red = 1;
  const unlocked = actions.setActiveShipForPlayer({player, shipId:"vesperion"});
  assert.equal(unlocked.ok, true);
  assert.equal(unlocked.profile.activeShip, "vesperion");
});

test("Ionis is the sole authority gate for the existing equipment upgrade system", ()=>{
  const beforeIonis = createDefaultProfile();
  beforeIonis.cargoHold.conducteur_renforce = 10;
  beforeIonis.completedPortals.emerald = 1;

  const locked = applyEquipmentUpgrade(beforeIonis, {itemId:"laser_mk1"});
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /Ionis/i);
  assert.equal(beforeIonis.cargoHold.conducteur_renforce, 10);

  beforeIonis.completedPortals.ionis = 1;
  const upgraded = applyEquipmentUpgrade(beforeIonis, {itemId:"laser_mk1"});
  assert.equal(upgraded.ok, true);
  assert.equal(upgraded.level, 1);
  assert.equal(beforeIonis.cargoHold.conducteur_renforce, 9);
});

test("stored upgrade data is sanitized and stays inactive until Ionis", ()=>{
  const profile = sanitizeProfile({
    player:{},
    equipmentUpgrades:{
      laser_mk1:99.8,
      shield_gen:-4,
      unknown_weapon:7,
      rocket_r1:"not-a-number"
    },
    completedPortals:{}
  });

  assert.deepEqual(profile.equipmentUpgrades, {laser_mk1:10});
  assert.equal(getTrustedEquipmentUpgradeLevel(profile, "laser_mk1"), 0);
  profile.completedPortals.ionis = 1;
  assert.equal(getTrustedEquipmentUpgradeLevel(profile, "laser_mk1"), 10);
});
