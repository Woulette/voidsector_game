import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { createFirmWarManager, FIRM_REWARD_MS, FIRM_SEASON_MS } from "../src/firms/firmWar.js";
import { createWorldRewardManager } from "../src/world/rewards.js";

function createIoRecorder(){
  const events = [];
  return {
    events,
    io:{
      emit:(event, payload)=>events.push({id:"*", event, payload}),
      to:id=>({
        emit:(event, payload)=>events.push({id, event, payload})
      })
    }
  };
}

test("firm season stores monster points per same-map rewarded group member", async ()=>{
  const {events, io} = createIoRecorder();
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-war-"));
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", groupId:"g1", mapId:"0", profile:{player:{level:10, firmId:"astra"}}}],
    ["b", {id:"b", name:"Beta", connected:true, clientMode:"game", groupId:"g1", mapId:"0", profile:{player:{level:10, firmId:"astra"}}}],
    ["c", {id:"c", name:"Gamma", connected:true, clientMode:"game", groupId:"g1", mapId:"1", profile:{player:{level:10, firmId:"astra"}}}]
  ]);
  const groups = new Map([["g1", {id:"g1", members:["a", "b", "c"]}]]);
  try{
    const firmWarManager = createFirmWarManager({file:join(dir, "firmWar.json"), logger:{warn(){}}, now:()=>1000});
    await firmWarManager.load();
    const manager = createWorldRewardManager({
      io,
      players,
      groups,
      firmWarManager,
      profileManager:{
        getProfileForPlayer:player=>player.profile,
        applyReward({player}){ return player.profile; }
      },
      emitProfileSync(){}
    });

    manager.emitWorldReward({
      attackerId:"a",
      mapId:"0",
      enemy:{id:"e1", kind:"sentinel_orb", type:"Orbe", level:5, reward:{credits:100, xp:100, premium:0}}
    });

    const astra = firmWarManager.snapshot().firms.find(firm=>firm.id === "astra");
    assert.equal(astra.points, 2);
    assert.equal(events.some(entry=>entry.event === "firm:ranking" && entry.id === "*"), true);
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});

test("firm season closes with weekly reward multipliers", async ()=>{
  let now = 10_000;
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-war-"));
  try{
    const manager = createFirmWarManager({file:join(dir, "firmWar.json"), logger:{warn(){}}, now:()=>now});
    await manager.load();
    manager.addFirmPoints("astra", 50);
    manager.addFirmPoints("cyan", 30);
    now += FIRM_SEASON_MS + 1;
    const snapshot = manager.snapshot();
    const astra = snapshot.firms.find(firm=>firm.id === "astra");
    const cyan = snapshot.firms.find(firm=>firm.id === "cyan");
    assert.equal(manager.getRewardMultiplier("astra"), 0.25);
    assert.equal(manager.getRewardMultiplier("cyan"), 0.15);
    assert.equal(astra.rewardEndsAt, now + FIRM_REWARD_MS);
    assert.equal(cyan.rewardRank, 2);
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});
