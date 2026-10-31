import assert from "node:assert/strict";
import test from "node:test";
import {
  SERVER_WEAPON_HIT_CHANCES,
  calculateServerCombatTravelTimeMs,
  resolveServerCombatFire
} from "../src/combat/damage.js";
import {createCombatShotPayload, createEnemyHitHandler, wouldEnemyHitKill} from "../src/combat/enemyHits.js";
import {isPreparedPlayerImpactValid} from "../src/combat/playerPvp.js";
import {createPlayerLifecycleManager} from "../src/players/playerLifecycle.js";
import {createDefaultProfile} from "../src/players/profileDefaults.js";
import {registerCombatHandlers} from "../src/socket/combatHandlers.js";

function sequenceRandom(values){
  const queue = [...values];
  return ()=>queue.shift() ?? 0;
}

function createLaserProfile(){
  const profile = createDefaultProfile();
  profile.activeShip = "orion";
  return profile;
}

function createRocketProfile(){
  const profile = createLaserProfile();
  profile.inventoryItems.push({uid:"protocol-rocket-launcher", itemId:"launcher_rocket_mk1"});
  profile.shipLoadouts.orion.rocketLauncher = "protocol-rocket-launcher";
  profile.ammoInventory.rocket_r1 = 10;
  return profile;
}

function createMissileProfile(){
  const profile = createLaserProfile();
  profile.inventoryItems.push({uid:"protocol-missile-launcher", itemId:"launcher_missile_mk1"});
  profile.shipLoadouts.orion.missileLauncher = "protocol-missile-launcher";
  profile.ammoInventory.missile_m1 = 10;
  return profile;
}

function resolveThresholdShot({id, profile, weaponClass, ammoId, rolls}){
  return resolveServerCombatFire({
    player:{id, accountId:id, state:{x:0, y:0, shipId:"orion"}},
    profile,
    enemy:{id:"threshold-target", x:100, y:0},
    payload:{weaponClass, ammoId, count:1},
    random:sequenceRandom(rolls)
  });
}

test("server accuracy thresholds keep laser and missile at 80 percent while rocket stays at 88 percent", ()=>{
  assert.deepEqual(SERVER_WEAPON_HIT_CHANCES, {
    laser:0.8,
    rocket:0.88,
    missile:0.8
  });

  const laserHit = resolveThresholdShot({
    id:"threshold-laser-hit",
    profile:createLaserProfile(),
    weaponClass:"laser",
    ammoId:"ammo_x1",
    rolls:[0, 0.799999]
  });
  const laserMissProfile = createLaserProfile();
  const laserAmmoBefore = laserMissProfile.ammoInventory.ammo_x1;
  const laserMiss = resolveThresholdShot({
    id:"threshold-laser-miss",
    profile:laserMissProfile,
    weaponClass:"laser",
    ammoId:"ammo_x1",
    rolls:[0, 0.8]
  });

  assert.equal(laserHit.accepted, true);
  assert.equal(laserHit.outcome, "hit");
  assert.equal(laserHit.travelTimeMs, 0);
  assert.equal(laserMiss.accepted, true);
  assert.equal(laserMiss.outcome, "miss");
  assert.equal(laserMiss.hit, false);
  assert.equal(laserMissProfile.ammoInventory.ammo_x1, laserAmmoBefore - 1);
  assert.equal(laserMissProfile.player.laserShotsFired, 1);

  const missileHit = resolveThresholdShot({
    id:"threshold-missile-hit",
    profile:createMissileProfile(),
    weaponClass:"missile",
    ammoId:"missile_m1",
    rolls:[0.799999, 0]
  });
  const missileMiss = resolveThresholdShot({
    id:"threshold-missile-miss",
    profile:createMissileProfile(),
    weaponClass:"missile",
    ammoId:"missile_m1",
    rolls:[0.8]
  });

  assert.equal(missileHit.outcome, "hit");
  assert.equal(missileHit.missileHits, 1);
  assert.equal(missileHit.travelTimeMs, 372);
  assert.equal(missileMiss.accepted, true);
  assert.equal(missileMiss.outcome, "miss");
  assert.equal(missileMiss.missileMisses, 1);

  const rocketHit = resolveThresholdShot({
    id:"threshold-rocket-hit",
    profile:createRocketProfile(),
    weaponClass:"rocket",
    ammoId:"rocket_r1",
    rolls:[0, 0.879999]
  });
  const rocketMiss = resolveThresholdShot({
    id:"threshold-rocket-miss",
    profile:createRocketProfile(),
    weaponClass:"rocket",
    ammoId:"rocket_r1",
    rolls:[0, 0.88]
  });

  assert.equal(rocketHit.outcome, "hit");
  assert.equal(rocketHit.travelTimeMs, 301);
  assert.equal(rocketMiss.accepted, true);
  assert.equal(rocketMiss.outcome, "miss");

  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:100, y:0},
    weaponClass:"laser",
    projectileSpeed:1
  }), 0);
  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:100, y:0},
    weaponClass:"rocket",
    projectileSpeed:620
  }), 301);
  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:100, y:0},
    weaponClass:"missile",
    projectileSpeed:520
  }), 372);
  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:0, y:0},
    weaponClass:"rocket",
    projectileSpeed:620
  }), 220);
  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:50_000, y:0},
    weaponClass:"rocket",
    projectileSpeed:620
  }), 1_550);
  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:0, y:0},
    weaponClass:"missile",
    projectileSpeed:520
  }), 280);
  assert.equal(calculateServerCombatTravelTimeMs({
    player:{state:{x:0, y:0}},
    enemy:{x:50_000, y:0},
    weaponClass:"missile",
    projectileSpeed:520
  }), 1_650);
});

