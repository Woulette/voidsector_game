import assert from "node:assert/strict";
import test from "node:test";
import { buildAzuronPortalWave, createAzuronWaveRuntime } from "../src/portals/azuronPortal.js";
import { createWorldAiManager } from "../src/world/ai.js";
import { WORLD_MAPS } from "../src/world/definitions.js";
import { createWorldEnemy } from "../src/world/spawn.js";
import { normalizePortalInstance } from "../../src/multiplayer/worldSocketListeners.js";
import { createPortalMap } from "../../src/game/systems/portalState.js";

function scenario(){
  let now = 1_000;
  let completions = 0;
  const timers = [];
  const spawns = [];
  const pilot = {x:0, y:0};
  const group = {instance:{id:"azuron-clock", type:"portal", portal:{id:"blue"}, enemies:[]}};
  const runtime = createAzuronWaveRuntime({
    now:()=>now, getSpawnContext:()=>pilot,
    emitPortalComplete(){ completions++; },
    buildWave(wave, at, context){
      const enemies = buildAzuronPortalWave(wave, at, context);
      spawns.push({wave, at, enemies});
      return enemies;
    },
    setTimeoutFn(fn, delay){ const timer = {fn, at:now + delay}; timers.push(timer); return timer; },
    clearTimeoutFn(timer){ timer.cancelled = true; }
  });
  function advance(ms){
    const end = now + ms;
    for(;;){
      const timer = timers.filter(t=>!t.fired && !t.cancelled && t.at <= end).sort((a,b)=>a.at - b.at)[0];
      if(!timer) break;
      now = timer.at; timer.fired = true; timer.fn();
    }
    now = end;
  }
  return {runtime, group, pilot, spawns, timers, advance, get now(){return now;}, get completions(){return completions;}};
}

test("the full run has 250 enemies in the requested six families, with real level-10 statistics", ()=>{
  const expected = [
    ["drone_pirate", 10, 800, 400, 76],
    ["raider_astral", 10, 1200, 600, 173],
    ["chasseur_spectral", 10, 3000, 1000, 140],
    ["cuirasse_nebulaire", 10, 5000, 3000, 250],
    ["eclanite", 5, 20000, 20000, 350],
    ["cuirasse_ambre", 5, 50000, 50000, 700]
  ];
  let total = 0;
  for(let wave = 1; wave <= 30; wave++){
    const [kind, count, hp, shield, damage] = expected[Math.floor((wave - 1) / 5)];
    const enemies = buildAzuronPortalWave(wave, 1000);
    assert.equal(enemies.length, count);
    for(const enemy of enemies){
      assert.equal(enemy.kind, kind); assert.equal(enemy.level, 10);
      assert.equal(enemy.hp, hp); assert.equal(enemy.shield, shield); assert.equal(enemy.attackDamage, damage);
      assert.ok(enemy.permanentAggro && !enemy.azuronBoss);
    }
    total += count;
  }
  assert.equal(total, 250);
});

test("Azuron inherits current level-ten stats, final damage bounds and rewards from ordinary monsters", t=>{
  const player = {id:"pilot", state:{x:0, y:0, hp:100000}};
  const attacks = [];
  const map = {...WORLD_MAPS["0"], id:"portal-blue", width:5200, height:3600};
  const ai = createWorldAiManager({players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true}, isPlayerSafeOnMap:()=>false,
    launchEnemyAttack:attack=>attacks.push(attack)});
  for(const wave of [1, 6, 11, 16, 21, 26]){
    const enemy = buildAzuronPortalWave(wave, 1000)[0];
    const ordinary = createWorldEnemy(map, 1, ()=>.5, enemy.kind, {level:10, x:100, y:0});
    for(const field of ["maxHp", "maxShield", "attackDamage", "attackDamageMin", "attackDamageMax", "speed", "attackRange", "attackCooldown"]){
      assert.equal(enemy[field], ordinary[field], `${enemy.kind}: ${field}`);
    }
    assert.deepEqual(enemy.reward, ordinary.reward, enemy.kind);
    assert.equal(enemy.onHitEffect, null, "Azuron keeps its encounter-specific no-poison rule");
    for(const [roll, expected] of [[0, ordinary.attackDamageMin], [1, ordinary.attackDamageMax]]){
      t.mock.method(Math, "random", ()=>roll);
      Object.assign(enemy, {x:100, y:0, staggerFirstAttack:false, nextAttackAt:0});
      const before = attacks.length;
      ai.updateWorldEnemy(enemy, map, [player], 0, 1000);
      assert.equal(attacks.length, before + 1, enemy.kind);
      assert.equal(attacks.at(-1).amount, expected, enemy.kind);
      t.mock.restoreAll();
    }
  }
});

