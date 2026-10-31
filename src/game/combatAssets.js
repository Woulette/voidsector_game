import { getMiniMapVisualDefinition } from "./combatData/miniMapVisuals.js?v=20261023-minimap4";
import { getMapAssetPalette, getMapPaletteSource } from "../shared/firmHomeMapThemes.js";
import { prepareMapPaletteImage } from "./render/mapAssetPalette.js";
import { getSectorPortalAssetPaths } from "../data/sectorPortalVisuals.js?v=20261024-sector-portals1";
import { getAzuronGateAssetPaths } from "../data/azuronGateVisuals.js";
import { REPAIR_DRONE_VISUALS } from "../data/repairDroneVisuals.js";
import { RICKY_SAUCER_ASSET } from "../data/rickyVisuals.js?v=20261024-ricky-visuals1";
import { ORB_VISUAL_PROFILES } from "./combatData/orbVisuals.js";
import { VORAK_VISUAL_PROFILES, VORAK_THRUSTER_TEXTURE } from "./combatData/vorakVisuals.js";
import { PARASITE_PROFILES } from "./combatData/parasiteVisuals.js";
import { TRACKER_VISUAL_PROFILES } from "./combatData/trackerVisuals.js";
import { ECLANITE_SOURCE } from "./combatData/eclaniteVisuals.js";
import { getShipModel3d } from "../data/shipModels3d.js";
import { getReplacedMapImages } from "./render/scene3dPolicy.js";

function uniqueAssetPaths(paths){
  return [...new Set(paths.filter(Boolean))];
}

const runtimeAssetStates = new WeakMap();
export const RUNTIME_COMBAT_ASSET_LIMIT = 48;
const DEFERRED_MAP_ASSET_BATCH_SIZE = 4;

function preloadAsset(cache, src){
  if(!src || cache[src]) return cache[src] || null;
  if(typeof Image !== "function") return null;
  const img = new Image();
  cache[src] = img;
  if(getMapAssetPalette(src)) img.onload = ()=>{
    if(cache[src] !== img) return;
    const prepared = prepareMapPaletteImage(img, src);
    cache[src] = prepared;
    const runtimeState = runtimeAssetStates.get(cache);
    if(runtimeState?.get(src) === img) runtimeState.set(src, prepared);
  };
  // All four palettes download the same native texture URL; the browser can
  // reuse its HTTP cache instead of fetching another copy for each firm.
  img.src = getMapPaletteSource(src);
  // A decoded browser-cache hit can be complete before its load event runs.
  // Prepare it immediately so the source red palette never flashes on screen.
  if(img.complete && img.naturalWidth) img.onload?.();
  return cache[src];
}

export function getCachedCombatImage(cache, src, {maxAssets = RUNTIME_COMBAT_ASSET_LIMIT} = {}){
  if(!cache || !src) return null;
  let state = runtimeAssetStates.get(cache);
  if(!state){
    state = new Map();
    runtimeAssetStates.set(cache, state);
  }
  if(state.has(src)){
    const tracked = state.get(src);
    state.delete(src);
    if(cache[src]){
      state.set(src, cache[src]);
      return cache[src];
    }
    state.set(src, tracked);
  }else if(cache[src]){
    return cache[src];
  }
  const img = preloadAsset(cache, src);
  if(!img) return null;
  state.delete(src);
  state.set(src, img);
  const limit = Math.max(1, Math.floor(Number(maxAssets) || 1));
  while(state.size > limit){
    const [evictedSrc, evictedImg] = state.entries().next().value;
    state.delete(evictedSrc);
    if(cache[evictedSrc] === evictedImg) delete cache[evictedSrc];
  }
  return img;
}

