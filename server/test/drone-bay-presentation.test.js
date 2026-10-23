import assert from "node:assert/strict";
import test from "node:test";
import { equipment, droneCatalog } from "../../src/data/equipment.js";
import { getDronePurchasePrice, store } from "../../src/core/store.js?v=20260726-kharon1";
import { createDroneBayModel, droneBayEquipAction, droneEquipmentKind, droneEquipmentStats, groupDroneInventory, resolveDroneBaySelection } from "../../src/ui/droneBayModel.js?v=20261023-dronebay1";
import { equipDroneBayInventoryItem, getDroneBayPresentationModel, handleDroneBayInteraction, renderDroneBayMarkup, selectDroneBayDrone, setDroneBayFilter, updateDroneBayPresentation } from "../../src/ui/renderDroneBay.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";

const item = id=>equipment.find(entry=>entry.id === id);
const drone = droneCatalog[0];
const entry = (uid, id, equipped = null)=>({uid, itemId:id, item:item(id), equipped});
const location = equipped=>!equipped ? "Disponible" : equipped.location === "drone" ? `Drone ${equipped.index + 1}` : equipped.shipId;
function model(options = {}){
  const drones = options.drones || [null, null];
  return createDroneBayModel({drone, drones, inventoryEntries:[], nextPrice:drone.basePrice * 2 ** drones.length,
    canPurchase:true, getItem:item, getLocationLabel:location, ...options});
}

function withProfile(profile, callback){
  const previous = {state:store.state, selectedInventoryUid:store.selectedInventoryUid, selectedInventoryUids:store.selectedInventoryUids};
  store.state = profile;
  store.selectedInventoryUid = null;
  store.selectedInventoryUids = [];
  try { return callback(); } finally { Object.assign(store, previous); setDroneBayFilter("all"); }
}

test("inventory groups only compatible equipment and retains every unique UID and location", ()=>{
  const entries = [entry("copy-free", "laser_mk2"), entry("copy-ship", "laser_mk2", {location:"ship", shipId:"velox"}),
    entry("copy-drone", "laser_mk2", {location:"drone", index:1}), entry("shield", "shield_gen"),
    entry("speed", "engine_ion"), entry("fluid", "teleportation_fluid"), entry("chip", "drone_overdrive_chip"),
    entry("prototype", "ancestral_drone_core"), entry("copy-free", "laser_mk2"), {uid:"unknown"}];
  const before = JSON.stringify(entries);
  const groups = groupDroneInventory(entries, {getLocationLabel:location});
  assert.equal(groups.length, 3);
  const lasers = groups.find(group=>group.id === "laser_mk2");
  assert.equal(lasers.total, 3);
  assert.equal(lasers.available, 1);
  assert.equal(lasers.equipped, 2);
  assert.deepEqual(lasers.copies.map(copy=>copy.uid), ["copy-free", "copy-ship", "copy-drone"]);
  assert.deepEqual(lasers.copies.map(copy=>copy.locationLabel), ["Disponible", "velox", "Drone 2"]);
  assert.equal(JSON.stringify(entries), before);
});

test("catalog art, rarities and statistics replace the illustrative mockup equipment", ()=>{
  const entries = ["laser_mk1", "laser_mk2", "laser_mk3", "laser_mk4", "laser_elite_red", "shield_gen", "shield_omega", "drone_overdrive_chip"].map((id, i)=>entry(`real-${i}`, id));
  const view = model({inventoryEntries:entries});
  const markup = renderDroneBayMarkup(view);
  for(const group of view.groups) assert.ok(markup.includes(group.item.img));
  assert.equal(view.groups.find(group=>group.id === "laser_mk1").rarity, "Commun");
  assert.equal(view.groups.find(group=>group.id === "laser_mk2").rarity, "Rare");
  assert.equal(view.groups.find(group=>group.id === "laser_mk3").rarity, "Rare");
  assert.equal(view.groups.find(group=>group.id === "laser_mk4").rarity, "Très rare");
  assert.equal(view.groups.find(group=>group.id === "laser_elite_red").rarity, "Élite");
  assert.equal(view.groups.find(group=>group.id === "shield_gen").rarity, "Commun");
  assert.equal(view.groups.find(group=>group.id === "drone_overdrive_chip").rarity, "PORTAIL");
  assert.equal(droneEquipmentStats(item("laser_mk2"))[0].value, "55–90");
  assert.equal(droneEquipmentStats(item("shield_omega")).find(stat=>stat.label === "Régénération").value, "35 / s");
  assert.equal(droneEquipmentKind(item("reactor_ion")), null);
  assert.doesNotMatch(markup, /Générateur A III|inventory-cell empty|data-inventory-resource-id/);
});