test("waves overlap at 15 seconds and each cleared series waits for the continue gate", ()=>{
  const s = scenario();
  s.runtime.start(s.group);
  for(let batch = 0; batch < 6; batch++){
    const startWave = batch * 5 + 1;
    const startedAt = s.now;
    assert.equal(s.group.instance.wave, startWave);
    for(let offset = 1; offset < 5; offset++){
      s.advance(14999);
      assert.equal(s.group.instance.wave, startWave + offset - 1);
      s.pilot.x = 300; s.pilot.y = -200;
      s.advance(1);
      assert.equal(s.group.instance.wave, startWave + offset);
      assert.equal(s.spawns.at(-1).at, startedAt + offset * 15_000);
      const positions = s.spawns.at(-1).enemies;
      assert.ok(positions.every(e=>Math.abs(Math.hypot(e.x, e.y) - 2000) < .001));
    }
    const survivors = s.group.instance.enemies;
    assert.equal(survivors.length, batch < 4 ? 50 : 25);
    s.advance(45_000);
    survivors.slice(1).forEach(e=>{e.hp = 0;});
    s.runtime.handleEnemyDeath(s.group);
    assert.equal(s.group.instance.waveState, "clear_batch");
    assert.equal(s.group.instance.nextWaveAt, 0);
    s.advance(20_000);
    assert.equal(s.group.instance.wave, startWave + 4);
    survivors[0].hp = 0;
    s.runtime.handleEnemyDeath(s.group);
    s.runtime.handleEnemyDeath(s.group);
    if(batch === 5){
      assert.equal(s.completions, 1);
      assert.equal(s.group.instance.waveState, "completed");
    }else{
      assert.equal(s.group.instance.waveState, "batch_ready");
      assert.equal(s.group.instance.nextWaveAt, 0);
      s.advance(60_000);
      assert.equal(s.group.instance.wave, startWave + 4);
      assert.equal(s.runtime.continueBatch(s.group),true);
      assert.equal(s.group.instance.wave, startWave + 5);
      assert.equal(s.group.instance.nextWaveAt, s.now + 15_000);
    }
  }
  assert.equal(s.spawns.length, 30);
});

test("clearing wave one early never brings forward wave two", ()=>{
  const s = scenario(); s.runtime.start(s.group);
  s.group.instance.enemies.forEach(e=>{e.hp = 0;});
  s.runtime.handleEnemyDeath(s.group);
  s.advance(14999); assert.equal(s.spawns.length, 1);
  s.advance(1); assert.equal(s.group.instance.wave, 2);
});

for(const intermission of [false, true]){
  test(`abandoning or replacing an instance cancels ${intermission ? "the intermission" : "scheduled reinforcements"}`, ()=>{
    const s = scenario(); s.runtime.start(s.group);
    if(intermission){
      s.advance(60_000);
      s.group.instance.enemies.forEach(e=>{e.hp = 0;}); s.runtime.handleEnemyDeath(s.group);
    }
    const before = s.spawns.length;
    s.runtime.cancel(s.group.instance);
    s.group.instance = null;
    s.advance(100_000);
    assert.equal(s.spawns.length, before); assert.equal(s.completions, 0);
  });
}

test("spawns stay fixed around the centre when the pilot changes position", ()=>{
  for(const wave of [1, 21, 30]){
    for(const x of [-2500, 0, 2500]) for(const y of [-1700, 0, 1700]){
      const enemies = buildAzuronPortalWave(wave, 1000, {x, y});
      for(const enemy of enemies){
        assert.ok(Math.abs(enemy.x) <= 3800 && Math.abs(enemy.y) <= 2600);
        assert.ok(Math.abs(Math.hypot(enemy.x, enemy.y) - 2000) < .001);
        for(const other of enemies){
          if(other === enemy) continue;
          assert.ok(Math.hypot(enemy.x - other.x, enemy.y - other.y) > enemy.radius + other.radius);
        }
      }
    }
  }
});

test("every Azuron species acquires a distant pilot without a hit and keeps pursuing past normal memory", ()=>{
  const map = {id:"portal-blue", width:7800, height:5400};
  const player = {id:"pilot", state:{x:2350, y:1500, hp:10000, moving:true}};
  const attacks = [];
  const manager = createWorldAiManager({players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true}, isPlayerSafeOnMap:()=>true,
    launchEnemyAttack:attack=>attacks.push(attack)});
  for(const wave of [1, 6, 11, 16, 21, 26]){
    const enemy = buildAzuronPortalWave(wave, 1000)[0];
    Object.assign(enemy, {x:-2300, y:-1400});
    manager.updateWorldEnemy(enemy, map, [player], .05, 1000);
    assert.equal(enemy.lockedPlayerId, player.id);
    assert.ok(enemy.moving);
    manager.updateWorldEnemy(enemy, map, [player], .05, 1_000_000);
    assert.equal(enemy.lockedPlayerId, player.id);
    Object.assign(enemy, {x:player.state.x - 100, y:player.state.y, nextAttackAt:0, staggerFirstAttack:false});
    manager.updateWorldEnemy(enemy, map, [player], .05, 1_001_000);
    assert.equal(attacks.at(-1)?.enemy.id, enemy.id);
    manager.updateWorldEnemy(enemy, map, [], .05, 1_003_000);
    assert.equal(enemy.lockedPlayerId, null);
  }
});

