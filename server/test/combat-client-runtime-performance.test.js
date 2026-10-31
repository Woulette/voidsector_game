import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { createCombatStatusEffectSystem } from "../../src/game/systems/combatStatusEffects.js";
import { createProjectile, updateProjectiles } from "../../src/game/systems/projectiles.js";

function createStatusSystem(state, overrides = {}){
  return createCombatStatusEffectSystem({
    getState:()=>state,
    setState:patch=>Object.assign(state, patch),
    updatePoisonStatus(){},
    updateSlowStatus(){},
    pushDamageText(){},
    handlePlayerDeath(){},
    onPlayerHpLost(){},
    ...overrides
  });
}

test("combat visual lists are compacted in place during frame updates", ()=>{
  const state = {
    player:{x:0, y:0},
    particles:[
      {x:0, y:0, vx:0, vy:0, life:.4},
      {x:0, y:0, vx:0, vy:0, life:.02}
    ],
    impactEffects:[
      {life:.3, delay:0},
      {life:.01, delay:0}
    ],
    damageTexts:[
      {x:0, y:0, life:.3},
      {x:0, y:0, life:.01}
    ]
  };
  const particles = state.particles;
  const impactEffects = state.impactEffects;
  const damageTexts = state.damageTexts;

  createStatusSystem(state).updateParticles(.05);

  assert.equal(state.particles, particles);
  assert.equal(state.impactEffects, impactEffects);
  assert.equal(state.damageTexts, damageTexts);
  assert.equal(state.particles.length, 1);
  assert.equal(state.impactEffects.length, 1);
  assert.equal(state.damageTexts.length, 1);
});

test("combat visual list caps keep the newest entries without replacing arrays", ()=>{
  const state = {
    player:{x:0, y:0},
    particles:Array.from({length:260}, (_, index)=>({x:index, y:0, vx:0, vy:0, life:1})),
    impactEffects:Array.from({length:110}, (_, index)=>({x:index, y:0, life:1, delay:0})),
    damageTexts:Array.from({length:90}, (_, index)=>({x:index, y:0, life:1}))
  };
  const particles = state.particles;
  const impactEffects = state.impactEffects;
  const damageTexts = state.damageTexts;

  createStatusSystem(state).updateParticles(.05);

  assert.equal(state.particles, particles);
  assert.equal(state.impactEffects, impactEffects);
  assert.equal(state.damageTexts, damageTexts);
  assert.equal(state.particles.length, 240);
  assert.equal(state.particles[0].x, 20);
  assert.equal(state.impactEffects.length, 96);
  assert.equal(state.impactEffects[0].x, 14);
  assert.equal(state.damageTexts.length, 80);
  assert.equal(state.damageTexts[0].x, 10);
});

test("projectile updates compact completed bullets in place", ()=>{
  const bullets = [
    createProjectile({owner:"serverEnemy", startX:0, startY:0, targetId:"player", damage:0, travelTime:.01, radius:5}),
    createProjectile({owner:"serverEnemy", startX:0, startY:0, targetId:"player", damage:0, travelTime:10, radius:5})
  ];

  const result = updateProjectiles({
    bullets,
    dt:.02,
    getTarget:()=>({x:100, y:0}),
    onImpact(){}
  });

  assert.equal(result, bullets);
  assert.equal(result.length, 1);
  assert.equal(result[0].travelTime, 10);
});

test("rocket and missile trails are sampled instead of allocating every frame", ()=>{
  const bullet = createProjectile({
    owner:"player",
    startX:0,
    startY:0,
    targetId:"enemy",
    damage:1,
    travelTime:1,
    radius:7,
    kind:"missile"
  });
  const bullets = [bullet];

  for(let index = 0; index < 20; index += 1){
    updateProjectiles({
      bullets,
      dt:1 / 240,
      getTarget:()=>({x:600, y:0}),
      onImpact(){}
    });
  }

  assert.equal(bullets.length, 1);
  assert.ok(bullet.trail.length < 20);
  assert.ok(bullet.trail.length <= 6);
});

