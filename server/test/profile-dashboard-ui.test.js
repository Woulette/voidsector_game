import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath){
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("the commander profile keeps one ship and drone dashboard composed outside the facade", ()=>{
  const facadeSource = source("../../src/ui/render.js");
  const renderSource = source("../../src/ui/renderProfile.js");
  const modelSource = source("../../src/ui/profilePresentation.js");
  const appSource = source("../../src/app.js");

  assert.doesNotMatch(renderSource, /data-profile-tab|profileAchievements|profileTitles|renderProfileTabContent/);
  assert.match(facadeSource, /import \{ renderProfile \} from "\.\/renderProfile\.js/);
  assert.doesNotMatch(facadeSource, /function renderProfile\(/);
  assert.match(renderSource, /data-profile-display="ship"/);
  assert.match(renderSource, /data-profile-display="drones"/);
  assert.match(renderSource, /getShipCombatStats\(store\.state\.activeShip\)/);
  assert.match(renderSource, /getRankAssetPath\(rank\)/);
  assert.match(appSource, /setServerProfileTitle/);
  assert.match(renderSource, /data-profile-title-toggle/);
  assert.match(renderSource, /data-profile-title-visibility/);

  const orderedDetails = [
    "Temps de jeu",
    "Monstres détruits",
    "Quêtes terminées",
    "Réputation"
  ];
  let previousIndex = -1;
  for(const label of orderedDetails){
    const index = modelSource.indexOf(`label:"${label}"`);
    assert.ok(index > previousIndex, `${label} doit rester dans l'ordre du dossier pilote`);
    previousIndex = index;
  }
});

test("Ascension replaces the old prestige counter with a permanent visual status", ()=>{
  const renderSource = source("../../src/ui/renderProfile.js");
  const modelSource = source("../../src/ui/profilePresentation.js");
  const publicProfileSource = source("../../src/ui/playerProfileModal.js");
  const publicProfileCss = source("../../src/styles/playerProfile.css");

  assert.match(renderSource, /Ascension unique/);
  assert.match(renderSource, /Ascension accomplie/);
  assert.match(renderSource, /Niveau remis à 1/);
  assert.match(modelSource, /available:!ascended/);
  assert.doesNotMatch(renderSource, /profileDetailRow\("Prestige"/);
  assert.match(publicProfileSource, /pilot-profile-ascension-mark/);
  assert.match(publicProfileCss, /\.pilot-profile-window\.ascended/);
});

test("the level-fifty title uses the new single-title client flow without restoring the old achievement catalogue", ()=>{
  assert.equal(existsSync(new URL("../src/players/profileTitles.js", import.meta.url)), true);
  assert.equal(existsSync(new URL("../../src/game/combatProfileTitles.js", import.meta.url)), false);
  assert.match(source("../src/socket/progressionHandlers.js"), /profile:title-set/);
  assert.match(source("../../src/multiplayer/socketCommands.js"), /profile:title-set/);
  assert.match(source("../../src/multiplayer/progressionSocketListeners.js"), /profile:title-updated/);
  assert.match(source("../../src/core/stateNormalizer.js"), /STELLAR_SYSTEM_TITLE/);
});
