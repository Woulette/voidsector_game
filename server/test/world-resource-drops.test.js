import assert from "node:assert/strict";
import test from "node:test";
import { getInventoryItemCount } from "../src/economy/inventoryStacks.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { scaleMonsterReward, scaleMonsterStat } from "../src/world/enemyProgression.js";
import { createWorldLootManager, rollPortalAnchorKeyDrop } from "../src/world/loot.js";
import { getResourceDropChance, rollResourceDrops } from "../src/world/resourceDrops.js";
import { createWorldEnemy } from "../src/world/spawn.js";
import { createWorldStateManager } from "../src/world/state.js";
import { RESOURCE_DROP_POOLS } from "../../src/data/resources.js";
import { ENEMY_TYPES } from "../../src/game/combatData.js";

test("world maps use the requested monster level bands", ()=>{
  assert.deepEqual(WORLD_MAPS["0"].level, [1, 4]);
  assert.deepEqual(WORLD_MAPS["1"].level, [5, 9]);
  assert.deepEqual(WORLD_MAPS["2"].level, [10, 14]);
  assert.deepEqual(WORLD_MAPS["3"].level, [15, 19]);
  assert.deepEqual(WORLD_MAPS["4"].level, [20, 24]);
  assert.deepEqual(WORLD_MAPS["50"].level, [25, 34]);
});

test("Helion-02, Helion-03 and Helion-05 keep their fixed elite counts", ()=>{
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
  assert.equal(astra03.enemies.filter(enemy=>enemy.kind === "eclanite").length, 4);
  manager.respawnWorldEnemy("2", astra03.enemies.find(enemy=>enemy.kind === "boss_raider_astral").id);
  assert.equal(astra03.enemies.filter(enemy=>enemy.kind === "boss_raider_astral").length, 4);
  const astra05 = manager.getWorldMapState("4");
  assert.equal(astra05.enemies.length, 50);
  assert.equal(astra05.enemies.filter(enemy=>enemy.kind === "eclanite").length, 30);
  assert.equal(astra05.enemies.filter(enemy=>enemy.kind === "cristanite").length, 16);
  assert.equal(astra05.enemies.filter(enemy=>enemy.kind === "astranite").length, 4);
  assert.deepEqual(WORLD_MAPS["4"].enemyTypes.map(([kind])=>kind), ["eclanite", "cristanite", "astranite"]);
  assert.equal(WORLD_MAPS["50"].enemyTypes.some(([kind])=>kind === "boss_cristal_du_neant"), false);
  assert.equal(WORLD_MAPS["4"].enemyTypes.some(([kind])=>kind === "boss_drone_pirate"), false);
});

test("Helion-04 replaces parasites with the level fifteen Astral Brood Layer", ()=>{
  assert.equal(WORLD_MAPS["3"].enemyTypes.some(([kind])=>kind === "chasseur_spectral"), false);
  assert.equal(WORLD_MAPS["3"].enemyTypes.some(([kind])=>kind === "pondeuse_astrale"), true);

  const levelFifteen = createWorldEnemy({
    id:"astra-04-test",
    width:1000,
    height:1000,
    level:[15, 15],
    enemyTypes:[["pondeuse_astrale", 1]]
  }, 1, ()=>0.5, "pondeuse_astrale");

  assert.equal(levelFifteen.baseLevel, 15);
  assert.equal(levelFifteen.maxHp, 45_000);
  assert.equal(levelFifteen.maxShield, 30_000);
  assert.equal(levelFifteen.speed, 230);
  assert.equal(levelFifteen.attackRange, 350);
  assert.equal(levelFifteen.attackCooldown, 1000);
  assert.equal(levelFifteen.attackDamageMin, 600);
  assert.equal(levelFifteen.attackDamageMax, 900);
  assert.deepEqual(levelFifteen.onHitEffect, {type:"poison", damage:350, interval:2, duration:10});
  assert.deepEqual(levelFifteen.reward, {credits:60_000, xp:38_000, premium:50});

  const levelNineteen = createWorldEnemy({
    id:"astra-04-test",
    width:1000,
    height:1000,
    level:[19, 19],
    enemyTypes:[["pondeuse_astrale", 1]]
  }, 2, ()=>0.5, "pondeuse_astrale");

  assert.equal(levelNineteen.maxHp, 54_000);
  assert.equal(levelNineteen.maxShield, 36_000);
  assert.equal(levelNineteen.attackDamageMin, 720);
  assert.equal(levelNineteen.attackDamageMax, 1080);
  assert.equal(levelNineteen.onHitEffect.damage, 420);
  assert.deepEqual(levelNineteen.reward, {credits:84_000, xp:53_200, premium:70});
});

