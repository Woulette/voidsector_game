import assert from "node:assert/strict";
import test from "node:test";

import { skills } from "../../src/data/catalog.js";
import { getSkillNodePortalRequirement } from "../../src/core/skillStore.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { upgradeServerSkill } from "../src/players/progressionActions.js";

function fundedProfile(){
  const profile = createDefaultProfile();
  profile.player.level = 50;
  profile.player.credits = 2_000_000_000;
  profile.player.premium = 2_000_000;
  profile.cargoHold = {
    alliage_cuivre_zinc:20_000,
    plaque_nickel_titane:20_000,
    catalyseur_quantique:20_000,
    conducteur_renforce:20_000,
    blindage_composite:20_000,
    noyau_astra:20_000
  };
  return profile;
}

function completedRanksThrough(nodeIndex){
  return Object.fromEntries(skills.map(skill=>[
    skill.id,
    skill.levels.map((node, index)=>index < nodeIndex ? (Array.isArray(node.ranks) ? node.ranks.length : 1) : 0)
  ]));
}

test("every skill lane now uses the Seuil d'Azuron as its only portal prerequisite", ()=>{
  for(let nodeIndex = 0; nodeIndex < 5; nodeIndex += 1){
    assert.deepEqual(getSkillNodePortalRequirement(nodeIndex), {
      portalId:"blue",
      label:"Le Seuil d’Azuron"
    });
  }
});

test("server refuses skill access before Azuron and accepts it after the first clear", ()=>{
  const profile = fundedProfile();
  const refused = upgradeServerSkill(profile, "damage");
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /Seuil d'Azuron/i);

  profile.completedPortals.blue = 1;
  const accepted = upgradeServerSkill(profile, "damage");
  assert.equal(accepted.ok, true);
  assert.equal(accepted.nodeIndex, 0);
  assert.equal(accepted.rank, 1);
});

test("later skill nodes no longer require violet, red, emerald or void portal clears", ()=>{
  const profile = fundedProfile();
  profile.completedPortals = {blue:1};
  profile.skillRanks = completedRanksThrough(4);
  profile.skillLevels = Object.fromEntries(skills.map(skill=>[skill.id, 4]));

  const result = upgradeServerSkill(profile, "damage");
  assert.equal(result.ok, true);
  assert.equal(result.nodeIndex, 4);
  assert.equal(result.rank, 1);
  assert.deepEqual(profile.completedPortals, {blue:1});
});
