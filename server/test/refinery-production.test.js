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
    conducteur_renforce:0,
    blindage_composite:0
  };
  profile.refineryLastTick = 1_000;

  for(let tick = 1; tick <= 120; tick += 1){
    tickServerRefineryProduction(profile, 1_000 + tick * 30_000);
  }

  assert.equal(profile.cargoHold.conducteur_renforce, 57);
  assert.equal(profile.cargoHold.blindage_composite, 57);
});

test("refinery fractional production survives profile sanitization", ()=>{
  const profile = sanitizeProfile({
    refineryProductionRemainders:{conducteur_renforce:0.95}
  });

  assert.equal(profile.refineryProductionRemainders.conducteur_renforce, 0.95);
});
