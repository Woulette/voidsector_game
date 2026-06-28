import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlayerVisualPosition,
  queuePlayerVisualCorrection,
  tickPlayerVisualCorrection,
  updateCamera
} from "../../src/game/systems/playerMovement.js";

test("player visual correction preserves the current rendered position before smoothing back to server truth", ()=>{
  const player = {x:100, y:50};
  const smoothedPx = queuePlayerVisualCorrection(player, {nextX:112, nextY:50});

  player.x = 112;
  player.y = 50;

  assert.equal(smoothedPx, 12);
  assert.deepEqual(getPlayerVisualPosition(player), {x:100, y:50});

  const remainingPx = tickPlayerVisualCorrection(player, 1 / 60);
  const visual = getPlayerVisualPosition(player);

  assert.ok(remainingPx > 0);
  assert.ok(visual.x > 100);
  assert.ok(visual.x < 112);
  assert.equal(visual.y, 50);
});

test("camera follows the smoothed visual position instead of snapping to corrected logic coordinates", ()=>{
  const camera = {x:0, y:0, zoom:1};
  const canvas = {__viewWidth:100, __viewHeight:100};
  const player = {x:112, y:50, visualCorrectionOffsetX:-12, visualCorrectionOffsetY:0};

  updateCamera({camera, player, canvas, follow:1});

  assert.equal(camera.x, 50);
  assert.equal(camera.y, 0);
});

