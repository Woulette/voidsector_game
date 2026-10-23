import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import {
  applyProfileTitleSelection,
  getActiveProfileTitleName,
  getEquippedProfileTitleDamageMultiplier,
  STELLAR_SYSTEM_TITLE_ID,
  STELLAR_SYSTEM_TITLE_NAME,
  STELLAR_SYSTEM_TITLE_ORNAMENT_ID
} from "../src/players/profileTitles.js";
import { buildPublicPlayerProfile } from "../src/players/publicProfile.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { registerProgressionHandlers } from "../src/socket/progressionHandlers.js";
import { normalizeState } from "../../src/core/stateNormalizer.js";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";
import { installProgressionSocketListeners } from "../../src/multiplayer/progressionSocketListeners.js";

test("server rejects the stellar-system title before the level-fifty portal", ()=>{
  const profile = createDefaultProfile();

  const result = applyProfileTitleSelection(profile, {titleId:STELLAR_SYSTEM_TITLE_ID});

  assert.equal(result.ok, false);
  assert.equal(profile.player.activeTitleId, null);
  assert.equal(getActiveProfileTitleName(profile), null);
  assert.equal(getEquippedProfileTitleDamageMultiplier(profile), 1);
});

test("the Eternal portal unlocks the title, ornament entitlement and public display", ()=>{
  const profile = createDefaultProfile();
  profile.completedPortals.eternal = 1;

  const result = applyProfileTitleSelection(profile, {titleId:STELLAR_SYSTEM_TITLE_ID, visible:true});
  const publicProfile = buildPublicPlayerProfile({key:"account:1", profile});

  assert.equal(result.ok, true);
  assert.equal(profile.player.activeTitleId, STELLAR_SYSTEM_TITLE_ID);
  assert.equal(getActiveProfileTitleName(profile), STELLAR_SYSTEM_TITLE_NAME);
  assert.equal(publicProfile.title, STELLAR_SYSTEM_TITLE_NAME);
  assert.deepEqual(publicProfile.titleEntitlements, [{
    id:STELLAR_SYSTEM_TITLE_ID,
    name:STELLAR_SYSTEM_TITLE_NAME,
    ornamentId:STELLAR_SYSTEM_TITLE_ORNAMENT_ID,
    damageMultiplier:1.05
  }]);
});

test("profile sanitizer strips a forged locked title", ()=>{
  const profile = sanitizeProfile({
    player:{
      activeTitleId:STELLAR_SYSTEM_TITLE_ID,
      titleVisible:true
    },
    completedPortals:{}
  });

  assert.equal(profile.player.activeTitleId, null);
  assert.equal(getEquippedProfileTitleDamageMultiplier(profile), 1);
});

test("client normalization preserves only the unlocked authoritative title state", ()=>{
  const unlocked = normalizeState({
    player:{
      activeTitleId:STELLAR_SYSTEM_TITLE_ID,
      titleVisible:false
    },
    completedPortals:{eternal:1}
  });
  const locked = normalizeState({
    player:{
      activeTitleId:STELLAR_SYSTEM_TITLE_ID,
      titleVisible:true
    },
    completedPortals:{}
  });

  assert.equal(unlocked.player.activeTitleId, STELLAR_SYSTEM_TITLE_ID);
  assert.equal(unlocked.player.titleVisible, false);
  assert.equal(locked.player.activeTitleId, null);
  assert.equal(locked.player.titleVisible, true);
});

test("profile title socket command updates the authoritative profile", async ()=>{
  const profile = createDefaultProfile();
  profile.completedPortals.eternal = 1;
  const handlers = new Map();
  const emitted = [];
  let syncedProfile = null;
  const socket = {
    id:"socket-1",
    on:(event, handler)=>handlers.set(event, handler),
    emit:(event, payload)=>emitted.push({event, payload})
  };

  registerProgressionHandlers(socket, {
    emitProfileSync(_player, nextProfile){
      syncedProfile = nextProfile;
    },
    guard:()=>true,
    players:new Map([["socket-1", {id:"socket-1", accountId:"account-1"}]]),
    profileManager:{
      updateProfileForPlayer({update}){
        return {...update(profile), profile};
      }
    }
  });

  await handlers.get("profile:title-set")({titleId:STELLAR_SYSTEM_TITLE_ID, visible:true});

  assert.equal(profile.player.activeTitleId, STELLAR_SYSTEM_TITLE_ID);
  assert.equal(syncedProfile, profile);
  assert.equal(emitted.at(-1).event, "profile:title-updated");
});

