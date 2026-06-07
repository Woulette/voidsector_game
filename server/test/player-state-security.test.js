import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";

function makePlayer(state = null){
  return {
    id:"player-state-security",
    mapId:String(state?.mapId ?? "0"),
    groupId:null,
    state
  };
}

function baseState(overrides = {}){
  return {
    x:0,
    y:0,
    angle:0,
    hp:1000,
    maxHp:5000,
    shield:0,
    maxShield:0,
    vx:0,
    vy:0,
    enginePower:0,
    engineAngle:0,
    mapId:"0",
    shipId:"orion",
    updatedAt:1000,
    ...overrides
  };
}

test("rejects an impossible same-map teleport", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{...previous, x:4000, updatedAt:1050}
  });

  assert.equal(result.corrected, true);
  assert.match(result.reason, /vitesse/i);
  assert.ok(result.state.x < 500);
});

test("rejects an arbitrary map change away from a portal", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{...previous, mapId:"1", x:0, y:0}
  });

  assert.equal(result.state.mapId, "0");
  assert.match(result.reason, /transition/i);
});

test("rejects spawning directly on an advanced map", ()=>{
  const result = validatePlayerState({
    player:makePlayer(null),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:baseState({mapId:"4", x:1000, y:1000})
  });

  assert.equal(result.state.mapId, "0");
  assert.match(result.reason, /map interdite/i);
});

test("rejects spawning at an arbitrary position on the initial map", ()=>{
  const result = validatePlayerState({
    player:makePlayer(null),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:baseState({x:1000, y:1000})
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.x, -4300);
  assert.equal(result.state.y, 3300);
});

test("initial combat vitals come from the server profile, not the client", ()=>{
  const result = validatePlayerState({
    player:makePlayer(null),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:baseState({hp:999999, maxHp:999999, shield:999999, maxShield:999999})
  });

  assert.equal(result.state.hp, 5000);
  assert.equal(result.state.maxHp, 5000);
  assert.equal(result.state.shield, 0);
  assert.equal(result.state.maxShield, 0);
});

test("accepts a world map transition between portal zones", ()=>{
  const previous = baseState({x:4300, y:-3300});
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:5000,
    payload:{...previous, mapId:"1", x:-4300, y:3300}
  });

  assert.equal(result.state.mapId, "1");
});

test("limits forged healing, shield and ship identity", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:makePlayer(previous),
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{
      ...previous,
      hp:999999,
      maxHp:999999,
      shield:999999,
      maxShield:999999,
      shipId:"helion_titan"
    }
  });

  assert.equal(result.corrected, true);
  assert.equal(result.state.shipId, "orion");
  assert.ok(result.state.hp < 1100);
  assert.ok(result.state.maxHp < 999999);
  assert.equal(result.state.maxShield, 0);
  assert.equal(result.state.shield, 0);
});

test("accepts one equipped repair bot heal tick per second", ()=>{
  const profile = createDefaultProfile();
  const previous = baseState({hp:10000, maxHp:15000});
  const player = makePlayer(previous);
  const first = validatePlayerState({
    player,
    profile,
    groups:new Map(),
    now:2000,
    payload:{...previous, hp:10150, updatedAt:2000}
  });

  assert.equal(first.state.hp, 10150);

  player.state = first.state;
  const repeated = validatePlayerState({
    player,
    profile,
    groups:new Map(),
    now:2050,
    payload:{...first.state, hp:10300, updatedAt:2050}
  });

  assert.ok(repeated.state.hp < 10300);
  assert.equal(repeated.corrected, true);
});

test("initial combat vitals prefer the saved session for the active ship", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "velox";
  profile.ownedShips = ["orion", "velox", "test_runner"];
  profile.worldSession = {mapId:"0", x:0, y:0, hp:900, maxHp:20000, shield:0, maxShield:0, shipId:"test_runner", updatedAt:1000};
  profile.shipWorldSessions = {
    velox:{mapId:"0", x:0, y:0, hp:3000, maxHp:15000, shield:0, maxShield:0, shipId:"velox", updatedAt:1100},
    test_runner:{mapId:"0", x:0, y:0, hp:900, maxHp:20000, shield:0, maxShield:0, shipId:"test_runner", updatedAt:1000}
  };

  const result = validatePlayerState({
    player:{id:"p1", mapId:"0", state:null},
    profile,
    groups:new Map(),
    now:1200,
    payload:baseState({hp:900, maxHp:20000, shipId:"velox", x:0, y:0})
  });

  assert.equal(result.state.shipId, "velox");
  assert.equal(result.state.hp, 3000);
  assert.equal(result.state.maxHp, 15000);
});