export function getCombatMapAssetPaths(map, {world3d = false} = {}){
  if(!map) return [];
  const tileMap = map.tileMap;
  const mapTiles = [];
  if(tileMap){
    const prefix = tileMap.prefix || "tile";
    const ext = tileMap.ext || "webp";
    for(let row = 0; row < tileMap.rows; row++){
      for(let col = 0; col < tileMap.cols; col++){
        mapTiles.push(`${tileMap.path}/${prefix}_${col}_${row}.${ext}`);
      }
    }
  }
  const replaced = new Set(world3d ? getReplacedMapImages(map) : []);
  return uniqueAssetPaths([
    map.bg,
    ...getSectorPortalAssetPaths(map),
    ...getAzuronGateAssetPaths(map),
    getMiniMapVisualDefinition(map)?.image,
    ...(map.parallaxScene?.backdrops?.map(layer=>layer.src) || []),
    ...(map.parallaxScene?.images?.map(layer=>layer.src) || []),
    ...(map.parallaxScene?.tiles?.map(layer=>layer.src) || []),
    ...(map.questNpcs?.map(npc=>npc.npcImg) || []),
    ...(map.questStations?.map(station=>station.asset) || []),
    map.spawn?.visual?.asset,
    ...(map.spawnStations?.map(station=>station.asset) || []),
    ...(map.enemyAssets || []),
    ...(map.portalAssets || []),
    ...mapTiles
  ]).filter(src=>!replaced.has(src));
}

export function preloadCombatAssets({cache, ships = [], ranks = [], getRankAssetPath = ()=>null, shipModels3d = false, world3d = false}){
  const rankImages = ranks.map(rank=>getRankAssetPath(rank));
  const spawnAssets = [
    "assets/spawn/spawn_dock.png",
    "assets/spawn/spawn_quest_relay.png",
    "assets/spawn/spawn_refinery.png"
  ];
  const misc = [
    ECLANITE_SOURCE,
    ...Object.values(TRACKER_VISUAL_PROFILES).map(visual=>visual.sprite),
    ...Object.values(PARASITE_PROFILES).map(visual=>visual.sprite),
    ...Object.values(VORAK_VISUAL_PROFILES).map(visual=>visual.sprite),
    VORAK_THRUSTER_TEXTURE,
    ...Object.values(ORB_VISUAL_PROFILES).map(visual=>visual.sprite),
    ...Object.values(REPAIR_DRONE_VISUALS).map(visual=>visual.body),
    "assets/drones/drone_test_sprite.webp",
    "assets/equipment/rocket_projectile.png",
    "assets/firms/astra.svg",
    "assets/firms/cyan.svg",
    "assets/firms/jaune.svg",
    "assets/firms/verte.svg",
    "assets/materials/cargo_box.svg",
    "assets/portals/seuil_azuron.png",
    "assets/portals/faille_vesper.png",
    "assets/ships/npc/npc_saucer.png",
    RICKY_SAUCER_ASSET,
    ...(world3d ? [] : spawnAssets),
    ...rankImages
  ];
  uniqueAssetPaths([
    ...ships.filter(ship=>!shipModels3d || !getShipModel3d(ship)).flatMap(ship=>[ship.img, ship.combatImg]),
    ...misc
  ]).forEach(src=>preloadAsset(cache, src));
}

