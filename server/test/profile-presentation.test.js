import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { RANK_TABLE, getRankAssetPath } from "../../src/data/ranks.js";
import { PROGRESSION_PORTAL_IDS, STELLAR_SYSTEM_TITLE } from "../../src/shared/progressionUnlocks.js";
import { getShipCombatStats, makeEmptyLoadout, store } from "../../src/core/store.js?v=20260726-kharon1";
import { getProfilePresentationModel, renderProfileMarkup, updateProfilePresentation } from "../../src/ui/renderProfile.js";
import { formatProfileDuration } from "../../src/ui/profilePresentation.js?v=20261023-profile1";
import { renderProfileMilestoneDialog } from "../../src/ui/profileMilestones.js?v=20261023-profilemilestones1";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { performServerPrestige } from "../src/players/progressionActions.js";
import { applyProfileTitleSelection, getEquippedProfileTitleDamageMultiplier } from "../src/players/profileTitles.js";

function profile(){
  const result = createDefaultProfile();
  Object.assign(result.player, {name:"Baptiste Big", level:11, xp:164600, xpNext:984000, totalXp:0, reputation:0, monsterRankPoints:2500, totalKills:128, totalPlaySeconds:13560});
  result.activeShip = "razorion";
  result.ownedShips.push("razorion");
  result.shipLoadouts.razorion = makeEmptyLoadout("razorion");
  return result;
}

function usingProfile(value, callback, display = "ship"){
  const previousState = store.state;
  const previousDisplay = store.profileDisplay;
  store.state = value;
  store.profileDisplay = display;
  try { return callback(); }
  finally { store.state = previousState; store.profileDisplay = previousDisplay; }
}

const model = (value, display)=>usingProfile(value, getProfilePresentationModel, display);

test("the profile uses the real grade score, its real emblem and progress between grade thresholds", ()=>{
  const view = model(profile());
  assert.equal(view.identity.level, 11);
  assert.equal(view.identity.rankName, "Soldat d'élite");
  assert.equal(view.identity.rankPoints, 12500);
  assert.equal(view.identity.rankPercent, 87.5);
  assert.equal(view.identity.nextRank.name, "Caporal");
  assert.equal(view.identity.nextRank.remaining, 500);
  assert.match(view.identity.rankAsset, /^assets\/ranks\/06_Soldat_d_elite\.svg(?:\?v=[\w-]+)?$/);
  for(const rank of RANK_TABLE){
    assert.equal(existsSync(new URL(`../../${getRankAssetPath(rank)}`, import.meta.url)), true, rank.name);
  }
  const recruit = profile();
  Object.assign(recruit.player, {level:1, monsterRankPoints:0});
  assert.equal(model(recruit).identity.rankName, "Recrue");
  recruit.player.monsterRankPoints = 5_000_000;
  const maximum = model(recruit);
  assert.equal(maximum.identity.rankName, "Maréchal");
  assert.equal(maximum.identity.nextRank, null);
  assert.match(renderProfileMarkup(maximum), /Grade maximum atteint/);
});

test("ship image, rarity and six effective capacities come from the selected live loadout getters", ()=>{
  const value = profile();
  const view = model(value);
  const effective = usingProfile(value, ()=>getShipCombatStats("razorion"));
  assert.deepEqual(view.ship, {name:"Razorion", className:"Chasseur d'elite", image:"assets/ships/Razorion.png", rarity:"Rare", rarityClass:"rarity-rare"});
  assert.deepEqual(view.stats.map(entry=>entry.value), [Math.round(effective.vie), Math.round(effective.bouclier), Math.round(effective.regen), Math.round(effective.shieldAbsorbRatio * 100), Math.round(effective.vitesseReelle), Math.round(effective.cargo)]);
  assert.equal(view.stats[0].value, 35000);
  assert.equal(view.stats[1].value, 0);
  assert.equal(view.stats[3].value, 50);
  assert.equal(view.stats[5].value, 700);
  assert.equal(view.xp.value, 164600);
  assert.equal(view.xp.next, 984000);
});