test("an Astral Brood Layer death spawns three temporary same-level parasites", ()=>{
  const manager = createWorldStateManager({
    io:{to:()=>({emit(){}})},
    players:new Map(),
    presence:{isActiveForWorld:()=>true},
    progressProfileQuestAction(){}
  });
  const map = manager.getWorldMapState("3");
  const parent = createWorldEnemy({
    ...WORLD_MAPS["3"],
    level:[18, 18],
    enemyTypes:[["pondeuse_astrale", 1]]
  }, 999, ()=>0.5, "pondeuse_astrale");
  parent.x = 400;
  parent.y = -300;

  const children = manager.spawnWorldEnemyChildren("3", parent);

  assert.equal(children.length, 3);
  assert.equal(children.every(enemy=>enemy.kind === "chasseur_spectral"), true);
  assert.equal(children.every(enemy=>enemy.level === 18), true);
  assert.equal(children.every(enemy=>enemy.temporarySpawn === true), true);
  assert.equal(children.every(enemy=>enemy.spawnedBy === parent.id), true);
  assert.equal(map.enemies.filter(enemy=>enemy.spawnedBy === parent.id).length, 3);

  assert.equal(manager.removeWorldEnemy("3", children[0].id), true);
  assert.equal(map.enemies.some(enemy=>enemy.id === children[0].id), false);
});

test("Astra three and four elite NOVA rewards use the updated values", ()=>{
  const cuirasse = createWorldEnemy(
    {id:"test-four", width:1000, height:1000, level:[15, 15], enemyTypes:[["cuirasse_ambre", 1]]},
    1,
    ()=>0.5,
    "cuirasse_ambre"
  );
  const eclat = createWorldEnemy(
    {id:"test-three", width:1000, height:1000, level:[10, 10], enemyTypes:[["eclanite", 1]]},
    2,
    ()=>0.5,
    "eclanite"
  );

  assert.equal(cuirasse.reward.premium, 60);
  assert.equal(eclat.reward.premium, 24);
});

test("map five void crystals use their requested level twenty base stats", ()=>{
  const map = {id:"test", width:1000, height:1000, level:[20, 20], enemyTypes:[["cristanite", 1]]};
  const cristal = createWorldEnemy(map, 1, ()=>0.5, "cristanite");
  const etoile = createWorldEnemy(map, 2, ()=>0.5, "astranite");

  assert.equal(cristal.maxHp, 180_000);
  assert.equal(cristal.maxShield, 140_000);
  assert.equal(cristal.radius, 47);
  assert.equal(cristal.width, 112);
  assert.equal(cristal.height, 112);
  assert.equal(cristal.speed, 220);
  assert.equal(cristal.attackRange, 350);
  assert.equal(cristal.attackCooldown, 1000);
  assert.equal(cristal.attackDamageMin, 1_600);
  assert.equal(cristal.attackDamageMax, 2_500);
  assert.equal(cristal.useExactDamageRange, true);
  assert.deepEqual(cristal.reward, {credits:250_000, xp:84_000, premium:110});
  assert.equal(cristal.requiresPlayerAttack, true);
  assert.equal(cristal.followBeforeAttacked, true);

  assert.equal(etoile.maxHp, 450_000);
  assert.equal(etoile.maxShield, 400_000);
  assert.equal(etoile.speed, 210);
  assert.equal(etoile.attackRange, 360);
  assert.equal(etoile.attackCooldown, 1000);
  assert.equal(etoile.attackDamageMin, 3_800);
  assert.equal(etoile.attackDamageMax, 5_600);
  assert.equal(etoile.useExactDamageRange, true);
  assert.deepEqual(etoile.reward, {credits:1_000_000, xp:350_000, premium:400});
  assert.deepEqual(etoile.deathEffect, {type:"slow", amount:200, duration:5, radius:150});
  assert.deepEqual(etoile.deathSpawn, {kind:"cristanite", count:1});
});

test("Eclanite uses its slightly reduced visual dimensions", ()=>{
  const eclanite = createWorldEnemy(
    {id:"test", width:1000, height:1000, level:[10, 10], enemyTypes:[["eclanite", 1]]},
    1,
    ()=>0.5,
    "eclanite"
  );

  assert.equal(eclanite.radius, 35);
  assert.equal(eclanite.width, 82);
  assert.equal(eclanite.height, 82);
  assert.equal(eclanite.speed, 240);
});

test("client void crystal speeds match the reduced server speeds", ()=>{
  assert.equal(ENEMY_TYPES.eclanite.speed(), 240);
  assert.equal(ENEMY_TYPES.cristanite.speed(), 220);
  assert.equal(ENEMY_TYPES.astranite.speed(), 210);
});

