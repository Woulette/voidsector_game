import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";
import { getQuest } from "../src/quests/questState.js";
import { createWorldLootManager } from "../src/world/loot.js";

test("contaminated sample quest drop is 20 percent", ()=>{
  const quest = getQuest("quest_lv4_contaminated_samples");
  assert.equal(quest.objective.itemId, "contaminated_sample");
  assert.equal(quest.objective.dropChance, 0.20);
});

test("server emits and validates contaminated sample ground pickup", ()=>{
  const previousRandom = Math.random;
  Math.random = ()=>0;
  try{
    const events = [];
    const socketEvents = [];
    const socket = {
      id:"p1",
      emit:(event, payload)=>socketEvents.push({event, payload})
    };
    const player = {
      id:"p1",
      name:"Pilot",
      connected:true,
      clientMode:"game",
      mapId:"1",
      state:{mapId:"1", x:0, y:0}
    };
    const players = new Map([[player.id, player]]);
    const profile = createDefaultProfile();
    const quest = getQuest("quest_lv4_contaminated_samples");
    profile.activeQuestIds = [quest.id];
    profile.activeQuestId = quest.id;
    profile.questProgress[quest.id] = 0;
    const profiles = new Map([["Pilot", profile]]);
    const actions = createProfileActions({
      profiles,
      persist(){},
      getExistingProfile(){ return {key:"Pilot", profile:profiles.get("Pilot")}; }
    });
    const manager = createWorldLootManager({
      io:{to:id=>({emit:(event, payload)=>events.push({id, event, payload})})},
      players,
      profileManager:{
        getProfileForPlayer:()=>profiles.get("Pilot"),
        applyQuestAction:actions.applyQuestAction,
        updateProfileForPlayer:()=>({ok:false, reason:"not used"})
      },
      emitProfileSync(){}
    });

    manager.emitPrivateQuestItemDrop({
      ownerId:player.id,
      mapId:"1",
      enemy:{id:"e1", kind:"chasseur_spectral", x:120, y:80}
    });
    const drop = events.find(entry=>entry.event === "loot:drop")?.payload;
    assert.equal(drop.kind, "questItem");
    assert.equal(drop.itemId, "contaminated_sample");
    assert.equal(drop.serverControlled, true);

    player.state = {mapId:"1", x:drop.x, y:drop.y};
    manager.pickupLoot(socket, {id:drop.id});

    assert.equal(socketEvents.some(entry=>entry.event === "loot:picked" && entry.payload.itemId === "contaminated_sample"), true);
    assert.equal(events.some(entry=>entry.id === "p1" && entry.event === "quest:progress"), true);
    assert.equal(events.some(entry=>entry.id === "p1" && entry.event === "quest:claimed"), true);
    assert.equal(profiles.get("Pilot").completedQuestClaims[quest.id], true);
  }finally{
    Math.random = previousRandom;
  }
});

function createGroupDropFixture(){
  const events = [];
  const socketEvents = [];
  const players = new Map([
    ["p1", {id:"p1", name:"Pilot One", connected:true, clientMode:"game", groupId:"g1", mapId:"3", state:{mapId:"3", x:0, y:0}}],
    ["p2", {id:"p2", name:"Pilot Two", connected:true, clientMode:"game", groupId:"g1", mapId:"0", state:{mapId:"0", x:0, y:0}}]
  ]);
  const groups = new Map([["g1", {id:"g1", members:["p1", "p2"]}]]);
  const profiles = new Map([
    ["Pilot One", createDefaultProfile()],
    ["Pilot Two", createDefaultProfile()]
  ]);
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile(player){ return {key:player.name, profile:profiles.get(player.name)}; }
  });
  const manager = createWorldLootManager({
    io:{to:id=>({emit:(event, payload)=>events.push({id, event, payload})})},
    players,
    getGroups:()=>groups,
    profileManager:{
      getProfileForPlayer:player=>profiles.get(player.name),
      applyQuestAction:actions.applyQuestAction,
      updateProfileForPlayer:()=>({ok:false, reason:"not used"})
    },
    emitProfileSync(player, profile){
      events.push({id:player.id, event:"profile:sync", payload:profile});
    }
  });
  const socket = {
    id:"p1",
    emit:(event, payload)=>socketEvents.push({event, payload})
  };
  return {events, manager, players, profiles, socket, socketEvents};
}

