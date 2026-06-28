import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const clientSource = readFileSync(new URL("../../src/multiplayer/client.js", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../../src/app.js", import.meta.url), "utf8");
const authGateSource = readFileSync(new URL("../../src/app/authGate.js", import.meta.url), "utf8");
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

test("client prefers the shared Absyrion cookie and ignores stale local auth on Absyrion domains", ()=>{
  assert.match(
    clientSource,
    /const cookieToken = getCookieValue\(ABSYRION_AUTH_TOKEN_COOKIE\)/
  );
  assert.match(
    clientSource,
    /if\(isAbsyrionHost\(\)\) return ""/
  );
});

test("game tabs reuse the stored Absyrion session while the launcher waits for the login action", ()=>{
  assert.match(appSource, /clientMode:appMode,[\s\S]*autoConnectAuth:appMode === "game"/);
  assert.match(clientSource, /if\(autoConnectAuth && multiplayer\.auth\.token\)/);
});

test("game tabs keep the sector loading screen while a saved Absyrion session resolves", ()=>{
  assert.match(authGateSource, /const resolvingStoredGameSession = appMode === "game"[\s\S]*hasStoredSession[\s\S]*!ready[\s\S]*!multiplayer\?\.auth\?\.error[\s\S]*Boolean\(multiplayer\?\.auth\?\.account && !multiplayer\?\.auth\?\.profileReady\)/);
  assert.match(authGateSource, /if\(resolvingStoredGameSession\)\{[\s\S]*document\.body\.classList\.add\("app-booting"\)[\s\S]*root\.classList\.add\("hidden"\)/);
});