test("an Astranite death summons one temporary Cristanite on Helion-05", ()=>{
  const manager = createWorldStateManager({
    io:{to:()=>({emit(){}})},
    players:new Map(),
    presence:{isActiveForWorld:()=>true},
    progressProfileQuestAction(){}
  });
  const map = manager.getWorldMapState("4");
  const astranite = map.enemies.find(enemy=>enemy.kind === "astranite");
  astranite.hp = 0;
  const children = manager.spawnWorldEnemyChildren("4", astranite);
  assert.equal(children.length, 1);
  assert.equal(children[0].kind, "cristanite");
  assert.equal(children[0].temporarySpawn, true);
  assert.equal(children[0].spawnedBy, astranite.id);
  assert.equal(map.enemies.filter(enemy=>enemy.kind === "astranite" && enemy.hp > 0).length, 3);
  assert.equal(map.enemies.filter(enemy=>enemy.kind === "cristanite" && enemy.hp > 0).length, 17);
  assert.equal(map.enemies.filter(enemy=>enemy.hp > 0).length, 50);
});

test("monster stats grow five percent and rewards grow ten percent above base level", ()=>{
  assert.equal(scaleMonsterStat(800, 1, 4), 920);
  assert.deepEqual(scaleMonsterReward({xp:400, credits:800, premium:1}, 1, 4), {xp:520, credits:1_040, premium:1});
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
  assert.equal(enemy.reward.xp, 520);
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
  assert.deepEqual(bossOrbe.reward, {credits:2240, xp:1120, premium:2});
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

test("every boss reward is exactly twice its same-level normal monster reward", ()=>{
  const pairs = [
    ["drone_pirate", "boss_drone_pirate", 1],
    ["raider_astral", "boss_raider_astral", 1],
    ["chasseur_spectral", "boss_chasseur_spectral", 5],
    ["cuirasse_nebulaire", "boss_cuirasse_nebulaire", 10],
    ["cuirasse_ambre", "boss_cuirasse_ambre", 15]
  ];
  for(const [normalKind, bossKind, level] of pairs){
    const map = {id:"test", width:1000, height:1000, level:[level, level], enemyTypes:[[normalKind, 1]]};
    const normal = createWorldEnemy(map, 1, ()=>0.5, normalKind);
    const boss = createWorldEnemy(map, 2, ()=>0.5, bossKind);
    assert.deepEqual(boss.reward, Object.fromEntries(
      Object.entries(normal.reward).map(([key, value])=>[key, value * 2])
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

test("Deadly portal key drops at 0.1 percent on firm zones one to five", ()=>{
  const drop = rollPortalAnchorKeyDrop("Helion-05", {random:()=>0.001});
  assert.equal(drop.itemId, "portal_anchor_key");
  assert.equal(drop.amount, 1);
  assert.equal(rollPortalAnchorKeyDrop("Helion-05", {random:()=>0.0011}), null);
  assert.equal(rollPortalAnchorKeyDrop("CORE", {random:()=>0}), null);
  assert.equal(rollPortalAnchorKeyDrop("Helion-06", {random:()=>0}), null);
  assert.equal(rollPortalAnchorKeyDrop("Nereid-01", {random:()=>0})?.itemId, "portal_anchor_key");
});

test("server emits and validates Deadly portal key pickup", ()=>{
  const previousRandom = Math.random;
  Math.random = ()=>0;
  try{
    const emitted = [];
    const socketEvents = [];
    const player = {id:"p1", mapId:"Helion-01", state:{mapId:"Helion-01", x:100, y:200}};
    const players = new Map([[player.id, player]]);
    const profile = {inventoryItems:[], nextInventoryUid:1};
    const manager = createWorldLootManager({
      io:{to:id=>({emit:(event, payload)=>emitted.push({id, event, payload})})},
      players,
      profileManager:{
        updateProfileForPlayer:({update})=>{
          const result = update(profile);
          return {...result, profile};
        }
      },
      emitProfileSync(){}
    });
    manager.emitPrivatePortalAnchorKeyDrop({
      ownerId:player.id,
      mapId:"Helion-01",
      enemy:{id:"enemy", kind:"drone_pirate", level:1, x:100, y:200}
    });
    const event = emitted.find(entry=>entry.event === "loot:drop" && entry.payload.kind === "item")?.payload;
    assert.ok(event);
    assert.equal(event.itemId, "portal_anchor_key");
    assert.equal(event.serverControlled, true);
    player.state = {mapId:"Helion-01", x:event.x, y:event.y};
    manager.pickupLoot({id:player.id, emit:(name, payload)=>socketEvents.push({name, payload})}, {id:event.id});
    assert.equal(getInventoryItemCount(profile, "portal_anchor_key"), 1);
    assert.equal(socketEvents.some(entry=>entry.name === "loot:picked"), true);
  }finally{
    Math.random = previousRandom;
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
