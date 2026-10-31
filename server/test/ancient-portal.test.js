import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrecursorBlessingDamageMultiplier,
  resolveServerCombatFire
} from "../src/combat/damage.js";
import { createDefaultProfile } from "../src/players/profileDefaults.js";
import { createEnemyAttackManager } from "../src/world/enemyAttacks.js";
import { validatePlayerState } from "../src/players/playerStateValidation.js";
import { createPlayerActivityManager } from "../src/world/playerActivity.js";
import {
  ANCIENT_PORTAL_MAP,
  PRECURSOR_BOMB_DAMAGE,
  PRECURSOR_BOMB_RADIUS,
  PRECURSOR_BOMB_WARNING_MS,
  PRECURSOR_CAPTIVE_COUNT,
  PRECURSOR_CAGE_MAX_HP,
  PRECURSOR_DEMON_KING_DAMAGE_MAX,
  PRECURSOR_DEMON_KING_DAMAGE_MIN,
  PRECURSOR_DEMON_KING_MAX_HP,
  PRECURSOR_DEMON_KING_MAX_SHIELD,
  PRECURSOR_DEMON_KING_RANGE,
  PRECURSOR_DEMON_KING_SPEED,
  PRECURSOR_GUARD_DAMAGE_MAX,
  PRECURSOR_GUARD_DAMAGE_MIN,
  PRECURSOR_GUARD_MAX_HP,
  PRECURSOR_GUARD_MAX_SHIELD,
  PRECURSOR_INITIAL_ESCAPE_MS,
  PRECURSOR_KEEPER_MAX_HP,
  PRECURSOR_KEEPER_MAX_SHIELD,
  PRECURSOR_RESCUE_BONUS_MS,
  PRECURSOR_ROOM_GUARDS,
  createPrecursorObjective,
  createPrecursorPortalRuntime,
  publicPrecursorObjective
} from "../src/portals/ancientPortal.js";

function fixture({random = ()=>0} = {}){
  let currentTime = 1_000;
  let completions = 0;
  let failures = 0;
  let cancelledRoom = "";
  const events = [];
  const players = new Map();
  for(let index = 0; index < 3; index += 1){
    const id = `ancient-player-${index + 1}`;
    players.set(id, {
      id,
      accountId:`account-${index + 1}`,
      connected:true,
      clientMode:"game",
      groupId:"ancient-group",
      mapId:"portal-ancient",
      state:{
        mapId:"portal-ancient",
        x:ANCIENT_PORTAL_MAP.spawn.x,
        y:ANCIENT_PORTAL_MAP.spawn.y,
        angle:0,
        hp:500_000,
        maxHp:500_000,
        shield:0,
        maxShield:0,
        updatedAt:currentTime
      }
    });
  }
  const playerIds = [...players.keys()];
  const instance = {
    id:"ancient-instance",
    type:"portal",
    portal:{id:"ancient", name:"Le Sanctuaire des Précurseurs", totalWaves:0},
    completed:false,
    joinedMemberIds:playerIds,
    abandonedMemberIds:[],
    playerLives:Object.fromEntries(playerIds.map(id=>[id, 3])),
    enemies:[]
  };
  const group = {
    id:"ancient-group",
    leaderId:playerIds[0],
    members:playerIds,
    instance
  };
  const groups = new Map([[group.id, group]]);
  const runtime = createPrecursorPortalRuntime({
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
      markDamage(){},
      applyDamageToPlayerState(player, amount){
        player.state.hp = Math.max(0, Number(player.state.hp || 0) - Number(amount || 0));
      }
    },
    profileManager:{saveWorldSession(){}},
    emitInstance(){},
    emitPortalComplete(targetGroup){
      completions += 1;
      targetGroup.instance.completed = true;
    },
    failPortal(){
      failures += 1;
    },
    cancelPendingAttacksForRoom(room){
      cancelledRoom = room;
    },
    random,
    now:()=>currentTime
  });
  runtime.start(group);
  return {
    events,
    group,
    groups,
    instance,
    players,
    playerIds,
    runtime,
    get completions(){ return completions; },
    get failures(){ return failures; },
    get cancelledRoom(){ return cancelledRoom; },
    setTime(value){ currentTime = Number(value); },
    get time(){ return currentTime; }
  };
}

function enemyForRoom(f, room, role){
  return f.instance.enemies.find(enemy=>
    enemy.precursorRole === role
    && enemy.precursorRoomId === room.id
    && Number(enemy.hp || 0) > 0
  );
}

