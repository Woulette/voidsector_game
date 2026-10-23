import assert from "node:assert/strict";
import test from "node:test";
import { rawMaterialCatalog, skills } from "../../src/data/catalog.js?v=20260726-kharon1";
import { getNovaDiscountedPrice } from "../../src/data/premium.js";
import { canAffordSkillCost, getSkillNodeLockReason, getSkillNodePortalRequirement, getSkillProgress, getSkillUpgradeData, hasCompletedSkillNodePortal, isSkillNodeUnlocked, store } from "../../src/core/store.js?v=20260726-kharon1";
import { createSkillTreeModel, resolveSkillTreeSelection } from "../../src/ui/skillTreeModel.js?v=20261023-skills1";
import { renderSkills, renderSkillTreeMarkup, selectSkillNode, updateSkillTree } from "../../src/ui/renderSkills.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { upgradeServerSkill } from "../src/players/progressionActions.js";

function fundedProfile(){
  const profile = createDefaultProfile();
  Object.assign(profile.player, {level:50, skillPoints:11, credits:2_000_000_000, premium:2_000_000});
  profile.completedPortals = {blue:1};
  profile.skillRanks = Object.fromEntries(skills.map(skill=>[skill.id, [0, 0, 0, 0, 0]]));
  profile.cargoHold = Object.fromEntries(rawMaterialCatalog.map(material=>[material.id, 20_000]));
  return profile;
}

function model(profile, selection = {branchId:"damage", nodeIndex:0}){
  const previous = store.state;
  store.state = profile;
  try {
    return createSkillTreeModel({
      catalog:skills, selection, player:profile.player, cargoHold:profile.cargoHold, materials:rawMaterialCatalog,
      getProgress:getSkillProgress, getUpgradeData:getSkillUpgradeData, getLockReason:getSkillNodeLockReason,
      isUnlocked:isSkillNodeUnlocked, canAffordCost:canAffordSkillCost,
      portalRequirement:getSkillNodePortalRequirement(0), portalComplete:hasCompletedSkillNodePortal(0)
    });
  } finally { store.state = previous; }
}

test("the selected skill exposes the only upgrade control and all fifteen nodes remain inspectable", ()=>{
  const view = model(fundedProfile());
  const markup = renderSkillTreeMarkup(view);
  assert.equal(view.branches.length, 3);
  assert.equal(view.tierCount, 5);
  assert.equal(view.points, 11);
  assert.equal(view.selected.canUpgrade, true);
  assert.equal((markup.match(/data-skill-select=/g) || []).length, 15);
  assert.equal((markup.match(/data-unlock-skill=/g) || []).length, 1);
  assert.match(markup, /data-unlock-skill="damage"/);
  assert.equal(view.selected.costs.find(entry=>entry.id === "credits").amount, 10_000);
  assert.match(markup, /\+6 % dégâts laser/);
  assert.doesNotMatch(markup, /Bonus verrouillé/);
});

test("Azuron access stays blocked while every locked node can be selected for inspection", ()=>{
  const profile = fundedProfile();
  profile.completedPortals = {};
  const view = model(profile, {branchId:"shield", nodeIndex:4});
  const markup = renderSkillTreeMarkup(view);
  assert.equal(view.portal.completed, false);
  assert.equal(view.selected.name, "Renfort de coque");
  assert.equal(view.selected.canUpgrade, false);
  assert.match(view.selected.reason, /Azuron/);
  assert.match(markup, /Azuron à terminer/);
  assert.doesNotMatch(markup, /data-unlock-skill=/);
  assert.equal((markup.match(/data-skill-select=/g) || []).length, 15);
});

test("tier unlock uses existing cross-branch requirements and never upgrades a different node", ()=>{
  const profile = fundedProfile();
  profile.skillRanks.damage[0] = 3;
  let view = model(profile, {branchId:"damage", nodeIndex:1});
  assert.equal(view.selected.canUpgrade, false);
  assert.match(view.selected.reason, /rangs précédents 3\/3/);
  profile.skillRanks.shield[0] = profile.skillRanks.utility[0] = 3;
  view = model(profile, {branchId:"damage", nodeIndex:1});
  assert.equal(view.selected.canUpgrade, true);
  const future = model(profile, {branchId:"damage", nodeIndex:4});
  assert.equal(future.selected.canUpgrade, false);
  assert.doesNotMatch(renderSkillTreeMarkup(future), /data-unlock-skill=/);
});

test("missing points disables only the upgrade and marks the missing cost", ()=>{
  const profile = fundedProfile();
  profile.player.skillPoints = 0;
  const view = model(profile);
  assert.equal(view.selected.canUpgrade, false);
  assert.equal(view.selected.available, true);
  assert.match(view.selected.reason, /Points de compétence insuffisants/);
  assert.equal(view.selected.costs.find(entry=>entry.id === "points").insufficient, true);
  assert.doesNotMatch(renderSkillTreeMarkup(view), /data-unlock-skill=/);
});

test("rank III displays discounted NOVA and every real material requirement, refusing missing stock", ()=>{
  const profile = fundedProfile();
  profile.player.premiumActive = true;
  profile.player.premiumUntil = 0;
  profile.skillRanks.damage[0] = 2;
  profile.cargoHold.alliage_cuivre_zinc = 499;
  const view = model(profile);
  const nova = view.selected.costs.find(entry=>entry.id === "premium");
  assert.equal(nova.amount, getNovaDiscountedPrice(1000, profile.player));
  assert.equal(nova.baseAmount, 1000);
  assert.match(nova.label, /Premium/);
  assert.deepEqual(view.selected.costs.filter(entry=>entry.image).map(entry=>[entry.id, entry.amount]), [["alliage_cuivre_zinc", 500], ["plaque_nickel_titane", 500]]);
  assert.equal(view.selected.costs.find(entry=>entry.id === "alliage_cuivre_zinc").insufficient, true);
  assert.equal(view.selected.canUpgrade, false);
  assert.match(view.selected.reason, /Ressources insuffisantes/);
  profile.cargoHold.alliage_cuivre_zinc = 500;
  assert.equal(model(profile).selected.canUpgrade, true);
});

