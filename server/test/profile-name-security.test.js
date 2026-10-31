import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { sanitizePilotName } from "../src/players/profileIdentity.js";
import { sanitizeProfile } from "../src/players/profileSanitize.js";
import { getProfilePresentationModel, renderProfileMarkup } from "../../src/ui/renderProfile.js";
import { store } from "../../src/core/store.js?v=20260726-kharon1";
import { createDefaultProfile } from "../src/players/profileDefaults.js";

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
  const leaderboardSource = fs.readFileSync(new URL("../../src/ui/renderLeaderboard.js", import.meta.url), "utf8");
  const previous = store.state;
  let model;
  try{
    store.state = createDefaultProfile();
    model = getProfilePresentationModel();
  }finally{ store.state = previous; }
  model.identity.name = `<img src=x onerror="alert(1)">`;
  const profileHtml = renderProfileMarkup(model);
  assert.match(profileHtml, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.doesNotMatch(profileHtml, /<img src=x| onerror="alert/);
  assert.match(leaderboardSource, /<small>\$\{escapeHtml\(self\.pilot \|\| store\.state\.player\.name\)\}<\/small>/);
});
