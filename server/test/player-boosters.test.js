import test from "node:test";
import assert from "node:assert/strict";
import {
  S1_BOOSTER_DURATION_MS,
  S1_BOOSTER_SHOP,
  S2_BOOSTER_DURATION_MS,
  addPlayerBoosterUnits,
  buildCombinedBoosterSnapshot,
  consumeConnectedBoosterTime,
  getActivePlayerBoosterValues
} from "../../src/shared/firmBoosters.js";
import { getBoosterPurchase, getItemPurchase } from "../src/economy/shop.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { renderCombatBoostersPanel } from "../../src/game/ui/combatBoostersPanel.js";
import { installFirmSocketListeners } from "../../src/multiplayer/firmSocketListeners.js";

test("fifty S1 units create 250 connected hours and pause outside accounted playtime", ()=>{
  const initial = addPlayerBoosterUnits({}, {series:"s1", type:"damage", quantity:50});
  assert.equal(initial.s1.damage.remainingMs, 50 * S1_BOOSTER_DURATION_MS);
  const afterTwoConnectedHours = consumeConnectedBoosterTime(initial, 2 * 60 * 60 * 1000);
  assert.equal(afterTwoConnectedHours.s1.damage.remainingMs, 248 * 60 * 60 * 1000);
  assert.equal(getActivePlayerBoosterValues(afterTwoConnectedHours).damage, .10);
});

test("S2 units stack as real-time deadlines", ()=>{
  const now = 1_000_000;
  const first = addPlayerBoosterUnits({}, {series:"s2", type:"shield", quantity:2, now});
  assert.equal(first.s2.shield.endsAt, now + 2 * S2_BOOSTER_DURATION_MS);
  const extended = addPlayerBoosterUnits(first, {series:"s2", type:"shield", quantity:1, now:now + 5_000});
  assert.equal(extended.s2.shield.endsAt, now + 3 * S2_BOOSTER_DURATION_MS);
  assert.equal(getActivePlayerBoosterValues(extended, now + 2 * S2_BOOSTER_DURATION_MS).shield, .10);
  assert.deepEqual(getActivePlayerBoosterValues(extended, now + 3 * S2_BOOSTER_DURATION_MS), {});
});

test("different damage booster sources add their percentages while identical units only add time", ()=>{
  const now = 5_000_000;
  let playerBoosters = addPlayerBoosterUnits({}, {series:"s1", type:"damage", quantity:4, now});
  playerBoosters = addPlayerBoosterUnits(playerBoosters, {series:"s2", type:"damage", quantity:2, now});
  const snapshot = buildCombinedBoosterSnapshot({
    playerBoosters,
    seasonReward:{rank:1, endsAt:now + 7 * 24 * 60 * 60 * 1000, boosters:{damage:.10}},
    now
  });
  assert.ok(Math.abs(snapshot.values.damage - .30) < 1e-9);
  assert.equal(snapshot.items.length, 1);
  assert.equal(snapshot.items[0].sources.length, 3);
});

test("S1 shop quantity multiplies duration and NOVA price", ()=>{
  const purchase = getBoosterPurchase("booster_s1_damage", 50);
  assert.equal(purchase.quantity, 50);
  assert.equal(purchase.totalPrice, 500_000);
  assert.equal(purchase.totalDurationMs, 250 * 60 * 60 * 1000);
});

test("normal shop excludes the NOVA booster and the unfinished module category", ()=>{
  assert.equal(S1_BOOSTER_SHOP.length, 4);
  assert.equal(S1_BOOSTER_SHOP.some(booster=>booster.type === "nova"), false);
  assert.equal(S1_BOOSTER_SHOP.every(booster=>!booster.name.includes("S1")), true);
  assert.equal(getBoosterPurchase("booster_s1_nova", 1), null);
  assert.equal(getItemPurchase("ammo_module"), null);
});

test("server purchases S1 with NOVA and can grant S2 from an event source", ()=>{
  const profile = createDefaultProfile();
  profile.player.premium = 600_000;
  const profiles = new Map([["account:booster", profile]]);
  const player = {id:"socket-booster", accountId:"booster"};
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:booster", profile:profiles.get("account:booster")})
  });
  const purchase = actions.addBoosterPurchase({
    player,
    purchase:getBoosterPurchase("booster_s1_damage", 50)
  });
  assert.equal(purchase.ok, true);
  assert.equal(purchase.profile.player.premium, 100_000);
  assert.equal(purchase.profile.boosters.s1.damage.remainingMs, 250 * 60 * 60 * 1000);

  const grant = actions.grantBooster({player, series:"s2", type:"damage", quantity:2, source:"event-test"});
  assert.equal(grant.ok, true);
  assert.ok(grant.profile.boosters.s2.damage.endsAt > Date.now() + 47 * 60 * 60 * 1000);
});

test("booster panel renders a compact aggregate, the shortest timer and S1/S2 details", ()=>{
  const now = 10_000;
  const boosters = buildCombinedBoosterSnapshot({
    playerBoosters:addPlayerBoosterUnits({}, {series:"s1", type:"damage", quantity:1, now}),
    seasonReward:{rank:1, endsAt:now + 100_000, boosters:{damage:.10}},
    now
  });
  const html = renderCombatBoostersPanel({generatedAt:now, personal:{boosters}}, now, "damage");
  assert.equal((html.match(/combat-booster-row expanded/g) || []).length, 1);
  assert.match(html, /\+20%/);
  assert.match(html, /combat-booster-next-expiration">1 min 40 s</);
  assert.match(html, /<b>Booster S1<\/b>/);
  assert.match(html, /<b>Booster S2<\/b>/);
  assert.doesNotMatch(html, /Saison de firme/);
  assert.doesNotMatch(html, /Top 1/);
});

test("every season booster type is presented as S2 in its details", ()=>{
  const now = 20_000;
  const boosters = buildCombinedBoosterSnapshot({
    seasonReward:{
      rank:1,
      endsAt:now + S2_BOOSTER_DURATION_MS,
      boosters:{damage:.10, shield:.10, hull:.10, credits:.25, nova:.25}
    },
    now
  });
  for(const type of ["damage", "shield", "hull", "credits", "nova"]){
    const html = renderCombatBoostersPanel({generatedAt:now, personal:{boosters}}, now, type);
    assert.match(html, /<b>Booster S2<\/b>/);
    assert.doesNotMatch(html, /Saison de firme/);
  }
});

test("a global firm ranking refresh cannot overwrite the current account booster snapshot", ()=>{
  const handlers = new Map();
  const personal = {
    key:"account:current",
    firmId:"cyan",
    boosters:{items:[{id:"damage", sources:[{id:"s1:damage"}]}]}
  };
  const multiplayer = {
    firmSnapshot:{generatedAt:1, personal, firms:[]},
    firmRanking:null,
    firmEvents:[]
  };
  installFirmSocketListeners({
    socket:{on:(event, callback)=>handlers.set(event, callback)},
    multiplayer,
    emitChange(){},
    toast(){}
  });

  handlers.get("firm:ranking")({generatedAt:2, firms:[{id:"astra"}]});

  assert.equal(multiplayer.firmSnapshot.personal.key, "account:current");
  assert.equal(multiplayer.firmSnapshot.personal.boosters.items.length, 1);
  assert.equal(multiplayer.firmSnapshot.generatedAt, 2);
});
