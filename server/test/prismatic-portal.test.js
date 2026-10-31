import test from "node:test";
import assert from "node:assert/strict";
import { applyDamageToEnemy } from "../src/combat/enemyHits.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { getTrustedMovementSpeed, validatePlayerState } from "../src/players/playerStateValidation.js";
import { createPlayerActivityManager } from "../src/world/playerActivity.js";
import { createWorldAiManager } from "../src/world/ai.js";
import { publicEnemyDefinition } from "../src/world/spawn.js";
import {
  createPrismaticGuardian,
  createPrismaticPortalRuntime,
  PRISMATIC_BOSS_DAMAGE_MAX,
  PRISMATIC_BOSS_DAMAGE_MIN,
  PRISMATIC_BOSS_MAX_HP,
  PRISMATIC_BOSS_MAX_SHIELD,
  PRISMATIC_BOSS_RANGE,
  PRISMATIC_BOSS_SPEED,
  PRISMATIC_BURN_COOLDOWN_MS,
  PRISMATIC_BURN_DAMAGE,
  PRISMATIC_BURN_TICKS,
  PRISMATIC_GUARDIAN_DAMAGE_MAX,
  PRISMATIC_GUARDIAN_DAMAGE_MIN,
  PRISMATIC_GUARDIAN_ASSET,
  PRISMATIC_GUARDIAN_MAX_HP,
  PRISMATIC_GUARDIAN_MAX_SHIELD,
  PRISMATIC_GUARDIAN_RANGE,
  PRISMATIC_GUARDIAN_SPEED,
  PRISMATIC_HEAL_AMOUNT,
  PRISMATIC_HEAL_TICKS,
  PRISMATIC_PLANET_MAX_HP,
  PRISMATIC_PORTAL_MAP,
  PRISMATIC_SLOW_DURATION_MS,
  PRISMATIC_SLOW_PERCENT,
  publicPrismaticObjective
} from "../src/portals/prismaticPortal.js";
import { getServerPortalDefinition, getPortalContentLock } from "../src/portals/portalDefinitions.js";

function createFixture(){
  let currentTime = 1_000;
  let completionCount = 0;
  const events = [];
  const snapshots = [];
  const profile = createDefaultProfile();
  profile.player.level = 40;
  const player = {
    id:"prismatic-pilot",
    accountId:"prismatic-account",
    connected:true,
    clientMode:"game",
    mapId:"portal-prismatic",
    statusEffects:{},
    state:{
      mapId:"portal-prismatic",
      x:PRISMATIC_PORTAL_MAP.spawn.x,
      y:PRISMATIC_PORTAL_MAP.spawn.y,
      hp:250_000,
      maxHp:250_000,
      shield:100_000,
      maxShield:100_000,
      updatedAt:currentTime
    }
  };
  const instance = {
    id:"prismatic-instance",
    type:"portal",
    portal:{id:"prismatic", name:"Le Nexus Prismatique", totalWaves:0},
    completed:false,
    joinedMemberIds:[player.id],
    abandonedMemberIds:[],
    playerLives:{[player.id]:3},
    enemies:[]
  };
  const group = {
    id:"prismatic-group",
    leaderId:player.id,
    members:[player.id],
    instance
  };
  const players = new Map([[player.id, player]]);
  const groups = new Map([[group.id, group]]);
  const runtime = createPrismaticPortalRuntime({
    io:{
      to(targetId){
        return {
          emit(event, payload){
            events.push({targetId, event, payload});
          }
        };
      }
    },
    groups,
    players,
    presence:{
      isActiveForWorld:()=>true,
      markCombat(){},
      markDamage(){}
    },
    profileManager:{
      getProfileForPlayer:()=>profile,
      applyQuestAction:()=>({ok:true, changed:false}),
      saveWorldSession(){}
    },
    emitProfileSync(){},
    emitInstance(currentGroup){
      snapshots.push(publicPrismaticObjective(currentGroup.instance));
    },
    emitPortalComplete(){
      completionCount += 1;
    },
    now:()=>currentTime
  });
  runtime.start(group);
  return {
    events,
    group,
    groups,
    instance,
    player,
    players,
    profile,
    runtime,
    snapshots,
    completionCount:()=>completionCount,
    setTime(value){
      currentTime = Number(value);
    }
  };
}

