import assert from "node:assert/strict";
import test from "node:test";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { rollServerQuestItemDrop } from "../src/quests/questItemDrops.js";
import { claimCompletedServerQuests, progressServerQuestAction } from "../src/quests/quests.js";
import { acceptServerQuest, canClaimQuest, getQuest, getQuestObjectiveProgress, getQuestObjectives } from "../src/quests/questState.js";
import { MAPS, getClosedMapPortals, getMapPortals } from "../../src/game/combatData.js";

const QUEST_ID = "quest_lv10_maintenance_impossible";
const RESCUE_QUEST_ID = "quest_lv10_sauvons_deadly";
const ITEM_ID = "stabilisateur_dimensionnel";

test("Maintenance impossible sends each firm to its own map four", ()=>{
  const expected = [
    {questId:QUEST_ID, npcId:"astra02_portal_mechanic", npcZone:"ASTRA-02", dropZone:"ASTRA-04", missionZone:"ASTRA-01"},
    {questId:`${QUEST_ID}_cyan`, npcId:"cyan02_portal_mechanic", npcZone:"CYAN-02", dropZone:"CYAN-04", missionZone:"CYAN-01"},
    {questId:`${QUEST_ID}_jaune`, npcId:"jaune02_portal_mechanic", npcZone:"JAUNE-02", dropZone:"JAUNE-04", missionZone:"JAUNE-01"},
    {questId:`${QUEST_ID}_verte`, npcId:"verte02_portal_mechanic", npcZone:"VERTE-02", dropZone:"VERTE-04", missionZone:"VERTE-01"}
  ];

  for(const entry of expected){
    const quest = getQuest(entry.questId);
    const objectives = getQuestObjectives(quest);
    assert.equal(quest.requiredLevel, 10);
    assert.equal(quest.title, "Maintenance impossible");
    assert.deepEqual(quest.rewards, {credits:500000, premium:400, xp:75000, materials:{}, itemCounts:{portal_anchor_key:1}});
    assert.equal(objectives[0].type, "talk_npc");
    assert.equal(objectives[0].npcId, entry.npcId);
    assert.equal(objectives[0].zone, entry.npcZone);
    assert.equal(objectives[1].type, "quest_item_drop");
    assert.equal(objectives[1].target, undefined);
    assert.equal(objectives[1].itemId, ITEM_ID);
    assert.equal(objectives[1].itemImg, "assets/quest_items/stabilizer_part.png");
    assert.equal(objectives[1].count, 5);
    assert.equal(objectives[1].dropChance, 0.15);
    assert.equal(objectives[1].zone, entry.dropZone);
    assert.equal(objectives[2].npcId, entry.npcId);
    assert.equal(objectives[2].zone, entry.npcZone);
    assert.equal(objectives[3].type, "mission_control");
    assert.equal(objectives[3].stationId, "quests");
    assert.equal(objectives[3].zone, entry.missionZone);
  }
});

test("Maintenance impossible drops stabilizer parts after Ricky sends the player", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 10;
  assert.equal(acceptServerQuest(profile, QUEST_ID).ok, true);

  assert.equal(rollServerQuestItemDrop(profile, {
    enemyKind:"cuirasse_nebulaire",
    zoneName:"ASTRA-04",
    random:()=>0
  }), null);

  const start = progressServerQuestAction(profile, {
    type:"talk_npc",
    npcId:"astra02_portal_mechanic",
    zoneName:"ASTRA-02"
  });
  assert.equal(start.updates.length, 1);

  assert.equal(rollServerQuestItemDrop(profile, {
    enemyKind:"chasseur_spectral",
    zoneName:"ASTRA-03",
    random:()=>0
  }), null);
  assert.equal(rollServerQuestItemDrop(profile, {
    enemyKind:"chasseur_spectral",
    zoneName:"ASTRA-04",
    random:()=>0.151
  }), null);
  const drop = rollServerQuestItemDrop(profile, {
    enemyKind:"chasseur_spectral",
    zoneName:"ASTRA-04",
    random:()=>0.15
  });
  assert.equal(drop.itemId, ITEM_ID);
  assert.equal(drop.itemName, "Piece de stabilisation");
});