export function createCombatMapAssetCache({cache, maxMaps = 3, getOptions = ()=>({})} = {}){
  const retainedMaps = new Map();
  const managedSources = new Set();
  const queuedSources = new Set();
  const preloadQueue = [];
  let activeMapKey = null;
  let previousActiveMapKey = null;
  let preloadQueueScheduled = false;

  function getMapKey(map){
    return String(map?.id ?? map?.name ?? "");
  }

  function isSourceRetained(src){
    for(const entry of retainedMaps.values()){
      if(entry.paths.includes(src)) return true;
    }
    return false;
  }

  function releaseEntry(entry){
    for(const src of entry.paths){
      if(!managedSources.has(src) || isSourceRetained(src)) continue;
      delete cache[src];
      managedSources.delete(src);
    }
  }

  function scheduleQueuedPreloads(){
    if(preloadQueueScheduled || !preloadQueue.length) return;
    preloadQueueScheduled = true;
    const run = deadline=>{
      preloadQueueScheduled = false;
      let loaded = 0;
      while(preloadQueue.length && loaded < DEFERRED_MAP_ASSET_BATCH_SIZE){
        if(deadline?.timeRemaining && deadline.timeRemaining() <= 2 && loaded > 0) break;
        const src = preloadQueue.shift();
        queuedSources.delete(src);
        if(!src || cache[src] || !isSourceRetained(src)) continue;
        managedSources.add(src);
        preloadAsset(cache, src);
        loaded += 1;
      }
      scheduleQueuedPreloads();
    };
    if(typeof requestIdleCallback === "function") requestIdleCallback(run, {timeout:120});
    else setTimeout(()=>run(), 16);
  }

  function queuePreload(src){
    if(!src || cache[src] || queuedSources.has(src)) return;
    queuedSources.add(src);
    preloadQueue.push(src);
  }

  function trim(){
    const limit = Math.max(1, Math.floor(Number(maxMaps) || 1));
    while(retainedMaps.size > limit){
      const keys = [...retainedMaps.keys()];
      const evictedKey = keys.find(key=>key !== activeMapKey && key !== previousActiveMapKey)
        ?? keys.find(key=>key !== activeMapKey);
      if(evictedKey == null) break;
      const entry = retainedMaps.get(evictedKey);
      retainedMaps.delete(evictedKey);
      releaseEntry(entry);
    }
  }

  function retain(map, {active = false, defer = false} = {}){
    const key = getMapKey(map);
    if(!key) return [];
    const existing = retainedMaps.get(key);
    const entry = {map, paths:getCombatMapAssetPaths(map, getOptions(map))};
    if(existing) retainedMaps.delete(key);
    retainedMaps.set(key, entry);
    if(existing) releaseEntry(existing);
    if(active && key !== activeMapKey){
      previousActiveMapKey = activeMapKey;
      activeMapKey = key;
    }
    const immediateLimit = defer && !active ? 3 : Number.POSITIVE_INFINITY;
    entry.paths.forEach((src, index)=>{
      if(defer && !active && index >= immediateLimit){
        queuePreload(src);
        return;
      }
      if(!cache[src]) managedSources.add(src);
      preloadAsset(cache, src);
    });
    if(defer && !active) scheduleQueuedPreloads();
    trim();
    return entry.paths;
  }

  function clear(){
    const entries = [...retainedMaps.values()];
    retainedMaps.clear();
    activeMapKey = null;
    previousActiveMapKey = null;
    preloadQueue.length = 0;
    queuedSources.clear();
    entries.forEach(releaseEntry);
  }

  return {
    activate:map=>retain(map, {active:true}),
    preload:(map, options = {})=>retain(map, options),
    clear,
    getRetainedMapKeys:()=>[...retainedMaps.keys()]
  };
}

export function releaseCombatImages(cache, paths){
  const state = runtimeAssetStates.get(cache);
  for(const src of paths.filter(Boolean)){
    delete cache[src];state?.delete(src);
  }
}

export async function prepareCombatImages(cache, paths){
  await Promise.all(uniqueAssetPaths(paths).map(async src=>{
    const image = preloadAsset(cache,src);
    if(!image) return;
    if(typeof image.getContext === "function") return;
    try{
      if(typeof image.decode === "function") await image.decode();
      else if(!image.complete) await new Promise((resolve,reject)=>{
        const clear = ()=>{image.removeEventListener("load",loaded);image.removeEventListener("error",failed);};
        const loaded = ()=>{clear();resolve();};
        const failed = ()=>{clear();reject(new Error(`Image indisponible : ${src}`));};
        image.addEventListener("load",loaded,{once:true});image.addEventListener("error",failed,{once:true});
      });
      if(!image.naturalWidth && !image.width) throw new Error(`Image indisponible : ${src}`);
      // Palette preparation may replace the Image with a canvas on load.
      if(getMapAssetPalette(src) && cache[src] === image) image.onload?.();
    }catch(error){
      if(cache[src] === image) releaseCombatImages(cache,[src]);
      throw error;
    }
  }));
}