test("completed node and completed branch stay inspectable without a repeat purchase", ()=>{
  const profile = fundedProfile();
  profile.skillRanks.damage = [3, 3, 3, 3, 3];
  const view = model(profile, {branchId:"damage", nodeIndex:4});
  assert.equal(view.selected.rank, 3);
  assert.equal(view.selected.done, true);
  assert.equal(view.selected.canUpgrade, false);
  assert.equal(view.selected.costs.length, 0);
  assert.match(view.selected.currentLabel, /lasers bleus/);
  assert.doesNotMatch(renderSkillTreeMarkup(view), /data-unlock-skill=/);
});

test("presentation does not spend or mutate a profile; only the existing server action applies an upgrade", ()=>{
  const profile = fundedProfile();
  const before = JSON.stringify(profile);
  renderSkillTreeMarkup(model(profile));
  assert.equal(JSON.stringify(profile), before);
  const response = upgradeServerSkill(profile, "damage");
  assert.equal(response.ok, true);
  assert.equal(response.rank, 1);
  assert.equal(profile.player.credits, 2_000_000_000 - 10_000);
  const next = model(profile);
  assert.equal(next.selected.rank, 1);
  assert.equal(next.selected.currentLabel, "+2 % dégâts laser");
  assert.equal(next.selected.costs.find(entry=>entry.id === "credits").amount, 500_000);
});

test("catalog content and fallback identifiers are escaped before rendering HTML", ()=>{
  const malicious = {id:'custom" onclick="bad()', name:"Unsafe", desc:"<script>bad()</script>", levels:[{name:"<img src=x onerror=bad()>", ranks:[{skillPoints:1, price:1, priceType:"credits", label:"<b>unsafe</b>"}]}]};
  const view = createSkillTreeModel({catalog:[malicious], player:{skillPoints:1, credits:100}, getProgress:()=>({ranks:[0]}), getUpgradeData:()=>({nodeIndex:0, rankIndex:0}), getLockReason:()=>"", isUnlocked:()=>true, canAffordCost:()=>true, portalRequirement:{label:"<script>portal()</script>"}, portalComplete:true});
  const markup = renderSkillTreeMarkup(view);
  assert.match(markup, /&lt;img src=x onerror=bad\(\)&gt;/);
  assert.match(markup, /&lt;b&gt;unsafe&lt;\/b&gt;/);
  assert.doesNotMatch(markup, /<script>|<img src=x| onclick="bad/);
  assert.deepEqual(resolveSkillTreeSelection(skills, {branchId:"missing", nodeIndex:4}), {branchId:"damage", nodeIndex:0});
  assert.equal(selectSkillNode("damage", -1), false);
  assert.equal(selectSkillNode("damage", 99), false);
  assert.equal(selectSkillNode("damage", "nope"), false);
});

test("selection survives a server profile redraw without storing UI choice in the profile", ()=>{
  const previousDocument = globalThis.document;
  const previousState = store.state;
  const grid = {classList:{add(){}}, contains:()=>false, querySelector:()=>null, querySelectorAll:()=>[], innerHTML:""};
  globalThis.document = {activeElement:null, querySelectorAll:()=>[grid]};
  try {
    assert.equal(selectSkillNode("utility", 3), true);
    const profile = fundedProfile();
    store.state = profile;
    const before = JSON.stringify(profile);
    renderSkills();
    assert.match(grid.innerHTML, /<h3>Drone réparation<\/h3>/);
    store.state = structuredClone(profile);
    store.state.player.credits -= 500;
    renderSkills();
    assert.match(grid.innerHTML, /<h3>Drone réparation<\/h3>/);
    assert.equal(JSON.stringify(profile), before);
  } finally {
    selectSkillNode("damage", 0);
    globalThis.document = previousDocument;
    store.state = previousState;
  }
});

test("identical redraws keep DOM; changed details retain keyboard focus and internal scroll", ()=>{
  const previousDocument = globalThis.document;
  const focused = {getAttribute:name=>name === "data-skill-select" ? "damage" : name === "data-skill-node" ? "0" : null, classList:{contains:()=>false}};
  const restored = [];
  const scroll = {scrollTop:80, scrollLeft:140};
  let writes = 0;
  const grid = {
    contains:element=>element === focused,
    querySelector:()=>scroll,
    querySelectorAll:()=>[{dataset:{skillSelect:"damage", skillNode:"0"}, focus:options=>restored.push(options)}],
    set innerHTML(value){ writes++; this.markup = value; }
  };
  globalThis.document = {activeElement:focused};
  try {
    const profile = fundedProfile();
    const initial = model(profile);
    updateSkillTree(grid, initial);
    updateSkillTree(grid, initial);
    assert.equal(writes, 1);
    profile.skillRanks.damage[0] = 1;
    updateSkillTree(grid, model(profile));
    assert.equal(writes, 2);
    assert.equal(scroll.scrollTop, 80);
    assert.equal(scroll.scrollLeft, 140);
    assert.deepEqual(restored, [{preventScroll:true}, {preventScroll:true}]);
  } finally { globalThis.document = previousDocument; }
});
