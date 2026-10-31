import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeQuest, buildHomeRanking } from "../../src/ui/homePresentation.js";

test("home uses authoritative positions, includes the player's row outside the top three, and never invents a rank", ()=>{
  const ranking = buildHomeRanking({rows:[
    {key:"account:other",name:"Other",position:1,points:300},
    {key:"account:self",name:"Pilot",position:147,points:12,rankId:"marechal"},
    {key:"account:two",name:"Second",position:2,points:200},
    {key:"account:three",name:"Third",position:3,points:100}
  ]}, {accountId:"self",name:"Pilot",connected:true});
  assert.deepEqual(ranking.top.map(row=>row.position),[1,2,3]);
  assert.equal(ranking.player.position,147);
  assert.equal(ranking.player.points,12);
  assert.equal(ranking.player.rankId,"marechal","the badge must preserve the server's competitive grade rather than infer it from points");
  assert.equal(buildHomeRanking({rows:[{key:"account:old",name:"Pilot",isPlayer:true}]},{accountId:"new",name:"Pilot",connected:true}).player,null);
});

test("loading, empty and disconnected rankings contain no preview opponents", ()=>{
  assert.deepEqual(buildHomeRanking(null,{connected:true}),{status:"loading",top:[],player:null});
  assert.deepEqual(buildHomeRanking(null),{status:"offline",top:[],player:null});
  assert.equal(buildHomeRanking({rows:[]},{connected:true}).top.length,0);
  const cached = buildHomeRanking({rows:[{name:"Pilot",points:10,position:1}]});
  assert.equal(cached.status,"cached");
  assert.equal(cached.top[0].points,10);
});

test("a multi-objective quest keeps its unfinished objective and does not let surplus kills finish a visit", ()=>{
  const quest = {id:"mission",title:"Mission",objectives:[{id:"kills",label:"Kills",count:10},{id:"visit",label:"Visit",count:1}]};
  const model = buildHomeQuest(quest,(_id,objective)=>objective.id === "kills" ? 99 : 0);
  assert.equal(model.percent,50);
  assert.equal(model.complete,false);
  assert.equal(model.current.label,"Visit");
  assert.equal(model.objectives[0].progress,10);
});

test("quest summaries handle a completed single objective, absent quests and invalid progress", ()=>{
  assert.equal(buildHomeQuest(null,()=>0),null);
  const quest = {id:"mission",title:"Mission",objective:{label:"Vorak",count:3}};
  const finished = buildHomeQuest(quest,()=>3);
  assert.equal(finished.complete,true);
  assert.equal(finished.percent,100);
  assert.equal(buildHomeQuest(quest,()=>NaN).percent,0);
});