function createProtocolFixture({
  enemy = {id:"enemy-protocol", x:100, y:0, hp:100, maxShield:0, shield:0},
  combatResult = null
} = {}){
  const player = {
    id:"player-protocol",
    accountId:"account-protocol",
    mapId:"0",
    mapRoom:"map:0",
    state:{x:0, y:0, mapId:"0", shipId:"orion", hp:100, maxHp:100}
  };
  const profile = createLaserProfile();
  const roomEvents = [];
  const socketEvents = [];
  const scheduled = [];
  let profileUpdates = 0;
  let combatMarks = 0;
  let activeEnemy = enemy;
  const socket = {
    id:player.id,
    emit(eventName, payload){
      socketEvents.push({eventName, payload});
    }
  };
  const handler = createEnemyHitHandler({
    emitWorldEnemies(){},
    emitWorldReward(){},
    emitPrivateQuestItemDrop(){},
    emitPrivatePortalPieceDrop(){},
    emitPrivateResourceDrops(){},
    findWorldEnemyForPlayer:()=>activeEnemy,
    groups:new Map(),
    io:{
      to:room=>({
        emit:(eventName, payload)=>roomEvents.push({room, eventName, payload})
      })
    },
    players:new Map([[player.id, player]]),
    presence:{
      markCombat(){
        combatMarks += 1;
      }
    },
    profileManager:{
      updateCombatProfileForPlayer({update}){
        profileUpdates += 1;
        if(combatResult) return {...combatResult, profile};
        return {...update(profile), profile};
      },
      profileKeyForPlayer:()=>player.accountId
    },
    progressServerQuestsForKill(){},
    updateLootOwner(){},
    spawnWorldEnemyChildren(){},
    scheduleCombatImpact(callback, delay){
      scheduled.push({callback, delay});
    }
  });
  return {
    combatMarks:()=>combatMarks,
    enemy,
    handler,
    player,
    profile,
    profileUpdates:()=>profileUpdates,
    roomEvents,
    scheduled,
    setActiveEnemy(value){
      activeEnemy = value;
    },
    socket,
    socketEvents
  };
}

