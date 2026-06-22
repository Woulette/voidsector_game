import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { WORLD_SESSION_SAVE_INTERVAL_MS, createProfileWorldSession } from "../src/players/profileWorldSession.js";
import { addPlayerBoosterUnits } from "../../src/shared/firmBoosters.js";

function worldState(){
  return {
    mapId:"0",
    x:0,
    y:0,
    hp:5000,
    maxHp:5000,
    shield:0,
    maxShield:0,
    shipId:"orion"
  };
}

test("world session persistence counts playtime from server time only", ()=>{
  const profile = createDefaultProfile();
  const profiles = new Map([["account:1", profile]]);
  const player = {
    id:"socket-1",
    accountId:1,
    clientMode:"game",
    connected:true,
    lastPlaytimeAccountedAt:1000
  };
  const manager = createProfileWorldSession({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:1", profile:profiles.get("account:1")})
  });

  const next = manager.saveWorldSession({player, state:worldState(), force:true, now:6000});

  assert.equal(next.player.totalPlaySeconds, 5);
  assert.equal(profiles.get("account:1").player.totalPlaySeconds, 5);
});

test("world session persistence does not count disconnected time", ()=>{
  const profile = createDefaultProfile();
  const profiles = new Map([["account:2", profile]]);
  const player = {
    id:"socket-2",
    accountId:2,
    clientMode:"game",
    connected:false,
    lastPlaytimeAccountedAt:1000
  };
  const manager = createProfileWorldSession({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:2", profile:profiles.get("account:2")})
  });

  const next = manager.saveWorldSession({player, state:worldState(), force:true, now:6000});

  assert.equal(next.player.totalPlaySeconds, 0);
});

test("S1 booster time decreases only for the connected game interval", ()=>{
  const profile = createDefaultProfile();
  profile.boosters = addPlayerBoosterUnits(profile.boosters, {series:"s1", type:"damage", quantity:1});
  const profiles = new Map([["account:boost", profile]]);
  const player = {
    id:"socket-boost",
    accountId:"boost",
    clientMode:"game",
    connected:false,
    disconnectedAt:4_000,
    lastPlaytimeAccountedAt:1_000
  };
  const manager = createProfileWorldSession({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:boost", profile:profiles.get("account:boost")})
  });

  const next = manager.saveWorldSession({player, state:worldState(), force:true, now:9_000});

  assert.equal(next.player.totalPlaySeconds, 3);
  assert.equal(next.boosters.s1.damage.remainingMs, 5 * 60 * 60 * 1000 - 3_000);
});

test("world session position saves are throttled to fifteen seconds unless forced", ()=>{
  const profile = createDefaultProfile();
  const profiles = new Map([["account:3", profile]]);
  let persisted = 0;
  const player = {
    id:"socket-3",
    accountId:3,
    clientMode:"game",
    connected:true
  };
  const manager = createProfileWorldSession({
    profiles,
    persist(){ persisted += 1; },
    getExistingProfile:()=>({key:"account:3", profile:profiles.get("account:3")})
  });

  const first = manager.saveWorldSession({player, state:{...worldState(), x:10}, now:1000});
  const skipped = manager.saveWorldSession({
    player,
    state:{...worldState(), x:20},
    now:1000 + WORLD_SESSION_SAVE_INTERVAL_MS - 1
  });
  const forced = manager.saveWorldSession({
    player,
    state:{...worldState(), x:30},
    force:true,
    now:1000 + WORLD_SESSION_SAVE_INTERVAL_MS
  });

  assert.ok(first);
  assert.equal(skipped, null);
  assert.ok(forced);
  assert.equal(persisted, 2);
  assert.equal(profiles.get("account:3").worldSession.x, 30);
});