function rescueAllAngels(f){
  const angelRooms = f.instance.objective.rooms.filter(room=>room.role === "angel");
  for(const room of angelRooms){
    const cage = enemyForRoom(f, room, "infernal_cage");
    cage.hp = 0;
    f.runtime.handleEnemyDeath(f.group, cage, f.playerIds[0], f.time);
  }
  return angelRooms;
}

function acquireTalismanAndOpenRift(f){
  rescueAllAngels(f);
  const objective = f.instance.objective;
  const talismanRoom = objective.rooms.find(room=>room.role === "talisman");
  const player = f.players.get(f.playerIds[0]);
  player.state.x = talismanRoom.x;
  player.state.y = talismanRoom.y;
  f.runtime.updateGroup(f.group, .05, f.time);
  const keeper = enemyForRoom(f, talismanRoom, "talisman_keeper");
  assert.ok(keeper);
  keeper.hp = 0;
  f.runtime.handleEnemyDeath(f.group, keeper, player.id, f.time);
  player.state.x = objective.beacon.x;
  player.state.y = objective.beacon.y;
  f.runtime.interact({id:player.id, emit(){}}, "beacon");
  assert.equal(objective.rift.open, true);
  return player;
}

function enterParadise(f){
  const player = acquireTalismanAndOpenRift(f);
  player.state.x = f.instance.objective.rift.x;
  player.state.y = f.instance.objective.rift.y;
  f.runtime.interact({id:player.id, emit(){}}, "rift");
  assert.equal(f.instance.objective.phase, "paradise");
  return player;
}

test("Ancient secret assignments are authoritative, stable and absent from undiscovered snapshots", ()=>{
  const f = fixture({random:()=>0.41});
  const roles = f.instance.objective.rooms.map(room=>room.role);
  assert.equal(roles.filter(role=>role === "angel").length, 2);
  assert.equal(roles.filter(role=>role === "talisman").length, 1);
  assert.equal(roles.filter(role=>role === "empty").length, 2);

  const snapshot = publicPrecursorObjective(f.instance, f.time);
  assert.equal(snapshot.rooms.every(room=>room.role === "unknown"), true);
  assert.equal(JSON.stringify(snapshot).includes("keeperId"), false);
  assert.equal(JSON.stringify(snapshot).includes("containsAngel"), false);
});

test("Ancient starts with five destructible cages and four no-reward leashed guards per room", ()=>{
  const f = fixture();
  const cages = f.instance.enemies.filter(enemy=>enemy.precursorRole === "infernal_cage");
  const guards = f.instance.enemies.filter(enemy=>enemy.precursorRole === "demon_guard");
  assert.equal(cages.length, 5);
  assert.equal(guards.length, 5 * PRECURSOR_ROOM_GUARDS);
  assert.equal(cages.every(enemy=>enemy.hp === PRECURSOR_CAGE_MAX_HP && !enemy.damageImmune), true);
  assert.equal(guards.every(enemy=>
    enemy.hp === PRECURSOR_GUARD_MAX_HP
    && enemy.shield === PRECURSOR_GUARD_MAX_SHIELD
    && enemy.attackDamageMin === PRECURSOR_GUARD_DAMAGE_MIN
    && enemy.attackDamageMax === PRECURSOR_GUARD_DAMAGE_MAX
    && enemy.guardLeashRadius > 0
    && enemy.noReward
  ), true);
});

test("each genuine cage grants five minutes exactly once and a late cage cannot revive an expired escape", ()=>{
  const f = fixture();
  const startDeadline = f.instance.objective.deadlineAt;
  const angelRooms = f.instance.objective.rooms.filter(room=>room.role === "angel");
  const firstCage = enemyForRoom(f, angelRooms[0], "infernal_cage");
  firstCage.hp = 0;
  f.runtime.handleEnemyDeath(f.group, firstCage, f.playerIds[0], f.time);
  assert.equal(f.instance.objective.deadlineAt, startDeadline + PRECURSOR_RESCUE_BONUS_MS);
  assert.equal(f.instance.objective.rescuedCount, 1);

  f.runtime.handleEnemyDeath(f.group, firstCage, f.playerIds[0], f.time);
  assert.equal(f.instance.objective.deadlineAt, startDeadline + PRECURSOR_RESCUE_BONUS_MS);
  assert.equal(f.instance.objective.rescuedCount, 1);

  const secondCage = enemyForRoom(f, angelRooms[1], "infernal_cage");
  f.setTime(f.instance.objective.deadlineAt);
  secondCage.hp = 0;
  f.runtime.handleEnemyDeath(f.group, secondCage, f.playerIds[0], f.time);
  assert.equal(f.instance.objective.rescuedCount, 1);
  assert.equal(f.instance.objective.deadlineAt, startDeadline + PRECURSOR_RESCUE_BONUS_MS);
});

