import assert from "node:assert/strict";
import test from "node:test";
import { renderCombatQuestTracker } from "../../src/game/ui/questTracker.js";

function quest(id, title){
  return {
    id,
    title,
    objective:{type:"kill", target:"drone_pirate", count:3},
    rewards:{}
  };
}

test("combat quest panel keeps the clicked quest selected before server tracking sync", ()=>{
  const first = quest("quest_1", "Premiere quete");
  const second = quest("quest_2", "Deuxieme quete");
  const html = renderCombatQuestTracker({
    activeQuests:[first, second],
    trackedQuest:first,
    selectedQuestId:second.id,
    detailTab:"quest",
    enemyTypes:{drone_pirate:{name:"Orbe", img:"assets/enemies/drone_pirate.png"}},
    rawMaterials:[],
    getQuestProgress:()=>0,
    getQuestObjectiveProgress:()=>0
  });

  assert.match(html, /data-track-combat-quest="quest_2"[^>]*class="[^"]*selected|class="[^"]*selected[^"]*"[^>]*data-track-combat-quest="quest_2"/);
  assert.match(html, /Deuxieme quete/);
});
