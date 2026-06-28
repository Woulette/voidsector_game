import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { applyProfileTitleSelection, getActiveProfileTitleName } from "../src/players/profileTitles.js";
import { buildPublicPlayerProfile } from "../src/players/publicProfile.js";
import { registerProgressionHandlers } from "../src/socket/progressionHandlers.js";

test("server rejects a locked profile title", ()=>{
  const profile = createDefaultProfile();

  const result = applyProfileTitleSelection(profile, {titleId:"hunter_100"});

  assert.equal(result.ok, false);
  assert.equal(profile.player.activeTitleId, undefined);
  assert.equal(getActiveProfileTitleName(profile), null);
});

test("server accepts and publishes an unlocked profile title", ()=>{
  const profile = createDefaultProfile();
  profile.player.totalKills = 100;

  const result = applyProfileTitleSelection(profile, {titleId:"hunter_100", visible:true});
  const publicProfile = buildPublicPlayerProfile({key:"account:1", profile});

  assert.equal(result.ok, true);
  assert.equal(profile.player.activeTitleId, "hunter_100");
  assert.equal(getActiveProfileTitleName(profile), "Traqueur spatial");
  assert.equal(publicProfile.title, "Traqueur spatial");
});

test("server never publishes a forged locked title", ()=>{
  const profile = createDefaultProfile();
  profile.player.activeTitleId = "laser_1b";
  profile.player.titleVisible = true;

  assert.equal(buildPublicPlayerProfile({key:"account:1", profile}).title, null);
});

test("profile title socket command updates the authoritative profile", async ()=>{
  const profile = createDefaultProfile();
  profile.player.totalKills = 100;
  const handlers = new Map();
  const emitted = [];
  let syncedProfile = null;
  const socket = {
    id:"socket-1",
    on:eventHandlerRegister,
    emit:(event, payload)=>emitted.push({event, payload})
  };

  function eventHandlerRegister(event, handler){
    handlers.set(event, handler);
  }

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

  await handlers.get("profile:title-set")({titleId:"hunter_100", visible:true});

  assert.equal(profile.player.activeTitleId, "hunter_100");
  assert.equal(syncedProfile, profile);
  assert.equal(emitted.at(-1).event, "profile:title-updated");
});