test("zero, eight and ten owned drones retain eight standard and two truthful special positions", ()=>{
  for(const count of [0, 8, 10]){
    const view = model({drones:Array(count).fill(null)});
    const markup = renderDroneBayMarkup(view);
    assert.equal(view.standardSlots.length, 8);
    assert.equal(view.specialSlots.length, 2);
    assert.equal(view.owned, count);
    assert.equal(view.standardOwned, Math.min(8, count));
    assert.equal(view.legacyOwned, Math.max(0, count - 8));
    assert.equal((markup.match(/data-drone-select=/g) || []).length, count);
    assert.equal((markup.match(/data-drone-slot-number=/g) || []).length, count);
    assert.equal(view.nextPrice == null, count >= 8);
    if(count === 0){ assert.equal(view.selectedDrone, null); assert.doesNotMatch(markup, /data-drop-index=/); assert.match(markup, /Aucun drone possédé/); }
  }
  assert.equal(resolveDroneBaySelection(10, 9), 9);
  assert.equal(resolveDroneBaySelection(2, 4), 0);
  assert.equal(resolveDroneBaySelection(2, -1), 0);
  assert.equal(resolveDroneBaySelection(0, 0), null);
});

test("real exponential prices stop at the standard cap and insufficient credits disable purchasing", ()=>{
  withProfile(createDefaultProfile(), ()=>{
    const expected = [200000, 400000, 800000, 1600000, 3200000, 6400000, 12800000, 25600000];
    assert.deepEqual(expected.map((_, index)=>getDronePurchasePrice(index)), expected);
    assert.equal(getDronePurchasePrice(8), null);
    assert.equal(getDronePurchasePrice(10), null);
    const view = model({drones:[null, null], nextPrice:getDronePurchasePrice(2), canPurchase:false});
    assert.equal(view.nextPrice, 800000);
    assert.match(renderDroneBayMarkup(view), /data-buy-combat-drone disabled/);
  });
});

test("grouped copies remain individually inspectable and draggable without implicit equipping", ()=>{
  const entries = [entry("unique-a", "laser_mk1"), entry("unique-b", "laser_mk1", {location:"drone", index:1})];
  const view = model({inventoryEntries:entries, selectedUid:"unique-a", expandedGroups:["laser_mk1"], selectedUids:["unique-b"]});
  const markup = renderDroneBayMarkup(view);
  assert.match(markup, /data-inventory-uid="unique-a"/);
  assert.match(markup, /data-inventory-uid="unique-b"/);
  assert.match(markup, /db-copy inventory-cell multi-selected/);
  assert.match(markup, /data-drone-equip-uid="unique-a"/);
  assert.match(markup, /data-inventory-sell="unique-a"/);
  assert.doesNotMatch(markup, /data-inventory-uid="laser_mk1"|data-inventory-equip=|data-equip-part=/);
  assert.equal((markup.match(/data-drone-equip-uid=/g) || []).length, 1);
  assert.equal(view.action.label, "Équiper sur Drone 01");
});

