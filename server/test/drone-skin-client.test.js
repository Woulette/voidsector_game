import assert from "node:assert/strict";
import test from "node:test";
import { store } from "../../src/core/store.js?v=20260726-kharon1";
import { normalizeState } from "../../src/core/stateNormalizer.js?v=20260726-kharon1";
import {
  applyDronePermanentUpgrade, cleanDroneSkinLoadout, findEquippedSlot,
  getDroneDamageMultiplier, getDroneGeneratorStatMultiplier, getDronePermanentUpgrade,
  getDroneSkinLoadout, getDroneSkinUid, getInventoryByCategory, unequipInventoryItem
} from "../../src/core/equipmentStore.js?v=20260726-kharon1";
import { createEquipmentActions } from "../../src/app/equipmentActions.js";
import { planDroneEquipmentBatch } from "../../src/app/equipmentBulkSelection.js";
import { createProfileController } from "../../src/app/profileController.js";

const SKIN_ID = "drone_overdrive_chip";
const inventory = ()=>[
  {uid:"laser", itemId:"laser_mk1"},
  {uid:"skin-a", itemId:SKIN_ID},
  {uid:"skin-b", itemId:SKIN_ID}
];
const fixture = overrides=>({
  ownedDroneCount:2, droneLoadout:["laser", null], droneSkinLoadout:[null, null],
  dronePermanentUpgrades:{}, inventoryItems:inventory(), completedPortals:{violet:1},
  shipLoadouts:{}, selectedShip:"orion", activeShip:"orion", ownedShips:["orion"],
  player:{level:1, xp:0}, ...overrides
});

function withState(state, run){
  const previous = store.state;
  store.state = state;
  try{ return run(state); }finally{ store.state = previous; }
}

test("client skin loadout validates actual inventory UIDs and deduplicates owned slots", ()=>{
  const entries = inventory();
  const before = JSON.stringify(entries);
  assert.deepEqual(cleanDroneSkinLoadout(["skin-a", "skin-a", "laser", "missing", "skin-b"], 5, entries), ["skin-a", null, null, null, "skin-b"]);
  assert.deepEqual(cleanDroneSkinLoadout(["skin-a", "skin-b"], 1, entries), ["skin-a"]);
  assert.equal(cleanDroneSkinLoadout([], 100, entries).length, 10);
  assert.equal(JSON.stringify(entries), before);
});

test("client getters do not turn a legacy or forged item-ID map into an owned skin", ()=>{
  withState(fixture({droneSkinLoadout:undefined, dronePermanentUpgrades:{0:SKIN_ID}}), state=>{
    const before = JSON.stringify(state.inventoryItems);
    assert.deepEqual(getDroneSkinLoadout(), [null, null]);
    assert.equal(getDronePermanentUpgrade(0), null);
    assert.equal(getDroneDamageMultiplier(0), 1);
    assert.deepEqual(state.dronePermanentUpgrades, {});
    assert.equal(JSON.stringify(state.inventoryItems), before);
  });
});

test("local equipment alias moves and replaces skins without consuming their inventory UIDs", ()=>{
  withState(fixture(), state=>{
    const before = JSON.stringify(state.inventoryItems);
    assert.equal(applyDronePermanentUpgrade(0, "skin-a").ok, true);
    assert.deepEqual(getDroneSkinLoadout(), ["skin-a", null]);
    assert.deepEqual(findEquippedSlot("skin-a"), {location:"drone", type:"droneSkin", index:0});
    assert.equal(applyDronePermanentUpgrade(1, "skin-a").ok, true);
    assert.deepEqual(getDroneSkinLoadout(), [null, "skin-a"]);
    assert.equal(applyDronePermanentUpgrade(1, "skin-b").ok, true);
    assert.deepEqual(getDroneSkinLoadout(), [null, "skin-b"]);
    assert.equal(findEquippedSlot("skin-a"), null);
    assert.equal(getInventoryByCategory("drone_upgrade").find(entry=>entry.uid === "skin-b").equipped.type, "droneSkin");
    assert.equal(unequipInventoryItem("skin-b"), true);
    assert.deepEqual(getDroneSkinLoadout(), [null, null]);
    assert.deepEqual(state.droneLoadout, ["laser", null]);
    assert.equal(JSON.stringify(state.inventoryItems), before);
    assert.equal(findEquippedSlot(null), null);
  });
});

