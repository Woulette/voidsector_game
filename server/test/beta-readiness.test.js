import assert from "node:assert/strict";
import test from "node:test";
import {
  checkBetaReadiness,
  extractClientServerUrlCandidates,
  parseReadinessArgs,
  validateClientServerUrlConfig,
  validateHealthPayload
} from "../tools/check-beta-readiness.js";

test("beta readiness args use production-safe defaults and overrides", ()=>{
  const defaults = parseReadinessArgs([], {});
  assert.equal(defaults.url, "http://127.0.0.1:3001/health");
  assert.equal(defaults.expectedStorage, "postgres");
  assert.equal(defaults.expectedMaxGamePlayers, 0);
  assert.equal(defaults.clientIndexPath, "");
  assert.equal(defaults.expectedClientServerUrl, "");
  assert.equal(defaults.allowLocalClientServerUrl, false);
  assert.equal(defaults.retries, 10);
  assert.equal(defaults.delayMs, 1000);

  const custom = parseReadinessArgs([
    "--url",
    "http://localhost:4100/health",
    "--expected-storage=json",
    "--expected-max-game-players=50",
    "--client-index=../index.html",
    "--expected-client-server-url",
    "https://api.voidsector.example",
    "--allow-local-client-server-url",
    "--retries",
    "3",
    "--delay-ms=5"
  ], {});
  assert.equal(custom.url, "http://localhost:4100/health");
  assert.equal(custom.expectedStorage, "json");
  assert.equal(custom.expectedMaxGamePlayers, 50);
  assert.equal(custom.clientIndexPath, "../index.html");
  assert.equal(custom.expectedClientServerUrl, "https://api.voidsector.example");
  assert.equal(custom.allowLocalClientServerUrl, true);
  assert.equal(custom.retries, 3);
  assert.equal(custom.delayMs, 5);
});

test("beta readiness validates public client server URL config", ()=>{
  const html = `
    <meta name="voidsector-server-url" content="https://api.voidsector.example/" />
    <script>window.__VOIDSECTOR_CONFIG__ = {serverUrl:"https://backup.example"};</script>
  `;
  assert.deepEqual(extractClientServerUrlCandidates(html), [
    "https://api.voidsector.example/",
    "https://backup.example"
  ]);
  assert.deepEqual(validateClientServerUrlConfig(html, {
    expectedClientServerUrl:"https://api.voidsector.example"
  }), []);
  assert.deepEqual(validateClientServerUrlConfig(`<meta name="voidsector-server-url" content="">`), [
    "client server URL is missing in index.html"
  ]);
  assert.deepEqual(validateClientServerUrlConfig(`<meta name="voidsector-server-url" content="http://localhost:3001">`), [
    "client server URL points to local development (http://localhost:3001)"
  ]);
  assert.deepEqual(validateClientServerUrlConfig(html, {
    expectedClientServerUrl:"https://other.example"
  }), [
    'client server URL is "https://api.voidsector.example", expected "https://other.example"'
  ]);
});

test("beta readiness accepts only healthy PostgreSQL storage for beta", ()=>{
  assert.deepEqual(validateHealthPayload({
    ok:true,
    storage:"postgres",
    limits:{
      maxConcurrentGamePlayers:50
    },
    readiness:{
      database:{
        configured:true,
        ok:true,
        latencyMs:4
      }
    }
  }, {expectedMaxGamePlayers:50}), []);

  assert.deepEqual(validateHealthPayload({
    ok:true,
    storage:"json",
    limits:{
      maxConcurrentGamePlayers:0
    },
    readiness:{
      database:{
        configured:false,
        ok:true,
        latencyMs:null
      }
    }
  }), [
    'storage is "json", expected "postgres"',
    "database is not configured"
  ]);

  assert.deepEqual(validateHealthPayload({
    ok:false,
    storage:"postgres",
    limits:{
      maxConcurrentGamePlayers:10
    },
    readiness:{
      database:{
        configured:true,
        ok:false,
        latencyMs:null
      }
    }
  }), [
    "health ok is not true",
    "database check is not ok"
  ]);

  assert.deepEqual(validateHealthPayload({
    ok:true,
    storage:"postgres",
    limits:{
      maxConcurrentGamePlayers:0
    },
    readiness:{
      database:{
        configured:true,
        ok:true
      }
    }
  }, {expectedMaxGamePlayers:50}), [
    "maxConcurrentGamePlayers is 0, expected 50"
  ]);
});

test("beta readiness retries health until PostgreSQL is ready", async ()=>{
  const logs = [];
  let calls = 0;
  const result = await checkBetaReadiness({
    url:"http://127.0.0.1:3001/health",
    retries:2,
    delayMs:0,
    logger:{
      log:message=>logs.push(message),
      error:message=>logs.push(message)
    },
    fetchFn:async ()=>{
      calls += 1;
      if(calls === 1) return {ok:false, status:503, json:async()=>({})};
      return {
        ok:true,
        status:200,
        json:async()=>({
          ok:true,
          storage:"postgres",
          limits:{
            maxConcurrentGamePlayers:50
          },
          readiness:{
            database:{
              configured:true,
              ok:true
            }
          }
        })
      };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.attempt, 2);
  assert.equal(calls, 2);
  assert.equal(logs.some(message=>message.includes("Beta readiness OK")), true);
});

test("beta readiness fails before health when the public client URL is missing", async ()=>{
  const logs = [];
  let calls = 0;
  const result = await checkBetaReadiness({
    clientIndexPath:"../index.html",
    expectedClientServerUrl:"https://api.voidsector.example",
    logger:{
      log:message=>logs.push(message),
      error:message=>logs.push(message)
    },
    readFileFn:async ()=>`<meta name="voidsector-server-url" content="">`,
    fetchFn:async ()=>{
      calls += 1;
      return {ok:true, json:async()=>({ok:true})};
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.attempts, 0);
  assert.equal(calls, 0);
  assert.equal(logs.some(message=>message.includes("client config")), true);
});

test("beta readiness fails closed when storage remains JSON", async ()=>{
  const logs = [];
  const result = await checkBetaReadiness({
    url:"http://127.0.0.1:3001/health",
    retries:1,
    delayMs:0,
    logger:{
      log:message=>logs.push(message),
      error:message=>logs.push(message)
    },
    fetchFn:async ()=>({
      ok:true,
      status:200,
      json:async()=>({
        ok:true,
        storage:"json",
        readiness:{
          database:{
            configured:false,
            ok:true
          }
        }
      })
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.message.includes('storage is "json", expected "postgres"'), true);
  assert.equal(logs.some(message=>message.includes("Beta readiness FAILED")), true);
});
