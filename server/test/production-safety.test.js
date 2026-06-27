import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeConfig } from "../src/config.js";
import { buildHealthStatus, buildSafeHealthStatus } from "../src/monitoring/health.js";

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
    DATABASE_URL:"postgresql://voidsector:secret@localhost:5432/voidsector"
  });
  assert.equal(single.port, 4100);
  assert.equal(single.clientOrigin, "https://game.example.com");
  assert.equal(single.databaseEnabled, true);
  assert.equal(single.maxConcurrentGamePlayers, 50);

  const multiple = createRuntimeConfig({
    NODE_ENV:"production",
    CLIENT_ORIGIN:"https://game.example.com, https://admin.example.com",
    DATABASE_URL:"postgresql://voidsector:secret@localhost:5432/voidsector"
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

test("runtime config rejects invalid database URLs", ()=>{
  assert.throws(
    ()=>createRuntimeConfig({
      DATABASE_URL:"mysql://voidsector:secret@localhost:3306/voidsector"
    }),
    /DATABASE_URL must be a valid postgres/
  );
  assert.throws(
    ()=>createRuntimeConfig({
      NODE_ENV:"production",
      CLIENT_ORIGIN:"https://game.example.com",
      DATABASE_URL:"postgresql://localhost"
    }),
    /DATABASE_URL must be a valid postgres/
  );
});

test("runtime config accepts a platform auth API base URL", ()=>{
  const config = createRuntimeConfig({
    NODE_ENV:"production",
    CLIENT_ORIGIN:"https://avosoma.absyrion.com",
    DATABASE_URL:"postgresql://voidsector:secret@localhost:5432/voidsector",
    PLATFORM_AUTH_API_URL:"https://api.absyrion.com/"
  });
  assert.equal(config.platformAuthApiUrl, "https://api.absyrion.com");

  assert.throws(
    ()=>createRuntimeConfig({PLATFORM_AUTH_API_URL:"https://api.absyrion.com/session?token=x"}),
    /PLATFORM_AUTH_API_URL/
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
      DATABASE_URL:"postgresql://voidsector:secret@localhost:5432/voidsector",
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
  assert.equal(local.maxConcurrentGamePlayers, 0);
});

test("runtime config supports an explicit beta player cap", ()=>{
  const production = createRuntimeConfig({
    NODE_ENV:"production",
    CLIENT_ORIGIN:"https://game.example.com",
    DATABASE_URL:"postgresql://voidsector:secret@localhost:5432/voidsector",
    MAX_CONCURRENT_GAME_PLAYERS:"50"
  });
  assert.equal(production.maxConcurrentGamePlayers, 50);

  const local = createRuntimeConfig({
    MAX_CONCURRENT_GAME_PLAYERS:"75"
  });
  assert.equal(local.maxConcurrentGamePlayers, 75);

  assert.throws(
    ()=>createRuntimeConfig({MAX_CONCURRENT_GAME_PLAYERS:"fifty"}),
    /MAX_CONCURRENT_GAME_PLAYERS/
  );
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
    limits:{
      maxConcurrentGamePlayers:0
    },
    at:123
  });
});

test("health verifies PostgreSQL and reports its latency", async ()=>{
  const health = await buildHealthStatus({
    players:new Map(),
    databaseEnabled:true,
    checkDatabase:async ()=>({ok:true, latencyMs:7}),
    maxConcurrentGamePlayers:50,
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
  assert.equal(health.body.limits.maxConcurrentGamePlayers, 50);
});

test("safe health wrapper hides unexpected internals and records the server error", async ()=>{
  const logs = [];
  const recorded = [];
  const health = await buildSafeHealthStatus({
    players:new Map([["socket-a", {accountId:"account-a", connected:true, clientMode:"game"}]]),
    databaseEnabled:true,
    checkDatabase:async ()=>({ok:true, latencyMs:1}),
    maxConcurrentGamePlayers:50,
    now:()=>123,
    buildHealthStatusFn:async ()=>{
      throw new Error("secret database internals");
    },
    logger:{
      error:(message, payload)=>logs.push({message, payload}),
      warn:(message, payload)=>logs.push({message, payload})
    },
    onError:error=>recorded.push(error)
  });

  assert.equal(health.statusCode, 503);
  assert.equal(health.body.ok, false);
  assert.equal(health.body.storage, "postgres");
  assert.equal(health.body.error, "healthcheck_failed");
  assert.equal(health.body.limits.maxConcurrentGamePlayers, 50);
  assert.equal(JSON.stringify(health.body).includes("secret database internals"), false);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].message, "[health] check failed");
  assert.equal(logs[0].payload.source, "health");
  assert.equal(logs[0].payload.eventName, "GET /health");
  assert.equal(logs[0].payload.error.includes("secret database internals"), true);
  assert.deepEqual(recorded, [logs[0].payload]);
});
