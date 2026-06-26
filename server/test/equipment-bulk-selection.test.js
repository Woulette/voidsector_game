import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {
  createEquipmentDoubleClickTracker,
  normalizeEquipmentSelection,
  isEquipmentSelectionClearTarget,
  planShipEquipmentBatch,
  rectanglesIntersect,
  selectionRectangle,
  toggleEquipmentSelection
} from "../../src/app/equipmentBulkSelection.js";
import { createEquipmentActions } from "../../src/app/equipmentActions.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

const root = new URL("../../", import.meta.url);

test("equipment double click survives DOM replacement and resets for the next item", ()=>{
  const tracker = createEquipmentDoubleClickTracker({maxDelayMs:500});

  assert.equal(tracker.register("inventory:item-a", 1000), false);
  assert.equal(tracker.register("inventory:item-a", 1300), true);
  assert.equal(tracker.register("inventory:item-b", 1400), false);
  assert.equal(tracker.register("inventory:item-b", 1750), true);
  assert.equal(tracker.register("inventory:item-c", 2000), false);
  assert.equal(tracker.register("inventory:item-c", 2600), false);
});

test("ctrl selection keeps unique items and supports rectangle intersection", ()=>{
  assert.deepEqual(normalizeEquipmentSelection(["a", "a", "b"]), ["a", "b"]);
  assert.deepEqual(toggleEquipmentSelection(["a"], "b"), ["a", "b"]);
  assert.deepEqual(toggleEquipmentSelection(["a", "b"], "a"), ["b"]);

  const rect = selectionRectangle(40, 50, 10, 20);
  assert.deepEqual(rect, {left:10, top:20, right:40, bottom:50, width:30, height:30});
  assert.equal(rectanglesIntersect(rect, {left:35, top:45, right:60, bottom:70}), true);
  assert.equal(rectanglesIntersect(rect, {left:41, top:51, right:60, bottom:70}), false);
});

test("only an empty equipment panel area clears the multi-selection", ()=>{
  const panel = {closest:selector=>selector.includes(".equipped-compact-panel") ? panel : null};
  const emptyArea = {
    closest(selector){
      if(selector.includes(".equipped-compact-panel")) return panel;
      return null;
    }
  };
  const item = {
    closest(selector){
      if(selector.includes(".equipped-compact-panel")) return panel;
      if(selector.includes("[data-slot-uid]")) return item;
      return null;
    }
  };
  const button = {
    closest(selector){
      if(selector.includes(".rpg-inventory-panel")) return panel;
      if(selector.includes("button")) return button;
      return null;
    }
  };

  assert.equal(isEquipmentSelectionClearTarget(emptyArea), true);
  assert.equal(isEquipmentSelectionClearTarget(item), false);
  assert.equal(isEquipmentSelectionClearTarget(button), false);
  assert.equal(isEquipmentSelectionClearTarget(null), false);
});

test("bulk ship planning fills free compatible slots without replacing equipment", ()=>{
  const items = {
    laser_a:{category:"canon"},
    laser_b:{category:"canon"},
    shield:{category:"generateur"},
    extra:{category:"extra"}
  };
  const actions = planShipEquipmentBatch({
    inventoryUids:["laser_a", "laser_b", "shield", "extra"],
    getItem:uid=>items[uid],
    findEquipped:()=>null,
    shipId:"razorion",
    loadout:{
      lasers:["already_equipped", null, null],
      generators:[null],
      extras:[null],
      missileLauncher:null,
      rocketLauncher:null
    }
  });

  assert.deepEqual(actions.map(action=>[action.type, action.index, action.inventoryUid]), [
    ["laser", 1, "laser_a"],
    ["laser", 2, "laser_b"],
    ["generator", 0, "shield"],
    ["extra", 0, "extra"]
  ]);
});

test("bulk extra planning replaces the matching unique family before using an empty slot", ()=>{
  const items = {
    repair_red:{id:"extra_repair_bot", category:"extra", equipGroup:"repair-drone"},
    repair_blue:{id:"extra_repair_starter", category:"extra", equipGroup:"repair-drone"},
    auto_missile:{id:"extra_auto_missile", category:"extra"}
  };
  const actions = planShipEquipmentBatch({
    inventoryUids:["repair_blue"],
    getItem:uid=>items[uid],
    findEquipped:()=>null,
    shipId:"razorion",
    loadout:{
      lasers:[],
      generators:[],
      extras:["repair_red", "auto_missile", null],
      missileLauncher:null,
      rocketLauncher:null
    }
  });

  assert.deepEqual(actions, [
    {kind:"equip", type:"extra", index:0, inventoryUid:"repair_blue", shipId:"razorion"}
  ]);
});

