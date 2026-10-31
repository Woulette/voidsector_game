import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { io as connect } from "socket.io-client";
import { ammoTypes } from "../../src/data/equipment.js";
import { createCombatActions } from "../../src/game/ui/combatActions.js";
import { createWeaponSystem } from "../../src/game/systems/weapons.js";
import { getAmmoCooldown, setAmmoCooldown } from "../../src/game/systems/projectiles.js";
import { resolveServerCombatFire } from "../src/combat/damage.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createEnemyHitHandler } from "../src/combat/enemyHits.js";
import { registerCombatHandlers } from "../src/socket/combatHandlers.js";
import { createCombatCommands } from "../../src/multiplayer/combatCommands.js";
import { applyAuthoritativeCombatAmmo } from "../../src/game/systems/combatServerEvents.js";

const getAmmo = id=>ammoTypes.find(ammo=>ammo.id === id) || null;

function serverFixture(t, id){
  let now = 100_000;
  t.mock.method(Date, "now", ()=>now);
  const profile = createDefaultProfile();
  for(const ammoId of ["ammo_x1", "ammo_x2", "ammo_x3", "ammo_x4", "ammo_x6"]){
    profile.ammoInventory[ammoId] = 100;
  }
  const player = {id, accountId:id, state:{shipId:"orion", x:0, y:0, hp:1000, maxHp:1000}};
  const enemy = {id:"x6-target", x:100, y:0, hp:1_000_000, maxShield:0, shield:0};
  return {
    profile,
    player,
    advance:ms=>{ now += ms; },
    fire:ammoId=>resolveServerCombatFire({player, profile, enemy,
      payload:{ammoId, weaponClass:"laser"}, random:()=>0, now})
  };
}