test("an accepted shot is broadcast once, reserved once, then applies its prepared result after travel", ()=>{
  const fixture = createProtocolFixture({
    combatResult:{
      ok:true,
      accepted:true,
      outcome:"hit",
      hit:true,
      damage:25,
      weaponClass:"rocket",
      ammoId:"rocket_r1",
      consumed:1,
      ammoRemaining:49,
      cooldownMs:5_000,
      cooldownReadyAt:50_000,
      travelTimeMs:301,
      missileHits:0,
      missileMisses:0
    }
  });

  const result = fixture.handler.applyEnemyHit(fixture.socket, {
    shotId:"shot-delayed-1",
    enemyId:fixture.enemy.id,
    weaponClass:"rocket",
    ammoId:"rocket_r1",
    travelTimeMs:4_999,
    starts:[
      {x:4_000, y:8_000, curveSide:-1, curveStrength:999},
      {x:5, y:6, curveSide:1, curveStrength:12}
    ],
    blueLaser:true
  });

  assert.equal(result.accepted, true);
  assert.equal(result.shotId, "shot-delayed-1");
  assert.equal(fixture.profileUpdates(), 1);
  assert.equal(fixture.combatMarks(), 1);
  assert.equal(fixture.enemy.lockedPlayerId, fixture.player.id);
  assert.equal(fixture.enemy.hp, 100);
  assert.equal(fixture.scheduled.length, 1);
  assert.equal(fixture.scheduled[0].delay, 301);

  const shotEvent = fixture.roomEvents.find(entry=>entry.eventName === "combat:shot");
  assert.ok(shotEvent);
  assert.equal(shotEvent.room, "map:0");
  assert.equal(shotEvent.payload.shotId, "shot-delayed-1");
  assert.equal(shotEvent.payload.kind, "rocket");
  assert.equal(shotEvent.payload.targetId, fixture.enemy.id);
  assert.equal(shotEvent.payload.travelTime, 0.301);
  assert.equal(shotEvent.payload.travelTimeMs, 301);
  assert.equal(shotEvent.payload.cooldownMs, 5_000);
  assert.equal(shotEvent.payload.cooldownReadyAt, 50_000);
  assert.equal(shotEvent.payload.starts.length, 1);
  assert.ok(Math.hypot(
    shotEvent.payload.starts[0].x - fixture.player.state.x,
    shotEvent.payload.starts[0].y - fixture.player.state.y
  ) <= 80.000001);
  assert.equal(shotEvent.payload.starts[0].curveStrength, 64);
  assert.equal(fixture.roomEvents.some(entry=>entry.eventName === "combat:hit"), false);

  fixture.player.state.x = 10_000;
  fixture.profile.ammoInventory.ammo_x1 = 0;
  fixture.scheduled[0].callback();

  assert.equal(fixture.profileUpdates(), 1, "impact must not validate or reserve the shot again");
  assert.equal(fixture.enemy.hp, 75);
  const hitEvent = fixture.roomEvents.find(entry=>entry.eventName === "combat:hit");
  assert.equal(hitEvent.payload.accepted, true);
  assert.equal(hitEvent.payload.outcome, "hit");
  assert.equal(hitEvent.payload.shotId, "shot-delayed-1");
});

test("server shot geometry limits missile starts to consumed projectiles near the firing ship", ()=>{
  const player = {id:"geometry-player", mapId:"0", state:{x:10, y:20}};
  const target = {id:"geometry-target", x:500, y:20};
  const shot = createCombatShotPayload({
    payload:{
      shotId:"shot-geometry",
      weaponClass:"missile",
      ammoId:"missile_m1",
      starts:[
        {x:50_000, y:50_000, curveSide:4, curveStrength:900},
        {x:-50_000, y:-50_000, curveSide:-4, curveStrength:900},
        {x:60_000, y:-60_000, curveSide:4, curveStrength:900},
        {x:10, y:20, curveSide:1, curveStrength:1}
      ]
    },
    player,
    target,
    targetId:target.id,
    result:{
      weaponClass:"missile",
      ammoId:"missile_m1",
      consumed:3,
      ammoRemaining:7
    },
    shotId:"shot-geometry",
    travelTimeMs:900
  });

  assert.equal(shot.starts.length, 3);
  for(const start of shot.starts){
    assert.ok(Math.hypot(start.x - player.state.x, start.y - player.state.y) <= 90.000001);
    assert.ok(start.curveSide === -1 || start.curveSide === 1);
    assert.ok(start.curveStrength <= 160);
  }
});

