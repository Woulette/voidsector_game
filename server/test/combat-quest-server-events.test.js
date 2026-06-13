import assert from "node:assert/strict";
import test from "node:test";
import { compactQuestRewardLabels, createQuestServerEventProcessor } from "../../src/game/systems/combatQuestServerEvents.js";

function createProcessor({multiplayer, quests, state}){
  let saves = 0;
  let hudUpdates = 0;
  const toasts = [];
  const lootNotices = [];
  const processor = createQuestServerEventProcessor({
    multiplayer,
    rewards:{showLootNotice:notice=>lootNotices.push(notice)},
    showToast:message=>toasts.push(message),
    updateHud:()=>{ hudUpdates += 1; },
    getAllQuests:()=>quests,
    store:{state},
    saveState:()=>{ saves += 1; }
  });
  return {
    processor,
    toasts,
    lootNotices,
    get saves(){ return saves; },
    get hudUpdates(){ return hudUpdates; }
  };
}

test("combat quest progress events update local quest progress once", ()=>{
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

  assert.equal(state.questProgress.quest_a, 2);
  assert.equal(multiplayer.questProgressEvents.length, 0);
  assert.equal(fixture.saves, 1);
  assert.equal(fixture.hudUpdates, 1);
  assert.deepEqual(fixture.toasts, ["Objectif serveur termine : Test Quest."]);
});

test("combat quest failure events reset progress and remove failed active quest", ()=>{
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

  assert.equal(state.questProgress.quest_a, 0);
  assert.deepEqual(state.questFailProgress.quest_a, {});
  assert.deepEqual(state.activeQuestIds, ["quest_b"]);
  assert.equal(state.activeQuestId, "quest_b");
  assert.equal(multiplayer.questFailureEvents.length, 0);
  assert.equal(fixture.saves, 1);
  assert.equal(fixture.hudUpdates, 1);
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
    quests:[],
    state:{questProgress:{}, questFailProgress:{}}
  });

  fixture.processor.applyQuestClaimEvents();

  assert.equal(fixture.lootNotices.length, 1);
  assert.equal(fixture.lootNotices[0].questTitle, "Quete : Test Quest");
  assert.deepEqual(fixture.lootNotices[0].items, ["+100 M-1"]);
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
      {id:"ore_a", short:"Ore A"},
      {id:"plate_a", name:"Plate A"}
    ],
    format:value=>String(value)
  });

  assert.deepEqual(labels, [
    "+1 Laser A",
    "+3 Shield A",
    "+5 Ammo A",
    "+2 piece Portail A",
    "+4 Ore A",
    "+6 Plate A"
  ]);
});
