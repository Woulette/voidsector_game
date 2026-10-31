import assert from "node:assert/strict";
import test from "node:test";
import { createCombatPanelRefreshTimers, isCombatPanelCollapsed, updateCombatPanelContent } from "../../src/game/ui/combatPanelPresentation.js";
import { renderCombatQuestTracker } from "../../src/game/ui/questTracker.js";
import { updateQuickPanelTabs } from "../../src/game/ui/quickPanel.js";

test("quest refresh cannot postpone the group or sector map refresh", ()=>{
  const timers = createCombatPanelRefreshTimers();
  timers.defer("quests", .25);
  timers.defer("group", .5);
  timers.defer("map", .75);
  const counts = {quests:0, group:0, map:0};
  for(let tick = 0; tick < 6; tick++){
    for(const [mode, interval] of [["quests", .25], ["group", .5], ["map", .75]]){
      if(timers.due(mode, .125, interval)) counts[mode]++;
    }
  }
  assert.deepEqual(counts, {quests:3, group:1, map:1});
  timers.reset();
  assert.equal(timers.due("quests", 0, .25), true);
});

test("an identical panel snapshot preserves nodes and scroll position", ()=>{
  let writes = 0;
  let focusedNode = {};
  const content = {scrollTop:72, set innerHTML(value){ writes++; focusedNode = {value}; this.scrollTop = 0; }};
  updateCombatPanelContent(content, "<input value='Pilote'>");
  const originalInput = focusedNode;
  assert.equal(content.scrollTop, 72);
  assert.equal(updateCombatPanelContent(content, "<input value='Pilote'>"), false);
  assert.equal(writes, 1);
  assert.equal(focusedNode, originalInput);
  assert.equal(updateCombatPanelContent(content, "<input value='Autre'>"), true);
  assert.equal(writes, 2);
  assert.equal(content.scrollTop, 72);
});

test("group defaults to compact while incoming invitations remain accessible", ()=>{
  assert.equal(isCombatPanelCollapsed(undefined, "group"), true);
  assert.equal(isCombatPanelCollapsed(undefined, "quests"), false);
  assert.equal(isCombatPanelCollapsed({collapsed:false}, "group"), false);
  assert.equal(isCombatPanelCollapsed({collapsed:true}, "group", true), false);
  assert.equal(isCombatPanelCollapsed({collapsed:true}, "quests"), true);
});

test("one tracked quest has no empty slots and all accepted quests remain selectable", ()=>{
  const quests = ["first", "second"].map(id=>({id, title:id, objective:{type:"kill", target:"drone_pirate", count:3}, rewards:{}}));
  const context = {
    trackedQuest:quests[0], detailTab:"quest", enemyTypes:{}, rawMaterials:[],
    getQuestProgress:()=>0, getQuestObjectiveProgress:()=>0
  };
  const single = renderCombatQuestTracker({...context, activeQuests:[quests[0]]});
  assert.doesNotMatch(single, /combat-quest-slots|VIDE/);
  const multiple = renderCombatQuestTracker({...context, activeQuests:quests, selectedQuestId:"second"});
  assert.match(multiple, /data-track-combat-quest="first"/);
  assert.match(multiple, /data-track-combat-quest="second"/);
  assert.equal((multiple.match(/class="combat-quest-slot /g) || []).length, 2);
});

test("all six equipment tabs remain visible, including CPU", ()=>{
  const tabs = ["ammo", "skills", "formations", "extras", "shop", "cpu"].map(id=>{
    const classes = new Set(["hidden"]);
    const attrs = {};
    return {dataset:{combatPanelTab:id}, classes, attrs,
      classList:{toggle(name, on){if(on) classes.add(name); else classes.delete(name);}, remove(name){classes.delete(name);}},
      setAttribute(name,value){attrs[name] = value;}
    };
  });
  updateQuickPanelTabs({querySelectorAll:()=>tabs}, "cpu", 1);
  assert.equal(tabs.some(tab=>tab.classes.has("hidden")), false);
  assert.equal(tabs.at(-1).attrs["aria-pressed"], "true");
  assert.equal(tabs.filter(tab=>tab.classes.has("active")).length, 1);
});
