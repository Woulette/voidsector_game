import assert from "node:assert/strict";
import test from "node:test";
import { registerQuestHandlers } from "../src/socket/questHandlers.js";

function makeSocket(id = "socket-quest"){
  const handlers = new Map();
  const emitted = [];
  return {
    id,
    emitted,
    on(event, handler){
      handlers.set(event, handler);
    },
    emit(event, payload){
      emitted.push({event, payload});
    },
    trigger(event, payload){
      return handlers.get(event)?.(payload);
    }
  };
}

function installQuestHandler({player, progressProfileQuestAction = ()=>{}} = {}){
  const socket = makeSocket(player?.id || "socket-quest");
  registerQuestHandlers(socket, {
    emitProfileSync(){},
    guard(){ return true; },
    players:new Map([[socket.id, player]]),
    profileManager:{
      applyQuestAction(){
        return {ok:false, reason:"unused"};
      }
    },
    progressProfileQuestAction
  });
  return socket;
}

test("client quest progress cannot forge server-owned objective types", ()=>{
  const calls = [];
  const socket = installQuestHandler({
    player:{id:"socket-quest", mapId:"1", state:{x:4470, y:-3180, mapId:"1"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  for(const type of ["quest_item_drop", "space_caster_use", "refinery_module_upgrade_start", "refinery_material_upgrade_start"]){
    socket.trigger("quest:progress", {type, amount:100, itemId:"contaminated_sample", targetLevel:99});
  }

  assert.equal(calls.length, 0);
});

test("visit coordinate progress uses the trusted server position", ()=>{
  const calls = [];
  const socket = installQuestHandler({
    player:{id:"socket-quest", mapId:"1", state:{x:4300, y:-3300, mapId:"1"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  socket.trigger("quest:progress", {type:"visit_coordinates", zoneName:"Helion-05", x:0, y:0, amount:100});

  assert.equal(calls.length, 1);
  assert.equal(calls[0].zoneName, "Helion-02");
  assert.equal(calls[0].x, 4300);
  assert.equal(calls[0].y, -3300);
  assert.equal(calls[0].amount, 1);
});

test("npc quest progress is rejected when the player is too far", ()=>{
  const calls = [];
  const socket = installQuestHandler({
    player:{id:"socket-quest", mapId:"1", state:{x:0, y:0, mapId:"1"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  socket.trigger("quest:progress", {type:"talk_npc", npcId:"astra02_portal_mechanic", zoneName:"Helion-02"});

  assert.equal(calls.length, 0);
  assert.equal(socket.emitted.at(-1)?.event, "quest:error");
  assert.match(socket.emitted.at(-1)?.payload?.message || "", /trop loin/i);
});

test("npc quest progress uses trusted map and npc when the player is nearby", ()=>{
  const calls = [];
  const socket = installQuestHandler({
    player:{id:"socket-quest", mapId:"1", state:{x:4470, y:-3180, mapId:"1"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  socket.trigger("quest:progress", {
    type:"deliver_item",
    itemId:"teleportation_fluid",
    npcId:"astra02_portal_mechanic",
    zoneName:"Helion-05"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "deliver_item");
  assert.equal(calls[0].itemId, "teleportation_fluid");
  assert.equal(calls[0].npcId, "astra02_portal_mechanic");
  assert.equal(calls[0].zoneName, "Helion-02");
});

test("mission control progress uses the trusted current map without requiring ship proximity", ()=>{
  const farCalls = [];
  const farFromStation = installQuestHandler({
    player:{id:"socket-quest", mapId:"0", state:{x:0, y:0, mapId:"0"}},
    progressProfileQuestAction(_socket, action){
      farCalls.push(action);
    }
  });

  farFromStation.trigger("quest:progress", {type:"mission_control", stationId:"quests", zoneName:"Helion-01"});
  assert.equal(farCalls.length, 1);
  assert.equal(farCalls[0].type, "mission_control");
  assert.equal(farCalls[0].stationId, "quests");
  assert.equal(farCalls[0].zoneName, "Helion-01");

  const calls = [];
  const accepted = installQuestHandler({
    player:{id:"socket-quest", mapId:"0", state:{x:-3700, y:3000, mapId:"0"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  accepted.trigger("quest:progress", {type:"mission_control", stationId:"forged", zoneName:"Helion-05"});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "mission_control");
  assert.equal(calls[0].stationId, "quests");
  assert.equal(calls[0].zoneName, "Helion-01");
});

test("mission control trusts the validated state map when the cached player map is stale", ()=>{
  const calls = [];
  const staleCachedMap = installQuestHandler({
    player:{id:"socket-quest", mapId:"0", state:{x:-3700, y:-3000, mapId:"20"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  staleCachedMap.trigger("quest:progress", {type:"mission_control", stationId:"quests", zoneName:"Helion-01"});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].stationId, "quests");
  assert.equal(calls[0].zoneName, "Nereid-01");
});

test("Helion-05 mission control uses its dedicated relay map without ship proximity", ()=>{
  const calls = [];
  const relay = installQuestHandler({
    player:{id:"socket-quest", mapId:"4", state:{x:-4300, y:3300, mapId:"4"}},
    progressProfileQuestAction(_socket, action){
      calls.push(action);
    }
  });

  relay.trigger("quest:progress", {type:"mission_control", stationId:"forged", zoneName:"Helion-01"});

  assert.equal(calls.length, 1);
  assert.equal(calls[0].stationId, "quests");
  assert.equal(calls[0].zoneName, "Helion-05");

  const outsideCalls = [];
  const outsideRelay = installQuestHandler({
    player:{id:"socket-quest", mapId:"4", state:{x:-3500, y:3300, mapId:"4"}},
    progressProfileQuestAction(_socket, action){
      outsideCalls.push(action);
    }
  });

  outsideRelay.trigger("quest:progress", {type:"mission_control", stationId:"quests"});
  assert.equal(outsideCalls.length, 1);
  assert.equal(outsideCalls[0].stationId, "quests");
  assert.equal(outsideCalls[0].zoneName, "Helion-05");
});