test("combat hit carries shield state immediately before damage, including the breaking hit", ()=>{
  const fixture=createProtocolFixture({
    enemy:{id:"shield-contact",x:100,y:0,hp:100,maxShield:50,shield:50},
    combatResult:{ok:true,accepted:true,hit:true,damage:25,weaponClass:"rocket",ammoId:"rocket_r1",
      consumed:1,ammoRemaining:9,travelTimeMs:301}
  });
  fixture.handler.applyEnemyHit(fixture.socket,{shotId:"shield-hit",enemyId:fixture.enemy.id,weaponClass:"rocket",ammoId:"rocket_r1"});
  const shot=fixture.roomEvents.find(e=>e.eventName === "combat:shot").payload;
  assert.equal(shot.shieldBefore,50);
  fixture.enemy.shield=5; // Another hit has drained the shield during travel.
  fixture.scheduled[0].callback();
  const hit=fixture.roomEvents.find(e=>e.eventName === "combat:hit").payload;
  assert.equal(hit.shieldBefore,5);
  assert.equal(hit.targetDestroyed,false);
  assert.equal(fixture.enemy.shield,0);
  assert.equal(fixture.enemy.hp,80);
});

test("fatal shield feedback uses the actual absorption rules without changing the live enemy", ()=>{
  const enemy=Object.freeze({hp:20,shield:100,maxShield:100,shieldAbsorbRatio:.8});
  assert.equal(wouldEnemyHitKill(enemy,99),false);
  assert.equal(wouldEnemyHitKill(enemy,100),true,"20 hull damage despite 80 absorbed by shield");
  assert.equal(wouldEnemyHitKill({...enemy,shield:5},25),true);
  assert.equal(wouldEnemyHitKill({...enemy,damageImmune:true},1000),false);
  assert.equal(wouldEnemyHitKill(enemy,0),false);
  assert.equal(enemy.hp,20); assert.equal(enemy.shield,100);
});

test("one-shot lasers report destruction on both launch and hit before the enemy is removed", t=>{
  t.mock.method(globalThis,"setTimeout",()=>({unref(){}}));
  const fixture=createProtocolFixture({enemy:{id:"one-shot",x:100,y:0,hp:20,maxShield:5,shield:5},
    combatResult:{ok:true,accepted:true,hit:true,damage:25,weaponClass:"laser",ammoId:"ammo_x6",consumed:1,ammoRemaining:9,travelTimeMs:0}});
  fixture.handler.applyEnemyHit(fixture.socket,{shotId:"one-shot-x6",enemyId:fixture.enemy.id,weaponClass:"laser",ammoId:"ammo_x6"});
  const shot=fixture.roomEvents.find(e=>e.eventName==="combat:shot").payload;
  const hit=fixture.roomEvents.find(e=>e.eventName==="combat:hit").payload;
  assert.equal(shot.targetDestroyed,true); assert.equal(hit.targetDestroyed,true);
  assert.equal(hit.shieldBefore,5); assert.equal(fixture.enemy.hp,0);
});

