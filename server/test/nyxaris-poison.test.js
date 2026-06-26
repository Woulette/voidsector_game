import assert from "node:assert/strict";
import test from "node:test";
import { ships } from "../../src/data/ships.js";
import { getShipAbilityStatus } from "../../src/shared/shipAbilities.js";
import { activateServerShipAbility } from "../src/combat/shipAbilities.js";
import { createShipAbilityEffectManager } from "../src/combat/shipAbilityEffects.js";
import { getShipPurchase } from "../src/economy/shop.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createProfileActions } from "../src/players/profileActions.js";

test("Nyxaris exposes the requested premium stats and violet portal gate", ()=>{
  const ship = ships.find(entry=>entry.id === "nyxaris");
  assert.ok(ship);
  assert.equal(ship.name, "Nyxaris");
  assert.equal(ship.priceType, "premium");
  assert.equal(ship.price, 150_000);
  assert.equal(ship.requiresCompletedPortal, "violet");
  assert.equal(ship.renderWidth, 128);
  assert.equal(ship.renderHeight, 144);
  assert.deepEqual(ship.stats, {
    vie:210_000,
    vitesse:320,
    cargo:2_000,
    maxLasers:14,
    maxGenerators:14,
    maxExtras:8,
    maxRocketLaunchers:1,
    maxMissileLaunchers:1
  });
});

test("server refuses Nyxaris before the violet portal and charges it only once", ()=>{
  const purchase = getShipPurchase("nyxaris");
  const profile = createDefaultProfile();
  profile.player.premium = 200_000;
  const profiles = new Map([["account:nyxaris-shop", profile]]);
  const player = {id:"socket-nyxaris-shop", accountId:"nyxaris-shop"};
  const actions = createProfileActions({
    profiles,
    persist(){},
    getExistingProfile:()=>({key:"account:nyxaris-shop", profile:profiles.get("account:nyxaris-shop")})
  });

  const locked = actions.addShipPurchase({player, purchase});
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /violet/i);
  assert.equal(profiles.get("account:nyxaris-shop").player.premium, 200_000);

  profiles.get("account:nyxaris-shop").completedPortals.violet = 1;
  const bought = actions.addShipPurchase({player, purchase});
  assert.equal(bought.ok, true);
  assert.equal(bought.profile.player.premium, 50_000);
  assert.equal(bought.profile.ownedShips.includes("nyxaris"), true);

  const duplicate = actions.addShipPurchase({player, purchase});
  assert.equal(duplicate.ok, false);
  assert.equal(profiles.get("account:nyxaris-shop").player.premium, 50_000);
});

test("Nyxaris poison bomb activates for 10 seconds and cools down for 3 minutes", ()=>{
  const profile = createDefaultProfile();
  profile.ownedShips.push("nyxaris");
  profile.activeShip = "nyxaris";
  const player = {
    id:"socket-nyxaris-ability",
    state:{shipId:"nyxaris", hp:210_000, maxHp:210_000}
  };

  const activation = activateServerShipAbility({player, profile, abilityId:"poison_bomb", now:1_000});
  assert.equal(activation.ok, true);
  assert.equal(activation.status.activeUntil, 11_000);
  assert.equal(activation.status.cooldownUntil, 181_000);

  const blocked = activateServerShipAbility({player, profile, abilityId:"poison_bomb", now:180_999});
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /recharge/i);

  const ready = activateServerShipAbility({player, profile, abilityId:"poison_bomb", now:181_000});
  assert.equal(ready.ok, true);
});

function createPoisonFixture({enemyHp = 200_000, enemyX = 120} = {}){
  const emitted = [];
  const rewards = [];
  const enemy = {
    id:"enemy-poison-1",
    kind:"test_enemy",
    type:"Test Enemy",
    x:enemyX,
    y:0,
    hp:enemyHp,
    maxHp:enemyHp,
    shield:50_000,
    maxShield:50_000,
    radius:34,
    reward:{credits:0, xp:0, premium:0}
  };
  const worldState = {id:"0", enemies:[enemy]};
  const player = {
    id:"socket-nyxaris-poison",
    mapId:"0",
    mapRoom:"map:0",
    state:{mapId:"0", shipId:"nyxaris", x:0, y:0, hp:210_000, maxHp:210_000}
  };
  const manager = createShipAbilityEffectManager({
    io:{to:room=>({emit:(eventName, payload)=>emitted.push({room, eventName, payload})})},
    players:new Map([[player.id, player]]),
    groups:new Map(),
    getWorldMapState:()=>worldState,
    emitWorldReward:payload=>rewards.push(payload),
    emitWorldEnemies(){},
    updateLootOwner(target, attackerId){ target.lootOwnerId = attackerId; },
    progressServerQuestsForKill(){},
    spawnWorldEnemyChildren(){},
    removeWorldEnemy(){},
    respawnWorldEnemy(){}
  });
  const status = getShipAbilityStatus("nyxaris", {
    poison_bomb:{activeUntil:10_000, cooldownUntil:180_000}
  }, 0, "poison_bomb");
  return {emitted, enemy, manager, player, rewards, status};
}

