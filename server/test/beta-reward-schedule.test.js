import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { betaRewardCalendar, claimBetaRewardState, getBetaRewardDateKey, getBetaRewardStatus, normalizeBetaRewardState } from "../../src/data/premium.js";
import { BETA_REWARD_TIME_ZONE, getBetaRewardResetAt, getBetaRewardSchedule, normalizeBetaRewardDateKey } from "../../src/shared/betaRewardSchedule.js";

const instant = value=>Date.parse(value);

test("Beta reward period changes at precisely 08:00 Paris in winter and summer", ()=>{
  for(const [before, boundary, date, next] of [
    ["2026-01-17T06:59:59.999Z", "2026-01-17T07:00:00Z", "2026-01-17", "2026-01-18T07:00:00Z"],
    ["2026-07-17T05:59:59.999Z", "2026-07-17T06:00:00Z", "2026-07-17", "2026-07-18T06:00:00Z"]
  ]){
    assert.equal(getBetaRewardSchedule(instant(before)).nextResetAt, instant(boundary));
    const schedule = getBetaRewardSchedule(instant(boundary));
    assert.equal(schedule.dateKey, date);
    assert.equal(schedule.periodStartAt, instant(boundary));
    assert.equal(schedule.nextResetAt, instant(next));
    assert.equal(schedule.scheduleTimeZone, BETA_REWARD_TIME_ZONE);
    assert.equal(schedule.resetHour, 8);
    assert.notEqual(getBetaRewardDateKey(instant(before)), date);
  }
});

test("Paris clock changes produce a 23-hour spring period and a 25-hour autumn period", ()=>{
  const spring = getBetaRewardSchedule(instant("2026-03-28T07:00:00Z"));
  assert.equal(spring.nextResetAt, instant("2026-03-29T06:00:00Z"));
  assert.equal(spring.nextResetAt - spring.periodStartAt, 23 * 60 * 60 * 1000);
  const autumn = getBetaRewardSchedule(instant("2026-10-24T06:00:00Z"));
  assert.equal(autumn.nextResetAt, instant("2026-10-25T07:00:00Z"));
  assert.equal(autumn.nextResetAt - autumn.periodStartAt, 25 * 60 * 60 * 1000);
});

test("Paris daily keys remain stable through the repeated or missing overnight hour", ()=>{
  for(const at of ["2026-03-29T00:30:00Z", "2026-03-29T01:30:00Z"]){
    const schedule = getBetaRewardSchedule(instant(at));
    assert.equal(schedule.dateKey, "2026-03-28");
    assert.equal(schedule.nextResetAt, instant("2026-03-29T06:00:00Z"));
  }
  for(const at of ["2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"]){
    const schedule = getBetaRewardSchedule(instant(at));
    assert.equal(schedule.dateKey, "2026-10-24");
    assert.equal(schedule.nextResetAt, instant("2026-10-25T07:00:00Z"));
  }
});

test("a claimed Beta reward remains blocked across midnight and opens at Paris 08:00", ()=>{
  const profile = {};
  const firstAt = instant("2026-10-24T12:00:00Z");
  const first = claimBetaRewardState(profile, firstAt);
  assert.equal(first.ok, true);
  assert.equal(profile.betaRewardState.lastClaimDate, "2026-10-24");
  assert.equal(profile.betaRewardState.lastClaimAt, firstAt);
  for(const at of ["2026-10-24T22:00:00Z", "2026-10-25T00:00:00Z", "2026-10-25T06:59:59.999Z"]){
    const previous = structuredClone(profile);
    const result = claimBetaRewardState(profile, instant(at));
    assert.equal(result.ok, false);
    assert.equal(result.status.nextAvailableAt, instant("2026-10-25T07:00:00Z"));
    assert.deepEqual(profile, previous);
  }
  const next = claimBetaRewardState(profile, instant("2026-10-25T07:00:00Z"));
  assert.equal(next.ok, true);
  assert.equal(next.day, 2);
  assert.equal(next.status.nextDay, 3);
  assert.equal(next.status.canClaim, false);
  assert.equal(next.status.nextAvailableAt, instant("2026-10-26T07:00:00Z"));
});

test("a pre-08:00 claim and a post-08:00 claim belong to separate reward periods", ()=>{
  const profile = {};
  assert.equal(claimBetaRewardState(profile, instant("2026-07-17T05:59:59.999Z")).ok, true);
  assert.equal(profile.betaRewardState.lastClaimDate, "2026-07-16");
  assert.equal(claimBetaRewardState(profile, instant("2026-07-17T06:00:00Z")).ok, true);
  assert.deepEqual(profile.betaRewardState.claimedDays, [1, 2]);
});

