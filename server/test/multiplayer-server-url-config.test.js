import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_MULTIPLAYER_SERVER_URL,
  getServerUrlFromSearch,
  isLocalServerUrl,
  normalizeServerUrl,
  resolveInitialServerUrl
} from "../../src/multiplayer/serverUrlConfig.js";

const clientSource = readFileSync(new URL("../../src/multiplayer/client.js", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("server URL config falls back to localhost for local development", ()=>{
  assert.equal(resolveInitialServerUrl(), DEFAULT_MULTIPLAYER_SERVER_URL);
});

test("deployment config beats stale local storage", ()=>{
  assert.equal(resolveInitialServerUrl({
    configuredUrl:"https://api.voidsector.example",
    storedUrl:"http://localhost:3001"
  }), "https://api.voidsector.example");
});

test("query string serverUrl beats deployment config for controlled tests", ()=>{
  assert.equal(resolveInitialServerUrl({
    locationSearch:"?serverUrl=http%3A%2F%2F203.0.113.10%3A3001",
    configuredUrl:"https://api.voidsector.example"
  }), "http://203.0.113.10:3001");
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
  assert.match(clientSource, /configuredUrl:readConfiguredServerUrl\(\),\s*storedUrl:readStoredServerUrl\(\)/);
  assert.match(clientSource, /readPublicOriginServerUrl\(\) \? "" : stored/);
  assert.match(clientSource, /window\.__VOIDSECTOR_CONFIG__\?\.serverUrl/);
});
