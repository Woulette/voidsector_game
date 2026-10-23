import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_MULTIPLAYER_SERVER_URL,
  getServerUrlFromSearch,
  isLocalServerUrl,
  normalizeServerUrl,
  resolveConnectionServerUrl,
  resolveInitialServerUrl
} from "../../src/multiplayer/serverUrlConfig.js";

const clientSource = readFileSync(new URL("../../src/multiplayer/client.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const clientImporterSources = [
  "../../src/app.js",
  "../../src/ui/render.js",
  "../../src/ui/adminPanel.js",
  "../../src/ui/renderFirm.js",
  "../../src/ui/renderLeaderboard.js",
  "../../src/game/combatOrchestrator.js",
  "../../src/game/ui/combatPanels.js",
  "../../src/multiplayer/render.js"
].map(path=>readFileSync(new URL(path, import.meta.url), "utf8"));

test("server URL config falls back to localhost for local development", ()=>{
  assert.equal(resolveInitialServerUrl(), DEFAULT_MULTIPLAYER_SERVER_URL);
});

test("deployment config beats stale local storage", ()=>{
  assert.equal(resolveInitialServerUrl({
    configuredUrl:"https://api.voidsector.example",
    storedUrl:"http://localhost:3001"
  }), "https://api.voidsector.example");
});

test("local query string serverUrl accepts only a local backend", ()=>{
  assert.equal(resolveInitialServerUrl({
    locationSearch:"?serverUrl=http%3A%2F%2F203.0.113.10%3A3001",
    pageOrigin:"http://127.0.0.1:8765",
    configuredUrl:"https://api.voidsector.example"
  }), DEFAULT_MULTIPLAYER_SERVER_URL);
  assert.equal(resolveInitialServerUrl({
    locationSearch:"?serverUrl=http%3A%2F%2Flocalhost%3A3002",
    pageOrigin:"http://127.0.0.1:8765",
    configuredUrl:"https://api.voidsector.example"
  }), "http://localhost:3002");
});

test("public pages ignore server URL query overrides", ()=>{
  assert.equal(resolveInitialServerUrl({
    locationSearch:"?serverUrl=https%3A%2F%2Fattacker.example",
    pageOrigin:"https://avosoma.absyrion.com",
    configuredUrl:"https://avosoma.absyrion.com"
  }), "https://avosoma.absyrion.com");
});

test("public connection attempts cannot replace the trusted server", ()=>{
  assert.equal(resolveConnectionServerUrl({
    requestedUrl:"https://attacker.example",
    currentUrl:"https://stale.example",
    pageOrigin:"https://avosoma.absyrion.com",
    configuredUrl:"https://avosoma.absyrion.com"
  }), "https://avosoma.absyrion.com");
});

test("local connection attempts accept only loopback servers", ()=>{
  assert.equal(resolveConnectionServerUrl({
    requestedUrl:"http://localhost:3002",
    currentUrl:"http://localhost:3001",
    pageOrigin:"http://127.0.0.1:8765",
    configuredUrl:"https://avosoma.absyrion.com"
  }), "http://localhost:3002");
  assert.equal(resolveConnectionServerUrl({
    requestedUrl:"https://attacker.example",
    currentUrl:"http://localhost:3001",
    pageOrigin:"http://127.0.0.1:8765",
    configuredUrl:"https://avosoma.absyrion.com"
  }), "http://localhost:3001");
});

test("local pages ignore production configuration and use the local backend", ()=>{
  assert.equal(resolveInitialServerUrl({
    pageOrigin:"http://127.0.0.1:8765",
    configuredUrl:"https://avosoma.absyrion.com",
    storedUrl:"https://avosoma.absyrion.com"
  }), DEFAULT_MULTIPLAYER_SERVER_URL);
});

test("stored URL is used when no deployment config exists", ()=>{
  assert.equal(resolveInitialServerUrl({
    storedUrl:"203.0.113.10:3001"
  }), "http://203.0.113.10:3001");
});

test("local server URLs are detected before using stale browser storage", ()=>{
  assert.equal(isLocalServerUrl("http://localhost:3001"), true);
  assert.equal(isLocalServerUrl("http://127.0.0.1:3001"), true);
  assert.equal(isLocalServerUrl("https://avosoma.absyrion.com"), false);
});

test("server URL normalization strips paths and rejects unsafe protocols", ()=>{
  assert.equal(normalizeServerUrl("https://api.voidsector.example/socket.io/"), "https://api.voidsector.example");
  assert.equal(normalizeServerUrl("ftp://api.voidsector.example"), "");
  assert.equal(normalizeServerUrl("javascript:alert(1)"), "");
});

test("server URL can be read from a URL search string", ()=>{
  assert.equal(getServerUrlFromSearch("?mode=game&serverUrl=https%3A%2F%2Fapi.voidsector.example"), "https://api.voidsector.example");
  assert.equal(getServerUrlFromSearch("?mode=game"), "");
});

test("client is wired to deployment server URL config before local storage", ()=>{
  assert.match(indexSource, /<meta name="voidsector-server-url" content="https:\/\/avosoma\.absyrion\.com"/);
  assert.match(clientSource, /pageOrigin:window\.location\?\.origin \|\| "",\s*configuredUrl:readConfiguredServerUrl\(\),\s*storedUrl:readStoredServerUrl\(\)/);
  assert.match(clientSource, /readPublicOriginServerUrl\(\) \? "" : stored/);
  assert.match(clientSource, /window\.__VOIDSECTOR_CONFIG__\?\.serverUrl/);
  assert.match(clientSource, /resolveConnectionServerUrl\(\{\s*requestedUrl:serverUrl,/);
  assert.match(clientSource, /serverUrlConfig\.js\?v=20260726-kharon1/);
});

test("every multiplayer client importer uses an approved hardening cache key", ()=>{
  const approvedCacheKeys = new Set([
    "20261018-map-transfer1"
  ]);
  for(const source of clientImporterSources){
    const imports = [...source.matchAll(/(?:\.\.\/|\.\/)multiplayer\/client\.js\?v=([^"']+)|\.\/client\.js\?v=([^"']+)/g)];
    assert.ok(imports.length > 0);
    for(const match of imports){
      assert.equal(approvedCacheKeys.has(match[1] || match[2]), true);
    }
  }
});
