import test from "node:test";
import assert from "node:assert/strict";
import { createRuntimeMetrics } from "../src/monitoring/runtimeMetrics.js";
import { buildHealthStatus } from "../src/monitoring/health.js";

test("runtime metrics expose tick percentiles and top socket signals without player data", ()=>{
  const metrics = createRuntimeMetrics({now:()=>1234});
  for(const durationMs of [1, 2, 3, 4, 20]){
    metrics.recordTick({durationMs, lagMs:Math.max(0, durationMs - 2)});
  }
  metrics.recordSocketEvent("player:state");
  metrics.recordSocketEvent("player:state");
  metrics.recordSocketEvent("profile:save");
  metrics.recordRateLimit("profile:save", "socket");
  metrics.recordCombatResult("hit");
  metrics.recordCombatResult("miss");
  metrics.recordCombatResult("rejected", "OUT_OF_RANGE");
  metrics.recordCombatResult("rejected", "OUT_OF_RANGE");

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.windowStartedAt, 1234);
  assert.equal(snapshot.tick.samples, 5);
  assert.equal(snapshot.tick.p95Ms, 20);
  assert.deepEqual(snapshot.socketEvents[0], {eventName:"player:state", count:2});
  assert.deepEqual(snapshot.rateLimits[0], {eventName:"socket:profile:save", count:1});
  assert.deepEqual(snapshot.combatResults[0], {eventName:"rejected:OUT_OF_RANGE", count:2});
  assert.equal(snapshot.combatResults.some(entry=>entry.eventName === "hit" && entry.count === 1), true);
  assert.equal(snapshot.combatResults.some(entry=>entry.eventName === "miss" && entry.count === 1), true);
});

test("health includes runtime metrics only when a provider is configured", async ()=>{
  const health = await buildHealthStatus({
    players:new Map(),
    databaseEnabled:true,
    checkDatabase:async()=>({ok:true, latencyMs:2}),
    getRuntimeMetrics:()=>({tick:{p95Ms:4}})
  });
  assert.deepEqual(health.body.runtime, {tick:{p95Ms:4}});
});
