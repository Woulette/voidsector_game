import assert from "node:assert/strict";
import test from "node:test";
import { createEnemyHitHandler, applyDamageToEnemy } from "../src/combat/enemyHits.js";
import { createGroupManager } from "../src/groups/groups.js";
import {
  createVesperAlliedDrone,
  createVesperBoss,
  createVesperDefenders,
  createVesperPortalState,
  publicVesperAllies,
  publicVesperObjective,
  VESPER_ALLY_DAMAGE_MAX,
  VESPER_ALLY_DAMAGE_MIN,
  VESPER_ALLY_HP,
  VESPER_ALLY_SHIELD,
  VESPER_BOSS_DAMAGE_MAX,
  VESPER_BOSS_DAMAGE_MIN,
  VESPER_BOSS_HP,
  VESPER_BOSS_RANGE,
  VESPER_BOSS_SHIELD,
  VESPER_BOSS_SPEED,
  VESPER_CAGE_COUNT,
  VESPER_PORTAL_MAP
} from "../src/portals/vesperPortalState.js";
import { createVesperPortalRuntime } from "../src/portals/vesperPortalRuntime.js";
import { createWorldAiManager } from "../src/world/ai.js";
import { publicEnemy } from "../src/world/spawn.js";

function buildFixture({random = ()=>0, awardPortalEnemyReward} = {}){
  const emitted = [];
  const io = {
    to(room){
      return {
        emit(event, payload){
          emitted.push({room, event, payload});
        }
      };
    }
  };
  const state = createVesperPortalState(1_000);
  const player = {
    id:"vesper-player",
    connected:true,
    clientMode:"game",
    groupId:"vesper-group",
    mapId:"portal-violet",
    state:{
      mapId:"portal-violet",
      x:VESPER_PORTAL_MAP.cages[0].x,
      y:VESPER_PORTAL_MAP.cages[0].y,
      hp:100_000,
      maxHp:100_000,
      shield:100_000,
      maxShield:100_000
    }
  };
  const instance = {
    id:"VESPER-INSTANCE",
    type:"portal",
    portal:{id:"violet", name:"La Faille de Vesper"},
    completed:false,
    joinedMemberIds:[player.id],
    abandonedMemberIds:[],
    enemies:state.enemies,
    allies:state.allies,
    objective:state.objective
  };
  const group = {
    id:"vesper-group",
    leaderId:player.id,
    members:[player.id],
    instance
  };
  const players = new Map([[player.id, player]]);
  const groups = new Map([[group.id, group]]);
  let completionCount = 0;
  let instanceEmitCount = 0;
  const runtime = createVesperPortalRuntime({
    io,
    players,
    groups,
    random,
    awardPortalEnemyReward,
    emitInstance(){
      instanceEmitCount += 1;
    },
    emitPortalComplete(targetGroup){
      completionCount += 1;
      targetGroup.instance.completed = true;
    }
  });
  return {
    emitted,
    group,
    groups,
    instance,
    player,
    players,
    runtime,
    get completionCount(){ return completionCount; },
    get instanceEmitCount(){ return instanceEmitCount; }
  };
}

function destroyCageDefense(fixture, cage){
  for(const turretId of cage.turretIds){
    const turret = fixture.instance.enemies.find(enemy=>enemy.id === turretId);
    turret.hp = 0;
    fixture.runtime.handleVesperEnemyDeath(fixture.group, turret, fixture.player.id);
  }
}

test("Vesper starts with four protected cages and two static-position turrets per cage", ()=>{
  const state = createVesperPortalState(1_000);

  assert.equal(state.objective.kind, "vesper");
  assert.equal(state.objective.stage, "cages");
  assert.equal(state.objective.cages.length, VESPER_CAGE_COUNT);
  assert.equal(state.enemies.filter(enemy=>enemy.vesperCage).length, 4);
  assert.equal(state.enemies.filter(enemy=>enemy.vesperTurret).length, 8);
  assert.equal(state.enemies.filter(enemy=>enemy.vesperCage).every(enemy=>enemy.damageImmune), true);
  assert.equal(state.enemies.filter(enemy=>enemy.vesperTurret).every(enemy=>enemy.speed === 0), true);
  assert.deepEqual(
    state.objective.cages.map(cage=>[cage.x, cage.y]),
    VESPER_PORTAL_MAP.cages.map(cage=>[cage.x, cage.y])
  );
});