function clientFixture(t, {laserCount = 1, autoAcknowledge = true, send = null} = {}){
  const previousDocument = globalThis.document;
  globalThis.document = {querySelectorAll:()=>[], getElementById:()=>null};
  t.after(()=>{
    if(previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const store = {state:{activeShip:"orion", actionSlots:["ammo_x3", "ammo_x6", "ammo_x1"],
    lastLaserAmmoId:"ammo_x3", ammoInventory:{ammo_x3:100, ammo_x6:100, ammo_x1:100}}};
  const player = {x:0, y:0, extraBonus:{}};
  const enemy = {id:"x6-target", x:100, y:0, hp:1_000_000, serverControlled:true};
  const requests = [];
  const toasts = [];
  const getAmmoCount = id=>store.state.ammoInventory[id] || 0;
  const getEquippedLasers = ()=>Array.from({length:laserCount}, ()=>({weapon:{range:500, speed:900}}));
  let weapons;
  const actions = createCombatActions({
    ammoTypes, store, getAmmo, getAmmoCount, getPlayer:()=>player,
    getItem:()=>null, getDroneFormation:()=>null, getEquippedExtras:()=>[],
    getEquippedLauncher:()=>null, getLaserVolley:()=>({count:laserCount}),
    getRepairState:()=>({ok:false}), getRepairBotDelay:()=>0,
    showToast:message=>toasts.push(message), saveState(){}, syncProfile(){},
    multiplayer:{connected:true}, canAfford:()=>true,
    fireManualSpecialLaser:(index,ammo)=>weapons.fireManualSpecialLaser(index,ammo)
  });
  weapons = createWeaponSystem({
    getPlayerId:()=>"x6-client", getPlayer:()=>player, getSelectedEnemy:()=>enemy,
    getActiveShip:()=>"orion", getActionSlots:()=>store.state.actionSlots,
    getActiveLaserSlot:actions.getActiveLaserSlot, setActiveLaserSlot:actions.setActiveLaserSlot,
    getSelectedRocketAmmo:()=>null, getEquippedLauncher:()=>null,
    getEquippedLasers, getEquippedDroneLasers:()=>[], getAmmo, getAmmoCount,
    getCombatAmmo:actions.getCombatAmmo, getAmmoCooldown:actions.getAmmoCooldown,
    setAmmoCooldown:actions.setAmmoCooldown, getEffectiveAmmoCooldown:actions.getEffectiveAmmoCooldown,
    tickAmmoCooldowns:actions.tickAmmoCooldowns, getNetworkTargetId:()=>enemy.id,
    isServerControlledEnemy:target=>target.serverControlled,
    showToast:message=>toasts.push(message), refreshActionBar:actions.updateGameActionBar,
    refreshQuickPanel(){},
    sendServerEnemyHit(targetId, context, acknowledge){
      requests.push({context, acknowledge});
      if(send) return send(targetId, context, acknowledge);
      if(autoAcknowledge) acknowledge({accepted:true, cooldownMs:getAmmo(context.ammoId).cooldown * 1000});
      return true;
    }
  });
  return {actions, weapons, store, enemy, requests, toasts};
}

test("X6 client cooldown does not block regular ammunition", ()=>{
  const cooldowns = {};
  const read = ammo=>getAmmoCooldown(cooldowns, ammo, getAmmo);
  setAmmoCooldown(cooldowns, getAmmo("ammo_x6"), 3, read);
  assert.equal(read(getAmmo("ammo_x3")), 0);
  setAmmoCooldown(cooldowns, getAmmo("ammo_x3"), 1, read);
  assert.equal(read(getAmmo("ammo_x6")), 3);
  for(const id of ["ammo_x1", "ammo_x2", "ammo_x3", "ammo_x4"]){
    assert.equal(read(getAmmo(id)), 1, "regular ammo shares one cooldown");
  }
});

test("X6 then regular selection in the same frame sends both before either acknowledgement", t=>{
  let now=100_000;
  t.mock.method(Date,"now",()=>now);
  const f=clientFixture(t,{autoAcknowledge:false});
  f.actions.selectActionSlot(1);
  f.actions.selectActionSlot(2);
  f.weapons.updateWeapons(0);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6","ammo_x1"]);
  assert.equal(f.weapons.hasPendingShot("laser_x6"),true);
  assert.equal(f.weapons.hasPendingShot("laser"),true);
  // The two responses may arrive out of order without replacing the selection.
  now+=175;
  f.requests[1].acknowledge({accepted:true,cooldownMs:1000});
  now+=25;
  f.requests[0].acknowledge({accepted:true,cooldownMs:3000});
  assert.equal(f.actions.getActiveLaserSlot(),2);
  assert.equal(f.actions.getAmmoCooldown(getAmmo("ammo_x6")),2.8);
  assert.equal(f.actions.getAmmoCooldown(getAmmo("ammo_x1")),.825);
});

test("manually selecting X3 after X6 enables normal fire and the next press still stops it", t=>{
  let now=100_000;
  t.mock.method(Date,"now",()=>now);
  const f=clientFixture(t,{autoAcknowledge:false});
  f.actions.selectActionSlot(1);
  now+=80;
  f.actions.selectActionSlot(0);
  f.weapons.updateWeapons(0);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6","ammo_x3"]);
  assert.equal(f.actions.getActiveLaserSlot(),0);
  f.actions.selectActionSlot(0);
  assert.equal(f.actions.getActiveLaserSlot(),null,"a subsequent press still stops fire");
});

test("X6 stays selected while its acknowledgement is pending and regular fire requires a manual return", t=>{
  const f=clientFixture(t,{autoAcknowledge:false});
  f.actions.setActiveLaserSlot(0);
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(0);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6"]);
  assert.equal(f.actions.getActiveLaserSlot(),1);
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(.016);
  assert.equal(f.requests.length,1,"repeated X6 presses cannot duplicate a pending shot");
  f.requests[0].acknowledge({accepted:true,cooldownMs:3000});
  f.weapons.updateWeapons(.1);
  assert.equal(f.actions.getActiveLaserSlot(),1);
  assert.equal(f.requests.length,1,"no automatic X3 during recharge");
  f.actions.selectActionSlot(0);
  f.weapons.updateWeapons(0);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6","ammo_x3"]);
});

test("manual X3 return works after any delay and a second normal press stops fire", t=>{
  let now=100_000;
  t.mock.method(Date,"now",()=>now);
  const f=clientFixture(t,{autoAcknowledge:false});
  f.actions.selectActionSlot(1);
  now+=600;
  f.actions.selectActionSlot(0);
  assert.equal(f.actions.getActiveLaserSlot(),0);
  f.weapons.updateWeapons(0);
  assert.equal(f.requests[1].context.ammoId,"ammo_x3");
  f.actions.selectActionSlot(0);
  assert.equal(f.actions.getActiveLaserSlot(),null);
});

for(const regularId of ["ammo_x1","ammo_x2","ammo_x3","ammo_x4"]){
  for(const specialFirst of [true,false]){
    test(`rapid action keys send X6 and ${regularId}, specialFirst=${specialFirst}`, t=>{
      const f=clientFixture(t,{autoAcknowledge:false});
      f.store.state.actionSlots[0]=regularId;
      f.store.state.lastLaserAmmoId=regularId;
      f.store.state.ammoInventory[regularId]=100;
      for(const index of specialFirst ? [1,0] : [0,1]) f.actions.selectActionSlot(index);
      f.weapons.updateWeapons(0);
      assert.deepEqual(f.requests.map(r=>r.context.ammoId).sort(),(specialFirst?["ammo_x6",regularId]:["ammo_x6"]).sort());
      assert.equal(f.actions.getActiveLaserSlot(),specialFirst?0:1);
    });
  }
}

for(const regularId of ["ammo_x1", "ammo_x2", "ammo_x3", "ammo_x4"]){
  for(const specialFirst of [true, false]){
    test(`X6 server cooldown is independent of ${regularId}, specialFirst=${specialFirst}`, t=>{
      const f = serverFixture(t, `${regularId}-${specialFirst}`);
      const order = specialFirst ? ["ammo_x6", regularId] : [regularId, "ammo_x6"];
      for(const ammoId of order){
        const result = f.fire(ammoId);
        assert.equal(result.accepted, true, `${ammoId} can fire in the same instant`);
        assert.equal(result.consumed, 1);
        assert.equal(result.cooldownMs, ammoId === "ammo_x6" ? 3000 : 1000);
        assert.equal(f.profile.ammoInventory[ammoId], 99);
      }
      assert.equal(f.fire("ammo_x6").reasonCode, "COOLDOWN");
      const otherRegular = regularId === "ammo_x4" ? "ammo_x1" : "ammo_x4";
      assert.equal(f.fire(otherRegular).reasonCode, "COOLDOWN", "regular switching cannot reset cadence");
      f.advance(1000);
      assert.equal(f.fire(regularId).accepted, true);
      assert.equal(f.fire("ammo_x6").reasonCode, "COOLDOWN");
      f.advance(1999);
      assert.equal(f.fire("ammo_x6").reasonCode, "COOLDOWN");
      f.advance(1);
      assert.equal(f.fire("ammo_x6").accepted, true);
      assert.equal(f.profile.ammoInventory.ammo_x6, 98);
    });
  }
}

test("X6 server cooldown follows the account across a socket change", t=>{
  const f = serverFixture(t, "x6-reconnect-account");
  assert.equal(f.fire("ammo_x6").accepted, true);
  f.player.id = "replacement-socket";
  assert.equal(f.fire("ammo_x6").reasonCode, "COOLDOWN");
  assert.equal(f.fire("ammo_x2").accepted, true);
  assert.equal(f.profile.ammoInventory.ammo_x6, 99);
});

test("X6 remains active after firing and recharge until the player explicitly returns to X3", t=>{
  const f=clientFixture(t);
  f.actions.selectActionSlot(0);f.weapons.updateWeapons(0);
  f.actions.selectActionSlot(1);
  assert.equal(f.store.state.lastLaserAmmoId,"ammo_x6");
  assert.equal(f.actions.getActiveLaserSlot(),1);
  f.weapons.updateWeapons(0);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x3","ammo_x6"]);
  f.weapons.updateWeapons(2.99);
  assert.equal(f.requests.length,2);
  f.weapons.updateWeapons(.02);
  assert.equal(f.requests[2].context.ammoId,"ammo_x6");
  assert.equal(f.actions.getActiveLaserSlot(),1);
  f.actions.selectActionSlot(0);f.weapons.updateWeapons(0);
  assert.equal(f.requests[3].context.ammoId,"ammo_x3");
  assert.equal(f.actions.getActiveLaserSlot(),0);
});

for(const stock of [0,1]){
  test(`active X6 with stock ${stock} cannot silently switch to normal ammo`, t=>{
    const f=clientFixture(t,{laserCount:2});
    f.store.state.ammoInventory.ammo_x6=stock;
    f.actions.setActiveLaserSlot(1);
    f.weapons.updateWeapons(0);
    assert.equal(f.actions.getActiveLaserSlot(),null,"insufficient stock stops firing");
    assert.equal(f.requests.length,0);
  });
}

test("selecting a recharging X6 immediately cuts X3 and waits on X6 until it is ready", t=>{
  const f=clientFixture(t);
  f.actions.setActiveLaserSlot(0);
  f.actions.setAmmoCooldown(getAmmo("ammo_x6"),3);
  f.actions.selectActionSlot(1);
  assert.equal(f.actions.getActiveLaserSlot(),1,"no queued selection behind normal fire");
  assert.equal(f.store.state.lastLaserAmmoId,"ammo_x6");
  f.weapons.updateWeapons(1);
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(1.99);
  assert.equal(f.requests.length,0,"neither X3 nor X6 fires before recharge");
  assert.equal(f.actions.getActiveLaserSlot(),1);
  f.weapons.updateWeapons(.02);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6"]);
  f.weapons.updateWeapons(0);
  assert.equal(f.requests.length,1);
  f.actions.selectActionSlot(0);f.weapons.updateWeapons(0);
  assert.equal(f.requests[1].context.ammoId,"ammo_x3");
});

test("returning to X3 before X6 is ready cancels that selection with no later X6 shot", t=>{
  const f=clientFixture(t);
  f.actions.setAmmoCooldown(getAmmo("ammo_x6"),3);
  f.actions.setActiveLaserSlot(0);
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(1);
  f.actions.selectActionSlot(0);
  f.weapons.updateWeapons(2.1);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x3"]);
  assert.equal(f.actions.getActiveLaserSlot(),0);
});

test("an out-of-range X6 selection still cuts regular fire and fires X6 only after approaching", t=>{
  const f=clientFixture(t);
  f.actions.setActiveLaserSlot(0);f.enemy.x=700;
  f.actions.selectActionSlot(1);
  assert.equal(f.actions.getActiveLaserSlot(),1);
  f.weapons.updateWeapons(0);assert.equal(f.requests.length,0);
  f.enemy.x=100;f.weapons.updateWeapons(0);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6"]);
});

test("X6 and regular requests can coexist while duplicate regular requests stay blocked", t=>{
  const f = clientFixture(t, {autoAcknowledge:false});
  assert.equal(f.weapons.shootAt(f.enemy, getAmmo("ammo_x6"), 1), true);
  assert.equal(f.weapons.shootAt(f.enemy, getAmmo("ammo_x3"), 0), true);
  assert.equal(f.weapons.shootAt(f.enemy, getAmmo("ammo_x1"), 2), false);
  assert.equal(f.requests.length, 2);
  f.requests[0].acknowledge({accepted:true, cooldownMs:3000});
  assert.equal(f.weapons.hasPendingShot("laser"), true);
  f.requests[1].acknowledge({accepted:true, cooldownMs:1000});
  assert.equal(f.weapons.hasPendingShot("laser"), false);
});

for(const reasonCode of ["COOLDOWN", "NO_AMMO"]){
  test(`authoritative X6 rejection ${reasonCode} never restores normal fire`, t=>{
    const f = clientFixture(t, {autoAcknowledge:false});
    f.actions.selectActionSlot(1);
    f.weapons.updateWeapons(0);
    f.requests[0].acknowledge({accepted:false, reasonCode, retryAfterMs:2500});
    assert.equal(f.actions.getActiveLaserSlot(),1);
    f.weapons.updateWeapons(.05);
    assert.equal(f.requests.length,1);
    f.actions.selectActionSlot(0);f.weapons.updateWeapons(0);
    assert.equal(f.requests[1].context.ammoId,"ammo_x3");
  });
}

test("a late X6 acknowledgement never changes a newer selection or restarts stopped fire", t=>{
  const f = clientFixture(t, {autoAcknowledge:false});
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(0);
  f.actions.selectActionSlot(2);
  f.requests[0].acknowledge({accepted:true, cooldownMs:3000});
  assert.equal(f.actions.getActiveLaserSlot(), 2);
  f.actions.tickAmmoCooldowns(3);
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(0);
  f.actions.setActiveLaserSlot(null);
  f.requests[1].acknowledge({accepted:true, cooldownMs:3000});
  assert.equal(f.actions.getActiveLaserSlot(), null);
});

test("an empty X6 click retains the existing empty-ammo validation", t=>{
  const f=clientFixture(t);
  f.actions.setActiveLaserSlot(0);f.store.state.ammoInventory.ammo_x6=0;
  f.actions.selectActionSlot(1);
  assert.equal(f.actions.getActiveLaserSlot(),0);
  assert.match(f.toasts.at(-1),/stock vide/);
});

test("an X6-only action bar keeps its existing three-second automatic cadence", t=>{
  const f = clientFixture(t);
  f.store.state.actionSlots = [null, "ammo_x6", null];
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(0);
  assert.equal(f.actions.getActiveLaserSlot(), 1);
  f.weapons.updateWeapons(2.99);
  assert.equal(f.requests.length, 1);
  f.weapons.updateWeapons(.02);
  assert.equal(f.requests.length, 2);
  assert.ok(f.requests.every(request=>request.context.ammoId === "ammo_x6"));
});

test("attacking another target remembers X6 even during recharge and after normal slots move", t=>{
  const f=clientFixture(t);
  f.actions.selectActionSlot(1);
  [f.store.state.actionSlots[0],f.store.state.actionSlots[2]]=["ammo_x1","ammo_x3"];
  assert.equal(f.actions.getLaserSlotForAttack(),1);
  f.weapons.updateWeapons(0);assert.equal(f.requests.length,1);
  f.actions.setActiveLaserSlot(null);
  assert.equal(f.actions.getLaserSlotForAttack(),1,"the remembered ammo is X6, not the previous X3");
  f.actions.setActiveLaserSlot(f.actions.getLaserSlotForAttack());
  f.weapons.updateWeapons(3.01);
  assert.deepEqual(f.requests.map(r=>r.context.ammoId),["ammo_x6","ammo_x6"]);
});

test("real Socket.IO: explicit X6/X3 changes and cooling X6 selection consume only the chosen ammo", {timeout:10000}, async t=>{
  let now = 200_000;
  t.mock.method(Date, "now", ()=>now);
  t.mock.method(Math, "random", ()=>0);
  const http = createServer();
  const io = new Server(http);
  const players = new Map();
  const profile = createDefaultProfile();
  profile.ammoInventory.ammo_x3 = 100;
  profile.ammoInventory.ammo_x6 = 100;
  const enemy = {id:"x6-target", x:100, y:0, hp:1_000_000, maxShield:0, shield:0};
  const handler = createEnemyHitHandler({
    io, players, groups:new Map(), findWorldEnemyForPlayer:()=>enemy,
    presence:{markCombat(){}}, updateLootOwner(){},
    profileManager:{updateCombatProfileForPlayer:({update})=>({...update(profile), profile})}
  });
  io.on("connection", socket=>{
    const player = {id:socket.id, accountId:`socket-x6-${socket.id}`, mapId:"0", mapRoom:"map:0",
      state:{shipId:"orion", mapId:"0", x:0, y:0, hp:1000, maxHp:1000}};
    players.set(socket.id, player);
    socket.join("map:0");
    registerCombatHandlers(socket, {players, guard:()=>true, applyEnemyHit:handler.applyEnemyHit});
    socket.emit("test:ready");
  });
  await new Promise(resolve=>http.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${http.address().port}`;
  const options = {transports:["websocket"], reconnection:false, autoConnect:false};
  const actor = connect(url, options);
  const spectator = connect(url, options);
  t.after(async()=>{
    actor.disconnect();
    spectator.disconnect();
    await new Promise(resolve=>io.close(resolve));
  });
  const ready = socket=>new Promise(resolve=>{ socket.once("test:ready", resolve); socket.connect(); });
  await Promise.all([ready(actor), ready(spectator)]);
  const spectatorShots = [], spectatorHits = [];
  spectator.on("combat:shot", event=>spectatorShots.push(event));
  spectator.on("combat:hit", event=>spectatorHits.push(event));
  const commands = createCombatCommands({multiplayer:{connected:true, socket:actor,
    auth:{account:{id:"socket-x6-test"}, profileReady:true}}});
  const acknowledgements = [];
  const f = clientFixture(t, {send:(targetId, context, acknowledge)=>{
    let finish;
    acknowledgements.push(new Promise(resolve=>{ finish = resolve; }));
    return commands.sendServerEnemyHit(targetId, context, response=>{ acknowledge(response); finish(response); });
  }});
  actor.on("combat:hit", event=>applyAuthoritativeCombatAmmo({
    event, playerId:actor.id, ammoInventory:f.store.state.ammoInventory
  }));
  f.actions.selectActionSlot(1);
  f.weapons.updateWeapons(0);
  assert.equal(f.actions.getActiveLaserSlot(),1);
  assert.equal(acknowledgements.length,1,"X6 does not automatically send X3");
  f.actions.selectActionSlot(0);f.weapons.updateWeapons(0);
  assert.equal(acknowledgements.length,2,"manual X3 can leave before X6 acknowledgement");
  assert.equal((await acknowledgements[0]).accepted,true);
  assert.equal((await acknowledgements[1]).accepted,true);
  assert.equal(f.actions.getActiveLaserSlot(),0);
  const repeat=ammoId=>new Promise(resolve=>actor.emit("combat:fire",{
    enemyId:enemy.id,weaponClass:"laser",ammoId,shotId:`socket-repeat-${ammoId}`
  },resolve));
  assert.equal((await repeat("ammo_x6")).reasonCode,"COOLDOWN");
  assert.equal((await repeat("ammo_x1")).reasonCode,"COOLDOWN");
  now+=1000;f.weapons.updateWeapons(1);
  assert.equal((await acknowledgements[2]).accepted,true);
  f.actions.selectActionSlot(1);f.weapons.updateWeapons(0);
  assert.equal(f.actions.getActiveLaserSlot(),1);
  assert.equal(acknowledgements.length,3,"recharging X6 cuts X3 immediately");
  now+=1990;f.weapons.updateWeapons(1.99);
  assert.equal(acknowledgements.length,3,"no normal shot during X6 recharge");
  now+=11;f.weapons.updateWeapons(.011);
  assert.equal((await acknowledgements[3]).accepted,true);
  assert.equal(f.actions.getActiveLaserSlot(),1);
  f.weapons.updateWeapons(0);assert.equal(acknowledgements.length,4);
  f.actions.selectActionSlot(0);f.weapons.updateWeapons(0);
  assert.equal((await acknowledgements[4]).accepted,true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(spectatorShots.map(event=>event.ammoId),["ammo_x6","ammo_x3","ammo_x3","ammo_x6","ammo_x3"]);
  assert.equal(new Set(spectatorShots.map(event=>event.shotId)).size,5);
  assert.equal(spectatorHits.length,5);
  assert.equal(enemy.hp,1_000_000-spectatorHits.reduce((sum,event)=>sum+event.damage,0));
  assert.ok(spectatorHits.every(event=>event.hit&&event.consumed===1));
  assert.equal(profile.ammoInventory.ammo_x6,98);
  assert.equal(f.store.state.ammoInventory.ammo_x6,98);
  assert.equal(profile.ammoInventory.ammo_x3,97);
  assert.equal(f.store.state.ammoInventory.ammo_x3,97);
});
