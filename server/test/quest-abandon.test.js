import assert from "node:assert/strict";
import test from "node:test";
import { getTutorialQuestIds } from "../../src/shared/tutorial.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { abandonServerQuest, acceptServerQuest, claimServerQuest, progressServerQuestAction } from "../src/quests/quests.js";
import { getQuest } from "../src/quests/questState.js";

const firms = ["astra", "cyan", "jaune", "verte"];
const firmQuest = (id, firm)=>firm === "astra" ? id : `${id}_${firm}`;

function profileForFirm(firm = "astra"){
  const profile = createDefaultProfile();
  profile.player.firmId = firm;
  profile.player.firmSelected = true;
  profile.player.level = 10;
  profile.tutorial.status = "abandoned";
  return profile;
}

function actionFixture(profile, persist = ()=>{}){
  const key = "account:abandon-test";
  const profiles = new Map([[key, profile]]);
  const actions = createProfileActions({
    profiles,
    persist,
    getExistingProfile:()=>({key, profile:profiles.get(key)})
  });
  return {actions, profiles, key, player:{id:"p1", accountId:"abandon-test"}};
}

for(const firm of firms){
  test(`${firm}: abandoning frees a full journal, resets only that quest and allows a fresh attempt`, ()=>{
    const profile = profileForFirm(firm);
    const ids = [...getTutorialQuestIds(firm).slice(0, 3), firmQuest("quest_lv5_call_for_help", firm), firmQuest("quest_lv10_maintenance_impossible", firm)];
    for(const id of ids) assert.equal(acceptServerQuest(profile, id).ok, true, id);
    const target = ids[1];
    profile.activeQuestId = target;
    profile.questProgress[target] = {storage:1};
    profile.questFailProgress[target] = {hpLost:12};
    const playerBefore = structuredClone(profile.player);
    const inventoryBefore = structuredClone(profile.inventoryItems);
    const otherRun = structuredClone(profile.questFailProgress[ids[0]]);

    assert.equal(abandonServerQuest(profile, target).ok, true);
    assert.equal(profile.activeQuestIds.length, 4);
    assert.equal(profile.activeQuestId, ids[0]);
    assert.equal(Object.hasOwn(profile.questProgress, target), false);
    assert.equal(Object.hasOwn(profile.questFailProgress, target), false);
    assert.deepEqual(profile.questFailProgress[ids[0]], otherRun);
    assert.deepEqual(profile.player, playerBefore);
    assert.deepEqual(profile.inventoryItems, inventoryBefore);
    assert.deepEqual(profile.completedQuestClaims, {});

    const abandoned = structuredClone(profile);
    assert.equal(abandonServerQuest(profile, target).ok, false);
    assert.equal(claimServerQuest(profile, target).ok, false);
    assert.deepEqual(profile, abandoned);
    assert.equal(acceptServerQuest(profile, target).ok, true);
    assert.equal(profile.questFailProgress[target], undefined);
    assert.equal(profile.questProgress[target], 0);
    assert.equal(profile.activeQuestIds.length, 5);
  });

  for(const status of ["active", "paused"]){
    test(`${firm}: all tutorial quests are protected while ${status}, including hunting steps`, ()=>{
      for(const id of getTutorialQuestIds(firm)){
        const profile = profileForFirm(firm);
        if(id === getTutorialQuestIds(firm)[3]){
          for(const prerequisite of getTutorialQuestIds(firm).slice(0, 3)) profile.completedQuestClaims[prerequisite] = true;
        }
        assert.equal(acceptServerQuest(profile, id).ok, true);
        profile.tutorial.status = status;
        profile.tutorial.step = "game_hunt_raiders";
        const previous = structuredClone(profile);
        assert.equal(abandonServerQuest(profile, id).code, "TUTORIAL_QUEST_PROTECTED");
        assert.deepEqual(profile, previous);
      }
    });
  }
}

test("unknown, foreign and already rewarded quests cannot be abandoned or replayed", ()=>{
  const profile = profileForFirm();
  const questId = "quest_drone_cleanup";
  assert.equal(acceptServerQuest(profile, questId).ok, true);
  profile.questProgress[questId] = getQuest(questId).objective.count;
  assert.equal(claimServerQuest(profile, questId).ok, true);
  const before = structuredClone(profile);
  assert.equal(abandonServerQuest(profile, questId).ok, false);
  assert.equal(acceptServerQuest(profile, questId).ok, false);
  assert.equal(claimServerQuest(profile, questId).ok, false);
  assert.equal(abandonServerQuest(profile, "quest_drone_cleanup_cyan").ok, false);
  assert.equal(abandonServerQuest(profile, "not-a-quest").ok, false);
  assert.deepEqual(profile, before);
});

