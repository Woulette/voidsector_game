import assert from "node:assert/strict";
import test from "node:test";
import { questCatalog } from "../../src/data/progression.js";
import { QUEST_CATALOG_REVISION, REVISED_QUEST_SOURCE_IDS } from "../../src/shared/quests/catalogRevision.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { createProfileManager } from "../src/players/profiles.js";
import { migrateQuestCatalog } from "../src/quests/questCatalogMigration.js";
import { acceptServerQuest } from "../src/quests/questState.js";

const revisedSources = new Set(REVISED_QUEST_SOURCE_IDS);
function legacyProfile(firmId){
  const profile = createDefaultProfile();
  delete profile.questCatalogRevision;
  profile.player.firmId = firmId;
  profile.player.level = 22;
  profile.tutorial.status = "completed";
  const quests = questCatalog.filter(q=>q.firmId === firmId && q.category === "normal" && revisedSources.has(q.sourceQuestId || q.id));
  assert.equal(quests.length, 5);
  profile.activeQuestIds = quests.map(q=>q.id);
  profile.activeQuestId = quests[2].id;
  for(const quest of quests){
    profile.questProgress[quest.id] = 2;
    profile.questFailProgress[quest.id] = {hpLost:12};
  }
  return {profile, quests};
}

for(const firmId of ["astra", "cyan", "jaune", "verte"]){
  test(`catalogue recovery frees five blocked slots and allows corrected contracts: ${firmId}`, ()=>{
    const {profile, quests} = legacyProfile(firmId);
    const credits = profile.player.credits;
    const repaired = sanitizeProfile(profile);
    assert.deepEqual(repaired.activeQuestIds, []);
    assert.equal(repaired.activeQuestId, null);
    assert.deepEqual(repaired.questProgress, {});
    assert.deepEqual(repaired.questFailProgress, {});
    assert.equal(repaired.questCatalogRevision, QUEST_CATALOG_REVISION);
    assert.equal(repaired.player.credits, credits);
    assert.deepEqual(repaired.tutorial, profile.tutorial);
    assert.equal(repaired.activityLog.filter(e=>e.id === `quest-catalog-revision-${QUEST_CATALOG_REVISION}`).length, 1);
    assert.equal(acceptServerQuest(repaired, quests[0].id).ok, true);
    repaired.questProgress[quests[0].id] = 1;
    const reloaded = sanitizeProfile(repaired);
    assert.deepEqual(reloaded.activeQuestIds, [quests[0].id]);
    assert.equal(reloaded.questProgress[quests[0].id], 1);
    assert.deepEqual(sanitizeProfile(reloaded), reloaded);
  });
}

test("migration preserves claims, unrelated attempts, identity, inventory and currencies", ()=>{
  const {profile, quests} = legacyProfile("cyan");
  const intact = questCatalog.find(q=>q.firmId === "cyan" && q.sourceQuestId === "quest_astra05_boss_crystal_01");
  profile.activeQuestIds = [quests[0].id, intact.id];
  profile.activeQuestId = quests[0].id;
  profile.questProgress[intact.id] = 3;
  profile.completedQuestClaims[quests[1].id] = true;
  profile.questProgress[quests[1].id] = 5;
  const before = structuredClone(profile);
  const result = migrateQuestCatalog(profile, {now:123456});
  assert.deepEqual(result.clearedActiveQuestIds, [quests[0].id]);
  assert.deepEqual(profile.activeQuestIds, [intact.id]);
  assert.equal(profile.activeQuestId, intact.id);
  assert.equal(profile.questProgress[intact.id], 3);
  assert.deepEqual(profile.completedQuestClaims, before.completedQuestClaims);
  assert.equal(profile.questProgress[quests[1].id], 5);
  for(const field of ["player", "inventoryItems", "ammoInventory", "tutorial", "ownedShips", "shipLoadouts", "materialInventory"]){
    assert.deepEqual(profile[field], before[field]);
  }
  assert.equal(acceptServerQuest(profile, quests[1].id).ok, false);
  const once = structuredClone(profile);
  assert.equal(migrateQuestCatalog(profile).changed, false);
  assert.deepEqual(profile, once);
});

test("loading offline legacy accounts durably persists only the repaired journals", async()=>{
  const {profile} = legacyProfile("verte");
  const saves = [];
  const manager = createProfileManager({
    cleanName:value=>String(value || "Pilote"), logger:{warn(){}},
    loadProfileEntries:async sanitize=>[["account:legacy", sanitize(profile)], ["account:untouched", sanitize(createDefaultProfile())]],
    persistProfileEntries:async entries=>saves.push(structuredClone(entries))
  });
  await manager.load();
  assert.equal(saves.length, 1);
  assert.equal(saves[0][0][0], "account:legacy");
  assert.deepEqual(saves[0][0][1].activeQuestIds, []);
  assert.equal(saves[0][0][1].questCatalogRevision, QUEST_CATALOG_REVISION);
});
