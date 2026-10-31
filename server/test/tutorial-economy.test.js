import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { getTutorialReserves, validateTutorialEconomyChange } from "../src/players/tutorialEconomyPolicy.js";
import { getServerRefineryModuleUpgradeData } from "../src/economy/refineryUpgrades.js";
import { SERVER_ITEM_SHOP, SERVER_SHIP_SHOP, getAmmoPurchase } from "../src/economy/shop.js";
import { getTutorialQuestIds } from "../../src/shared/tutorial.js";
import { FIRMS } from "../../src/data/firms.js";

function fixture({step = "launcher_buy_velox",credits = 200_000} = {}){
  const profile = createDefaultProfile();
  profile.player.credits = credits;
  profile.tutorial = {...profile.tutorial,status:"active",step};
  const profiles = new Map([["Pilot",profile]]);
  let saved = 0;
  const manager = createProfileActions({
    profiles,persist(){ saved++; return Promise.resolve(); },
    getExistingProfile(){ return {key:"Pilot",profile:profiles.get("Pilot")}; }
  });
  return {player:{name:"Pilot"},manager,get profile(){ return profiles.get("Pilot"); },get saved(){ return saved; }};
}

function purchase(entry,quantity = 1){ return {...entry,quantity,totalPrice:entry.price * quantity}; }

for(const firm of FIRMS){
  test(`${firm.label}: the reserved budget comes from server prices and releases after each real purchase`, ()=>{
    const current = fixture();
    current.profile.player.firmId = firm.id;
    current.profile.completedQuestClaims[getTutorialQuestIds(firm.id)[0]] = true;
    current.profile.inventoryItems.push({uid:"pass_laser",itemId:"laser_mk3"},{uid:"pass_rocket",itemId:"launcher_rocket_mk1"});
    const storage = getServerRefineryModuleUpgradeData(current.profile,"storage");
    const rocketTraining = getAmmoPurchase("rocket_r1",100).totalPrice;
    const ship = SERVER_SHIP_SHOP.velox;
    const laser = SERVER_ITEM_SHOP.laser_mk1;
    assert.deepEqual(getTutorialReserves(current.profile),{
      credits:ship.price+laser.price+storage.credits+rocketTraining,materials:storage.materials
    });
    assert.equal(current.manager.addShipPurchase({player:current.player,purchase:purchase(ship)}).ok,true);
    assert.equal(getTutorialReserves(current.profile).credits,laser.price+storage.credits+rocketTraining);
    current.profile.tutorial.step = "launcher_buy_laser";
    assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(laser)}).ok,true);
    assert.equal(getTutorialReserves(current.profile).credits,storage.credits+rocketTraining);
    const before = current.profile.player.credits;
    const saved = current.saved;
    assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(laser)}).code,"TUTORIAL_PURCHASE_ALREADY_READY");
    assert.equal(current.profile.player.credits,before);
    assert.equal(current.saved,saved);
    current.profile.completedQuestClaims[getTutorialQuestIds(firm.id)[1]] = true;
    assert.deepEqual(getTutorialReserves(current.profile),{credits:rocketTraining,materials:{}});
  });
}

test("a blocked unrelated purchase neither spends money, grants inventory nor persists a partial change", ()=>{
  const current = fixture();
  current.profile.player.credits = getTutorialReserves(current.profile).credits;
  const before = structuredClone(current.profile);
  const optional = current.manager.addAmmoPurchase({player:current.player,purchase:{id:"ammo_x1",priceType:"credits",totalPrice:10_000,totalAmount:1000}});
  assert.equal(optional.code,"TUTORIAL_BUDGET_RESERVED");
  assert.deepEqual(current.profile,before);
  assert.equal(current.saved,0);
});

test("a legacy pilot below the total reserve can still buy an affordable required ship or laser", ()=>{
  const current = fixture({credits:SERVER_SHIP_SHOP.velox.price});
  assert.equal(current.manager.addShipPurchase({player:current.player,purchase:purchase(SERVER_SHIP_SHOP.velox)}).ok,true);
  assert.equal(current.profile.player.credits,0);
  current.profile.tutorial.step = "launcher_buy_laser";
  current.profile.player.credits = SERVER_ITEM_SHOP.laser_mk1.price;
  assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(SERVER_ITEM_SHOP.laser_mk1)}).ok,true);
  assert.equal(current.profile.player.credits,0);
});

test("storage materials cannot be sold or consumed elsewhere; starting the required storage upgrade is allowed", ()=>{
  const current = fixture({step:"launcher_launch_storage_upgrade"});
  current.profile.activeQuestIds = [getTutorialQuestIds("astra")[1]];
  current.profile.cargoHold = {titane_fissure:50,silice_conductrice:50};
  const before = structuredClone(current.profile);
  const missingMaterial = structuredClone(before);
  missingMaterial.cargoHold.titane_fissure = 49;
  assert.equal(validateTutorialEconomyChange(before,missingMaterial).code,"TUTORIAL_MATERIAL_RESERVED");
  const started = current.manager.applyEconomyAction({player:current.player,action:{kind:"refinery-upgrade-start",type:"module",id:"storage"}});
  assert.equal(started.ok,true);
  assert.deepEqual(getTutorialReserves(current.profile),{credits:getAmmoPurchase("rocket_r1",100).totalPrice,materials:{}});
  assert.equal(current.profile.cargoHold.titane_fissure,0);
  assert.equal(current.profile.cargoHold.silice_conductrice,0);
});

