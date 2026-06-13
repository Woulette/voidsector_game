import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRM_HIT_OWNERSHIP_MS,
  getFirmHitOwner,
  markFirmHitOwner
} from "../src/firms/firmHitOwnership.js";

test("first hitter owns firm attribution and refreshes it for fifteen seconds", ()=>{
  const target = {};
  const alpha = {id:"socket-a", accountId:"a"};
  const beta = {id:"socket-b", accountId:"b"};
  const players = new Map([[alpha.id, alpha], [beta.id, beta]]);

  markFirmHitOwner(target, alpha, 1000);
  markFirmHitOwner(target, beta, 5000);
  assert.equal(getFirmHitOwner(target, players, 5000), alpha);

  markFirmHitOwner(target, alpha, 12000);
  markFirmHitOwner(target, beta, 26000);
  assert.equal(getFirmHitOwner(target, players, 26999), alpha);

  markFirmHitOwner(target, beta, 27000);
  assert.equal(getFirmHitOwner(target, players, 27000), beta);
  assert.equal(getFirmHitOwner(target, players, 27000 + FIRM_HIT_OWNERSHIP_MS), null);
});

test("firm hit ownership survives a socket reconnect", ()=>{
  const target = {};
  const original = {id:"old-socket", accountId:"a"};
  markFirmHitOwner(target, original, 1000);

  const resumed = {id:"new-socket", accountId:"a"};
  const players = new Map([[resumed.id, resumed]]);
  assert.equal(getFirmHitOwner(target, players, 2000), resumed);
});