function activateQuest(profile, questId, progress = 0){
  profile.activeQuestIds = [questId];
  profile.activeQuestId = questId;
  profile.questProgress[questId] = progress;
}

test("a contaminated sample found by one player progresses eligible group members", ()=>{
  const previousRandom = Math.random;
  Math.random = ()=>0;
  try{
    const fixture = createGroupDropFixture();
    const quest = getQuest("quest_lv4_contaminated_samples");
    activateQuest(fixture.profiles.get("Pilot Two"), quest.id);
    fixture.players.get("p1").mapId = "1";
    fixture.players.get("p1").state.mapId = "1";

    fixture.manager.emitPrivateQuestItemDrop({
      ownerId:"p1",
      mapId:"1",
      enemy:{id:"sample-enemy", kind:"chasseur_spectral", x:120, y:80}
    });
    const drop = fixture.events.find(entry=>entry.id === "p1" && entry.event === "loot:drop")?.payload;
    assert.equal(drop.itemId, "contaminated_sample");

    fixture.players.get("p1").state = {mapId:"1", x:drop.x, y:drop.y};
    fixture.manager.pickupLoot(fixture.socket, {id:drop.id});

    assert.equal(fixture.profiles.get("Pilot Two").completedQuestClaims[quest.id], true);
    assert.equal(Boolean(fixture.profiles.get("Pilot One").completedQuestClaims[quest.id]), false);
    assert.equal(fixture.events.some(entry=>entry.id === "p2" && entry.event === "quest:progress"), true);
  }finally{
    Math.random = previousRandom;
  }
});

test("one stabilizer pickup progresses every eligible group member even on another map", ()=>{
  const previousRandom = Math.random;
  Math.random = ()=>0;
  try{
    const fixture = createGroupDropFixture();
    const questId = "quest_lv10_maintenance_impossible";
    for(const profile of fixture.profiles.values()){
      profile.player.level = 10;
      activateQuest(profile, questId, {talk_start:1});
    }

    fixture.manager.emitPrivateQuestItemDrop({
      ownerId:"p1",
      mapId:"3",
      enemy:{id:"stabilizer-enemy", kind:"cuirasse_nebulaire", x:120, y:80}
    });
    const drop = fixture.events.find(entry=>entry.id === "p1" && entry.event === "loot:drop")?.payload;
    assert.equal(drop.itemId, "stabilisateur_dimensionnel");

    fixture.players.get("p1").state = {mapId:"3", x:drop.x, y:drop.y};
    fixture.manager.pickupLoot(fixture.socket, {id:drop.id});

    assert.equal(fixture.profiles.get("Pilot One").questProgress[questId].stabilisateurs, 1);
    assert.equal(fixture.profiles.get("Pilot Two").questProgress[questId].stabilisateurs, 1);
    assert.deepEqual(
      fixture.events.filter(entry=>entry.event === "quest:progress").map(entry=>entry.id).sort(),
      ["p1", "p2"]
    );
  }finally{
    Math.random = previousRandom;
  }
});

test("group quest item drops keep one shared chance roll per defeated monster", ()=>{
  const previousRandom = Math.random;
  let randomCalls = 0;
  Math.random = ()=>{
    randomCalls += 1;
    return 0.16;
  };
  try{
    const fixture = createGroupDropFixture();
    const questId = "quest_lv10_maintenance_impossible";
    for(const profile of fixture.profiles.values()){
      profile.player.level = 10;
      activateQuest(profile, questId, {talk_start:1});
    }

    fixture.manager.emitPrivateQuestItemDrop({
      ownerId:"p1",
      mapId:"3",
      enemy:{id:"shared-roll-enemy", kind:"cuirasse_nebulaire", x:120, y:80}
    });

    assert.equal(fixture.events.some(entry=>entry.event === "loot:drop"), false);
    assert.equal(randomCalls, 1);
  }finally{
    Math.random = previousRandom;
  }
});