test("the dossier displays claimed quests, recorded kills and signed reputation without inventing achievements", ()=>{
  const value = profile();
  value.player.reputation = -732;
  value.completedQuestClaims = {q1:1, q2:3};
  const view = model(value);
  assert.equal(view.counters.find(entry=>entry.icon === "kills").value, 128);
  assert.equal(view.counters.find(entry=>entry.icon === "flag").value, 2);
  assert.equal(view.counters.find(entry=>entry.icon === "star").value, -732);
  assert.equal(view.counters[0].value, "3 h 46");
  assert.equal(formatProfileDuration(-5), "0 min 00 s");
  assert.equal(formatProfileDuration(59), "0 min 59 s");
  assert.match(renderProfileMarkup(view), /-732/);
});

test("title controls reflect actual unlock and server equipment; hiding keeps the equipped bonus", ()=>{
  const value = profile();
  let view = model(value);
  assert.equal(view.title.unlocked, false);
  assert.doesNotMatch(renderProfileMarkup(view), /data-profile-title-toggle/);
  assert.equal(applyProfileTitleSelection(value, {titleId:STELLAR_SYSTEM_TITLE.id}).ok, false);
  value.completedPortals.eternal = 1;
  view = model(value);
  assert.equal(view.title.unlocked, true);
  assert.equal(view.title.equipped, false);
  assert.match(renderProfileMilestoneDialog(view, {kind:"titles"}), /Équipez ce titre pour activer son bonus/);
  assert.equal(applyProfileTitleSelection(value, {titleId:STELLAR_SYSTEM_TITLE.id, visible:false}).ok, true);
  view = model(value);
  assert.equal(view.title.equipped, true);
  assert.equal(view.title.visible, false);
  assert.equal(view.title.bonus, 5);
  assert.equal(getEquippedProfileTitleDamageMultiplier(value), 1.05);
  const html = renderProfileMarkup(view) + renderProfileMilestoneDialog(view, {kind:"titles"});
  assert.match(html, /Équipé · masqué/);
  assert.match(html, /Afficher en jeu/);
  assert.match(html, /data-profile-title-toggle=""/);
  assert.match(html, /Bonus actif, même lorsque le titre est masqué/);
});

test("ascension requires nine distinct progression portals and level fifty, then shows its real reset and permanent state", ()=>{
  const value = profile();
  value.player.level = 50;
  value.completedPortals.blue = 9;
  let view = model(value);
  assert.equal(view.ascension.completedPortals, 1);
  assert.equal(view.ascension.available, false);
  assert.equal(performServerPrestige(structuredClone(value)).ok, false);
  value.completedPortals = Object.fromEntries(PROGRESSION_PORTAL_IDS.map(id=>[id, 1]));
  view = model(value);
  assert.equal(view.ascension.available, true);
  assert.match(renderProfileMilestoneDialog(view, {kind:"ascension"}), /Niveau remis à <b>1/);
  assert.doesNotMatch(renderProfileMarkup(view), /data-prestige/);
  assert.match(renderProfileMilestoneDialog(view, {kind:"ascension", confirming:true}), /data-prestige>Confirmer/);
  value.skillRanks = {damage:[1, 0, 0, 0, 0]};
  const beforeSkills = structuredClone(value.skillRanks);
  assert.equal(performServerPrestige(value).ok, true);
  view = model(value);
  assert.equal(view.identity.level, 1);
  assert.equal(view.identity.levelCap, 100);
  assert.equal(view.ascension.ascended, true);
  assert.equal(view.ascension.available, false);
  assert.deepEqual(value.skillRanks, beforeSkills);
  assert.match(renderProfileMarkup(view), /Ascension accomplie/);
  assert.doesNotMatch(renderProfileMarkup(view), /data-prestige/);
});

