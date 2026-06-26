import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(new URL("../../src/multiplayer/client.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../../src/app.js", import.meta.url), "utf8");
const serverEventControllerSource = readFileSync(new URL("../../src/app/serverEventController.js", import.meta.url), "utf8");
const recoverySource = readFileSync(new URL("../../src/app/gameConnectionRecovery.js", import.meta.url), "utf8");

test("client clears stored auth and disconnects when an admin ban is received", ()=>{
  assert.match(clientSource, /socket\.on\("admin:banned"/);
  assert.match(clientSource, /clearStoredAuthToken\(\);[\s\S]*emitChange\("auth:banned"/);
  assert.match(clientSource, /disconnectMultiplayer\("account-banned"\)/);
  assert.match(appSource, /reason === "auth:banned"/);
  assert.match(serverEventControllerSource, /reason === "auth:banned"/);
  assert.match(recoverySource, /reason === "auth:banned"/);
});

test("client updates account moderation fields without requiring a full auth refresh", ()=>{
  assert.match(clientSource, /socket\.on\("account:moderation"/);
  assert.match(clientSource, /mutedUntil:Math\.max\(0, Number\(payload\?\.mutedUntil \|\| 0\)\)/);
  assert.match(clientSource, /emitChange\("auth:moderation"/);
});

test("client surfaces beta capacity refusals to the player", ()=>{
  assert.match(clientSource, /socket\.on\("server:full"/);
  assert.match(clientSource, /auth\.setError\(message\)/);
  assert.match(clientSource, /toast\(message\)/);
  assert.match(clientSource, /emitChange\("server:full"/);
});
