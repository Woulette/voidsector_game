import assert from "node:assert/strict";
import test from "node:test";
import { createRewardSystem } from "../../src/game/systems/rewards.js";
import { createWeaponSystem } from "../../src/game/systems/weapons.js";
import { syncMultiplayerProfile } from "../../src/multiplayer/profileSync.js";

function createWeaponFixture(enemy){
  let consumed = 0;
  let saved = 0;
  let resolved = 0;
  const ammo = {id:"ammo_x1", name:"M1", weaponClass:"laser", multiplier:1};
  const system = createWeaponSystem({
    getPlayer:()=>({x:0, y:0, damageBonus:0, damageMultiplier:1, extraBonus:{}}),
    getBullets:()=>[],
    getParticles:()=>[],
    getSelectedEnemy:()=>enemy,
    getActiveShip:()=>({}),
    getActionSlots:()=>["ammo_x1"],
    getActiveLaserSlot:()=>0,
    setActiveLaserSlot(){},
    getSelectedRocketAmmo:()=>null,
    tryFireAutomaticMissile(){},
    getAmmo:()=>ammo,
    getAmmoCount:()=>100,
    getCombatAmmo:()=>ammo,
    getAmmoCooldown:()=>0,
    setAmmoCooldown(){},
    getEffectiveAmmoCooldown:()=>1,
    tickAmmoCooldowns(){},
    getEquippedLasers:()=>[{id:"laser_mk1", weapon:{minDamage:10, maxDamage:10, range:1000, speed:900}}],
    getEquippedDroneLasers:()=>[],
    getEquippedLauncher:()=>null,
    getEquipmentUpgradeLevel:()=>0,
    consumeCombatBoostCharges:()=>0,
    recordWeaponUse(){},
    consumeAmmo(_id, count){
      consumed += count;
      return true;
    },
    markCombatActivity(){},
    addLaserBeam(){},
    sendPlayerWeaponEffect(){},
    getNetworkTargetId:()=>enemy.id,
    resolveLaserHit(){
      resolved += 1;
    },
    saveState(){
      saved += 1;
    },
    refreshActionBar(){},
    refreshQuickPanel(){},
    showToast(){},
    isServerControlledEnemy:target=>Boolean(target.serverControlled),
    playerHitChance:1
  });
  return {consumed:()=>consumed, resolved:()=>resolved, saved:()=>saved, system, ammo};
}

test("server-controlled targets never consume MMO ammunition locally", ()=>{
  const enemy = {id:"server-enemy", x:100, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy);

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  assert.equal(fixture.consumed(), 0);
  assert.equal(fixture.saved(), 0);
  assert.equal(fixture.resolved(), 1);
});

test("offline targets keep the legacy local ammunition path", ()=>{
  const enemy = {id:"local-enemy", x:100, y:0, hp:100};
  const fixture = createWeaponFixture(enemy);

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  assert.equal(fixture.consumed(), 1);
  assert.equal(fixture.saved(), 1);
});

test("local enemy rewards are blocked while connected to the MMO", ()=>{
  const rewards = createRewardSystem({
    store:{state:{player:{credits:0, premium:0}}},
    portals:[],
    enemyTypes:{},
    getCurrentMap:()=>({name:"ASTRA-01"}),
    getGameMode:()=>"open",
    getSelectedEnemy:()=>null,
    getParticles:()=>[],
    isMultiplayerConnected:()=>true
  });

  assert.equal(rewards.rewardEnemy({id:"local", kind:"drone_pirate"}), false);
});

test("profile sync sends preferences only, never critical MMO progression", ()=>{
  const sent = [];
  const multiplayer = {
    connected:true,
    socket:{emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"account"}, profileReady:true},
    name:"Pilote"
  };
  syncMultiplayerProfile(multiplayer, {
    player:{credits:999999, premium:999999, xp:999999},
    inventoryItems:[{uid:"forged", itemId:"laser_mk4"}],
    ammoInventory:{ammo_x6:999999},
    actionSlots:["ammo_x1"],
    actionSlotsByShip:{orion:["ammo_x1"]},
    lastLaserAmmoId:"ammo_x1"
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].event, "profile:save");
  assert.deepEqual(Object.keys(sent[0].payload.profile).sort(), [
    "actionSlots",
    "actionSlotsByShip",
    "lastLaserAmmoId",
    "updatedAt"
  ]);
});
