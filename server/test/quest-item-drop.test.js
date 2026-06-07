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
    assert.equal(socketEvents.some(entry=>entry.event === "quest:progress"), true);
    assert.equal(socketEvents.some(entry=>entry.event === "quest:claimed"), true);
    assert.equal(profiles.get("Pilot").completedQuestClaims[quest.id], true);
  }finally{
    Math.random = previousRandom;
  }
});
