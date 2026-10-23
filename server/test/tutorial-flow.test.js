import test from "node:test";
import assert from "node:assert/strict";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import {
  TUTORIAL_REWARD_ITEM_ID,
  abandonTutorialAfterOutsideQuestAction,
  applyTutorialAction,
  reconcileTutorialProgress,
  resetTutorialForNewFirm
} from "../src/players/tutorialActions.js";
import {
  TUTORIAL_QUEST_IDS, TUTORIAL_VERSION, canAcceptQuestDuringTutorial,
  getTutorialExpectedQuestId, getTutorialQuestIds, hasTutorialQuestActivity, sanitizeTutorialState
} from "../../src/shared/tutorial.js";
import { FIRMS, getFirmMapId } from "../../src/data/firms.js";

function sendTutorialAction(profile, action, context){
  return applyTutorialAction(profile, {
    currentStep:profile.tutorial.step,
    revision:profile.tutorial.revision,
    ...action
  }, context);
}

function prepareTutorialPurchases(profile){
  profile.ownedShips.push("velox");
  profile.inventoryItems.push({uid:"tutorial_second_mk1",itemId:"laser_mk1"});
}

test("new profiles start the persistent tutorial while legacy profiles stay excluded", ()=>{
  assert.equal(createDefaultProfile().tutorial.status, "pending");
  assert.equal(sanitizeProfile({player:{level:12}}).tutorial.status, "abandoned");
});

