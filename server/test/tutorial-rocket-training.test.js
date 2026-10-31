import assert from "node:assert/strict";
import test from "node:test";
import { FIRMS, getFirmMapId, getFirmMapName } from "../../src/data/firms.js";
import { getTutorialQuestIds, sanitizeTutorialState, TUTORIAL_VERSION } from "../../src/shared/tutorial.js";
import { getAmmoPurchase, getItemPurchase } from "../src/economy/shop.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createProfileManager } from "../src/players/profiles.js";
import { applyTutorialAction, reconcileTutorialProgress } from "../src/players/tutorialActions.js";
import { getTutorialReserves } from "../src/players/tutorialEconomyPolicy.js";
import { recordTutorialRocketPurchase } from "../src/players/tutorialRocketTraining.js";
import { validateTutorialStep } from "../src/players/tutorialValidation.js";
import { getQuest, getQuestObjectives, getQuestObjectiveKey } from "../src/quests/questState.js";

function readyProfile(firmId = "astra"){
  const profile = createDefaultProfile();
  profile.player = {...profile.player,firmId,firmSelected:true,credits:100_000};
  profile.ownedShips.push("velox");
  profile.activeShip = "velox";
  profile.inventoryItems.push({uid:"second_mk1",itemId:"laser_mk1"},{uid:"pass_mk3",itemId:"laser_mk3"},
    {uid:"pass_rocket",itemId:"launcher_rocket_mk1"});
  const [pass,storage,raider] = getTutorialQuestIds(firmId);
  profile.completedQuestClaims = {[pass]:true,[storage]:true};
  profile.activeQuestIds = [raider];
  profile.tutorial = {...profile.tutorial,status:"active",step:"game_accept_raiders"};
  profile.actionSlotsByShip.velox = Array(9).fill(null);
  return profile;
}

function managerFor(profile,{persist = ()=>Promise.resolve()} = {}){
  const profiles = new Map([["pilot",profile]]);
  const manager = createProfileActions({profiles,persist,getExistingProfile:()=>({key:"pilot",profile:profiles.get("pilot")})});
  return {manager,player:{name:"pilot",accountId:"isolated-fixture"},get profile(){ return profiles.get("pilot"); }};
}

function advance(profile){
  return applyTutorialAction(profile,{kind:"advance",currentStep:profile.tutorial.step,revision:profile.tutorial.revision});
}

