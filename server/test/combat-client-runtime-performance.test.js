import assert from "node:assert/strict";
import test from "node:test";
import { createCombatStatusEffectSystem } from "../../src/game/systems/combatStatusEffects.js";
import { createProjectile, updateProjectiles } from "../../src/game/systems/projectiles.js";

function createStatusSystem(state){
  return createCombatStatusEffectSystem({
    getState:()=>state,
    setState:patch=>Object.assign(state, patch),
    updatePoisonStatus(){},
    updateSlowStatus(){},
    pushDamageText(){},
    handlePlayerDeath(){},
    onPlayerHpLost(){}
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
