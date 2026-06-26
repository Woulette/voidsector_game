import assert from "node:assert/strict";
import test from "node:test";
import { questCatalog } from "../../src/data/progression.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { recordServerQuestDeath } from "../src/quests/questFailures.js";
import { progressServerQuestKill } from "../src/quests/quests.js";
import { acceptServerQuest, canClaimQuest, getQuest, getQuestObjectiveProgress, getQuestObjectives, isQuestUnlocked } from "../src/quests/questState.js";

const QUEST_ID = "quest_lv9_ca_sent_le_poisson_pouris";
const MOUCHERON_QUEST_ID = "quest_lv9_moucheron";
const VORAK_QUEST_ID = "quest_lv9_ruee_vorak";
const TRACKER_QUEST_ID = "quest_lv9_chasse_abyssale";
const RARE_QUEST_ID = "quest_lv9_reflets_du_neant";
const LEVEL_NINE_REWARD = {credits:250000, premium:350, xp:45000, materials:{}};
const LEVEL_NINE_NORMAL_IDS = [QUEST_ID, MOUCHERON_QUEST_ID, VORAK_QUEST_ID, TRACKER_QUEST_ID];

test("Essaim spectral is removed from normal level nine quests", ()=>{
  assert.equal(questCatalog.some(quest=>quest.sourceQuestId === "quest_astra03_spectral_normal_01"), false);
  assert.equal(questCatalog.some(quest=>quest.title === "Essaim spectral"), false);
});

test("level nine kill quests use requested rewards and count on any map", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 9;
  const moucheron = getQuest(MOUCHERON_QUEST_ID);
  const vorak = getQuest(VORAK_QUEST_ID);
  const tracker = getQuest(TRACKER_QUEST_ID);
  assert.equal(moucheron.requiredLevel, 9);
  assert.equal(vorak.requiredLevel, 9);
  assert.equal(tracker.requiredLevel, 9);
  assert.deepEqual(moucheron.rewards, LEVEL_NINE_REWARD);
  assert.deepEqual(vorak.rewards, LEVEL_NINE_REWARD);
  assert.deepEqual(tracker.rewards, LEVEL_NINE_REWARD);
  assert.equal(moucheron.objective.zone, undefined);
  assert.equal(vorak.objective.zone, undefined);
  assert.equal(tracker.objective.zone, undefined);
  assert.equal(acceptServerQuest(profile, MOUCHERON_QUEST_ID).ok, true);
  assert.equal(acceptServerQuest(profile, VORAK_QUEST_ID).ok, true);
  assert.equal(acceptServerQuest(profile, TRACKER_QUEST_ID).ok, true);

  for(let index = 0; index < 40; index += 1){
    progressServerQuestKill(profile, {kind:"drone_pirate", zoneName:`ORB-MAP-${index}`});
  }
  for(let index = 0; index < 30; index += 1){
    progressServerQuestKill(profile, {kind:"raider_astral", zoneName:`VORAK-MAP-${index}`});
  }
  for(let index = 0; index < 20; index += 1){
    progressServerQuestKill(profile, {kind:"cuirasse_nebulaire", zoneName:`TRACKER-MAP-${index}`});
  }

  assert.equal(getQuestObjectiveProgress(profile, MOUCHERON_QUEST_ID, moucheron.objective, 0), 40);
  assert.equal(getQuestObjectiveProgress(profile, VORAK_QUEST_ID, vorak.objective, 0), 30);
  assert.equal(getQuestObjectiveProgress(profile, TRACKER_QUEST_ID, tracker.objective, 0), 20);
  assert.equal(canClaimQuest(profile, moucheron), true);
  assert.equal(canClaimQuest(profile, vorak), true);
  assert.equal(canClaimQuest(profile, tracker), true);
});

test("Reflets du néant unlocks after normal level nine quests", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 9;
  const quest = getQuest(RARE_QUEST_ID);
  const requiredQuestIds = questCatalog
    .filter(entry=>entry.firmId === "astra"
      && entry.id !== RARE_QUEST_ID
      && !entry.rare
      && entry.category === "normal"
      && entry.requiredLevel === 9)
    .map(entry=>entry.id)
    .sort();

  assert.deepEqual(requiredQuestIds, [...LEVEL_NINE_NORMAL_IDS].sort());
  assert.equal(quest.rare, true);
  assert.equal(isQuestUnlocked(profile, quest), false);
  for(const id of LEVEL_NINE_NORMAL_IDS) profile.completedQuestClaims[id] = true;
  assert.equal(isQuestUnlocked(profile, quest), true);
});

