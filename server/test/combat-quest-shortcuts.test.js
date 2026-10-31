import assert from "node:assert/strict";
import test from "node:test";
import { renderCombatQuestTracker } from "../../src/game/ui/questTracker.js";
import { questCatalog } from "../../src/data/progression.js";
import { getQuestObjectives, trackServerQuest } from "../src/quests/questState.js";
import { progressServerQuestKill } from "../src/quests/quests.js";

const quests=Array.from({length:5},(_,i)=>({id:`quest_${i+1}`,title:`Quête ${i+1}`,objective:{type:"kill",target:"drone_pirate",count:3},rewards:{}}));
const render=(activeQuests,selectedQuestId)=>renderCombatQuestTracker({activeQuests,selectedQuestId,trackedQuest:activeQuests[0],detailTab:"quest",enemyTypes:{},rawMaterials:[],getQuestProgress:()=>0,getQuestObjectiveProgress:()=>0,compact:true});
test("all five accepted quests have a direct click target and the chosen fifth quest is highlighted",()=>{
  const html=render(quests,quests[4].id);
  assert.equal((html.match(/data-track-combat-quest=/g)||[]).length,5);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  assert.match(html,/class="is-selected" data-track-combat-quest="quest_5" aria-pressed="true"/);
  for(const q of quests)assert.match(html,new RegExp(`title="${q.title}"`));
});
test("switching the tracked quest keeps the numbering stable and vacant slots cannot send a tracking request",()=>{
  for(const selected of [quests[0].id,quests[2].id]){
    const html=render(quests.slice(0,3),selected);
    const matches=[...html.matchAll(/data-track-combat-quest="([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(matches,quests.slice(0,3).map(q=>q.id));
    assert.equal((html.match(/disabled aria-label="Emplacement de quête/g)||[]).length,2);
  }
});
test("tracking the second real quest makes the next matching kill count for it instead of the first",()=>{
  const candidates=questCatalog.filter(q=>q.firmId==="astra" && (!q.category||q.category==="normal") && getQuestObjectives(q).some(o=>o.type==="kill" && o.target==="drone_pirate" && !o.requiresObjective && !o.requiresObjectives?.length && (o.zones||[o.zone]).includes("Helion-01")));
  assert.ok(candidates.length>=2);
  const [first,second]=candidates;
  const profile={firmId:"astra",level:30,activeQuestIds:[first.id,second.id],activeQuestId:first.id,questProgress:{},questFailProgress:{},completedQuestClaims:{},completedQuestIds:[]};
  assert.equal(trackServerQuest(profile,second.id).ok,true);
  const result=progressServerQuestKill(profile,{kind:"drone_pirate",zoneName:"Helion-01"});
  assert.equal(result.ok,true);
  assert.equal(result.updates.length,1);
  assert.equal(result.updates[0].questId,second.id);
  assert.deepEqual(profile.activeQuestIds,[first.id,second.id]);
});
