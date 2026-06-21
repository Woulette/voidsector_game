import assert from "node:assert/strict";
import test from "node:test";
import { questCatalog } from "../../src/data/progression.js";
import { checkServerQuestTimers, recordServerQuestHpLoss } from "../src/quests/questFailures.js";
import { progressServerQuestKill } from "../src/quests/quests.js";
import { acceptServerQuest, getQuest, getQuestObjectiveProgress, getQuestObjectives, isQuestUnlocked } from "../src/quests/questState.js";

const QUEST_ID = "quest_lv8_un_deja_vu";
const EFFORT_QUEST_ID = "quest_lv8_pendant_effort_pas_reconfort";
const RARE_QUEST_ID = "quest_lv8_je_l_avais_predit";
const LEVEL_EIGHT_REWARD = {credits:150000, premium:300, xp:30000, materials:{}};

function makeProfile(){
  return {
    player:{level:8, firmId:"astra"},
    activeQuestIds:[],
    activeQuestId:null,
    questProgress:{},
    questFailProgress:{},
    completedQuestClaims:{}
  };
}

test("Un Déjà vu is a global level eight boss quest", ()=>{
  const quest = getQuest(QUEST_ID);
  assert.ok(quest);
  assert.equal(quest.requiredLevel, 8);
  assert.equal(quest.failConditions.hpLossLimit, 2000);
  assert.deepEqual(getQuestObjectives(quest).map(objective=>({
    target:objective.target,
    count:objective.count,
    zone:objective.zone,
    zones:objective.zones
  })), [
    {target:"boss_raider_astral", count:4, zone:undefined, zones:undefined},
    {target:"boss_drone_pirate", count:4, zone:undefined, zones:undefined}
  ]);
  assert.equal(questCatalog.filter(entry=>entry.sourceQuestId === QUEST_ID).length, 4);
});

test("both level eight combat quests use the requested reward", ()=>{
  assert.deepEqual(getQuest(QUEST_ID).rewards, LEVEL_EIGHT_REWARD);
  assert.deepEqual(getQuest(EFFORT_QUEST_ID).rewards, LEVEL_EIGHT_REWARD);
});

test("Pendant l'effort, pas de réconfort is global and counts both monster types", ()=>{
  const profile = makeProfile();
  const quest = getQuest(EFFORT_QUEST_ID);
  assert.ok(quest);
  assert.equal(quest.requiredLevel, 8);
  assert.equal(acceptServerQuest(profile, EFFORT_QUEST_ID).ok, true);
  const objectives = getQuestObjectives(quest);

  for(let index = 0; index < 8; index += 1){
    progressServerQuestKill(profile, {kind:"chasseur_spectral", zoneName:`PARASITE-MAP-${index}`});
  }
  for(let index = 0; index < 6; index += 1){
    progressServerQuestKill(profile, {kind:"cuirasse_nebulaire", zoneName:`TRACKER-MAP-${index}`});
  }

  assert.equal(getQuestObjectiveProgress(profile, EFFORT_QUEST_ID, objectives[0], 0), 8);
  assert.equal(getQuestObjectiveProgress(profile, EFFORT_QUEST_ID, objectives[1], 1), 6);
  assert.equal(questCatalog.filter(entry=>entry.sourceQuestId === EFFORT_QUEST_ID).length, 4);
});

test("Je l'avais prédit unlocks after every normal level eight quest", ()=>{
  const profile = makeProfile();
  const quest = getQuest(RARE_QUEST_ID);
  const requiredQuestIds = questCatalog
    .filter(entry=>entry.firmId === "astra"
      && entry.id !== RARE_QUEST_ID
      && !entry.rare
      && entry.category === "normal"
      && entry.requiredLevel === 8)
    .map(entry=>entry.id);

  assert.deepEqual(requiredQuestIds.sort(), [
    "quest_lv8_la_roue_tourne",
    "quest_lv8_pendant_effort_pas_reconfort",
    "quest_lv8_un_deja_vu"
  ]);
  assert.equal(isQuestUnlocked(profile, quest), false);
  for(const id of requiredQuestIds) profile.completedQuestClaims[id] = true;
  assert.equal(isQuestUnlocked(profile, quest), true);
  assert.deepEqual(quest.rewards, {
    credits:1000000,
    premium:1200,
    xp:100000,
    materials:{},
    ammo:{ammo_x3:3000}
  });
});