test("ordinary world Orbes and Voraks remain passive until attacked", ()=>{
  const map = WORLD_MAPS["0"];
  const player = {id:"pilot", state:{x:200, y:200, hp:10000}};
  const manager = createWorldAiManager({players:new Map([[player.id, player]]),
    presence:{isActiveForWorld:()=>true}, isPlayerSafeOnMap:()=>false,
    launchEnemyAttack(){assert.fail("passive world enemy attacked");}});
  for(const kind of ["drone_pirate", "raider_astral"]){
    const enemy = createWorldEnemy(map, 0, ()=>.5, kind, {level:10, x:250, y:200});
    manager.updateWorldEnemy(enemy, map, [player], .05, 1000);
    assert.equal(enemy.lockedPlayerId, null);
  }
});

test("all Azuron families settle at varied stable distances between 150 and 160, including the map edges", ()=>{
  const map = {id:"portal-blue", width:7800, height:5400};
  for(const position of [{x:0,y:0}, {x:3830,y:2630}, {x:-3830,y:2630},
    {x:3830,y:-2630}, {x:-3830,y:-2630}, {x:3830,y:0}, {x:0,y:-2630}]){
    const player = {id:"pilot", state:{...position, hp:10000, moving:false}};
    for(const wave of [1, 6, 11, 16, 21, 26]){
      const enemies = buildAzuronPortalWave(wave, 1000, position);
      assert.ok(new Set(enemies.map(enemy=>enemy.stationaryRingRadius)).size > 1);
      assert.deepEqual(enemies.map(enemy=>enemy.stationaryRingRadius),
        buildAzuronPortalWave(wave, 2000, position).map(enemy=>enemy.stationaryRingRadius));
      const manager = createWorldAiManager({players:new Map([[player.id, player]]),
        presence:{isActiveForWorld:()=>true}, isPlayerSafeOnMap:()=>false, launchEnemyAttack(){}});
      for(let step = 1; step <= 1600; step++){
        for(const enemy of enemies) manager.updateWorldEnemy(enemy, map, [player], .05, 1000 + step * 50);
      }
      for(const enemy of enemies){
        const distance = Math.hypot(enemy.x - position.x, enemy.y - position.y);
        assert.ok(enemy.stationaryRingRadius >= 150 && enemy.stationaryRingRadius <= 160);
        assert.ok(distance >= 149.999 && distance <= 160.001, `${enemy.kind}: stopped at ${distance}`);
        assert.ok(Math.abs(distance - enemy.stationaryRingRadius) < .001, `${enemy.kind}: missed its assigned distance`);
        assert.equal(enemy.moving, false);
        assert.equal(enemy.lockedPlayerId, player.id);
        assert.ok(Math.abs(enemy.x) <= 3830.001 && Math.abs(enemy.y) <= 2630.001);
      }
      for(let first = 0; first < enemies.length; first++){
        for(let second = first + 1; second < enemies.length; second++){
          assert.ok(Math.hypot(enemies[first].x-enemies[second].x,enemies[first].y-enemies[second].y) > .5);
        }
      }
    }
  }
});

test("the manual checkpoint is transmitted without an automatic next-wave countdown", ()=>{
  const state = normalizePortalInstance({instanceId:"test", portal:{id:"blue", totalWaves:30},
    wave:5, waveState:"batch_ready", nextWaveAt:0, nextWaveDelayMs:0});
  assert.equal(state.waveTotal, 30); assert.equal(state.waitingForClear, false);
  assert.equal(state.waveState, "batch_ready");
  assert.ok(state.nextWaveAt <= Date.now());
});

test("the first three portals share the enlarged Azuron arena", ()=>{
  const map = createPortalMap({id:"blue", name:"Le Seuil d’Azuron"});
  assert.equal(map.width, 7800); assert.equal(map.height, 5400);
  assert.equal(map.parallaxScene.enabled, true);
  assert.equal(map.azuronPortal, true);
  for(const id of ["violet","red"]){const variant=createPortalMap({id,name:id});assert.equal(variant.azuronPortal,true);assert.equal(variant.id,`portal-${id}`);assert.equal(variant.width,map.width);}
});
