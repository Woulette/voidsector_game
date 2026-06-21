import assert from "node:assert/strict";
import test from "node:test";
import { questCatalog } from "../../src/data/progression.js";
import { compactQuestRewardLabels, createQuestServerEventProcessor, getQuestRewardTone } from "../../src/game/systems/combatQuestServerEvents.js";

function createProcessor({multiplayer, quests, state = null}){
  const toasts = [];
  const lootNotices = [];
  const processor = createQuestServerEventProcessor({
    multiplayer,
    rewards:{showLootNotice:notice=>lootNotices.push(notice)},
    showToast:message=>toasts.push(message),
    getProfileState:()=>state,
    getAllQuests:()=>quests
  });
  return {
    processor,
    toasts,
    lootNotices,
  };
}

test("combat quest progress events never mutate protected local quest progress", ()=>{
  const multiplayer = {
    questProgressEvents:[{updates:[{id:"quest_a", progress:2, target:5, completed:true}]}],
    questEvents:[],
    questFailureEvents:[]
  };
  const state = {questProgress:{}, questFailProgress:{}, activeQuestIds:["quest_a"], activeQuestId:"quest_a"};
  const fixture = createProcessor({
    multiplayer,
    quests:[{id:"quest_a", title:"Test Quest", objective:{count:5}}],
    state
  });

  fixture.processor.applyQuestProgressEvents();

  assert.deepEqual(state.questProgress, {});
  assert.equal(multiplayer.questProgressEvents.length, 0);
  assert.deepEqual(fixture.toasts, ["Objectif serveur termine : Test Quest."]);
});

test("combat quest failure progress updates locally without a full profile sync", ()=>{
  const multiplayer = {
    questProgressEvents:[],
    questEvents:[],
    questFailureEvents:[{
      updates:[{questId:"quest_a", failType:"hpLost", hpLost:90}],
      failed:[{questId:"quest_a", title:"Test Quest", failType:"hpLost"}]
    }]
  };
  const state = {
    questProgress:{quest_a:3},
    questFailProgress:{},
    activeQuestIds:["quest_a", "quest_b"],
    activeQuestId:"quest_a"
  };
  const fixture = createProcessor({
    multiplayer,
    quests:[{id:"quest_a", title:"Test Quest", objective:{count:5}}],
    state
  });

  fixture.processor.applyQuestFailureEvents();

  assert.equal(state.questProgress.quest_a, 3);
  assert.deepEqual(state.questFailProgress, {quest_a:{hpLost:90}});
  assert.deepEqual(state.activeQuestIds, ["quest_a", "quest_b"]);
  assert.equal(state.activeQuestId, "quest_a");
  assert.equal(multiplayer.questFailureEvents.length, 0);
  assert.deepEqual(fixture.toasts, ["Test Quest : limite de vie depassee, quete annulee."]);
});

test("quest claim events emit one compact reward notice per claim id", ()=>{
  const multiplayer = {
    questProgressEvents:[],
    questEvents:[
      {type:"claimed", id:"quest_a", title:"Test Quest", at:1, receivedAt:2, reward:{credits:50, xp:60, premium:7, ammo:{ammo_x1:100}}},
      {type:"claimed", id:"quest_a", title:"Test Quest", at:1, receivedAt:2, reward:{credits:50, xp:60, premium:7, ammo:{ammo_x1:100}}}
    ],
    questFailureEvents:[]
  };
  const fixture = createProcessor({
    multiplayer,
    quests:[{id:"quest_a", special:true}],
  });

  fixture.processor.applyQuestClaimEvents();

  assert.equal(fixture.lootNotices.length, 1);
  assert.equal(fixture.lootNotices[0].questTitle, "Quete : Test Quest");
  assert.equal(fixture.lootNotices[0].questTone, "special");
  assert.deepEqual(fixture.lootNotices[0].items, ["+100 M-1"]);
  assert.equal(fixture.lootNotices[0].duration, 15);
});

test("quest reward tone follows the quest display priority", ()=>{
  assert.equal(getQuestRewardTone({red:true, special:true, rare:true}), "red");
  assert.equal(getQuestRewardTone({special:true, rare:true}), "special");
  assert.equal(getQuestRewardTone({rare:true}), "rare");
  assert.equal(getQuestRewardTone({}), "normal");
});

test("quest reward labels use each reward catalogue", ()=>{
  const labels = compactQuestRewardLabels({
    items:["laser_a"],
    itemCounts:{shield_a:3},
    ammo:{ammo_a:5},
    portalPieces:{portal_a:2},
    materials:{ore_a:4},
    shipCargoMaterialsForced:{plate_a:6}
  }, {
    equipmentList:[
      {id:"laser_a", short:"Laser A"},
      {id:"shield_a", name:"Shield A"}
    ],
    ammoList:[{id:"ammo_a", short:"Ammo A"}],
    portalList:[{id:"portal_a", name:"Portail A"}],
    materialList:[
      {id:"ore_a", name:"Minerai A", short:"Ore A"},
      {id:"plate_a", name:"Plate A"}
    ],
    format:value=>String(value)
  });

  assert.deepEqual(labels, [
    "+1 Laser A",
    "+3 Shield A",
    "+5 Ammo A",
    "+2 piece Portail A",
    "+4 Minerai A",
    "+6 Plate A"
  ]);
});

test("the first two quest notices use the requested rewards and full material names", ()=>{
  const passQuest = questCatalog.find(quest=>quest.id === "quest_drone_cleanup");
  const rootQuest = questCatalog.find(quest=>quest.id === "quest_raider_patrol");

  assert.equal(passQuest.rewards.xp, 5000);
  assert.equal(getQuestRewardTone(passQuest), "special");
  assert.deepEqual(compactQuestRewardLabels(passQuest.rewards, {format:String}), [
    "+1 Laser III",
    "+1 L-Roquette"
  ]);
  assert.deepEqual(compactQuestRewardLabels(rootQuest.rewards, {format:String}), [
    "+1 Générateur A II",
    "+1000 Zinc",
    "+1000 Cuivre",
    "+1000 Nickel",
    "+1000 Titane",
    "+1000 Silice"
  ]);
});
