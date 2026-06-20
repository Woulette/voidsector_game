import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { sanitizePilotName } from "../src/players/profileIdentity.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";

test("pilot names are normalized to display-only text", ()=>{
  const name = sanitizePilotName(`<img src=x onerror="alert(1)">Étoile`);

  assert.equal(/[<>&"'`]/.test(name), false);
  assert.equal(name.length <= 24, true);
  assert.match(name, /Étoile|img/);
});

test("loaded profiles cannot preserve stored HTML in pilot names", ()=>{
  const profile = sanitizeProfile({
    player:{name:`<svg onload='alert(1)'>Nova`}
  });

  assert.equal(/[<>&"'`]/.test(profile.player.name), false);
  assert.equal(profile.player.name.length <= 24, true);
});

test("launcher profile and leaderboard escape pilot names before innerHTML rendering", ()=>{
  const renderSource = fs.readFileSync(new URL("../../src/ui/render.js", import.meta.url), "utf8");
  const leaderboardSource = fs.readFileSync(new URL("../../src/ui/renderLeaderboard.js", import.meta.url), "utf8");

  assert.match(renderSource, /<h3>\$\{escapeHtml\(player\.name\)\}<\/h3>/);
  assert.match(leaderboardSource, /<small>\$\{escapeHtml\(self\.pilot \|\| store\.state\.player\.name\)\}<\/small>/);
});