test("pausing and restarting preserves the exact tutorial step", ()=>{
  const profile = createDefaultProfile();
  assert.equal(applyTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(sendTutorialAction(profile,{kind:"advance",currentStep:"launcher_orion"}).ok,true);
  assert.equal(profile.tutorial.step,"launcher_ship_gift");
  assert.equal(applyTutorialAction(profile,{kind:"pause"}).ok,true);
  assert.equal(profile.tutorial.status,"paused");
  assert.equal(applyTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(profile.tutorial.step,"launcher_ship_gift");
});

test("quest activity outside a paused tutorial preserves its resumable state", ()=>{
  const profile = createDefaultProfile();
  applyTutorialAction(profile,{kind:"start"});
  applyTutorialAction(profile,{kind:"pause"});
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[0]];
  assert.equal(abandonTutorialAfterOutsideQuestAction(profile),false);
  assert.equal(profile.tutorial.status,"paused");
  assert.equal(sendTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(profile.tutorial.step,"game_hunt_pass");
});

test("an active tutorial recovers from a quest accepted outside the expected click", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_select_pass"};
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[0]];
  assert.equal(reconcileTutorialProgress(profile),true);
  assert.equal(profile.tutorial.step,"game_hunt_pass");
  const staleAdvance = sendTutorialAction(profile,{kind:"advance",currentStep:"game_select_pass"});
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
  prepareTutorialPurchases(profile);
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

test("tutorial recovery resolves firm-specific quest ids", ()=>{
  const profile = createDefaultProfile();
  prepareTutorialPurchases(profile);
  profile.player.firmId = "cyan";
  profile.tutorial = {...profile.tutorial, status:"active", step:"launcher_launch_storage_upgrade"};
  profile.completedQuestClaims[`${TUTORIAL_QUEST_IDS[0]}_cyan`] = true;
  profile.completedQuestClaims[`${TUTORIAL_QUEST_IDS[1]}_cyan`] = true;

  assert.equal(reconcileTutorialProgress(profile), true);
  assert.equal(profile.tutorial.step, "game_open_quests_3");
});

test("active tutorial accepts the expected firm-specific quest id", ()=>{
  const profile = createDefaultProfile();
  profile.player.firmId = "cyan";
  profile.tutorial = {...profile.tutorial, status:"active", step:"game_select_storage"};
  profile.completedQuestClaims[`${TUTORIAL_QUEST_IDS[0]}_cyan`] = true;
  const profiles = new Map([["Pilot", profile]]);
  const manager = createProfileActions({
    profiles,
    persist(){ return Promise.resolve(); },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = manager.applyQuestAction({
    player:{name:"Pilot"},
    action:{kind:"accept", questId:`${TUTORIAL_QUEST_IDS[1]}_cyan`}
  });

  assert.equal(result.ok, true);
  assert.equal(profiles.get("Pilot").activeQuestIds.includes(`${TUTORIAL_QUEST_IDS[1]}_cyan`), true);
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
  assert.equal(sendTutorialAction(profile,{kind:"advance",currentStep:"game_repair_drone_intro"}).ok,true);
  assert.equal(profile.tutorial.step,"game_use_repair_drone");
  assert.equal(sendTutorialAction(profile,{kind:"advance",currentStep:"game_use_repair_drone"}, {
    player:{state:{mapId:"0",hp:100,maxHp:100}}
  }).ok,true);
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
  assert.equal(sendTutorialAction(profile,{kind:"claim-reward"}).ok,false);
  for(const id of TUTORIAL_QUEST_IDS) profile.completedQuestClaims[id] = true;
  const before = profile.inventoryItems.filter(item=>item.itemId===TUTORIAL_REWARD_ITEM_ID).length;
  const granted = sendTutorialAction(profile,{kind:"claim-reward"});
  assert.equal(granted.ok,true);
  assert.equal(profile.tutorial.status,"completed");
  assert.equal(profile.inventoryItems.filter(item=>item.itemId===TUTORIAL_REWARD_ITEM_ID).length,before+1);
  assert.equal(sendTutorialAction(profile,{kind:"claim-reward"}).ok,false);
  assert.equal(profile.inventoryItems.filter(item=>item.itemId===TUTORIAL_REWARD_ITEM_ID).length,before+1);
});

test("tutorial migration preserves progress and terminal states without reviving abandoned pilots", ()=>{
  for(const status of ["pending", "active", "paused", "abandoned", "completed"]){
    const migrated = sanitizeTutorialState({status, step:"game_hunt_raiders", rewardClaimed:status === "completed"});
    assert.equal(migrated.version, TUTORIAL_VERSION);
    assert.equal(migrated.revision, 0);
    assert.equal(migrated.status, status);
    assert.equal(migrated.step, "game_hunt_raiders");
  }
  for(const status of ["abandoned", "completed"]){
    const profile = createDefaultProfile();
    profile.tutorial = {...profile.tutorial,status,revision:9};
    resetTutorialForNewFirm(profile);
    assert.equal(profile.tutorial.status,status);
    assert.equal(profile.tutorial.revision,9);
    assert.equal(sendTutorialAction(profile,{kind:"start"}).ok,false);
    assert.equal(sendTutorialAction(profile,{kind:"advance"}).ok,false);
    assert.equal(sendTutorialAction(profile,{kind:"claim-reward"}).ok,false);
  }
});

test("advance requires an exact step and a numeric persisted revision", ()=>{
  const profile = createDefaultProfile();
  sendTutorialAction(profile,{kind:"start"});
  const before = structuredClone(profile.tutorial);
  for(const action of [
    {kind:"advance"},
    {kind:"advance",currentStep:before.step},
    {kind:"advance",revision:before.revision},
    {kind:"advance",currentStep:before.step,revision:String(before.revision)},
    {kind:"advance",currentStep:before.step,revision:-1}
  ]){
    assert.equal(applyTutorialAction(profile,action).code,"TUTORIAL_SYNC_REQUIRED");
    assert.deepEqual(profile.tutorial,before);
  }
  const request = {kind:"advance", currentStep:before.step, revision:before.revision};
  assert.equal(applyTutorialAction(profile,request).ok,true);
  const advanced = structuredClone(profile.tutorial);
  assert.equal(advanced.revision,before.revision+1);
  assert.equal(applyTutorialAction(profile,request).recovered,true);
  assert.deepEqual(profile.tutorial,advanced);
});

test("requests from before a pause cannot advance a resumed tutorial at the same step", ()=>{
  const profile = createDefaultProfile();
  sendTutorialAction(profile,{kind:"start"});
  const request = {kind:"advance",currentStep:profile.tutorial.step,revision:profile.tutorial.revision};
  sendTutorialAction(profile,{kind:"pause"});
  sendTutorialAction(profile,{kind:"start"});
  const before = structuredClone(profile.tutorial);
  assert.equal(applyTutorialAction(profile,request).recovered,true);
  assert.deepEqual(profile.tutorial,before);
});

test("gameplay steps cannot be bypassed by an otherwise valid advance request", ()=>{
  for(const step of ["launcher_depart", "game_accept_pass", "game_hunt_pass", "launcher_buy_velox", "launcher_buy_laser",
    "launcher_unequip_orion", "launcher_equip_velox", "launcher_equip_three_lasers",
    "launcher_depart_velox", "game_accept_storage", "launcher_launch_storage_upgrade",
    "game_accept_raiders", "game_hunt_raiders", "game_accept_yellow", "game_hunt_yellow",
    "game_reach_map_2", "game_return_hq_1", "game_return_hq_2", "game_use_repair_drone", "game_tutorial_complete"]){
    const profile = createDefaultProfile();
    profile.tutorial = {...profile.tutorial,status:"active",step};
    const before = structuredClone(profile.tutorial);
    const result = sendTutorialAction(profile,{kind:"advance"});
    assert.equal(result.ok,false,step);
    assert.equal(result.code,"TUTORIAL_OBJECTIVE_PENDING",step);
    assert.deepEqual(profile.tutorial,before,step);
  }
});

for(const firm of FIRMS){
  test(`${firm.label}: quest identities, paused play and final reward use the pilot's firm`, ()=>{
    const profile = createDefaultProfile();
    profile.player.firmId = firm.id;
    const ids = getTutorialQuestIds(firm.id);
    assert.equal(getTutorialExpectedQuestId("game_select_pass",firm.id),ids[0]);
    assert.equal(canAcceptQuestDuringTutorial({status:"active",step:"game_select_pass"},ids[0],firm.id),true);
    assert.equal(canAcceptQuestDuringTutorial({status:"active",step:"game_select_pass"},ids[1],firm.id),false);
    sendTutorialAction(profile,{kind:"start"});
    sendTutorialAction(profile,{kind:"pause"});
    profile.activeQuestIds = [ids[0]];
    profile.questProgress[ids[0]] = {orbes:1};
    assert.equal(hasTutorialQuestActivity(profile),true);
    assert.equal(abandonTutorialAfterOutsideQuestAction(profile),false);
    assert.equal(profile.tutorial.status,"paused");
    sendTutorialAction(profile,{kind:"start"});
    assert.equal(profile.tutorial.step,"game_hunt_pass");
    profile.tutorial.step = "game_open_gift";
    for(const id of ids) profile.completedQuestClaims[id] = true;
    const before = profile.inventoryItems.length;
    assert.equal(applyTutorialAction(profile,{kind:"claim-reward",currentStep:profile.tutorial.step}).ok,false);
    const stale = sendTutorialAction(profile,{kind:"claim-reward",revision:profile.tutorial.revision-1});
    assert.equal(stale.recovered,true);
    assert.equal(profile.inventoryItems.length,before);
    assert.equal(sendTutorialAction(profile,{kind:"claim-reward"}).ok,true);
    assert.equal(profile.inventoryItems.length,before+1);
    assert.equal(sendTutorialAction(profile,{kind:"claim-reward"}).ok,false);
    assert.equal(profile.inventoryItems.length,before+1);
  });

  test(`${firm.label}: travel and HQ steps validate the server's position on the correct maps`, ()=>{
    const profile = createDefaultProfile();
    profile.player.firmId = firm.id;
    const player = {connected:true,state:{mapId:String(getFirmMapId(firm.id,1)),x:firm.spawn.x,y:firm.spawn.y,hp:100,maxHp:100}};
    profile.tutorial = {...profile.tutorial,status:"active",step:"game_reach_map_2"};
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
    player.state.mapId = String(getFirmMapId(firm.id,2));
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,true);
    profile.tutorial.step = "game_return_hq_1";
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
    player.state.mapId = String(getFirmMapId(firm.id,1));
    player.state.x = 0;
    player.state.y = 0;
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
    player.state.x = firm.spawn.x;
    player.state.y = firm.spawn.y;
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,true);
  });
}

test("full HP repair steps require a real equipped repair drone and a live server player", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_use_repair_drone"};
  const player = {state:{mapId:"0",hp:50,maxHp:100,repairBotActive:false}};
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
  player.state.repairBotActive = true;
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,true);
  profile.tutorial.step = "game_use_repair_drone";
  player.state.repairBotActive = false;
  player.state.hp = player.state.maxHp;
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,true);
  profile.tutorial.step = "game_use_repair_drone";
  profile.shipLoadouts.orion.extras = [];
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
});

