import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAuthoritativeCombatAmmo,
  applyAuthoritativeRewardProgression,
  getNpcDamageDisplayAmount
} from "../../src/game/systems/combatServerEvents.js";

test("combat hit applies the authoritative remaining ammunition for the local attacker", ()=>{
  const ammoInventory = {ammo_x1:500};
  const changed = applyAuthoritativeCombatAmmo({
    event:{
      attackerId:"player-1",
      ammoId:"ammo_x1",
      consumed:4,
      ammoRemaining:496
    },
    playerId:"player-1",
    ammoInventory
  });

  assert.equal(changed, true);
  assert.equal(ammoInventory.ammo_x1, 496);
});

test("combat hit never consumes ammunition from spectators", ()=>{
  const ammoInventory = {ammo_x1:500};
  const changed = applyAuthoritativeCombatAmmo({
    event:{
      attackerId:"player-2",
      ammoId:"ammo_x1",
      consumed:4,
      ammoRemaining:100
    },
    playerId:"player-1",
    ammoInventory
  });

  assert.equal(changed, false);
  assert.equal(ammoInventory.ammo_x1, 500);
});

test("monster reward applies its compact authoritative progression snapshot", ()=>{
  const player = {level:4, xp:900, credits:100, premium:2};
  const changed = applyAuthoritativeRewardProgression({
    event:{
      progression:{
        level:5,
        xp:25,
        xpNext:6000,
        credits:30100,
        premium:26,
        reputation:80,
        totalKills:12
      }
    },
    player
  });

  assert.equal(changed, true);
  assert.deepEqual(player, {
    level:5,
    xp:25,
    xpNext:6000,
    credits:30100,
    premium:26,
    reputation:80,
    totalKills:12
  });
});

test("Ricky displays the complete hit instead of only the hull damage behind his shield", ()=>{
  assert.equal(getNpcDamageDisplayAmount({amount:850, hpLost:170}), 850);
  assert.equal(getNpcDamageDisplayAmount({hpLost:170}), 170);
});