for(const firm of FIRMS){
  test(`${firm.label}: pausing before accepting and completing the Voraks cannot bypass the rocket lesson on resume`, async ()=>{
    const profile = readyProfile(firm.id);
    const raider = getTutorialQuestIds(firm.id)[2];
    profile.activeQuestIds = [];
    const current = managerFor(profile);
    assert.equal(applyTutorialAction(current.profile,{kind:"pause"}).ok,true);
    const accepted = current.manager.applyQuestAction({player:current.player,action:{kind:"accept",questId:raider}});
    assert.equal(accepted.ok,true);
    await accepted.save;
    for(let index=0;index<3;index++){
      const killed = current.manager.applyQuestAction({player:current.player,
        action:{kind:"kill",enemyKind:"raider_astral",zoneName:getFirmMapName(firm.id,1)}});
      assert.equal(killed.ok,true);
      await killed.save;
    }
    assert.equal(current.profile.tutorial.status,"paused");
    assert.equal(current.profile.completedQuestClaims[raider],true);
    assert.equal(current.profile.tutorial.rocketTrainingPurchased,0);
    const beforeResume = structuredClone({claims:current.profile.completedQuestClaims,inventory:current.profile.inventoryItems});
    assert.equal(applyTutorialAction(current.profile,{kind:"start"}).ok,true);
    assert.equal(current.profile.tutorial.step,"game_open_quick_shop");
    assert.equal(current.profile.tutorial.rocketTrainingPurchased,0);
    assert.deepEqual({claims:current.profile.completedQuestClaims,inventory:current.profile.inventoryItems},beforeResume);
    assert.equal(advance(current.profile).ok,true);
    assert.equal(current.profile.tutorial.step,"game_buy_rockets");
    assert.equal(advance(current.profile).code,"TUTORIAL_OBJECTIVE_PENDING");
    const laterV2 = readyProfile(firm.id);
    laterV2.completedQuestClaims[raider] = true;
    laterV2.tutorial = sanitizeTutorialState({...laterV2.tutorial,version:2,step:"game_return_hq_2"});
    assert.equal(applyTutorialAction(laterV2,{kind:"start"}).ok,true);
    assert.equal(laterV2.tutorial.step,"game_return_hq_2");
    assert.equal(laterV2.tutorial.rocketTrainingPurchased,0);
  });

  test(`${firm.label}: Vorak training requires the real 100-R1 purchase and the Velox's canonical slots`, ()=>{
    const current = managerFor(readyProfile(firm.id));
    assert.equal(advance(current.profile).ok,true);
    assert.equal(current.profile.tutorial.step,"game_open_quick_shop");
    assert.equal(advance(current.profile).ok,true);
    assert.equal(current.profile.tutorial.step,"game_buy_rockets");
    current.profile.ammoInventory.rocket_r1 = 5000;
    assert.equal(advance(current.profile).code,"TUTORIAL_OBJECTIVE_PENDING");
    const beforeRevision = current.profile.tutorial.revision;
    const beforeCredits = current.profile.player.credits;
    const bought = current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("rocket_r1",100)});
    assert.equal(bought.ok,true);
    assert.equal(current.profile.tutorial.rocketTrainingPurchased,100);
    assert.equal(current.profile.tutorial.revision,beforeRevision+1);
    assert.equal(current.profile.ammoInventory.rocket_r1,5100);
    assert.equal(current.profile.player.credits,beforeCredits-10_000);
    const replay = current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("rocket_r1",100)});
    assert.equal(replay.code,"TUTORIAL_PURCHASE_ALREADY_READY");
    assert.equal(current.profile.ammoInventory.rocket_r1,5100);
    assert.equal(advance(current.profile).ok,true);
    assert.equal(current.profile.tutorial.step,"game_bind_laser");
    current.profile.actionSlots[0] = "ammo_x1";
    current.profile.actionSlots[1] = "rocket_r1";
    assert.equal(advance(current.profile).code,"TUTORIAL_OBJECTIVE_PENDING");
    current.profile.actionSlotsByShip.velox[0] = "ammo_x1";
    assert.equal(advance(current.profile).ok,true);
    assert.equal(current.profile.tutorial.step,"game_bind_rockets");
    assert.equal(advance(current.profile).code,"TUTORIAL_OBJECTIVE_PENDING");
    current.profile.actionSlotsByShip.velox[1] = "rocket_r1";
    assert.equal(advance(current.profile).ok,true);
    assert.equal(current.profile.tutorial.step,"game_hunt_raiders");
    assert.equal(current.profile.tutorial.rewardClaimed,false);
  });

  test(`${firm.label}: a version-2 unfinished Vorak hunt is reviewed without resetting the quest or rewards`, ()=>{
    const profile = readyProfile(firm.id);
    profile.tutorial = sanitizeTutorialState({...profile.tutorial,version:2,step:"game_hunt_raiders"});
    assert.equal(profile.tutorial.needsReview,true);
    const before = structuredClone({inventory:profile.inventoryItems,claims:profile.completedQuestClaims,quests:profile.activeQuestIds});
    applyTutorialAction(profile,{kind:"start"});
    assert.equal(profile.tutorial.version,TUTORIAL_VERSION);
    assert.equal(profile.tutorial.step,"game_open_quick_shop");
    assert.equal(profile.tutorial.needsReview,false);
    assert.deepEqual({inventory:profile.inventoryItems,claims:profile.completedQuestClaims,quests:profile.activeQuestIds},before);
  });

  test(`${firm.label}: visiting map 2 remains valid after returning to map 1 before the tutorial acknowledgement`, ()=>{
    const profile = readyProfile(firm.id);
    const yellow = getTutorialQuestIds(firm.id)[3];
    profile.activeQuestIds = [yellow];
    profile.tutorial.step = "game_reach_map_2";
    const objectives = getQuestObjectives(getQuest(yellow));
    const visitIndex = objectives.findIndex(objective=>objective.type === "visit_map" && objective.map === getFirmMapName(firm.id,2));
    const visitKey = getQuestObjectiveKey(objectives[visitIndex],visitIndex);
    const player = {state:{mapId:String(getFirmMapId(firm.id,1)),hp:100}};
    assert.equal(validateTutorialStep(profile,"game_reach_map_2",{player}).ok,false);
    const otherFirm = FIRMS.find(candidate=>candidate.id !== firm.id);
    profile.questProgress[getTutorialQuestIds(otherFirm.id)[3]] = {[visitKey]:1};
    assert.equal(validateTutorialStep(profile,"game_reach_map_2",{player}).ok,false);
    profile.questProgress[yellow] = {[visitKey]:1};
    assert.equal(validateTutorialStep(profile,"game_reach_map_2",{player}).ok,true);
    profile.questProgress[yellow] = {orbes:5,vorak:5};
    assert.equal(validateTutorialStep(profile,"game_reach_map_2",{player}).ok,false);
  });
}