test("a prepared PvE impact is silently discarded when its target dies, becomes immune or is replaced", ()=>{
  const preparedResult = {
    ok:true,
    accepted:true,
    outcome:"hit",
    hit:true,
    damage:25,
    weaponClass:"rocket",
    ammoId:"rocket_r1",
    consumed:1,
    ammoRemaining:9,
    travelTimeMs:301
  };
  const cases = [
    {
      name:"dead",
      mutate(fixture){
        fixture.enemy.hp = 0;
      }
    },
    {
      name:"immune",
      mutate(fixture){
        fixture.enemy.damageImmune = true;
      }
    },
    {
      name:"replaced",
      mutate(fixture){
        fixture.setActiveEnemy({
          id:fixture.enemy.id,
          x:fixture.enemy.x,
          y:fixture.enemy.y,
          hp:100,
          maxShield:0,
          shield:0
        });
      }
    }
  ];

  for(const scenario of cases){
    const fixture = createProtocolFixture({combatResult:preparedResult});
    const result = fixture.handler.applyEnemyHit(fixture.socket, {
      shotId:`shot-cancel-${scenario.name}`,
      enemyId:fixture.enemy.id,
      weaponClass:"rocket",
      ammoId:"rocket_r1",
      travelTimeMs:0
    });
    assert.equal(result.accepted, true);
    assert.equal(fixture.scheduled.length, 1);
    scenario.mutate(fixture);
    const hpBeforeImpact = fixture.enemy.hp;
    fixture.scheduled[0].callback();

    assert.equal(fixture.enemy.hp, hpBeforeImpact);
    assert.equal(fixture.roomEvents.some(entry=>entry.eventName === "combat:hit"), false);
    assert.equal(fixture.socketEvents.some(entry=>entry.eventName === "combat:rejected"), false);
  }
});

test("a prepared portal impact is silently discarded after the instance advances to another wave", ()=>{
  const enemy = {id:"portal-enemy", x:100, y:0, hp:100, maxShield:0, shield:0};
  const instance = {
    type:"portal",
    portal:{id:"blue"},
    wave:4,
    enemies:[enemy],
    abandonedMemberIds:[],
    completed:false
  };
  const group = {id:"group-portal", instance};
  const player = {
    id:"portal-player",
    accountId:"portal-account",
    groupId:group.id,
    mapId:"portal-blue",
    mapRoom:"instance:portal-blue",
    state:{x:0, y:0, mapId:"portal-blue", shipId:"orion", hp:100, maxHp:100}
  };
  const roomEvents = [];
  const scheduled = [];
  const handler = createEnemyHitHandler({
    buildServerPortalWave:()=>[],
    emitPortalComplete(){},
    emitWorldEnemies(){},
    findWorldEnemyForPlayer:()=>null,
    groups:new Map([[group.id, group]]),
    io:{to:room=>({emit:(eventName, payload)=>roomEvents.push({room, eventName, payload})})},
    players:new Map([[player.id, player]]),
    presence:{markCombat(){}},
    profileManager:{
      updateCombatProfileForPlayer:()=>({
        ok:true,
        accepted:true,
        outcome:"hit",
        hit:true,
        damage:25,
        weaponClass:"rocket",
        ammoId:"rocket_r1",
        consumed:1,
        ammoRemaining:9,
        travelTimeMs:301,
        profile:{}
      }),
      profileKeyForPlayer:()=>player.accountId
    },
    updateLootOwner(){},
    scheduleCombatImpact(callback, delay){
      scheduled.push({callback, delay});
    }
  });
  const socket = {id:player.id, emit(){}};

  const result = handler.applyEnemyHit(socket, {
    shotId:"shot-old-wave",
    enemyId:enemy.id,
    weaponClass:"rocket",
    ammoId:"rocket_r1"
  });
  assert.equal(result.accepted, true);
  assert.equal(scheduled.length, 1);

  instance.wave = 5;
  instance.enemies = [{...enemy, id:"next-wave-enemy"}];
  scheduled[0].callback();

  assert.equal(enemy.hp, 100);
  assert.equal(roomEvents.some(entry=>entry.eventName === "combat:hit"), false);
});