test("Je l'avais prédit counts global kills and is cancelled after ten minutes", ()=>{
  const profile = makeProfile();
  for(const id of ["quest_lv8_la_roue_tourne", QUEST_ID, EFFORT_QUEST_ID]) profile.completedQuestClaims[id] = true;
  assert.equal(acceptServerQuest(profile, RARE_QUEST_ID).ok, true);
  const quest = getQuest(RARE_QUEST_ID);
  const objectives = getQuestObjectives(quest);
  const startedAt = profile.questFailProgress[RARE_QUEST_ID].timeStartedAt;

  progressServerQuestKill(profile, {kind:"eclanite", zoneName:"ANY-MAP"});
  progressServerQuestKill(profile, {kind:"chasseur_spectral", zoneName:"OTHER-MAP"});
  progressServerQuestKill(profile, {kind:"cuirasse_nebulaire", zoneName:"THIRD-MAP"});
  assert.deepEqual(objectives.map((objective, index)=>
    getQuestObjectiveProgress(profile, RARE_QUEST_ID, objective, index)
  ), [1, 1, 1]);

  const beforeLimit = checkServerQuestTimers(profile, startedAt + 599999);
  assert.equal(beforeLimit.failed.length, 0);
  assert.equal(profile.activeQuestIds.includes(RARE_QUEST_ID), true);

  const failure = checkServerQuestTimers(profile, startedAt + 600000);
  assert.equal(failure.failed.length, 1);
  assert.equal(profile.activeQuestIds.includes(RARE_QUEST_ID), false);
  assert.deepEqual(profile.questProgress[RARE_QUEST_ID], {});
});

test("Un Déjà vu boss kills count on any map", ()=>{
  const profile = makeProfile();
  assert.equal(acceptServerQuest(profile, QUEST_ID).ok, true);
  const quest = getQuest(QUEST_ID);
  const objectives = getQuestObjectives(quest);

  for(let index = 0; index < 4; index += 1){
    progressServerQuestKill(profile, {kind:"boss_raider_astral", zoneName:`ANY-${index}`});
    progressServerQuestKill(profile, {kind:"boss_drone_pirate", zoneName:`OTHER-${index}`});
  }

  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, objectives[0], 0), 4);
  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, objectives[1], 1), 4);
});

test("Un Déjà vu is cancelled after losing 2000 hp", ()=>{
  const profile = makeProfile();
  assert.equal(acceptServerQuest(profile, QUEST_ID).ok, true);
  progressServerQuestKill(profile, {kind:"boss_raider_astral", zoneName:"Helion-02"});

  const firstHit = recordServerQuestHpLoss(profile, 1999);
  assert.equal(firstHit.changed, true);
  assert.equal(firstHit.failed.length, 0);
  assert.equal(profile.activeQuestIds.includes(QUEST_ID), true);

  const failure = recordServerQuestHpLoss(profile, 1);
  assert.equal(failure.changed, true);
  assert.equal(failure.failed.length, 1);
  assert.equal(profile.activeQuestIds.includes(QUEST_ID), false);
  assert.deepEqual(profile.questProgress[QUEST_ID], {});
  assert.equal(profile.questFailProgress[QUEST_ID].hpLost, 0);
});

test("damage without an HP-loss quest does not mark the profile as changed", ()=>{
  const profile = makeProfile();
  const result = recordServerQuestHpLoss(profile, 500);

  assert.equal(result.changed, false);
  assert.deepEqual(result.updates, []);
  assert.deepEqual(result.failed, []);
});
