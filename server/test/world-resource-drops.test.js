import assert from "node:assert/strict";
import test from "node:test";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { scaleMonsterReward, scaleMonsterStat } from "../src/world/enemyProgression.js";
import { createWorldLootManager } from "../src/world/loot.js";
import { getResourceDropChance, rollResourceDrops } from "../src/world/resourceDrops.js";
import { createWorldEnemy } from "../src/world/spawn.js";
import { createWorldStateManager } from "../src/world/state.js";
import { RESOURCE_DROP_POOLS } from "../../src/data/resources.js";

test("world maps use the requested monster level bands", ()=>{
  assert.deepEqual(WORLD_MAPS["0"].level, [1, 4]);
  assert.deepEqual(WORLD_MAPS["1"].level, [5, 9]);
  assert.deepEqual(WORLD_MAPS["2"].level, [10, 14]);
  assert.deepEqual(WORLD_MAPS["3"].level, [15, 19]);
  assert.deepEqual(WORLD_MAPS["4"].level, [20, 24]);
  assert.deepEqual(WORLD_MAPS["50"].level, [25, 34]);
});

test("ASTRA-02 and ASTRA-03 keep their fixed boss counts", ()=>{
  const emitted = [];
  const manager = createWorldStateManager({
    io:{to:()=>({emit:(event, payload)=>emitted.push({event, payload})})},
    players:new Map(),
    presence:{isActiveForWorld:()=>true},
    progressProfileQuestAction(){}
  });
  const astra02 = manager.getWorldMapState("1");
  assert.equal(astra02.enemies.filter(enemy=>enemy.kind === "boss_drone_pirate").length, 4);
  assert.equal(astra02.enemies.filter(enemy=>enemy.kind === "boss_raider_astral").length, 4);
  const astra03 = manager.getWorldMapState("2");
  assert.equal(astra03.enemies.length, 50);
  assert.equal(astra03.enemies.filter(enemy=>enemy.kind === "boss_drone_pirate").length, 0);
  assert.equal(astra03.enemies.filter(enemy=>enemy.kind === "boss_raider_astral").length, 4);
  assert.equal(astra03.enemies.filter(enemy=>enemy.kind === "cristal_du_neant").length, 4);
  manager.respawnWorldEnemy("2", astra03.enemies.find(enemy=>enemy.kind === "boss_raider_astral").id);
  assert.equal(astra03.enemies.filter(enemy=>enemy.kind === "boss_raider_astral").length, 4);
  assert.equal(WORLD_MAPS["4"].enemyTypes.some(([kind])=>kind === "boss_drone_pirate"), false);
});

test("monster stats grow five percent and rewards grow ten percent above base level", ()=>{
  assert.equal(scaleMonsterStat(800, 1, 4), 920);
  assert.deepEqual(scaleMonsterReward({xp:800, credits:1_020, premium:1}, 1, 4), {xp:1_040, credits:1_326, premium:1});
  const enemy = createWorldEnemy({
    id:"test",
    width:1000,
    height:1000,
    level:[4, 4],
    enemyTypes:[["drone_pirate", 1]]
  }, 1, ()=>0.5);
  assert.equal(enemy.baseLevel, 1);
  assert.equal(enemy.level, 4);
  assert.equal(enemy.maxHp, 920);
  assert.equal(enemy.reward.xp, 1_040);
});

test("Voraks and their early bosses scale from base level one", ()=>{
  for(const kind of ["raider_astral", "boss_raider_astral", "boss_drone_pirate"]){
    const enemy = createWorldEnemy({
      id:"test",
      width:1000,
      height:1000,
      level:[5, 5],
      enemyTypes:[[kind, 1]]
    }, 1, ()=>0.5, kind);
    assert.equal(enemy.baseLevel, 1);
    assert.equal(enemy.level, 5);
  }
  const bossOrbe = createWorldEnemy({
    id:"test",
    width:1000,
    height:1000,
    level:[5, 5],
    enemyTypes:[["boss_drone_pirate", 1]]
  }, 1, ()=>0.5, "boss_drone_pirate");
  assert.deepEqual(bossOrbe.reward, {credits:2856, xp:2240, premium:2});
  const bossVorak = createWorldEnemy({
    id:"test",
    width:1000,
    height:1000,
    level:[1, 1],
    enemyTypes:[["boss_raider_astral", 1]]
  }, 1, ()=>0.5, "boss_raider_astral");
  assert.equal(bossVorak.maxShield, 2000);
  const bossVorakLevelTwo = createWorldEnemy({
    id:"test",
    width:1000,
    height:1000,
    level:[2, 2],
    enemyTypes:[["boss_raider_astral", 1]]
  }, 1, ()=>0.5, "boss_raider_astral");
  assert.equal(bossVorakLevelTwo.maxShield, 2200);
});

