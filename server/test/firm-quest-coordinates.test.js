import assert from "node:assert/strict";
import test from "node:test";
import { getQuest, getQuestObjectives } from "../src/quests/questState.js";

const expectedCoordinates = {
  astra:{questId:"quest_lv5_call_for_help", x:430, y:-330, zone:"Helion-02"},
  cyan:{questId:"quest_lv5_call_for_help_cyan", x:430, y:330, zone:"Nereid-02"},
  jaune:{questId:"quest_lv5_call_for_help_jaune", x:-430, y:330, zone:"Aureon-02"},
  verte:{questId:"quest_lv5_call_for_help_verte", x:-430, y:-330, zone:"Sylva-02"}
};

test("Ricky quest coordinates match each firm portal", ()=>{
  for(const expected of Object.values(expectedCoordinates)){
    const quest = getQuest(expected.questId);
    const objective = getQuestObjectives(quest).find(entry=>entry.id === "portal_coord");
    assert.equal(objective?.x, expected.x);
    assert.equal(objective?.y, expected.y);
    assert.equal(objective?.zone, expected.zone);
    assert.equal(objective?.label, `Coord X ${expected.x} Y ${expected.y}`);
  }
});