test("approaching a Vesper cage spawns its cautious defenders only once", ()=>{
  const fixture = buildFixture();
  const cage = fixture.instance.objective.cages[0];

  fixture.runtime.updateVesperGroup(fixture.group, .05, 2_000);
  const firstDefenders = fixture.instance.enemies.filter(enemy=>
    enemy.vesperGuard && enemy.vesperCageNumber === cage.number && enemy.vesperGuardPhase === "approach"
  );

  assert.equal(cage.defendersSpawned, true);
  assert.equal(firstDefenders.length, 3);
  assert.equal(firstDefenders.every(enemy=>enemy.lockedPlayerId === fixture.player.id), true);
  assert.equal(firstDefenders.every(enemy=>enemy.guardLeashRadius === VESPER_PORTAL_MAP.guardLeashRadius), true);

  fixture.runtime.updateVesperGroup(fixture.group, .05, 2_100);
  assert.equal(
    fixture.instance.enemies.filter(enemy=>
      enemy.vesperGuard && enemy.vesperCageNumber === cage.number && enemy.vesperGuardPhase === "approach"
    ).length,
    3
  );
});

test("Vesper cage shots are refused before ammo processing while its turrets live", ()=>{
  const fixture = buildFixture();
  const cageState = fixture.instance.objective.cages[0];
  const cage = fixture.instance.enemies.find(enemy=>enemy.id === cageState.id);
  let profileUpdateCalls = 0;
  const socketEvents = [];
  const socket = {
    id:fixture.player.id,
    emit(event, payload){
      socketEvents.push({event, payload});
    }
  };
  const handler = createEnemyHitHandler({
    buildServerPortalWave(){ return []; },
    emitInstance(){},
    emitPortalComplete(){},
    handlePortalEnemyDeath(){},
    emitPrivatePortalAnchorKeyDrop(){},
    emitPrivatePortalPieceDrop(){},
    emitPrivateQuestItemDrop(){},
    emitPrivateResourceDrops(){},
    emitWorldEnemies(){},
    emitWorldReward(){},
    findWorldEnemyForPlayer(){ return null; },
    groups:fixture.groups,
    io:{to:()=>({emit(){}})},
    players:fixture.players,
    presence:{markCombat(){}},
    profileManager:{
      updateCombatProfileForPlayer(){
        profileUpdateCalls += 1;
        return {ok:false};
      }
    },
    firmWarManager:null,
    emitProfileSync(){},
    progressServerQuestsForKill(){},
    portalWaveTotal:20
  });

  const result = handler.applyEnemyHit(socket, {
    enemyId:cage.id,
    weaponClass:"laser",
    ammoId:"ammo_x1"
  });

  assert.equal(result.ok, false);
  assert.equal(profileUpdateCalls, 0);
  assert.match(socketEvents.at(-1)?.payload?.reason || "", /tourelles/i);
  assert.equal(cage.hp, cage.maxHp);

  applyDamageToEnemy(cage, 99_999);
  assert.equal(cage.hp, cage.maxHp);
});

test("destroying both turrets removes the cage immunity", ()=>{
  const fixture = buildFixture();
  const cageState = fixture.instance.objective.cages[0];
  const cage = fixture.instance.enemies.find(enemy=>enemy.id === cageState.id);

  destroyCageDefense(fixture, cageState);

  assert.equal(cageState.turretsRemaining, 0);
  assert.equal(cage.damageImmune, false);
  applyDamageToEnemy(cage, 1_000);
  assert.equal(cage.hp, cage.maxHp - 1_000);
  assert.equal(fixture.emitted.some(entry=>entry.event === "portal:vesper-cage-unlocked"), true);
});

test("each destroyed cage releases one red autonomous drone and spawns reinforcements", ()=>{
  const fixture = buildFixture();
  const cageState = fixture.instance.objective.cages[0];
  destroyCageDefense(fixture, cageState);
  const cage = fixture.instance.enemies.find(enemy=>enemy.id === cageState.id);
  cage.hp = 0;

  fixture.runtime.handleVesperEnemyDeath(fixture.group, cage, fixture.player.id);

  assert.equal(cageState.destroyed, true);
  assert.equal(cageState.reinforcementsSpawned, true);
  assert.equal(
    fixture.instance.enemies.filter(enemy=>
      enemy.vesperGuard && enemy.vesperCageNumber === cageState.number && enemy.vesperGuardPhase === "reinforcement"
    ).length,
    2
  );
  assert.equal(fixture.instance.allies.length, 1);
  const ally = fixture.instance.allies[0];
  assert.equal(ally.hp, VESPER_ALLY_HP);
  assert.equal(ally.shield, VESPER_ALLY_SHIELD);
  assert.equal(ally.damageMin, VESPER_ALLY_DAMAGE_MIN);
  assert.equal(ally.damageMax, VESPER_ALLY_DAMAGE_MAX);
  assert.equal(ally.renderMode, "vesper_ally_drone");
  assert.match(ally.color, /239,68,68/);
  const npcTargets = fixture.runtime.getVesperNpcTargets(fixture.instance, "portal-violet");
  assert.equal(npcTargets.length, 1);
  assert.equal(npcTargets[0].npcTarget, true);
  assert.equal(npcTargets[0].state, ally);
});