test("double-click auto equip targets the already equipped extra family", ()=>{
  const sent = [];
  const items = {
    repair_red:{id:"extra_repair_bot", category:"extra", equipGroup:"repair-drone"},
    repair_blue:{id:"extra_repair_starter", category:"extra", equipGroup:"repair-drone"}
  };
  const loadout = {
    lasers:[],
    generators:[],
    extras:["repair_red", null, null],
    missileLauncher:null,
    rocketLauncher:null
  };
  const actions = createEquipmentActions({
    multiplayer:{connected:true, socket:{}, auth:{account:{id:"account"}, profileReady:true}},
    store:{state:{selectedShip:"razorion", dronePermanentUpgrades:{}}, hangarTab:"vaisseau"},
    getItemFromInventoryUid:uid=>items[uid],
    getShip:()=>({id:"razorion"}),
    getLoadout:()=>loadout,
    getDroneLoadout:()=>[],
    isDronePermanentUpgradeItem:()=>false,
    isDroneCompatibleEquipment:()=>false,
    equipServerInventoryItem:payload=>(sent.push(payload), true),
    showToast:()=>{}
  });

  actions.autoEquipInventoryItem("repair_blue");

  assert.deepEqual(sent, [{
    type:"extra",
    index:0,
    inventoryUid:"repair_blue",
    shipId:"razorion"
  }]);
});

test("server applies a multi-equipment request in one authoritative profile update", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "astralis";
  profile.selectedShip = "astralis";
  profile.ownedShips = [...new Set([...(profile.ownedShips || []), "astralis"])];
  profile.inventoryItems.push(
    {uid:"bulk_laser_1", itemId:"laser_mk1"},
    {uid:"bulk_laser_2", itemId:"laser_mk2"},
    {uid:"bulk_generator", itemId:"shield_omega"}
  );
  profile.shipLoadouts.astralis = {
    lasers:Array(8).fill(null),
    generators:Array(10).fill(null),
    extras:Array(5).fill(null),
    missileLauncher:null,
    rocketLauncher:null
  };
  const profiles = new Map([["Pilot", profile]]);
  let persistCount = 0;
  const manager = createProfileActions({
    profiles,
    persist(){ persistCount += 1; },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const equipped = manager.applyEquipmentAction({
    player:{name:"Pilot"},
    action:{
      kind:"batch",
      actions:[
        {kind:"equip", type:"laser", index:0, inventoryUid:"bulk_laser_1", shipId:"astralis"},
        {kind:"equip", type:"laser", index:1, inventoryUid:"bulk_laser_2", shipId:"astralis"},
        {kind:"equip", type:"generator", index:0, inventoryUid:"bulk_generator", shipId:"astralis"}
      ]
    }
  });

  assert.equal(equipped.ok, true);
  assert.equal(equipped.count, 3);
  assert.equal(persistCount, 1);
  assert.deepEqual(equipped.profile.shipLoadouts.astralis.lasers.slice(0, 2), ["bulk_laser_1", "bulk_laser_2"]);
  assert.equal(equipped.profile.shipLoadouts.astralis.generators[0], "bulk_generator");

  const removed = manager.applyEquipmentAction({
    player:{name:"Pilot"},
    action:{
      kind:"batch",
      actions:[
        {kind:"unequip-inventory", inventoryUid:"bulk_laser_1"},
        {kind:"unequip-inventory", inventoryUid:"bulk_generator"}
      ]
    }
  });
  assert.equal(removed.ok, true);
  assert.equal(removed.count, 2);
  assert.equal(removed.profile.shipLoadouts.astralis.lasers[0], null);
  assert.equal(removed.profile.shipLoadouts.astralis.generators[0], null);
});

test("equipment slot labels stay compact and multi-select interactions are wired", ()=>{
  const renderSource = fs.readFileSync(new URL("src/ui/render.js", root), "utf8");
  const appSource = fs.readFileSync(new URL("src/app.js", root), "utf8");
  const cssSource = fs.readFileSync(new URL("src/styles/hangar.css", root), "utf8");

  assert.match(renderSource, /return `A \$\{shieldTier\.toUpperCase\(\)\}`/);
  assert.match(renderSource, /return `V \$\{speedTier\.toUpperCase\(\)\}`/);
  assert.match(appSource, /e\.ctrlKey/);
  assert.match(appSource, /isEquipmentSelectionClearTarget\(e\.target\)/);
  assert.match(appSource, /equipment-selection-marquee/);
  assert.match(appSource, /applyServerEquipmentBatch/);
  assert.match(appSource, /equipmentDoubleClickTracker\.register\(`inventory:\$\{uid\}`/);
  assert.doesNotMatch(appSource, /addEventListener\("dblclick"/);
  assert.match(cssSource, /text-overflow:ellipsis/);
  assert.match(cssSource, /\.multi-selected/);
});
