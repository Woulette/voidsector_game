import assert from "node:assert/strict";
import test from "node:test";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

const instant = value=>Date.parse(value);

function fixture({persist = ()=>{}} = {}){
  const key = "account:beta-schedule-test";
  const profile = createDefaultProfile();
  profile.tutorial = {...profile.tutorial,status:"completed"};
  profile.betaRewardState = {claimedDays:[1],lastClaimDate:"2026-10-24",lastClaimAt:instant("2026-10-24T06:00:00Z")};
  const profiles = new Map([[key,profile]]);
  let writes = 0;
  const actions = createProfileActions({
    profiles,
    persist(saveKey){writes += 1;return persist(saveKey, profiles.get(saveKey));},
    getExistingProfile:()=>({key,profile:profiles.get(key)})
  });
  return {actions,profiles,key,player:{id:"beta-schedule-test",accountId:"beta-schedule-test"},get writes(){return writes;}};
}

test("server profile action grants exactly one Beta reward at the Paris autumn reset and persists its timestamp", async t=>{
  t.mock.timers.enable({apis:["Date"],now:instant("2026-10-25T06:59:59.999Z")});
  const persisted = [];
  const f = fixture({persist:(_key, profile)=>{persisted.push(structuredClone(profile));}});
  const previous = structuredClone(f.profiles.get(f.key));
  const early = f.actions.claimBetaReward({player:f.player,now:instant("2026-10-25T07:00:00Z")});
  assert.equal(early.ok, false, "the caller cannot override the server clock");
  assert.equal(f.writes, 0);
  assert.deepEqual(f.profiles.get(f.key), previous);

  t.mock.timers.setTime(instant("2026-10-25T07:00:00Z"));
  const result = f.actions.claimBetaReward({player:f.player});
  assert.equal(result.ok, true);
  await result.save;
  const saved = persisted[0];
  assert.equal(saved.player.premium, previous.player.premium + 5000);
  assert.deepEqual(saved.betaRewardState.claimedDays, [1, 2]);
  assert.equal(saved.betaRewardState.lastClaimDate, "2026-10-25");
  assert.equal(saved.betaRewardState.lastClaimAt, Date.now());
  assert.deepEqual(sanitizeProfile(JSON.parse(JSON.stringify(saved))).betaRewardState, saved.betaRewardState);
  assert.equal(f.actions.claimBetaReward({player:f.player}).ok, false);
  assert.equal(f.writes, 1);
});

test("failed Beta persistence restores currency and schedule, then permits a safe retry", async t=>{
  t.mock.timers.enable({apis:["Date"],now:instant("2026-10-25T07:00:00Z")});
  let rejectSave = true;
  const f = fixture({persist:()=>rejectSave ? Promise.reject(new Error("reward database unavailable")) : undefined});
  const before = structuredClone(f.profiles.get(f.key));
  const first = f.actions.claimBetaReward({player:f.player});
  assert.equal(first.ok, true);
  assert.equal(f.actions.claimBetaReward({player:f.player}).ok, false, "pending writes already reserve the daily reward");
  await assert.rejects(first.save, /reward database unavailable/);
  assert.deepEqual(f.profiles.get(f.key), before);
  rejectSave = false;
  const retry = f.actions.claimBetaReward({player:f.player});
  assert.equal(retry.ok, true);
  await retry.save;
  assert.equal(f.profiles.get(f.key).player.premium, before.player.premium + 5000);
  assert.deepEqual(f.profiles.get(f.key).betaRewardState.claimedDays, [1, 2]);
  assert.equal(f.writes, 2);
});

test("server reward remains unavailable if its clock moves behind a recorded claim", async t=>{
  t.mock.timers.enable({apis:["Date"],now:instant("2026-10-25T07:00:00Z")});
  const f = fixture();
  const claim = f.actions.claimBetaReward({player:f.player});
  await claim.save;
  const once = structuredClone(f.profiles.get(f.key));
  for(const at of ["2026-10-24T07:00:00Z", "2026-10-25T06:59:59.999Z", "2026-10-26T06:59:59.999Z"]){
    t.mock.timers.setTime(instant(at));
    assert.equal(f.actions.claimBetaReward({player:f.player}).ok, false);
    assert.deepEqual(f.profiles.get(f.key), once);
  }
  t.mock.timers.setTime(instant("2026-10-26T07:00:00Z"));
  const next = f.actions.claimBetaReward({player:f.player});
  assert.equal(next.ok, true);
  await next.save;
  assert.equal(f.writes, 2);
  assert.deepEqual(f.profiles.get(f.key).betaRewardState.claimedDays, [1, 2, 3]);
});
