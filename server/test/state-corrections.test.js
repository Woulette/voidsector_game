import assert from "node:assert/strict";
import test from "node:test";
import {
  isVitalOnlyStateCorrection,
  shouldEmitPlayerStateCorrection
} from "../src/socket/stateCorrections.js";

test("vital-only state corrections are throttled per player", ()=>{
  const player = {};
  const validation = {
    corrected:true,
    correctionDetails:[
      {field:"hp", client:900, server:850},
      {field:"shield", client:200, server:180}
    ]
  };

  assert.equal(isVitalOnlyStateCorrection(validation), true);
  assert.equal(shouldEmitPlayerStateCorrection({player, validation, now:1000}), true);
  assert.equal(shouldEmitPlayerStateCorrection({player, validation, now:1500}), false);
  assert.equal(shouldEmitPlayerStateCorrection({player, validation, now:2000}), true);
});

test("non-vital state corrections are never throttled", ()=>{
  const player = {};
  const validation = {
    corrected:true,
    correctionDetails:[
      {field:"x", client:4000, server:120}
    ]
  };

  assert.equal(isVitalOnlyStateCorrection(validation), false);
  assert.equal(shouldEmitPlayerStateCorrection({player, validation, now:1000}), true);
  assert.equal(shouldEmitPlayerStateCorrection({player, validation, now:1001}), true);
});