test("moving an exact equipped copy targets the selected drone and explains replacement", ()=>{
  const entries = [entry("ship-copy", "laser_mk2", {location:"ship", shipId:"velox"}), entry("previous", "shield_gen", {location:"drone", index:1})];
  const view = model({drones:[null, "previous"], inventoryEntries:entries, selectedDroneIndex:1, selectedUid:"ship-copy"});
  assert.equal(view.action.allowed, true);
  assert.equal(view.action.replacing, true);
  assert.equal(view.action.label, "Déplacer sur Drone 02");
  const markup = renderDroneBayMarkup(view);
  assert.match(markup, /module actuel retournera/);
  assert.match(markup, /data-drone-equip-uid="ship-copy"/);
  assert.match(markup, /data-drone-unequip="1"/);
  const same = model({drones:[null, "ship-copy"], inventoryEntries:entries, selectedDroneIndex:1, selectedUid:"ship-copy"});
  assert.equal(same.action.allowed, false);
  assert.equal(same.action.label, "Déjà équipé");
});

test("Overdrive retains its Vesper gate, consumed permanent status and shield-only generator bonus", ()=>{
  const chip = entry("permanent-core", "drone_overdrive_chip");
  const locked = model({inventoryEntries:[chip], selectedUid:chip.uid});
  assert.equal(locked.action.allowed, false);
  assert.match(locked.action.reason, /Faille de Vesper/);
  const open = model({inventoryEntries:[chip], selectedUid:chip.uid, portalComplete:true});
  assert.equal(open.action.allowed, true);
  assert.equal(open.action.permanent, true);
  assert.match(renderDroneBayMarkup(open), /noyau sera consommé/);
  assert.doesNotMatch(renderDroneBayMarkup(open), /data-inventory-sell=/);
  const active = model({inventoryEntries:[chip], selectedUid:chip.uid, portalComplete:true, getPermanentUpgrade:()=>chip.itemId});
  assert.equal(active.action.allowed, false);
  assert.match(renderDroneBayMarkup(active), /Permanent · retrait impossible · régénération inchangée/);
  assert.match(renderDroneBayMarkup(active), /\+50 % dégâts laser ou capacité de bouclier/);
  assert.equal(droneBayEquipAction(chip, null, true).allowed, false);
});

test("filters retain availability and selected drone without fake or incompatible inventory", ()=>{
  const entries = [entry("laser", "laser_mk1"), entry("shield", "shield_gen"), entry("chip", "drone_overdrive_chip"), entry("speed", "engine_ion")];
  for(const [filter, id] of [["lasers", "laser_mk1"], ["shields", "shield_gen"], ["overdrive", "drone_overdrive_chip"]]){
    const view = model({inventoryEntries:entries, selectedDroneIndex:1, filter});
    assert.deepEqual(view.groups.map(group=>group.id), [id]);
    assert.equal(view.selectedDroneIndex, 1);
    assert.equal(view.totalItems, 3);
  }
  assert.equal(model({filter:"forged"}).filter, "all");
});

test("rendered descriptions, names, art paths and UIDs are escaped", ()=>{
  const unsafe = {uid:'uid"<bad>', item:{...item("laser_mk1"), id:'id"<bad>', name:'<script>bad</script>', desc:'<b>unsafe</b>', img:'x" onerror="bad'}};
  const view = model({inventoryEntries:[unsafe], selectedUid:unsafe.uid, expandedGroups:[unsafe.item.id]});
  const markup = renderDroneBayMarkup(view);
  assert.match(markup, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.match(markup, /&lt;b&gt;unsafe&lt;\/b&gt;/);
  assert.match(markup, /uid&quot;&lt;bad&gt;/);
  assert.doesNotMatch(markup, /<script>| onerror="bad"/);
});

test("UI selection and filters survive profile redraws without changing the profile", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 2;
  profile.droneLoadout = [null, null];
  withProfile(profile, ()=>{
    getDroneBayPresentationModel();
    const before = JSON.stringify(profile);
    assert.equal(selectDroneBayDrone(1), true);
    assert.equal(selectDroneBayDrone(8), false);
    assert.equal(setDroneBayFilter("shields"), true);
    assert.equal(setDroneBayFilter("resources"), false);
    for(let index = 0; index < 3; index++){
      const view = getDroneBayPresentationModel();
      assert.equal(view.selectedDroneIndex, 1);
      assert.equal(view.filter, "shields");
    }
    assert.equal(JSON.stringify(profile), before);
  });
});