test("Nyxaris poison bomb refreshes the poison timer without stacking damage", ()=>{
  const {emitted, enemy, manager, player, status} = createPoisonFixture();
  assert.equal(manager.startShipAbilityEffect({player, status, now:0}), true);

  assert.equal(enemy.shipPoison.expiresAt, 10_000);
  assert.equal(enemy.shipPoison.damagePerTick, 10_000);
  assert.equal(enemy.hp, 200_000);
  assert.equal(enemy.shield, 50_000);

  manager.updateShipAbilityEffects(999);
  assert.equal(enemy.hp, 200_000);

  manager.updateShipAbilityEffects(1_000);
  manager.updateShipAbilityEffects(2_000);
  assert.equal(enemy.hp, 180_000);
  assert.equal(enemy.shield, 50_000);

  manager.updateShipAbilityEffects(2_500);
  assert.equal(enemy.shipPoison.expiresAt, 12_500);
  assert.equal(enemy.hp, 180_000);
  assert.equal(enemy.shield, 50_000);

  manager.updateShipAbilityEffects(3_000);
  manager.updateShipAbilityEffects(4_000);
  manager.updateShipAbilityEffects(5_000);
  assert.equal(enemy.shipPoison.expiresAt, 15_000);
  assert.equal(enemy.hp, 150_000);
  assert.equal(enemy.shield, 50_000);

  manager.updateShipAbilityEffects(6_000);
  manager.updateShipAbilityEffects(7_000);
  manager.updateShipAbilityEffects(7_500);
  assert.equal(enemy.shipPoison.expiresAt, 17_500);
  assert.equal(enemy.hp, 130_000);

  manager.updateShipAbilityEffects(8_000);
  manager.updateShipAbilityEffects(9_000);
  manager.updateShipAbilityEffects(10_000);
  assert.equal(enemy.shipPoison.expiresAt, 20_000);
  assert.equal(enemy.hp, 100_000);

  const damageEvents = emitted.filter(entry=>entry.eventName === "combat:hit" && entry.payload.damageType === "poison");
  assert.equal(damageEvents.length, 10);
  assert.ok(damageEvents.every(entry=>entry.payload.damage === 10_000));
  assert.deepEqual(
    emitted
      .filter(entry=>entry.eventName === "ship:ability-effect")
      .map(entry=>entry.payload.pulseIndex),
    [1, 2, 3, 4, 5]
  );
});

test("Nyxaris poison bomb can kill world enemies and grant normal kill rewards", ()=>{
  const {enemy, manager, player, rewards, status} = createPoisonFixture({enemyHp:15_000});
  assert.equal(manager.startShipAbilityEffect({player, status, now:0}), true);
  manager.updateShipAbilityEffects(1_000);
  assert.equal(enemy.hp, 5_000);
  assert.equal(enemy.shield, 50_000);

  manager.updateShipAbilityEffects(2_000);
  assert.equal(enemy.hp, 0);
  assert.equal(rewards.length, 1);
  assert.equal(rewards[0].enemy, enemy);
  assert.equal(rewards[0].attackerId, player.id);
});


test("Nyxaris poison bomb follows the caster during each one second wave", ()=>{
  const {emitted, enemy, manager, player, status} = createPoisonFixture({enemyX:520});
  assert.equal(manager.startShipAbilityEffect({player, status, now:0}), true);
  assert.equal(enemy.shipPoison, undefined);

  const pulseEvent = emitted.find(entry=>entry.eventName === "ship:ability-effect");
  assert.equal(pulseEvent.payload.durationMs, 1_000);
  assert.equal(pulseEvent.payload.followSource, true);

  player.state.x = 250;
  manager.updateShipAbilityEffects(500);
  assert.equal(enemy.shipPoison.expiresAt, 10_500);
  assert.equal(enemy.shipPoison.nextTickAt, 1_500);
});
test("Nyxaris poison bomb cancels queued waves when the caster dies", ()=>{
  const {emitted, manager, player, status} = createPoisonFixture();
  assert.equal(manager.startShipAbilityEffect({player, status, now:0}), true);
  assert.equal(manager.activePulses.size, 1);
  assert.equal(emitted.filter(entry=>entry.eventName === "ship:ability-effect").length, 1);

  player.state.hp = 0;
  manager.updateShipAbilityEffects(2_500);
  assert.equal(manager.activePulses.size, 0);

  player.state.hp = 210_000;
  manager.updateShipAbilityEffects(5_000);
  assert.equal(emitted.filter(entry=>entry.eventName === "ship:ability-effect").length, 1);
});
