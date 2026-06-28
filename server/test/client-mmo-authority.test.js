import assert from "node:assert/strict";
import test from "node:test";
import { createCombatCargoSystem } from "../../src/game/systems/combatCargo.js";
import { createRewardSystem } from "../../src/game/systems/rewards.js";
import { createWeaponSystem } from "../../src/game/systems/weapons.js";
import { markProfileSaveAcknowledged, syncMultiplayerProfile } from "../../src/multiplayer/profileSync.js";

function createWeaponFixture(enemy, {
  shipLasers = [{id:"laser_mk1", weapon:{minDamage:10, maxDamage:10, range:1000, speed:900}}],
  droneLasers = []
} = {}){
  let consumed = 0;
  let saved = 0;
  let resolved = 0;
  let actionBarRefreshes = 0;
  let quickPanelRefreshes = 0;
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
    getEquippedLasers:()=>shipLasers,
    getEquippedDroneLasers:()=>droneLasers,
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
    refreshActionBar(){ actionBarRefreshes += 1; },
    refreshQuickPanel(){ quickPanelRefreshes += 1; },
    showToast(){},
    isServerControlledEnemy:target=>Boolean(target.serverControlled),
    playerHitChance:1
  });
  return {
    consumed:()=>consumed,
    resolved:()=>resolved,
    saved:()=>saved,
    actionBarRefreshes:()=>actionBarRefreshes,
    quickPanelRefreshes:()=>quickPanelRefreshes,
    system,
    ammo
  };
}

test("server-controlled targets never consume MMO ammunition locally", ()=>{
  const enemy = {id:"server-enemy", x:100, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy);

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  assert.equal(fixture.consumed(), 0);
  assert.equal(fixture.saved(), 0);
  assert.equal(fixture.resolved(), 1);
  assert.equal(fixture.actionBarRefreshes(), 0);
  assert.equal(fixture.quickPanelRefreshes(), 0);
});

test("client laser range uses the shortest equipped ship laser", ()=>{
  const enemy = {id:"server-enemy", x:525, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {
    shipLasers:[
      {id:"laser_mk1", weapon:{range:500, speed:900}},
      {id:"laser_mk3", weapon:{range:550, speed:1040}}
    ]
  });

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), false);
  assert.equal(fixture.resolved(), 0);
});

test("client drone lasers do not reduce an equipped ship laser range", ()=>{
  const enemy = {id:"server-enemy", x:525, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {
    shipLasers:[{id:"laser_mk3", weapon:{range:550, speed:1040}}],
    droneLasers:[{id:"laser_mk1", weapon:{range:500, speed:900}}]
  });

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  assert.equal(fixture.resolved(), 1);
});

test("client uses the shortest drone laser range when the ship has no laser", ()=>{
  const enemy = {id:"server-enemy", x:525, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {
    shipLasers:[],
    droneLasers:[
      {id:"laser_mk1", weapon:{range:500, speed:900}},
      {id:"laser_mk3", weapon:{range:550, speed:1040}}
    ]
  });

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), false);
  assert.equal(fixture.resolved(), 0);
});

test("local targets are rejected in MMO-only combat", ()=>{
  const enemy = {id:"local-enemy", x:100, y:0, hp:100};
  const fixture = createWeaponFixture(enemy);

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), false);
  assert.equal(fixture.consumed(), 0);
  assert.equal(fixture.saved(), 0);
  assert.equal(fixture.resolved(), 0);
});

test("manual missiles reject local targets before any client combat logic", ()=>{
  const enemy = {id:"local-enemy", x:100, y:0, hp:100};
  const fixture = createWeaponFixture(enemy);

  assert.equal(fixture.system.fireManualMissile({id:"missile_m1", weaponClass:"missile"}, 3), false);
  assert.equal(fixture.consumed(), 0);
  assert.equal(fixture.saved(), 0);
});

test("local enemy rewards are blocked while connected to the MMO", ()=>{
  const rewards = createRewardSystem();

  assert.equal(rewards.rewardEnemy({id:"local", kind:"drone_pirate"}), false);
});

test("only server-controlled ground loot can request a pickup", ()=>{
  let requests = 0;
  const toasts = [];
  const lootNotices = [];
  const cargo = createCombatCargoSystem({
    rewards:{showLootNotice:notice=>lootNotices.push(notice)},
    requestServerLootPickup(){
      requests += 1;
      return true;
    },
    showToast:(message, options)=>toasts.push({message, options}),
    onCargoChanged(){},
    particles:()=>[]
  });
  const localLoot = cargo.spawnServerLootDrop({
    id:"local-loot",
    kind:"material",
    name:"Butin local",
    serverControlled:false
  });
  const serverLoot = cargo.spawnServerLootDrop({
    id:"server-loot",
    kind:"material",
    name:"Butin serveur",
    rarity:"rare",
    serverControlled:true
  });

  assert.equal(localLoot, null);
  assert.equal(requests, 0);
  assert.equal(cargo.collectGroundMaterial(serverLoot), true);
  assert.equal(requests, 1);
  assert.equal(toasts.at(-1)?.options?.trustedHtml, true);
  assert.match(toasts.at(-1)?.message || "", /loot-rarity-token rarity-rare/);
  assert.match(toasts.at(-1)?.message || "", /Rare<\/span> : Butin serveur/);
  assert.equal(lootNotices.at(-1)?.piece, "Rare : Butin serveur envoye au serveur");
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
    "actionSlotsUpdatedAt",
    "lastLaserAmmoId",
    "updatedAt"
  ]);
  markProfileSaveAcknowledged({updatedAt:sent[0].payload.profile.updatedAt});
});

test("profile sync uses the local preference timestamp for action bar saves", ()=>{
  const sent = [];
  const multiplayer = {
    connected:true,
    socket:{emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"account"}, profileReady:true},
    name:"Pilote"
  };
  syncMultiplayerProfile(multiplayer, {
    mmoProfileUpdatedAt:424242,
    actionSlots:["ammo_x2"],
    actionSlotsByShip:{razorion:["ammo_x2"]},
    lastLaserAmmoId:"ammo_x2"
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.profile.updatedAt, 424242);
  assert.equal(sent[0].payload.profile.actionSlotsUpdatedAt, 424242);
  markProfileSaveAcknowledged({updatedAt:424242});
});

test("profile sync emits nothing before an authenticated profile is ready", ()=>{
  const sent = [];
  const multiplayer = {
    connected:true,
    socket:{emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"", account:null, profileReady:false},
    name:"Guest"
  };

  syncMultiplayerProfile(multiplayer, {
    actionSlots:["ammo_x1"],
    actionSlotsByShip:{orion:["ammo_x1"]},
    lastLaserAmmoId:"ammo_x1"
  });

  assert.deepEqual(sent, []);
});