test("a genuine prepared miss remains accepted, consumes the shot and triggers aggro", ()=>{
  const fixture = createProtocolFixture({
    combatResult:{
      ok:true,
      accepted:true,
      outcome:"miss",
      hit:false,
      damage:0,
      weaponClass:"missile",
      ammoId:"missile_m1",
      consumed:1,
      ammoRemaining:49,
      travelTimeMs:372
    }
  });

  const result = fixture.handler.applyEnemyHit(fixture.socket, {
    shotId:"shot-real-miss",
    enemyId:fixture.enemy.id,
    weaponClass:"missile",
    ammoId:"missile_m1",
    travelTimeMs:1
  });

  assert.equal(result.accepted, true);
  assert.equal(result.outcome, "miss");
  assert.equal(fixture.enemy.lockedPlayerId, fixture.player.id);
  fixture.scheduled[0].callback();

  const hitEvent = fixture.roomEvents.find(entry=>entry.eventName === "combat:hit");
  assert.equal(hitEvent.payload.accepted, true);
  assert.equal(hitEvent.payload.outcome, "miss");
  assert.equal(hitEvent.payload.hit, false);
  assert.equal(hitEvent.payload.consumed, 1);
  assert.equal(fixture.socketEvents.some(entry=>entry.eventName === "combat:rejected"), false);
});

test("prepared PvP impact validation rejects disconnects, replacement sessions, safe zones and respawns", ()=>{
  const attacker = {
    id:"pvp-attacker",
    connected:true,
    mapId:"0",
    mapRoom:"map:0",
    combatLifeGeneration:2,
    state:{mapId:"0", hp:100}
  };
  const target = {
    id:"pvp-target",
    connected:true,
    mapId:"0",
    mapRoom:"map:0",
    combatLifeGeneration:5,
    state:{mapId:"0", hp:100}
  };
  const players = new Map([[attacker.id, attacker], [target.id, target]]);
  const snapshot = {
    players,
    attacker,
    target,
    attackerState:attacker.state,
    targetState:target.state,
    attackerLifeGeneration:2,
    targetLifeGeneration:5,
    mapId:"0",
    mapRoom:"map:0"
  };

  assert.equal(isPreparedPlayerImpactValid(snapshot), true);
  attacker.state = {...attacker.state, x:5, updatedAt:1100};
  target.state = {...target.state, x:15, updatedAt:1100};
  assert.equal(
    isPreparedPlayerImpactValid(snapshot),
    true,
    "ordinary movement snapshots must not cancel an in-flight PvP projectile"
  );
  target.connected = false;
  assert.equal(isPreparedPlayerImpactValid(snapshot), false);
  target.connected = true;
  target.combatLifeGeneration += 1;
  assert.equal(isPreparedPlayerImpactValid(snapshot), false, "a pre-respawn shot cannot hit the next life");
  target.combatLifeGeneration = 5;
  assert.equal(isPreparedPlayerImpactValid({...snapshot, isPvpBlocked:()=>true}), false);
  assert.equal(isPreparedPlayerImpactValid({...snapshot, isSafe:()=>true}), false);
  players.set(target.id, {...target});
  assert.equal(isPreparedPlayerImpactValid(snapshot), false, "a replacement socket/session is not the prepared target");
});

test("server death transition increments the combat life generation exactly once", ()=>{
  const player = {
    id:"life-generation-player",
    mapId:"0",
    combatLifeGeneration:3,
    state:{
      mapId:"0",
      x:0,
      y:0,
      hp:0,
      maxHp:100,
      shield:0,
      maxShield:0
    }
  };
  const manager = createPlayerLifecycleManager({
    io:{
      to:()=>({emit(){}}),
      sockets:{sockets:new Map()}
    },
    players:new Map([[player.id, player]]),
    groups:new Map(),
    profileManager:{
      applyQuestAction:()=>({changed:false}),
      saveWorldSession(){}
    },
    presence:{markCombat(){}},
    setPlayerMap(){},
    logger:{warn(){}}
  });

  assert.equal(manager.markPlayerDead(player), true);
  assert.equal(player.combatLifeGeneration, 4);
  assert.equal(manager.markPlayerDead(player), false);
  assert.equal(player.combatLifeGeneration, 4);
});

