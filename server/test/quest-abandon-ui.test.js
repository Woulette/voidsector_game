import assert from "node:assert/strict";
import test from "node:test";
import { questCatalog } from "../../src/data/progression.js";
import { FIRMS } from "../../src/data/firms.js";
import { getTutorialQuestIds } from "../../src/shared/tutorial.js";
import { createQuestAbandonController, isQuestAbandonProtected } from "../../src/game/ui/questAbandon.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { renderCombatQuestTracker } from "../../src/game/ui/questTracker.js";
import { createSocketCommands } from "../../src/multiplayer/socketCommands.js";
import { installProgressionSocketListeners } from "../../src/multiplayer/progressionSocketListeners.js";

function quest(id = "test", category = "normal"){
  return {id, title:`Mission ${id}`, category, requiredLevel:1, objective:{type:"kill", target:"drone_pirate", count:3}, rewards:{}};
}

function relay(selected, options = {}){
  return renderSpawnPanelContent({mode:"quests", quests:[selected], activeQuests:[selected], activeQuest:selected,
    selectedQuestCategory:"active", selectedQuestType:selected.category, selectedQuestId:selected.id,
    getQuestProgress:()=>1, completedQuestClaims:{}, playerLevel:10, premiumActive:true, ...options}).html;
}

for(const {id:firmId} of FIRMS){
  test(`${firmId}: active tutorial missions cannot be abandoned, including hunts and pause`, ()=>{
    for(const id of getTutorialQuestIds(firmId)){
      for(const status of ["active", "paused"]){
        assert.equal(isQuestAbandonProtected(id, {status, step:"game_hunt_pass"}, firmId), true);
      }
      assert.equal(isQuestAbandonProtected(id, {status:"completed"}, firmId), false);
      assert.equal(isQuestAbandonProtected(id, {status:"abandoned"}, firmId), false);
    }
    assert.equal(isQuestAbandonProtected("unrelated", {status:"paused"}, firmId), false);
    const selected = questCatalog.find(entry=>entry.id === getTutorialQuestIds(firmId)[0]);
    assert.ok(selected, `real ${firmId} quest exists`);
    const html = relay(selected, {firmId, tutorial:{status:"active", step:"game_accept_pass"}});
    assert.match(html, new RegExp(`data-abandon-quest="${selected.id}" disabled`));
    assert.match(html, /Mission nécessaire au tutoriel/);
  });
}

for(const category of ["normal", "daily", "weekly"]){
  test(`${category}: active quest exposes abandon, even with expired Premium`, ()=>{
    const html = relay(quest(category, category), {premiumActive:false});
    assert.match(html, new RegExp(`data-abandon-quest="${category}" >Abandonner la quête`));
  });
}

test("unaccepted and claimed quests do not expose abandon", ()=>{
  const selected = quest();
  assert.doesNotMatch(relay(selected, {selectedQuestCategory:"available", activeQuests:[], activeQuest:null}), /data-abandon-quest/);
  assert.doesNotMatch(relay(selected, {selectedQuestCategory:"completed", completedQuestClaims:{test:1}}), /data-abandon-quest/);
});

test("compact journal exposes abandonment under Info and follows the canonical active list", ()=>{
  const selected = quest();
  const options = {activeQuests:[selected], trackedQuest:selected, enemyTypes:{}, rawMaterials:[], getQuestProgress:()=>1, getQuestObjectiveProgress:()=>1};
  assert.match(renderCombatQuestTracker({...options, detailTab:"description"}), /data-abandon-quest="test"/);
  assert.doesNotMatch(renderCombatQuestTracker({...options, detailTab:"quest"}), /data-abandon-quest/);
  assert.doesNotMatch(renderCombatQuestTracker({...options, detailTab:"description", activeQuests:[]}), /data-abandon-quest/);
});

test("quest abandon transport requires authenticated gameplay and sends only the quest id", ()=>{
  const calls = [];
  const multiplayer = {connected:true, socket:{emit:(...args)=>calls.push(args)}, auth:{account:{id:"account"}, profileReady:true}};
  const commands = createSocketCommands({multiplayer});
  assert.equal(commands.abandonServerQuest(""), false);
  assert.equal(commands.abandonServerQuest("quest_one"), true);
  assert.deepEqual(calls, [["quest:abandon", {id:"quest_one"}]]);
  multiplayer.auth.profileReady = false;
  assert.equal(commands.abandonServerQuest("quest_two"), false);
  assert.equal(calls.length, 1);
});

test("abandoned notification contains no reward or client-side progression mutation", ()=>{
  const listeners = {};
  const state = {activeQuestIds:["q"], questProgress:{q:2}};
  const multiplayer = {questEvents:[], profile:state};
  const calls = [];
  installProgressionSocketListeners({socket:{on:(name, fn)=>{listeners[name] = fn;}}, multiplayer,
    emitChange:(...args)=>calls.push(args), toast:message=>calls.push(message)});
  const event = {id:"q", title:"Test", at:1};
  listeners["quest:abandoned"](event);
  assert.deepEqual(calls, ["Quête abandonnée : Test", ["quest:abandoned", event]]);
  assert.deepEqual(state, {activeQuestIds:["q"], questProgress:{q:2}});
  assert.deepEqual(multiplayer.questEvents, []);
});