test("legacy date-only claims preserve progress and cannot produce an extra pre-reset claim", ()=>{
  const profile = {betaRewardState:{claimedDays:[1,2],lastClaimDate:"2026-10-24",randomShipRewards:{day_15:"nyxaris"}}};
  const before = getBetaRewardStatus(profile, instant("2026-10-25T06:59:59.999Z"));
  assert.equal(before.canClaim, false);
  assert.equal(before.nextAvailableAt, instant("2026-10-25T07:00:00Z"));
  const next = claimBetaRewardState(profile, instant("2026-10-25T07:00:00Z"));
  assert.equal(next.ok, true);
  assert.equal(next.day, 3);
  assert.deepEqual(next.state.claimedDays, [1, 2, 3]);
  assert.deepEqual(next.state.randomShipRewards, {day_15:"nyxaris"});
  const sameCivilDayBefore08 = getBetaRewardStatus({betaRewardState:{claimedDays:[1],lastClaimDate:"2026-10-24"}}, instant("2026-10-24T05:00:00Z"));
  assert.equal(sameCivilDayBefore08.canClaim, false);
  assert.equal(sameCivilDayBefore08.nextAvailableAt, instant("2026-10-25T07:00:00Z"));
});

test("future claim dates and clock rollback stay blocked through the recorded period", ()=>{
  const now = instant("2026-10-24T12:00:00Z");
  const byDate = getBetaRewardStatus({betaRewardState:{claimedDays:[1],lastClaimDate:"2026-10-26"}}, now);
  assert.equal(byDate.canClaim, false);
  assert.equal(byDate.nextAvailableAt, instant("2026-10-27T07:00:00Z"));
  const byTimestamp = getBetaRewardStatus({betaRewardState:{claimedDays:[1],lastClaimDate:"2026-10-23",lastClaimAt:instant("2026-10-25T07:00:00Z")}}, now);
  assert.equal(byTimestamp.canClaim, false);
  assert.equal(byTimestamp.nextAvailableAt, instant("2026-10-26T07:00:00Z"));
});

test("invalid saved date fields normalize safely while a valid claim timestamp remains authoritative", ()=>{
  for(const key of ["2026-02-29", "2026-13-01", "2026-10-99", "2026-1-01", "garbage", {}, null]){
    assert.equal(normalizeBetaRewardDateKey(key), "");
    assert.equal(getBetaRewardResetAt(key), null);
  }
  assert.equal(normalizeBetaRewardDateKey("2028-02-29"), "2028-02-29");
  const state = normalizeBetaRewardState({claimedDays:[1,1,2,26,-1],lastClaimDate:"invalid",lastClaimAt:Infinity});
  assert.deepEqual(state.claimedDays, [1, 2]);
  assert.equal(state.lastClaimDate, "");
  assert.equal(state.lastClaimAt, 0);
  const status = getBetaRewardStatus({betaRewardState:{claimedDays:[1],lastClaimDate:"invalid",lastClaimAt:instant("2026-10-24T12:00:00Z")}}, instant("2026-10-25T06:00:00Z"));
  assert.equal(status.canClaim, false);
  assert.equal(status.nextAvailableAt, instant("2026-10-25T07:00:00Z"));
});

test("finishing the calendar returns a recomputed completed status without a next reward timer", ()=>{
  const now = instant("2026-10-24T12:00:00Z");
  const profile = {betaRewardState:{claimedDays:betaRewardCalendar.slice(0,24).map(day=>day.day),lastClaimDate:"2026-10-23"}};
  const result = claimBetaRewardState(profile, now);
  assert.equal(result.ok, true);
  assert.equal(result.day, 25);
  assert.equal(result.status.completed, true);
  assert.equal(result.status.claimedCount, 25);
  assert.equal(result.status.canClaim, false);
  assert.equal(result.status.nextAvailableAt, null);
  assert.match(result.status.reason, /termine/);
});

test("Beta schedule is independent from browser or server host time zone", ()=>{
  const moduleUrl = new URL("../../src/data/premium.js", import.meta.url).href;
  const code = `import {getBetaRewardDateKey,getBetaRewardStatus} from ${JSON.stringify(moduleUrl)}; const now=Date.parse('2026-10-25T06:59:59.999Z'); console.log(JSON.stringify([getBetaRewardDateKey(now),getBetaRewardStatus({betaRewardState:{claimedDays:[1],lastClaimDate:'2026-10-24'}},now).nextAvailableAt]));`;
  for(const zone of ["UTC", "Pacific/Honolulu", "Asia/Tokyo", "Europe/Paris"]){
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {encoding:"utf8",env:{...process.env,TZ:zone}});
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), ["2026-10-24", instant("2026-10-25T07:00:00Z")]);
  }
});
