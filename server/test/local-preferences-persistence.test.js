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
      uiLayout:{miniMap:{x:12, y:34}}
    };

    saveState();

    assert.deepEqual(JSON.parse(storage.read(getStateStorageKey())), {
      localPreferencesVersion:1,
      graphicsQuality:"medium",
      slotKeybinds:["KeyA", "KeyB"],
      uiLayout:{miniMap:{x:12, y:34}}
    });
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
    assert.deepEqual(JSON.parse(storage.read(key)), {
      localPreferencesVersion:1,
      graphicsQuality:"low",
      slotKeybinds:["KeyQ"],
      uiLayout:{miniMap:{x:90, y:45}}
    });
  }finally{
    globalThis.localStorage = previousLocalStorage;
  }
});
