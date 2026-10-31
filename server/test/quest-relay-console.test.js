import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { questCatalog, rawMaterialCatalog } from "../../src/data/progression.js";
import { ENEMY_TYPES } from "../../src/game/combatData/enemies.js";
import { renderSpawnPanelContent } from "../../src/game/ui/spawnPanel.js";
import { RELAY_ACTIVE_QUEST_LIMIT } from "../../src/game/ui/questRelayPanel.js";
import { relayObjectiveKey, questObjectives, relayObjectiveInfo } from "../../src/game/ui/questRelayObjectives.js";
import { getQuestBriefing } from "../../src/data/questBriefings.js";

const quest = id=>questCatalog.find(entry=>entry.id === id);
function render(q, extra = {}){
  return renderSpawnPanelContent({mode:"quests", quests:[q], selectedQuestId:q.id, playerLevel:30,
    rawMaterials:rawMaterialCatalog, enemyTypes:ENEMY_TYPES, getQuestProgress:()=>0,
    completedQuestClaims:{}, firmId:q.firmId || "astra", ...extra});
}

test("Velox mission explicitly asks for ownership with the real art and unabridged rewards", ()=>{
  const q = quest("quest_lv3_new_range");
  const {html} = render(q);
  assert.match(html, /Posséder un Velox/);
  assert.match(html, /assets\/ships\/Velox\.png/);
  assert.match(html, /23\s000/);
  assert.match(html, /3\s500/);
  assert.match(html, /<b>200<\/b>/);
  assert.match(html, /0 <small>\/ 1/);
  assert.match(html, /data-accept-quest="quest_lv3_new_range"/);
  assert.doesNotMatch(getQuestBriefing({quest:q}).message, /équipe-le/);
});

test("each objective uses its own canonical key and cannot be claimed using another objective's excess", ()=>{
  const q = quest("quest_lv3_one_step_after_another");
  const calls = [];
  const {html} = render(q, {activeQuests:[q], selectedQuestCategory:"active", getQuestProgress:()=>99,
    getQuestObjectiveProgress:(id,key)=>{ calls.push([id,key]); return key === "vorak" ? 99 : 0; }});
  assert.deepEqual(calls, q.objectives.map((o,i)=>[q.id,relayObjectiveKey(o,i)]));
  assert.match(html, /1 \/ 4 validés/);
  assert.match(html, /Rejoindre X -430 · Y 0/);
  assert.match(html, /Rejoindre X 170 · Y 120/);
  assert.doesNotMatch(html, /data-claim-quest=/);
  assert.match(html, /data-abandon-quest=/);
});

test("claimable and completed states have the appropriate action and full per-goal progress", ()=>{
  const q = quest("quest_lv3_prepare_future");
  const ready = render(q, {activeQuests:[q], selectedQuestCategory:"active", getQuestObjectiveProgress:()=>1}).html;
  assert.match(ready, /3 \/ 3 validés/);
  assert.match(ready, /data-claim-quest="quest_lv3_prepare_future"/);
  assert.doesNotMatch(ready, /data-accept-quest=/);
  const done = render(q, {completedQuestClaims:{[q.id]:true}, selectedQuestCategory:"completed"}).html;
  assert.match(done, /3 \/ 3 validés/);
  assert.match(done, /Récompenses déjà récupérées/);
  assert.doesNotMatch(done, /data-(?:claim|accept|abandon)-quest=/);
});

test("objective keys match canonical storage including legacy generated keys", ()=>{
  const store = fs.readFileSync(new URL("../../src/core/questProgressStore.js", import.meta.url), "utf8");
  const source = store.match(/export function getQuestObjectiveKey\(objective = \{\}, index = 0\)\{([\s\S]*?)\n\}/)[1];
  const canonicalKey = new Function("objective", "index", source);
  for(const q of questCatalog) questObjectives(q).forEach((o,i)=>assert.equal(relayObjectiveKey(o,i),canonicalKey(o,i)));
  assert.equal(RELAY_ACTIVE_QUEST_LIMIT, Number(store.match(/MAX_ACTIVE_QUESTS = (\d+)/)[1]));
});

test("available missions do not fabricate progress and capacity prevents offering a sixth mission", ()=>{
  const q = quest("quest_lv3_new_range");
  const {html} = render(q, {activeQuests:Array.from({length:5},(_,i)=>({id:`active-${i}`})), getQuestObjectiveProgress:()=>1});
  assert.match(html, /5 \/ 5 missions en cours/);
  assert.match(html, /0 <small>\/ 1/);
  assert.match(html, /5 missions déjà en cours/);
  assert.doesNotMatch(html, /data-accept-quest=/);
});

test("level, prerequisite and premium locks are explicit and cannot offer acceptance", ()=>{
  const q = quest("quest_lv3_new_range");
  const level = render(q, {playerLevel:1,showLockedQuests:true}).html;
  assert.match(level, /Atteins le niveau 3/);
  assert.doesNotMatch(level, /data-accept-quest=/);
  const prereq = render({...q,unlock:{type:"complete_quest",questId:"missing"}}, {showLockedQuests:true}).html;
  assert.match(prereq, /Termine d’abord/);
  assert.doesNotMatch(prereq, /data-accept-quest=/);
  const premium = render({...q,category:"weekly"}, {selectedQuestType:"weekly"}).html;
  assert.match(premium, /Premium actif/);
  assert.doesNotMatch(premium, /data-accept-quest=/);
});

test("each firm gets its own header, map, commander and authored objectives", ()=>{
  for(const [firm,label,map] of [["astra","Astra","Helion-01"],["cyan","Cygnus","Nereid-01"],["jaune","Solarys","Aureon-01"],["verte","Verdantis","Sylva-01"]]){
    const q = questCatalog.find(q=>(q.sourceQuestId || q.id) === "quest_lv3_new_range" && q.firmId === firm);
    const rendered = render(q, {firmId:firm});
    assert.ok(rendered.titleHtml.includes(label));
    assert.ok(rendered.titleHtml.includes(map));
    assert.match(rendered.html, /Posséder un Velox/);
  }
});

test("all catalog objectives have clear titles and all referenced illustrations exist", ()=>{
  for(const q of questCatalog){
    for(const o of questObjectives(q)){
      const info = relayObjectiveInfo(o, ENEMY_TYPES);
      assert.notEqual(info.title,"Accomplir la mission",`${q.id} ${o.type}`);
      if(info.image) assert.ok(fs.existsSync(new URL(`../../${info.image}`,import.meta.url)),info.image);
    }
    const {html} = render(q, {playerLevel:99,premiumActive:true,showLockedQuests:true,selectedQuestType:q.category || "normal"});
    assert.doesNotMatch(html, /undefined|NaN|>OBJECTIF</, q.id);
  }
});

test("quest and player text is escaped in the title, list, briefing and description", ()=>{
  const q = {...quest("quest_lv3_new_range"),title:'<script>alert("x")</script>',desc:'<img onerror="x">'};
  const {html,titleHtml} = render(q,{playerName:'<img src=x>',mapName:'<script>x</script>'});
  assert.doesNotMatch(html, /<script>|<img onerror/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.doesNotMatch(titleHtml, /<script>/);
});