test("inactive status effects do not write HUD state every frame", ()=>{
  const poisonUpdates = [];
  const slowUpdates = [];
  const state = {
    player:{x:0, y:0, hp:100, maxHp:100},
    particles:[],
    impactEffects:[],
    damageTexts:[]
  };
  const system = createStatusSystem(state, {
    updatePoisonStatus:effect=>poisonUpdates.push(effect),
    updateSlowStatus:effect=>slowUpdates.push(effect)
  });

  for(let index = 0; index < 10; index += 1){
    system.updatePlayerPoison(.016);
    system.updatePlayerSlow(.016);
  }

  assert.equal(poisonUpdates.length, 0);
  assert.equal(slowUpdates.length, 0);
});

test("server-authoritative poison refresh keeps pulses and throttles HUD updates", ()=>{
  const poisonUpdates = [];
  const state = {
    player:{x:0, y:0, hp:100, maxHp:100},
    particles:[],
    impactEffects:[],
    damageTexts:[]
  };
  const system = createStatusSystem(state, {
    updatePoisonStatus:effect=>poisonUpdates.push(effect ? Math.ceil(effect.remaining) : null)
  });

  system.applyPlayerPoison({type:"poison", damage:5, interval:2, duration:10, remaining:10, serverAuthoritative:true});
  assert.equal(poisonUpdates.length, 1);
  state.player.poisonEffect.pulseT = .08;

  system.applyPlayerPoison({type:"poison", damage:5, interval:2, duration:10, remaining:10, serverAuthoritative:true});
  assert.equal(poisonUpdates.length, 1);
  assert.equal(state.player.poisonEffect.pulseT, .08);

  for(let index = 0; index < 10; index += 1) system.updatePlayerPoison(.016);
  assert.equal(poisonUpdates.length, 1);
  system.updatePlayerPoison(.05);
  assert.equal(poisonUpdates.length, 2);
});

test("combat rendering reuses one state snapshot per frame", ()=>{
  const scene = readFileSync(new URL("../../src/game/render/combatScene.js", import.meta.url), "utf8");
  const drawStart = scene.indexOf("  function draw(){");
  const drawEnd = scene.indexOf("\n  return {drawBackground", drawStart);
  const drawSource = scene.slice(drawStart, drawEnd);
  assert.ok(drawStart >= 0 && drawEnd > drawStart);
  assert.equal((drawSource.match(/getState\(\)/g) || []).length, 1);
  assert.match(drawSource, /const state = getState\(\)/);

  const encounters = [
    ["vesperEncounter.js", ["drawArena", "drawAllies"]],
    ["kharonEncounter.js", ["drawHazards"]],
    ["eclaniteEncounter.js", ["drawArena"]],
    ["noxEncounter.js", ["drawArena"]],
    ["prismaticEncounter.js", ["drawArena"]],
    ["ancientEncounter.js", ["drawArena", "drawAllies", "drawEnemyOverlays"]]
  ];
  for(const [file, methods] of encounters){
    const source = readFileSync(new URL(`../../src/game/render/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /const state = getState\(\)/);
    for(const method of methods){
      assert.match(source, new RegExp(`function ${method}\\(state = getState\\(\\)\\)`));
    }
  }
});

test("browser imports share one multiplayer singleton cache key", ()=>{
  function collectJavaScriptSources(directory){
    return readdirSync(directory, {withFileTypes:true}).flatMap(entry=>{
      const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      if(entry.isDirectory()) return collectJavaScriptSources(child);
      return entry.isFile() && entry.name.endsWith(".js")
        ? [readFileSync(child, "utf8")]
        : [];
    });
  }
  const versions = new Set();
  let importCount = 0;
  for(const source of collectJavaScriptSources(new URL("../../src/", import.meta.url))){
    for(const match of source.matchAll(/(?:multiplayer\/)?client\.js\?v=([a-zA-Z0-9_-]+)/g)){
      versions.add(match[1]);
      importCount += 1;
    }
  }
  assert.ok(importCount >= 9);
  assert.equal(versions.size, 1);
});