test("Boss Orbe rewards are exactly twice the same-level Orbe rewards", ()=>{
  for(const level of [1, 5, 6, 7, 8, 9, 10, 14]){
    const map = {id:"test", width:1000, height:1000, level:[level, level], enemyTypes:[["drone_pirate", 1]]};
    const orbe = createWorldEnemy(map, 1, ()=>0.5, "drone_pirate");
    const boss = createWorldEnemy(map, 2, ()=>0.5, "boss_drone_pirate");
    assert.deepEqual(boss.reward, Object.fromEntries(
      Object.entries(orbe.reward).map(([key, value])=>[key, value * 2])
    ));
  }
});

test("Boss Vorak rewards are exactly twice the same-level Vorak rewards", ()=>{
  for(const level of [1, 5, 6, 7, 8, 9, 10, 14]){
    const map = {id:"test", width:1000, height:1000, level:[level, level], enemyTypes:[["raider_astral", 1]]};
    const vorak = createWorldEnemy(map, 1, ()=>0.5, "raider_astral");
    const boss = createWorldEnemy(map, 2, ()=>0.5, "boss_raider_astral");
    assert.deepEqual(boss.reward, Object.fromEntries(
      Object.entries(vorak.reward).map(([key, value])=>[key, value * 2])
    ));
  }
});

test("early boss health and damage are exactly twice their same-level normal versions", ()=>{
  for(const level of [1, 5, 6, 7, 8, 9, 10, 14]){
    const map = {id:"test", width:1000, height:1000, level:[level, level], enemyTypes:[["drone_pirate", 1]]};
    for(const [normalKind, bossKind] of [["drone_pirate", "boss_drone_pirate"], ["raider_astral", "boss_raider_astral"]]){
      const normal = createWorldEnemy(map, 1, ()=>0.5, normalKind);
      const boss = createWorldEnemy(map, 2, ()=>0.5, bossKind);
      assert.equal(boss.maxHp, normal.maxHp * 2);
      assert.equal(boss.attackDamage, normal.attackDamage * 2);
      if(normal.attackDamageMin !== undefined) assert.equal(boss.attackDamageMin, normal.attackDamageMin * 2);
      if(normal.attackDamageMax !== undefined) assert.equal(boss.attackDamageMax, normal.attackDamageMax * 2);
    }
  }
});

test("resource rarity chances follow map level bands including future black-hole levels", ()=>{
  assert.equal(getResourceDropChance("common", 14), 0.05);
  assert.equal(getResourceDropChance("common", 15), 0);
  assert.equal(getResourceDropChance("rare", 14), 0.01);
  assert.equal(getResourceDropChance("rare", 15), 0.05);
  assert.equal(getResourceDropChance("veryRare", 24), 0.01);
  assert.equal(getResourceDropChance("veryRare", 25), 0.05);
  assert.equal(getResourceDropChance("elite", 34), 0.01);
  assert.equal(getResourceDropChance("elite", 35), 0.05);
  assert.equal(getResourceDropChance("mythic", 44), 0.001);
  assert.equal(getResourceDropChance("mythic", 45), 0.01);
  assert.equal(getResourceDropChance("mythic", 51), 0);
  assert.deepEqual(rollResourceDrops(1, {random:()=>0}).map(drop=>drop.rarity), ["common", "rare"]);
});

test("resource drop pools expose eight optimized assets per rarity", ()=>{
  for(const rarity of ["common", "rare", "veryRare", "elite", "mythic"]){
    const pool = RESOURCE_DROP_POOLS[rarity];
    assert.equal(pool.length, 8);
    for(const resource of pool){
      assert.match(resource.img, new RegExp(`^assets/resources/${rarity}/.+\\.webp$`));
      assert.match(resource.dropImg, new RegExp(`^assets/resources/${rarity}/.+_drop\\.webp$`));
    }
  }
});

test("server emits a private material drop and validates its pickup", ()=>{
  const previousRandom = Math.random;
  Math.random = ()=>0;
  try{
    const emitted = [];
    const socketEvents = [];
    const player = {id:"p1", mapId:"0", state:{mapId:"0", x:100, y:200}};
    const players = new Map([[player.id, player]]);
    const profile = {cargoHold:{}};
    const manager = createWorldLootManager({
      io:{to:id=>({emit:(event, payload)=>emitted.push({id, event, payload})})},
      players,
      profileManager:{
        getProfileForPlayer:()=>profile,
        updateProfileForPlayer:({update})=>{
          const result = update(profile);
          return {...result, profile};
        }
      },
      emitProfileSync(){}
    });
    manager.emitPrivateResourceDrops({
      ownerId:player.id,
      mapId:"0",
      enemy:{id:"enemy", kind:"drone_pirate", level:1, x:100, y:200}
    });
    const event = emitted.find(entry=>entry.event === "loot:drop" && entry.payload.kind === "material")?.payload;
    assert.ok(event);
    assert.equal(event.serverControlled, true);
    assert.match(event.img, /_drop\.webp$/);
    player.state = {mapId:"0", x:event.x, y:event.y};
    manager.pickupLoot({id:player.id, emit:(name, payload)=>socketEvents.push({name, payload})}, {id:event.id});
    assert.equal(profile.cargoHold[event.materialId], 1);
    assert.equal(socketEvents.some(entry=>entry.name === "loot:picked"), true);
  }finally{
    Math.random = previousRandom;
  }
});