test("the four cages spawn the exact giant Vesper boss and its red orbiters", ()=>{
  const fixture = buildFixture();

  for(const cageState of fixture.instance.objective.cages){
    destroyCageDefense(fixture, cageState);
    const cage = fixture.instance.enemies.find(enemy=>enemy.id === cageState.id);
    cage.hp = 0;
    fixture.runtime.handleVesperEnemyDeath(fixture.group, cage, fixture.player.id);
  }

  assert.equal(fixture.instance.objective.cagesDestroyed, 4);
  assert.equal(fixture.instance.allies.length, 4);
  assert.equal(fixture.instance.objective.stage, "boss");
  assert.equal(fixture.instance.objective.bossSpawned, true);
  assert.equal(fixture.instance.objective.bossOrbiters.length, 6);
  const boss = fixture.instance.enemies.find(enemy=>enemy.vesperBoss);
  assert.ok(boss);
  assert.equal(boss.hp, VESPER_BOSS_HP);
  assert.equal(boss.shield, VESPER_BOSS_SHIELD);
  assert.equal(boss.attackDamageMin, VESPER_BOSS_DAMAGE_MIN);
  assert.equal(boss.attackDamageMax, VESPER_BOSS_DAMAGE_MAX);
  assert.equal(boss.attackRange, VESPER_BOSS_RANGE);
  assert.equal(boss.speed, VESPER_BOSS_SPEED);

  boss.hp = 0;
  fixture.runtime.handleVesperEnemyDeath(fixture.group, boss, fixture.player.id);
  assert.equal(fixture.completionCount, 1);
  assert.equal(fixture.instance.objective.stage, "complete");
  assert.deepEqual(fixture.instance.objective.bossOrbiters, []);
});

test("a liberated Vesper drone moves independently and deals 1000 server damage", ()=>{
  const fixture = buildFixture({random:()=>0});
  fixture.player.state.x = 0;
  fixture.player.state.y = 0;
  const ally = createVesperAlliedDrone({number:1, x:0, y:0}, 0, 1_000);
  ally.nextAttackAt = 0;
  const target = createVesperBoss(1_000);
  target.x = 300;
  target.y = 0;
  target.homeX = 300;
  target.homeY = 0;
  target.shield = 0;
  target.maxShield = 0;
  target.hp = 10_000;
  target.maxHp = 10_000;
  target.vesperBoss = false;
  fixture.instance.allies = [ally];
  fixture.instance.enemies = [target];

  fixture.runtime.updateVesperGroup(fixture.group, .05, 2_000);

  assert.equal(target.hp, 9_000);
  assert.equal(target.lockedPlayerId, ally.id);
  assert.equal(
    fixture.emitted.some(entry=>
      entry.event === "combat:hit"
      && entry.payload.attackerId === ally.id
      && entry.payload.damage === 1_000
    ),
    true
  );
});

test("a liberated Vesper drone routes its killing blow through portal rewards", ()=>{
  const awarded = [];
  const fixture = buildFixture({
    random:()=>0,
    awardPortalEnemyReward:(group, enemy, killerId)=>awarded.push({group, enemy, killerId})
  });
  fixture.player.state.x = 0;
  fixture.player.state.y = 0;
  const ally = createVesperAlliedDrone({number:1, x:0, y:0}, 0, 1_000);
  ally.nextAttackAt = 0;
  const target = createVesperBoss(1_000);
  target.x = 300;
  target.y = 0;
  target.homeX = 300;
  target.homeY = 0;
  target.shield = 0;
  target.maxShield = 0;
  target.hp = 1_000;
  target.maxHp = 1_000;
  target.vesperBoss = false;
  fixture.instance.allies = [ally];
  fixture.instance.enemies = [target];

  fixture.runtime.updateVesperGroup(fixture.group, .05, 2_000);

  assert.equal(target.hp, 0);
  assert.equal(awarded.length, 1);
  assert.equal(awarded[0].enemy.id, target.id);
  assert.equal(awarded[0].killerId, ally.id);
});

