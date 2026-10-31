import assert from "node:assert/strict";
import test from "node:test";
import { S1_BOOSTER_DURATION_MS as UNIT, getS1BoosterUnitCount } from "../../src/shared/firmBoosters.js";
import { getBoosterPurchase } from "../src/economy/shop.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";

function setup(units){
  const profile = createDefaultProfile();
  profile.player.premium = 1_000_000;
  profile.boosters.s1.damage.remainingMs = UNIT * units;
  const profiles = new Map([["account:boosters", profile]]);
  const player = {id:"booster-socket", accountId:"boosters"};
  const actions = createProfileActions({profiles, persist(){}, getExistingProfile:()=>({key:"account:boosters", profile:profiles.get("account:boosters")})});
  return {profiles, player, actions};
}

test("the thousandth booster is delivered and charged once; the next buy is refused without mutation", ()=>{
  const {profiles, player, actions} = setup(999);
  const purchase = getBoosterPurchase("booster_s1_damage");
  const accepted = actions.addBoosterPurchase({player, purchase});
  assert.equal(accepted.ok, true);
  assert.equal(accepted.profile.player.premium, 990_000);
  assert.equal(accepted.profile.boosters.s1.damage.remainingMs, UNIT * 1000);
  const before = JSON.stringify(profiles.get("account:boosters"));
  const refused = actions.addBoosterPurchase({player, purchase});
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /1000 boosters par type/);
  assert.equal(JSON.stringify(profiles.get("account:boosters")), before);
});

test("the cap is per type and partially consumed units still occupy their place", ()=>{
  const {profiles, player, actions} = setup(999.5);
  assert.equal(getS1BoosterUnitCount(profiles.get("account:boosters").boosters, "damage"), 1000);
  assert.equal(actions.addBoosterPurchase({player, purchase:getBoosterPurchase("booster_s1_damage")}).ok, false);
  assert.equal(actions.addBoosterPurchase({player, purchase:getBoosterPurchase("booster_s1_shield")}).ok, true);
});

test("coalesced single clicks cannot cross the cap or pay for a truncated batch", ()=>{
  const {profiles, player, actions} = setup(999);
  const before = JSON.stringify(profiles.get("account:boosters"));
  assert.equal(actions.addBoosterPurchase({player, purchase:getBoosterPurchase("booster_s1_damage", 1, 2)}).ok, false);
  assert.equal(JSON.stringify(profiles.get("account:boosters")), before);
  for(const quantity of [10, 100, 1000, 2000]) assert.equal(getBoosterPurchase("booster_s1_damage", quantity), null);
});

test("existing reserves above the new purchase cap are preserved", ()=>{
  const {profiles, player, actions} = setup(1200);
  const before = JSON.stringify(profiles.get("account:boosters"));
  assert.equal(actions.addBoosterPurchase({player, purchase:getBoosterPurchase("booster_s1_damage")}).ok, false);
  assert.equal(JSON.stringify(profiles.get("account:boosters")), before);
});
