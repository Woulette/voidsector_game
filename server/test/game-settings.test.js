import assert from "node:assert/strict";
import test from "node:test";
import {
  GRAPHICS_EFFECT_IDS,
  GRAPHICS_PRESET_EFFECTS,
  normalizeGameSettings,
  settingsWithGraphicsEffect,
  settingsWithGraphicsPreset
} from "../../src/core/settingsSchema.js";

test("high enables every graphics effect", ()=>{
  const settings = settingsWithGraphicsPreset(null, "high");
  assert.equal(settings.graphics.preset, "high");
  for(const id of GRAPHICS_EFFECT_IDS) assert.equal(settings.graphics.effects[id], true, id);
});

test("medium disables exactly the four requested heavy effects", ()=>{
  const disabled = Object.entries(GRAPHICS_PRESET_EFFECTS.medium).filter(([, enabled])=>!enabled).map(([id])=>id).sort();
  assert.deepEqual(disabled, ["cosmicClouds", "enemyAttackParticles", "portalEffects", "projectileTrails"]);
});

test("low preserves combat readability and disables decorative effects", ()=>{
  const enabled = Object.entries(GRAPHICS_PRESET_EFFECTS.low).filter(([, value])=>value).map(([id])=>id).sort();
  assert.deepEqual(enabled, ["combatDrones", "laserBeams", "muzzleFlashes", "repairDrone"]);
});

test("manual graphics changes switch to custom without changing the base preset", ()=>{
  const medium = settingsWithGraphicsPreset(null, "medium");
  const custom = settingsWithGraphicsEffect(medium, "vignette", false);
  assert.equal(custom.graphics.preset, "custom");
  assert.equal(custom.graphics.basePreset, "medium");
  assert.equal(custom.graphics.effects.vignette, false);
});

test("settings normalization clamps audio and accepts only supported FPS and UI scale values", ()=>{
  const settings = normalizeGameSettings({
    graphics:{fpsLimit:75},
    interface:{uiScale:1.17},
    audio:{master:140, music:-20, ambience:"invalide"}
  });
  assert.equal(settings.graphics.fpsLimit, 0);
  assert.equal(settings.interface.uiScale, 1.2);
  assert.equal(settings.audio.master, 100);
  assert.equal(settings.audio.music, 0);
  assert.equal(settings.audio.ambience, 80);
});

test("target details and PERF are hidden by default but can be enabled explicitly", ()=>{
  const defaults = normalizeGameSettings(null);
  assert.equal(defaults.interface.targetDetailsVisible, false);
  assert.equal(defaults.interface.perfVisible, false);

  const enabled = normalizeGameSettings({interface:{targetDetailsVisible:true, perfVisible:true}});
  assert.equal(enabled.interface.targetDetailsVisible, true);
  assert.equal(enabled.interface.perfVisible, true);
});