function defeatPlanetGuardians(fixture, planetId, at){
  const guardians = fixture.instance.enemies.filter(enemy=>
    enemy.prismaticGuardian
    && enemy.prismaticPlanetId === planetId
  );
  for(const guardian of guardians){
    guardian.hp = 0;
    fixture.runtime.handleEnemyDeath(fixture.group, guardian, at);
  }
}

function reachBossStage(fixture, at = 5_000){
  for(const planetState of fixture.instance.objective.planets){
    defeatPlanetGuardians(fixture, planetState.id, at);
    const planet = fixture.instance.enemies.find(enemy=>
      enemy.prismaticPlanet
      && enemy.prismaticPlanetId === planetState.id
    );
    planet.hp = 0;
    fixture.runtime.handleEnemyDeath(fixture.group, planet, at);
  }
  assert.equal(fixture.instance.objective.stage, "rift");
  fixture.player.state.x = PRISMATIC_PORTAL_MAP.rift.x;
  fixture.player.state.y = PRISMATIC_PORTAL_MAP.rift.y;
  fixture.runtime.updateGroup(fixture.group, .05, at + 1);
  assert.equal(fixture.instance.objective.stage, "bosses");
}

test("Prismatic is the playable level-40 progression portal", ()=>{
  const definition = getServerPortalDefinition("prismatic");
  assert.equal(definition?.level, 40);
  assert.equal(definition?.piecesRequired, 80);
  assert.equal(definition?.gameplayReady, true);
  assert.equal(getPortalContentLock("prismatic"), null);
});

test("Prismatic starts with three guarded planets and the exact authoritative stats", ()=>{
  const fixture = createFixture();
  const planets = fixture.instance.enemies.filter(enemy=>enemy.prismaticPlanet);
  const guardians = fixture.instance.enemies.filter(enemy=>enemy.prismaticGuardian);

  assert.deepEqual(fixture.instance.spawn || null, null);
  assert.equal(planets.length, 3);
  assert.equal(guardians.length, 9);
  assert.equal(planets.every(planet=>
    planet.hp === PRISMATIC_PLANET_MAX_HP
    && planet.maxHp === PRISMATIC_PLANET_MAX_HP
    && planet.damageImmune
    && planet.static
    && planet.noReward
  ), true);
  assert.equal(guardians.every(guardian=>
    guardian.hp === PRISMATIC_GUARDIAN_MAX_HP
    && guardian.shield === PRISMATIC_GUARDIAN_MAX_SHIELD
    && guardian.attackDamageMin === PRISMATIC_GUARDIAN_DAMAGE_MIN
    && guardian.attackDamageMax === PRISMATIC_GUARDIAN_DAMAGE_MAX
    && guardian.attackRange === PRISMATIC_GUARDIAN_RANGE
    && guardian.speed === PRISMATIC_GUARDIAN_SPEED
    && guardian.guardLeashRadius > 0
    && guardian.img === PRISMATIC_GUARDIAN_ASSET
    && !guardian.noReward
    && Number(guardian.reward?.credits || 0) > 0
    && Number(guardian.reward?.xp || 0) > 0
  ), true);
  const publicGuardian = publicEnemyDefinition(guardians[0]);
  assert.equal(publicGuardian.prismaticEnemy, true);
  assert.equal(publicGuardian.prismaticGuardian, true);
  assert.equal(publicGuardian.prismaticElement, guardians[0].prismaticElement);
  assert.equal(publicGuardian.prismaticPlanetId, guardians[0].prismaticPlanetId);

  const closestGuardianToSpawn = Math.min(...guardians.map(guardian=>
    Math.hypot(
      guardian.x - PRISMATIC_PORTAL_MAP.spawn.x,
      guardian.y - PRISMATIC_PORTAL_MAP.spawn.y
    )
  ));
  assert.equal(closestGuardianToSpawn > 1_000, true);

  const objective = publicPrismaticObjective(fixture.instance);
  assert.deepEqual(Object.keys(objective), [
    "kind",
    "stage",
    "planets",
    "rift",
    "bosses",
    "effects",
    "completedAt"
  ]);
  assert.equal(objective.kind, "prismatic");
  assert.equal(objective.stage, "planets");
  assert.deepEqual(
    objective.planets.map(planet=>[planet.id, planet.element, planet.guardiansRemaining]),
    [
      ["prismatic_planet_fire", "fire", 3],
      ["prismatic_planet_water", "water", 3],
      ["prismatic_planet_red", "red", 3]
    ]
  );
  assert.deepEqual(objective.rift, {
    active:false,
    x:0,
    y:0,
    radius:190,
    entered:false
  });
  assert.deepEqual(objective.bosses, []);
});

