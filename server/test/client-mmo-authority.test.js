import assert from "node:assert/strict";
import test from "node:test";
import { createCombatCargoSystem } from "../../src/game/systems/combatCargo.js";
import { createRewardSystem } from "../../src/game/systems/rewards.js";
import { createWeaponSystem } from "../../src/game/systems/weapons.js";
import { markProfileSaveAcknowledged, resetProfileSaveState, syncMultiplayerProfile } from "../../src/multiplayer/profileSync.js";

function createWeaponFixture(enemy, {
  shipLasers = [{id:"laser_mk1", weapon:{minDamage:10, maxDamage:10, range:1000, speed:900}}],
  droneLasers = [],
  autoAcknowledge = true
} = {}){
  let consumed = 0;
  let saved = 0;
  let resolved = 0;
  let actionBarRefreshes = 0;
  let quickPanelRefreshes = 0;
  let combatMarks = 0;
  let cooldownWrites = 0;
  let lastCooldownSeconds = 0;
  let pendingAcknowledge = null;
  let lastShotContext = null;
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
    setAmmoCooldown(_ammo, seconds){
      cooldownWrites += 1;
      lastCooldownSeconds = seconds;
    },
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
    markCombatActivity(){ combatMarks += 1; },
    addLaserBeam(){},
    sendPlayerWeaponEffect(){},
    getNetworkTargetId:()=>enemy.id,
    sendServerEnemyHit(_enemyId, context, acknowledge){
      resolved += 1;
      lastShotContext = context;
      pendingAcknowledge = acknowledge;
      if(autoAcknowledge) acknowledge({accepted:true, outcome:"hit", shotId:"shot-1"});
      return true;
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
    combatMarks:()=>combatMarks,
    cooldownWrites:()=>cooldownWrites,
    lastCooldownSeconds:()=>lastCooldownSeconds,
    lastShotContext:()=>lastShotContext,
    acknowledge:response=>pendingAcknowledge?.(response),
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

test("an unconfirmed or rejected laser shot creates no local combat state", ()=>{
  const enemy = {id:"server-enemy-pending", x:100, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {autoAcknowledge:false});

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), false);
  assert.equal(fixture.resolved(), 1);
  assert.equal(fixture.combatMarks(), 0);
  assert.equal(fixture.cooldownWrites(), 0);
  assert.equal(enemy.aggro, undefined);

  fixture.acknowledge({
    accepted:false,
    outcome:"rejected",
    reasonCode:"cooldown",
    reason:"Arme en recharge."
  });

  assert.equal(fixture.combatMarks(), 0);
  assert.equal(fixture.cooldownWrites(), 0);
  assert.equal(enemy.aggro, undefined);
  assert.equal(fixture.system.hasPendingShot("laser"), false);
});

test("an accepted laser shot starts local cooldown only after server acknowledgement", ()=>{
  const enemy = {id:"server-enemy-accepted", x:100, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {autoAcknowledge:false});

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  assert.equal(fixture.cooldownWrites(), 0);
  fixture.acknowledge({accepted:true, outcome:"accepted", shotId:"shot-accepted"});

  assert.equal(fixture.combatMarks(), 1);
  assert.equal(fixture.cooldownWrites(), 1);
  assert.equal(enemy.aggro, true);
});

test("an authoritative combat shot confirms a fire when the socket acknowledgement is lost", ()=>{
  const enemy = {id:"server-enemy-shot-fallback", x:100, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {autoAcknowledge:false});

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  const shotId = fixture.lastShotContext()?.shotId;
  assert.ok(shotId);
  assert.equal(fixture.cooldownWrites(), 0);

  assert.equal(fixture.system.confirmAuthoritativeShot({
    accepted:true,
    shotId,
    consumed:1,
    ammoRemaining:99,
    cooldownMs:2000
  }), true);
  assert.equal(fixture.combatMarks(), 1);
  assert.equal(fixture.cooldownWrites(), 1);
  assert.ok(fixture.lastCooldownSeconds() > 1.9 && fixture.lastCooldownSeconds() <= 2);
  assert.equal(fixture.system.hasPendingShot("laser"), false);

  fixture.acknowledge({accepted:true, shotId});
  assert.equal(fixture.cooldownWrites(), 1, "late ack must not confirm the same shot twice");
});

test("an authoritative rejection clears a pending fire when the socket acknowledgement is lost", ()=>{
  const enemy = {id:"server-enemy-reject-fallback", x:100, y:0, hp:100, serverControlled:true};
  const fixture = createWeaponFixture(enemy, {autoAcknowledge:false});

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), true);
  const shotId = fixture.lastShotContext()?.shotId;
  assert.ok(shotId);
  assert.equal(fixture.system.rejectAuthoritativeShot({
    accepted:false,
    outcome:"rejected",
    shotId,
    reasonCode:"OUT_OF_RANGE"
  }), true);
  assert.equal(fixture.combatMarks(), 0);
  assert.equal(fixture.cooldownWrites(), 0);
  assert.equal(fixture.system.hasPendingShot("laser"), false);
});