test("equipped Overdrive keeps its 50 percent laser and shield bonus without increasing regeneration", ()=>{
  withState(fixture({droneSkinLoadout:["skin-a", null]}), ()=>{
    assert.equal(getDroneSkinUid(0), "skin-a");
    assert.equal(getDroneSkinUid(-1), null);
    assert.equal(getDronePermanentUpgrade(0), SKIN_ID);
    assert.equal(getDroneDamageMultiplier(0), 1.5);
    assert.equal(getDroneGeneratorStatMultiplier(0, "bouclier"), 1.5);
    assert.equal(getDroneGeneratorStatMultiplier(0, "regen"), 1);
    assert.equal(getDroneDamageMultiplier(1), 1);
  });
});

test("a locked Vesper disables the bonus but retains the equipped skin for removal", ()=>{
  withState(fixture({completedPortals:{}, droneSkinLoadout:["skin-a", null]}), state=>{
    assert.equal(getDroneSkinUid(0), "skin-a");
    assert.equal(getDroneDamageMultiplier(0), 1);
    assert.equal(getDroneGeneratorStatMultiplier(0, "bouclier"), 1);
    assert.equal(applyDronePermanentUpgrade(1, "skin-b").ok, false);
    assert.equal(unequipInventoryItem("skin-a"), true);
    assert.deepEqual(getDroneSkinLoadout(), [null, null]);
    assert.equal(state.inventoryItems.filter(entry=>entry.itemId === SKIN_ID).length, 2);
  });
});

test("bulk planning fills independent skin slots and never consumes or duplicates a selected UID", ()=>{
  const items = {a:{id:SKIN_ID, category:"drone_upgrade"}, b:{id:SKIN_ID, category:"drone_upgrade"}, c:{category:"canon"}};
  const skins = ["occupied-skin", null, null];
  const drones = [null, "occupied-laser", null];
  const actions = planDroneEquipmentBatch({
    inventoryUids:["occupied-skin", "a", "a", "b", "c"],
    getItem:uid=>items[uid], findEquipped:uid=>uid === "occupied-skin" ? {type:"droneSkin"} : null,
    drones, droneSkinLoadout:skins,
    isDronePermanentUpgradeItem:item=>item?.category === "drone_upgrade",
    isDroneCompatibleEquipment:item=>item?.category === "canon"
  });
  assert.deepEqual(actions, [
    {kind:"equip", type:"droneSkin", index:1, inventoryUid:"a", shipId:""},
    {kind:"equip", type:"droneSkin", index:2, inventoryUid:"b", shipId:""},
    {kind:"equip", type:"drone", index:0, inventoryUid:"c", shipId:""}
  ]);
  assert.deepEqual(skins, ["occupied-skin", null, null]);
  assert.deepEqual(drones, [null, "occupied-laser", null]);
});

test("client equipment commands route skins to the distinct server slot without optimistic mutation", ()=>{
  const sent = [];
  const state = fixture({droneSkinLoadout:["skin-a", null]});
  const before = JSON.stringify(state);
  const actions = createEquipmentActions({
    multiplayer:{connected:true, socket:{}, auth:{account:{id:"account"}, profileReady:true}},
    store:{state, hangarTab:"drone"},
    getItemFromInventoryUid:uid=>state.inventoryItems.find(entry=>entry.uid === uid)?.itemId === SKIN_ID ? {id:SKIN_ID, category:"drone_upgrade"} : null,
    getShip:()=>({id:"orion"}), getDroneLoadout:()=>state.droneLoadout,
    getDroneSkinLoadout:()=>state.droneSkinLoadout,
    isDronePermanentUpgradeItem:item=>item?.category === "drone_upgrade",
    equipServerInventoryItem:payload=>(sent.push(payload), true),
    applyServerDroneUpgrade(){ throw new Error("new commands must use the normal equipment route"); },
    showToast(){}
  });
  actions.equipPart("drone", 1, "skin-b");
  actions.autoEquipInventoryItem("skin-b");
  assert.deepEqual(sent.map(({type, index, inventoryUid})=>({type, index, inventoryUid})), [
    {type:"droneSkin", index:1, inventoryUid:"skin-b"},
    {type:"droneSkin", index:1, inventoryUid:"skin-b"}
  ]);
  assert.equal(JSON.stringify(state), before);
});

