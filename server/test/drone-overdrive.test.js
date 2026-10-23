import assert from "node:assert/strict";
import test from "node:test";
import { getShipCombatStats } from "../../src/core/combatStatsStore.js";
import {
  getDroneDamageMultiplier as getClientDroneLaserDamageMultiplier,
  getDroneGeneratorStatMultiplier as getClientDroneGeneratorStatMultiplier
} from "../../src/core/equipmentStore.js";
import { normalizeState, store } from "../../src/core/store.js";
import { droneCatalog, equipment } from "../../src/data/equipment.js";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import {
  applyDronePermanentUpgrade,
  getDroneGeneratorStatMultiplier,
  getDroneLaserDamageMultiplier,
  isSupportedDronePermanentUpgradeItem
} from "../src/economy/equipment.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { getTrustedGeneratorStat } from "../src/players/playerStateValidation.js";

const CHIP_ID = "drone_overdrive_chip";
const ANCESTRAL_ID = "ancestral_drone_core";

function addDroneEquipment(profile, itemId, uid = `drone-${itemId}`){
  profile.inventoryItems.push({uid, itemId});
  profile.ownedDroneCount = 1;
  profile.droneLoadout = [uid];
  return uid;
}

function equipSkinFixture(profile){
  profile.inventoryItems.push({uid:"equipped-overdrive", itemId:CHIP_ID});
  profile.droneSkinLoadout = ["equipped-overdrive"];
}

function fireDroneLaser({upgraded = false, vesperCompleted = true, playerId} = {}){
  const profile = createDefaultProfile();
  profile.shipLoadouts.orion.lasers = [];
  addDroneEquipment(profile, "laser_mk1");
  profile.completedPortals = vesperCompleted ? {violet:1} : {};
  if(upgraded) equipSkinFixture(profile);
  profile.ammoInventory.ammo_x1 = 10;
  const result = resolveServerCombatFire({
    player:{id:playerId, state:{x:0, y:0, shipId:"orion"}},
    profile,
    enemy:{x:100, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"},
    random:()=>0,
    now:1000
  });
  assert.equal(result.ok, true);
  assert.equal(result.hit, true);
  return result.damage;
}

test("overdrive is compatible only with the one-slot combat drone and never with the ancestral prototype", ()=>{
  const combatDrone = droneCatalog.find(drone=>drone.id === "combat_drone");
  const chip = equipment.find(item=>item.id === CHIP_ID);
  const ancestral = equipment.find(item=>item.id === ANCESTRAL_ID);

  assert.equal(combatDrone.slots, 1);
  assert.match(chip.name, /Overdrive/);
  assert.equal(chip.img, "assets/drone_skins/puce_vesper.png?v=20260726-kharon1");
  assert.equal(isSupportedDronePermanentUpgradeItem(chip, combatDrone), true);
  assert.equal(isSupportedDronePermanentUpgradeItem(chip, {...combatDrone, slots:2}), false);
  assert.equal(isSupportedDronePermanentUpgradeItem(ancestral, combatDrone), false);
  assert.equal(ancestral.slotType, "future");
});

test("overdrive cannot be installed before completing La Faille de Vesper", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 1;
  profile.droneLoadout = [null];
  profile.inventoryItems.push({uid:"overdrive-chip", itemId:CHIP_ID});

  const locked = applyDronePermanentUpgrade(profile, {index:0, inventoryUid:"overdrive-chip"});

  assert.equal(locked.ok, false);
  assert.match(locked.reason, /Faille de Vesper/i);
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "overdrive-chip"), true);
  assert.deepEqual(profile.dronePermanentUpgrades, {});

  profile.completedPortals.violet = 1;
  const unlocked = applyDronePermanentUpgrade(profile, {index:0, inventoryUid:"overdrive-chip"});

  assert.equal(unlocked.ok, true);
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "overdrive-chip"), true);
  assert.deepEqual(profile.droneSkinLoadout, ["overdrive-chip"]);
  assert.deepEqual(profile.dronePermanentUpgrades, {0:CHIP_ID});
});

test("authoritative equipment action persists the equipped skin without consuming its UID", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 1;
  profile.droneLoadout = [null];
  profile.completedPortals.violet = 1;
  profile.inventoryItems.push({uid:"persisted-overdrive-chip", itemId:CHIP_ID});
  const profiles = new Map([["Pilot", profile]]);
  let persistCount = 0;
  const actions = createProfileActions({
    profiles,
    persist(){ persistCount += 1; },
    getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
  });

  const result = actions.applyEquipmentAction({
    player:{name:"Pilot"},
    action:{kind:"drone-upgrade", index:0, inventoryUid:"persisted-overdrive-chip"}
  });

  assert.equal(result.ok, true);
  assert.equal(persistCount, 1);
  assert.deepEqual(result.profile.dronePermanentUpgrades, {0:CHIP_ID});
  assert.equal(result.profile.inventoryItems.some(entry=>entry.uid === "persisted-overdrive-chip"), true);
  assert.deepEqual(result.profile.droneSkinLoadout, ["persisted-overdrive-chip"]);
});

