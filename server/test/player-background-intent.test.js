import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { createPlayerActivityManager } from "../src/world/playerActivity.js";

function baseState(overrides = {}){
  return {
    x:0,
    y:0,
    angle:0,
    hp:1000,
    maxHp:5000,
    shield:0,
    maxShield:0,
    vx:0,
    vy:0,
    enginePower:0,
    engineAngle:0,
    mapId:"0",
    shipId:"orion",
    speed:100,
    updatedAt:1000,
    ...overrides
  };
}

test("validated player state stores movement and attack intent", ()=>{
  const previous = baseState();
  const result = validatePlayerState({
    player:{id:"intent-player", mapId:"0", state:previous},
    profile:createDefaultProfile(),
    groups:new Map(),
    now:1050,
    payload:{
      ...previous,
      moveTarget:{x:400, y:200},
      attackTargetId:"W-0-E1",
      attackAmmoId:"ammo_x1",
      attackWeaponClass:"laser"
    }
  });

  assert.deepEqual(result.state.moveTarget, {x:400, y:200});
  assert.equal(result.state.attackTargetId, "W-0-E1");
  assert.equal(result.state.attackAmmoId, "ammo_x1");
  assert.equal(result.state.attackWeaponClass, "laser");
});

test("server advances movement intent only after client snapshots go stale", ()=>{
  const emitted = [];
  const saves = [];
  const player = {
    id:"background-player",
    connected:true,
    mapId:"0",
    mapRoom:"map:0",
    lastClientStateAt:1000,
    state:baseState({moveTarget:{x:300, y:0}})
  };
  const manager = createPlayerActivityManager({
    io:{
      to(room){
        return {
          emit(eventName, payload){
            emitted.push({room, eventName, payload});
          }
        };
      }
    },
    players:new Map([[player.id, player]]),
    profileManager:{
      saveWorldSession(payload){
        saves.push(payload);
      }
    },
    publicPlayer:entry=>({id:entry.id, state:entry.state}),
    applyEnemyHitForPlayer:null
  });

  manager.updatePlayerActivity(1, 1100);
  assert.equal(player.state.x, 0);
  assert.equal(emitted.length, 0);

  manager.updatePlayerActivity(1, 1300);
  assert.equal(player.state.x, 100);
  assert.equal(player.state.vx, 100);
  assert.equal(emitted.some(event=>event.eventName === "player:state-correction"), true);
  assert.equal(emitted.some(event=>event.eventName === "player:state"), true);
  assert.equal(saves.length, 1);
});

test("server repairs and regenerates shield while stale client is backgrounded", ()=>{
  const emitted = [];
  const saves = [];
  const profile = createDefaultProfile();
  profile.inventoryItems.push({uid:"inv_test_generator", itemId:"shield_gen"});
  profile.shipLoadouts.orion.generators[0] = "inv_test_generator";
  const player = {
    id:"background-repair-player",
    connected:true,
    mapId:"0",
    mapRoom:"map:0",
    lastClientStateAt:1000,
    lastServerDamageAt:1000,
    state:baseState({
      hp:1000,
      maxHp:5000,
      shield:0,
      maxShield:500,
      repairBotActive:true,
      updatedAt:1000
    })
  };
  const manager = createPlayerActivityManager({
    io:{
      to(room){
        return {
          emit(eventName, payload){
            emitted.push({room, eventName, payload});
          }
        };
      }
    },
    players:new Map([[player.id, player]]),
    profileManager:{
      getProfileForPlayer(){
        return profile;
      },
      saveWorldSession(payload){
        saves.push(payload);
      }
    },
    publicPlayer:entry=>({id:entry.id, state:entry.state}),
    applyEnemyHitForPlayer:null
  });

  manager.updatePlayerActivity(1, 7000);

  assert.equal(player.state.hp, 1050);
  assert.equal(player.state.shield, 15);
  assert.equal(player.state.repairBotActive, true);
  assert.equal(emitted.some(event=>event.eventName === "player:state-correction"), true);
  assert.equal(emitted.some(event=>event.eventName === "player:state"), true);
  assert.equal(saves.length, 1);
});

test("server auto repair starts while stale client is backgrounded", ()=>{
  const profile = createDefaultProfile();
  profile.inventoryItems.push({uid:"inv_test_auto_repair", itemId:"extra_repair_auto"});
  profile.shipLoadouts.orion.extras[1] = "inv_test_auto_repair";
  const player = {
    id:"background-auto-repair-player",
    connected:true,
    mapId:"0",
    mapRoom:"map:0",
    lastClientStateAt:1000,
    lastServerDamageAt:1000,
    state:baseState({
      hp:1000,
      maxHp:5000,
      repairBotActive:false,
      updatedAt:1000
    })
  };
  const manager = createPlayerActivityManager({
    io:{to(){ return {emit(){}}; }},
    players:new Map([[player.id, player]]),
    profileManager:{
      getProfileForPlayer(){
        return profile;
      },
      saveWorldSession(){}
    },
    publicPlayer:entry=>({id:entry.id, state:entry.state}),
    applyEnemyHitForPlayer:null
  });

  manager.updatePlayerActivity(1, 7000);

  assert.equal(player.state.hp, 1050);
  assert.equal(player.state.repairBotActive, true);
});
