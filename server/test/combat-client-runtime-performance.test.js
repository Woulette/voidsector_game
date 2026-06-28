import assert from "node:assert/strict";
import test from "node:test";
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
