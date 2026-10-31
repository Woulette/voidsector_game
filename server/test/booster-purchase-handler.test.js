import assert from "node:assert/strict";
import test from "node:test";
import { registerEconomyHandlers } from "../src/socket/economyHandlers.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { S1_BOOSTER_DURATION_MS as UNIT } from "../../src/shared/firmBoosters.js";

function setup(units = 999, persist = ()=>{}){
  const profile = createDefaultProfile();
  profile.player.premium = 1_000_000;
  profile.boosters.s1.damage.remainingMs = units * UNIT;
  const profiles = new Map([["account:unit-buyer", profile]]);
  const player = {id:"unit-buyer-socket", accountId:"unit-buyer"};
  const actions = createProfileActions({profiles, persist, getExistingProfile:()=>({key:"account:unit-buyer", profile:profiles.get("account:unit-buyer")})});
  const events = [], handlers = new Map();
  const socket = {id:player.id, on:(event, handler)=>handlers.set(event, handler), emit:(event, payload)=>events.push({event, payload})};
  registerEconomyHandlers(socket, {guard:()=>true, players:new Map([[player.id,player]]), profileManager:actions,
    emitProfileSync:(_player, value)=>socket.emit("profile:sync", value)});
  return {events, profiles, buy:payload=>handlers.get("shop:buy-booster")(payload)};
}

test("unit booster acknowledgement waits for storage, then the cap rejects another buy without a debit", async()=>{
  let resolve;
  const saving = new Promise(done=>{resolve=done;});
  const fixture = setup(999, ()=>saving);
  const pending = fixture.buy({id:"booster_s1_damage", quantity:1});
  assert.equal(fixture.events.length,0);
  resolve(); await pending;
  assert.deepEqual(fixture.events.map(e=>e.event), ["shop:booster-bought", "profile:sync"]);
  const canonical = fixture.profiles.get("account:unit-buyer");
  assert.equal(canonical.boosters.s1.damage.remainingMs,1000*UNIT);
  assert.equal(canonical.player.premium,990_000);
  const before = JSON.stringify(canonical);
  fixture.events.length=0;
  await fixture.buy({id:"booster_s1_damage", quantity:1});
  assert.deepEqual(fixture.events.map(e=>e.event), ["shop:error"]);
  assert.match(fixture.events[0].payload.message,/1000 boosters par type/);
  assert.equal(JSON.stringify(fixture.profiles.get("account:unit-buyer")),before);
});

test("direct socket requests cannot buy packs of boosters", async()=>{
  const fixture=setup(0);
  const before=JSON.stringify(fixture.profiles.get("account:unit-buyer"));
  for(const quantity of [10,50,100,1000,2000]) await fixture.buy({id:"booster_s1_damage",quantity});
  assert.equal(fixture.events.length,5);
  assert.ok(fixture.events.every(e=>e.event==="shop:error" && /unite/.test(e.payload.message)));
  assert.equal(JSON.stringify(fixture.profiles.get("account:unit-buyer")),before);
});

test("failed storage rolls back a unit purchase and sends only a terminal error", async()=>{
  const fixture=setup(999, ()=>Promise.reject(new Error("storage unavailable")));
  const before=JSON.stringify(fixture.profiles.get("account:unit-buyer"));
  await fixture.buy({id:"booster_s1_damage",quantity:1});
  assert.deepEqual(fixture.events.map(e=>e.event), ["shop:error"]);
  assert.equal(JSON.stringify(fixture.profiles.get("account:unit-buyer")),before);
});