test("damage-immune targets are blocked before any authoritative fire request", ()=>{
  const enemy = {
    id:"server-enemy-immune",
    x:100,
    y:0,
    hp:100,
    damageImmune:true,
    serverControlled:true
  };
  const fixture = createWeaponFixture(enemy);

  assert.equal(fixture.system.shootAt(enemy, fixture.ammo, 0), false);
  assert.equal(fixture.resolved(), 0);
  assert.equal(fixture.cooldownWrites(), 0);
  assert.equal(fixture.combatMarks(), 0);
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
  assert.equal(cargo.collectGroundMaterial(serverLoot, {x:0,y:-48,hp:100}), true);
  assert.equal(requests, 1);
  assert.equal(toasts.length, 0);
  assert.equal(lootNotices.length, 0);
  cargo.handleServerEvent("loot:picked", {id:serverLoot.uid});
  assert.equal(toasts.at(-1)?.options?.trustedHtml, true);
  assert.match(toasts.at(-1)?.message || "", /loot-rarity-token rarity-rare/);
  assert.match(toasts.at(-1)?.message || "", /Rare<\/span> : Butin serveur/);
  assert.equal(lootNotices.at(-1)?.piece, "Rare : Butin serveur");
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

test("profile sync keeps the action-slot version separate from the full profile version", ()=>{
  const sent = [];
  const multiplayer = {
    connected:true,
    socket:{emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"account"}, profileReady:true},
    name:"Pilote"
  };
  syncMultiplayerProfile(multiplayer, {
    actionSlotsUpdatedAt:424242,
    mmoProfileUpdatedAt:999999,
    actionSlots:["ammo_x2"],
    actionSlotsByShip:{razorion:["ammo_x2"]},
    lastLaserAmmoId:"ammo_x2"
  });

  assert.equal(sent.length, 1);
  assert.ok(sent[0].payload.profile.updatedAt > 0);
  assert.equal(sent[0].payload.profile.actionSlotsUpdatedAt, 424242);
  assert.ok(sent[0].payload.requestId);
  markProfileSaveAcknowledged({
    requestId:sent[0].payload.requestId,
    status:"saved",
    updatedAt:sent[0].payload.profile.updatedAt
  });
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

test("a terminal stale-save conflict cancels every scheduled retry", ()=>{
  const sent = [];
  const timers = [];
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = callback=>{
    const timer = {callback, cleared:false, unref(){}};
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = timer=>{
    if(timer) timer.cleared = true;
  };
  const multiplayer = {
    connected:true,
    clientId:"conflict-client",
    socket:{emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"conflict-account"}, profileReady:true},
    name:"Pilote"
  };

  try{
    syncMultiplayerProfile(multiplayer, {
      actionSlotsUpdatedAt:1000,
      actionSlots:["ammo_x1"],
      actionSlotsByShip:{orion:["ammo_x1"]},
      lastLaserAmmoId:"ammo_x1"
    });
    assert.equal(sent.length, 1);
    assert.equal(timers.length, 1);

    const request = sent[0].payload;
    assert.equal(markProfileSaveAcknowledged({
      requestId:request.requestId,
      status:"conflict",
      updatedAt:request.profile.updatedAt
    }), true);
    timers[0].callback();

    assert.equal(timers[0].cleared, true);
    assert.equal(sent.length, 1);
  }finally{
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("a pending profile retry cannot cross an account or socket session boundary", ()=>{
  const sent = [];
  const timers = [];
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = callback=>{
    const timer = {callback, cleared:false, unref(){}};
    timers.push(timer);
    return timer;
  };
  globalThis.clearTimeout = timer=>{
    if(timer) timer.cleared = true;
  };
  const multiplayer = {
    connected:true,
    clientId:"account-switch-client",
    socket:{id:"socket-a", emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"account-a"}, profileReady:true},
    name:"Pilote"
  };
  const state = {
    actionSlotsUpdatedAt:6000,
    actionSlots:["ammo_x2"],
    actionSlotsByShip:{orion:["ammo_x2"]},
    lastLaserAmmoId:"ammo_x2"
  };

  try{
    syncMultiplayerProfile(multiplayer, state);
    assert.equal(sent.length, 1);
    multiplayer.auth.account = {id:"account-b"};
    multiplayer.socket.id = "socket-b";
    timers[0].callback();
    assert.equal(sent.length, 1);

    syncMultiplayerProfile(multiplayer, state);
    assert.equal(sent.length, 2);
    assert.equal(sent[1].payload.requestId.includes("account-switch-client"), true);
  }finally{
    resetProfileSaveState();
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("a rejected profile save rearms the same preference signature", ()=>{
  const sent = [];
  const multiplayer = {
    connected:true,
    clientId:"rejected-save-client",
    socket:{id:"socket-rejected", emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"rejected-account"}, profileReady:true},
    name:"Pilote"
  };
  const state = {
    actionSlotsUpdatedAt:7000,
    actionSlots:["ammo_x3"],
    actionSlotsByShip:{orion:["ammo_x3"]},
    lastLaserAmmoId:"ammo_x3"
  };

  syncMultiplayerProfile(multiplayer, state);
  assert.equal(markProfileSaveAcknowledged({
    requestId:sent[0].payload.requestId,
    status:"rejected",
    reason:"invalid-profile-save"
  }), true);
  syncMultiplayerProfile(multiplayer, state);
  assert.equal(sent.length, 2);
  resetProfileSaveState();
});

test("marking a server profile as applied prevents an unchanged preference echo", ()=>{
  const sent = [];
  const multiplayer = {
    connected:true,
    clientId:"server-sync-client",
    socket:{emit:(event, payload)=>sent.push({event, payload})},
    auth:{token:"token", account:{id:"server-sync-account"}, profileReady:true},
    name:"Pilote"
  };
  const state = {
    actionSlotsUpdatedAt:5000,
    mmoProfileUpdatedAt:9000,
    actionSlots:["ammo_x2"],
    actionSlotsByShip:{orion:["ammo_x2"]},
    lastLaserAmmoId:"ammo_x2"
  };

  syncMultiplayerProfile(multiplayer, state, {serverApplied:true});
  syncMultiplayerProfile(multiplayer, state);

  assert.deepEqual(sent, []);
});