test("refused alternative refinery spending restores consumed materials and does not start or persist a job", ()=>{
  const current = fixture();
  current.profile.player.credits = getTutorialReserves(current.profile).credits;
  current.profile.cargoHold = {cuivre_orbital:50,zinc_spatial:50,titane_fissure:50,silice_conductrice:50};
  const before = structuredClone(current.profile);
  const result = current.manager.applyEconomyAction({player:current.player,action:{kind:"refinery-upgrade-start",type:"module",id:"transport"}});
  assert.equal(result.code,"TUTORIAL_BUDGET_RESERVED");
  assert.deepEqual(current.profile,before);
  assert.equal(current.saved,0);
});

test("storage production remains usable during the guided confirmation step", ()=>{
  const current = fixture({step:"launcher_launch_storage_upgrade"});
  current.profile.refineryProductionDisabled = {titane_fissure:true};
  const result = current.manager.applyEconomyAction({player:current.player,action:{kind:"refinery-production-toggle",id:"titane_fissure"}});
  assert.equal(result.ok,true);
  assert.equal(current.profile.refineryProductionDisabled.titane_fissure,false);
});

test("the required combat kit cannot be sold, while extra equipment and re-equipping remain available", ()=>{
  const current = fixture({step:"launcher_equip_three_lasers"});
  current.profile.ownedShips.push("velox");
  current.profile.shipLoadouts.orion = {lasers:[],extras:[]};
  current.profile.inventoryItems.push({uid:"laser2",itemId:"laser_mk1"},{uid:"laser3",itemId:"laser_mk3"},{uid:"rocket",itemId:"launcher_rocket_mk1"});
  const before = structuredClone(current.profile);
  for(const inventoryUid of ["laser2","inv_repair_starter_2","rocket"]){
    assert.equal(current.manager.sellInventoryItem({player:current.player,inventoryUid}).code,"TUTORIAL_EQUIPMENT_RESERVED");
    assert.deepEqual(current.profile,before);
  }
  assert.equal(current.saved,0);
  current.profile.inventoryItems.push({uid:"spare",itemId:"laser_mk1"});
  assert.equal(current.manager.sellInventoryItem({player:current.player,inventoryUid:"spare"}).ok,true);
  assert.equal(current.manager.applyEquipmentAction({player:current.player,action:{kind:"equip",shipId:"velox",inventoryUid:"laser2",type:"laser",index:0}}).ok,true);
});

test("abandonment releases tutorial reserves and a depleted profile is never given free credits", ()=>{
  const current = fixture({credits:0});
  assert.equal(current.manager.addShipPurchase({player:current.player,purchase:purchase(SERVER_SHIP_SHOP.velox)}).ok,false);
  assert.equal(current.profile.player.credits,0);
  current.profile.tutorial.status = "abandoned";
  assert.deepEqual(getTutorialReserves(current.profile),{credits:0,materials:{}});
});

test("an affordable repair-drone replacement remains allowed even when the old pilot cannot cover the whole reserve", ()=>{
  const current = fixture({step:"launcher_depart",credits:SERVER_ITEM_SHOP.extra_repair_starter.price});
  current.profile.inventoryItems = current.profile.inventoryItems.filter(item=>item.itemId !== "extra_repair_starter");
  current.profile.shipLoadouts.orion.extras = [];
  assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(SERVER_ITEM_SHOP.extra_repair_starter)}).ok,true);
  assert.equal(current.profile.player.credits,0);
});

test("a necessary rocket or third-cannon replacement is allowed without permitting a replay once the kit is complete", ()=>{
  const current = fixture({step:"launcher_buy_laser",credits:SERVER_ITEM_SHOP.laser_mk1.price});
  current.profile.completedQuestClaims[getTutorialQuestIds("astra")[0]] = true;
  current.profile.ownedShips.push("velox");
  current.profile.inventoryItems.push({uid:"second_laser",itemId:"laser_mk1"});
  assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(SERVER_ITEM_SHOP.laser_mk1)}).ok,true);
  assert.equal(current.profile.player.credits,0);
  assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(SERVER_ITEM_SHOP.laser_mk1)}).code,"TUTORIAL_PURCHASE_ALREADY_READY");
  current.profile.tutorial.step = "launcher_equip_three_lasers";
  current.profile.player.credits = SERVER_ITEM_SHOP.launcher_rocket_mk1.price;
  assert.equal(current.manager.addItemPurchase({player:current.player,purchase:purchase(SERVER_ITEM_SHOP.launcher_rocket_mk1)}).ok,true);
  assert.equal(current.profile.player.credits,0);
});