test("a planet ignores damage until its own three ancestral guardians are dead", ()=>{
  const fixture = createFixture();
  const planetState = fixture.instance.objective.planets[0];
  const planet = fixture.instance.enemies.find(enemy=>
    enemy.prismaticPlanetId === planetState.id
    && enemy.prismaticPlanet
  );
  const guardians = fixture.instance.enemies.filter(enemy=>
    enemy.prismaticGuardian
    && enemy.prismaticPlanetId === planetState.id
  );

  applyDamageToEnemy(planet, 500_000);
  assert.equal(planet.hp, PRISMATIC_PLANET_MAX_HP);
  for(const guardian of guardians.slice(0, 2)){
    guardian.hp = 0;
    fixture.runtime.handleEnemyDeath(fixture.group, guardian, 2_000);
  }
  assert.equal(planet.damageImmune, true);
  assert.equal(publicPrismaticObjective(fixture.instance).planets[0].guardiansRemaining, 1);

  guardians[2].hp = 0;
  fixture.runtime.handleEnemyDeath(fixture.group, guardians[2], 2_100);
  assert.equal(planet.damageImmune, false);
  assert.equal(publicPrismaticObjective(fixture.instance).planets[0].guardiansRemaining, 0);
  applyDamageToEnemy(planet, 500_000);
  assert.equal(planet.hp, 1_500_000);
});

test("destroying all three planets opens the center rift and proximity spawns all bosses", ()=>{
  const fixture = createFixture();
  for(const planetState of fixture.instance.objective.planets){
    defeatPlanetGuardians(fixture, planetState.id, 3_000);
    const planet = fixture.instance.enemies.find(enemy=>
      enemy.prismaticPlanet
      && enemy.prismaticPlanetId === planetState.id
    );
    planet.hp = 0;
    fixture.runtime.handleEnemyDeath(fixture.group, planet, 3_100);
  }

  let objective = publicPrismaticObjective(fixture.instance);
  assert.equal(objective.stage, "rift");
  assert.equal(objective.rift.active, true);
  assert.equal(objective.rift.entered, false);
  assert.equal(objective.effects.some(effect=>effect.type === "prismatic_rift_open"), true);

  fixture.player.state.x = 500;
  fixture.player.state.y = 500;
  fixture.runtime.updateGroup(fixture.group, .05, 3_200);
  assert.equal(fixture.instance.objective.stage, "rift");

  fixture.player.state.x = 0;
  fixture.player.state.y = 0;
  fixture.runtime.updateGroup(fixture.group, .05, 3_300);
  objective = publicPrismaticObjective(fixture.instance);
  const bosses = fixture.instance.enemies.filter(enemy=>enemy.prismaticBoss);
  assert.equal(objective.stage, "bosses");
  assert.equal(objective.rift.active, false);
  assert.equal(objective.rift.entered, true);
  assert.deepEqual(objective.bosses.map(boss=>boss.color), ["red", "green", "blue"]);
  assert.equal(bosses.length, 3);
  assert.equal(bosses.every(boss=>
    boss.hp === PRISMATIC_BOSS_MAX_HP
    && boss.shield === PRISMATIC_BOSS_MAX_SHIELD
    && boss.attackDamageMin === PRISMATIC_BOSS_DAMAGE_MIN
    && boss.attackDamageMax === PRISMATIC_BOSS_DAMAGE_MAX
    && boss.attackRange === PRISMATIC_BOSS_RANGE
    && boss.speed === PRISMATIC_BOSS_SPEED
    && !boss.noReward
    && Number(boss.reward?.credits || 0) > 0
    && Number(boss.reward?.xp || 0) > 0
  ), true);
});

