import assert from "node:assert/strict";
import test from "node:test";
import { tickServerRefineryProduction } from "../src/economy/refineryProduction.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

test("level three advanced materials produce 57 units across frequent refinery ticks", ()=>{
  const profile = createDefaultProfile();
  profile.refineryLevels = {
    ...profile.refineryLevels,
    conducteur_renforce:3,
    blindage_composite:3
  };
  profile.cargoHold = {
    ...profile.cargoHold,
    alliage_cuivre_zinc:1000,
    plaque_nickel_titane:1000,
    catalyseur_quantique:1000,
    conducteur_renforce:0,
    blindage_composite:0
  };
  profile.refineryLastTick = 1_000;

  for(let tick = 1; tick <= 120; tick += 1){
    tickServerRefineryProduction(profile, 1_000 + tick * 30_000);
  }

  assert.equal(profile.cargoHold.conducteur_renforce, 57);
  assert.equal(profile.cargoHold.blindage_composite, 57);
  assert.equal(profile.cargoHold.alliage_cuivre_zinc, 430);
  assert.equal(profile.cargoHold.plaque_nickel_titane, 430);
  assert.equal(profile.cargoHold.catalyseur_quantique, 430);
});

test("automatic transformed production consumes its server-side recipe", ()=>{
  const profile = createDefaultProfile();
  profile.refineryLevels = {...profile.refineryLevels, alliage_cuivre_zinc:2};
  profile.refineryProductionDisabled = {
    cuivre_orbital:true,
    zinc_spatial:true,
    nickel_brut:true,
    titane_fissure:true,
    silice_conductrice:true
  };
  profile.cargoHold = {
    ...profile.cargoHold,
    cuivre_orbital:5000,
    zinc_spatial:5000,
    alliage_cuivre_zinc:0
  };
  profile.refineryLastTick = 1_000;

  tickServerRefineryProduction(profile, 1_000 + 3_600_000);

  assert.equal(profile.cargoHold.alliage_cuivre_zinc, 294);
  assert.equal(profile.cargoHold.cuivre_orbital, 2060);
  assert.equal(profile.cargoHold.zinc_spatial, 2060);
});

test("automatic transformed production stops when ingredients are missing", ()=>{
  const profile = createDefaultProfile();
  profile.refineryLevels = {...profile.refineryLevels, alliage_cuivre_zinc:2};
  profile.refineryProductionDisabled = {
    cuivre_orbital:true,
    zinc_spatial:true,
    nickel_brut:true,
    titane_fissure:true,
    silice_conductrice:true
  };
  profile.cargoHold = {
    ...profile.cargoHold,
    cuivre_orbital:0,
    zinc_spatial:0,
    alliage_cuivre_zinc:0
  };
  profile.refineryLastTick = 1_000;

  tickServerRefineryProduction(profile, 1_000 + 3_600_000);

  assert.equal(profile.cargoHold.alliage_cuivre_zinc, 0);
  assert.equal(profile.cargoHold.cuivre_orbital, 0);
  assert.equal(profile.cargoHold.zinc_spatial, 0);
});

test("automatic transformed production is limited by stock without going negative", ()=>{
  const profile = createDefaultProfile();
  profile.refineryLevels = {...profile.refineryLevels, alliage_cuivre_zinc:2};
  profile.refineryProductionDisabled = {
    cuivre_orbital:true,
    zinc_spatial:true,
    nickel_brut:true,
    titane_fissure:true,
    silice_conductrice:true
  };
  profile.cargoHold = {
    ...profile.cargoHold,
    cuivre_orbital:25,
    zinc_spatial:25,
    alliage_cuivre_zinc:0
  };
  profile.refineryLastTick = 1_000;

  tickServerRefineryProduction(profile, 1_000 + 3_600_000);

  assert.equal(profile.cargoHold.alliage_cuivre_zinc, 2);
  assert.equal(profile.cargoHold.cuivre_orbital, 5);
  assert.equal(profile.cargoHold.zinc_spatial, 5);
});

test("a full transformed-material storage consumes no recipe ingredients", ()=>{
  const profile = createDefaultProfile();
  profile.refineryLevels = {...profile.refineryLevels, alliage_cuivre_zinc:2};
  profile.refineryProductionDisabled = {
    cuivre_orbital:true,
    zinc_spatial:true,
    nickel_brut:true,
    titane_fissure:true,
    silice_conductrice:true
  };
  profile.cargoHold = {
    ...profile.cargoHold,
    cuivre_orbital:5000,
    zinc_spatial:5000,
    alliage_cuivre_zinc:10000
  };
  profile.refineryLastTick = 1_000;

  tickServerRefineryProduction(profile, 1_000 + 3_600_000);

  assert.equal(profile.cargoHold.alliage_cuivre_zinc, 10000);
  assert.equal(profile.cargoHold.cuivre_orbital, 5000);
  assert.equal(profile.cargoHold.zinc_spatial, 5000);
});

test("refinery fractional production survives profile sanitization", ()=>{
  const profile = sanitizeProfile({
    refineryProductionRemainders:{conducteur_renforce:0.95}
  });

  assert.equal(profile.refineryProductionRemainders.conducteur_renforce, 0.95);
});
