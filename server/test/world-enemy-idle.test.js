import assert from "node:assert/strict";
import test from "node:test";
import { publicEnemy } from "../src/world/spawn.js";

function enemy(overrides = {}){
  return {
    id:"W-0-E1",
    kind:"drone_pirate",
    hp:100,
    maxHp:100,
    moving:false,
    vx:0,
    vy:0,
    ...overrides
  };
}

test("server exposes idle state for a stopped enemy outside combat", ()=>{
  assert.equal(publicEnemy(enemy()).idle, true);
  assert.equal(publicEnemy(enemy({moving:true, vx:100})).idle, false);
  assert.equal(publicEnemy(enemy({lockedPlayerId:"player-1"})).idle, false);
});
