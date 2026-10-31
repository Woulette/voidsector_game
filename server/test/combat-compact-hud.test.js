import assert from "node:assert/strict";
import test from "node:test";
import { renderCombatQuestTracker } from "../../src/game/ui/questTracker.js";
import { ENEMY_TYPES } from "../../src/game/combatData/enemies.js";

const quest={id:"compact-combat",title:"Patrouille",objectives:[
  {id:"kill",type:"kill",target:"raider_astral",count:3,zones:["Helion-01","Helion-02"]},
  {id:"position",type:"visit_coordinates",x:170,y:120,count:1,zones:["Helion-01","Helion-02"],requiresObjective:"kill"}
],rewards:{credits:23000,premium:200,xp:3500}};
const render=(q=quest,more={})=>renderCombatQuestTracker({activeQuests:[q],trackedQuest:q,selectedQuestId:q.id,detailTab:"quest",enemyTypes:ENEMY_TYPES,rawMaterials:[],getQuestProgress:()=>1,getQuestObjectiveProgress:()=>1,compact:true,...more});
test("compact tracker shares the zone while retaining the real monster asset and prerequisite lock",()=>{
  const html=render();
  assert.equal((html.match(/Helion-01 \/ Helion-02/g)||[]).length,1);
  assert.match(html,/low_vorak_03\.png/);
  assert.match(html,/quest-enemy-art-large/);
  assert.match(html,/combat-quest-objective-row locked/);
  assert.doesNotMatch(html,/combat-quest-slots|combat-quest-detail-tabs/);
});
test("compact tracker keeps distinct objective locations instead of inventing a shared one",()=>{
  const html=render({...quest,objectives:[{...quest.objectives[0],zones:["Helion-01"]},{...quest.objectives[1],zones:["Helion-02"]}]});
  assert.doesNotMatch(html,/combat-quest-common-zone/);
  assert.match(html,/Helion-01/);assert.match(html,/Helion-02/);
});
test("closing details never hides damage, time or death failure conditions",()=>{
  const q={...quest,failConditions:{hpLossLimit:3000,timeLimit:180,deathResets:true}};
  const html=render(q,{questFailProgress:{[q.id]:{hpLost:400,timeElapsed:20}}});
  assert.match(html,/Vie perdue max/);assert.match(html,/400\/3[\s\u202f\u00a0]?000/);
  assert.match(html,/Temps max/);assert.match(html,/2:40/);assert.match(html,/Ne pas mourir/);
  assert.doesNotMatch(html,/combat-quest-expanded/);
});
test("expanded compact details retain objectives, canonical rewards, description and abandonment",()=>{
  const html=render({...quest,desc:"Mission de patrouille"},{detailTab:"rewards"});
  assert.match(html,/low_vorak_03\.png/);assert.match(html,/combat-quest-expanded/);
  assert.match(html,/23[\s\u202f\u00a0]?000|23k/i);assert.match(html,/Mission de patrouille/);
  assert.match(html,/data-abandon-quest/);
});