test("legacy skin migration is explicit, one-time and never creates an authoritative MMO item", ()=>{
  const previous = store.state;
  const raw = {
    ownedDroneCount:2, droneLoadout:[null, null],
    inventoryItems:[{uid:"free-skin", itemId:SKIN_ID}],
    dronePermanentUpgrades:{0:SKIN_ID, 1:SKIN_ID}, nextInventoryUid:4
  };
  try{
    const normal = normalizeState(structuredClone(raw));
    assert.equal(normal.inventoryItems.filter(entry=>entry.itemId === SKIN_ID).length, 1);
    assert.deepEqual(normal.droneSkinLoadout, [null, null]);
    const legacy = normalizeState(structuredClone(raw), {migrateLegacyDroneSkins:true});
    assert.equal(legacy.inventoryItems.filter(entry=>entry.itemId === SKIN_ID).length, 3);
    assert.equal(new Set(legacy.droneSkinLoadout).size, 2);
    assert.equal(legacy.droneSkinLoadout.includes("free-skin"), false);
    const again = normalizeState(legacy, {migrateLegacyDroneSkins:true});
    assert.equal(again.inventoryItems.filter(entry=>entry.itemId === SKIN_ID).length, 3);
    const authoritative = normalizeState({...structuredClone(raw), mmoProfileUpdatedAt:100}, {migrateLegacyDroneSkins:true});
    assert.equal(authoritative.inventoryItems.filter(entry=>entry.itemId === SKIN_ID).length, 1);
  }finally{ store.state = previous; }
});

test("canonical profile updates copy skin UIDs and refresh combat even for the same skin model", ()=>{
  const originals = {window:globalThis.window, localStorage:globalThis.localStorage, CustomEvent:globalThis.CustomEvent};
  globalThis.localStorage = {getItem:()=>null, setItem(){}};
  globalThis.CustomEvent = class {constructor(type, options){ this.type = type; this.detail = options?.detail; }};
  globalThis.window = {dispatchEvent(){}};
  let refreshes = 0;
  const target = {state:fixture({droneSkinLoadout:["skin-a", null], dronePermanentUpgrades:{0:SKIN_ID}}), currentView:"hangar", hangarTab:"drone"};
  const controller = createProfileController({
    store:target, game:{running:true, refreshActiveLoadout(){refreshes += 1;}, updateHud(){}}, appMode:"game",
    profileScopeStorageKey:"skin-test", getXpNextForLevel:()=>3000, xpCurveVersion:1,
    ensureShipLoadout(){}, setStateStorageScope(){}, loadState(){}, saveState(){}, syncMultiplayerProfile(){}, renderAll(){}, showToast(){}
  });
  try{
    const incoming = ["skin-b", null];
    controller.applyServerProfile({updatedAt:1, droneSkinLoadout:incoming, droneSkinLoadoutVersion:1, dronePermanentUpgrades:{0:SKIN_ID}});
    assert.deepEqual(target.state.droneSkinLoadout, incoming);
    assert.notEqual(target.state.droneSkinLoadout, incoming);
    assert.equal(refreshes, 1);
    assert.equal(target.state.inventoryItems.length, 3);
    controller.applyServerProfile({updatedAt:2, droneSkinLoadout:[null, null], dronePermanentUpgrades:{}});
    assert.equal(refreshes, 2);
  }finally{
    for(const [key, value] of Object.entries(originals)){
      if(value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
