import assert from "node:assert/strict";
import test from "node:test";
import {
  isPointInRickyTriggerZone,
  RICKY_PORTAL_LEVERS,
  RICKY_PORTAL_TRIGGER_ZONES
} from "../../src/data/rickyPortal.js";

test("Deadly beacons are numbered clockwise in the requested activation order", ()=>{
  assert.deepEqual(RICKY_PORTAL_LEVERS.map(lever=>({
    number:lever.number,
    id:lever.id,
    compactX:Math.round(lever.x / 10),
    compactY:Math.round(lever.y / 10)
  })), [
    {number:1, id:"south_west", compactX:-430, compactY:285},
    {number:2, id:"south_east", compactX:430, compactY:285},
    {number:3, id:"north_east", compactX:430, compactY:-300},
    {number:4, id:"north_west", compactX:-430, compactY:-300}
  ]);
});

test("Deadly route trigger zones form wide unavoidable passage barriers", ()=>{
  assert.equal(RICKY_PORTAL_TRIGGER_ZONES.length, 4);
  for(const zone of RICKY_PORTAL_TRIGGER_ZONES){
    assert.equal(isPointInRickyTriggerZone({x:zone.centerX, y:zone.centerY}, zone), true);
  }
  const [southWest, southEast, east, north] = RICKY_PORTAL_TRIGGER_ZONES;
  assert.equal(southWest.maxY - southWest.minY, 2650);
  assert.equal(southEast.maxY - southEast.minY, 2650);
  assert.equal(east.maxY - east.minY, 4400);
  assert.equal(north.maxX - north.minX, 11000);
  assert.equal(north.minY, -4100);
});