test("timeout is an atomic full failure and never a life-only retry", ()=>{
  const f = fixture();
  const lives = {...f.instance.playerLives};
  f.setTime(f.instance.objective.deadlineAt);
  f.runtime.interact({id:f.playerIds[0], emit(){}}, "beacon");
  f.runtime.updateGroup(f.group, .05, f.time + 1);
  assert.equal(f.failures, 1);
  assert.equal(f.instance.precursorFailed, true);
  assert.equal(f.instance.objective.phase, "failed");
  assert.deepEqual(f.instance.playerLives, lives);
  assert.equal(f.completions, 0);
});

test("talisman, beacon and rift are impossible to bypass and paradise clears infernal attacks", ()=>{
  const f = fixture();
  const player = f.players.get(f.playerIds[0]);
  player.state.x = 0;
  player.state.y = 0;
  f.runtime.interact({id:player.id, emit(){}}, "beacon");
  assert.equal(f.instance.objective.rift.open, false);

  enterParadise(f);
  assert.equal(f.cancelledRoom, `instance:${f.instance.id}`);
  assert.equal(f.instance.objective.deadlineAt, 0);
  assert.equal(f.instance.enemies.filter(enemy=>enemy.precursorRole === "demon_king").length, 1);
  assert.equal(f.instance.objective.allies.length, 8);
  assert.equal(f.instance.enemies.every(enemy=>enemy.precursorRole === "demon_king"), true);
});

test("the Demon King uses the requested stats and bombs hit at radius 99/100 but not 101 exactly once", ()=>{
  const f = fixture({random:()=>0});
  enterParadise(f);
  const boss = f.instance.enemies.find(enemy=>enemy.precursorRole === "demon_king");
  assert.equal(boss.hp, PRECURSOR_DEMON_KING_MAX_HP);
  assert.equal(boss.shield, PRECURSOR_DEMON_KING_MAX_SHIELD);
  assert.equal(boss.attackDamageMin, PRECURSOR_DEMON_KING_DAMAGE_MIN);
  assert.equal(boss.attackDamageMax, PRECURSOR_DEMON_KING_DAMAGE_MAX);
  assert.equal(boss.attackRange, PRECURSOR_DEMON_KING_RANGE);
  assert.equal(boss.speed, PRECURSOR_DEMON_KING_SPEED);
  boss.precursorNextSummonAt = Infinity;
  boss.precursorNextBombAt = f.time;
  for(const ally of f.instance.objective.allies){
    ally.nextHealAt = Infinity;
    ally.nextBuffAt = Infinity;
    ally.nextAttackAt = Infinity;
  }

  const first = f.players.get(f.playerIds[0]);
  const second = f.players.get(f.playerIds[1]);
  const third = f.players.get(f.playerIds[2]);
  first.state.x = 0;
  first.state.y = 0;
  f.runtime.updateGroup(f.group, .05, f.time);
  const bomb = f.instance.objective.bombs[0];
  assert.ok(bomb);
  first.state.x = bomb.x + 99;
  second.state.x = bomb.x + PRECURSOR_BOMB_RADIUS;
  third.state.x = bomb.x + PRECURSOR_BOMB_RADIUS + 1;
  first.state.y = second.state.y = third.state.y = bomb.y;

  const detonateAt = bomb.detonateAt;
  f.setTime(detonateAt);
  f.runtime.updateGroup(f.group, .05, f.time);
  assert.equal(first.state.hp, 500_000 - PRECURSOR_BOMB_DAMAGE);
  assert.equal(second.state.hp, 500_000 - PRECURSOR_BOMB_DAMAGE);
  assert.equal(third.state.hp, 500_000);
  assert.equal(f.instance.objective.bombs.length, 0);

  f.runtime.updateGroup(f.group, .05, f.time + PRECURSOR_BOMB_WARNING_MS);
  assert.equal(first.state.hp, 500_000 - PRECURSOR_BOMB_DAMAGE);
  assert.equal(second.state.hp, 500_000 - PRECURSOR_BOMB_DAMAGE);
});