test("client command emits only title selection fields and listeners provide feedback", ()=>{
  const emitted = [];
  const multiplayer = {
    connected:true,
    socket:{emit:(event, payload)=>emitted.push({event, payload})},
    auth:{account:{id:"account-1"}, profileReady:true}
  };
  const commands = createSocketCommands({multiplayer});

  assert.equal(commands.setServerProfileTitle({
    titleId:STELLAR_SYSTEM_TITLE_ID,
    visible:false,
    damageMultiplier:999
  }), true);
  assert.deepEqual(emitted, [{
    event:"profile:title-set",
    payload:{titleId:STELLAR_SYSTEM_TITLE_ID, visible:false}
  }]);

  const handlers = new Map();
  const messages = [];
  const changes = [];
  installProgressionSocketListeners({
    socket:{on:(event, handler)=>handlers.set(event, handler)},
    multiplayer:{},
    emitChange:(event, payload)=>changes.push({event, payload}),
    toast:message=>messages.push(message)
  });
  handlers.get("profile:title-updated")({titleId:STELLAR_SYSTEM_TITLE_ID, visible:false});

  assert.match(messages.at(-1), /masqué/i);
  assert.equal(changes.at(-1).event, "profile:title-updated");
});

function combatProfile(weaponClass, withTitle){
  const profile = createDefaultProfile();
  if(withTitle){
    profile.completedPortals.eternal = 1;
    assert.equal(applyProfileTitleSelection(profile, {titleId:STELLAR_SYSTEM_TITLE_ID}).ok, true);
  }
  if(weaponClass === "rocket"){
    profile.inventoryItems.push({uid:"title_rocket_launcher", itemId:"launcher_rocket_mk1"});
    profile.shipLoadouts.orion.rocketLauncher = "title_rocket_launcher";
    profile.ammoInventory.rocket_r1 = 10;
  }else if(weaponClass === "missile"){
    profile.inventoryItems.push({uid:"title_missile_launcher", itemId:"launcher_missile_mk1"});
    profile.shipLoadouts.orion.missileLauncher = "title_missile_launcher";
    profile.ammoInventory.missile_m1 = 10;
  }
  return profile;
}

test("the equipped title adds five percent server damage to every weapon class", ()=>{
  const ammoByWeapon = {
    laser:"ammo_x1",
    rocket:"rocket_r1",
    missile:"missile_m1"
  };
  for(const weaponClass of Object.keys(ammoByWeapon)){
    const baseline = resolveServerCombatFire({
      player:{id:`title-baseline-${weaponClass}`, state:{x:0, y:0, shipId:"orion"}},
      profile:combatProfile(weaponClass, false),
      enemy:{x:100, y:0},
      payload:{weaponClass, ammoId:ammoByWeapon[weaponClass], count:1},
      random:()=>0,
      now:10_000
    });
    const titled = resolveServerCombatFire({
      player:{id:`title-equipped-${weaponClass}`, state:{x:0, y:0, shipId:"orion"}},
      profile:combatProfile(weaponClass, true),
      enemy:{x:100, y:0},
      payload:{weaponClass, ammoId:ammoByWeapon[weaponClass], count:1},
      random:()=>0,
      now:10_000
    });

    assert.equal(baseline.ok, true, weaponClass);
    assert.equal(titled.ok, true, weaponClass);
    assert.equal(baseline.titleDamageMultiplier, 1, weaponClass);
    assert.equal(titled.titleDamageMultiplier, 1.05, weaponClass);
    assert.equal(titled.damage, Math.round(baseline.damage * 1.05), weaponClass);
  }
});
