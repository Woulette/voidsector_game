import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import {
  TUTORIAL_REWARD_ITEM_ID,
  abandonTutorialAfterOutsideQuestAction,
  applyTutorialAction,
  reconcileTutorialProgress
} from "../src/players/tutorialActions.js";
import { TUTORIAL_QUEST_IDS } from "../../src/shared/tutorial.js";

test("new profiles start the persistent tutorial while legacy profiles stay excluded", ()=>{
  assert.equal(createDefaultProfile().tutorial.status, "pending");
  assert.equal(sanitizeProfile({player:{level:12}}).tutorial.status, "abandoned");
});

test("pausing and restarting preserves the exact tutorial step", ()=>{
  const profile = createDefaultProfile();
  assert.equal(applyTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(applyTutorialAction(profile,{kind:"advance",currentStep:"launcher_orion"}).ok,true);
  assert.equal(profile.tutorial.step,"launcher_ship_gift");
  assert.equal(applyTutorialAction(profile,{kind:"pause"}).ok,true);
  assert.equal(profile.tutorial.status,"paused");
  assert.equal(applyTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(profile.tutorial.step,"launcher_ship_gift");
});

test("quest activity outside a paused tutorial removes the tutorial", ()=>{
  const profile = createDefaultProfile();
  applyTutorialAction(profile,{kind:"start"});
  applyTutorialAction(profile,{kind:"pause"});
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[0]];
  assert.equal(abandonTutorialAfterOutsideQuestAction(profile),true);
  assert.equal(profile.tutorial.status,"abandoned");
});

test("an active tutorial recovers from a quest accepted outside the expected click", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_select_pass"};
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[0]];
  assert.equal(reconcileTutorialProgress(profile),true);
  assert.equal(profile.tutorial.step,"game_hunt_pass");
  const staleAdvance = applyTutorialAction(profile,{kind:"advance",currentStep:"game_select_pass"});
  assert.equal(staleAdvance.ok,true);
  assert.equal(profile.tutorial.step,"game_hunt_pass");
});

test("quest completion recovery always keeps the furthest valid tutorial step", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_select_pass"};
  profile.completedQuestClaims[TUTORIAL_QUEST_IDS[0]] = true;
  assert.equal(reconcileTutorialProgress(profile),true);
  assert.equal(profile.tutorial.step,"game_return_hq_1");
  profile.tutorial.step = "launcher_buy_velox";
  assert.equal(reconcileTutorialProgress(profile),false);
  assert.equal(profile.tutorial.step,"launcher_buy_velox");
});

test("abandon is definitive and start cannot reactivate the tutorial", ()=>{
  const profile = createDefaultProfile();
  applyTutorialAction(profile,{kind:"start"});
  assert.equal(applyTutorialAction(profile,{kind:"abandon"}).ok,true);
  assert.equal(profile.tutorial.status,"abandoned");
  assert.equal(applyTutorialAction(profile,{kind:"start"}).ok,false);
  assert.equal(profile.tutorial.status,"abandoned");
});

test("the final MK-III gift is server gated and can only be granted once", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_open_gift"};
  assert.equal(applyTutorialAction(profile,{kind:"claim-reward"}).ok,false);
  for(const id of TUTORIAL_QUEST_IDS) profile.completedQuestClaims[id] = true;
  const before = profile.inventoryItems.filter(item=>item.itemId===TUTORIAL_REWARD_ITEM_ID).length;
  const granted = applyTutorialAction(profile,{kind:"claim-reward"});
  assert.equal(granted.ok,true);
  assert.equal(profile.tutorial.status,"completed");
  assert.equal(profile.inventoryItems.filter(item=>item.itemId===TUTORIAL_REWARD_ITEM_ID).length,before+1);
  assert.equal(applyTutorialAction(profile,{kind:"claim-reward"}).ok,false);
  assert.equal(profile.inventoryItems.filter(item=>item.itemId===TUTORIAL_REWARD_ITEM_ID).length,before+1);
});
