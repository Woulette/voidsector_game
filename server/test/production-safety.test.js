import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeConfig } from "../src/config.js";
import { buildHealthStatus } from "../src/monitoring/health.js";

test("production requires PostgreSQL and explicit client origins", ()=>{
  assert.throws(
    ()=>createRuntimeConfig({NODE_ENV:"production", CLIENT_ORIGIN:"*"}),
    /CLIENT_ORIGIN cannot be '\*'.*DATABASE_URL is required/s
  );
});

test("production accepts one or several valid client origins", ()=>{
  const single = createRuntimeConfig({
    NODE_ENV:"production",
    PORT:"4100",
    CLIENT_ORIGIN:"https://game.example.com",
    DATABASE_URL:"postgres://example"
  });
  assert.equal(single.port, 4100);
  assert.equal(single.clientOrigin, "https://game.example.com");
  assert.equal(single.databaseEnabled, true);

  const multiple = createRuntimeConfig({
    NODE_ENV:"production",
    CLIENT_ORIGIN:"https://game.example.com, https://admin.example.com",
    DATABASE_URL:"postgres://example"
  });
  assert.deepEqual(multiple.clientOrigin, [
    "https://game.example.com",
    "https://admin.example.com"
  ]);
});

test("runtime config rejects invalid ports and origins", ()=>{
  assert.throws(
    ()=>createRuntimeConfig({PORT:"70000", CLIENT_ORIGIN:"https://example.com/game"}),
    /PORT must be an integer.*CLIENT_ORIGIN must contain valid/s
  );
});

test("load testing requires a strong secret and stays disabled in production", ()=>{
  assert.throws(
    ()=>createRuntimeConfig({LOAD_TEST_ENABLED:"true", LOAD_TEST_SECRET:"short"}),
    /LOAD_TEST_SECRET/
  );
  assert.throws(
    ()=>createRuntimeConfig({
      NODE_ENV:"production",
      CLIENT_ORIGIN:"https://game.example.com",
      DATABASE_URL:"postgres://example",
      LOAD_TEST_ENABLED:"true",
      LOAD_TEST_SECRET:"this-is-a-long-load-test-secret"
    }),
    /LOAD_TEST_ENABLED cannot be true in production/
  );
  const local = createRuntimeConfig({
    LOAD_TEST_ENABLED:"true",
    LOAD_TEST_SECRET:"this-is-a-long-load-test-secret"
  });
  assert.equal(local.loadTest.enabled, true);
});

test("health returns 503 when the configured database is unavailable", async ()=>{
  const players = new Map([
    ["socket-a", {accountId:"account-a", connected:true, clientMode:"game"}],
    ["socket-b", {accountId:"account-a", connected:true, clientMode:"menu"}],
    ["socket-c", {accountId:"account-b", connected:false, clientMode:"game"}]
  ]);
  const health = await buildHealthStatus({
    players,
    databaseEnabled:true,
    checkDatabase:async ()=>{ throw new Error("database offline"); },
    uptimeSeconds:()=>42,
    now:()=>123
  });

  assert.equal(health.statusCode, 503);
  assert.deepEqual(health.body, {
    ok:false,
    service:"voidsector-realtime",
    storage:"postgres",
    readiness:{
      database:{
        configured:true,
        ok:false,
        latencyMs:null
      }
    },
    uptimeSeconds:42,
    players:{
      sockets:3,
      online:1,
      game:1
    },
    at:123
  });
});

test("health verifies PostgreSQL and reports its latency", async ()=>{
  const health = await buildHealthStatus({
    players:new Map(),
    databaseEnabled:true,
    checkDatabase:async ()=>({ok:true, latencyMs:7}),
    uptimeSeconds:()=>1,
    now:()=>2
  });

  assert.equal(health.statusCode, 200);
  assert.equal(health.body.ok, true);
  assert.deepEqual(health.body.readiness.database, {
    configured:true,
    ok:true,
    latencyMs:7
  });
});