test("training purchase evidence is bounded and rejects fake prices, partial quantities, other ammo and purchases made before the lesson", ()=>{
  const canonical = getAmmoPurchase("rocket_r1",100);
  for(const purchase of [{...canonical,totalPrice:0},getAmmoPurchase("rocket_r1",10),getAmmoPurchase("rocket_r1",10,10),getAmmoPurchase("rocket_r1",1000),getAmmoPurchase("ammo_x1",100)]){
    const profile = readyProfile();
    profile.tutorial.step = "game_buy_rockets";
    assert.equal(recordTutorialRocketPurchase(profile,purchase),false);
    assert.equal(profile.tutorial.rocketTrainingPurchased,0);
  }
  const profile = readyProfile();
  assert.equal(recordTutorialRocketPurchase(profile,canonical),false);
  assert.equal(sanitizeTutorialState({...profile.tutorial,rocketTrainingPurchased:999}).rocketTrainingPurchased,0);
});

test("an unsuccessful purchase cannot create evidence and persistence failure restores the paid purchase and tutorial evidence together", async ()=>{
  const profile = readyProfile();
  profile.tutorial.step = "game_buy_rockets";
  const current = managerFor(profile,{persist:()=>Promise.reject(new Error("isolated persistence failure"))});
  current.profile.player.credits = 0;
  assert.equal(current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("rocket_r1",100)}).ok,false);
  assert.equal(current.profile.tutorial.rocketTrainingPurchased,0);
  current.profile.player.credits = 10_000;
  const before = structuredClone(current.profile);
  const result = current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("rocket_r1",100)});
  await assert.rejects(result.save,/isolated persistence failure/);
  assert.deepEqual(current.profile,before);
});

test("the remaining 100-R1 cost is reserved dynamically, allowing an affordable mandatory purchase even with no spare credits", ()=>{
  const profile = readyProfile();
  profile.tutorial.step = "game_buy_rockets";
  profile.player.credits = 10_000;
  const current = managerFor(profile);
  assert.equal(getTutorialReserves(current.profile).credits,10_000);
  assert.equal(current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("ammo_x1")}).code,"TUTORIAL_BUDGET_RESERVED");
  assert.equal(current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("rocket_r1",100)}).ok,true);
  assert.equal(current.profile.player.credits,0);
  assert.equal(getTutorialReserves(current.profile).credits,0);
});

test("old terminal states and completed Vorak quests are preserved, while completing Voraks during the new lesson cannot skip its purchase", ()=>{
  for(const status of ["completed","abandoned"]){
    const profile = readyProfile();
    profile.tutorial = sanitizeTutorialState({...profile.tutorial,version:2,status,step:"game_hunt_raiders"});
    assert.equal(profile.tutorial.needsReview,false);
    assert.equal(applyTutorialAction(profile,{kind:"start"}).ok,false);
    assert.equal(profile.tutorial.status,status);
  }
  const completed = readyProfile();
  completed.tutorial = sanitizeTutorialState({...completed.tutorial,version:2,step:"game_return_hq_2"});
  completed.completedQuestClaims[getTutorialQuestIds("astra")[2]] = true;
  assert.equal(completed.tutorial.needsReview,false);
  reconcileTutorialProgress(completed);
  assert.equal(completed.tutorial.step,"game_return_hq_2");
  const ongoing = readyProfile();
  ongoing.tutorial.step = "game_buy_rockets";
  ongoing.completedQuestClaims[getTutorialQuestIds("astra")[2]] = true;
  reconcileTutorialProgress(ongoing);
  assert.equal(ongoing.tutorial.step,"game_buy_rockets");
  assert.equal(advance(ongoing).code,"TUTORIAL_OBJECTIVE_PENDING");
});

