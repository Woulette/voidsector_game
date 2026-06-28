import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { claimCompletedServerQuests, progressServerQuestAction } from "../src/quests/quests.js";
import { getQuest, getQuestObjectiveKey, getQuestObjectives } from "../src/quests/questState.js";
import { createProfileActions } from "../src/players/profileActions.js";

test("Ricky delivery consumes ten teleportation fluids and completes the objective", ()=>{
  const profile = createDefaultProfile();
  const quest = getQuest("quest_lv5_call_for_help");
  const objectives = getQuestObjectives(quest);
  const fluidIndex = objectives.findIndex(objective=>objective.id === "fluides");
  profile.activeQuestIds = [quest.id];
  profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = {};

  objectives.forEach((objective, index)=>{
    if(index === fluidIndex) return;
    profile.questProgress[quest.id][getQuestObjectiveKey(objective, index)] = Number(objective.count || 0);
  });
  for(let index = 0; index < 10; index += 1){
    profile.inventoryItems.push({uid:`inv_teleportation_fluid_test_${index}`, itemId:"teleportation_fluid"});
  }

  const result = progressServerQuestAction(profile, {
    type:"deliver_item",
    itemId:"teleportation_fluid",
    npcId:"astra02_portal_mechanic",
    zoneName:"Helion-02"
  });

  assert.equal(result.updates.length, 1);
  assert.equal(result.updates[0].objectiveProgress, 10);
  assert.equal(profile.inventoryItems.some(item=>item.itemId === "teleportation_fluid"), false);
});

test("owning Ricky fluids alone does not complete the quest", ()=>{
  const profile = createDefaultProfile();
  const quest = getQuest("quest_lv5_call_for_help");
  const objectives = getQuestObjectives(quest);
  const fluidIndex = objectives.findIndex(objective=>objective.id === "fluides");
  profile.activeQuestIds = [quest.id];
  profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = {};

  objectives.forEach((objective, index)=>{
    if(index === fluidIndex) return;
    profile.questProgress[quest.id][getQuestObjectiveKey(objective, index)] = Number(objective.count || 0);
  });
  profile.inventoryItems.push({uid:"inv_teleportation_fluid_stack", itemId:"teleportation_fluid", quantity:10});

  const result = claimCompletedServerQuests(profile, [quest.id]);

  assert.equal(result.claimed.length, 0);
  assert.equal(profile.completedQuestClaims[quest.id], undefined);
});

test("Ricky delivery auto-claims the completed quest rewards through profile actions", ()=>{
  let persisted = 0;
  const profile = createDefaultProfile();
  const quest = getQuest("quest_lv5_call_for_help");
  const objectives = getQuestObjectives(quest);
  const fluidIndex = objectives.findIndex(objective=>objective.id === "fluides");
  profile.activeQuestIds = [quest.id];
  profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = {};
  profile.player.credits = 0;
  profile.player.premium = 0;

  objectives.forEach((objective, index)=>{
    if(index === fluidIndex) return;
    profile.questProgress[quest.id][getQuestObjectiveKey(objective, index)] = Number(objective.count || 0);
  });
  profile.inventoryItems.push({uid:"inv_teleportation_fluid_stack", itemId:"teleportation_fluid", quantity:10});

  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){ persisted += 1; },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });
  const result = manager.applyQuestAction({
    player:{name:"Pilot"},
    action:{kind:"progress", type:"deliver_item", itemId:"teleportation_fluid", npcId:"astra02_portal_mechanic", zoneName:"Helion-02"}
  });
  const next = profiles.get("Pilot");

  assert.equal(result.ok, true);
  assert.equal(result.claimedQuests.length, 1);
  assert.equal(result.claimedQuests[0].reward.credits, quest.rewards.credits);
  assert.equal(next.completedQuestClaims[quest.id], true);
  assert.equal(next.activeQuestIds.includes(quest.id), false);
  assert.equal(next.player.credits, quest.rewards.credits);
  assert.equal(next.player.premium, quest.rewards.premium);
  assert.equal(persisted, 1);
});

test("ship-state recalculation auto-claims completed ship quests", ()=>{
  const profile = createDefaultProfile();
  const quest = getQuest("quest_lv3_new_range");
  profile.player.level = 3;
  profile.ownedShips = ["orion", "velox"];
  profile.activeShip = "orion";
  profile.selectedShip = "orion";
  profile.activeQuestIds = [quest.id];
  profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = 0;
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = manager.setActiveShipForPlayer({
    player:{name:"Pilot"},
    shipId:"velox",
    worldSession:{mapId:"0", x:0, y:0, hp:15000, maxHp:15000, shield:0, maxShield:0, shipId:"velox"}
  });

  assert.equal(result.ok, true);
  assert.equal(result.claimedQuests.length, 1);
  assert.equal(result.claimedQuests[0].quest.id, quest.id);
  assert.equal(result.profile.completedQuestClaims[quest.id], true);
  assert.equal(result.profile.activeQuestIds.includes(quest.id), false);
});

test("accepting the Velox quest auto-claims when the ship is already owned", ()=>{
  const profile = createDefaultProfile();
  const quest = getQuest("quest_lv3_new_range");
  profile.player.level = 3;
  profile.player.credits = 0;
  profile.player.premium = 0;
  profile.ownedShips = ["orion", "velox"];
  profile.activeShip = "orion";
  profile.selectedShip = "orion";
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = manager.applyQuestAction({
    player:{name:"Pilot"},
    action:{kind:"accept", questId:quest.id}
  });
  const next = profiles.get("Pilot");

  assert.equal(result.ok, true);
  assert.equal(result.claimedQuests.length, 1);
  assert.equal(result.claimedQuests[0].quest.id, quest.id);
  assert.equal(next.completedQuestClaims[quest.id], true);
  assert.equal(next.activeQuestIds.includes(quest.id), false);
  assert.equal(next.player.credits, quest.rewards.credits);
  assert.equal(next.player.premium, quest.rewards.premium);
});

test("accepting the refinery future quest counts upgrades already in progress", ()=>{
  const profile = createDefaultProfile();
  const quest = getQuest("quest_lv3_prepare_future");
  profile.player.level = 3;
  profile.player.credits = 0;
  profile.player.premium = 0;
  profile.refineryLevels = {
    cuivre_orbital:1,
    nickel_brut:1,
    silice_conductrice:1
  };
  profile.refineryUpgradeJobs = {
    "material:cuivre_orbital":{type:"material", id:"cuivre_orbital", fromLevel:1, toLevel:2, startedAt:1, endsAt:999999, duration:999998},
    "material:nickel_brut":{type:"material", id:"nickel_brut", fromLevel:1, toLevel:2, startedAt:1, endsAt:999999, duration:999998},
    "material:silice_conductrice":{type:"material", id:"silice_conductrice", fromLevel:1, toLevel:2, startedAt:1, endsAt:999999, duration:999998}
  };
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = manager.applyQuestAction({
    player:{name:"Pilot"},
    action:{kind:"accept", questId:quest.id}
  });
  const next = profiles.get("Pilot");

  assert.equal(result.ok, true);
  assert.equal(result.claimedQuests.length, 1);
  assert.equal(result.claimedQuests[0].quest.id, quest.id);
  assert.equal(next.completedQuestClaims[quest.id], true);
  assert.equal(next.activeQuestIds.includes(quest.id), false);
  assert.equal(next.player.credits, quest.rewards.credits);
  assert.equal(next.player.premium, quest.rewards.premium);
});