test("abandonment clears temporary Ricky items but preserves earned keys, fluids and other quest claims", ()=>{
  const profile = profileForFirm();
  const questId = "quest_lv10_maintenance_impossible";
  assert.equal(acceptServerQuest(profile, questId).ok, true);
  profile.questProgress[questId] = {talk_start:1, stabilisateurs:4};
  const oldRunId = profile.questFailProgress[questId].runId;
  profile.inventoryItems.push({uid:"earned-key", itemId:"portal_anchor_key", quantity:1});
  profile.inventoryItems.push({uid:"owned-fluids", itemId:"teleportation_fluid", quantity:10});
  profile.completedQuestClaims.quest_lv5_call_for_help = true;
  const inventory = structuredClone(profile.inventoryItems);
  assert.equal(abandonServerQuest(profile, questId).ok, true);
  assert.deepEqual(profile.inventoryItems, inventory);
  assert.equal(profile.completedQuestClaims.quest_lv5_call_for_help, true);
  assert.equal(progressServerQuestAction(profile, {type:"quest_item_drop", itemId:"stabilisateur_dimensionnel"}).updates.length, 0);
  assert.equal(acceptServerQuest(profile, questId).ok, true);
  assert.notEqual(profile.questFailProgress[questId].runId, oldRunId);
  assert.deepEqual(profile.questProgress[questId], {});
});

test("Ricky rescue cannot be abandoned from the live portal or a launcher with a saved portal session", ()=>{
  for(const savedSession of [false, true]){
    const profile = profileForFirm();
    profile.completedQuestClaims.quest_lv10_maintenance_impossible = true;
    const questId = "quest_lv10_sauvons_deadly";
    assert.equal(acceptServerQuest(profile, questId).ok, true);
    if(savedSession) profile.worldSession = {mapId:"portal-ricky"};
    const previous = structuredClone(profile);
    const result = abandonServerQuest(profile, questId, {mapId:savedSession ? "" : "portal-ricky"});
    assert.equal(result.code, "QUEST_PORTAL_ACTIVE");
    assert.deepEqual(profile, previous);
    profile.worldSession = {mapId:"1"};
    assert.equal(abandonServerQuest(profile, questId, {mapId:"1"}).ok, true);
    assert.equal(profile.completedQuestClaims.quest_lv10_maintenance_impossible, true);
  }
});

test("abandoning another quest does not advance or abandon an active or paused tutorial", async ()=>{
  for(const status of ["active", "paused"]){
    const profile = profileForFirm();
    const questId = "quest_lv5_call_for_help";
    assert.equal(acceptServerQuest(profile, questId).ok, true);
    profile.tutorial.status = status;
    profile.tutorial.step = "game_hunt_pass";
    const tutorialBefore = structuredClone(profile.tutorial);
    const fixture = actionFixture(profile);
    const result = fixture.actions.applyQuestAction({player:fixture.player, action:{kind:"abandon", questId}});
    assert.equal(result.ok, true);
    await result.save;
    assert.deepEqual(result.profile.tutorial, tutorialBefore);
    assert.deepEqual(result.claimedQuests, []);
    assert.equal(result.tutorialChanged, false);
  }
});

test("abandon save failure restores the full original profile and retry can succeed", async ()=>{
  const profile = profileForFirm();
  const questId = "quest_raider_patrol";
  acceptServerQuest(profile, questId);
  profile.questProgress[questId] = 2;
  const original = structuredClone(profile);
  let shouldFail = true;
  const fixture = actionFixture(profile, ()=>shouldFail ? Promise.reject(new Error("db unavailable")) : undefined);
  const first = fixture.actions.applyQuestAction({player:fixture.player, action:{kind:"abandon", questId}});
  assert.equal(first.ok, true);
  await assert.rejects(first.save, /db unavailable/);
  assert.deepEqual(fixture.profiles.get(fixture.key), original);
  shouldFail = false;
  const second = fixture.actions.applyQuestAction({player:fixture.player, action:{kind:"abandon", questId}});
  await second.save;
  assert.equal(second.ok, true);
  assert.equal(fixture.profiles.get(fixture.key).activeQuestIds.includes(questId), false);
  const duplicate = fixture.actions.applyQuestAction({player:fixture.player, action:{kind:"abandon", questId}});
  assert.equal(duplicate.ok, false);
  const claim = fixture.actions.applyQuestAction({player:fixture.player, action:{kind:"claim", questId}});
  assert.equal(claim.ok, false);
});
