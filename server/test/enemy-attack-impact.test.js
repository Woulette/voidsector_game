import assert from "node:assert/strict";
import test from "node:test";
import { createEnemyAttackManager, getEnemyProjectileTravelTime } from "../src/world/enemyAttacks.js";

function createFixture(){
  const emitted = [];
  const target = {
    id:"player-1",
    connected:true,
    mapId:"1",
    state:{x:600, y:0, hp:100, shield:0}
  };
  const players = new Map([[target.id, target]]);
  const poisonApplications = [];
  const saves = [];
  const profileSyncs = [];
  const manager = createEnemyAttackManager({
    io:{
      to(room){
        return {
          emit(eventName, payload){
            emitted.push({room, eventName, payload});
          }
        };
      }
    },
    players,
    presence:{
      markCombat(){},
      applyDamageToPlayerState(player, amount){
        const before = player.state.hp;
        player.state.hp = Math.max(0, before - amount);
        return before - player.state.hp;
      }
    },
    profileManager:{
      applyQuestAction(){
        return {profile:{}, changed:false, updates:[], failed:[]};
      },
      saveWorldSession(payload){
        saves.push(payload);
      }
    },
    emitProfileSync(player, profile){
      profileSyncs.push({player, profile});
    },
    applyEnemyOnHitEffect(enemy, player, now){
      poisonApplications.push({enemy, player, now});
    }
  });
  const enemy = {
    id:"enemy-1",
    x:0,
    y:0,
    projectileSpeed:600,
    onHitEffect:{type:"poison", damage:2}
  };
  return {emitted, enemy, manager, poisonApplications, profileSyncs, saves, target};
}

test("enemy damage is applied only when the server projectile reaches its impact time", ()=>{
  const fixture = createFixture();
  const now = 10_000;
  const travelTime = getEnemyProjectileTravelTime({
    fromX:0,
    fromY:0,
    toX:600,
    toY:0,
    projectileSpeed:600
  });

  fixture.manager.launchEnemyAttack({
    enemy:fixture.enemy,
    map:{id:"1", room:"map:1"},
    target:fixture.target,
    amount:25,
    now,
    attackStyle:"drone_pirate"
  });

  assert.equal(fixture.target.state.hp, 100);
  assert.equal(fixture.emitted[0].eventName, "enemy:attack");
  assert.equal(fixture.emitted[0].payload.travelTime, travelTime);

  fixture.manager.updatePendingEnemyAttacks(now + travelTime * 1000 - 1);
  assert.equal(fixture.target.state.hp, 100);
  assert.equal(fixture.poisonApplications.length, 0);

  fixture.manager.updatePendingEnemyAttacks(now + travelTime * 1000);
  assert.equal(fixture.target.state.hp, 75);
  assert.equal(fixture.poisonApplications.length, 1);
  assert.equal(fixture.saves.length, 1);
  assert.equal(fixture.profileSyncs.length, 0);
  assert.equal(fixture.emitted[0].room, fixture.target.id);
  assert.equal(fixture.emitted.at(-1).eventName, "player:damage");
});

test("a pending enemy projectile is cancelled when the target leaves the map", ()=>{
  const fixture = createFixture();
  const now = 20_000;

  fixture.manager.launchEnemyAttack({
    enemy:fixture.enemy,
    map:{id:"1", room:"map:1"},
    target:fixture.target,
    amount:25,
    now,
    attackStyle:"drone_pirate"
  });
  fixture.target.mapId = "2";
  fixture.manager.updatePendingEnemyAttacks(now + 2_000);

  assert.equal(fixture.target.state.hp, 100);
  assert.equal(fixture.poisonApplications.length, 0);
  assert.equal(fixture.saves.length, 0);
  assert.equal(fixture.emitted.some(event=>event.eventName === "player:damage"), false);
});

test("simultaneous enemy impacts are batched into one player damage event", ()=>{
  const fixture = createFixture();
  const now = 25_000;
  const secondEnemy = {
    ...fixture.enemy,
    id:"enemy-2",
    onHitEffect:{type:"poison", damage:8}
  };

  fixture.manager.launchEnemyAttack({
    enemy:fixture.enemy,
    map:{id:"1", room:"map:1"},
    target:fixture.target,
    amount:20,
    now,
    attackStyle:"parasite"
  });
  fixture.manager.launchEnemyAttack({
    enemy:secondEnemy,
    map:{id:"1", room:"map:1"},
    target:fixture.target,
    amount:25,
    now,
    attackStyle:"parasite"
  });
  fixture.manager.updatePendingEnemyAttacks(now + 2_000);

  assert.equal(fixture.target.state.hp, 55);
  assert.equal(fixture.saves.length, 1);
  assert.equal(fixture.poisonApplications.length, 1);
  assert.equal(fixture.poisonApplications[0].enemy.id, "enemy-2");
  const damageEvents = fixture.emitted.filter(event=>event.eventName === "player:damage");
  assert.equal(damageEvents.length, 1);
  assert.equal(damageEvents[0].payload.amount, 45);
  assert.equal(damageEvents[0].payload.attackCount, 2);
  assert.deepEqual(damageEvents[0].payload.sourceEnemyIds.sort(), ["enemy-1", "enemy-2"]);
});

test("Ricky receives the same shield split as a player while exposing the complete hit amount", ()=>{
  const fixture = createFixture();
  const now = 30_000;
  const ricky = {
    id:"ricky_companion",
    npcTarget:true,
    connected:true,
    mapId:"portal-ricky",
    state:{x:300, y:0, hp:1000, maxHp:1000, shield:1000, maxShield:1000, alive:true}
  };

  fixture.manager.launchEnemyAttack({
    enemy:fixture.enemy,
    map:{id:"portal-ricky", room:"instance:ricky"},
    target:ricky,
    amount:500,
    now,
    attackStyle:"deadly_eclaireur"
  });
  fixture.manager.updatePendingEnemyAttacks(now + 2_000);

  assert.equal(ricky.state.shield, 600);
  assert.equal(ricky.state.hp, 900);
  const damageEvent = fixture.emitted.find(event=>event.eventName === "npc:damage");
  assert.equal(damageEvent.payload.amount, 500);
  assert.equal(damageEvent.payload.hpLost, 100);
});
