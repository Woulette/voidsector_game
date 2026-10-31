import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileMutations } from "../src/players/profileMutations.js";

test("an older failed save cannot roll back a newer in-memory mutation", async ()=>{
  const key = "account:rollback-test";
  const profile = createDefaultProfile();
  profile.player.credits = 0;
  const profiles = new Map([[key, profile]]);
  const pending = [];
  const mutations = createProfileMutations({
    profiles,
    persist(){
      return new Promise((resolve, reject)=>pending.push({resolve, reject}));
    },
    persistDeferred:null,
    profileKeyForPlayer:()=>key,
    getExistingProfile:()=>({key, profile:profiles.get(key)})
  });
  const player = {id:"player", accountId:"rollback-test"};

  const first = mutations.updateProfileForPlayer({
    player,
    update:current=>{
      current.player.credits = 10;
      return {ok:true};
    }
  });
  const second = mutations.updateProfileForPlayer({
    player,
    update:current=>{
      current.player.credits = 20;
      return {ok:true};
    }
  });

  pending[0].reject(new Error("first write failed"));
  await assert.rejects(first.save, /first write failed/);
  assert.equal(profiles.get(key).player.credits, 20);

  pending[1].resolve();
  await second.save;
  assert.equal(profiles.get(key).player.credits, 20);
});
