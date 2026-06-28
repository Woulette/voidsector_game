import assert from "node:assert/strict";
import test from "node:test";
import { createLevelUpEffectSystem, spawnLevelUpEffects } from "../../src/game/systems/levelUpEffects.js";

function fixedRandom(){
  return .5;
}

test("level-up effects stay quiet on reset and spawn only when the level increases", ()=>{
  const state = {
    store:{state:{player:{level:4}}},
    player:{x:120, y:-80, radius:50},
    particles:[],
    damageTexts:[]
  };
  const system = createLevelUpEffectSystem({
    getState:()=>state,
    random:fixedRandom
  });

  assert.equal(system.reset(), 4);
  assert.equal(system.update(), false);
  assert.equal(state.particles.length, 0);
  assert.equal(state.damageTexts.length, 0);

  state.store.state.player.level = 5;

  assert.equal(system.update(), true);
  assert.equal(state.particles.some(particle=>particle.kind === "levelUpPulse"), false);
  assert.equal(state.particles.some(particle=>particle.kind === "levelUpAura"), true);
  assert.equal(state.particles.some(particle=>particle.kind === "levelUpHalo"), true);
  assert.equal(state.particles.some(particle=>particle.kind === "levelUpStar"), true);
  assert.ok(state.particles.find(particle=>particle.kind === "levelUpAura").life > 2);
  assert.ok(state.particles.find(particle=>particle.kind === "levelUpSpark").life > .9);
  assert.equal(state.particles.filter(particle=>particle.kind === "levelUpSpark").length, 25);
  assert.equal(state.particles.every(particle=>particle.kind !== "levelUpSpark" || particle.followPlayer), true);
  const star = state.particles.find(particle=>particle.kind === "levelUpStar");
  assert.equal(star.level, 5);
  assert.ok(star.life > 3);
  assert.ok(star.driftStart > 1);
  assert.equal(state.damageTexts.length, 0);
});

test("level-up effects report visible level-up notices once per increase", ()=>{
  const notices = [];
  const state = {
    store:{state:{player:{level:9}}},
    player:{x:0, y:0, radius:45},
    particles:[],
    damageTexts:[]
  };
  const system = createLevelUpEffectSystem({
    getState:()=>state,
    random:fixedRandom,
    onLevelUp:event=>notices.push(event)
  });

  system.reset();
  state.store.state.player.level = 10;

  assert.equal(system.update(), true);
  assert.deepEqual(notices.map(event=>({level:event.level, previousLevel:event.previousLevel})), [
    {level:10, previousLevel:9}
  ]);
  assert.equal(system.update(), false);
  assert.equal(notices.length, 1);
});

test("spawnLevelUpEffects accepts multi-level rewards without exceeding the spark cap", ()=>{
  const state = {
    player:{x:0, y:0, radius:42},
    particles:[],
    damageTexts:[]
  };

  assert.equal(spawnLevelUpEffects({state, level:30, previousLevel:1, random:fixedRandom}), true);
  assert.equal(state.particles.filter(particle=>particle.kind === "levelUpSpark").length, 34);
  assert.equal(state.particles.find(particle=>particle.kind === "levelUpStar").level, 30);
  assert.equal(state.damageTexts.length, 0);
});
