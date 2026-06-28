import assert from "node:assert/strict";
import test from "node:test";
import { getDroneFormationPurchase } from "../src/economy/shop.js";
import { createProfileManager } from "../src/players/profiles.js";

function cleanName(value){
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 24) || "NOVA-37";
}

function createTestProfileManager(){
  const persisted = [];
  const manager = createProfileManager({
    cleanName,
    logger:{warn(){}},
    loadProfileEntries:async()=>[],
    persistProfileEntries:async entries=>{
      persisted.push(entries);
    }
  });
  return {manager, persisted};
}

function makeForgedProfile(overrides = {}){
  return {
    updatedAt:Date.now() + 10_000,
    player:{
      name:"Cheater",
      credits:999_999_999,
      premium:999_999,
      xp:999_999,
      totalXp:999_999,
      level:99,
      skillPoints:99,
      firmId:"cygnus",
      firmSelected:true,
      reputation:999_999,
      totalKills:999_999,
      totalPlayerKills:999_999,
      monsterRankPoints:999_999,
      rankScore:999_999,
      totalPlaySeconds:999_999,
      laserShotsFired:999_999,
      rocketShotsFired:999_999,
      missileShotsFired:999_999
    },
    ownedShips:["orion", "razorion"],
    activeShip:"razorion",
    selectedShip:"razorion",
    inventoryItems:[{uid:"hack_laser", itemId:"laser_mk3"}],
    nextInventoryUid:9_999,
    ammoInventory:{ammo_x6:999_999},
    shipLoadouts:{razorion:{lasers:["hack_laser"], generators:[], extras:[]}},
    ownedDroneCount:8,
    droneLoadout:["hack_laser"],
    ownedDroneFormations:["base", "delta"],
    activeDroneFormation:"delta",
    cargoHold:{conducteur_renforce:999},
    shipCargo:{razorion:{conducteur_renforce:999}},
    skillRanks:{damage:[5, 5, 5]},
    unlockedPortals:["emerald"],
    completedPortals:{emerald:999},
    portalPieces:{emerald:999},
    prestigeCount:99,
    refineryLevels:{conducteur_renforce:99},
    refineryModules:{transport:99},
    activeQuestIds:["astra_l1_collect"],
    questProgress:{astra_l1_collect:999},
    completedQuestClaims:{astra_l1_collect:true},
    starterPackPurchases:["starter_razorion"],
    killStats:{sentinel_orb:999},
    rankKillStats:{sentinel_orb:999},
    activityLog:[{id:"forged", type:"admin", label:"Faux log", detail:"Tout va bien", createdAt:Date.now()}],
    worldSession:{mapId:"5", x:1234, y:5678, hp:999999, maxHp:999999, shipId:"razorion", updatedAt:Date.now()},
    shipWorldSessions:{razorion:{mapId:"5", x:1234, y:5678, hp:999999, maxHp:999999, shipId:"razorion", updatedAt:Date.now()}},
    firmatons:999,
    firmBoxes:{mythic:99},
    actionSlots:["ammo_x6", null, null, null, null, null, null, null, "extra_repair_bot"],
    actionSlotsByShip:{orion:["ammo_x6", null, null, null, null, null, null, null, "extra_repair_bot"]},
    lastLaserAmmoId:"ammo_x6",
    ...overrides
  };
}

test("profile save is rejected for unauthenticated sockets", ()=>{
  const {manager} = createTestProfileManager();
  const result = manager.saveFromPayload({
    player:{id:"guest-socket", name:"Guest"},
    payload:{name:"Guest", profile:makeForgedProfile()}
  });

  assert.equal(result, null);
  assert.equal(manager.findProfileEntryByPilotName("Cheater"), null);
});

