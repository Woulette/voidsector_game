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
        return {profile:{}, updates:[], failed:[]};
      },
      saveWorldSession(payload){
        saves.push(payload);
      }
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
  return {emitted, enemy, manager, poisonApplications, saves, target};
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
