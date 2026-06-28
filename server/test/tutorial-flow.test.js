import test from "node:test";
import assert from "node:assert/strict";
import { createProfileActions } from "../src/players/profileActions.js";
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

test("accepting a tutorial quest marks the tutorial update for the client", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial, status:"active", step:"game_select_pass"};
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){ return Promise.resolve(); },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = manager.applyQuestAction({
    player:{name:"Pilot"},
    action:{kind:"accept", questId:TUTORIAL_QUEST_IDS[0]}
  });

  assert.equal(result.ok, true);
  assert.equal(result.tutorialChanged, true);
  assert.equal(result.tutorial.step, "game_hunt_pass");
  assert.equal(profiles.get("Pilot").tutorial.step, "game_hunt_pass");
});

test("active tutorial blocks accepting quests outside the current instruction", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial, status:"active", step:"game_select_storage"};
  profile.completedQuestClaims[TUTORIAL_QUEST_IDS[0]] = true;
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){ return Promise.resolve(); },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = manager.applyQuestAction({
    player:{name:"Pilot"},
    action:{kind:"accept", questId:TUTORIAL_QUEST_IDS[2]}
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /Tutoriel actif/);
  assert.equal(profile.activeQuestIds.includes(TUTORIAL_QUEST_IDS[2]), false);
  assert.equal(profile.tutorial.step, "game_select_storage");
});

test("active tutorial gates the refinery storage upgrade sequence", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial, status:"active", step:"launcher_upgrade_storage"};
  profile.completedQuestClaims[TUTORIAL_QUEST_IDS[0]] = true;
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[1]];
  profile.player.credits = 100_000;
  profile.cargoHold = {
    cuivre_orbital:125,
    zinc_spatial:125,
    nickel_brut:125,
    titane_fissure:125,
    silice_conductrice:125
  };
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){ return Promise.resolve(); },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const tooEarly = manager.applyEconomyAction({
    player:{name:"Pilot"},
    action:{kind:"refinery-upgrade-start", type:"module", id:"storage"}
  });
  assert.equal(tooEarly.ok, false);
  assert.match(tooEarly.reason, /AMELIORER/);
  assert.equal(Boolean(profile.refineryUpgradeJobs?.["module:storage"]), false);

  profile.tutorial.step = "launcher_launch_storage_upgrade";
  const wrongUpgrade = manager.applyEconomyAction({
    player:{name:"Pilot"},
    action:{kind:"refinery-upgrade-start", type:"material", id:"cuivre_orbital"}
  });
  assert.equal(wrongUpgrade.ok, false);
  assert.match(wrongUpgrade.reason, /stockage/);

  const allowed = manager.applyEconomyAction({
    player:{name:"Pilot"},
    action:{kind:"refinery-upgrade-start", type:"module", id:"storage"}
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.tutorialChanged, true);
  assert.equal(allowed.profile.tutorial.step, "game_open_quests_3");
  assert.equal(Boolean(allowed.profile.refineryUpgradeJobs?.["module:storage"]), true);
  assert.equal(Boolean(allowed.profile.completedQuestClaims?.[TUTORIAL_QUEST_IDS[1]]), true);
});

test("tutorial recovery ignores future quests until previous tutorial quests are complete", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial, status:"active", step:"game_open_quests_2"};
  profile.completedQuestClaims[TUTORIAL_QUEST_IDS[0]] = true;
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[2]];

  assert.equal(reconcileTutorialProgress(profile), false);
  assert.equal(profile.tutorial.step, "game_open_quests_2");
});

test("quest completion recovery always keeps the furthest valid tutorial step", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_select_pass"};
  profile.completedQuestClaims[TUTORIAL_QUEST_IDS[0]] = true;
  assert.equal(reconcileTutorialProgress(profile),true);
  assert.equal(profile.tutorial.step,"game_repair_drone_intro");
  assert.equal(applyTutorialAction(profile,{kind:"advance",currentStep:"game_repair_drone_intro"}).ok,true);
  assert.equal(profile.tutorial.step,"game_use_repair_drone");
  assert.equal(applyTutorialAction(profile,{kind:"advance",currentStep:"game_use_repair_drone"}).ok,true);
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
