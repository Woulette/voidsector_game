import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { acceptServerQuest, getQuest } from "../src/quests/questState.js";
import { createWorldLootManager } from "../src/world/loot.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { getLootCollectionHoverPoint } from "../../src/shared/lootCollection.js";

function collect(manager, socket, id){
  manager.pickupLoot(socket, {id, phase:"start"});
  const deadline = Date.now() + 700;
  manager.pickupLoot(socket, {id, phase:"finish"});
  manager.cleanupExpiredLootDrops(deadline);
}

function fixture({firm = "astra", group = false, legacy = false} = {}){
  const questId = `quest_lv10_maintenance_impossible${firm === "astra" ? "" : `_${firm}`}`;
  const quest = getQuest(questId);
  const mapId = String(Object.values(WORLD_MAPS).find(map=>map.name === quest.objectives[1].zone).id);
  const players = new Map();
  const profiles = new Map();
  for(const id of group ? ["p1", "p2"] : ["p1"]){
    const profile = createDefaultProfile();
    profile.player.level = 10;
    profile.player.firmId = firm;
    profile.tutorial.status = "abandoned";
    assert.equal(acceptServerQuest(profile, questId).ok, true);
    if(legacy) delete profile.questFailProgress[questId].runId;
    profile.questProgress[questId] = {talk_start:1};
    profiles.set(id, profile);
    players.set(id, {id, accountId:id, groupId:group ? "g1" : null, mapId, state:{hp:100, mapId, x:100, y:100}});
  }
  const actions = createProfileActions({profiles, persist(){}, getExistingProfile:player=>({key:player.id, profile:profiles.get(player.id)})});
  const events = [];
  const manager = createWorldLootManager({
    io:{to:id=>({emit:(event, payload)=>events.push({id, event, payload})})}, players,
    getGroups:()=>new Map([["g1", {id:"g1", members:["p1", "p2"]}]]),
    profileManager:{getProfileForPlayer:player=>profiles.get(player.id), applyQuestAction:actions.applyQuestAction},
    emitProfileSync(){}
  });
  const socket = {id:"p1", emit:(event, payload)=>events.push({id:"p1", event, payload})};
  function drop(){
    const prior = events.length;
    const random = Math.random;
    Math.random = ()=>0;
    try{
      manager.emitPrivateQuestItemDrop({ownerId:"p1", mapId, enemy:{kind:"cuirasse_nebulaire", x:100, y:100}});
    }finally{ Math.random = random; }
    const emitted = events.slice(prior).find(entry=>entry.event === "loot:drop")?.payload;
    assert.ok(emitted);
    Object.assign(players.get("p1").state, getLootCollectionHoverPoint(emitted, WORLD_MAPS[mapId]));
    return emitted;
  }
  async function action(kind){
    const result = actions.applyQuestAction({player:players.get("p1"), action:{kind, questId}});
    assert.equal(result.ok, true, result.reason);
    await result.save;
    return result;
  }
  return {questId, profiles, players, manager, socket, drop, action};
}

for(const firm of ["astra", "cyan", "jaune", "verte"]){
  test(`${firm}: a ground quest item from an abandoned attempt cannot advance the new attempt`, async ()=>{
    const f = fixture({firm});
    const oldDrop = f.drop();
    const oldRun = f.profiles.get("p1").questFailProgress[f.questId].runId;
    await f.action("abandon");
    await f.action("accept");
    const profile = f.profiles.get("p1");
    assert.notEqual(profile.questFailProgress[f.questId].runId, oldRun);
    profile.questProgress[f.questId] = {talk_start:1};
    collect(f.manager, f.socket, oldDrop.id);
    assert.equal(profile.questProgress[f.questId].stabilisateurs, undefined);
    const newDrop = f.drop();
    collect(f.manager, f.socket, newDrop.id);
    assert.equal(f.profiles.get("p1").questProgress[f.questId].stabilisateurs, 1);
    collect(f.manager, f.socket, newDrop.id);
    assert.equal(f.profiles.get("p1").questProgress[f.questId].stabilisateurs, 1);
  });
}

test("one member abandoning does not remove the group's original quest item from other eligible members", async ()=>{
  const f = fixture({group:true});
  const oldDrop = f.drop();
  await f.action("abandon");
  collect(f.manager, f.socket, oldDrop.id);
  assert.equal(f.profiles.get("p1").questProgress[f.questId], undefined);
  assert.equal(f.profiles.get("p2").questProgress[f.questId].stabilisateurs, 1);
});

test("an old active profile without a run ID can collect its existing drop after profile reload", ()=>{
  const f = fixture({legacy:true});
  const oldDrop = f.drop();
  f.profiles.set("p1", structuredClone(f.profiles.get("p1")));
  collect(f.manager, f.socket, oldDrop.id);
  assert.equal(f.profiles.get("p1").questProgress[f.questId].stabilisateurs, 1);
});

test("abandoning a legacy attempt invalidates its ground drops after accepting again", async ()=>{
  const f = fixture({legacy:true});
  const oldDrop = f.drop();
  await f.action("abandon");
  await f.action("accept");
  f.profiles.get("p1").questProgress[f.questId] = {talk_start:1};
  collect(f.manager, f.socket, oldDrop.id);
  assert.equal(f.profiles.get("p1").questProgress[f.questId].stabilisateurs, undefined);
});

test("persisting and reloading a current attempt preserves its run ID and pickup eligibility", ()=>{
  const f = fixture();
  const oldDrop = f.drop();
  const runId = f.profiles.get("p1").questFailProgress[f.questId].runId;
  f.profiles.set("p1", JSON.parse(JSON.stringify(f.profiles.get("p1"))));
  collect(f.manager, f.socket, oldDrop.id);
  assert.equal(f.profiles.get("p1").questFailProgress[f.questId].runId, runId);
  assert.equal(f.profiles.get("p1").questProgress[f.questId].stabilisateurs, 1);
});