test("identical redraws retain DOM and changed selection restores focus and inventory scroll", ()=>{
  const previousDocument = globalThis.document;
  const focused = {hasAttribute:name=>name === "data-drone-filter", getAttribute:()=>"all"};
  const scroll = {dataset:{dbScroll:"inventory"}, scrollTop:120, scrollLeft:3};
  const restored = [];
  const focusTarget = {getAttribute:()=>"all", focus:options=>restored.push(options)};
  let writes = 0;
  const section = {contains:element=>element === focused, querySelectorAll:selector=>selector === "[data-db-scroll]" ? [scroll] : [focusTarget], set innerHTML(value){ writes++; this.markup = value; }};
  globalThis.document = {activeElement:focused};
  try {
    const first = model();
    assert.equal(updateDroneBayPresentation(section, first), true);
    assert.equal(updateDroneBayPresentation(section, first), false);
    assert.equal(writes, 1);
    updateDroneBayPresentation(section, model({selectedDroneIndex:1}));
    assert.equal(writes, 2);
    assert.equal(scroll.scrollTop, 120);
    assert.equal(scroll.scrollLeft, 3);
    assert.deepEqual(restored, [{preventScroll:true}, {preventScroll:true}]);
  } finally { globalThis.document = previousDocument; }
});

test("the explicit action passes the exact UID and selected drone while UID clicks fall through", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 2;
  profile.droneLoadout = [null, null];
  profile.inventoryItems.push({uid:"chosen-copy", itemId:"laser_mk2"});
  const previousDocument = globalThis.document;
  globalThis.document = {getElementById:()=>null};
  try {
    withProfile(profile, ()=>{
      selectDroneBayDrone(1);
      store.selectedInventoryUid = "chosen-copy";
      const calls = [];
      const button = {disabled:false, dataset:{droneEquipUid:"chosen-copy"}};
      const target = {closest:selector=>selector === "#droneSection" ? {} : selector === "[data-drone-equip-uid]" ? button : null};
      assert.equal(handleDroneBayInteraction({target}, {equipPart:(...args)=>calls.push(args)}), true);
      assert.deepEqual(calls, [["drone", 1, "chosen-copy"]]);
      assert.deepEqual(profile.droneLoadout, [null, null]);
      button.dataset.droneEquipUid = "stale-copy";
      handleDroneBayInteraction({target}, {equipPart:(...args)=>calls.push(args)});
      assert.equal(calls.length, 1);
      const uidTarget = {closest:selector=>selector === "#droneSection" ? {} : null};
      assert.equal(handleDroneBayInteraction({target:uidTarget}, {}), false);
    });
  } finally { globalThis.document = previousDocument; }
});

