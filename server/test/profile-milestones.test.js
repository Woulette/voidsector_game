import assert from "node:assert/strict";
import test from "node:test";
import { createProfilePresentation } from "../../src/ui/profilePresentation.js?v=20261023-profilemilestones1";
import { createProfileMilestoneController, renderProfileMilestoneCards, renderProfileMilestoneDialog } from "../../src/ui/profileMilestones.js?v=20261023-profilemilestones1";
import { PROGRESSION_PORTAL_IDS, PROGRESSION_PORTAL_NAMES, STELLAR_SYSTEM_TITLE } from "../../src/shared/progressionUnlocks.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { performServerPrestige } from "../src/players/progressionActions.js";
import { applyProfileTitleSelection } from "../src/players/profileTitles.js";

function profile(eligible = false){
  const state = createDefaultProfile();
  state.player.level = eligible ? 50 : 11;
  state.player.xp = 123456;
  state.player.totalXp = 9999999;
  if(eligible) state.completedPortals = Object.fromEntries(PROGRESSION_PORTAL_IDS.map(id=>[id, 1]));
  return state;
}
function model(state, spentSkillPoints = 0){
  const ascended = state.prestigeCount > 0;
  const levelOk = state.player.level >= 50;
  const portalOk = PROGRESSION_PORTAL_IDS.every(id=>state.completedPortals?.[id] > 0);
  return createProfilePresentation({state, levelCap:ascended ? 100 : 50, spentSkillPoints, ascension:{ok:!ascended && levelOk && portalOk, levelOk, portalOk}});
}

