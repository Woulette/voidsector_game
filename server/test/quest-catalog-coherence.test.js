import assert from "node:assert/strict";
import test from "node:test";

import { FIRMS, getFirmMapName } from "../../src/data/firms.js";
import { questCatalog } from "../../src/data/progression.js";
import { QUEST_BRIEFING_TEXT } from "../../src/data/questBriefings.js";
import { QUEST_CATALOG_REVISION, REVISED_QUEST_SOURCE_IDS } from "../../src/shared/quests/catalogRevision.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { createWorldStateManager } from "../src/world/state.js";
import { acceptServerQuest, canClaimQuest, getQuestObjectives, getQuestObjectiveProgress } from "../src/quests/questState.js";
import { progressServerQuestKill } from "../src/quests/quests.js";
import { claimServerQuest } from "../src/quests/questRewards.js";

const revisions = [
  ["quest_astra05_boss_orb_01", "eclanite", 5, 18, "normal"],
  ["quest_astra05_boss_raider_01", "eclanite", 5, 18, "normal"],
  ["quest_astra05_boss_spectral_01", "cristanite", 5, 19, "normal"],
  ["quest_astra05_boss_nebular_01", "cristanite", 4, 20, "normal"],
  ["quest_astra05_boss_amber_01", "astranite", 3, 22, "normal"],
  ["quest_astra05_boss_daily_01", "eclanite", 10, 18, "daily"],
  ["quest_astra05_boss_daily_02", "cristanite", 8, 20, "daily"],
  ["quest_astra05_boss_weekly_01", "eclanite", 25, 20, "weekly"],
  ["quest_astra05_boss_weekly_02", "astranite", 12, 22, "weekly"]
];

function createWorld(){
  const manager = createWorldStateManager({
    io:{to:()=>({emit:()=>{}})},
    players:new Map()
  });
  const maps = Object.values(WORLD_MAPS).map(map=>({
    ...map,
    state:manager.getWorldMapState(map.id)
  }));
  return {manager, maps};
}

function objectiveAllowsMap(objective, map){
  return (!objective.zone || objective.zone === map.name)
    && (!objective.zones?.length || objective.zones.includes(map.name));
}

function makeProfile(firmId){
  return {
    player:{firmId, level:22, credits:0, premium:0, xp:0, premiumActive:true},
    activeQuestIds:[],
    activeQuestId:null,
    questProgress:{},
    questFailProgress:{},
    completedQuestClaims:{}
  };
}

test("every world kill or quest item objective has a live enemy in an allowed map", ()=>{
  const {maps} = createWorld();
  let inspected = 0;
  for(const quest of questCatalog){
    for(const objective of getQuestObjectives(quest)){
      // Other types are server actions (Ricky, refinery, equipment, portals), not enemies.
      if(!["kill", "quest_item_drop"].includes(objective.type)) continue;
      inspected += 1;
      const candidates = maps.filter(map=>objectiveAllowsMap(objective, map));
      const reachable = candidates.some(map=>map.state.enemies.some(enemy=>
        enemy.hp > 0 && (!objective.target || enemy.kind === objective.target)
      ));
      assert.ok(reachable, `${quest.id}: ${objective.target || "any enemy"} absent from ${candidates.map(map=>map.name).join(", ")}`);
    }
  }
  assert.ok(inspected > 0);
});