test("presentation UIDs persist through the existing server equipment action without duplication", async()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 2;
  profile.droneLoadout = ["existing", null];
  profile.inventoryItems.push({uid:"existing", itemId:"shield_gen"}, {uid:"exact-copy", itemId:"laser_mk2"});
  const profiles = new Map([["Pilot", profile]]);
  let persisted = 0;
  const actions = createProfileActions({profiles, persist:()=>{ persisted++; }, getExistingProfile:()=>({key:"Pilot", profile:profiles.get("Pilot")})});
  const view = model({drones:profile.droneLoadout, inventoryEntries:[entry("exact-copy", "laser_mk2")], selectedUid:"exact-copy", selectedDroneIndex:1});
  const result = actions.applyEquipmentAction({player:{name:"Pilot"}, action:{kind:"equip", type:"drone", index:view.selectedDroneIndex, inventoryUid:view.selectedEntry.uid}});
  assert.equal(result.ok, true);
  await result.save;
  assert.equal(persisted, 1);
  assert.deepEqual(result.profile.droneLoadout, ["existing", "exact-copy"]);
  const moved = actions.applyEquipmentAction({player:{name:"Pilot"}, action:{kind:"equip", type:"drone", index:0, inventoryUid:"exact-copy"}});
  assert.equal(moved.ok, true);
  await moved.save;
  assert.deepEqual(moved.profile.droneLoadout, ["exact-copy", null]);
  assert.equal(moved.profile.inventoryItems.filter(copy=>copy.uid === "exact-copy").length, 1);
  const incompatible = actions.applyEquipmentAction({player:{name:"Pilot"}, action:{kind:"equip", type:"drone", index:1, inventoryUid:"laser_mk2"}});
  assert.equal(incompatible.ok, false);
});

test("single-copy shortcut uses the selected drone across filters and refuses invalid or gated actions without fallback", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 2;
  profile.droneLoadout = [null, null];
  profile.inventoryItems.push({uid:"shortcut-laser", itemId:"laser_mk2"}, {uid:"shortcut-core", itemId:"drone_overdrive_chip"});
  const previousDocument = globalThis.document;
  globalThis.document = {getElementById:()=>({classList:{contains:()=>false}})};
  try {
    withProfile(profile, ()=>{
      getDroneBayPresentationModel();
      const calls = [];
      const actions = {equipPart:(...args)=>calls.push(args)};
      selectDroneBayDrone(1);
      setDroneBayFilter("shields");
      const before = JSON.stringify(profile);
      assert.equal(equipDroneBayInventoryItem("shortcut-laser", actions), true);
      assert.deepEqual(calls, [["drone", 1, "shortcut-laser"]]);
      assert.equal(JSON.stringify(profile), before);
      assert.equal(getDroneBayPresentationModel().filter, "shields");
      assert.equal(equipDroneBayInventoryItem("shortcut-core", actions), true);
      assert.equal(calls.length, 1, "Vesper refusal must not choose another drone");
      profile.completedPortals.violet = 1;
      assert.equal(equipDroneBayInventoryItem("shortcut-core", actions), true);
      assert.deepEqual(calls[1], ["drone", 1, "shortcut-core"]);
      assert.equal(profile.inventoryItems.some(copy=>copy.uid === "shortcut-core"), true);
      assert.deepEqual(profile.dronePermanentUpgrades, {});
      assert.equal(equipDroneBayInventoryItem("stale-uid", actions), true);
      assert.equal(calls.length, 2);
      profile.dronePermanentUpgrades = {1:"drone_overdrive_chip"};
      assert.equal(equipDroneBayInventoryItem("shortcut-core", actions), true);
      assert.equal(calls.length, 2, "an already upgraded selected drone must not redirect the core");
      profile.ownedDroneCount = 0;
      profile.droneLoadout = [];
      assert.equal(equipDroneBayInventoryItem("shortcut-laser", actions), true);
      assert.equal(calls.length, 2, "no ownership must not fall through to auto-equip");
    });
  } finally { globalThis.document = previousDocument; }
});

test("single-copy shortcut falls through only when the drone section is absent or hidden", ()=>{
  const previousDocument = globalThis.document;
  let section = null;
  const calls = [];
  globalThis.document = {getElementById:()=>section};
  try {
    const actions = {equipPart:(...args)=>calls.push(args)};
    assert.equal(equipDroneBayInventoryItem("unused", actions), false);
    section = {classList:{contains:name=>name === "hidden"}};
    assert.equal(equipDroneBayInventoryItem("unused", actions), false);
    section = {hidden:true, classList:{contains:()=>false}};
    assert.equal(equipDroneBayInventoryItem("unused", actions), false);
    assert.deepEqual(calls, []);
  } finally { globalThis.document = previousDocument; }
});