test("Vesper public state exposes cages, allies and non-targetable boss orbiters", ()=>{
  const fixture = buildFixture();
  fixture.instance.allies = [createVesperAlliedDrone({number:1, x:0, y:0}, 0, 1_000)];
  fixture.instance.objective.bossSpawned = true;
  const boss = createVesperBoss(1_000);
  fixture.instance.objective.bossId = boss.id;
  fixture.instance.objective.bossOrbiters = [{
    id:"orbiter-1",
    img:"assets/drones/drone_test_sprite.webp",
    renderMode:"vesper_boss_orbiter",
    color:"red",
    x:10,
    y:20,
    angle:1,
    orbitRadius:225,
    size:52
  }];

  const objective = publicVesperObjective(fixture.instance);
  const allies = publicVesperAllies(fixture.instance);

  assert.equal(objective.kind, "vesper");
  assert.equal(objective.cages.length, 4);
  assert.equal(objective.bossOrbiters.length, 1);
  assert.equal(Object.hasOwn(objective.bossOrbiters[0], "hp"), false);
  assert.equal(allies.length, 1);
  assert.equal(allies[0].renderMode, "vesper_ally_drone");
  assert.equal(allies[0].hp, VESPER_ALLY_HP);
});

test("coop snapshots publish Vesper objective, allies and the authoritative life counter", ()=>{
  const fixture = buildFixture();
  fixture.instance.playerLives = {[fixture.player.id]:2};
  fixture.instance.allies = [createVesperAlliedDrone({number:1, x:0, y:0}, 0, 1_000)];
  const events = [];
  const manager = createGroupManager({
    io:{
      to(target){
        return {emit:(event, payload)=>events.push({target, event, payload})};
      }
    },
    players:fixture.players,
    publicPlayer:player=>player,
    publicEnemy,
    emitPlayers(){}
  });
  manager.groups.set(fixture.group.id, fixture.group);

  manager.emitInstance(fixture.group);

  const payload = events.find(entry=>entry.event === "coop:enemies")?.payload;
  assert.equal(payload.objective.kind, "vesper");
  assert.equal(payload.objective.cages.length, 4);
  assert.equal(payload.allies.length, 1);
  assert.equal(payload.allies[0].hp, VESPER_ALLY_HP);
  assert.equal(payload.playerLives[fixture.player.id], 2);
  assert.equal(payload.enemies.filter(enemy=>enemy.renderMode === "vesper_cage").length, 4);
});

test("a cautious Vesper guard drops a fleeing player and returns toward its post", ()=>{
  const cage = VESPER_PORTAL_MAP.cages[0];
  const guard = createVesperDefenders(cage, "approach", 1_000)[0];
  guard.x = guard.homeX + 500;
  guard.y = guard.homeY;
  guard.lockedPlayerId = "runner";
  guard.lockedPlayerLastSeenAt = 2_000;
  guard.attackedPlayerId = "runner";
  guard.attackedPlayerLastAt = 2_000;
  guard.damageThreat = {runner:500};
  const player = {
    id:"runner",
    connected:true,
    clientMode:"game",
    mapId:"portal-violet",
    state:{
      mapId:"portal-violet",
      x:guard.homeX + guard.guardLeashRadius + 400,
      y:guard.homeY,
      hp:10_000
    }
  };
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });
  const before = Math.abs(guard.x - guard.homeX);

  manager.updateWorldEnemy(
    guard,
    {id:"portal-violet", width:VESPER_PORTAL_MAP.width, height:VESPER_PORTAL_MAP.height},
    [player],
    .1,
    2_100
  );

  assert.equal(guard.lockedPlayerId, null);
  assert.deepEqual(guard.damageThreat, {});
  assert.ok(Math.abs(guard.x - guard.homeX) < before);
});

test("Vesper turrets remain anchored while still attacking nearby players", ()=>{
  const state = createVesperPortalState(1_000);
  const turret = state.enemies.find(enemy=>enemy.vesperTurret);
  const player = {
    id:"turret-target",
    connected:true,
    clientMode:"game",
    mapId:"portal-violet",
    state:{
      mapId:"portal-violet",
      x:turret.x + 300,
      y:turret.y,
      hp:10_000
    }
  };
  const attacks = [];
  const manager = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack:attack=>attacks.push(attack),
    isPlayerSafeOnMap:()=>false
  });
  const map = {id:"portal-violet", width:VESPER_PORTAL_MAP.width, height:VESPER_PORTAL_MAP.height};
  const start = {x:turret.x, y:turret.y};

  manager.updateWorldEnemy(turret, map, [player], .1, 2_000);
  manager.updateWorldEnemy(turret, map, [player], .1, 4_000);

  assert.deepEqual({x:turret.x, y:turret.y}, start);
  assert.equal(turret.moving, false);
  assert.equal(attacks.length, 1);
});
