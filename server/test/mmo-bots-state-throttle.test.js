import test from "node:test";
import assert from "node:assert/strict";
import { shouldSendBotStateSnapshot } from "../tools/mmo-bots.js";

const baseState = {
  x:100,
  y:200,
  angle:0,
  vx:0,
  vy:0,
  enginePower:0,
  mapId:"1",
  shipId:"razorion",
  attackTargetId:"",
  attackAmmoId:"",
  attackWeaponClass:"",
  repairBotActive:false
};

test("mmo bots skip unchanged idle snapshots in realistic traffic mode", ()=>{
  const shouldSend = shouldSendBotStateSnapshot({
    previous:baseState,
    next:{...baseState},
    lastSentAt:1000,
    now:2000,
    mode:"realistic",
    idleMs:5000
  });

  assert.equal(shouldSend, false);
});

test("mmo bots still refresh idle state after the idle interval", ()=>{
  const shouldSend = shouldSendBotStateSnapshot({
    previous:baseState,
    next:{...baseState},
    lastSentAt:1000,
    now:6500,
    mode:"realistic",
    idleMs:5000
  });

  assert.equal(shouldSend, true);
});

test("mmo bots send moving snapshots only after useful movement", ()=>{
  const smallMove = shouldSendBotStateSnapshot({
    previous:baseState,
    next:{...baseState, x:110, vx:240, enginePower:1},
    lastSentAt:1000,
    now:1400,
    mode:"realistic",
    movingMs:300,
    positionEpsilon:24
  });
  const usefulMove = shouldSendBotStateSnapshot({
    previous:baseState,
    next:{...baseState, x:130, vx:240, enginePower:1},
    lastSentAt:1000,
    now:1400,
    mode:"realistic",
    movingMs:300,
    positionEpsilon:24
  });

  assert.equal(smallMove, false);
  assert.equal(usefulMove, true);
});

test("mmo bots send combat and stress snapshots immediately", ()=>{
  const combatChange = shouldSendBotStateSnapshot({
    previous:baseState,
    next:{...baseState, attackTargetId:"enemy-1"},
    lastSentAt:1000,
    now:1100,
    mode:"realistic"
  });
  const stressMode = shouldSendBotStateSnapshot({
    previous:baseState,
    next:{...baseState},
    lastSentAt:1000,
    now:1100,
    mode:"stress"
  });

  assert.equal(combatChange, true);
  assert.equal(stressMode, true);
});
