import assert from "node:assert/strict";
import test from "node:test";
import { getStateStorageKey, loadState, saveState, store } from "../../src/core/store.js";

function createStorage(initial = {}){
  const values = new Map(Object.entries(initial));
  return {
    getItem:key=>values.has(key) ? values.get(key) : null,
    setItem:(key, value)=>values.set(key, String(value)),
    removeItem:key=>values.delete(key),
    read:key=>values.get(key)
  };
}

test("local state persistence stores preferences only", ()=>{
  const previousLocalStorage = globalThis.localStorage;
  const storage = createStorage();
  globalThis.localStorage = storage;
  try{
    store.state = {
      player:{credits:999999, premium:999999, xp:999999, level:99},
      inventoryItems:[{uid:"forged", itemId:"laser_mk4"}],
      activeQuestIds:["forged_quest"],
      questProgress:{forged_quest:999},
      unlockedPortals:["void"],
      graphicsQuality:"medium",
      slotKeybinds:["KeyA", "KeyB"],
      abilityKeybinds:["KeyC", "KeyV", "KeyX"],
      uiLayout:{miniMap:{x:12, y:34}}
    };

    saveState();

    const saved = JSON.parse(storage.read(getStateStorageKey()));
    assert.equal(saved.localPreferencesVersion, 4);
    assert.equal(saved.graphicsQuality, "medium");
    assert.equal(saved.settings.graphics.preset, "medium");
    assert.equal(saved.settings.graphics.effects.cosmicClouds, false);
    assert.deepEqual(saved.slotKeybinds, ["KeyA", "KeyB"]);
    assert.deepEqual(saved.abilityKeybinds, ["KeyC", "KeyV", "KeyX"]);
    assert.deepEqual(saved.uiLayout, {miniMap:{x:12, y:34}});
    assert.equal(Object.hasOwn(saved, "player"), false);
    assert.equal(Object.hasOwn(saved, "inventoryItems"), false);
  }finally{
    globalThis.localStorage = previousLocalStorage;
  }
});

test("loading a legacy full local state ignores progression and rewrites preferences only", ()=>{
  const previousLocalStorage = globalThis.localStorage;
  const key = getStateStorageKey();
  const storage = createStorage({
    [key]:JSON.stringify({
      player:{credits:999999, premium:999999, xp:999999, level:99},
      inventoryItems:[{uid:"forged", itemId:"laser_mk4"}],
      activeQuestIds:["forged_quest"],
      questProgress:{forged_quest:999},
      unlockedPortals:["void"],
      graphicsQuality:"low",
      slotKeybinds:["KeyQ"],
      uiLayout:{miniMap:{x:90, y:45}}
    })
  });
  globalThis.localStorage = storage;
  try{
    const state = loadState();

    assert.equal(state.player.credits, 0);
    assert.equal(state.player.premium, 0);
    assert.equal(state.player.level, 1);
    assert.equal(state.inventoryItems.some(entry=>entry.uid === "forged"), false);
    assert.deepEqual(state.activeQuestIds, []);
    assert.deepEqual(state.unlockedPortals, []);
    assert.equal(state.graphicsQuality, "low");
    assert.equal(state.slotKeybinds[0], "KeyQ");
    assert.deepEqual(state.uiLayout.miniMap, {x:90, y:45});
    const saved = JSON.parse(storage.read(key));
    assert.equal(saved.localPreferencesVersion, 4);
    assert.equal(saved.graphicsQuality, "low");
    assert.equal(saved.settings.graphics.preset, "low");
    assert.equal(saved.settings.graphics.effects.combatDrones, true);
    assert.equal(saved.settings.graphics.effects.nebulae, false);
    assert.deepEqual(saved.slotKeybinds, ["KeyQ"]);
    assert.deepEqual(saved.uiLayout, {miniMap:{x:90, y:45}});
    assert.equal(Object.hasOwn(saved, "player"), false);
  }finally{
    globalThis.localStorage = previousLocalStorage;
  }
});

test("version 2 preferences migrate target details and PERF to hidden", ()=>{
  const previousLocalStorage = globalThis.localStorage;
  const key = getStateStorageKey();
  const storage = createStorage({
    [key]:JSON.stringify({
      localPreferencesVersion:2,
      graphicsQuality:"high",
      settings:{
        graphics:{preset:"high", basePreset:"high", fpsLimit:60},
        interface:{uiScale:1, targetDetailsVisible:true, chatVisible:true, perfVisible:true}
      },
      uiLayout:{perfVisible:true}
    })
  });
  globalThis.localStorage = storage;
  try{
    const state = loadState();
    assert.equal(state.settings.interface.targetDetailsVisible, false);
    assert.equal(state.settings.interface.perfVisible, false);
    assert.equal(state.uiLayout.perfVisible, false);
    const saved = JSON.parse(storage.read(key));
    assert.equal(saved.localPreferencesVersion, 4);
    assert.equal(saved.settings.interface.targetDetailsVisible, false);
    assert.equal(saved.settings.interface.perfVisible, false);
  }finally{
    globalThis.localStorage = previousLocalStorage;
  }
});