test("Maintenance impossible requires five parts, Ricky handoff, then mission control", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 10;
  assert.equal(acceptServerQuest(profile, QUEST_ID).ok, true);
  const quest = getQuest(QUEST_ID);
  const objectives = getQuestObjectives(quest);
  const talkStart = objectives[0];
  const pieces = objectives[1];
  const talkReturn = objectives[2];
  const missionControl = objectives[3];

  progressServerQuestAction(profile, {
    type:"talk_npc",
    npcId:"astra02_portal_mechanic",
    zoneName:"ASTRA-02"
  });
  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, talkStart, 0), 1);
  for(let index = 0; index < 5; index += 1){
    progressServerQuestAction(profile, {type:"quest_item_drop", itemId:ITEM_ID});
  }
  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, pieces, 1), 5);
  assert.equal(canClaimQuest(profile, quest), false);

  progressServerQuestAction(profile, {
    type:"talk_npc",
    npcId:"astra02_portal_mechanic",
    zoneName:"ASTRA-02"
  });
  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, talkReturn, 2), 1);
  assert.equal(canClaimQuest(profile, quest), false);

  progressServerQuestAction(profile, {
    type:"mission_control",
    stationId:"quests",
    zoneName:"ASTRA-01"
  });
  assert.equal(getQuestObjectiveProgress(profile, QUEST_ID, missionControl, 3), 1);
  assert.equal(canClaimQuest(profile, quest), true);

  const claimed = claimCompletedServerQuests(profile, [QUEST_ID]).claimed;
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].reward.itemCounts.portal_anchor_key, 1);
  assert.equal(getInventoryItemCount(profile, "portal_anchor_key"), 1);
});

test("Ricky's portal stays locked while the normal zone four portal remains available", ()=>{
  const cases = [
    {firm:"ASTRA", questId:QUEST_ID},
    {firm:"CYAN", questId:`${QUEST_ID}_cyan`},
    {firm:"JAUNE", questId:`${QUEST_ID}_jaune`},
    {firm:"VERTE", questId:`${QUEST_ID}_verte`}
  ];
  for(const entry of cases){
    const map2 = MAPS.find(map=>map.name === `${entry.firm}-02`);
    const map4 = MAPS.find(map=>map.name === `${entry.firm}-04`);
    assert.ok(map2);
    assert.ok(map4);

    assert.equal(getMapPortals(map2).some(portal=>String(portal.targetMap) === String(map4.id)), true);
    assert.equal(getClosedMapPortals(map2).length, 1);
    assert.equal(getClosedMapPortals(map2)[0].closed, true);

    const questProgress = {[entry.questId]:{talk_start:1, stabilisateurs:5, talk_return:1, mission_control:1}};
    const completedQuestClaims = {[entry.questId]:true};
    const unlockedPortals = getMapPortals(map2, {questProgress, completedQuestClaims});
    const rickyPortal = unlockedPortals.find(portal=>portal.rickyPortal);
    assert.ok(rickyPortal);
    assert.equal(rickyPortal.portalId, "ricky");
    assert.equal(rickyPortal.dungeonPortal, true);
    assert.equal(rickyPortal.targetMap, undefined);
    assert.equal(unlockedPortals.some(portal=>String(portal.targetMap) === String(map4.id)), true);
    assert.equal(getMapPortals(map4, {questProgress, completedQuestClaims}).some(portal=>String(portal.targetMap) === String(map2.id)), true);
    assert.equal(getClosedMapPortals(map2, {questProgress, completedQuestClaims}).length, 0);
  }
});

test("Sauvons Deadly unlocks after Maintenance impossible and progresses on Ricky portal completion", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 10;
  let result = acceptServerQuest(profile, RESCUE_QUEST_ID);
  assert.equal(result.ok, false);

  profile.completedQuestClaims[QUEST_ID] = true;
  result = acceptServerQuest(profile, RESCUE_QUEST_ID);
  assert.equal(result.ok, true);

  const quest = getQuest(RESCUE_QUEST_ID);
  const objective = getQuestObjectives(quest)[0];
  assert.equal(quest.red, true);
  assert.deepEqual(quest.rewards, {
    credits:5000000,
    premium:15000,
    xp:3000000,
    materials:{},
    portalPieces:{blue:10},
    items:["laser_mk3", "pistou_portgun"]
  });
  assert.equal(objective.type, "portal_complete");
  assert.equal(objective.portalId, "ricky");

  progressServerQuestAction(profile, {type:"portal_complete", portalId:"ricky"});
  assert.equal(getQuestObjectiveProgress(profile, RESCUE_QUEST_ID, objective, 0), 1);
  assert.equal(canClaimQuest(profile, quest), true);
});