test("ancestral prototype cannot be consumed as a combat-drone upgrade", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 1;
  profile.droneLoadout = [null];
  profile.completedPortals.violet = 1;
  profile.inventoryItems.push({uid:"ancestral-core", itemId:ANCESTRAL_ID});

  const result = applyDronePermanentUpgrade(profile, {index:0, inventoryUid:"ancestral-core"});

  assert.equal(result.ok, false);
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "ancestral-core"), true);
  assert.deepEqual(profile.dronePermanentUpgrades, {});
});

test("invalid drone indices cannot redirect an upgrade onto drone zero", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 1;
  profile.droneLoadout = [null];
  profile.completedPortals.violet = 1;
  profile.inventoryItems.push({uid:"invalid-index-chip", itemId:CHIP_ID});

  const result = applyDronePermanentUpgrade(profile, {index:-1, inventoryUid:"invalid-index-chip"});

  assert.equal(result.ok, false);
  assert.equal(profile.inventoryItems.some(entry=>entry.uid === "invalid-index-chip"), true);
  assert.deepEqual(profile.dronePermanentUpgrades, {});
});

test("legacy profile sanitization restores only valid owned skin installations", ()=>{
  const profile = createDefaultProfile();
  profile.ownedDroneCount = 1;
  profile.completedPortals.violet = 1;
  profile.dronePermanentUpgrades = {
    0:CHIP_ID,
    1:CHIP_ID,
    2:ANCESTRAL_ID,
    invalid:CHIP_ID
  };
  delete profile.droneSkinLoadout;
  delete profile.droneSkinLoadoutVersion;

  assert.deepEqual(sanitizeProfile(profile).dronePermanentUpgrades, {0:CHIP_ID});

  profile.completedPortals = {};
  const locked = sanitizeProfile(profile);
  assert.deepEqual(locked.dronePermanentUpgrades, {0:CHIP_ID});
  assert.equal(getDroneLaserDamageMultiplier(locked, 0), 1);
});

test("server laser authority applies the equipped skin 50 percent bonus only after Vesper", ()=>{
  const baseDamage = fireDroneLaser({playerId:"drone-overdrive-base"});
  const upgradedDamage = fireDroneLaser({upgraded:true, playerId:"drone-overdrive-active"});
  const forgedLockedDamage = fireDroneLaser({
    upgraded:true,
    vesperCompleted:false,
    playerId:"drone-overdrive-locked"
  });

  assert.equal(getDroneLaserDamageMultiplier({
    ownedDroneCount:1,
    completedPortals:{violet:1},
    inventoryItems:[{uid:"skin", itemId:CHIP_ID}],
    droneSkinLoadout:["skin"]
  }, 0), 1.5);
  assert.equal(upgradedDamage, Math.round(baseDamage * 1.5));
  assert.equal(forgedLockedDamage, baseDamage);
});

test("server generator authority boosts shield capacity by 50 percent but not regen", ()=>{
  const profile = createDefaultProfile();
  addDroneEquipment(profile, "shield_omega");
  profile.completedPortals.violet = 1;
  equipSkinFixture(profile);

  assert.equal(getDroneGeneratorStatMultiplier(profile, 0, "bouclier"), 1.5);
  assert.equal(getDroneGeneratorStatMultiplier(profile, 0, "regen"), 1);
  assert.equal(getTrustedGeneratorStat(profile, "bouclier", 30), 1800);
  assert.equal(getTrustedGeneratorStat(profile, "regen", 1), 35);

  profile.completedPortals = {};
  assert.equal(getTrustedGeneratorStat(profile, "bouclier", 30), 1200);
});

test("client preview mirrors the authoritative Vesper laser and shield bonuses", ()=>{
  const previousState = store.state;
  try{
    const profile = createDefaultProfile();
    addDroneEquipment(profile, "shield_omega");
    profile.completedPortals.violet = 1;
    equipSkinFixture(profile);
    store.state = normalizeState(profile);

    assert.equal(getClientDroneLaserDamageMultiplier(0), 1.5);
    assert.equal(getClientDroneGeneratorStatMultiplier(0, "bouclier"), 1.5);
    assert.equal(getClientDroneGeneratorStatMultiplier(0, "regen"), 1);
    const stats = getShipCombatStats("orion");
    assert.equal(stats.bouclier, 1800);
    assert.equal(stats.regen, 35);

    store.state.completedPortals = {};
    assert.equal(getClientDroneLaserDamageMultiplier(0), 1);
    assert.equal(getShipCombatStats("orion").bouclier, 1200);
  }finally{
    store.state = previousState;
  }
});
