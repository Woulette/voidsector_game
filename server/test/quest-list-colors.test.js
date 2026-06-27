import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { questCatalog } from "../../src/data/progression.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";

const css = fs.readFileSync(new URL("../../src/styles/questRelay.css", import.meta.url),"utf8");
const panel = fs.readFileSync(new URL("../../src/game/ui/spawnPanel.js", import.meta.url),"utf8");

test("rare and red quest colors are visible before quest selection", ()=>{
  assert.match(panel,/function questToneClass/);
  assert.match(panel,/if\(quest\.red\) return "red"/);
  assert.match(panel,/if\(quest\.rare\) return "rare"/);
  assert.match(css,/\.quest-strip\.rare\{[^}]*border-color/);
  assert.match(css,/\.quest-strip\.red\{[^}]*border-color/);
  assert.match(css,/data-view-quest="quest_drone_cleanup"/);
});

test("Un passe droit is flagged as a red quest", ()=>{
  const quest = questCatalog.find(entry=>entry.id === "quest_drone_cleanup");
  assert.equal(quest?.title, "Un passe droit ?");
  assert.equal(quest?.red, true);
});

test("completed Un passe droit renders with the red quest class", ()=>{
  const quests = questCatalog.filter(quest=>["quest_drone_cleanup", "quest_raider_patrol"].includes(quest.id));
  const rendered = renderSpawnPanelContent({
    mode:"quests",
    activeQuest:null,
    activeQuests:[],
    selectedQuestId:"quest_raider_patrol",
    selectedQuestCategory:"completed",
    selectedQuestType:"normal",
    showLockedQuests:false,
    quests,
    getQuestProgress:()=>3,
    completedQuestClaims:{quest_drone_cleanup:true, quest_raider_patrol:true},
    enemyTypes:{},
    rawMaterials:[],
    playerLevel:1,
    playerName:"hfej",
    playerRank:{id:"sergent", label:"Sergent"},
    firmId:"astra",
    premiumActive:false
  });
  assert.match(rendered.html, /class="quest-strip[^"]*\bred\b[^"]*"[^>]*data-view-quest="quest_drone_cleanup"/);
  assert.doesNotMatch(rendered.html, /class="quest-strip[^"]*\bspecial\b[^"]*"[^>]*data-view-quest="quest_drone_cleanup"/);
  assert.doesNotMatch(rendered.html, /quest-progress-row|Progression op/);
});