test("equipping three lasers checks owned distinct items, a repair drone and a rocket launcher", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"launcher_equip_three_lasers"};
  profile.ownedShips.push("velox");
  profile.activeShip = "velox";
  profile.inventoryItems.push({uid:"laser2",itemId:"laser_mk1"},{uid:"laser3",itemId:"laser_mk3"},
    {uid:"rocket",itemId:"launcher_rocket_mk1"});
  profile.shipLoadouts.velox = {lasers:["inv_laser_mk1_1","inv_laser_mk1_1","laser3"],extras:["inv_repair_starter_2"],rocketLauncher:"rocket"};
  assert.equal(sendTutorialAction(profile,{kind:"advance"}).ok,false);
  profile.shipLoadouts.velox.lasers[1] = "laser2";
  assert.equal(sendTutorialAction(profile,{kind:"advance"}).ok,true);
});

for(const firm of FIRMS){
  test(`${firm.label}: the first departure requires the equipped starter kit and a live arrival on the firm's first map`, ()=>{
    const profile = createDefaultProfile();
    profile.player.firmId = firm.id;
    profile.tutorial = {...profile.tutorial,status:"active",step:"launcher_depart"};
    const player = {state:{mapId:String(getFirmMapId(firm.id,1)),hp:100,maxHp:100}};
    const extras = profile.shipLoadouts.orion.extras;
    profile.shipLoadouts.orion.extras = [];
    assert.match(sendTutorialAction(profile,{kind:"advance"},{player}).reason,/drone de reparation/);
    profile.shipLoadouts.orion.extras = extras;
    const lasers = profile.shipLoadouts.orion.lasers;
    profile.shipLoadouts.orion.lasers = [];
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
    profile.shipLoadouts.orion.lasers = lasers;
    assert.equal(sendTutorialAction(profile,{kind:"advance"}).ok,false);
    player.state.mapId = String(getFirmMapId(firm.id,2));
    assert.match(sendTutorialAction(profile,{kind:"advance"},{player}).reason,/carte 1/);
    player.state.mapId = String(getFirmMapId(firm.id,1));
    player.state.hp = 0;
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
    player.state.hp = 100;
    assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,true);
    assert.equal(profile.tutorial.step,"game_base_intro");
  });
}