test("profile save cannot forge critical account progression or ownership", ()=>{
  const {manager} = createTestProfileManager();
  const player = {id:"account-socket", name:"Normal", accountId:42, account:{username:"Normal", firmId:"astra"}};
  manager.syncForSocket({emit(){}}, player);

  const result = manager.saveFromPayload({
    player,
    payload:{profile:makeForgedProfile()}
  });

  assert.equal(result.ok, undefined);
  const profile = result.profile;
  assert.equal(profile.player.credits, 0);
  assert.equal(profile.player.premium, 0);
  assert.equal(profile.player.level, 1);
  assert.equal(profile.player.skillPoints, 1);
  assert.equal(profile.player.totalPlaySeconds, 0);
  assert.equal(profile.player.laserShotsFired, 0);
  assert.equal(profile.player.rocketShotsFired, 0);
  assert.equal(profile.player.missileShotsFired, 0);
  assert.equal(profile.player.firmId, "astra");
  assert.equal(profile.player.firmSelected, false);
  assert.deepEqual(profile.ownedShips, ["orion"]);
  assert.equal(profile.activeShip, "orion");
  assert.equal(profile.selectedShip, "orion");
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "hack_laser"), false);
  assert.equal(profile.ammoInventory.ammo_x6, undefined);
  assert.equal(profile.ownedDroneCount, 0);
  assert.deepEqual(profile.cargoHold, {});
  assert.deepEqual(profile.shipCargo, {});
  assert.deepEqual(profile.skillRanks, {});
  assert.deepEqual(profile.unlockedPortals, []);
  assert.deepEqual(profile.completedPortals, {});
  assert.deepEqual(profile.portalPieces, {blue:0, violet:0, red:0, emerald:0, void:0, ancient:0});
  assert.equal(profile.prestigeCount, 0);
  assert.deepEqual(profile.refineryLevels, {});
  assert.deepEqual(profile.refineryModules, {});
  assert.deepEqual(profile.completedQuestClaims, {});
  assert.deepEqual(profile.starterPackPurchases, []);
  assert.deepEqual(profile.killStats, {});
  assert.deepEqual(profile.activityLog, []);
  assert.equal(profile.worldSession, null);
  assert.deepEqual(profile.shipWorldSessions, {});
  assert.equal(profile.firmatons, 0);
  assert.equal(profile.firmBoxes.mythic, 0);
});

test("profile save only keeps non-critical client preferences", ()=>{
  const {manager} = createTestProfileManager();
  const player = {id:"account-socket", name:"Normal", accountId:43, account:{username:"Normal", firmId:"astra"}};
  manager.syncForSocket({emit(){}}, player);

  const result = manager.saveFromPayload({
    player,
    payload:{profile:makeForgedProfile()}
  });

  assert.equal(result.profile.actionSlots[0], "ammo_x6");
  assert.equal(result.profile.actionSlotsByShip.orion[0], "ammo_x6");
  assert.equal(result.profile.lastLaserAmmoId, "ammo_x6");
});

test("unchanged profile save acknowledges without writing another profile row", async ()=>{
  const {manager, persisted} = createTestProfileManager();
  const player = {id:"account-socket", name:"Normal", accountId:45, account:{username:"Normal", firmId:"astra"}};
  manager.syncForSocket({emit(){}}, player);
  await manager.flushPersistence();
  persisted.length = 0;

  const profile = manager.getProfileForPlayer(player);
  const result = manager.saveFromPayload({
    player,
    payload:{
      profile:{
        updatedAt:Date.now() + 10_000,
        actionSlots:profile.actionSlots,
        actionSlotsByShip:profile.actionSlotsByShip,
        lastLaserAmmoId:profile.lastLaserAmmoId
      }
    }
  });
  await manager.flushPersistence();

  assert.equal(result.unchanged, true);
  assert.equal(result.profile.updatedAt, profile.updatedAt);
  assert.equal(persisted.length, 0);
});

test("drone formation activation is charged from server ownership, not client flags", ()=>{
  const {manager} = createTestProfileManager();
  const player = {id:"account-socket", name:"Normal", accountId:44, account:{username:"Normal", firmId:"astra"}};
  manager.syncForSocket({emit(){}}, player);
  manager.updateProfileForPlayer({
    player,
    update:profile=>{
      profile.player.premium = 60000;
      return {ok:true};
    }
  });

  const purchase = getDroneFormationPurchase("tir");
  const bought = manager.addDroneFormationPurchase({player, purchase, owned:true});
  assert.equal(bought.ok, true);
  assert.equal(bought.owned, false);
  assert.equal(bought.cost, 50000);
  assert.equal(bought.profile.player.premium, 10000);
  assert.equal(bought.profile.activeDroneFormation, "tir");
  assert.equal(bought.profile.ownedDroneFormations.includes("tir"), true);

  const activated = manager.addDroneFormationPurchase({player, purchase, owned:false});
  assert.equal(activated.ok, true);
  assert.equal(activated.owned, true);
  assert.equal(activated.cost, 0);
  assert.equal(activated.profile.player.premium, 10000);
  assert.equal(activated.profile.activeDroneFormation, "tir");
});
