import assert from "node:assert/strict";
import test from "node:test";
import {
  createCombatMapAssetCache,
  getCachedCombatImage,
  getCombatMapAssetPaths,
  preloadCombatAssets
} from "../../src/game/combatAssets.js";
import { createCombatMapAssetStreamingSystem } from "../../src/game/systems/combatMapAssetStreaming.js";

class FakeImage {
  set src(value){
    this.currentSrc = value;
  }
}

test("map asset cache keeps only the active map and two recent destinations", ()=>{
  const previousImage = globalThis.Image;
  globalThis.Image = FakeImage;
  try{
    const cache = {"assets/shared.png":{shared:true}};
    const maps = [
      {id:0, bg:"assets/a.png", questNpcs:[{npcImg:"assets/shared.png"}]},
      {id:1, bg:"assets/b.png"},
      {id:2, bg:"assets/c.png"},
      {id:3, bg:"assets/d.png"}
    ];
    const assets = createCombatMapAssetCache({cache, maxMaps:3});

    assets.activate(maps[0]);
    assets.preload(maps[1]);
    assets.preload(maps[2]);
    assets.preload(maps[3]);

    assert.deepEqual(assets.getRetainedMapKeys(), ["0", "2", "3"]);
    assert.ok(cache["assets/a.png"]);
    assert.equal(cache["assets/b.png"], undefined);
    assert.ok(cache["assets/c.png"]);
    assert.ok(cache["assets/d.png"]);
    assert.deepEqual(cache["assets/shared.png"], {shared:true});
  }finally{
    globalThis.Image = previousImage;
  }
});

test("initial combat preload excludes unused catalogue images", ()=>{
  const previousImage = globalThis.Image;
  globalThis.Image = FakeImage;
  try{
    const cache = {};
    preloadCombatAssets({
      cache,
      ships:[{img:"assets/active-ship.png"}],
      ranks:[{id:"active-rank"}],
      getRankAssetPath:()=>"assets/active-rank.svg",
      equipment:[{img:"assets/unused-equipment.png"}],
      ammoTypes:[{img:"assets/unused-ammo.png"}],
      enemyTypes:{unused:{img:"assets/unused-enemy.png"}}
    });

    assert.ok(cache["assets/active-ship.png"]);
    assert.ok(cache["assets/active-rank.svg"]);
    assert.equal(cache["assets/unused-equipment.png"], undefined);
    assert.equal(cache["assets/unused-ammo.png"], undefined);
    assert.equal(cache["assets/unused-enemy.png"], undefined);
  }finally{
    globalThis.Image = previousImage;
  }
});

test("runtime combat images use a bounded LRU without evicting base assets", ()=>{
  const previousImage = globalThis.Image;
  globalThis.Image = FakeImage;
  try{
    const baseImage = {base:true};
    const cache = {"assets/base.png":baseImage};
    getCachedCombatImage(cache, "assets/a.png", {maxAssets:2});
    getCachedCombatImage(cache, "assets/b.png", {maxAssets:2});
    getCachedCombatImage(cache, "assets/a.png", {maxAssets:2});
    getCachedCombatImage(cache, "assets/c.png", {maxAssets:2});

    assert.ok(cache["assets/a.png"]);
    assert.equal(cache["assets/b.png"], undefined);
    assert.ok(cache["assets/c.png"]);
    assert.equal(cache["assets/base.png"], baseImage);
  }finally{
    globalThis.Image = previousImage;
  }
});

test("map asset paths include decor, NPCs and tiles without duplicates", ()=>{
  const paths = getCombatMapAssetPaths({
    bg:"assets/background.webp",
    parallaxScene:{
      backdrops:[{src:"assets/decor.png"}],
      images:[{src:"assets/decor.png"}],
      tiles:[{src:"assets/dust.png"}]
    },
    questNpcs:[{npcImg:"assets/npc.png"}],
    questStations:[{asset:"assets/relay.png"}],
    tileMap:{path:"assets/tiles", prefix:"sector", ext:"webp", rows:1, cols:2}
  });

  assert.deepEqual(paths, [
    "assets/background.webp",
    "assets/decor.png",
    "assets/dust.png",
    "assets/npc.png",
    "assets/relay.png",
    "assets/tiles/sector_0_0.webp",
    "assets/tiles/sector_1_0.webp"
  ]);
});

test("map asset cache prioritizes the previous active map over a stale destination", ()=>{
  const previousImage = globalThis.Image;
  globalThis.Image = FakeImage;
  try{
    const cache = {};
    const maps = [0, 1, 2, 3].map(id=>({id, bg:`assets/${id}.png`}));
    const assets = createCombatMapAssetCache({cache, maxMaps:3});

    assets.activate(maps[0]);
    assets.preload(maps[1]);
    assets.preload(maps[2]);
    assets.activate(maps[2]);
    assets.preload(maps[3]);

    assert.deepEqual(assets.getRetainedMapKeys(), ["0", "2", "3"]);
    assert.ok(cache["assets/0.png"]);
    assert.equal(cache["assets/1.png"], undefined);
  }finally{
    globalThis.Image = previousImage;
  }
});

test("streaming preloads only the destination of a nearby accessible portal", ()=>{
  const maps = [
    {id:0, portals:[{x:1000, y:0, targetMap:1}, {x:4000, y:0, targetMap:2}]},
    {id:1},
    {id:2}
  ];
  const preloaded = [];
  const state = {gameMode:"open", currentMap:maps[0], player:{x:0, y:0, speed:300}};
  const streaming = createCombatMapAssetStreamingSystem({
    mapList:maps,
    getState:()=>state,
    getMapPortals:map=>map.portals || [],
    preloadMapAssets:map=>preloaded.push(map.id)
  });

  assert.equal(streaming.update(.25), true);
  assert.deepEqual(preloaded, [1]);
});

test("Portgun destination is preloaded as soon as its channel starts", ()=>{
  const maps = [{id:0}, {id:24}];
  const preloaded = [];
  const streaming = createCombatMapAssetStreamingSystem({
    mapList:maps,
    getState:()=>({gameMode:"open", currentMap:maps[0], player:{x:0, y:0}, portgunChannel:{targetMapId:"24"}}),
    getMapPortals:()=>[],
    preloadMapAssets:map=>preloaded.push(map.id)
  });

  assert.equal(streaming.update(.25), true);
  assert.deepEqual(preloaded, [24]);
});
