import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFirmRewardNotificationCount,
  getFirmRewardNotificationCounts,
  getFirstFirmRewardDestination
} from "../../src/ui/firmRewardNotifications.js";

test("firm reward notifications count each claim location without counting finished rewards", ()=>{
  const snapshot = {
    dailyQuests:[
      {id:"daily-1", claimable:true},
      {id:"daily-2", claimable:false},
      {id:"daily-3", claimable:true}
    ],
    seasonalQuests:[{id:"weekly-1", claimable:true}],
    seasonObjectives:[
      {id:"season-1", claimable:true},
      {id:"season-2", claimed:true}
    ],
    personal:{
      pendingRewards:[
        {id:"individual", source:"season-individual"},
        {id:"collective", source:"season-collective"},
        {id:"legacy", source:"firm-quest"}
      ]
    }
  };

  assert.deepEqual(getFirmRewardNotificationCounts(snapshot), {
    daily:2,
    weekly:1,
    seasonal:1,
    rewards:2,
    quests:4,
    total:6
  });
  assert.deepEqual(getFirstFirmRewardDestination(snapshot), {firmTab:"quests", questTab:"daily"});
});

test("firm reward navigation selects weekly, seasonal then end-of-season rewards", ()=>{
  assert.deepEqual(getFirstFirmRewardDestination({
    seasonalQuests:[{claimable:true}]
  }), {firmTab:"quests", questTab:"weekly"});
  assert.deepEqual(getFirstFirmRewardDestination({
    seasonObjectives:[{claimable:true}]
  }), {firmTab:"quests", questTab:"seasonal"});
  assert.deepEqual(getFirstFirmRewardDestination({
    personal:{pendingRewards:[{source:"season-individual"}]}
  }), {firmTab:"rewards", questTab:null});
  assert.equal(getFirstFirmRewardDestination({}), null);
  assert.equal(formatFirmRewardNotificationCount(104), "99+");
});
