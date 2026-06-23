import assert from "node:assert/strict";
import test from "node:test";

import { questCatalog } from "../../src/data/progression.js";
import { FIRM_REPRESENTATIVES } from "../../src/data/firmRepresentatives.js";
import { QUEST_BRIEFING_TEXT, getQuestBriefing } from "../../src/data/questBriefings.js";
import { RANK_TABLE } from "../../src/data/ranks.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { createTypewriterTextController } from "../../src/game/ui/typewriterText.js";

test("every current quest family has an authored command briefing", ()=>{
  const sourceQuestIds = [...new Set(questCatalog.map(quest=>quest.sourceQuestId || quest.id))];
  assert.equal(sourceQuestIds.length, 40);
  for(const sourceQuestId of sourceQuestIds){
    assert.equal(typeof QUEST_BRIEFING_TEXT[sourceQuestId], "string", sourceQuestId);
    assert.ok(QUEST_BRIEFING_TEXT[sourceQuestId].length >= 70, sourceQuestId);
  }
});

test("first quest briefing assigns recruit grade and personalizes firm command", ()=>{
  const quest = questCatalog.find(entry=>entry.id === "quest_drone_cleanup");
  const briefing = getQuestBriefing({
    quest,
    playerName:"Kokopaille",
    playerRank:RANK_TABLE[0],
    firmId:"astra",
    status:"available"
  });
  assert.equal(briefing.representative.asset, FIRM_REPRESENTATIVES.astra.asset);
  assert.match(briefing.message, /Kokopaille/);
  assert.match(briefing.message, /bleusailles/i);
  assert.match(briefing.message, /grade de Recrue/i);
  assert.match(briefing.message, /notre firme/i);
});

test("high grade briefings use a respectful formal address", ()=>{
  const quest = questCatalog.find(entry=>entry.id === "quest_lv9_moucheron");
  const briefing = getQuestBriefing({
    quest,
    playerName:"Kokopaille",
    playerRank:RANK_TABLE[20],
    firmId:"astra",
    status:"available"
  });
  assert.match(briefing.message, /votre dossier impose le respect/i);
  assert.match(briefing.message, /vous/);
  assert.doesNotMatch(briefing.message, /\bton\b/i);
});

test("quest relay renders the firm portrait, recipient and progressive transmission data", ()=>{
  const quest = questCatalog.find(entry=>entry.id === "quest_drone_cleanup_cyan");
  const rendered = renderSpawnPanelContent({
    mode:"quests",
    activeQuest:null,
    activeQuests:[],
    selectedQuestId:quest.id,
    selectedQuestCategory:"available",
    selectedQuestType:"normal",
    showLockedQuests:false,
    quests:[quest],
    getQuestProgress:()=>0,
    completedQuestClaims:{},
    enemyTypes:{},
    rawMaterials:[],
    playerLevel:1,
    playerName:"NovaTest",
    playerRank:RANK_TABLE[0],
    firmId:"cyan",
    premiumActive:false
  });
  assert.match(rendered.title, /CYGNUS/i);
  assert.match(rendered.html, /assets\/firms\/representatives\/cygnus\.png/);
  assert.match(rendered.html, /À Recrue NovaTest/);
  assert.match(rendered.html, /data-typewriter-key=/);
  assert.match(rendered.html, /data-typewriter-text=/);
  assert.match(rendered.html, /Accepter la mission/);
});

test("shared typewriter preserves progress across rerenders and can be completed", ()=>{
  const element = {dataset:{typewriterKey:"quest:available", typewriterText:"Mission prioritaire"}, textContent:""};
  const root = {querySelector:()=>element};
  const typewriter = createTypewriterTextController({charactersPerSecond:10});
  assert.equal(typewriter.sync(root), true);
  typewriter.update(.5);
  assert.equal(element.textContent, "Missi");
  const replacement = {dataset:{...element.dataset}, textContent:""};
  assert.equal(typewriter.sync({querySelector:()=>replacement}), true);
  assert.equal(replacement.textContent, "Missi");
  typewriter.complete();
  assert.equal(replacement.textContent, "Mission prioritaire");
});
