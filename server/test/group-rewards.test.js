import assert from "node:assert/strict";
import test from "node:test";
import { createKillQuestProgress } from "../src/quests/killProgress.js";
import { createWorldRewardManager } from "../src/world/rewards.js";

function createIoRecorder(){
  const events = [];
  return {
    events,
    io:{
      to:id=>({
        emit:(event, payload)=>events.push({id, event, payload})
      })
    }
  };
}

test("group monster rewards are split between same-map members only", ()=>{
  const {events, io} = createIoRecorder();
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", groupId:"g1", mapId:"0", profile:{player:{level:10}}}],
    ["b", {id:"b", name:"Beta", connected:true, clientMode:"game", groupId:"g1", mapId:"0", profile:{player:{level:10}}}],
    ["c", {id:"c", name:"Gamma", connected:true, clientMode:"game", groupId:"g1", mapId:"1", profile:{player:{level:10}}}]
  ]);
  const groups = new Map([["g1", {id:"g1", members:["a", "b", "c"]}]]);
  const applied = [];
  const manager = createWorldRewardManager({
    io,
    players,
    groups,
    profileManager:{
      getProfileForPlayer:player=>player.profile,
      applyReward({player, reward}){
        applied.push({playerId:player.id, reward});
        return player.profile;
      }
    },
    emitProfileSync(){}
  });

  manager.emitWorldReward({
    attackerId:"a",
    mapId:"0",
    enemy:{id:"e1", kind:"sentinel_orb", type:"Orbe", level:5, reward:{credits:900, xp:300, premium:3}}
  });

  const rewardEvents = events.filter(entry=>entry.event === "player:reward");
  assert.deepEqual(rewardEvents.map(entry=>entry.id).sort(), ["a", "b"]);
  assert.equal(rewardEvents[0].payload.credits, 450);
  assert.equal(rewardEvents[0].payload.xp, 150);
  assert.equal(rewardEvents[1].payload.credits, 450);
  assert.equal(rewardEvents[1].payload.xp, 150);
  assert.deepEqual(applied.map(entry=>entry.playerId).sort(), ["a", "b"]);
  assert.equal(applied.find(entry=>entry.playerId === "c"), undefined);
});

test("group kill quest progress applies to same-map members only", ()=>{
  const {events, io} = createIoRecorder();
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", groupId:"g1", mapId:"0"}],
    ["b", {id:"b", name:"Beta", connected:true, clientMode:"game", groupId:"g1", mapId:"0"}],
    ["c", {id:"c", name:"Gamma", connected:true, clientMode:"game", groupId:"g1", mapId:"1"}]
  ]);
  const groups = new Map([["g1", {id:"g1", members:["a", "b", "c"]}]]);
  const progressed = [];
  const manager = createKillQuestProgress({
    io,
    players,
    groups,
    profileManager:{
      applyQuestAction({player, action}){
        progressed.push({playerId:player.id, action});
        return {
          ok:true,
          updates:[{id:"quest_test", questId:"quest_test", delta:1, progress:1, target:5}],
          claimedQuests:[],
          profile:{}
        };
      }
    },
    emitProfileSync(){},
    emitQuestClaims(){}
  });

  manager.progressServerQuestsForKill({
    attackerId:"a",
    mapId:"0",
    enemy:{id:"e1", kind:"sentinel_orb"}
  });

  assert.deepEqual(progressed.map(entry=>entry.playerId).sort(), ["a", "b"]);
  assert.deepEqual(events.filter(entry=>entry.event === "quest:progress").map(entry=>entry.id).sort(), ["a", "b"]);
  assert.equal(progressed.some(entry=>entry.playerId === "c"), false);
});
