import assert from "node:assert/strict";
import test from "node:test";
import { normalizeState } from "../../src/core/stateNormalizer.js";
import { skills } from "../../src/data/catalog.js";
import { getXpNextForLevel } from "../../src/data/xpCurve.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { performServerPrestige } from "../src/players/progressionActions.js";
import { PROGRESSION_PORTAL_IDS } from "../../src/shared/progressionUnlocks.js";

function maxedSkillRanks(){
  return Object.fromEntries(skills.map(skill=>[
    skill.id,
    skill.levels.map(node=>Array.isArray(node.ranks) ? node.ranks.length : 1)
  ]));
}

function eligibleProfile(){
  return {
    player:{level:50, xp:0, skillPoints:0},
    completedPortals:Object.fromEntries(PROGRESSION_PORTAL_IDS.map(portalId=>[portalId, 1])),
    skillRanks:maxedSkillRanks(),
    skillLevels:Object.fromEntries(skills.map(skill=>[skill.id, skill.levels.length])),
    cargoHold:{},
    prestigeCount:0
  };
}

test("Ascension is unique and unlocks the second level loop", ()=>{
  const profile = eligibleProfile();
  const first = performServerPrestige(profile);

  assert.equal(first.ok, true);
  assert.equal(profile.prestigeCount, 1);
  assert.equal(profile.player.level, 1);
  assert.equal(profile.player.xp, 0);
  assert.equal(profile.player.xpNext, 3000);

  profile.player.level = 50;
  const second = performServerPrestige(profile);

  assert.equal(second.ok, false);
  assert.equal(second.reason, "Ascension deja accomplie.");
  assert.equal(profile.prestigeCount, 1);
});

test("Ascension does not require maxed skills once level fifty and all portals are complete", ()=>{
  const profile = eligibleProfile();
  profile.skillRanks = {};
  profile.skillLevels = {};

  const result = performServerPrestige(profile);

  assert.equal(result.ok, true);
  assert.equal(profile.prestigeCount, 1);
});

test("Ascension remains locked until all nine progression portals are completed", ()=>{
  for(const missingPortalId of PROGRESSION_PORTAL_IDS){
    const profile = eligibleProfile();
    delete profile.completedPortals[missingPortalId];

    const result = performServerPrestige(profile);

    assert.equal(result.ok, false);
    assert.match(result.reason, /9 portails/i);
    assert.equal(profile.prestigeCount, 0);
  }
});

test("profile sanitization clamps old prestige loops and impossible levels", ()=>{
  const firstLoop = sanitizeProfile({player:{level:83}, prestigeCount:0});
  const oldMultiLoop = sanitizeProfile({player:{level:145}, prestigeCount:7});

  assert.equal(firstLoop.player.level, 50);
  assert.equal(firstLoop.prestigeCount, 0);
  assert.equal(oldMultiLoop.player.level, 100);
  assert.equal(oldMultiLoop.prestigeCount, 1);
});

test("local state normalization recalculates XP after an Ascension level clamp", ()=>{
  const normalized = normalizeState({
    player:{level:83, xp:Number.MAX_SAFE_INTEGER, xpNext:getXpNextForLevel(83)},
    prestigeCount:0,
    xpCurveVersion:Number.MAX_SAFE_INTEGER
  });

  assert.equal(normalized.player.level, 50);
  assert.equal(normalized.player.xpNext, getXpNextForLevel(50));
  assert.equal(normalized.player.xp, getXpNextForLevel(50));
});