test("only canonical saved Velox preferences validate bindings; stale saves cannot forge a purchase or override an accepted assignment", async ()=>{
  const initial = readyProfile();
  initial.tutorial = {...initial.tutorial,step:"game_bind_laser",rocketTrainingPurchased:100};
  initial.ammoInventory.rocket_r1 = 99;
  const originalSlotsAt = initial.actionSlotsUpdatedAt;
  const player = {id:"fixture",accountId:"training",name:"pilot"};
  const manager = createProfileManager({cleanName:value=>String(value || "pilot"),
    loadProfileEntries:async()=>[["account:training",initial]],persistProfileEntries:async()=>{}});
  await manager.load();
  const slots = ["ammo_x1","rocket_r1",...Array(7).fill(null)];
  const saved = manager.saveFromPayload({player,payload:{profile:{actionSlots:slots,actionSlotsByShip:{velox:slots},
    actionSlotsUpdatedAt:originalSlotsAt+1,lastLaserAmmoId:"ammo_x1",tutorial:{rocketTrainingPurchased:0}}}});
  await saved.persistence;
  const canonical = manager.getProfileSnapshotForPlayer(player);
  assert.equal(validateTutorialStep(canonical,"game_bind_laser").ok,true);
  assert.equal(validateTutorialStep(canonical,"game_bind_rockets").ok,true);
  assert.equal(canonical.tutorial.rocketTrainingPurchased,100);
  const stale = manager.saveFromPayload({player,payload:{profile:{actionSlots:Array(9).fill(null),
    actionSlotsByShip:{velox:Array(9).fill(null)},actionSlotsUpdatedAt:originalSlotsAt}}});
  assert.equal(stale.conflict,true);
  assert.equal(validateTutorialStep(manager.getProfileSnapshotForPlayer(player),"game_bind_rockets").ok,true);
  manager.updateProfileForPlayer({player,update:profile=>{ profile.tutorial.rocketTrainingPurchased = 0; return {ok:true}; }});
  const forged = manager.saveFromPayload({player,payload:{profile:{actionSlots:slots,actionSlotsByShip:{velox:slots},
    actionSlotsUpdatedAt:originalSlotsAt+2,lastLaserAmmoId:"ammo_x1",tutorial:{rocketTrainingPurchased:100}}}});
  await forged.persistence;
  assert.equal(manager.getProfileSnapshotForPlayer(player).tutorial.rocketTrainingPurchased,0);
});

test("zero M-1 is reported and may be refilled without free ammo; a previously bought 100-R1 pack remains valid at stock 99", ()=>{
  const profile = readyProfile();
  profile.tutorial = {...profile.tutorial,step:"game_bind_laser",rocketTrainingPurchased:100};
  profile.actionSlotsByShip.velox = ["ammo_x1","rocket_r1",...Array(7).fill(null)];
  profile.ammoInventory.ammo_x1 = 0;
  profile.ammoInventory.rocket_r1 = 99;
  profile.player.credits = getAmmoPurchase("ammo_x1").totalPrice;
  const current = managerFor(profile);
  assert.match(validateTutorialStep(current.profile,"game_bind_laser").reason,/stock M-1 est vide/);
  assert.equal(validateTutorialStep(current.profile,"game_bind_rockets").ok,false);
  assert.equal(current.manager.addAmmoPurchase({player:current.player,purchase:getAmmoPurchase("ammo_x1")}).ok,true);
  assert.equal(current.profile.player.credits,0);
  assert.equal(validateTutorialStep(current.profile,"game_bind_rockets").ok,true);
  assert.equal(current.profile.ammoInventory.rocket_r1,99);
});

test("necessary kit replacements during rocket training remain affordable despite the future ammo reserve", ()=>{
  for(const itemId of ["laser_mk1","extra_repair_starter","launcher_rocket_mk1"]){
    const profile = readyProfile();
    profile.tutorial.step = "game_buy_rockets";
    profile.inventoryItems = profile.inventoryItems.filter(item=>itemId === "laser_mk1"
      ? !["laser_mk1","laser_mk3"].includes(item.itemId) : item.itemId !== itemId);
    const purchase = getItemPurchase(itemId);
    profile.player.credits = purchase.totalPrice;
    const current = managerFor(profile);
    assert.equal(current.manager.addItemPurchase({player:current.player,purchase}).ok,true,itemId);
    assert.equal(current.profile.player.credits,0,itemId);
    assert.equal(current.profile.tutorial.rocketTrainingPurchased,0,itemId);
  }
});
