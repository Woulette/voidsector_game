import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { registerCombatHandlers } from "../src/socket/combatHandlers.js";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";

function createSocket(){
  const handlers = new Map();
  const emitted = [];
  return {
    handlers,
    emitted,
    on(eventName, handler){
      handlers.set(eventName, handler);
    },
    emit(eventName, payload){
      emitted.push({eventName, payload});
    }
  };
}

test("combat socket only accepts server-calculated fire and loot pickup", ()=>{
  const socket = createSocket();
  registerCombatHandlers(socket, {
    applyEnemyHit(){},
    applyPlayerHit(){},
    guard:()=>true,
    pickupLoot(){}
  });

  assert.deepEqual([...socket.handlers.keys()].sort(), ["combat:fire", "combat:fire-player", "loot:pickup"]);
  assert.equal(socket.handlers.has("enemy:hit"), false);
  assert.equal(socket.handlers.has("coop:enemy-hit"), false);
});

test("client combat command never sends a damage amount", ()=>{
  const emitted = [];
  const commands = createCombatCommands({
    multiplayer:{
      connected:true,
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });

  commands.sendServerEnemyHit("enemy-1", {
    weaponClass:"laser",
    ammoId:"ammo_x1",
    count:1
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].eventName, "combat:fire");
  assert.equal(Object.hasOwn(emitted[0].payload, "amount"), false);
  assert.equal(Object.hasOwn(emitted[0].payload, "serverCalculated"), false);
});

test("client pvp combat command never sends a damage amount", ()=>{
  const emitted = [];
  const commands = createCombatCommands({
    multiplayer:{
      connected:true,
      socket:{emit:(eventName, payload)=>emitted.push({eventName, payload})}
    }
  });

  commands.sendServerPlayerHit("player-2", {
    weaponClass:"laser",
    ammoId:"ammo_x1",
    count:1
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].eventName, "combat:fire-player");
  assert.equal(Object.hasOwn(emitted[0].payload, "amount"), false);
  assert.equal(Object.hasOwn(emitted[0].payload, "damage"), false);
});

test("combat:fire ignores a forged client damage amount", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  const player = {
    id:"security-test-forged-damage",
    state:{x:0, y:0, shipId:"orion"}
  };
  const enemy = {x:100, y:0};
  const ammoBefore = profile.ammoInventory.ammo_x1;

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy,
    payload:{
      weaponClass:"laser",
      ammoId:"ammo_x1",
      amount:999999999
    }
  });

  assert.equal(result.ok, true);
  assert.ok(result.damage === 0 || (result.damage >= 35 && result.damage <= 60));
  assert.notEqual(result.damage, 999999999);
  assert.equal(profile.ammoInventory.ammo_x1, ammoBefore - 1);
});

test("combat:fire rejects an out-of-range target without consuming ammo", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  const player = {
    id:"security-test-range",
    state:{x:0, y:0, shipId:"orion"}
  };
  const ammoBefore = profile.ammoInventory.ammo_x1;

  const result = resolveServerCombatFire({
    player,
    profile,
    enemy:{x:5000, y:0},
    payload:{weaponClass:"laser", ammoId:"ammo_x1"}
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /portee/i);
  assert.equal(profile.ammoInventory.ammo_x1, ammoBefore);
});