test("an out-of-range request is privately rejected without shot, hit, ammo use, presence or aggro", ()=>{
  const fixture = createProtocolFixture({
    enemy:{id:"enemy-too-far", x:5_000, y:0, hp:100, maxShield:0, shield:0}
  });
  const ammoBefore = fixture.profile.ammoInventory.ammo_x1;

  const result = fixture.handler.applyEnemyHit(fixture.socket, {
    shotId:"shot-rejected-range",
    enemyId:fixture.enemy.id,
    weaponClass:"laser",
    ammoId:"ammo_x1",
    travelTimeMs:250
  });

  assert.equal(result.accepted, false);
  assert.equal(result.outcome, "rejected");
  assert.equal(result.reasonCode, "OUT_OF_RANGE");
  assert.equal(fixture.profile.ammoInventory.ammo_x1, ammoBefore);
  assert.equal(fixture.combatMarks(), 0);
  assert.equal(fixture.enemy.lockedPlayerId, undefined);
  assert.equal(fixture.scheduled.length, 0);
  assert.equal(fixture.roomEvents.length, 0);
  assert.deepEqual(
    fixture.socketEvents.map(entry=>entry.eventName),
    ["combat:rejected"]
  );
  assert.equal(fixture.socketEvents[0].payload.shotId, "shot-rejected-range");
  assert.equal(fixture.socketEvents[0].payload.consumed, 0);
});

function createSocket(){
  const handlers = new Map();
  const emitted = [];
  return {
    id:"socket-protocol",
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

test("combat fire callbacks expose the compact accepted and rejected contracts", ()=>{
  const acceptedSocket = createSocket();
  const recorded = [];
  registerCombatHandlers(acceptedSocket, {
    applyEnemyHit:(_socket, payload)=>({
      ok:true,
      accepted:true,
      outcome:"miss",
      shotId:payload.shotId,
      consumed:1,
      ammoRemaining:17
    }),
    guard:()=>true,
    players:new Map(),
    recordCombatResult:(outcome, reasonCode)=>recorded.push({outcome, reasonCode})
  });
  let acceptedAck = null;
  acceptedSocket.handlers.get("combat:fire")({
    shotId:"shot-ack-ok",
    enemyId:"enemy-1",
    weaponClass:"laser",
    ammoId:"ammo_x1"
  }, payload=>{
    acceptedAck = payload;
  });

  assert.deepEqual(acceptedAck, {
    accepted:true,
    shotId:"shot-ack-ok",
    ammoRemaining:17,
    consumed:1,
    cooldownMs:0,
    cooldownReadyAt:0
  });
  assert.deepEqual(recorded, [{outcome:"miss", reasonCode:""}]);

  const rejectedSocket = createSocket();
  registerCombatHandlers(rejectedSocket, {
    guard:()=>false,
    players:new Map([[rejectedSocket.id, {
      id:rejectedSocket.id,
      mapId:"0",
      state:{x:0, y:0}
    }]])
  });
  let rejectedAck = null;
  rejectedSocket.handlers.get("combat:fire")({
    shotId:"shot-ack-rejected",
    enemyId:"enemy-2",
    weaponClass:"laser",
    ammoId:"ammo_x1"
  }, payload=>{
    rejectedAck = payload;
  });

  assert.equal(rejectedAck.accepted, false);
  assert.equal(rejectedAck.outcome, "rejected");
  assert.equal(rejectedAck.shotId, "shot-ack-rejected");
  assert.equal(rejectedAck.reasonCode, "REQUEST_REJECTED");
  assert.equal(rejectedSocket.emitted.some(entry=>entry.eventName === "combat:rejected"), true);
  assert.equal(rejectedSocket.emitted.some(entry=>entry.eventName === "combat:hit"), false);
});