test("Reflets du néant counts crystals globally, resets on death and has requested rewards", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 9;
  for(const id of LEVEL_NINE_NORMAL_IDS) profile.completedQuestClaims[id] = true;
  const quest = getQuest(RARE_QUEST_ID);
  assert.deepEqual(quest.rewards, {
    credits:1200000,
    premium:1400,
    xp:125000,
    materials:{},
    portalPieces:{blue:2},
    ammo:{rocket_r2:150}
  });
  assert.equal(quest.failConditions.deathResets, true);
  assert.equal(acceptServerQuest(profile, RARE_QUEST_ID).ok, true);

  progressServerQuestKill(profile, {kind:"eclanite", zoneName:"ANY-MAP"});
  assert.equal(getQuestObjectiveProgress(profile, RARE_QUEST_ID, quest.objective, 0), 1);
  const failure = recordServerQuestDeath(profile);
  assert.equal(failure.failed.length, 1);
  assert.equal(profile.activeQuestIds.includes(RARE_QUEST_ID), false);
  assert.equal(getQuestObjectiveProgress(profile, RARE_QUEST_ID, quest.objective, 0), 0);

  assert.equal(acceptServerQuest(profile, RARE_QUEST_ID).ok, true);
  for(let index = 0; index < 10; index += 1){
    progressServerQuestKill(profile, {kind:"eclanite", zoneName:`CRYSTAL-MAP-${index}`});
  }
  assert.equal(getQuestObjectiveProgress(profile, RARE_QUEST_ID, quest.objective, 0), 10);
  assert.equal(canClaimQuest(profile, quest), true);
});

function makeActiveQuestProfile(laserCount){
  const profile = createDefaultProfile();
  const quest = getQuest(QUEST_ID);
  profile.player.level = 9;
  profile.activeShip = "astralis";
  profile.selectedShip = "astralis";
  profile.ownedShips.push("astralis");
  profile.shipLoadouts.astralis = {
    lasers:Array.from({length:laserCount}, (_, index)=>`laser_${index + 1}`),
    generators:[],
    extras:[]
  };
  profile.activeQuestIds = [quest.id];
  profile.activeQuestId = quest.id;
  profile.questProgress[quest.id] = 0;
  return {profile, quest};
}

test("Ça sent le poisson pouris requires at least eight lasers on the active ship", ()=>{
  const seven = makeActiveQuestProfile(7);
  const eight = makeActiveQuestProfile(8);
  const fifteen = makeActiveQuestProfile(15);
  const objective = getQuestObjectives(seven.quest)[0];

  assert.equal(seven.quest.requiredLevel, 9);
  assert.deepEqual(seven.quest.rewards, LEVEL_NINE_REWARD);
  assert.equal(getQuestObjectiveProgress(seven.profile, QUEST_ID, objective, 0), 7);
  assert.equal(canClaimQuest(seven.profile, seven.quest), false);
  assert.equal(getQuestObjectiveProgress(eight.profile, QUEST_ID, objective, 0), 8);
  assert.equal(canClaimQuest(eight.profile, eight.quest), true);
  assert.equal(getQuestObjectiveProgress(fifteen.profile, QUEST_ID, objective, 0), 8);
  assert.equal(canClaimQuest(fifteen.profile, fifteen.quest), true);
});

test("lasers on another ship or on drones do not count", ()=>{
  const {profile, quest} = makeActiveQuestProfile(7);
  const objective = getQuestObjectives(quest)[0];
  profile.shipLoadouts.razorion = {lasers:["other_laser"], generators:[], extras:[]};
  profile.droneLoadout = ["drone_laser"];

  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, objective, 0), 7);
  assert.equal(canClaimQuest(profile, quest), false);
});

test("equipping the eighth laser auto-claims the level nine quest", ()=>{
  const profile = createDefaultProfile();
  const quest = getQuest(QUEST_ID);
  profile.player.level = 9;
  profile.player.credits = 0;
  profile.player.premium = 0;
  profile.activeShip = "astralis";
  profile.selectedShip = "astralis";
  profile.ownedShips.push("astralis");
  profile.inventoryItems.push(...Array.from({length:8}, (_, index)=>({
    uid:`quest_laser_${index + 1}`,
    itemId:"laser_mk1"
  })));
  profile.shipLoadouts.astralis = {
    lasers:Array.from({length:8}, (_, index)=>index < 7 ? `quest_laser_${index + 1}` : null),
    generators:Array(10).fill(null),
    extras:Array(5).fill(null)
  };
  assert.equal(acceptServerQuest(profile, QUEST_ID).ok, true);

  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });
  const result = manager.applyEquipmentAction({
    player:{name:"Pilot"},
    action:{kind:"equip", type:"laser", index:7, inventoryUid:"quest_laser_8", shipId:"astralis"}
  });

  assert.equal(result.ok, true);
  assert.equal(result.claimedQuests.length, 1);
  assert.equal(result.claimedQuests[0].quest.id, quest.id);
  assert.equal(result.profile.completedQuestClaims[quest.id], true);
  assert.equal(result.profile.player.credits, 250000);
  assert.equal(result.profile.player.premium, 350);
  assert.equal(result.claimedQuests[0].reward.xp, 45000);
});