test("drone presentation counts only equipped modules, retains slot numbers and real Overdrive access", ()=>{
  const value = profile();
  value.ownedDroneCount = 4;
  value.droneLoadout = [null, "drone-module-a", null, "drone-module-b"];
  value.inventoryItems.push({uid:"drone-module-a", itemId:"laser_mk1"}, {uid:"drone-module-b", itemId:"laser_mk1"});
  value.completedPortals.violet = 1;
  value.dronePermanentUpgrades = {3:"drone_overdrive_chip"};
  value.inventoryItems.push({uid:"profile-test-skin", itemId:"drone_overdrive_chip"});
  value.droneSkinLoadout = [null, null, null, "profile-test-skin"];
  const before = JSON.stringify(value);
  const view = model(value, "drones");
  assert.equal(view.displayMode, "drones");
  assert.deepEqual(view.drones.map(entry=>entry.index), [1, 3]);
  assert.equal(view.drones[1].upgraded, true);
  assert.equal(view.formationName, "Formation Base");
  const html = renderProfileMarkup(view);
  assert.match(html, /Drone 02/);
  assert.match(html, /Drone 04/);
  assert.match(html, /Noyau Overdrive actif/);
  assert.match(html, /class="pilot-profile-drone-grid" data-profile-scroll="drones"/);
  assert.match(html, /data-profile-display="drones" aria-pressed="true"/);
  assert.equal(JSON.stringify(value), before);
  assert.match(renderProfileMarkup(model(profile(), "drones")), /Aucun drone utilisé/);
});

test("pilot names, ship catalog copy and drone module labels are escaped in text and attributes", ()=>{
  const view = model(profile());
  view.identity.name = '<img src=x onerror="bad()">';
  view.ship.name = 'Ship" onclick="bad()';
  view.ship.image = 'asset" onerror="bad()';
  view.identity.rankName = '<script>bad()</script>';
  view.displayMode = "drones";
  view.drones = [{index:0, name:'<b onclick="bad()">module</b>', rarity:"Rare"}];
  const html = renderProfileMarkup(view);
  assert.match(html, /&lt;img src=x onerror=&quot;bad\(\)&quot;&gt;/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.match(html, /&lt;b onclick=&quot;bad\(\)&quot;&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x| onclick="bad| onerror="bad/);
});

test("identical canonical refreshes keep the DOM; changed values retain focus and internal drone scroll", ()=>{
  const previousDocument = globalThis.document;
  const focused = {hasAttribute:attribute=>attribute === "data-profile-display", getAttribute:()=>"drones"};
  const scroll = {dataset:{profileScroll:"drones"}, scrollTop:175, scrollLeft:8};
  const restored = [];
  let writes = 0;
  const section = {
    contains:element=>element === focused,
    querySelectorAll:selector=>selector === "[data-profile-scroll]" ? [scroll] : [{getAttribute:()=>"drones", focus:options=>restored.push(options)}],
    set innerHTML(value){ writes++; this.html = value; }
  };
  globalThis.document = {activeElement:focused};
  try {
    const view = model(profile());
    updateProfilePresentation(section, view);
    updateProfilePresentation(section, view);
    assert.equal(writes, 1);
    view.identity.name = "Canonical name";
    updateProfilePresentation(section, view);
    assert.equal(writes, 2);
    assert.equal(scroll.scrollTop, 175);
    assert.equal(scroll.scrollLeft, 8);
    assert.deepEqual(restored, [{preventScroll:true}, {preventScroll:true}]);
  } finally { globalThis.document = previousDocument; }
});

test("the title collection remains reachable when nothing is unlocked and the footer never performs ascension", ()=>{
  const view = model(profile());
  const html = renderProfileMarkup(view);
  assert.equal(view.titles.total, 1);
  assert.equal(view.titles.unlockedCount, 0);
  assert.match(html, /data-profile-milestone-open="titles" aria-haspopup="dialog"/);
  assert.match(html, /Collection de titres/);
  assert.match(html, /data-profile-milestone-open="ascension"/);
  assert.doesNotMatch(html, /data-prestige|data-profile-title-toggle|data-profile-title-visibility/);
});