test("the red boss applies exactly ten direct burn ticks and respects its minute cooldown", ()=>{
  const fixture = createFixture();
  reachBossStage(fixture);
  const red = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "red");
  const green = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "green");
  const blue = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "blue");
  red.prismaticNextAbilityAt = 10_000;
  green.prismaticNextAbilityAt = Infinity;
  blue.prismaticNextAbilityAt = Infinity;
  fixture.player.state.hp = 100_000;
  fixture.player.state.shield = 100_000;

  fixture.runtime.updateGroup(fixture.group, .05, 10_000);
  assert.equal(red.prismaticNextAbilityAt, 10_000 + PRISMATIC_BURN_COOLDOWN_MS);
  assert.equal(fixture.instance.objective.activeBurns.length, 1);
  fixture.player.connected = false;
  fixture.runtime.updateGroup(fixture.group, .05, 20_000);

  assert.equal(fixture.player.state.hp, 100_000 - PRISMATIC_BURN_DAMAGE * PRISMATIC_BURN_TICKS);
  assert.equal(fixture.player.state.shield, 100_000);
  assert.equal(fixture.instance.objective.activeBurns.length, 0);
  assert.equal(
    fixture.events.filter(entry=>entry.event === "portal:prismatic-effect"
      && entry.payload.type === "prismatic_burn_tick").length,
    PRISMATIC_BURN_TICKS
  );

  fixture.player.connected = true;
  fixture.runtime.updateGroup(fixture.group, .05, red.prismaticNextAbilityAt - 1);
  assert.equal(fixture.instance.objective.activeBurns.length, 0);
  fixture.runtime.updateGroup(fixture.group, .05, red.prismaticNextAbilityAt);
  assert.equal(fixture.instance.objective.activeBurns.length, 1);
});

test("the green boss heals the lowest living ally for fifty thousand hull only", ()=>{
  const fixture = createFixture();
  reachBossStage(fixture);
  const red = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "red");
  const green = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "green");
  const blue = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "blue");
  red.hp = 1_000_000;
  red.shield = 321_000;
  blue.hp = 1_500_000;
  green.prismaticNextAbilityAt = 10_000;
  red.prismaticNextAbilityAt = Infinity;
  blue.prismaticNextAbilityAt = Infinity;

  fixture.runtime.updateGroup(fixture.group, .05, 10_000);
  assert.equal(fixture.instance.objective.activeHeals[0]?.targetBossId, red.id);
  fixture.runtime.updateGroup(fixture.group, .05, 20_000);

  assert.equal(red.hp, 1_000_000 + PRISMATIC_HEAL_AMOUNT * PRISMATIC_HEAL_TICKS);
  assert.equal(red.shield, 321_000);
  assert.equal(fixture.instance.objective.activeHeals.length, 0);
  assert.equal(
    fixture.events.filter(entry=>entry.event === "portal:prismatic-effect"
      && entry.payload.type === "prismatic_heal_tick").length,
    PRISMATIC_HEAL_TICKS
  );
});

