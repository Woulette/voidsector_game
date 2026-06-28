import assert from "node:assert/strict";
import test from "node:test";
import { isWorldPointVisible } from "../../src/game/render/entities.js";

test("entity render culling keeps on-screen and near-margin objects visible", ()=>{
  const camera = {x:100, y:200};
  const size = {width:800, height:600};

  assert.equal(isWorldPointVisible({x:500, y:500, camera, ...size, margin:100}), true);
  assert.equal(isWorldPointVisible({x:20, y:500, camera, ...size, margin:100}), true);
});

test("entity render culling rejects far off-screen objects", ()=>{
  const camera = {x:100, y:200};
  const size = {width:800, height:600};

  assert.equal(isWorldPointVisible({x:-500, y:500, camera, ...size, margin:100}), false);
  assert.equal(isWorldPointVisible({x:500, y:1200, camera, ...size, margin:100}), false);
});

