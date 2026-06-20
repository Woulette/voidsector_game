import assert from "node:assert/strict";
import test from "node:test";
import { premiumRewardCalendar } from "../../src/data/premium.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { acceptServerQuest, claimServerQuest } from "../src/quests/quests.js";
import { getQuest } from "../src/quests/questState.js";

function createPremiumActionFixture(profile = createDefaultProfile()){
  let persisted = 0;
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){ persisted += 1; },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });
  return {
    manager,
    profile,
    profiles,
    get persisted(){ return persisted; }
  };
}

test("premium daily reward requires an active premium subscription", ()=>{
  const fixture = createPremiumActionFixture();

  const result = fixture.manager.claimPremiumReward({player:{name:"Pilot"}});

  assert.equal(result.ok, false);
  assert.match(result.reason, /Premium requis/);
  assert.equal(fixture.persisted, 0);
});

test("premium daily reward grants the next monthly reward once per day", ()=>{
  const profile = createDefaultProfile();
  profile.player.premiumUntil = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const fixture = createPremiumActionFixture(profile);

  const result = fixture.manager.claimPremiumReward({player:{name:"Pilot"}});
  const next = fixture.profiles.get("Pilot");
  const expectedReward = premiumRewardCalendar[0].reward;

  assert.equal(result.ok, true);
  assert.equal(result.day, 1);
  assert.deepEqual(next.premiumRewardState.claimedDays, [1]);
  assert.equal(next.player.credits, expectedReward.credits);
  assert.equal(fixture.persisted, 1);

  const second = fixture.manager.claimPremiumReward({player:{name:"Pilot"}});
  assert.equal(second.ok, false);
  assert.match(second.reason, /deja reclamee aujourd'hui/);
  assert.equal(fixture.persisted, 1);
});

test("quest hall weekly quests are premium locked but firm weekly quests remain normal", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 10;
  const weeklyQuest = getQuest("quest_weekly_assault");

  const locked = acceptServerQuest(profile, weeklyQuest.id);
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /Premium requis/);

  profile.player.premiumUntil = Date.now() + 24 * 60 * 60 * 1000;
  const accepted = acceptServerQuest(profile, weeklyQuest.id);
  assert.equal(accepted.ok, true);
  assert.equal(profile.activeQuestIds.includes(weeklyQuest.id), true);
});

test("weekly quest rewards cannot be claimed after premium expires", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 10;
  const weeklyQuest = getQuest("quest_weekly_assault");
  profile.player.premiumUntil = Date.now() + 24 * 60 * 60 * 1000;
  acceptServerQuest(profile, weeklyQuest.id);
  profile.questProgress[weeklyQuest.id] = weeklyQuest.objective.count;

  profile.player.premiumUntil = 1;
  const lockedClaim = claimServerQuest(profile, weeklyQuest.id);
  assert.equal(lockedClaim.ok, false);
  assert.match(lockedClaim.reason, /Premium requis/);

  profile.player.premiumUntil = Date.now() + 24 * 60 * 60 * 1000;
  const claimed = claimServerQuest(profile, weeklyQuest.id);
  assert.equal(claimed.ok, true);
  assert.equal(profile.completedQuestClaims[weeklyQuest.id], true);
});