test("the blue boss applies a server-authoritative fifty-percent slow for five seconds", ()=>{
  const fixture = createFixture();
  reachBossStage(fixture);
  const red = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "red");
  const green = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "green");
  const blue = fixture.instance.enemies.find(enemy=>enemy.prismaticColor === "blue");
  red.prismaticNextAbilityAt = Infinity;
  green.prismaticNextAbilityAt = Infinity;
  blue.prismaticNextAbilityAt = 10_000;
  const expectedAmount = Math.round(getTrustedMovementSpeed(fixture.profile) * PRISMATIC_SLOW_PERCENT / 100);

  fixture.runtime.updateGroup(fixture.group, .05, 10_000);
  assert.equal(fixture.player.statusEffects.slow?.amount, expectedAmount);
  assert.equal(fixture.player.statusEffects.slow?.expiresAt, 10_000 + PRISMATIC_SLOW_DURATION_MS);
  assert.equal(fixture.instance.objective.activeSlows.length, 1);
  fixture.runtime.updateGroup(fixture.group, .05, 10_000 + PRISMATIC_SLOW_DURATION_MS - 1);
  assert.equal(fixture.player.statusEffects.slow?.amount, expectedAmount);
  fixture.runtime.updateGroup(fixture.group, .05, 10_000 + PRISMATIC_SLOW_DURATION_MS);
  assert.equal(fixture.player.statusEffects.slow, undefined);
  assert.equal(fixture.instance.objective.activeSlows.length, 0);
  assert.equal(
    fixture.events.some(entry=>entry.event === "portal:prismatic-effect"
      && entry.payload.type === "prismatic_slow_end"),
    true
  );

  blue.prismaticNextAbilityAt = 70_000;
  fixture.runtime.updateGroup(fixture.group, .05, 70_000);
  assert.ok(fixture.player.statusEffects.slow);
  fixture.runtime.cancel(fixture.instance);
  assert.equal(fixture.player.statusEffects.slow, undefined);
  assert.equal(
    fixture.events.filter(entry=>entry.event === "player:status-effect").at(-1)?.payload?.active,
    false
  );
});

test("the portal completes once, only after all three bosses are destroyed", ()=>{
  const fixture = createFixture();
  reachBossStage(fixture);
  const bosses = fixture.instance.enemies.filter(enemy=>enemy.prismaticBoss);

  for(const boss of bosses.slice(0, 2)){
    boss.hp = 0;
    fixture.runtime.handleEnemyDeath(fixture.group, boss, 30_000);
  }
  assert.equal(fixture.completionCount(), 0);
  assert.equal(fixture.instance.objective.stage, "bosses");

  bosses[2].hp = 0;
  fixture.runtime.handleEnemyDeath(fixture.group, bosses[2], 30_100);
  assert.equal(fixture.completionCount(), 1);
  assert.equal(fixture.instance.objective.stage, "complete");
  assert.equal(fixture.instance.objective.completedAt, 30_100);
  assert.equal(publicPrismaticObjective(fixture.instance).bosses.every(boss=>!boss.alive), true);

  fixture.runtime.handleEnemyDeath(fixture.group, bosses[2], 30_200);
  assert.equal(fixture.completionCount(), 1);
});

test("ancestral guardians carry the guard-and-return leash contract", ()=>{
  const planet = PRISMATIC_PORTAL_MAP.planets[0];
  const guardian = createPrismaticGuardian(planet, 0);
  assert.equal(guardian.followBeforeAttacked, true);
  assert.equal(guardian.requiresPlayerAttack, false);
  assert.equal(guardian.homeX, guardian.x);
  assert.equal(guardian.homeY, guardian.y);
  assert.equal(guardian.guardLeashRadius > PRISMATIC_GUARDIAN_RANGE, true);

  const player = {
    id:"guardian-target",
    connected:true,
    mapId:"portal-prismatic",
    state:{
      mapId:"portal-prismatic",
      x:guardian.homeX + 100,
      y:guardian.homeY,
      hp:10_000
    }
  };
  const ai = createWorldAiManager({
    players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true},
    launchEnemyAttack(){},
    isPlayerSafeOnMap:()=>false
  });
  ai.updateWorldEnemy(guardian, {
    id:"portal-prismatic",
    width:PRISMATIC_PORTAL_MAP.width,
    height:PRISMATIC_PORTAL_MAP.height
  }, [player], .1, 1_000);
  assert.equal(guardian.lockedPlayerId, player.id);

  guardian.x = guardian.homeX + 500;
  guardian.y = guardian.homeY;
  guardian.aiDecision = null;
  guardian.nextAiDecisionAt = 0;
  player.state.x = guardian.homeX + guardian.guardLeashRadius + 200;
  const beforeReturn = Math.hypot(guardian.x - guardian.homeX, guardian.y - guardian.homeY);
  ai.updateWorldEnemy(guardian, {
    id:"portal-prismatic",
    width:PRISMATIC_PORTAL_MAP.width,
    height:PRISMATIC_PORTAL_MAP.height
  }, [player], .1, 2_000);
  const afterReturn = Math.hypot(guardian.x - guardian.homeX, guardian.y - guardian.homeY);
  assert.equal(guardian.lockedPlayerId, null);
  assert.deepEqual(guardian.damageThreat, {});
  assert.equal(afterReturn < beforeReturn, true);
});