test("killing the King never grants rewards until the living owner reaches and interacts with God", ()=>{
  const f = fixture();
  const player = enterParadise(f);
  const boss = f.instance.enemies.find(enemy=>enemy.precursorRole === "demon_king");
  boss.hp = 0;
  f.runtime.handleEnemyDeath(f.group, boss, player.id, f.time);
  assert.equal(f.instance.objective.phase, "epilogue");
  assert.equal(f.instance.objective.stage, "god");
  assert.equal(f.instance.objective.god.visible, true);
  assert.equal(f.completions, 0);

  f.setTime(f.time + 60_000);
  f.runtime.updateGroup(f.group, .05, f.time);
  assert.equal(f.completions, 0);

  player.state.x = f.instance.objective.god.x;
  player.state.y = f.instance.objective.god.y;
  f.runtime.interact({id:player.id, emit(){}}, "god");
  assert.equal(f.completions, 1);
  assert.equal(f.instance.completed, true);
});

test("Demon King reinforcements stay capped and old adds expire instead of accumulating forever", ()=>{
  const f = fixture();
  enterParadise(f);
  const boss = f.instance.enemies.find(enemy=>enemy.precursorRole === "demon_king");
  boss.precursorNextBombAt = Infinity;
  for(const ally of f.instance.objective.allies) ally.nextAttackAt = Infinity;
  for(let cycle = 0; cycle < 8; cycle += 1){
    const at = f.time + cycle * 30_000;
    f.setTime(at);
    boss.precursorNextSummonAt = at;
    f.runtime.updateGroup(f.group, .05, at);
    const aliveAdds = f.instance.enemies.filter(enemy=>
      enemy.precursorRole === "demon_minion" && Number(enemy.hp || 0) > 0
    );
    assert.equal(aliveAdds.length <= 12, true);
  }
});

test("initial deadline is five minutes and the two bonuses cap at fifteen cumulative minutes", ()=>{
  const f = fixture();
  assert.equal(f.instance.objective.deadlineAt - f.instance.objective.startedAt, PRECURSOR_INITIAL_ESCAPE_MS);
  rescueAllAngels(f);
  assert.equal(f.instance.objective.rescuedCount, PRECURSOR_CAPTIVE_COUNT);
  assert.equal(
    f.instance.objective.deadlineAt - f.instance.objective.startedAt,
    PRECURSOR_INITIAL_ESCAPE_MS + PRECURSOR_CAPTIVE_COUNT * PRECURSOR_RESCUE_BONUS_MS
  );
});

function blessingCombatProfile(weaponClass){
  const profile = createDefaultProfile();
  if(weaponClass === "rocket"){
    profile.inventoryItems.push({uid:"ancient-rocket-launcher", itemId:"launcher_rocket_mk1"});
    profile.shipLoadouts.orion.rocketLauncher = "ancient-rocket-launcher";
    profile.ammoInventory.rocket_r1 = 10;
  }else if(weaponClass === "missile"){
    profile.inventoryItems.push({uid:"ancient-missile-launcher", itemId:"launcher_missile_mk1"});
    profile.shipLoadouts.orion.missileLauncher = "ancient-missile-launcher";
    profile.ammoInventory.missile_m1 = 10;
  }
  return profile;
}

test("the angel blessing is a real server-authoritative 15 percent damage boost for every weapon", ()=>{
  const ammo = {laser:"ammo_x1", rocket:"rocket_r1", missile:"missile_m1"};
  for(const weaponClass of Object.keys(ammo)){
    const state = {mapId:"portal-ancient", x:0, y:0, shipId:"orion"};
    const baseline = resolveServerCombatFire({
      player:{id:`ancient-base-${weaponClass}`, mapId:"portal-ancient", state:{...state}},
      profile:blessingCombatProfile(weaponClass),
      enemy:{x:100, y:0},
      payload:{weaponClass, ammoId:ammo[weaponClass], count:1},
      random:()=>0,
      now:10_000
    });
    const blessed = resolveServerCombatFire({
      player:{
        id:`ancient-blessed-${weaponClass}`,
        mapId:"portal-ancient",
        state:{...state},
        precursorActiveInstanceId:"ancient-instance",
        precursorBlessing:{
          damageMultiplier:1.15,
          expiresAt:20_000,
          sourceInstanceId:"ancient-instance"
        }
      },
      profile:blessingCombatProfile(weaponClass),
      enemy:{x:100, y:0},
      payload:{weaponClass, ammoId:ammo[weaponClass], count:1},
      random:()=>0,
      now:10_000
    });
    assert.equal(baseline.ok, true, weaponClass);
    assert.equal(blessed.ok, true, weaponClass);
    assert.equal(blessed.damage, Math.round(baseline.damage * 1.15), weaponClass);
  }
});