function harness(){
  const feedback = new Map();
  const document = {activeElement:null};
  const control = (attrs = {}, owner = null)=>({
    attrs, owner, disabled:false,
    dataset:Object.fromEntries(Object.entries(attrs).map(([key, value])=>[key.replace(/^data-/, "").replace(/-([a-z])/g, (_, char)=>char.toUpperCase()), value])),
    hasAttribute:key=>Object.hasOwn(attrs, key), getAttribute:key=>attrs[key] ?? null,
    closest(selector){ const key = selector.match(/^\[([^\]=]+)/)?.[1]; return key && Object.hasOwn(attrs, key) ? this : null; },
    focus(){ document.activeElement = this; }
  });
  const openers = {titles:control({"data-profile-milestone-open":"titles"}), ascension:control({"data-profile-milestone-open":"ascension"})};
  const dialog = {
    open:false, writes:0, shows:0, controls:[], listeners:new Map(), body:{scrollTop:0},
    setAttribute(){}, addEventListener(name, callback){ this.listeners.set(name, callback); },
    contains(element){ return element?.owner === this; },
    showModal(){ this.open = true; this.shows++; },
    close(){ this.open = false; this.listeners.get("close")?.(); },
    set innerHTML(value){
      this.markup = value; this.writes++;
      this.heading = control({"data-profile-milestone-heading":""}, this);
      this.controls = [...value.matchAll(/<button\b([^>]*)>/g)].map(match=>{
        const attrs = Object.fromEntries([...match[1].matchAll(/(data-[\w-]+)(?:="([^"]*)")?/g)].map(entry=>[entry[1], entry[2] || ""]));
        const button = control(attrs, this);
        button.disabled = /\bdisabled\b/.test(match[1]);
        return button;
      });
      this.body = {scrollTop:0};
    },
    querySelector(selector){
      if(selector === "[data-profile-milestone-scroll]") return this.body;
      if(selector === "[data-profile-milestone-heading]") return this.heading;
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector){
      if(selector.startsWith("button:not")) return this.controls.filter(button=>!button.disabled);
      const key = selector.match(/^\[([^\]=]+)/)?.[1];
      return key ? this.controls.filter(button=>button.hasAttribute(key)) : [];
    }
  };
  document.body = {appendChild:()=>{ document.appends = (document.appends || 0) + 1; }};
  document.createElement = ()=>dialog;
  document.querySelector = selector=>openers[selector.includes('"titles"') ? "titles" : "ascension"];
  const controller = createProfileMilestoneController({getDocument:()=>document, getWindow:()=>({addEventListener:(name, listener)=>feedback.set(name, listener)})});
  const click = target=>controller.handleClick({target});
  return {controller, document, dialog, openers, click,
    open:kind=>click(openers[kind]),
    button:attribute=>dialog.querySelector(`[${attribute}]`),
    feedback:(reason, payload)=>feedback.get("voidsector:multiplayer-change")?.({detail:{reason, payload}})
  };
}

test("the collection shows the single canonical title even when locked and marks the unfinished eternal trial", ()=>{
  const state = profile();
  const before = JSON.stringify(state);
  const view = model(state);
  assert.equal(view.titles.total, 1);
  assert.equal(view.titles.unlockedCount, 0);
  assert.deepEqual(view.titles.catalog.map(title=>title.id), [STELLAR_SYSTEM_TITLE.id]);
  assert.match(renderProfileMilestoneCards(view), /data-profile-milestone-open="titles"/);
  const locked = renderProfileMilestoneDialog(view, {kind:"titles"});
  assert.match(locked, /Système stellaire colonisé/);
  assert.match(locked, /Épreuve à venir/);
  assert.match(locked, /\+5 % dégâts lasers, roquettes et missiles/);
  assert.doesNotMatch(locked, /data-profile-title-toggle/);
  assert.equal(JSON.stringify(state), before);
});

test("ascension details list nine distinct real portals and exact reset XP without adding a skill-max requirement", ()=>{
  const state = profile(true);
  state.skillRanks.damage = [1, 0, 0, 0, 0];
  const view = model(state, 1);
  assert.equal(view.ascension.available, true);
  assert.deepEqual(view.ascension.portals.map(portal=>portal.id), PROGRESSION_PORTAL_IDS);
  for(const portal of view.ascension.portals){
    assert.equal(portal.name, PROGRESSION_PORTAL_NAMES[portal.id]);
    assert.match(portal.image, /^assets\/portals\//);
    assert.equal(portal.completed, true);
  }
  assert.equal(view.ascension.reset.xpNext, 3000);
  assert.equal(view.ascension.reset.skillPoints, 0);
  assert.equal(view.ascension.reset.levelCap, 100);
  const details = renderProfileMilestoneDialog(view, {kind:"ascension"});
  assert.equal((details.match(/class="pm-portal-number"/g) || []).length, 9);
  assert.doesNotMatch(details, /data-prestige/);
  const confirm = renderProfileMilestoneDialog(view, {kind:"ascension", confirming:true});
  assert.equal((confirm.match(/data-prestige/g) || []).length, 1);
  assert.match(confirm, /unique et irréversible/);
  assert.match(confirm, /XP cumulée/);
  assert.match(confirm, /3[\u202f\u00a0 ]000 XP/);
  state.completedPortals = {blue:9};
  assert.equal(model(state).ascension.completedPortals, 1);
  assert.equal(model(state).ascension.available, false);
});

test("title canonical sync keeps the same dialog open, scroll position and focus on the updated remove button", ()=>{
  const test = harness();
  const state = profile(true);
  test.controller.sync(model(state));
  test.open("titles");
  const equip = test.button("data-profile-title-toggle");
  assert.equal(equip.getAttribute("data-profile-title-toggle"), STELLAR_SYSTEM_TITLE.id);
  test.document.activeElement = equip;
  test.dialog.body.scrollTop = 135;
  applyProfileTitleSelection(state, {titleId:STELLAR_SYSTEM_TITLE.id, visible:false});
  test.controller.sync(model(state));
  assert.equal(test.dialog.open, true);
  assert.equal(test.dialog.shows, 1);
  assert.equal(test.document.appends, 1);
  assert.equal(test.dialog.body.scrollTop, 135);
  assert.equal(test.document.activeElement.getAttribute("data-profile-title-toggle"), "");
  assert.match(test.dialog.markup, /Équipé · masqué/);
  assert.match(test.dialog.markup, /Afficher en jeu/);
  assert.match(test.dialog.markup, /Bonus actif, même lorsque le titre est masqué/);
  const writes = test.dialog.writes;
  test.controller.sync(model(state));
  assert.equal(test.dialog.writes, writes);
});

test("Escape closes the modal and restores its opener; Tab remains within the dialog", ()=>{
  const test = harness();
  test.controller.sync(model(profile()));
  test.open("titles");
  const controls = test.dialog.controls.filter(button=>!button.disabled);
  test.document.activeElement = controls.at(-1);
  let prevented = 0;
  assert.equal(test.controller.handleKeydown({key:"Tab", preventDefault:()=>prevented++}), true);
  assert.equal(test.document.activeElement, controls[0]);
  assert.equal(test.controller.handleKeydown({key:"Tab", shiftKey:true, preventDefault:()=>prevented++}), true);
  assert.equal(test.document.activeElement, controls.at(-1));
  assert.equal(test.controller.handleKeydown({key:"Escape", preventDefault:()=>prevented++, stopPropagation(){}}), true);
  assert.equal(test.dialog.open, false);
  assert.equal(test.document.activeElement, test.openers.titles);
  assert.equal(prevented, 3);
});

test("confirmation authorizes one command and keeps its pending lock through close, reopen and title browsing until canonical success", ()=>{
  const test = harness();
  const state = profile(true);
  test.controller.sync(model(state));
  test.open("ascension");
  assert.equal(test.button("data-prestige"), null);
  test.click(test.button("data-profile-ascension-review"));
  const confirm = test.button("data-prestige");
  assert.equal(test.click(confirm), false, "first final confirmation reaches the app command handler");
  assert.equal(test.click(confirm), true, "second click must be consumed");
  test.controller.settle(true);
  test.click(test.button("data-profile-milestone-close"));
  assert.equal(test.controller.getState().pending, true);
  test.open("titles");
  assert.equal(test.controller.getState().pending, true);
  test.click(test.button("data-profile-milestone-close"));
  test.open("ascension");
  assert.equal(test.button("data-prestige").disabled, true);
  assert.equal(test.click(test.button("data-prestige")), true);
  assert.equal(test.controller.getState().pending, true);
  assert.equal(state.prestigeCount, 0, "the UI never performs the progression optimistically");
  assert.equal(performServerPrestige(state).ok, true);
  test.controller.sync(model(state));
  assert.equal(test.controller.getState().pending, false);
  assert.equal(test.dialog.open, true);
  assert.equal(test.button("data-prestige"), null);
  assert.match(test.dialog.markup, /Ascension accomplie/);
});

test("failed sends and authoritative errors unlock retry even if the modal was closed", ()=>{
  const test = harness();
  test.controller.sync(model(profile(true)));
  test.open("ascension");
  test.click(test.button("data-profile-ascension-review"));
  assert.equal(test.click(test.button("data-prestige")), false);
  test.controller.settle(false);
  assert.equal(test.controller.getState().pending, false);
  assert.equal(test.button("data-prestige").disabled, false);
  assert.equal(test.click(test.button("data-prestige")), false);
  test.controller.settle(true);
  test.click(test.button("data-profile-milestone-close"));
  test.feedback("prestige:error", {message:"Conditions modifiées côté serveur."});
  assert.equal(test.controller.getState().pending, false);
  test.open("ascension");
  test.click(test.button("data-profile-ascension-review"));
  assert.equal(test.click(test.button("data-prestige")), false);
  test.controller.settle(true);
  test.feedback("account:action-limited", {eventName:"prestige:perform", message:"Patientez."});
  assert.equal(test.controller.getState().pending, false);
  assert.match(test.dialog.markup, /Patientez/);
});

test("dialog text and attributes escape canonical-looking strings before HTML rendering", ()=>{
  const view = model(profile(true));
  view.titles.catalog[0].name = '<img src=x onerror="bad">';
  const title = renderProfileMilestoneDialog(view, {kind:"titles"});
  assert.match(title, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(title, /<img src=x/);
  view.ascension.portals[0].image = 'x" onerror="bad';
  view.ascension.portals[0].name = "<script>bad</script>";
  const ascension = renderProfileMilestoneDialog(view, {kind:"ascension"});
  assert.doesNotMatch(ascension, /<script>| onerror="bad"/);
});