test("catalog revision identifies exactly nine families and all 36 firm variants", ()=>{
  assert.equal(QUEST_CATALOG_REVISION, 1);
  assert.deepEqual(REVISED_QUEST_SOURCE_IDS, revisions.map(([id])=>id));
  const changed = questCatalog.filter(quest=>REVISED_QUEST_SOURCE_IDS.includes(quest.sourceQuestId));
  assert.equal(changed.length, 36);
  for(const [sourceId, target, count, requiredLevel, category] of revisions){
    const variants = changed.filter(quest=>quest.sourceQuestId === sourceId);
    assert.deepEqual(variants.map(quest=>quest.firmId).sort(), FIRMS.map(firm=>firm.id).sort(), sourceId);
    for(const quest of variants){
      assert.deepEqual(quest.objective, {type:"kill", target, count, zone:getFirmMapName(quest.firmId, 5)}, quest.id);
      assert.equal(quest.requiredLevel, requiredLevel, quest.id);
      assert.equal(quest.category, category, quest.id);
      assert.doesNotMatch(`${quest.title} ${quest.desc} ${QUEST_BRIEFING_TEXT[sourceId]}`, /boss|vorak|parasite|traqueur|cuirasse/i, quest.id);
      const targetName = target === "eclanite" ? /[ÉE]clanites/i : new RegExp(`${target}s`, "i");
      assert.match(quest.desc, targetName, quest.id);
      assert.match(QUEST_BRIEFING_TEXT[sourceId], targetName, quest.id);
      assert.ok(quest.desc.includes(getFirmMapName(quest.firmId, 5)), quest.id);
    }
  }
  assert.equal(REVISED_QUEST_SOURCE_IDS.includes("quest_astra05_boss_crystal_01"), false);
});

test("each fifth sector has the actual crystal populations and preserves them on respawn", ()=>{
  const {manager, maps} = createWorld();
  for(const firm of FIRMS){
    const map = maps.find(entry=>entry.name === getFirmMapName(firm.id, 5));
    const counts = {};
    for(const enemy of map.state.enemies) counts[enemy.kind] = (counts[enemy.kind] || 0) + 1;
    assert.deepEqual(counts, {eclanite:30, cristanite:16, astranite:4}, firm.id);
    for(const kind of Object.keys(counts)){
      const enemy = map.state.enemies.find(entry=>entry.kind === kind);
      const enemyId = enemy.id;
      enemy.hp = 0;
      manager.respawnWorldEnemy(map.id, enemyId);
      const replacement = map.state.enemies.find(entry=>entry.id === enemyId);
      assert.equal(replacement.kind, kind);
      assert.ok(replacement.hp > 0);
    }
  }
});

for(const firm of FIRMS){
  test(`${firm.label}: corrected contracts reject wrong targets and sectors, then finish once`, ()=>{
    const {maps} = createWorld();
    const map = maps.find(entry=>entry.name === getFirmMapName(firm.id, 5));
    const quests = questCatalog.filter(quest=>quest.firmId === firm.id && REVISED_QUEST_SOURCE_IDS.includes(quest.sourceQuestId));
    assert.equal(quests.length, 9);
    for(const quest of quests){
      const profile = makeProfile(firm.id);
      assert.equal(acceptServerQuest(profile, quest.id).ok, true, quest.id);
      const objective = quest.objective;
      const target = map.state.enemies.find(enemy=>enemy.kind === objective.target);
      assert.ok(target, quest.id);
      for(const wrongMap of maps.filter(entry=>entry.name !== map.name)){
        progressServerQuestKill(profile, {kind:target.kind, zoneName:wrongMap.name});
      }
      for(const wrongTarget of new Set(map.state.enemies.map(enemy=>enemy.kind))){
        if(wrongTarget !== target.kind) progressServerQuestKill(profile, {kind:wrongTarget, zoneName:map.name});
      }
      assert.equal(getQuestObjectiveProgress(profile, quest.id, objective, 0), 0, quest.id);
      assert.equal(claimServerQuest(profile, quest.id).ok, false, quest.id);
      for(let killed = 0; killed < objective.count; killed += 1){
        assert.equal(canClaimQuest(profile, quest), false, quest.id);
        progressServerQuestKill(profile, {kind:target.kind, zoneName:map.name});
      }
      assert.equal(canClaimQuest(profile, quest), true, quest.id);
      assert.equal(claimServerQuest(profile, quest.id).ok, true, quest.id);
      assert.equal(profile.player.credits, quest.rewards.credits, quest.id);
      assert.equal(profile.completedQuestClaims[quest.id], true, quest.id);
      assert.equal(profile.activeQuestIds.includes(quest.id), false, quest.id);
      assert.equal(claimServerQuest(profile, quest.id).ok, false, quest.id);
      assert.equal(acceptServerQuest(profile, quest.id).ok, false, quest.id);
      assert.equal(profile.player.credits, quest.rewards.credits, quest.id);
    }
  });
}