test("a blessing from an old Ancient instance cannot boost damage in a new instance", ()=>{
  const player = {
    id:"ancient-stale-blessing",
    mapId:"portal-ancient",
    state:{mapId:"portal-ancient"},
    precursorActiveInstanceId:"ancient-instance-new",
    precursorBlessing:{
      damageMultiplier:1.15,
      expiresAt:20_000,
      sourceInstanceId:"ancient-instance-old"
    }
  };
  assert.equal(getPrecursorBlessingDamageMultiplier(player, 10_000), 1);
  assert.equal(player.precursorBlessing, undefined);

  player.precursorActiveInstanceId = "ancient-instance-new";
  player.precursorBlessing = {
    damageMultiplier:1.15,
    expiresAt:20_000,
    sourceInstanceId:"ancient-instance-new"
  };
  assert.equal(getPrecursorBlessingDamageMultiplier(player, 10_000), 1.15);
});

test("transition cleanup removes infernal projectiles before they can hit in paradise", ()=>{
  const target = {
    id:"transfer-target",
    mapId:"portal-ancient",
    state:{mapId:"portal-ancient", x:0, y:0, hp:200_000, maxHp:200_000, shield:0, maxShield:0}
  };
  const manager = createEnemyAttackManager({
    io:{to:()=>({emit(){}})},
    players:new Map([[target.id, target]]),
    presence:{
      markCombat(){},
      isActiveForWorld:()=>true,
      applyDamageToPlayerState(player, amount){
        player.state.hp = Math.max(0, player.state.hp - amount);
      }
    },
    profileManager:{applyQuestAction:()=>({}), saveWorldSession(){}},
    emitProfileSync(){},
    applyEnemyOnHitEffect(){}
  });
  manager.launchEnemyAttack({
    enemy:{id:"hell-projectile", x:1_000, y:0, projectileSpeed:120},
    map:{id:"portal-ancient", room:"instance:ancient-cleanup"},
    target,
    amount:50_000,
    now:1_000
  });
  assert.equal(manager.cancelPendingEnemyAttacksForRoom("instance:ancient-cleanup"), 1);
  manager.updatePendingEnemyAttacks(10_000);
  assert.equal(target.state.hp, 200_000);
});

test("visible and background movement both reject crossing Ancient walls outside a corridor", ()=>{
  const profile = createDefaultProfile();
  profile.player.level = 45;
  const previous = {
    mapId:"portal-ancient",
    x:800,
    y:0,
    angle:0,
    hp:10_000,
    maxHp:10_000,
    shield:0,
    maxShield:0,
    shipId:"orion",
    radius:48,
    updatedAt:1_000
  };
  const player = {
    id:"ancient-collision",
    groupId:"ancient-collision-group",
    mapId:"portal-ancient",
    state:previous
  };
  const groups = new Map([[player.groupId, {
    id:player.groupId,
    members:[player.id],
    instance:{
      type:"portal",
      portal:{id:"ancient"},
      objective:{kind:"precursors", phase:"hell", rooms:[]},
      joinedMemberIds:[player.id],
      abandonedMemberIds:[]
    }
  }]]);
  const result = validatePlayerState({
    player,
    profile,
    groups,
    now:2_000,
    payload:{...previous, x:900, y:0}
  });
  assert.equal(result.state.x, 800);
  assert.equal(result.state.y, 0);

  const hiddenPlayer = {
    ...player,
    connected:true,
    clientPageHidden:true,
    lastClientStateAt:0,
    state:{
      ...previous,
      speed:300,
      moveTarget:{x:1_200, y:0}
    }
  };
  const activity = createPlayerActivityManager({
    io:{to:()=>({emit(){}, volatile:{emit(){}}})},
    players:new Map([[hiddenPlayer.id, hiddenPlayer]]),
    groups,
    presence:{markActivity(){}},
    profileManager:{saveWorldSession(){}},
    publicPlayer:value=>value,
    applyEnemyHitForPlayer(){}
  });
  activity.updatePlayerActivity(.1, 10_000);
  assert.equal(hiddenPlayer.state.x, 800);
  assert.equal(hiddenPlayer.state.y, 0);
});