class Element extends EventTarget {
  constructor(){ super(); this.nodes = new Map(); this.dataset = {}; this.isConnected = true; this.disabled = false; this.textContent = ""; }
  setAttribute(){}
  querySelector(selector){
    if(!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  focus(){ this.focused = true; }
  showModal(){ this.open = true; }
  close(){ this.open = false; }
  remove(){ this.isConnected = false; }
  closest(selector){ return selector === "[data-abandon-quest]" && this.dataset.abandonQuest ? this : null; }
}

function uiFixture({sendResult = true, state = {activeQuestIds:["test"], completedQuestClaims:{}, player:{firmId:"astra"}, tutorial:{status:"completed"}}} = {}){
  const documentRef = new Element();
  const windowRef = new Element();
  const timers = new Map();
  const sent = [];
  const toasts = [];
  const dialogs = [];
  let timerId = 0;
  windowRef.setTimeout = fn=>{ timers.set(++timerId, fn); return timerId; };
  windowRef.clearTimeout = id=>timers.delete(id);
  documentRef.createElement = ()=>new Element();
  documentRef.body = {appendChild:element=>dialogs.push(element)};
  const controller = createQuestAbandonController({documentRef, windowRef, getState:()=>state, getQuests:()=>[quest("test"), quest("quest_drone_cleanup")],
    send:id=>{sent.push(id); return sendResult;}, showToast:message=>toasts.push(message)});
  function change(reason, payload){
    const event = new Event("voidsector:multiplayer-change");
    event.detail = {reason, payload};
    windowRef.dispatchEvent(event);
  }
  function open(id = "test"){
    const button = new Element();
    button.dataset.abandonQuest = id;
    const event = new Event("click", {cancelable:true});
    Object.defineProperty(event, "target", {value:button});
    documentRef.dispatchEvent(event);
    return dialogs.at(-1);
  }
  return {state, sent, toasts, timers, controller, open, change, windowRef};
}

function click(element, selector){ element.querySelector(selector).dispatchEvent(new Event("click")); }

test("keeping a quest sends nothing and restores focus", ()=>{
  const ui = uiFixture();
  const dialog = ui.open();
  assert.equal(dialog.querySelector("[data-keep-quest]").focused, true);
  assert.match(dialog.innerHTML, /progression de cette quête sera effacée/);
  assert.match(dialog.innerHTML, /Aucune récompense/);
  click(dialog, "[data-keep-quest]");
  assert.equal(dialog.open, false);
  assert.deepEqual(ui.sent, []);
  ui.controller.destroy();
});

test("double confirm sends once and keeps progression until server profile arrives", ()=>{
  const ui = uiFixture();
  const before = structuredClone(ui.state);
  const dialog = ui.open();
  click(dialog, "[data-confirm-quest-abandon]");
  click(dialog, "[data-confirm-quest-abandon]");
  assert.deepEqual(ui.sent, ["test"]);
  assert.deepEqual(ui.state, before);
  assert.equal(dialog.open, true);
  assert.equal(dialog.querySelector("[data-confirm-quest-abandon]").disabled, true);
  assert.equal(dialog.querySelector("[data-keep-quest]").disabled, true);
  click(dialog, "[data-keep-quest]");
  dialog.dispatchEvent(new Event("cancel", {cancelable:true}));
  assert.equal(dialog.open, true, "An emitted request cannot be presented as cancelled");
  ui.change("quest:abandoned", {id:"another"});
  assert.equal(dialog.open, true);
  ui.state.activeQuestIds = [];
  ui.windowRef.dispatchEvent(new Event("voidsector:profile-applied"));
  assert.equal(dialog.open, false);
  assert.equal(ui.timers.size, 0);
  ui.controller.destroy();
});

test("server rejection preserves the quest and allows a deliberate retry", ()=>{
  const ui = uiFixture();
  const dialog = ui.open();
  click(dialog, "[data-confirm-quest-abandon]");
  ui.change("quest:error", {message:"Sauvegarde indisponible."});
  assert.equal(dialog.querySelector("[data-confirm-quest-abandon]").disabled, false);
  assert.equal(dialog.querySelector("[data-keep-quest]").disabled, false);
  assert.equal(dialog.querySelector("[data-quest-abandon-status]").textContent, "Sauvegarde indisponible.");
  assert.deepEqual(ui.state.activeQuestIds, ["test"]);
  click(dialog, "[data-confirm-quest-abandon]");
  assert.deepEqual(ui.sent, ["test", "test"]);
  ui.change("quest:abandoned", {id:"test"});
  assert.equal(dialog.open, false);
  assert.equal(ui.timers.size, 0);
  ui.controller.destroy();
});

test("offline and unacknowledged requests never remove the quest", ()=>{
  const offline = uiFixture({sendResult:false});
  const dialog = offline.open();
  click(dialog, "[data-confirm-quest-abandon]");
  assert.match(dialog.querySelector("[data-quest-abandon-status]").textContent, /quête est conservée/);
  assert.equal(offline.timers.size, 0);
  assert.deepEqual(offline.state.activeQuestIds, ["test"]);
  offline.controller.destroy();
  const online = uiFixture();
  const pendingDialog = online.open();
  click(pendingDialog, "[data-confirm-quest-abandon]");
  [...online.timers.values()][0]();
  assert.match(pendingDialog.querySelector("[data-quest-abandon-status]").textContent, /Confirmation non reçue/);
  assert.deepEqual(online.state.activeQuestIds, ["test"]);
  online.controller.destroy();
});

test("tutorial protection is rechecked when confirming after a state change", ()=>{
  const ui = uiFixture({state:{activeQuestIds:["quest_drone_cleanup"], player:{firmId:"astra"}, tutorial:{status:"completed"}}});
  const dialog = ui.open("quest_drone_cleanup");
  ui.state.tutorial.status = "paused";
  click(dialog, "[data-confirm-quest-abandon]");
  assert.deepEqual(ui.sent, []);
  assert.match(dialog.querySelector("[data-quest-abandon-status]").textContent, /nécessaire au tutoriel/);
  ui.controller.destroy();
});