test("the Velox departure does not complete until the real game player is alive on the first firm map", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"active",step:"launcher_depart_velox"};
  profile.ownedShips.push("velox");
  profile.activeShip = "velox";
  profile.inventoryItems.push({uid:"laser2",itemId:"laser_mk1"},{uid:"laser3",itemId:"laser_mk3"},
    {uid:"rocket",itemId:"launcher_rocket_mk1"});
  profile.shipLoadouts.velox = {lasers:["inv_laser_mk1_1","laser2","laser3"],extras:["inv_repair_starter_2"],rocketLauncher:"rocket"};
  assert.equal(sendTutorialAction(profile,{kind:"advance"}).ok,false);
  const player = {state:{mapId:"20",hp:100,maxHp:100}};
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
  player.state.mapId = "0";
  player.state.shipId = "orion";
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,false);
  player.state.shipId = "velox";
  assert.equal(sendTutorialAction(profile,{kind:"advance"},{player}).ok,true);
});

test("legacy review survives sanitization and preserves early chapters until explicitly reviewed", ()=>{
  const profile = createDefaultProfile();
  profile.tutorial = {status:"active",step:"launcher_inventory",rewardClaimed:false};
  profile.tutorial = sanitizeTutorialState(profile.tutorial);
  assert.equal(profile.tutorial.needsReview,true);
  profile.tutorial = sanitizeTutorialState(profile.tutorial);
  assert.equal(profile.tutorial.needsReview,true);
  assert.equal(sendTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(profile.tutorial.step,"launcher_inventory");
  assert.equal(profile.tutorial.needsReview,false);
  assert.equal(profile.tutorial.revision,1);
});

for(const firm of FIRMS){
  test(`${firm.label}: a legacy gift reached by skipped steps returns to the first missing quest without a reward`, ()=>{
    const profile = createDefaultProfile();
    profile.player.firmId = firm.id;
    profile.tutorial = {status:"active",step:"game_open_gift",rewardClaimed:false};
    const before = structuredClone(profile.inventoryItems);
    const result = applyTutorialAction(profile,{kind:"claim-reward"});
    assert.equal(result.recovered,true);
    assert.equal(profile.tutorial.step,"game_open_quests_1");
    assert.equal(profile.tutorial.needsReview,false);
    assert.equal(profile.tutorial.rewardClaimed,false);
    assert.deepEqual(profile.inventoryItems,before);
    assert.equal(sendTutorialAction(profile,{kind:"claim-reward"}).ok,false);
  });
}

test("legacy recovery cannot skip missing purchases again or reset completed quest claims", ()=>{
  const profile = createDefaultProfile();
  profile.completedQuestClaims[TUTORIAL_QUEST_IDS[0]] = true;
  profile.activeQuestIds = [TUTORIAL_QUEST_IDS[1]];
  profile.tutorial = {status:"paused",step:"game_open_gift",rewardClaimed:false};
  const claims = structuredClone(profile.completedQuestClaims);
  assert.equal(sendTutorialAction(profile,{kind:"start"}).ok,true);
  assert.equal(profile.tutorial.step,"launcher_open_shop");
  assert.equal(reconcileTutorialProgress(profile),false);
  assert.equal(profile.tutorial.step,"launcher_open_shop");
  profile.ownedShips.push("velox");
  assert.equal(reconcileTutorialProgress(profile),true);
  assert.equal(profile.tutorial.step,"launcher_open_weapons");
  assert.equal(reconcileTutorialProgress(profile),false);
  profile.inventoryItems.push({uid:"second_mk1",itemId:"laser_mk1"});
  assert.equal(reconcileTutorialProgress(profile),true);
  assert.equal(profile.tutorial.step,"launcher_open_refinery");
  assert.deepEqual(profile.completedQuestClaims,claims);
  profile.inventoryItems.pop();
  assert.equal(reconcileTutorialProgress(profile),false);
  assert.equal(profile.tutorial.step,"launcher_open_refinery");
});
