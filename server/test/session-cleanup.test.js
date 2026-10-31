import test from "node:test";
import assert from "node:assert/strict";
import { createSessionCleanupScheduler } from "../src/auth/sessionCleanup.js";

test("expired session cleanup is coalesced and runs periodically", async ()=>{
  let currentTime = 1000;
  const calls = [];
  const scheduler = createSessionCleanupScheduler({
    now:()=>currentTime,
    intervalMs:5000,
    deleteExpired:async at=>calls.push(at)
  });

  assert.equal(await scheduler.cleanup(), true);
  currentTime = 2000;
  assert.equal(await scheduler.cleanup(), false);
  currentTime = 6000;
  assert.equal(await scheduler.cleanup(), true);
  assert.deepEqual(calls, [1000, 6000]);
});

test("concurrent session cleanup requests share one database operation", async ()=>{
  let release;
  let calls = 0;
  const scheduler = createSessionCleanupScheduler({
    deleteExpired:()=>new Promise(resolve=>{
      calls += 1;
      release = resolve;
    })
  });

  const first = scheduler.cleanup();
  const second = scheduler.cleanup();
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  assert.equal(await first, true);
  assert.equal(await second, true);
});
