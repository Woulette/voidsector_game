import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
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

test("firm season stores monster points only for the first-hit owner", async ()=>{
  const {events, io} = createIoRecorder();
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-war-"));
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", groupId:"g1", mapId:"0", profile:{player:{level:10, firmId:"astra"}}}],
    ["b", {id:"b", name:"Beta", connected:true, clientMode:"game", groupId:"g1", mapId:"0", profile:{player:{level:10, firmId:"cyan"}}}],
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
        profileKeyForPlayer:player=>`account:${player.id}`,
        applyReward({player}){ return player.profile; }
      },
      emitProfileSync(){}
    });

    manager.emitWorldReward({
      attackerId:"b",
      firmAttackerId:"a",
      mapId:"0",
      enemy:{id:"e1", kind:"sentinel_orb", type:"Orbe", level:5, reward:{credits:100, xp:100, premium:0}}
    });

    const astra = firmWarManager.snapshot().firms.find(firm=>firm.id === "astra");
    const cyan = firmWarManager.snapshot().firms.find(firm=>firm.id === "cyan");
    assert.equal(astra.points, 1);
    assert.equal(cyan.points, 0);
    assert.equal(firmWarManager.snapshot({playerKey:"account:a"}).personal.contribution, 1);
    assert.equal(firmWarManager.snapshot({playerKey:"account:b"}).personal.contribution, 0);
    assert.equal(events.some(entry=>entry.event === "firm:ranking" && entry.id === "*"), true);
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});

test("firm monster points ignore enemies more than eight levels below the rewarded player", async ()=>{
  const {io} = createIoRecorder();
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-war-"));
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", mapId:"0", profile:{player:{level:20, firmId:"astra"}}}]
  ]);
  try{
    const firmWarManager = createFirmWarManager({file:join(dir, "firmWar.json"), logger:{warn(){}}, now:()=>1000});
    await firmWarManager.load();
    const manager = createWorldRewardManager({
      io,
      players,
      groups:new Map(),
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
      enemy:{id:"e-low", kind:"drone_pirate", type:"Drone", level:10, reward:{credits:100, xp:100, premium:0}}
    });

    const astra = firmWarManager.snapshot().firms.find(firm=>firm.id === "astra");
    assert.equal(astra.points, 0);

    manager.emitWorldReward({
      attackerId:"a",
      mapId:"0",
      enemy:{id:"e-threshold", kind:"drone_pirate", type:"Drone", level:12, reward:{credits:100, xp:100, premium:0}}
    });

    const astraAfterThreshold = firmWarManager.snapshot().firms.find(firm=>firm.id === "astra");
    assert.equal(astraAfterThreshold.points, 1);

    manager.emitWorldReward({
      attackerId:"a",
      mapId:"0",
      enemy:{id:"e-higher", kind:"drone_pirate", type:"Drone", level:28, reward:{credits:100, xp:100, premium:0}}
    });

    const astraAfterHigher = firmWarManager.snapshot().firms.find(firm=>firm.id === "astra");
    assert.equal(astraAfterHigher.points, 2);
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});

test("low level monster kills still progress firm quests without direct firm point", async ()=>{
  const now = new Date(2026, 5, 12, 7).getTime();
  const {io} = createIoRecorder();
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-war-low-quest-"));
  const players = new Map([
    ["a", {id:"a", name:"Alpha", connected:true, clientMode:"game", mapId:"0", profile:{player:{level:50, firmId:"astra"}}}]
  ]);
  try{
    const firmWarManager = createFirmWarManager({file:join(dir, "firmWar.json"), logger:{warn(){}}, now:()=>now});
    await firmWarManager.load();
    const manager = createWorldRewardManager({
      io,
      players,
      groups:new Map(),
      firmWarManager,
      profileManager:{
        getProfileForPlayer:player=>player.profile,
        profileKeyForPlayer:()=>"account:a",
        applyReward({player}){ return player.profile; }
      },
      emitProfileSync(){}
    });

    manager.emitWorldReward({
      attackerId:"a",
      mapId:"0",
      enemy:{id:"e-low-orb", kind:"drone_pirate", type:"Orbe", level:1, reward:{credits:100, xp:100, premium:0}}
    });

    const snapshot = firmWarManager.snapshot({playerKey:"account:a", profile:players.get("a").profile});
    const astra = snapshot.firms.find(firm=>firm.id === "astra");
    const quest = snapshot.dailyQuests.find(entry=>entry.definitionId === "orbs");
    const seasonalOrb = snapshot.seasonObjectives.find(entry=>entry.id === "season-solo-orbs-50");
    assert.equal(astra.points, 0);
    assert.equal(snapshot.personal.contribution, 0);
    assert.equal(quest.firms.astra.progress, 1);
    assert.equal(quest.player.contribution, 1);
    assert.equal(seasonalOrb.progress, 1);
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

test("firm points persist in the database without touching the JSON fallback", async ()=>{
  const dir = await mkdtemp(join(tmpdir(), "voidsector-firm-war-db-"));
  const file = join(dir, "firmWar.json");
  let storedState = null;
  const database = {
    async query(text, params = []){
      if(text.includes("SELECT state_json")){
        return {rows:storedState ? [{state_json:storedState}] : []};
      }
      if(text.includes("INSERT INTO firm_war_state")){
        storedState = JSON.parse(params[0]);
        return {rows:[]};
      }
      throw new Error(`Unexpected query: ${text}`);
    }
  };

  try{
    const manager = createFirmWarManager({database, file, logger:{warn(){}}, now:()=>1000});
    await manager.load();
    manager.addFirmPoints("astra", 3);
    await new Promise(resolve=>setTimeout(resolve, 100));

    assert.equal(storedState.points.astra, 3);
    await assert.rejects(access(file), {code:"ENOENT"});
  }finally{
    await rm(dir, {recursive:true, force:true});
  }
});
