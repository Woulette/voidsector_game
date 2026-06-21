import assert from "node:assert/strict";
import test from "node:test";
import { getEntityTargetSelectionRadius } from "../../src/game/render/targetOverlay.js";

test("enemy target selection radius follows the rendered sprite size", ()=>{
  const small = getEntityTargetSelectionRadius({width:55, height:71, radius:28});
  const medium = getEntityTargetSelectionRadius({width:79, height:116, radius:46});
  const boss = getEntityTargetSelectionRadius({width:181, height:182, radius:90});

  assert.equal(small, 47.5);
  assert.equal(medium, 70);
  assert.equal(boss, 103);
  assert.ok(small < medium);
  assert.ok(medium < boss);
});

test("transparent Vorak, Abyssal tracker and orb sprites use their visible artwork bounds", ()=>{
  assert.ok(Math.abs(getEntityTargetSelectionRadius({kind:"raider_astral", width:120, height:120, radius:36}) - 47.4) < .000001);
  assert.ok(Math.abs(getEntityTargetSelectionRadius({kind:"drone_pirate", width:92, height:92, radius:26}) - 35) < .000001);
  assert.ok(Math.abs(getEntityTargetSelectionRadius({kind:"cuirasse_nebulaire", width:106, height:106, radius:46}) - 54.4) < .000001);
  assert.ok(Math.abs(getEntityTargetSelectionRadius({kind:"boss_raider_astral", width:104, height:104, radius:42}) - 55.68) < .000001);
  assert.ok(Math.abs(getEntityTargetSelectionRadius({kind:"shared_orb", width:88, height:88, radius:44}) - 47.2) < .000001);
});
