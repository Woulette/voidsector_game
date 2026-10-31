import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import {
  applyProfileTitleSelection,
  STELLAR_SYSTEM_TITLE_ID,
  STELLAR_SYSTEM_TITLE_NAME,
  STELLAR_SYSTEM_TITLE_ORNAMENT_ID
} from "../src/players/profileTitles.js";
import {
  advanceOrnamentHoverProgress,
  isPlayerIdentityHovered,
  STELLAR_SYSTEM_ORNAMENT_ID
} from "../../src/game/render/player.js";

function baseState(overrides = {}){
  return {
    x:0,
    y:0,
    angle:0,
    hp:5000,
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

function validateIdentity(profile, payload = baseState(), playerOverrides = {}){
  return validatePlayerState({
    player:{
      id:"ornament-player",
      mapId:"0",
      groupId:null,
      state:null,
      ...playerOverrides
    },
    profile,
    groups:new Map(),
    now:1050,
    payload
  }).state;
}

test("world pilot identity is derived from the unlocked equipped server profile", ()=>{
  const profile = createDefaultProfile();
  profile.completedPortals.eternal = 1;
  assert.equal(applyProfileTitleSelection(profile, {
    titleId:STELLAR_SYSTEM_TITLE_ID,
    visible:true
  }).ok, true);

  const state = validateIdentity(profile, baseState({
    pilotTitle:"Titre client falsifie",
    pilotOrnamentId:"ornement_client_falsifie"
  }));

  assert.equal(state.pilotTitle, STELLAR_SYSTEM_TITLE_NAME);
  assert.equal(state.pilotOrnamentId, STELLAR_SYSTEM_TITLE_ORNAMENT_ID);
  assert.equal(state.pilotOrnamentId, STELLAR_SYSTEM_ORNAMENT_ID);
});

test("locked, hidden and stale dead-state ornaments cannot be forged by the client", ()=>{
  const lockedProfile = createDefaultProfile();
  const forgedPayload = baseState({
    pilotTitle:STELLAR_SYSTEM_TITLE_NAME,
    pilotOrnamentId:STELLAR_SYSTEM_TITLE_ORNAMENT_ID
  });
  const locked = validateIdentity(lockedProfile, forgedPayload);
  assert.equal(locked.pilotTitle, "");
  assert.equal(locked.pilotOrnamentId, "");

  const hiddenProfile = createDefaultProfile();
  hiddenProfile.completedPortals.eternal = 1;
  assert.equal(applyProfileTitleSelection(hiddenProfile, {
    titleId:STELLAR_SYSTEM_TITLE_ID,
    visible:false
  }).ok, true);
  const hidden = validateIdentity(hiddenProfile, forgedPayload);
  assert.equal(hidden.pilotTitle, "");
  assert.equal(hidden.pilotOrnamentId, "");

  const previous = baseState({
    pilotTitle:STELLAR_SYSTEM_TITLE_NAME,
    pilotOrnamentId:STELLAR_SYSTEM_TITLE_ORNAMENT_ID
  });
  const dead = validateIdentity(lockedProfile, forgedPayload, {
    state:previous,
    deathState:{at:1000}
  });
  assert.equal(dead.pilotTitle, "");
  assert.equal(dead.pilotOrnamentId, "");
});

test("ship and identity hover detection accounts for combat zoom", ()=>{
  const camera = {x:100, y:50, zoom:2};
  const player = {x:200, y:150};
  const ship = {renderWidth:96, renderHeight:96};

  assert.equal(isPlayerIdentityHovered({
    mouse:{x:200, y:200},
    camera,
    player,
    ship
  }), true);
  assert.equal(isPlayerIdentityHovered({
    mouse:{x:200, y:394},
    camera,
    player,
    ship
  }), true);
  assert.equal(isPlayerIdentityHovered({
    mouse:{x:800, y:600},
    camera,
    player,
    ship
  }), false);
});

test("mechanical wings open and close progressively with bounded work", ()=>{
  assert.ok(Math.abs(advanceOrnamentHoverProgress(0, true, 50) - .32) < 1e-9);
  assert.ok(Math.abs(advanceOrnamentHoverProgress(.5, false, 50) - .26) < 1e-9);
  assert.equal(advanceOrnamentHoverProgress(.99, true, 100), 1);
  assert.equal(advanceOrnamentHoverProgress(.01, false, 100), 0);
});

test("local and remote combat renderers receive title, ornament and mouse state", ()=>{
  const sceneSource = fs.readFileSync(new URL("../../src/game/render/combatScene.js", import.meta.url), "utf8");
  const remoteSource = fs.readFileSync(new URL("../../src/multiplayer/render.js", import.meta.url), "utf8");
  const playerSource = fs.readFileSync(new URL("../../src/game/render/player.js", import.meta.url), "utf8");

  assert.match(sceneSource, /pilotTitle:localPilotIdentity\.pilotTitle/);
  assert.match(sceneSource, /pilotOrnamentId:localPilotIdentity\.pilotOrnamentId/);
  assert.match(sceneSource, /drawRemotePlayers\(\{[\s\S]*\bmouse,/);
  assert.match(remoteSource, /pilotTitle:String\(sampledState\.pilotTitle/);
  assert.match(remoteSource, /pilotOrnamentId:String\(sampledState\.pilotOrnamentId/);
  assert.match(remoteSource, /ornamentAnimationKey:`remote-player:/);
  assert.match(playerSource, /drawMechanicalOrnamentWing/);
  assert.match(playerSource, /rgba\(220,20,38,\.62\)/);
});