test("background movement applies the same authoritative slow amount as visible movement", ()=>{
  const now = 10_000;
  const player = {
    id:"background-slow",
    connected:true,
    clientPageHidden:true,
    lastClientStateAt:0,
    statusEffects:{
      slow:{amount:150, expiresAt:now + 5_000}
    },
    state:{
      mapId:"portal-prismatic",
      x:0,
      y:0,
      hp:10_000,
      maxHp:10_000,
      shield:0,
      maxShield:0,
      speed:300,
      moveTarget:{x:1_000, y:0},
      updatedAt:0
    }
  };
  const manager = createPlayerActivityManager({
    io:{to:()=>({emit(){}, volatile:{emit(){}}})},
    players:new Map([[player.id, player]]),
    presence:{markActivity(){}},
    profileManager:{saveWorldSession(){}},
    publicPlayer:value=>value,
    applyEnemyHitForPlayer(){}
  });

  manager.updatePlayerActivity(.1, now);
  assert.equal(player.state.x, 15);
  assert.equal(player.state.vx, 150);
});

test("player state and move targets are clamped to the full 6000 by 4200 Prismatic arena", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 40;
  const previous = {
    mapId:"portal-prismatic",
    x:2_500,
    y:0,
    angle:0,
    hp:10_000,
    maxHp:10_000,
    shield:0,
    maxShield:0,
    shipId:"orion",
    updatedAt:1_000
  };
  const player = {
    id:"prismatic-bounds",
    groupId:"prismatic-bounds-group",
    mapId:"portal-prismatic",
    state:previous
  };
  const groups = new Map([[
    player.groupId,
    {
      id:player.groupId,
      members:[player.id],
      instance:{
        type:"portal",
        portal:{id:"prismatic"},
        joinedMemberIds:[player.id],
        abandonedMemberIds:[]
      }
    }
  ]]);
  const result = validatePlayerState({
    player,
    profile,
    groups,
    now:1_050,
    payload:{
      ...previous,
      x:2_500,
      moveTarget:{x:999_999, y:-999_999}
    }
  });

  assert.equal(result.state.x, 2_500);
  assert.deepEqual(result.state.moveTarget, {
    x:PRISMATIC_PORTAL_MAP.width / 2 - 65,
    y:-PRISMATIC_PORTAL_MAP.height / 2 + 65
  });

  const edgeState = {
    ...previous,
    x:PRISMATIC_PORTAL_MAP.width / 2 - 65,
    y:-PRISMATIC_PORTAL_MAP.height / 2 + 65
  };
  player.state = edgeState;
  const outside = validatePlayerState({
    player,
    profile,
    groups,
    now:1_100,
    payload:{
      ...edgeState,
      x:999_999,
      y:-999_999
    }
  });
  assert.equal(outside.state.x, PRISMATIC_PORTAL_MAP.width / 2 - 65);
  assert.equal(outside.state.y, -PRISMATIC_PORTAL_MAP.height / 2 + 65);
});
