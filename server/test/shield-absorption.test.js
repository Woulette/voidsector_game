import assert from "node:assert/strict";
import test from "node:test";
import { equipment } from "../../src/data/equipment.js";
import { getShipCombatStats } from "../../src/core/combatStatsStore.js";
import { normalizeState, store } from "../../src/core/store.js";
import { calculateShieldAbsorbRatio } from "../../src/shared/shieldAbsorption.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createPresenceManager } from "../src/players/presence.js";
import { getTrustedShieldAbsorbRatio, validatePlayerState } from "../src/players/playerStateValidation.js";

function equipShieldGenerators(profile, itemIds, shipId = "orion"){
  const uids = itemIds.map((itemId, index)=>`shield_absorb_${itemId}_${index}`);
  profile.inventoryItems.push(...uids.map((uid, index)=>({uid, itemId:itemIds[index]})));
  profile.shipLoadouts[shipId] = {
    ...(profile.shipLoadouts[shipId] || {}),
    lasers:profile.shipLoadouts[shipId]?.lasers || [],
    generators:uids,
    extras:profile.shipLoadouts[shipId]?.extras || []
  };
  return uids;
}

test("shield generators expose their requested absorption rates", ()=>{
  const shieldAI = equipment.find(item=>item.id === "shield_gen");
  const shieldAII = equipment.find(item=>item.id === "shield_omega");

  assert.equal(shieldAI.effect.shieldAbsorbRatio, 0.55);
  assert.equal(shieldAII.effect.shieldAbsorbRatio, 0.60);
  assert.equal(shieldAI.stats.absorption, "55%");
  assert.equal(shieldAII.stats.absorption, "60%");
});

test("mixed shield absorption is weighted by contributed shield capacity", ()=>{
  assert.ok(Math.abs(calculateShieldAbsorbRatio([
    {capacity:500, ratio:0.55},
    {capacity:1200, ratio:0.60}
  ]) - 0.5852941176470589) < 1e-12);
});

test("client and server calculate the same equipped shield absorption", ()=>{
  const profile = createDefaultProfile();
  profile.activeShip = "velox";
  profile.ownedShips.push("velox");
  equipShieldGenerators(profile, ["shield_gen", "shield_omega"], "velox");
  const serverRatio = getTrustedShieldAbsorbRatio(profile);
  const previousState = store.state;
  try{
    store.state = normalizeState(profile);
    const clientRatio = getShipCombatStats("velox").shieldAbsorbRatio;
    assert.ok(Math.abs(clientRatio - serverRatio) < 1e-12);
  }finally{
    store.state = previousState;
  }
});

test("validated player state uses the server shield absorption rate", ()=>{
  const profile = createDefaultProfile();
  equipShieldGenerators(profile, ["shield_gen"]);
  const result = validatePlayerState({
    player:{id:"shield-absorb-state", mapId:"0", state:null},
    profile,
    groups:new Map(),
    now:1000,
    payload:{x:-4300, y:3300, mapId:"0", shipId:"orion"}
  });

  assert.equal(result.state.shieldAbsorbRatio, 0.55);
});

test("player damage uses the equipped absorption instead of the old fixed eighty percent", ()=>{
  const presence = createPresenceManager({
    io:{sockets:{sockets:new Map()}, to:()=>({emit(){}})},
    players:new Map(),
    emitPlayers(){},
    config:{}
  });
  const player = presence.createPlayer("shield-absorb-damage");
  player.state = {
    hp:1000,
    maxHp:1000,
    shield:1000,
    maxShield:1000,
    shieldAbsorbRatio:0.55
  };

  presence.applyDamageToPlayerState(player, 100, 1000);

  assert.equal(player.state.shield, 945);
  assert.equal(player.state.hp, 955);
});
